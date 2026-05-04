import Phaser from 'phaser';

export default class PlayScene extends Phaser.Scene {
    constructor() {
        super('PlayScene');

        this.columns = [100, 250, 400, 550, 700]; // Faixas verticais de movimentação do jogador
        this.stepDistance = 100; // Descida das linhas após cada pulso
    }

    create() {
        this.currentPos = { col: 2 }; // O personagem começa no centro
        this.isGameOver = false;
        this.spawnTimer = this.time.now + 2000;
        this.pulseCount = 0; // Contador de pulsos, usado para implementar dificuldade progressiva

        this.isMoving = true;
        this.time.delayedCall(500, () => { this.isMoving = false; });

        this.supports = this.physics.add.group(); // Fendas na montanha que serão os apoios do personagem

        this.supportMap = new Map(); // Registra onde estão os apoios para que o algoritmo de conectividade possa ser aplicado

        for (let y = 500; y >= 100; y -= this.stepDistance) {
            // Força apoio sob o personagem para que ele não comece no vazio
            const forceCol = (y === 500) ? this.currentPos.col : null;
            this.spawnSupportRow(y, forceCol);
        }

        // O mestre zen é o protagonista do jogo
        this.mestreZen = this.add.rectangle(this.columns[this.currentPos.col], 500, 40, 40, 0xffcc00);
        this.physics.add.existing(this.mestreZen);
        
        this.input.keyboard.on('keydown-LEFT', () => this.tryMove(-1, 0));
        this.input.keyboard.on('keydown-RIGHT', () => this.tryMove(1, 0));
        this.input.keyboard.on('keydown-UP', () => this.tryMove(0, -this.stepDistance));
        this.input.keyboard.on('keydown-DOWN', () => this.tryMove(0, this.stepDistance));

        this.add.text(10, 10, 'Use as setas para se movimentar', { fill: '#0f0' });
    }

    // Pulso constante de atualização do campo de jogo
    update(time) {
        if (this.isGameOver) return;

        if (time > this.spawnTimer) {
            this.moveMountainDown();
            this.spawnTimer = time + 2000;
        }

        this.checkGameOver();
    }

    // Calcula a chance de spawn de apoios extras com base no número de pulsos decorridos
    extraSupportChance() {
        const start = 0.35;    // Chance inicial (35%)
        const end = 0.05;      // Chance mínima (5%)
        const rampPulses = 40; // Pulsos até atingir a dificuldade máxima

        const t = Math.min(this.pulseCount / rampPulses, 1);
        return start + (end - start) * t;
    }

    // Spawn procedural de novos apoios, com algoritmo de conectividade
    spawnSupportRow(yPos, forceCol = null) {
        const newCols = new Set();

        const rowBelow = yPos + this.stepDistance;
        const colsBelow = this.supportMap.get(rowBelow) ?? new Set();

        // Garante um caminho completo entre as duas extremidades do campo do jogo
        if (colsBelow.size > 0) {
            const anchor = Phaser.Utils.Array.GetRandom(Array.from(colsBelow));
            const candidates = [anchor - 1, anchor, anchor + 1].filter(c => c >= 0 && c < this.columns.length);

            newCols.add(Phaser.Utils.Array.GetRandom(candidates));
        } else {
            newCols.add(Phaser.Math.Between(0, this.columns.length - 1));
        }

        // Força a criação de um apoio, caso seja necessário (usado no spawn inicial)
        if (forceCol !== null) {
            newCols.add(forceCol);
        }

        // Cria os apoios extras
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

        // Atualiza o mapa de conectividade para evitar que o algoritmo quebre
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
        if (this.isMoving || this.isGameOver) return;

        const targetCol = this.currentPos.col + dCol;
        const targetY = this.mestreZen.y + dY;
        
        if (targetCol < 0 || targetCol >= this.columns.length) return; // Impede que o personagem saia pelas laterais do campo do jogo

        const possibleSupport = this.supports.getChildren().find(s => {
            const colMatch = s.getData('col') === targetCol;
            const distY = Math.abs(s.y - targetY);

            return colMatch && distY < 30; 
        });

        if (possibleSupport) {
            this.isMoving = true;
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
        }
    }

    // O game over ocorre se o personagem passar da borda inferior
    checkGameOver() {
        if (this.isMoving || this.isGameOver) return; // Evita que o movimento entre fendas seja considerado como uma queda

        const onSupport = this.supports.getChildren().some(s => {
            const sameCol = Math.abs(s.x - this.mestreZen.x) < 10;
            const sameHeight = Math.abs(s.y - this.mestreZen.y) < 20;
            
            return sameCol && sameHeight;
        });

        if (this.mestreZen.y > 650 || !onSupport) {
            this.isGameOver = true;
            this.physics.pause();
            this.add.text(400, 300, 'O mestre caiu... GAME OVER!', { fontSize: '40px', fill: '#f00' }).setOrigin(0.5);

            // Reinicia o jogo 3 segundos após o game over
            this.time.delayedCall(3000, () => {
                this.scene.restart();
            });
        }
    }
}