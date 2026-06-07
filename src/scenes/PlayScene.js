import Phaser from 'phaser';
import SupportGrid from '../grid/SupportGrid.js';

// Profundidade dos diferentes objetos
const DEPTH = {
    background: -1,
    supports: 0,
    player:   1,
    drones:   2,
};

export default class PlayScene extends Phaser.Scene {
    constructor() {
        super('PlayScene');

        this.columns = [75, 183, 291, 400, 508, 616, 725]; // Posição das faixas verticais de movimentação do jogador
        this.stepDistance = 100; // Distância percorrida pela descida das linhas após cada pulso
    }

    preload() {
        this.load.image('background', 'assets/images/background.jpg');

        this.load.image('mestrezen', 'assets/images/mestrezen.png');
        this.load.image('drone', 'assets/images/drone.png');
        this.load.image('support', 'assets/images/support.png');

        this.load.audio('soundtrack', 'assets/music/soundtrack.mp3');
    }

    create() {
        this.add.image(400, 300, 'background').setOrigin(0.5).setDepth(DEPTH.background).setScale(1.7);

        this.grid = new SupportGrid(this.columns.length); // Criação do campo de jogo

        // O personagem começa no centro da tela
        this.playerCol = 3;
        this.playerY = 500;
        
        this.isGameOver = false;

        this.pulseCount = 0; // Contador de pulsos, usado para implementar dificuldade progressiva
        this.isPulsing = false;

        this.moveCooldown = false;
        this.moveCooldownTime = 200;

        this.supportSprites = new Map(); // Os apoios pelos quais o personagem se movimentará

        this.cursors = this.input.keyboard.createCursorKeys();

        // Força apoio sob o personagem no início para que ele não comece no vazio
        for (let y = 500; y >= 100; y -= this.stepDistance) {
            const forceCol = (y === this.playerY) ? this.playerCol : null;
            this.spawnRow(y, forceCol);
        }

        // O mestre zen é o protagonista do jogo
        this.mestreZen = this.physics.add.sprite(
            this.columns[this.playerCol], this.playerY,
            'mestrezen'
        );
        this.mestreZen.setScale(0.5).setDepth(DEPTH.player).setOrigin(0.5, 0.4);

        this.mestreZen.body.setSize(this.mestreZen.width, this.mestreZen.height);
        this.mestreZen.body.setOffset(0, 0);

        // Os drones são os inimigos (percorrem uma coluna ou uma linha, de uma extremidade a outra)
        this.drones = this.physics.add.group({
            classType: Phaser.GameObjects.Sprite,
            maxSize: 3,
            runChildUpdate: false
        });

        for (let i = 0; i < 3; i++) {
            const drone = this.add.sprite(0, -100, 'drone');

            drone.setScale(0.2);
            drone.setDepth(DEPTH.drones);

            this.physics.add.existing(drone);
            drone.body.setSize(drone.width, drone.height); 
            drone.body.setOffset(0, 0);

            drone.setActive(false).setVisible(false);
            this.drones.add(drone);
        }

        this.spawnTimer = this.time.now + 2000;
        this.droneSpawnTimer = this.time.now + 3000;

        // Breve bloqueio de input no início para permitir que tudo seja inicializado corretamente
        this.inputBlocked = true;
        this.time.delayedCall(500, () => { this.inputBlocked = false; });

        this.add.text(10, 10, 'Use as setas para se movimentar na horizontal, vertical ou diagonal!', {
            fill: '#0f0', fontSize: '13px'
        });

        // Música de fundo
        this.soundtrack = this.sound.add('soundtrack', {
            loop: true,
            volume: 0.5
        });
        this.soundtrack.play();
    }

    /** ATUALIZAÇÃO DO CAMPO DE JOGO */
    update(time) {
        if (this.isGameOver) return;

        this.handleInput();

        if (time > this.spawnTimer) {
            this.pulse();
            this.spawnTimer = time + 2000;
        }

        // Spawna novos drones constantemente
        if (time > this.droneSpawnTimer) {
            this.spawnDrone();
            this.droneSpawnTimer = time + 4000;
        }

        this.checkDronesBounds();

        this.checkGameOver();
    }

    /** LÊ O ESTADO DAS TECLAS A CADA FRAME E EXECUTA O MOVIMENTO CORRESPONDENTE */
    handleInput() {
        if (this.isPulsing || this.inputBlocked || this.moveCooldown) return;

        const left = this.cursors.left.isDown;
        const right = this.cursors.right.isDown;
        const up = this.cursors.up.isDown;
        const down = this.cursors.down.isDown;

        // Ignora inputs contraditórios simultâneos
        if (left && right) return;
        if (up && down) return;

        let dCol = 0;
        if (left) dCol = -1;
        if (right) dCol = 1;

        let dY = 0;
        if (up) dY = -this.stepDistance;
        if (down) dY = this.stepDistance;

        if (dCol !== 0 || dY !== 0) {
            this.tryMove(dCol, dY);
        }
    }
    
    /** MOVIMENTAÇÃO DO PERSONAGEM */
    tryMove(dCol, dY) {
        const targetCol = this.playerCol + dCol;
        const targetY = this.playerY + dY;
        
        if (targetCol < 0 || targetCol >= this.columns.length) return; // Impede que o personagem saia pelas laterais do campo do jogo
        if (!this.grid.has(targetCol, targetY)) return; // Impede que o jogador se desloque para espaços vazios

        this.playerCol = targetCol;
        this.playerY = targetY;
        this.mestreZen.x = this.columns[targetCol];
        this.mestreZen.y = targetY;

        this.moveCooldown = true;
        this.time.delayedCall(this.moveCooldownTime, () => { this.moveCooldown = false; });
    }

    /** CALCULA A CHANCE DE SPAWN DE APOIOS EXTRAS */
    extraSupportChance() {
        const start = 0.5;    // Chance inicial
        const end = 0.05;      // Chance mínima
        const rampPulses = 80; // Pulsos até atingir a dificuldade máxima

        const t = Math.min(this.pulseCount / rampPulses, 1);
        return start + (end - start) * t;
    }

    /** SPAWN DE NOVOS APOIOS */
    spawnRow(y, forceCol = null) {
        const newCols = new Set();
        const colsBelow = this.grid.getColsAtY(y + this.stepDistance);

        // Garante ao menos um caminho pra cima a partir de cada apoio (ou seja, assegura conectividade)
        colsBelow.forEach(col => {
            const candidates = [col - 1, col, col + 1].filter(c => c >= 0 && c < this.columns.length);
            newCols.add(Phaser.Utils.Array.GetRandom(candidates));
        });

        if (colsBelow.length === 0) {
            newCols.add(Phaser.Math.Between(0, this.columns.length - 1));
        }

        if (forceCol !== null) newCols.add(forceCol);

        // Spawna apoios extras (isto é, além do necessário para percorrer o caminho entre as duas extremidades da tela)
        const chance = this.extraSupportChance();
        this.columns.forEach((_, index) => {
            if (!newCols.has(index) && Math.random() < chance) {
                newCols.add(index);
            }
        });

        // Registra a nova linha de apoios na grade antes de criar os visuais
        newCols.forEach(col => {
            this.grid.set(col, y);

            const sprite = this.add.sprite(this.columns[col], y, 'support');
            sprite.setDepth(DEPTH.supports);

            this.physics.add.existing(sprite);
            this.supportSprites.set(`${col},${y}`, sprite);
        });
    }

    /** PULSO DE "MOVIMENTAÇÃO" DA MONTANHA */
    pulse() {
        if (this.isGameOver) return;

        this.isPulsing = true; // Utilizado para bloquear input durante o pulso
        this.pulseCount++;

        const removed = this.grid.shiftDown(this.stepDistance, 700);

        // Destrói apoios que saíram da tela
        removed.forEach(({ col, y }) => {
            const key = `${col},${y}`;
            const sprite = this.supportSprites.get(key);
            if (sprite) {
                sprite.destroy();
                this.supportSprites.delete(key);
            }
        });

        const updatedSprites = new Map();
        this.supportSprites.forEach((sprite, key) => {
            const [col, y] = key.split(',').map(Number);
            sprite.y += this.stepDistance;
            updatedSprites.set(`${col},${y + this.stepDistance}`, sprite);
        });
        this.supportSprites = updatedSprites;

        // Quando as linhas descem, o mestre zen desce junto
        this.playerY += this.stepDistance;
        this.mestreZen.y += this.stepDistance;

        // Ativa o game over se o jogador saiu da tela
        if (this.playerY > 600) {
            this.triggerGameOver();
            return;
        }

        this.spawnRow(100); // Spawna nova linha no topo

        // Se o personagem está no topo, um apoio sob ele na nova linha será garantido
        if (this.playerY === 100) {
            if (!this.grid.has(this.playerCol, 100)) {
                this.grid.set(this.playerCol, 100);

                const sprite = this.add.sprite(this.columns[this.playerCol], 100, 'support');

                this.physics.add.existing(sprite);
                this.supportSprites.set(`${this.playerCol},100`, sprite);
            }
        }

        this.time.delayedCall(150, () => { if (!this.isGameOver) this.isPulsing = false; }); // Libera input após o pulso terminar
    }

    /** CALCULA A VELOCIDADE DOS DRONES */
    droneSpeed() {
        const start = 120; // Velocidade inicial (mínima)
        const end = 300; // Velocidade final (máxima)
        const rampPulses = 80; // Pulsos para velocidade máxima

        const t = Math.min(this.pulseCount / rampPulses, 1);
        return start + (end - start) * t;
    }

    /** SPAWNA NOVOS DRONES */
    spawnDrone() {
        const activeDrones = this.drones.getChildren().filter(d => d.active);
        if (activeDrones.length >= 1) return;

        // Decide aleatoriamente a direção do drone, seja vertical ou horizontal
        const isHorizontal = Phaser.Math.Between(0, 1) === 0;
        const speed = this.droneSpeed();

        const drone = this.drones.getChildren().find(d => !d.active);
        if (!drone) return;

        let startX, startY, velX, velY;

        if (isHorizontal) {
            // Drone entra por um dos lados e atravessa a tela horizontalmente
            const goingRight = Phaser.Math.Between(0, 1) === 0;
            startX = goingRight ? -20 : 820;
            const validYs = [100, 200, 300, 400, 500];
            startY = Phaser.Utils.Array.GetRandom(validYs);
            velX = goingRight ? speed : -speed;
            velY = 0;
        } else {
            // Drone entra pelo topo ou pela base e percorre uma coluna verticalmente
            const col = Phaser.Math.Between(0, this.columns.length - 1);
            const goingDown = Phaser.Math.Between(0, 1) === 0;
            startX = this.columns[col];
            startY = goingDown ? -20 : 620;
            velX = 0;
            velY = goingDown ? speed : -speed;
        }

        drone.setActive(true).setVisible(true);
        drone.setPosition(startX, startY);
        drone.body.setVelocity(velX, velY);
    }

    /** VERIFICA SE OS DRONES SAÍRAM DA TELA */
    checkDronesBounds() {
        this.drones.getChildren().forEach(drone => {
            if (!drone.active) return;

            // Devolve o drone ao pool para ser reutilizado caso tenha saído da tela
            const outOfBounds =
                drone.x < -60 || drone.x > 860 ||
                drone.y < -60 || drone.y > 660;

            if (outOfBounds) {
                drone.setActive(false).setVisible(false);
                drone.body.setVelocity(0, 0);
            }
        });
    }

    /** CHECA SE HOUVE ALGUM EVENTO QUE CAUSE GAME OVER */
    checkGameOver() {
        if (this.isGameOver) return;

        // Colisão com drone
        const hitByDrone = this.drones.getChildren().some(drone => {
            if (!drone.active) return false;

            return Phaser.Math.Distance.Between(
                this.mestreZen.x, this.mestreZen.y,
                drone.x, drone.y
            ) < 30;
        });

        if (hitByDrone) { this.triggerGameOver(); return; }

        if (this.playerY > 600) { this.triggerGameOver(); return; } // Jogador saiu da tela

        // Jogador está em um espaço vazio (game over de segurança, não deve acontecer normalmente)
        if (!this.grid.has(this.playerCol, this.playerY)) {
            this.triggerGameOver();
        }
    }

    /** GAME OVER */
    triggerGameOver() {
        if (this.isGameOver) return;

        // Tudo é pausado, inclusive a música, e a mensagem de game over é exibida
        this.isGameOver = true;
        this.physics.pause();

        if (this.soundtrack) this.soundtrack.stop();

        this.add.text(400, 300, 'O mestre caiu... GAME OVER!', { fontSize: '40px', fill: '#f00' }).setOrigin(0.5);

        this.time.delayedCall(3000, () => { this.scene.restart(); }); // O jogo reinicia após alguns segundos
    }
}