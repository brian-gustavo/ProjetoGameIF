import Phaser from 'phaser';

export default class PlayScene extends Phaser.Scene {
    constructor() {
        super('PlayScene');

        this.columns = [75, 183, 291, 400, 508, 616, 725]; // Faixas verticais de movimentação do jogador
        this.stepDistance = 100; // Descida das linhas após cada pulso
    }

    create() {
        this.currentPos = { col: 3 }; // O personagem começa no centro
        this.isGameOver = false;
        this.spawnTimer = this.time.now + 2000;
        this.pulseCount = 0; // Contador de pulsos, usado para implementar dificuldade progressiva

        this.moveCooldown = false;
        this.moveCooldownTime = 200;

        this.isMoving = false;

        this.inputBlocked = true;
        this.time.delayedCall(500, () => { this.inputBlocked = false; });

        this.supports = this.physics.add.group(); // Fendas na montanha que serão os apoios do personagem

        this.supportMap = new Map(); // Registra onde estão os apoios para que o algoritmo de conectividade possa ser aplicado

        // Força apoio sob o personagem para que ele não comece no vazio
        for (let y = 500; y >= 100; y -= this.stepDistance) {
            const forceCol = (y === 500) ? this.currentPos.col : null;
            this.spawnSupportRow(y, forceCol);
        }

        // O mestre zen é o protagonista do jogo
        this.mestreZen = this.add.rectangle(this.columns[this.currentPos.col], 500, 30, 30, 0xffcc00);
        this.physics.add.existing(this.mestreZen);
        
        this.cursors = this.input.keyboard.createCursorKeys();

        // Primeiro obstáculo (percorre uma coluna, seja subindo ou descendo)
        this.drones = this.physics.add.group({
            maxSize: 3,
            runChildUpdate: true
        });

        this.activeDroneColumns = new Set(); // Controla em quais colunas já há um drone ativo, para evitar sobreposição

        this.droneSpawnTimer = this.time.now + 3000;

        this.add.text(10, 10, 'Use as setas para se movimentar na horizontal, vertical ou diagonal!', { fill: '#0f0', fontSize: '13px' });
    }

    // Pulso constante de atualização do campo de jogo
    update(time) {
        if (this.isGameOver) return;

        this.handleInput();

        if (time > this.spawnTimer) {
            this.moveMountainDown();
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

    // Lê o estado atual das teclas a cada frame e executa o movimento correspondente
    handleInput() {
        if (this.isMoving || this.inputBlocked || this.moveCooldown) return;

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

        if (dCol !== 0 && dY !== 0) {
            this.tryMove(dCol, dY); // Movimento diagonal
        } else if (dCol !== 0) {
            this.tryMove(dCol, 0); // Movimento horizontal
        } else if (dY !== 0) {
            this.tryMove(0, dY); // Movimento vertical
        }
    }
    
    // Calcula a chance de spawn de apoios extras com base no número de pulsos decorridos
    extraSupportChance() {
        const start = 0.35;    // Chance inicial (35%)
        const end = 0.05;      // Chance mínima (5%)
        const rampPulses = 40; // Pulsos até atingir a dificuldade máxima

        const t = Math.min(this.pulseCount / rampPulses, 1);
        return start + (end - start) * t;
    }

    // Spawn procedural de novos apoios
    spawnSupportRow(yPos, forceCol = null) {
        const newCols = new Set();

        const rowBelow = yPos + this.stepDistance;
        const colsBelow = this.supportMap.get(rowBelow) ?? new Set();

        // Garante que sempre haja ao menos um caminho para cima a partir de qualquer apoio (conectividade)
        colsBelow.forEach(col => {
            const candidates = [col - 1, col, col + 1].filter(c => c >= 0 && c < this.columns.length);
            newCols.add(Phaser.Utils.Array.GetRandom(candidates));
        });
 
        if (colsBelow.size === 0) {
            newCols.add(Phaser.Math.Between(0, this.columns.length - 1));
        }

        // Força a criação de um apoio, caso seja necessário (usado no spawn inicial)
        if (forceCol !== null) {
            newCols.add(forceCol);
        }

        // Cria apoios extra (isto é, além do mínimo necessário para se mover entre as duas extremidades do campo de jogo)
        const chance = this.extraSupportChance();
        this.columns.forEach((_, index) => {
            if (!newCols.has(index) && Math.random() < chance) {
                newCols.add(index);
            }
        });

        this.supportMap.set(yPos, newCols); // Registra o mapa de conectividade da linha antes de criar os visuais

        newCols.forEach(index => {
            const support = this.add.rectangle(this.columns[index], yPos, 80, 20, 0x664422);
            this.physics.add.existing(support);
            support.setData('col', index);
            this.supports.add(support);
        });
    }

    // Movimentação da montanha (campo de jogo)
    moveMountainDown() {
        if (this.isGameOver) return;

        this.isMoving = true;
        this.pulseCount++;

        // Quando as linhas descem, os apoios descem junto
        this.supports.getChildren().forEach(support => {
            support.y += this.stepDistance;
        });

        this.mestreZen.y += this.stepDistance; // O protagonista também desce junto com as linhas

        // Atualiza o mapa de conectividade para evitar que o spawn de apoios quebre
        const updatedMap = new Map();
        this.supportMap.forEach((cols, y) => {
            updatedMap.set(y + this.stepDistance, cols);
        });
        this.supportMap = updatedMap;

        // Remove apoios que sumiram da tela, para garantir otimização
        this.supports.getChildren().forEach(support => {
            if (support.y > 700) {
                this.supportMap.delete(support.y);
                support.destroy();
            }
        });

        this.spawnSupportRow(100);

        this.time.delayedCall(100, () => { this.isMoving = false; });
    }

    // Movimentação do personagem
    tryMove(dCol, dY) {
        const targetCol = this.currentPos.col + dCol;

        const snappedY = Math.round(this.mestreZen.y / this.stepDistance) * this.stepDistance;
        const targetY = snappedY + dY;
        
        if (targetCol < 0 || targetCol >= this.columns.length) return false; // Impede que o personagem saia pelas laterais do campo do jogo

        const possibleSupport = this.supports.getChildren().find(s => {
            const colMatch = s.getData('col') === targetCol;
            const distY = Math.abs(s.y - targetY);

            return colMatch && distY < 30; 
        });

        if (possibleSupport) {
            this.isMoving = true;
            this.moveCooldown = true;
            this.currentPos.col = targetCol;

            // Suaviza as transições
            this.tweens.add({
                targets: this.mestreZen,
                x: possibleSupport.x,
                y: possibleSupport.y,
                duration: 100,
                ease: 'Power1',
                onComplete: () => { this.isMoving = false; }
            });

            this.time.delayedCall(this.moveCooldownTime, () => { this.moveCooldown = false; });
 
            return true;
        }

        return false;
    }

    // O game over ocorre se o personagem passar da borda inferior ou encostar em algum inimigo
    checkGameOver() {
        if (this.isMoving || this.isGameOver) return; // Evita que o movimento entre fendas seja considerado como uma queda

        const onSupport = this.supports.getChildren().some(s => {
            const sameCol = Math.abs(s.x - this.mestreZen.x) < 10;
            const sameHeight = Math.abs(s.y - this.mestreZen.y) < 20;
            
            return sameCol && sameHeight;
        });

        // Verifica se há colisão entre o personagem e os drones
        const hitByDrone = this.drones.getChildren().some(drone => {
            if (!drone.active) return false;
            const dist = Phaser.Math.Distance.Between(
                this.mestreZen.x, this.mestreZen.y,
                drone.x, drone.y
            );
            return dist < 30;
        });

        if (this.mestreZen.y > 650 || !onSupport) {
            this.isGameOver = true;
            this.physics.pause();
            this.add.text(400, 300, 'O mestre caiu... GAME OVER!', { fontSize: '40px', fill: '#f00', backgroundColor: '#000' }).setOrigin(0.5);

            // Reinicia o jogo 3 segundos após o game over
            this.time.delayedCall(3000, () => {
                this.scene.restart();
            });
        }
    }

    // Calcula quantos drones podem estar ativos simultaneamente com base nos pulsos decorridos (máximo é 3)
    maxActiveDrones() {
        if (this.pulseCount < 15) return 1; // Primeiro drone adicional aos 15 pulsos
        if (this.pulseCount < 30) return 2; // Segundo drone adicional aos 30 pulsos
        return 3;
    }

    // Calcula a velocidade dos drones com base nos pulsos decorridos
    droneSpeed() {
        const start = 120; // Velocidade inicial (mínima)
        const end = 220; // Velocidade final (máxima)
        const rampPulses = 40; // Pulsos para velocidade máxima

        const t = Math.min(this.pulseCount / rampPulses, 1);
        return start + (end - start) * t;
    }

    // Spawna novos drones
    spawnDrone() {
        const activeDrones = this.drones.getChildren().filter(d => d.active);
        if (activeDrones.length >= this.maxActiveDrones()) return;

        // Determina colunas disponíveis (sem drone ativo)
        const availableCols = this.columns
            .map((_, i) => i)
            .filter(i => !this.activeDroneColumns.has(i));

        if (availableCols.length === 0) return;

        const col = Phaser.Utils.Array.GetRandom(availableCols);

        // Decide aleatoriamente se o drone desce ou sobe
        const goingDown = Phaser.Math.Between(0, 1) === 0;
        const startY = goingDown ? -20 : 620;
        const velocityY = goingDown ? this.droneSpeed() : -this.droneSpeed();

        // Reutiliza drones inativos do pool (ou cria um novo, se necessário)
        let drone = this.drones.get(this.columns[col], startY);
        if (!drone) return; // Não spawna um novo se o pool estiver cheio

        // Configura o visual do drone
        if (!drone.geom) {
            drone = this.add.circle(this.columns[col], startY, 15, 0xffffff);
            this.physics.add.existing(drone);
            this.drones.add(drone);
        }

        drone.setActive(true).setVisible(true);
        drone.setPosition(this.columns[col], startY);
        drone.setData('col', col);
        drone.body.setVelocityY(velocityY);

        this.activeDroneColumns.add(col);
    }

    // Verifica se algum drone ativo saiu da tela e o devolve ao pool
    checkDronesBounds() {
        this.drones.getChildren().forEach(drone => {
            if (!drone.active) return;

            if (drone.y < -50 || drone.y > 650) {
                this.activeDropeColumns.delete(drone.getData('col'));
                drone.setActive(false).setVisible(false);
                drone.body.setVelocityY(0);
            }
        });
    }
}