import Phaser from 'phaser';

/** MENU INICIAL DO JOGO */
export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    preload() {
        this.load.image('background', 'assets/images/background.jpg');
    }

    create() {
        this.add.image(400, 300, 'background').setOrigin(0.5).setScale(800 / 512);

        this.add.text(400, 150, 'Zen Master', {
            fontSize: '128px', fill: '#fff', stroke: '#000', strokeThickness: 7, fontFamily: 'pixelta'
        }).setOrigin(0.5);

        // Botão "jogar"
        const btnJogar = this.add.text(400, 320, 'Jogar', {
            fontSize: '48px', fill: '#fff', stroke: '#000', strokeThickness: 5, fontFamily: 'pixelta'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btnJogar.on('pointerover', () => btnJogar.setStyle({ fill: '#ff0' }));
        btnJogar.on('pointerout',  () => btnJogar.setStyle({ fill: '#fff' }));
        btnJogar.on('pointerdown', () => this.scene.start('PlayScene'));

        // Botão "ajuda"
        const btnAjuda = this.add.text(400, 400, 'Ajuda', {
            fontSize: '48px', fill: '#fff', stroke: '#000', strokeThickness: 5, fontFamily: 'pixelta'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btnAjuda.on('pointerover', () => btnAjuda.setStyle({ fill: '#ff0' }));
        btnAjuda.on('pointerout',  () => btnAjuda.setStyle({ fill: '#fff' }));
        btnAjuda.on('pointerdown', () => this.scene.start('HelpScene'));

        // Lê o recorde de pontuação salvo (ou 0 se ainda não houver nenhum)
        const bestScore = parseInt(localStorage.getItem('bestScore') || '0', 10);

        this.add.text(400, 510, `Melhor pontuação: ${bestScore}`, {
            fontSize: '32px', fill: '#fff', stroke: '#000', strokeThickness: 3, fontFamily: 'pixelta'
        }).setOrigin(0.5);
    }
}