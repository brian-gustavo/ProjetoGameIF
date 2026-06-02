import Phaser from 'phaser';
import SupportGrid from '../grid/SupportGrid.js';

export default class PlayScene extends Phaser.Scene {
    constructor() {
        super('PlayScene');

        this.columns = [75, 183, 291, 400, 508, 616, 725]; // Posição das faixas verticais de movimentação do jogador
        this.stepDistance = 100; // Distância percorrida pela descida das linhas após cada pulso
    }

    preload() {
        this.load.image('mestrezen', 'assets/images/mestrezen.png');
    }

    create() {
        this.grid = new SupportGrid(this.columns.length); // Criação do campo de jogo

        // O personagem começa no centro da tela
        this.playerCol = 3;
        this.playerY = 500;
        
        this.isGameOver = false;

        this.pulseCount = 0; // Contador de pulsos, usado para implementar dificuldade progressiva
        this.isPulsing = false;

        this.moveCooldown = false;
        this.moveCooldownTime = 200;

        this.supportSprites = new Map(); // Os apoios do personagem são fendas na montanha

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
        this.mestreZen.setScale(0.5).setDepth(1);

        this.activeDroneColumns = new Set(); // Controla em quais colunas já há um drone ativo, para evitar sobreposição

        // Os drones são o primeiro tipo de inimigo (percorrem uma coluna, seja subindo ou descendo)
        this.drones = this.physics.add.group({
            classType: Phaser.GameObjects.Arc,
            maxSize: 3,
            runChildUpdate: false
        });

        for (let i = 0; i < 3; i++) {
            const drone = this.add.circle(0, -100, 15, 0xffffff);
            this.physics.add.existing(drone);
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
        const start = 0.35;    // Chance inicial
        const end = 0.05;      // Chance mínima
        const rampPulses = 40; // Pulsos até atingir a dificuldade máxima

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

            const sprite = this.add.rectangle(this.columns[col], y, 80, 20, 0x664422);
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
                const sprite = this.add.rectangle(this.columns[this.playerCol], 100, 80, 20, 0x664422);
                this.physics.add.existing(sprite);
                this.supportSprites.set(`${this.playerCol},100`, sprite);
            }
        }

        this.time.delayedCall(150, () => { if (!this.isGameOver) this.isPulsing = false; }); // Libera input após o pulso terminar
    }

    /** CALCULA QUANTOS DRONES PODEM ESTAR ATIVOS SIMULTANEAMENTE */
    maxActiveDrones() {
        // O número de drones aumenta conforme o jogo progride, até chegar no máximo de 3
        if (this.pulseCount < 15) return 1;
        if (this.pulseCount < 30) return 2;
        return 3;
    }

    /** CALCULA A VELOCIDADE DOS DRONES */
    droneSpeed() {
        const start = 120; // Velocidade inicial (mínima)
        const end = 220; // Velocidade final (máxima)
        const rampPulses = 40; // Pulsos para velocidade máxima

        const t = Math.min(this.pulseCount / rampPulses, 1);
        return start + (end - start) * t;
    }

    /** SPAWNA NOVOS DRONES */
    spawnDrone() {
        const activeDrones = this.drones.getChildren().filter(d => d.active);
        if (activeDrones.length >= this.maxActiveDrones()) return;

        // Determina colunas disponíveis (sem drone ativo)
        const availableCols = this.columns
            .map((_, i) => i)
            .filter(i => !this.activeDroneColumns.has(i));
        if (availableCols.length === 0) return;

        // Decide aleatoriamente se o drone desce ou sobe
        const col = Phaser.Utils.Array.GetRandom(availableCols);
        const goingDown = Phaser.Math.Between(0, 1) === 0;
        const startY = goingDown ? -20 : 620;
        const velocityY = goingDown ? this.droneSpeed() : -this.droneSpeed();

        // Reutiliza drones inativos do pool
        const drone = this.drones.getChildren().find(d => !d.active);
        if (!drone) return;

        drone.setActive(true).setVisible(true);
        drone.setPosition(this.columns[col], startY);
        drone.setData('col', col);
        drone.body.setVelocityY(velocityY);

        this.activeDroneColumns.add(col);
    }

    /** VERIFICA SE OS DRONES SAÍRAM DA TELA */
    checkDronesBounds() {
        this.drones.getChildren().forEach(drone => {
            if (!drone.active) return;

            // Devolve o drone ao pool para ser reutilizado caso tenha saído da tela
            if (drone.y < -50 || drone.y > 650) {
                this.activeDroneColumns.delete(drone.getData('col'));
                drone.setActive(false).setVisible(false);
                drone.body.setVelocityY(0);
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

        // Tudo é pausado e a mensagem de game over é exibida
        this.isGameOver = true;
        this.physics.pause();
        this.add.text(400, 300, 'O mestre caiu... GAME OVER!', { fontSize: '40px', fill: '#f00' }).setOrigin(0.5);

        this.time.delayedCall(3000, () => { this.scene.restart(); }); // O jogo reinicia após alguns segundos
    }
}