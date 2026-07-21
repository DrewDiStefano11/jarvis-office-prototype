import { AUTO, Game, Types, Scale } from 'phaser';
import { Preloader } from './scenes/Preloader';
import { OfficeScene } from './scenes/OfficeScene';

const config: Types.Core.GameConfig = {
    type: AUTO,
    width: 1792,
    height: 1024,
    parent: 'game-container',
    backgroundColor: '#2f3136',
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH
    },
    scene: [
        Preloader,
        OfficeScene
    ]
};

const StartGame = (parent: string) => {
    return new Game({ ...config, parent });
}

export default StartGame;
