import { GameObjects, Input, Math as PhaserMath, Scene } from 'phaser';
import type { FloorDefinition, Point2D } from '../../domain/building/types';
import { validateFloorDefinition } from '../../domain/building/validation';
import { FloorSceneRenderer } from '../../rendering/FloorSceneRenderer';
import { calculateProjectedFloorBounds, type ProjectedBounds } from '../../rendering/projectedBounds';
import { calculateFitFloor, clampCameraScroll, type ScreenInsets } from '../floorCamera';
import { EventBus } from '../EventBus';
import { worldToIsometric } from '../../rendering/isometric';
import { DEFAULT_VIEW_PREFERENCES, type ViewPreferences } from '../../rendering/viewState';

export type CameraCommand = 'fit' | 'reset' | 'zoom-in' | 'zoom-out';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.75;
const ZOOM_STEP = 0.16;

export class OfficeScene extends Scene {
    private floor!: FloorDefinition;
    private projectedBounds!: ProjectedBounds;
    private renderedObjectCount = 0;
    private floorRenderer?: FloorSceneRenderer;
    private viewPreferences: ViewPreferences = DEFAULT_VIEW_PREFERENCES;
    private safeArea: ScreenInsets = { top: 20, right: 20, bottom: 20, left: 304 };
    private dragging = false;
    private dragDistance = 0;
    private pointerStart: Point2D = { x: 0, y: 0 };
    private lastCameraEmit = 0;

    public constructor() {
        super('OfficeScene');
    }

    public create(): void {
        try {
            const activeFloor = this.registry.get('active-floor') as FloorDefinition | undefined;
            if (!activeFloor) throw new Error('No active floor definition was supplied');
            const validation = validateFloorDefinition(activeFloor);
            if (!validation.valid) throw new Error(`Active floor validation failed: ${validation.errors.join('; ')}`);
            this.floor = activeFloor;
            this.projectedBounds = calculateProjectedFloorBounds(this.floor);

            this.cameras.main.setBackgroundColor('#171310');
            this.cameras.main.setRoundPixels(true);
            this.cameras.main.setBounds(
                this.projectedBounds.x - 260,
                this.projectedBounds.y - 220,
                this.projectedBounds.width + 520,
                this.projectedBounds.height + 440,
            );

            this.floorRenderer = new FloorSceneRenderer(this, this.floor);
            this.renderedObjectCount = this.floorRenderer.render();
            this.bindInput();
            this.fitFloor();

            EventBus.emit('floor-rendered', { objectCount: this.renderedObjectCount, floorId: this.floor.id });
            EventBus.emit('current-scene-ready', this);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown scene initialization failure';
            EventBus.emit('floor-render-error', message);
        }
    }

    private bindInput(): void {
        this.input.addPointer(2);
        this.input.on('pointerdown', this.handlePointerDown, this);
        this.input.on('pointermove', this.handlePointerMove, this);
        this.input.on('pointerup', this.handlePointerUp, this);
        this.input.on('pointerupoutside', this.handlePointerUp, this);
        this.input.on('gameout', this.handlePointerUp, this);
        this.input.on('wheel', this.handleWheel, this);
        this.scale.on('resize', this.handleResize, this);
        EventBus.on('floor-camera-command', this.handleCameraCommand, this);
        EventBus.on('floor-ui-safe-area', this.handleSafeArea, this);
        EventBus.on('floor-view-preferences', this.handleViewPreferences, this);
        EventBus.on('floor-selection-command', this.handleSelectionCommand, this);
        EventBus.on('floor-camera-center', this.handleCameraCenter, this);
        EventBus.on('floor-camera-restore', this.handleCameraRestore, this);
        this.input.keyboard?.on('keydown-ESC', this.handleEscape, this);
        this.input.keyboard?.on('keydown-F', this.fitFloor, this);
        this.input.keyboard?.on('keydown-ZERO', this.resetView, this);
        this.input.keyboard?.on('keydown-PLUS', this.handleKeyboardZoomIn, this);
        this.input.keyboard?.on('keydown-MINUS', this.handleKeyboardZoomOut, this);
        this.events.once('shutdown', this.cleanup, this);
        this.events.once('destroy', this.cleanup, this);
        this.game.canvas.style.cursor = 'grab';
    }

    private handlePointerDown(pointer: Input.Pointer): void {
        if (pointer.event.target !== this.game.canvas || (!pointer.leftButtonDown() && !pointer.middleButtonDown())) return;
        this.dragging = true;
        this.dragDistance = 0;
        this.registry.set('camera-dragged', false);
        EventBus.emit('floor-drag-state', false);
        this.pointerStart = { x: pointer.x, y: pointer.y };
        this.game.canvas.style.cursor = 'grabbing';
    }

    private handlePointerMove(pointer: Input.Pointer): void {
        if (!this.dragging || !pointer.isDown) return;
        const camera = this.cameras.main;
        this.dragDistance = Math.max(this.dragDistance, Math.hypot(pointer.x - this.pointerStart.x, pointer.y - this.pointerStart.y));
        if (this.dragDistance > 6) {
            this.registry.set('camera-dragged', true);
            EventBus.emit('floor-drag-state', true);
        }
        const next = clampCameraScroll(
            {
                x: camera.scrollX - (pointer.x - pointer.prevPosition.x) / camera.zoom,
                y: camera.scrollY - (pointer.y - pointer.prevPosition.y) / camera.zoom,
            },
            { width: camera.width, height: camera.height },
            camera.zoom,
            this.projectedBounds,
        );
        camera.setScroll(Math.round(next.x), Math.round(next.y));
        this.emitCameraState();
    }

    private handlePointerUp(_pointer?: Input.Pointer, gameObjects: readonly GameObjects.GameObject[] = []): void {
        if (this.dragDistance < 6 && gameObjects.length === 0) this.floorRenderer?.selectEntity();
        this.dragging = false;
        this.game.canvas.style.cursor = 'grab';
        this.time.delayedCall(0, () => {
            this.registry.set('camera-dragged', false);
            EventBus.emit('floor-drag-state', false);
        });
    }

    private handleWheel(
        pointer: Input.Pointer,
        _gameObjects: GameObjects.GameObject[],
        _deltaX: number,
        deltaY: number,
    ): void {
        if (pointer.event.target !== this.game.canvas) return;
        pointer.event.preventDefault();
        this.zoomAt(pointer.x, pointer.y, -deltaY * 0.0008);
    }

    private zoomAt(screenX: number, screenY: number, delta: number): void {
        const camera = this.cameras.main;
        const worldBefore = camera.getWorldPoint(screenX, screenY);
        camera.setZoom(PhaserMath.Clamp(camera.zoom + delta, MIN_ZOOM, MAX_ZOOM));
        const worldAfter = camera.getWorldPoint(screenX, screenY);
        const next = clampCameraScroll(
            { x: camera.scrollX + worldBefore.x - worldAfter.x, y: camera.scrollY + worldBefore.y - worldAfter.y },
            { width: camera.width, height: camera.height },
            camera.zoom,
            this.projectedBounds,
        );
        camera.setScroll(Math.round(next.x), Math.round(next.y));
        this.emitCameraState();
    }

    private handleCameraCommand(command: CameraCommand): void {
        if (command === 'fit') this.fitFloor();
        else if (command === 'reset') this.resetView();
        else this.zoomAt(this.cameras.main.width / 2, this.cameras.main.height / 2, command === 'zoom-in' ? ZOOM_STEP : -ZOOM_STEP);
    }

    private handleSafeArea(safeArea: ScreenInsets): void {
        this.safeArea = safeArea;
        this.fitFloor();
    }

    private handleViewPreferences(preferences: ViewPreferences): void {
        this.viewPreferences = preferences;
        this.floorRenderer?.updateView(this.cameras.main.zoom, preferences);
    }

    private handleSelectionCommand(id?: string): void {
        this.floorRenderer?.selectEntity(id);
    }

    private handleCameraCenter(id: string): void {
        const position = this.floorRenderer?.getEntityWorldPosition(id);
        if (!position) return;
        const point = worldToIsometric(position);
        const camera = this.cameras.main;
        const targetZoom = Math.max(camera.zoom, 1.22);
        camera.setZoom(targetZoom);
        if (this.viewPreferences.effects === 'on') camera.pan(point.x, point.y, 360, 'Sine.easeInOut');
        else camera.centerOn(point.x, point.y);
        this.floorRenderer?.selectEntity(id);
        this.emitCameraState('Detail');
    }

    private handleEscape(): void {
        this.floorRenderer?.selectEntity();
        EventBus.emit('floor-presentation-exit');
    }

    private handleKeyboardZoomIn(): void {
        this.zoomAt(this.cameras.main.width / 2, this.cameras.main.height / 2, ZOOM_STEP);
    }

    private handleKeyboardZoomOut(): void {
        this.zoomAt(this.cameras.main.width / 2, this.cameras.main.height / 2, -ZOOM_STEP);
    }

    private handleCameraRestore(snapshot: { zoom: number; scrollX: number; scrollY: number }): void {
        if (!Number.isFinite(snapshot.zoom) || !Number.isFinite(snapshot.scrollX) || !Number.isFinite(snapshot.scrollY)) return;
        const camera = this.cameras.main;
        const zoom = PhaserMath.Clamp(snapshot.zoom, MIN_ZOOM, MAX_ZOOM);
        const scroll = clampCameraScroll(
            { x: snapshot.scrollX, y: snapshot.scrollY },
            { width: camera.width, height: camera.height },
            zoom,
            this.projectedBounds,
        );
        camera.setZoom(zoom).setScroll(scroll.x, scroll.y);
        this.emitCameraState(undefined, true);
    }

    private handleResize(): void {
        const camera = this.cameras.main;
        const next = clampCameraScroll(
            { x: camera.scrollX, y: camera.scrollY },
            { width: camera.width, height: camera.height },
            camera.zoom,
            this.projectedBounds,
        );
        camera.setScroll(next.x, next.y);
        this.emitCameraState();
    }

    private fitFloor(): void {
        const camera = this.cameras.main;
        const state = calculateFitFloor({
            viewport: { width: camera.width, height: camera.height },
            bounds: this.projectedBounds,
            safeArea: this.safeArea,
            margin: camera.width < 1000 ? 22 : 34,
            minZoom: MIN_ZOOM,
            maxZoom: 1.28,
        });
        camera.setZoom(state.zoom).setScroll(Math.round(state.scroll.x), Math.round(state.scroll.y));
        this.emitCameraState('Overview', true);
    }

    private resetView(): void {
        this.fitFloor();
        EventBus.emit('floor-view-reset');
    }

    private emitCameraState(view = this.cameras.main.zoom > 1.15 ? 'Detail' : 'Overview', force = false): void {
        if (!force && this.time.now - this.lastCameraEmit < 70) return;
        this.lastCameraEmit = this.time.now;
        this.floorRenderer?.updateView(this.cameras.main.zoom, this.viewPreferences);
        EventBus.emit('floor-camera-state', {
            zoom: this.cameras.main.zoom,
            view,
            scrollX: this.cameras.main.scrollX,
            scrollY: this.cameras.main.scrollY,
            dragging: this.dragging,
            dragDistance: this.dragDistance,
        });
    }

    private cleanup(): void {
        this.input.off('pointerdown', this.handlePointerDown, this);
        this.input.off('pointermove', this.handlePointerMove, this);
        this.input.off('pointerup', this.handlePointerUp, this);
        this.input.off('pointerupoutside', this.handlePointerUp, this);
        this.input.off('gameout', this.handlePointerUp, this);
        this.input.off('wheel', this.handleWheel, this);
        this.scale.off('resize', this.handleResize, this);
        EventBus.off('floor-camera-command', this.handleCameraCommand, this);
        EventBus.off('floor-ui-safe-area', this.handleSafeArea, this);
        EventBus.off('floor-view-preferences', this.handleViewPreferences, this);
        EventBus.off('floor-selection-command', this.handleSelectionCommand, this);
        EventBus.off('floor-camera-center', this.handleCameraCenter, this);
        EventBus.off('floor-camera-restore', this.handleCameraRestore, this);
        this.input.keyboard?.off('keydown-ESC', this.handleEscape, this);
        this.input.keyboard?.off('keydown-F', this.fitFloor, this);
        this.input.keyboard?.off('keydown-ZERO', this.resetView, this);
        this.input.keyboard?.off('keydown-PLUS', this.handleKeyboardZoomIn, this);
        this.input.keyboard?.off('keydown-MINUS', this.handleKeyboardZoomOut, this);
        this.game.canvas.style.cursor = '';
    }
}
