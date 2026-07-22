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
        const mode = this.registry.get('scene-mode');
        this.scene.start(mode === 'high-resolution-lab' ? 'HighResolutionLabScene' : mode === 'approved-proof' ? 'ApprovedFloorProofScene' : 'OfficeScene');
    }
}
