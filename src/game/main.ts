import { AUTO, Game, Types, Scale } from 'phaser';
import type { FloorDefinition } from '../domain/building/types';
import { Preloader } from './scenes/Preloader';
import { OfficeScene } from './scenes/OfficeScene';

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
        OfficeScene
    ]
};

const StartGame = (parent: string, floor: FloorDefinition) => {
    return new Game({
        ...config,
        parent,
        callbacks: {
            preBoot: (game) => game.registry.set('active-floor', floor),
        },
    });
}

export default StartGame;
