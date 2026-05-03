import Phaser from 'phaser';

export default class PlayScene extends Phaser.Scene {
    constructor() {
        super('PlayScene');
        this.mestreZen = null;
        this.cursors = null;
    }

    preload() {
        // TODO...
    }

    create() {
        this.add.text(400, 300, 'A subida começa...', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);

        this.mestreZen = this.add.rectangle(400, 500, 40, 60, 0xffcc00);
        this.physics.add.existing(this.mestreZen);
        
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    update() {
        if (this.cursors.up.isDown) {
            this.mestreZen.body.setVelocityY(-160);
        } else if (this.cursors.down.isDown) {
            this.mestreZen.body.setVelocityY(160);
        } else {
            this.mestreZen.body.setVelocityY(0);
        }

        if (this.cursors.left.isDown) {
            this.mestreZen.body.setVelocityX(-160);
        } else if (this.cursors.right.isDown) {
            this.mestreZen.body.setVelocityX(160);
        } else {
            this.mestreZen.body.setVelocityX(0);
        }
    }
}