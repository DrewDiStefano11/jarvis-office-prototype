import { Scene, GameObjects, Math as PhaserMath, Input } from 'phaser';
import { EventBus } from '../EventBus';
import { INITIAL_AGENTS, OFFICE_LOCATIONS, WAYPOINTS } from '../../domain/seed';
import { getPath } from '../../domain/navigation';

export class OfficeScene extends Scene {
    private agentSprites: Map<string, GameObjects.Container> = new Map();
    private selectedAgentId: string | null = null;

    // Stable references for event bus cleanup
    private handleSelectAgentBound = this.handleSelectAgent.bind(this);
    private handleMoveAgentBound = this.handleMoveAgent.bind(this);
    private handleResetAllBound = this.handleResetAll.bind(this);

    constructor() {
        super('OfficeScene');
    }

    create() {
        this.drawOffice();
        this.createAgents();
        this.setupEventListeners();

        // Enable basic camera dragging/panning
        this.input.on('pointermove', (pointer: Input.Pointer) => {
            if (!pointer.isDown) return;
            if (pointer.event.target !== this.game.canvas) return;

            this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
            this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
        });

        // Zoom with mouse wheel
        this.input.on('wheel', (_pointer: Input.Pointer, _gameObjects: GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
            const currentZoom = this.cameras.main.zoom;
            let newZoom = currentZoom - deltaY * 0.001;
            newZoom = PhaserMath.Clamp(newZoom, 0.5, 2);
            this.cameras.main.setZoom(newZoom);
        });

        EventBus.emit('current-scene-ready', this);
    }

    private drawOffice() {
        this.cameras.main.setBackgroundColor('#2f3136');

        const graphics = this.add.graphics();
        graphics.lineStyle(2, 0x424549);

        graphics.strokeRect(312, 50, 400, 150);
        this.add.text(512, 60, 'Executive', { color: '#555', fontSize: '14px' }).setOrigin(0.5);

        graphics.strokeRect(50, 150, 300, 200);
        this.add.text(200, 160, 'Research & Knowledge', { color: '#555', fontSize: '14px' }).setOrigin(0.5);

        graphics.strokeRect(650, 150, 300, 200);
        this.add.text(800, 160, 'Personal Operations', { color: '#555', fontSize: '14px' }).setOrigin(0.5);

        graphics.strokeRect(400, 300, 224, 150);
        this.add.text(512, 310, 'Meeting Room', { color: '#555', fontSize: '14px' }).setOrigin(0.5);

        graphics.strokeRect(400, 470, 224, 100);
        this.add.text(512, 480, 'Shared Project Area', { color: '#555', fontSize: '14px' }).setOrigin(0.5);

        graphics.strokeRect(650, 450, 300, 250);
        this.add.text(800, 460, 'Governance & Security', { color: '#555', fontSize: '14px' }).setOrigin(0.5);

        graphics.strokeRect(400, 600, 224, 100);
        this.add.text(512, 610, 'Audit & Notification', { color: '#555', fontSize: '14px' }).setOrigin(0.5);

        graphics.strokeRect(50, 450, 300, 250);
        this.add.text(200, 460, 'Agent Builder Lab\n[OFFLINE]', { color: '#555', fontSize: '14px', align: 'center' }).setOrigin(0.5);

        OFFICE_LOCATIONS.forEach(loc => {
            let color = 0x666666;
            let w = 40;
            let h = 40;

            if (loc.type === 'desk') { color = 0x5c6bc0; w = 60; h = 30; }
            else if (loc.type === 'table') { color = 0x8d6e63; w = 100; h = 60; }
            else if (loc.type === 'terminal' || loc.type === 'station') { color = 0x78909c; w = 40; h = 40; }
            else if (loc.type === 'storage') { color = 0x8d6e63; w = 50; h = 80; }
            else if (loc.type === 'delivery') { color = 0x66bb6a; w = 30; h = 30; }

            graphics.fillStyle(color, 1);
            graphics.fillRect(loc.x - w/2, loc.y - h/2, w, h);

            this.add.text(loc.x, loc.y - h/2 - 10, loc.displayName, { fontSize: '10px', color: '#ccc' }).setOrigin(0.5);
        });
    }

    private createAgents() {
        INITIAL_AGENTS.forEach(agent => {
            const loc = OFFICE_LOCATIONS.find(l => l.id === agent.homeDesk);
            const startX = loc ? loc.x : 512;
            const startY = loc ? loc.y : 384;

            const container = this.add.container(startX, startY);
            container.setSize(30, 30);
            container.setInteractive({ useHandCursor: true });

            let shape;
            if (agent.visuals.shape === 'circle') {
                shape = this.add.circle(0, 0, 15, agent.visuals.color);
            } else if (agent.visuals.shape === 'triangle') {
                shape = this.add.triangle(0, 0, 0, -15, 15, 15, -15, 15, agent.visuals.color);
            } else {
                shape = this.add.rectangle(0, 0, 30, 30, agent.visuals.color);
            }

            const ring = this.add.circle(0, 0, 20, 0xffffff, 0);
            ring.setStrokeStyle(2, 0xffffff);
            ring.setName('selectionRing');
            ring.setVisible(false);

            const initialText = this.add.text(0, 0, agent.visuals.initial, {
                fontSize: '14px',
                color: '#000',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            const nameText = this.add.text(0, -25, agent.name, {
                fontSize: '12px',
                color: '#fff',
                backgroundColor: '#000000cc',
                padding: { x: 2, y: 1 }
            }).setOrigin(0.5);
            nameText.setName('nameText');

            container.add([ring, shape, initialText, nameText]);

            container.on('pointerdown', () => {
                this.selectAgent(agent.id);
            });

            this.agentSprites.set(agent.id, container);
        });
    }

    private setupEventListeners() {
        EventBus.on('react-select-agent', this.handleSelectAgentBound);
        EventBus.on('react-move-agent', this.handleMoveAgentBound);
        EventBus.on('react-reset-all', this.handleResetAllBound);

        this.events.on('shutdown', this.cleanupListeners, this);
        this.events.on('destroy', this.cleanupListeners, this);
    }

    private cleanupListeners() {
        EventBus.removeListener('react-select-agent', this.handleSelectAgentBound);
        EventBus.removeListener('react-move-agent', this.handleMoveAgentBound);
        EventBus.removeListener('react-reset-all', this.handleResetAllBound);
        this.input.off('pointermove');
        this.input.off('wheel');
    }

    private handleSelectAgent(agentId: string) {
        this.selectAgent(agentId, false);
    }

    private handleMoveAgent(data: { agentId: string, locationId: string, commandId: number }) {
        this.moveAgent(data.agentId, data.locationId, data.commandId);
    }

    private handleResetAll() {
        this.resetAllAgents();
    }

    private selectAgent(agentId: string, emitToReact: boolean = true) {
        if (this.selectedAgentId && this.agentSprites.has(this.selectedAgentId)) {
            const prevContainer = this.agentSprites.get(this.selectedAgentId)!;
            const ring = prevContainer.getByName('selectionRing') as GameObjects.Arc;
            if (ring) ring.setVisible(false);
            const text = prevContainer.getByName('nameText') as GameObjects.Text;
            if(text) text.setColor('#fff');
        }

        this.selectedAgentId = agentId;

        const container = this.agentSprites.get(agentId);
        if (container) {
            const ring = container.getByName('selectionRing') as GameObjects.Arc;
            if (ring) ring.setVisible(true);
            const text = container.getByName('nameText') as GameObjects.Text;
            if(text) text.setColor('#ffff00');
        }

        if (emitToReact) {
            EventBus.emit('agent-selected', agentId);
        }
    }

    private moveAgent(agentId: string, destinationLocationId: string, commandId: number) {
        const agentData = INITIAL_AGENTS.find(a => a.id === agentId); // Just for static config like speed
        const sprite = this.agentSprites.get(agentId);
        const destination = OFFICE_LOCATIONS.find(l => l.id === destinationLocationId);

        if (!agentData || !sprite || !destination) return;

        // Cancel existing tweens
        this.tweens.killTweensOf(sprite);

        let pathNodes: { x: number; y: number }[] = [];

        if (destination.approachNodeId) {
            const currentNode = WAYPOINTS.reduce((prev, curr) => {
                const prevDist = PhaserMath.Distance.Between(sprite.x, sprite.y, prev.x, prev.y);
                const currDist = PhaserMath.Distance.Between(sprite.x, sprite.y, curr.x, curr.y);
                return (currDist < prevDist) ? curr : prev;
            });

            const p = getPath(currentNode.id, destination.approachNodeId);
            if(p.length > 0) {
                pathNodes.push(currentNode);
                pathNodes = pathNodes.concat(p);
            }
        }

        pathNodes.push({ x: destination.x, y: destination.y });

        const speed = agentData.movementSpeed;
        const tweens: Phaser.Types.Tweens.TweenBuilderConfig[] = [];
        let currentX = sprite.x;
        let currentY = sprite.y;

        pathNodes.forEach(node => {
            const distance = PhaserMath.Distance.Between(currentX, currentY, node.x, node.y);
            if (distance > 5) {
                const duration = (distance / speed) * 1000;
                tweens.push({
                    targets: sprite,
                    x: node.x,
                    y: node.y,
                    duration: duration,
                    ease: 'Linear'
                });
                currentX = node.x;
                currentY = node.y;
            }
        });

        if (tweens.length > 0) {
            this.tweens.chain({
                tweens: tweens,
                onComplete: () => {
                    EventBus.emit('movement-completed', { agentId, locationId: destinationLocationId, commandId });
                }
            });
        } else {
             // Already there
             EventBus.emit('movement-completed', { agentId, locationId: destinationLocationId, commandId });
        }
    }

    private resetAllAgents() {
        INITIAL_AGENTS.forEach(agent => {
            const sprite = this.agentSprites.get(agent.id);
            const home = OFFICE_LOCATIONS.find(l => l.id === agent.homeDesk);

            if (sprite && home) {
                this.tweens.killTweensOf(sprite);
                sprite.x = home.x;
                sprite.y = home.y;
            }
        });
    }
}
