import { GameObjects, Input, Math as PhaserMath, Scene } from 'phaser';
import { floor1Definition } from '../../domain/floors/floor-1';
import { FloorSceneRenderer } from '../../rendering/FloorSceneRenderer';
import { EventBus } from '../EventBus';

export class OfficeScene extends Scene {
    private renderedObjectCount = 0;

    public constructor() {
        super('OfficeScene');
    }

    public create(): void {
        this.cameras.main.setBackgroundColor('#171310');
        this.cameras.main.setBounds(0, 0, 1792, 1024);
        this.cameras.main.setRoundPixels(true);
        this.cameras.main.setZoom(1);

        const renderer = new FloorSceneRenderer(this, floor1Definition);
        this.renderedObjectCount = renderer.render();

        this.input.on('pointermove', this.handlePointerMove, this);
        this.input.on('wheel', this.handleWheel, this);
        this.events.once('shutdown', this.cleanup, this);
        this.events.once('destroy', this.cleanup, this);

        EventBus.emit('floor-rendered', { objectCount: this.renderedObjectCount });
        EventBus.emit('current-scene-ready', this);
    }

    private handlePointerMove(pointer: Input.Pointer): void {
        if (!pointer.isDown || pointer.event.target !== this.game.canvas) return;
        this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
        this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
    }

    private handleWheel(
        pointer: Input.Pointer,
        _gameObjects: GameObjects.GameObject[],
        _deltaX: number,
        deltaY: number,
    ): void {
        const camera = this.cameras.main;
        const worldBefore = camera.getWorldPoint(pointer.x, pointer.y);
        camera.setZoom(PhaserMath.Clamp(camera.zoom - deltaY * 0.001, 0.55, 2));
        const worldAfter = camera.getWorldPoint(pointer.x, pointer.y);
        camera.scrollX += worldBefore.x - worldAfter.x;
        camera.scrollY += worldBefore.y - worldAfter.y;
    }

    private cleanup(): void {
        this.input.off('pointermove', this.handlePointerMove, this);
        this.input.off('wheel', this.handleWheel, this);
    }
}
