import { Scene } from 'phaser';

export class Preloader extends Scene {
    constructor() {
        super('Preloader');
    }

    preload() {
        // Load the new canonical map
        this.load.image('jarvis-floor-1-clean', '/assets/maps/jarvis-floor-1-clean.png');
    }

    create() {
        // We defer starting the scene to the React App via an Event,
        // or we default to FloorOneScene. App.tsx will tell us what to do if needed,
        // but let's default to FloorOneScene as requested.
        this.scene.start('FloorOneScene');
    }
}
