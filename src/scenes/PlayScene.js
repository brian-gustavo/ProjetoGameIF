import Phaser from 'phaser';

export default class PlayScene extends Phaser.Scene {
    constructor() {
        super('PlayScene');

        this.columns = [200, 400, 600]; // "Faixas" de movimentação do personagem
        this.stepDistance = 100; // Pras faixas descerem após cada "pulso"
    }

    create() {
        this.currentPos = { col: 1 }; // O personagem começa no centro
        this.isGameOver = false;
        this.spawnTimer = this.time.now + 2000;

        this.isMoving = true;
        this.time.delayedCall(500, () => { this.isMoving = false; });

        this.supports = this.physics.add.group(); // Fendas na montanha que serão os apoios do personagem

        // Spawn inicial de fendas (pra não acontecer game over instantâneo)
        for (let y = 100; y <= 500; y += this.stepDistance) {
            this.spawnSupportRow(y);
        }

        // Protagonista do jogo
        this.mestreZen = this.add.rectangle(this.columns[this.currentPos.col], 500, 40, 40, 0xffcc00);
        this.physics.add.existing(this.mestreZen);
        
        this.input.keyboard.on('keydown-LEFT', () => this.tryMove(-1, 0));
        this.input.keyboard.on('keydown-RIGHT', () => this.tryMove(1, 0));
        this.input.keyboard.on('keydown-UP', () => this.tryMove(0, -this.stepDistance));
        this.input.keyboard.on('keydown-DOWN', () => this.tryMove(0, this.stepDistance));

        this.add.text(10, 10, 'Use as setas para se movimentar', { fill: '#0f0' });
    }

    // "Pulso" de atualização constante das faixas de movimentação
    update(time) {
        if (this.isGameOver) return;

        if (time > this.spawnTimer) {
            this.moveMountainDown();
            this.spawnTimer = time + 2000;
        }

        this.checkGameOver();
    }

    // Spawn procedural de novos apoios
    spawnSupportRow(yPos) {
        this.columns.forEach((posX, index) => {
            if (Phaser.Math.Between(0, 10) > 4) {
                const support = this.add.rectangle(posX, yPos, 80, 20, 0x664422);
                this.physics.add.existing(support);
                support.setData('col', index);
                this.supports.add(support);
            }
        });

        // Se uma linha estiver vazia, força o spawn de um apoio
        if (this.supports.getChildren().filter(s => s.y === yPos).length === 0) {
            const safeIdx = Phaser.Math.Between(0, 2);
            const support = this.add.rectangle(this.columns[safeIdx], yPos, 80, 20, 0x664422);
            this.physics.add.existing(support);
            support.setData('col', safeIdx);
            this.supports.add(support);
        }
    }

    moveMountainDown() {
        if (this.isGameOver) return;

        this.isMoving = true;

        this.supports.getChildren().forEach(support => {
            support.y += this.stepDistance;
        });

        this.mestreZen.y += this.stepDistance; // Move o personagem pra baixo junto com a faixa na qual ele está

        this.spawnSupportRow(100);

        // Remove apoios que sumiram da tela
        this.supports.getChildren().forEach(support => {
            if (support.y > 700) support.destroy();
        });

        this.time.delayedCall(100, () => { this.isMoving = false; });
    }

    tryMove(dCol, dY) {
        if (this.isMoving || this.isGameOver) return;

        const targetCol = this.currentPos.col + dCol;
        const targetY = this.mestreZen.y + dY;
        
        if (targetCol < 0 || targetCol >= this.columns.length) return; // Impede que o personagem saia das colunas laterais

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