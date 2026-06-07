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
            fontSize: '64px', fill: '#fff', fontFamily: 'pixelta'
        }).setOrigin(0.5);

        // Botão "jogar"
        const btnJogar = this.add.text(400, 320, 'Jogar', {
            fontSize: '36px', fill: '#fff', fontFamily: 'pixelta'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btnJogar.on('pointerover', () => btnJogar.setStyle({ fill: '#ff0' }));
        btnJogar.on('pointerout',  () => btnJogar.setStyle({ fill: '#fff' }));
        btnJogar.on('pointerdown', () => this.scene.start('PlayScene'));

        // Botão "ajuda"
        const btnAjuda = this.add.text(400, 400, 'Ajuda', {
            fontSize: '36px', fill: '#fff', fontFamily: 'pixelta'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btnAjuda.on('pointerover', () => btnAjuda.setStyle({ fill: '#ff0' }));
        btnAjuda.on('pointerout',  () => btnAjuda.setStyle({ fill: '#fff' }));
        btnAjuda.on('pointerdown', () => this.scene.start('HelpScene'));
    }
}