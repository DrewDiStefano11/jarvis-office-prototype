import { AUTO, Game, Types, Scale } from 'phaser';
import type { FloorDefinition } from '../domain/building/types';
import { Preloader } from './scenes/Preloader';
import { OfficeScene } from './scenes/OfficeScene';
import { HighResolutionLabScene } from './scenes/HighResolutionLabScene';
import { ApprovedFloorProofScene } from './scenes/ApprovedFloorProofScene';

export type SceneMode = 'floor' | 'high-resolution-lab' | 'approved-proof';

const config: Types.Core.GameConfig = {
    type: AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#2f3136',
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    scale: {
        mode: Scale.RESIZE,
        autoCenter: Scale.CENTER_BOTH
    },
    scene: [
        Preloader,
        OfficeScene,
        HighResolutionLabScene,
        ApprovedFloorProofScene,
    ]
};

const StartGame = (parent: string, floor: FloorDefinition, sceneMode: SceneMode = 'floor') => {
    return new Game({
        ...config,
        parent,
        callbacks: {
            preBoot: (game) => {
                game.registry.set('active-floor', floor);
                game.registry.set('scene-mode', sceneMode);
            },
        },
    });
}

export default StartGame;
