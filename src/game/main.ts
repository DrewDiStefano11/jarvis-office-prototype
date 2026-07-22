import { AUTO, Game, Types, Scale } from 'phaser';
import { Preloader } from './scenes/Preloader';
import { OfficeScene } from './scenes/OfficeScene';
import { FloorOneScene } from './scenes/FloorOneScene';
import { MapEditorScene } from './scenes/MapEditorScene';

const config: Types.Core.GameConfig = {
    type: AUTO,
    width: 1024,
    height: 768,
    parent: 'game-container',
    backgroundColor: '#2f3136',
    pixelArt: true,
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH
    },
    scene: [
        Preloader,
        OfficeScene,
        FloorOneScene,
        MapEditorScene
    ]
};

const StartGame = (parent: string) => {
    return new Game({ ...config, parent });
}

export default StartGame;
