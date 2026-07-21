import { Scene, GameObjects, Input } from 'phaser';
import { EventBus } from '../EventBus';
import { globalBuildingRegistry } from '../../domain/building/registry';
import { createFloorId } from '../../types/ids';
import { floor1Departments } from '../../domain/floors/floor-1/departments';
import { floor1Rooms } from '../../domain/floors/floor-1/rooms';
import { floor1Workspaces } from '../../domain/floors/floor-1/workspaces';
import { floor1PlaceholderRoster } from '../../domain/agents/placeholderRoster';
import { floor1RouteNodes, floor1RouteEdges } from '../../domain/floors/floor-1/routes';
import { AgentVisualState } from '../../types/agents';
import { RouteEngine } from '../../domain/movement/routeEngine';

globalBuildingRegistry.registerFloor({
    id: createFloorId('floor-1'),
    name: 'JARVIS HQ',
    status: 'Operational',
    departments: floor1Departments,
    rooms: floor1Rooms,
    workspaces: floor1Workspaces,
    doors: [],
    routes: floor1RouteNodes as any,
    destinations: [],
    furniture: []
});

export class OfficeScene extends Scene {
    private agentSprites = new Map<string, GameObjects.Container>();
    private roomPolygons = new Map<string, GameObjects.Graphics>();

    private selectedAgentId: string | null = null;
    private selectedRoomId: string | null = null;

    private engine: RouteEngine;

    private handleSelectAgentBound = this.handleSelectAgent.bind(this);
    private handleMoveAgentBound = this.handleMoveAgent.bind(this);

    constructor() {
        super('OfficeScene');
        this.engine = new RouteEngine(floor1RouteNodes, floor1RouteEdges);
    }

    create() {
        this.cameras.main.setBackgroundColor('#f5f5f0');

        const logicalWidth = 1792;
        const logicalHeight = 1024;

        // Start view centered roughly
        this.cameras.main.setBounds(-500, -200, logicalWidth + 1000, logicalHeight + 1000);
        this.cameras.main.setScroll(400, -200);

        this.drawOffice();
        this.createAgents();
        this.setupEventListeners();

        this.input.on('pointermove', (pointer: Input.Pointer) => {
            if (!pointer.isDown) return;
            this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
            this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
        });

        this.input.on('wheel', (_pointer: Input.Pointer, _gameObjects: GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
            let newZoom = this.cameras.main.zoom - deltaY * 0.001;
            newZoom = Phaser.Math.Clamp(newZoom, 0.5, 2);
            this.cameras.main.setZoom(newZoom);
        });

        EventBus.emit('current-scene-ready', this);
    }

    // Isometric projection helper
    private toIso(x: number, y: number): { x: number, y: number } {
        return {
            x: (x - y) * Math.cos(0.523599),
            y: (x + y) * Math.sin(0.523599)
        };
    }

    private drawOffice() {
        const floorData = globalBuildingRegistry.getFloor(createFloorId('floor-1'));
        if (!floorData) return;

        // Depth sorting is critical in iso. We'll draw floor tiles, then back walls, then items.
        // For prototype, we'll draw simple iso polygons.

        floorData.rooms.forEach(room => {
            let color = 0xe0e0e0;
            if (room.roomType === 'private-office') color = 0xd7ccc8;
            if (room.roomType === 'conference') color = 0xc5cae9;
            if (room.roomType === 'sandbox') color = 0xe1bee7;
            if (room.roomType === 'construction') color = 0xffe082;
            if (room.id.includes('nexus')) color = 0xb2ebf2;

            const isoTL = this.toIso(room.bounds.x, room.bounds.y);
            const isoTR = this.toIso(room.bounds.x + room.bounds.width, room.bounds.y);
            const isoBR = this.toIso(room.bounds.x + room.bounds.width, room.bounds.y + room.bounds.height);
            const isoBL = this.toIso(room.bounds.x, room.bounds.y + room.bounds.height);

            const floorGfx = this.add.graphics();
            floorGfx.fillStyle(color, 1);
            floorGfx.beginPath();
            floorGfx.moveTo(isoTL.x, isoTL.y);
            floorGfx.lineTo(isoTR.x, isoTR.y);
            floorGfx.lineTo(isoBR.x, isoBR.y);
            floorGfx.lineTo(isoBL.x, isoBL.y);
            floorGfx.closePath();
            floorGfx.fillPath();
            floorGfx.lineStyle(2, 0x9e9e9e, 1);
            floorGfx.strokePath();

            // Add interaction zone for selection
            const hitArea = new Phaser.Geom.Polygon([isoTL, isoTR, isoBR, isoBL]);
            floorGfx.setInteractive(hitArea, Phaser.Geom.Polygon.Contains);
            floorGfx.on('pointerdown', () => this.selectRoom(room.id));

            this.roomPolygons.set(room.id, floorGfx);

            // Draw a partial cutaway wall on the left and top edges (isoTL -> isoTR and isoTL -> isoBL)
            const wallHeight = 40;
            const wallColor = 0xc0c0c0;

            const wallGfx = this.add.graphics();
            wallGfx.fillStyle(wallColor, 1);
            wallGfx.beginPath();
            wallGfx.moveTo(isoTL.x, isoTL.y);
            wallGfx.lineTo(isoTR.x, isoTR.y);
            wallGfx.lineTo(isoTR.x, isoTR.y - wallHeight);
            wallGfx.lineTo(isoTL.x, isoTL.y - wallHeight);
            wallGfx.closePath();
            wallGfx.fillPath();
            wallGfx.strokePath();

            wallGfx.beginPath();
            wallGfx.moveTo(isoTL.x, isoTL.y);
            wallGfx.lineTo(isoBL.x, isoBL.y);
            wallGfx.lineTo(isoBL.x, isoBL.y - wallHeight);
            wallGfx.lineTo(isoTL.x, isoTL.y - wallHeight);
            wallGfx.closePath();
            wallGfx.fillPath();
            wallGfx.strokePath();

            wallGfx.setDepth(isoTL.y);

            if (room.roomType !== 'support' && room.roomType !== 'sandbox' && room.roomType !== 'focus') {
                 const center = this.toIso(room.bounds.x + room.bounds.width/2, room.bounds.y + room.bounds.height/2);
                 const text = this.add.text(center.x, center.y, room.name, { fontSize: '10px', color: '#555', fontStyle: 'bold', align: 'center', wordWrap: { width: 80 } }).setOrigin(0.5);
                 text.setDepth(center.y + 10);
            }
        });

        // Nexus
        const nexus = floorData.rooms.find(r => r.id.includes('nexus'));
        if (nexus) {
             const cx = nexus.bounds.x + nexus.bounds.width / 2;
             const cy = nexus.bounds.y + nexus.bounds.height / 2;
             const isoC = this.toIso(cx, cy);
             const graphics = this.add.graphics();
             graphics.fillStyle(0x00bcd4, 0.5);
             graphics.fillCircle(isoC.x, isoC.y - 20, 30);
             graphics.setDepth(isoC.y);
             const text = this.add.text(isoC.x, isoC.y - 20, 'JARVIS\nCORE', { fontSize: '10px', color: '#0ff', align: 'center', fontStyle: 'bold' }).setOrigin(0.5);
             text.setDepth(isoC.y + 1);
        }

        floorData.workspaces.forEach(ws => {
            let color = 0x90caf9;
            let size = 20;

            if (ws.workspaceType === 'operational-console') color = 0xb0bec5;
            if (ws.workspaceType === 'private-office') { color = 0x795548; size = 25; }
            if (ws.workspaceType === 'temporary-desk') color = 0xffe082;
            if (ws.occupancyState === 'vacant') color = 0xe0e0e0;

            const isoPos = this.toIso(ws.position.x, ws.position.y);
            const graphics = this.add.graphics();

            graphics.fillStyle(color, 1);
            // Draw a small 3D box
            graphics.beginPath();
            graphics.moveTo(isoPos.x, isoPos.y);
            graphics.lineTo(isoPos.x + size/2, isoPos.y + size/4);
            graphics.lineTo(isoPos.x, isoPos.y + size/2);
            graphics.lineTo(isoPos.x - size/2, isoPos.y + size/4);
            graphics.closePath();
            graphics.fillPath();
            graphics.lineStyle(1, 0x000, 0.5);
            graphics.strokePath();

            graphics.setDepth(isoPos.y);

            if (ws.accessLevel === 'highly-restricted') {
                const text = this.add.text(isoPos.x, isoPos.y - size, '🔒', { fontSize: '10px' }).setOrigin(0.5);
                text.setDepth(isoPos.y + 1);
            }
        });
    }

    private createAgents() {
        floor1PlaceholderRoster.forEach(agent => {
            const ws = floor1Workspaces.find(w => w.id === agent.assignedWorkspaceId);
            const startX = ws ? ws.position.x : 100;
            const startY = ws ? ws.position.y : 100;
            const isoStart = this.toIso(startX, startY);

            const container = this.add.container(isoStart.x, isoStart.y);
            container.setSize(20, 40);
            container.setInteractive({ useHandCursor: true });
            container.setDepth(isoStart.y + 5);

            // Iso Agent Sprite (mocked as a vertical rectangle/capsule standing up)
            const shape = this.add.rectangle(0, -10, 12, 24, 0x4caf50);

            const stateIcon = this.add.text(8, -25, '', { fontSize: '10px' }).setOrigin(0.5);
            stateIcon.setName('stateIcon');

            const ring = this.add.ellipse(0, 5, 24, 12, 0x00bcd4, 0);
            ring.setStrokeStyle(2, 0x00bcd4);
            ring.setName('selectionRing');
            ring.setVisible(false);

            const nameText = this.add.text(0, -30, agent.placeholderName, {
                fontSize: '10px', color: '#fff', backgroundColor: '#000000aa', padding: { x: 2, y: 1 }
            }).setOrigin(0.5);
            nameText.setName('nameText');

            container.add([ring, shape, stateIcon, nameText]);

            this.updateAgentVisualState(container, agent.visualState);

            container.on('pointerdown', (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
                event.stopPropagation();
                this.selectAgent(agent.id);
            });

            this.agentSprites.set(agent.id, container);
        });
    }

    private updateAgentVisualState(container: GameObjects.Container, state: AgentVisualState) {
        const icon = container.getByName('stateIcon') as GameObjects.Text;
        if (!icon) return;

        switch (state) {
            case 'idle': icon.setText(''); break;
            case 'working': icon.setText('💻'); break;
            case 'waiting-for-approval': icon.setText('⏳'); break;
            case 'in-meeting': icon.setText('🗣️'); break;
            case 'testing-in-sandbox': icon.setText('🧪'); break;
            case 'paused': icon.setText('⏸️'); break;
            case 'error-alert': icon.setText('⚠️'); break;
            case 'walking': icon.setText('🚶'); break;
        }
    }

    private setupEventListeners() {
        EventBus.on('react-select-agent', this.handleSelectAgentBound);
        EventBus.on('react-move-agent', this.handleMoveAgentBound);
        this.events.on('shutdown', this.cleanupListeners, this);
        this.events.on('destroy', this.cleanupListeners, this);
    }

    private cleanupListeners() {
        EventBus.removeListener('react-select-agent', this.handleSelectAgentBound);
        EventBus.removeListener('react-move-agent', this.handleMoveAgentBound);
        this.input.off('pointermove');
        this.input.off('wheel');
    }

    private handleSelectAgent(agentId: string) {
        this.selectAgent(agentId, false);
    }

    private selectRoom(roomId: string) {
        if (this.selectedRoomId && this.roomPolygons.has(this.selectedRoomId)) {
             // Reset alpha
             const poly = this.roomPolygons.get(this.selectedRoomId)!;
             poly.setAlpha(1);
        }

        this.selectedRoomId = roomId;
        const poly = this.roomPolygons.get(roomId);
        if (poly) {
             poly.setAlpha(0.6); // highlight
        }

        EventBus.emit('room-selected', roomId);
    }

    private handleMoveAgent(data: { agentId: string, locationId: string }) {
        const agentData = floor1PlaceholderRoster.find(a => a.id === data.agentId);
        if (!agentData) return;

        // Use the route engine instead of straight lines
        // We assume agent starts at their assigned workspace for this mock.
        const ws = floor1Workspaces.find(w => w.id === agentData.assignedWorkspaceId);
        if (!ws) return;

        // Find closest node to workspace
        let startNode = floor1RouteNodes[0];
        let minDist = Infinity;
        floor1RouteNodes.forEach(n => {
             const d = Phaser.Math.Distance.Between(n.position.x, n.position.y, ws.position.x, ws.position.y);
             if (d < minDist) { minDist = d; startNode = n; }
        });

        const req = {
            startNodeId: startNode.id,
            endNodeId: data.locationId as any,
            agentAccessLevel: agentData.accessPermissions,
            agentType: agentData.isPermanent ? 'permanent' : 'temporary'
        } as any;

        const path = this.engine.findPath(req);
        if (!path || path.length === 0) {
             console.log("Path not found or blocked by access control");
             EventBus.emit('movement-failed', { agentId: data.agentId, reason: 'Access Denied or No Route' });
             return;
        }

        this.moveAgentAlongPath(data.agentId, path);
    }

    private selectAgent(agentId: string, emitToReact: boolean = true) {
        if (this.selectedAgentId && this.agentSprites.has(this.selectedAgentId)) {
            const prev = this.agentSprites.get(this.selectedAgentId)!;
            const ring = prev.getByName('selectionRing') as GameObjects.Arc;
            if (ring) ring.setVisible(false);
        }

        this.selectedAgentId = agentId;

        const container = this.agentSprites.get(agentId);
        if (container) {
            const ring = container.getByName('selectionRing') as GameObjects.Arc;
            if (ring) ring.setVisible(true);

            // Bring to top
            container.setDepth(container.y + 100);
        }

        if (emitToReact) {
            EventBus.emit('agent-selected', agentId);
        }
    }

    private moveAgentAlongPath(agentId: string, path: any[]) {
        const sprite = this.agentSprites.get(agentId);
        if (!sprite) return;

        this.tweens.killTweensOf(sprite);
        this.updateAgentVisualState(sprite, 'walking');

        const tweens: any[] = [];
        let currX = sprite.x;
        let currY = sprite.y;

        path.forEach(node => {
             const target = this.toIso(node.position.x, node.position.y);
             const distance = Phaser.Math.Distance.Between(currX, currY, target.x, target.y);
             if(distance > 1) {
                 tweens.push({
                     targets: sprite,
                     x: target.x,
                     y: target.y,
                     duration: (distance / 50) * 1000,
                     ease: 'Linear',
                     onUpdate: () => { sprite.setDepth(sprite.y + 5); } // keep depth sorted correctly in isometric
                 });
                 currX = target.x;
                 currY = target.y;
             }
        });

        if (tweens.length > 0) {
            this.tweens.chain({
                tweens: tweens,
                onComplete: () => {
                    this.updateAgentVisualState(sprite, 'idle');
                    EventBus.emit('movement-completed', { agentId });
                }
            });
        }
    }
}
