import { Scene } from 'phaser';

export class Preloader extends Scene {
    constructor() {
        super('Preloader');
    }

    preload() {
        // We will procedurally generate assets, so no external assets to load right now.
        // If we needed fonts or base UI elements, we'd load them here.
    }

    create() {
        this.scene.start('OfficeScene');
    }
}
