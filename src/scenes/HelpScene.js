import Phaser from 'phaser';

/** TELA DE AJUDA (ACESSÍVEL ATRAVÉS DO MENU INICIAL) */
export default class HelpScene extends Phaser.Scene {
    constructor() {
        super('HelpScene');
    }

    preload() {
        this.load.image('background', 'assets/images/background.jpg');
    }

    create() {
        this.add.image(400, 300, 'background').setOrigin(0.5).setScale(800 / 512);

        this.add.text(400, 60, 'Ajuda', {
            fontSize: '64px', fill: '#fff', stroke: '#000', strokeThickness: 5, fontFamily: 'pixelta'
        }).setOrigin(0.5);

        const conteudo = [
            'O Mestre Zen busca subir a montanha para construir',
            'um templo de retiro espiritual em seu cume.',
            '',
            'Porém, as big techs enviaram drones para derrubá-lo!',
            '',
            'Comandos:',
            '← → : mover para os lados',
            '↑ ↓ : mover para cima ou para baixo',
            'Combinações diagonais também funcionam.',
            '',
            'Desvie dos drones e não caia da montanha!',
        ].join('\n');

        this.add.text(400, 180, conteudo, {
            fontSize: '24px', fill: '#fff', stroke: '#000', strokeThickness: 3, align: 'center', fontFamily: 'pixelta'
        }).setOrigin(0.5, 0.1);

        // Botão para voltar ao menu inicial
        const btnVoltar = this.add.text(400, 540, 'Voltar', {
            fontSize: '48px', fill: '#fff', stroke: '#000', strokeThickness: 5, fontFamily: 'pixelta'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btnVoltar.on('pointerover', () => btnVoltar.setStyle({ fill: '#ff0' }));
        btnVoltar.on('pointerout',  () => btnVoltar.setStyle({ fill: '#fff' }));
        btnVoltar.on('pointerdown', () => this.scene.start('MenuScene'));
    }
}