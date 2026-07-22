import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { floorOneLoader } from '../../data/floorOne/floorOneLoader';
import { FloorOneMapData, Point } from '../../data/floorOne/floorOneTypes';

type SelectionType = 'vertex' | 'door' | 'node' | 'edge' | null;

export class MapEditorScene extends Scene {
    private mapWidth = 1536;
    private mapHeight = 1024;

    private mapData: FloorOneMapData | null = null;

    private graphics!: Phaser.GameObjects.Graphics;

    // Editor State
    public hasUnsavedChanges = false;
    private history: string[] = [];
    private historyIndex = -1;

    // Selection
    private selectionType: SelectionType = null;
    private selectedId: string | null = null;
    private selectedVertexIndex: number = -1;
    private selectedParentId: string | null = null; // e.g. room id for vertex

    constructor() {
        super('MapEditorScene');
    }

    create() {
        floorOneLoader.loadInitialMap().then(data => {
            if (!this.sys.game) return;
            // Create a deep copy for the editor so we don't pollute the runtime instance unless exported/imported
            this.mapData = JSON.parse(JSON.stringify(data));
            this.pushHistory(); // Initial state
            this.initEditor();
        }).catch(e => {
            console.error("Editor failed to load map:", e);
        });
    }

    private initEditor() {
        this.add.image(0, 0, 'jarvis-floor-1-clean').setOrigin(0, 0).setDepth(0);
        this.add.rectangle(this.mapWidth / 2, this.mapHeight / 2, this.mapWidth, this.mapHeight, 0x000000, 0.4).setDepth(1);

        this.graphics = this.add.graphics();
        this.graphics.setDepth(10);

        this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
        this.fitMapToScreen();

        this.scale.on('resize', this.handleResize, this);

        // Disable context menu
        this.input.mouse!.disableContextMenu();

        this.input.on('pointerdown', this.handlePointerDown, this);
        this.input.on('pointermove', this.handlePointerMove, this);
        this.input.on('wheel', this.handleWheel, this);
        this.setupKeyboardControls();

        EventBus.on('editor-export', this.handleExport, this);
        EventBus.on('editor-import', this.handleImport, this);
        EventBus.on('editor-undo', this.undo, this);
        EventBus.on('editor-redo', this.redo, this);

        EventBus.emit('current-scene-ready', this);
    }

    update() {
        if (!this.mapData) return;
        this.renderGeometry();
    }

    private renderGeometry() {
        this.graphics.clear();

        if (!this.mapData) return;

        // Draw rooms (cyan)
        this.graphics.lineStyle(2, 0x00ffff, 0.8);
        this.mapData.rooms?.forEach(room => {
            this.drawPolygon(room.polygon);
            this.drawVertices(room.polygon, room.id);
        });

        // Walkable (green)
        this.graphics.lineStyle(2, 0x00ff00, 0.8);
        this.mapData.walkableAreas?.forEach(area => {
            this.drawPolygon(area.polygon);
            this.drawVertices(area.polygon, area.id);
        });

        // Blocked (red)
        this.graphics.lineStyle(2, 0xff0000, 0.8);
        this.mapData.blockedAreas?.forEach(area => {
            this.drawPolygon(area.polygon);
            this.drawVertices(area.polygon, area.id);
        });

        // Edges (blue line)
        this.graphics.lineStyle(2, 0x0000ff, 0.8);
        this.mapData.navigationEdges?.forEach(edge => {
            const n1 = this.mapData?.navigationNodes.find(n => n.id === edge.from);
            const n2 = this.mapData?.navigationNodes.find(n => n.id === edge.to);
            if (n1 && n2) {
                if (this.selectionType === 'edge' && this.selectedId === edge.id) {
                    this.graphics.lineStyle(4, 0xffff00, 1);
                } else {
                    this.graphics.lineStyle(2, 0x0000ff, 0.8);
                }
                this.graphics.strokeLineShape(new Phaser.Geom.Line(n1.x, n1.y, n2.x, n2.y));
            }
        });

        // Nodes (blue circle)
        this.mapData.navigationNodes?.forEach(node => {
            if (this.selectionType === 'node' && this.selectedId === node.id) {
                this.graphics.fillStyle(0xffff00, 1);
            } else {
                this.graphics.fillStyle(0x0000ff, 1);
            }
            this.graphics.fillCircle(node.x, node.y, 6);
        });

        // Doors (yellow square)
        this.mapData.doors?.forEach(door => {
            if (this.selectionType === 'door' && this.selectedId === door.id) {
                this.graphics.fillStyle(0xffffff, 1);
            } else {
                this.graphics.fillStyle(0xffff00, 1);
            }
            this.graphics.fillRect(door.x - 5, door.y - 5, 10, 10);
        });
    }

    private drawPolygon(points: Point[]) {
        if (points.length < 3) return;
        this.graphics.beginPath();
        this.graphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.graphics.lineTo(points[i].x, points[i].y);
        }
        this.graphics.closePath();
        this.graphics.strokePath();
    }

    private drawVertices(points: Point[], parentId: string) {
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            if (this.selectionType === 'vertex' && this.selectedParentId === parentId && this.selectedVertexIndex === i) {
                this.graphics.fillStyle(0xffffff, 1);
                this.graphics.fillCircle(p.x, p.y, 6);
            } else {
                this.graphics.fillStyle(0x00ffff, 0.5);
                this.graphics.fillCircle(p.x, p.y, 4);
            }
        }
    }

    private handlePointerDown(pointer: Phaser.Input.Pointer) {
        if (pointer.rightButtonDown() || pointer.middleButtonDown()) return;

        const isShift = pointer.event.shiftKey;

        const mapX = this.cameras.main.scrollX + (pointer.x / this.cameras.main.zoom);
        const mapY = this.cameras.main.scrollY + (pointer.y / this.cameras.main.zoom);

        // Hit test priority: Node -> Door -> Vertex -> Edge
        const hitRadius = 8 / this.cameras.main.zoom; // scale hit radius visually

        // 1. Nodes
        const hitNode = this.mapData?.navigationNodes.find(n => Phaser.Math.Distance.Between(n.x, n.y, mapX, mapY) < hitRadius);
        if (hitNode) {
            if (isShift && this.selectionType === 'node' && this.selectedId && this.selectedId !== hitNode.id) {
                // Add an edge between the already selected node and this new one
                this.addEdgeBetween(this.selectedId, hitNode.id);
                this.clearSelection();
            } else {
                this.setSelection('node', hitNode.id);
            }
            return;
        }

        if (isShift) return; // Shift is only used for adding edges between nodes currently

        // 2. Doors
        const hitDoor = this.mapData?.doors.find(d => Phaser.Math.Distance.Between(d.x, d.y, mapX, mapY) < hitRadius);
        if (hitDoor) {
            this.setSelection('door', hitDoor.id);
            return;
        }

        // 3. Vertices (rooms, walkable, blocked)
        let hitVertex = false;
        const checkVertices = (arr: Array<{ id: string, polygon: Point[] }>) => {
            if (hitVertex) return;
            arr.forEach(obj => {
                obj.polygon.forEach((p: Point, i: number) => {
                    if (!hitVertex && Phaser.Math.Distance.Between(p.x, p.y, mapX, mapY) < hitRadius) {
                        this.selectionType = 'vertex';
                        this.selectedParentId = obj.id;
                        this.selectedVertexIndex = i;
                        hitVertex = true;
                        this.emitSelectionUpdate();
                    }
                });
            });
        };

        if (this.mapData) {
            checkVertices(this.mapData.rooms);
            checkVertices(this.mapData.walkableAreas);
            checkVertices(this.mapData.blockedAreas);
        }
        if (hitVertex) return;

        // 4. Edges (line segment distance)
        let hitEdge = false;
        if (this.mapData) {
            for (const edge of this.mapData.navigationEdges) {
                const n1 = this.mapData.navigationNodes.find(n => n.id === edge.from);
                const n2 = this.mapData.navigationNodes.find(n => n.id === edge.to);
                if (n1 && n2) {
                    // simple distance to line segment check
                    const point = { x: mapX, y: mapY };

                    // a basic heuristic for line hit test
                    const dist = this.distToSegmentSquared(point, {x: n1.x, y: n1.y}, {x: n2.x, y: n2.y});
                    if (dist < hitRadius * hitRadius * 2) {
                        this.setSelection('edge', edge.id);
                        hitEdge = true;
                        break;
                    }
                }
            }
        }
        if (hitEdge) return;

        // Clicked nothing
        this.clearSelection();
    }

    private distToSegmentSquared(p: Point, v: Point, w: Point) {
      const l2 = Phaser.Math.Distance.BetweenPointsSquared(v, w);
      if (l2 === 0) return Phaser.Math.Distance.BetweenPointsSquared(p, v);
      let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
      t = Math.max(0, Math.min(1, t));
      return Phaser.Math.Distance.BetweenPointsSquared(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
    }

    private addEdgeBetween(nodeA: string, nodeB: string) {
        if (!this.mapData) return;
        const exists = this.mapData.navigationEdges.some(e =>
            (e.from === nodeA && e.to === nodeB) || (e.from === nodeB && e.to === nodeA)
        );
        if (!exists) {
            const newId = `edge-${Date.now()}`;
            this.mapData.navigationEdges.push({
                id: newId,
                from: nodeA,
                to: nodeB,
                movementCost: 100, // default
                bidirectional: true,
                enabled: true
            });
            this.markDirty();
            this.pushHistory();
        }
    }

    private setSelection(type: SelectionType, id: string) {
        this.selectionType = type;
        this.selectedId = id;
        this.selectedParentId = null;
        this.selectedVertexIndex = -1;
        this.emitSelectionUpdate();
    }

    private clearSelection() {
        this.selectionType = null;
        this.selectedId = null;
        this.selectedParentId = null;
        this.selectedVertexIndex = -1;
        this.emitSelectionUpdate();
    }

    private emitSelectionUpdate() {
        let msg = "None";
        if (this.selectionType === 'vertex') msg = `Vertex ${this.selectedVertexIndex} of ${this.selectedParentId}`;
        else if (this.selectionType) msg = `${this.selectionType.toUpperCase()} ${this.selectedId}`;
        EventBus.emit('editor-selection-changed', msg);
    }

    private handlePointerMove(pointer: Phaser.Input.Pointer) {
        const mapX = Math.round(this.cameras.main.scrollX + (pointer.x / this.cameras.main.zoom));
        const mapY = Math.round(this.cameras.main.scrollY + (pointer.y / this.cameras.main.zoom));

        EventBus.emit('editor-pointer-coords', { x: mapX, y: mapY });

        // If panning (middle click or right click drag)
        if (pointer.isDown && (pointer.middleButtonDown() || pointer.rightButtonDown())) {
            this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
            this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
            return;
        }

        // Dragging a point (left click drag)
        if (pointer.isDown && pointer.primaryDown && this.selectionType) {
            this.moveSelectedPoint(mapX, mapY);
        }
    }

    private moveSelectedPoint(newX: number, newY: number) {
        if (!this.mapData) return;

        // Clamp to map bounds
        newX = Phaser.Math.Clamp(newX, 0, this.mapWidth);
        newY = Phaser.Math.Clamp(newY, 0, this.mapHeight);

        if (this.selectionType === 'vertex' && this.selectedParentId) {
            const list = [...this.mapData.rooms, ...this.mapData.walkableAreas, ...this.mapData.blockedAreas];
            const obj = list.find(o => o.id === this.selectedParentId);
            if (obj && obj.polygon[this.selectedVertexIndex]) {
                obj.polygon[this.selectedVertexIndex].x = newX;
                obj.polygon[this.selectedVertexIndex].y = newY;
            }
        } else if (this.selectionType === 'node' && this.selectedId) {
            const node = this.mapData.navigationNodes.find(n => n.id === this.selectedId);
            if (node) {
                node.x = newX;
                node.y = newY;
            }
        } else if (this.selectionType === 'door' && this.selectedId) {
            const door = this.mapData.doors.find(d => d.id === this.selectedId);
            if (door) {
                door.x = newX;
                door.y = newY;
            }
        }
    }

    private setupKeyboardControls() {
        // Arrow keys to nudge selected point
        this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
            // Nudge logic
            const shift = event.shiftKey;
            const amt = shift ? 10 : 1;
            let dx = 0; let dy = 0;
            if (event.key === 'ArrowUp') dy = -amt;
            if (event.key === 'ArrowDown') dy = amt;
            if (event.key === 'ArrowLeft') dx = -amt;
            if (event.key === 'ArrowRight') dx = amt;

            if (dx !== 0 || dy !== 0) {
                if (this.selectionType) {
                    this.nudgeSelected(dx, dy);
                    this.markDirty();
                } else {
                    // Pan camera if nothing selected
                    this.cameras.main.scrollX += dx * 5;
                    this.cameras.main.scrollY += dy * 5;
                }
            }

            // Delete edge or vertex
            if (event.key === 'Delete' || event.key === 'Backspace') {
                 if (this.selectionType === 'edge' && this.mapData && this.selectedId) {
                     this.mapData.navigationEdges = this.mapData.navigationEdges.filter(e => e.id !== this.selectedId);
                     this.clearSelection();
                     this.markDirty();
                 } else if (this.selectionType === 'vertex' && this.mapData && this.selectedParentId) {
                     // Prevent deleting vertices if fewer than 3 would remain
                     const list = [...this.mapData.rooms, ...this.mapData.walkableAreas, ...this.mapData.blockedAreas];
                     const obj = list.find(o => o.id === this.selectedParentId);
                     if (obj && obj.polygon.length > 3) {
                         obj.polygon.splice(this.selectedVertexIndex, 1);
                         this.clearSelection();
                         this.markDirty();
                     }
                 }
            }
        });

        this.input.keyboard!.on('keydown-F', () => this.fitMapToScreen());
        this.input.keyboard!.on('keydown-ZERO', () => this.resetCamera());

        // Save history on pointer up if we moved something
        this.input.on('pointerup', () => {
            if (this.hasUnsavedChanges) {
                // If it was just a drag, we can save history step.
                // A better implementation would track if it actually moved, but this is fine for prototype.
                this.pushHistory();
            }
        });
    }

    private nudgeSelected(dx: number, dy: number) {
        if (!this.mapData) return;

        const getClamped = (val: number, max: number) => Phaser.Math.Clamp(val, 0, max);

        if (this.selectionType === 'vertex' && this.selectedParentId) {
            const list = [...this.mapData.rooms, ...this.mapData.walkableAreas, ...this.mapData.blockedAreas];
            const obj = list.find(o => o.id === this.selectedParentId);
            if (obj && obj.polygon[this.selectedVertexIndex]) {
                obj.polygon[this.selectedVertexIndex].x = getClamped(obj.polygon[this.selectedVertexIndex].x + dx, this.mapWidth);
                obj.polygon[this.selectedVertexIndex].y = getClamped(obj.polygon[this.selectedVertexIndex].y + dy, this.mapHeight);
            }
        } else if (this.selectionType === 'node' && this.selectedId) {
             const node = this.mapData.navigationNodes.find(n => n.id === this.selectedId);
             if (node) {
                 node.x = getClamped(node.x + dx, this.mapWidth);
                 node.y = getClamped(node.y + dy, this.mapHeight);
             }
        } else if (this.selectionType === 'door' && this.selectedId) {
             const door = this.mapData.doors.find(d => d.id === this.selectedId);
             if (door) {
                 door.x = getClamped(door.x + dx, this.mapWidth);
                 door.y = getClamped(door.y + dy, this.mapHeight);
             }
        }
    }

    private markDirty() {
        if (!this.hasUnsavedChanges) {
            this.hasUnsavedChanges = true;
            EventBus.emit('editor-dirty-state', true);
        }
    }

    private pushHistory() {
        if (!this.mapData) return;
        // Truncate future if we undid and are now saving new
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        this.history.push(JSON.stringify(this.mapData));
        this.historyIndex++;
        this.markDirty();
    }

    private undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.mapData = JSON.parse(this.history[this.historyIndex]);
            EventBus.emit('editor-dirty-state', true); // Still dirty compared to disk
        }
    }

    private redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.mapData = JSON.parse(this.history[this.historyIndex]);
        }
    }

    private handleExport() {
        if (!this.mapData) return;
        const json = JSON.stringify(this.mapData, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'jarvis-floor-1-map.json';
        a.click();
        URL.revokeObjectURL(url);

        this.hasUnsavedChanges = false;
        EventBus.emit('editor-dirty-state', false);
    }

    private handleImport(jsonString: string) {
        // Validation occurs on the React side before emitting this, but we parse to be safe
        try {
            const data = JSON.parse(jsonString);
            this.mapData = data;
            this.history = [];
            this.historyIndex = -1;
            this.pushHistory();
            this.hasUnsavedChanges = false;
            EventBus.emit('editor-dirty-state', false);
            this.clearSelection();
        } catch {
            console.error("Import failed in editor scene");
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

    shutdown() {
        this.scale.off('resize', this.handleResize, this);
        if (this.input.keyboard) {
            this.input.keyboard.removeAllListeners();
        }
        EventBus.removeListener('editor-export', this.handleExport, this);
        EventBus.removeListener('editor-import', this.handleImport, this);
        EventBus.removeListener('editor-undo', this.undo, this);
        EventBus.removeListener('editor-redo', this.redo, this);
    }
}
