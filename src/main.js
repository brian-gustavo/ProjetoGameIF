import Phaser from 'phaser';

import MenuScene from './scenes/MenuScene';
import HelpScene from './scenes/HelpScene';
import PlayScene from './scenes/PlayScene';

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: { 
            gravity: { y: 0 },
            debug: false // "true" exibe as hitboxes dos objetos, o que é útil para testar colisões
        }
    },
    scene: [MenuScene, HelpScene, PlayScene]
};

const game = new Phaser.Game(config);