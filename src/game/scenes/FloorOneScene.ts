import { Scene, Math as PhaserMath, Geom } from 'phaser';
import { EventBus } from '../EventBus';
import { floorOneLoader } from '../../data/floorOne/floorOneLoader';
import { NavigationSystem } from '../systems/NavigationSystem';
import { TestCharacter } from '../TestCharacter';
import { FloorOneMapData } from '../../data/floorOne/floorOneTypes';
import { DepthOcclusionSystem } from '../systems/DepthOcclusionSystem';

export class FloorOneScene extends Scene {

    // Configured map sizes
    private mapWidth = 1536;
    private mapHeight = 1024;

    private navSystem!: NavigationSystem;
    private testCharacter!: TestCharacter;
    private depthOcclusion!: DepthOcclusionSystem;
    private mapData: FloorOneMapData | null = null;

    // Debug
    private debugGraphics!: Phaser.GameObjects.Graphics;
    private showDebug = false;

    constructor() {
        super('FloorOneScene');
    }

    create() {
        // We cannot block scene creation with async in Phaser smoothly without breaking scene transitions.
        // We'll load the map asynchronously and then initialize the rest.
        floorOneLoader.loadInitialMap().then(mapData => {
            if (!this.sys.game) return; // Scene might have been destroyed while loading
            this.mapData = mapData;
            this.initMap();
        }).catch(e => {
            console.error("Failed to load map data", e);
            if (this.sys.game) {
                this.add.text(this.mapWidth/2, this.mapHeight/2, "ERROR: Map Load Failed", {color:'red', fontSize: '32px'}).setOrigin(0.5);
            }
        });
    }

    private roomPolygons: Phaser.GameObjects.Polygon[] = [];

    private initMap() {
        if (!this.mapData) return;
        this.add.image(0, 0, 'jarvis-floor-1-clean').setOrigin(0, 0).setDepth(0);

        // Debug graphics
        this.debugGraphics = this.add.graphics();
        this.debugGraphics.setDepth(20);

        this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
        this.fitMapToScreen();

        this.scale.on('resize', this.handleResize, this);

        // Navigation and Character
        this.navSystem = new NavigationSystem();
        this.navSystem.loadMap(this.mapData);

        const spawn = this.mapData.navigationNodes?.find(n => n.nodeType === 'spawn');
        this.testCharacter = new TestCharacter(this, spawn ? spawn.x : 768, spawn ? spawn.y : 1000);

        // Occlusion
        this.depthOcclusion = new DepthOcclusionSystem(this, this.mapData);
        this.depthOcclusion.setupOcclusion();

        // Create interactive room polygons for hover and click
        this.createInteractiveRooms();

        // Input
        this.input.on('pointerdown', this.handlePointerDown, this);
        this.input.on('pointermove', this.handlePointerMove, this);
        this.input.on('wheel', this.handleWheel, this);
        this.setupKeyboardControls();

        // Listen for React events
        EventBus.on('react-toggle-debug', this.toggleDebug, this);
        EventBus.on('react-reset-character', this.resetCharacter, this);
        EventBus.on('react-toggle-masks', this.toggleMasks, this);
        EventBus.on('react-move-character-to', this.moveCharacterToRoom, this);

        EventBus.emit('current-scene-ready', this);
    }

    private moveCharacterToRoom(roomId: string) {
        if (!this.mapData) return;
        const targetNode = this.mapData.navigationNodes?.find(n => n.roomId === roomId && n.enabled);
        if (targetNode) {
            const charPos = this.testCharacter.getPosition();
            const startNode = this.navSystem.getNearestNode(charPos.x, charPos.y);
            if (startNode) {
                const route = this.navSystem.calculatePath(startNode.id, targetNode.id);
                this.testCharacter.setRoute(route);
            }
        }
    }

    private createInteractiveRooms() {
        if (!this.mapData || !this.mapData.rooms) return;

        this.mapData.rooms.forEach(room => {
            const points = room.polygon.map(p => new PhaserMath.Vector2(p.x, p.y));

            // Create a transparent polygon
            const poly = this.add.polygon(0, 0, points, 0x00ffff, 0)
                .setOrigin(0, 0)
                .setDepth(5);

            poly.setInteractive(new Geom.Polygon(points), Geom.Polygon.Contains);

            poly.on('pointerover', (pointer: Phaser.Input.Pointer) => {
                if (pointer.isDown) return; // Don't hover while panning
                poly.setFillStyle(0x00ffff, 0.2); // Cyan overlay
                EventBus.emit('room-hovered', room);
            });

            poly.on('pointerout', () => {
                // Determine if this is the currently selected room by asking React or tracking it.
                // For now, clear hover style. Selection style might be reapplied if we keep track.
                poly.setFillStyle(0x00ffff, 0);
                EventBus.emit('room-hover-out');
            });

            poly.on('pointerdown', (pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
                if (pointer.rightButtonDown() || pointer.middleButtonDown()) return;

                // Clear others
                this.roomPolygons.forEach(p => p.setFillStyle(0x00ffff, 0));

                // Set selection style
                poly.setFillStyle(0xffa500, 0.4); // Amber overlay

                EventBus.emit('room-selected', room);
                event.stopPropagation();
            });

            this.roomPolygons.push(poly);
        });
    }

    update(_time: number, delta: number) {
        if (!this.mapData) return;
        this.testCharacter.update(delta);
    }

    private toggleDebug(show: boolean) {
        this.showDebug = show;
        this.debugGraphics.clear();

        if (this.showDebug && this.mapData) {
            // Draw nodes and edges
            this.debugGraphics.lineStyle(2, 0x0000ff, 0.5);
            this.mapData.navigationEdges?.forEach(edge => {
                const n1 = this.mapData?.navigationNodes?.find(n => n.id === edge.from);
                const n2 = this.mapData?.navigationNodes?.find(n => n.id === edge.to);
                if (n1 && n2) {
                    this.debugGraphics.strokeLineShape(new Phaser.Geom.Line(n1.x, n1.y, n2.x, n2.y));
                }
            });

            this.debugGraphics.fillStyle(0x0000ff, 0.8);
            this.mapData.navigationNodes?.forEach(node => {
                this.debugGraphics.fillCircle(node.x, node.y, 5);
            });

            // Draw rooms (cyan)
            this.debugGraphics.lineStyle(2, 0x00ffff, 0.5);
            this.mapData.rooms?.forEach(room => {
                const points = room.polygon.map(p => new Phaser.Math.Vector2(p.x, p.y));
                this.debugGraphics.strokePoints(points, true, true);
            });
        }
    }

    private toggleMasks(show: boolean) {
        if (this.depthOcclusion) this.depthOcclusion.setVisible(show);
    }

    private resetCharacter() {
        const spawn = this.mapData?.navigationNodes?.find(n => n.nodeType === 'spawn');
        if (spawn) {
            this.testCharacter.setPosition(spawn.x, spawn.y);
        }
    }

    private handlePointerDown(pointer: Phaser.Input.Pointer) {
        if (pointer.rightButtonDown() || pointer.middleButtonDown()) return;

        // If we click raw space (not caught by room), clear selection
        this.roomPolygons.forEach(p => p.setFillStyle(0x00ffff, 0));
        EventBus.emit('room-selected', null);
    }

    private handleResize() {
        if (!this.scene.isActive()) return;
        this.fitMapToScreen();
    }

    public fitMapToScreen() {
        const cam = this.cameras.main;
        const zoomX = this.scale.width / this.mapWidth;
        const zoomY = this.scale.height / this.mapHeight;
        const newZoom = Math.min(zoomX, zoomY) * 0.95;
        cam.setZoom(newZoom);
        cam.centerOn(this.mapWidth / 2, this.mapHeight / 2);
    }

    public resetCamera() {
        const cam = this.cameras.main;
        cam.setZoom(1);
        cam.centerOn(this.mapWidth / 2, this.mapHeight / 2);
    }

    private handlePointerMove(pointer: Phaser.Input.Pointer) {
        if (!pointer.isDown) return;
        if (pointer.primaryDown || pointer.middleButtonDown()) {
            this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
            this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
        }
    }

    private handleWheel(_pointer: Phaser.Input.Pointer, _gameObjects: unknown, _deltaX: number, deltaY: number) {
        const cam = this.cameras.main;
        const zoomStep = 0.1;
        let newZoom = cam.zoom;
        if (deltaY > 0) newZoom -= zoomStep;
        else if (deltaY < 0) newZoom += zoomStep;
        newZoom = Phaser.Math.Clamp(newZoom, 0.2, 3);
        cam.setZoom(newZoom);
    }

    private setupKeyboardControls() {
        const cursors = this.input.keyboard!.createCursorKeys();
        const panSpeed = 10;
        this.events.on('update', () => {
            if (!this.scene.isActive()) return;
            const cam = this.cameras.main;
            if (cursors.left.isDown) cam.scrollX -= panSpeed / cam.zoom;
            else if (cursors.right.isDown) cam.scrollX += panSpeed / cam.zoom;
            if (cursors.up.isDown) cam.scrollY -= panSpeed / cam.zoom;
            else if (cursors.down.isDown) cam.scrollY += panSpeed / cam.zoom;
        });

        this.input.keyboard!.on('keydown-F', () => this.fitMapToScreen());
        this.input.keyboard!.on('keydown-ZERO', () => this.resetCamera());
        this.input.keyboard!.on('keydown-ESC', () => {
            if (this.testCharacter) this.testCharacter.setRoute({path:[], found:false});
        });
    }

    shutdown() {
        this.scale.off('resize', this.handleResize, this);
        if (this.input.keyboard) {
            this.input.keyboard.removeAllListeners();
        }
        EventBus.removeListener('react-toggle-debug', this.toggleDebug, this);
        EventBus.removeListener('react-reset-character', this.resetCharacter, this);
        EventBus.removeListener('react-toggle-masks', this.toggleMasks, this);
        EventBus.removeListener('react-move-character-to', this.moveCharacterToRoom, this);
    }
}
