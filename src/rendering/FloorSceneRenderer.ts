import { GameObjects, Input, Scene, Time, Tweens } from 'phaser';
import type { FloorDefinition, Point2D, VisualMetadata } from '../domain/building/types';
import { inspectEntity, type InspectableEntityType, type InspectionDetails } from '../domain/building/inspection';
import { projectBounds, worldToIsometric } from './isometric';
import { createPixelArtTextures, ensureArchitectureTexture, ensureFurnitureTexture, occupantTextureKey } from './pixelTextures';
import { DEFAULT_VIEW_PREFERENCES, type ViewPreferences } from './viewState';
import { EventBus } from '../game/EventBus';

const paletteColor = (visual: VisualMetadata): number => {
    if (visual.palette.includes('cyan') || visual.palette.includes('nexus')) return 0x234d59;
    if (visual.palette.includes('red') || visual.palette.includes('rust')) return 0x795044;
    if (visual.palette.includes('violet') || visual.palette.includes('purple') || visual.palette.includes('plum')) return 0x675872;
    if (visual.palette.includes('blue') || visual.palette.includes('navy')) return 0x526b7c;
    if (visual.palette.includes('forest') || visual.palette.includes('olive')) return 0x68765f;
    if (visual.palette.includes('construction')) return 0xb57d2e;
    return 0xbda17f;
};

const variantTint = (variant: string): number | undefined => {
    if (variant.includes('security') || variant.includes('audit') || variant.includes('red')) return 0xd97862;
    if (variant.includes('operations') || variant.includes('cyan') || variant.includes('nexus')) return 0x72cbd6;
    if (variant.includes('violet') || variant.includes('purple') || variant.includes('plum') || variant.includes('containment')) return 0xb38bd2;
    if (variant.includes('quality')) return 0xaa8bd8;
    if (variant.includes('knowledge') || variant.includes('green')) return 0x8fbd7a;
    if (variant.includes('temporary') || variant.includes('amber') || variant.includes('yellow')) return 0xe2ba62;
    if (variant.includes('project') || variant.includes('blue') || variant.includes('vacant')) return 0x7fa8d2;
    if (variant.includes('executive') || variant.includes('gold')) return 0xd7ad6f;
    return undefined;
};

const drawDiamond = (graphics: GameObjects.Graphics, points: readonly Point2D[], color: number, pattern?: string): void => {
    graphics.fillStyle(color).beginPath().moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
    graphics.closePath().fillPath();
    graphics.lineStyle(2, 0x2b2521, 1).strokePath();
    const highlight = pattern === 'metal' ? 0x6bc7ce : pattern === 'carpet' ? 0xe4c49a : 0xf1d7b2;
    graphics.lineStyle(1, highlight, pattern === 'metal' ? 0.22 : 0.12);
    for (let amount = 0.2; amount < 0.9; amount += 0.2) {
        const left = { x: points[0].x + (points[3].x - points[0].x) * amount, y: points[0].y + (points[3].y - points[0].y) * amount };
        const right = { x: points[1].x + (points[2].x - points[1].x) * amount, y: points[1].y + (points[2].y - points[1].y) * amount };
        graphics.lineBetween(left.x, left.y, right.x, right.y);
    }
};

const accessColor = (level: string): number => level === 'highly-restricted' ? 0xe14b3f : level === 'restricted' ? 0xe99a3a : level === 'escorted-containment' ? 0xa56ad4 : level === 'department' ? 0x448ed1 : 0x58b96b;

interface EntityAnchor {
    readonly details: InspectionDetails;
    readonly screen: Point2D;
    readonly depth: number;
}

export class FloorSceneRenderer {
    private renderedObjectCount = 0;
    private readonly overviewLabels: GameObjects.Text[] = [];
    private readonly detailLabels: GameObjects.Text[] = [];
    private readonly occupantObjects: GameObjects.Image[] = [];
    private readonly workspaceObjects: Array<GameObjects.Shape | GameObjects.Text> = [];
    private readonly accessObjects: GameObjects.Shape[] = [];
    private readonly ambientObjects: Array<GameObjects.Rectangle | GameObjects.Ellipse> = [];
    private readonly ambientTweens: Tweens.Tween[] = [];
    private readonly entityAnchors = new Map<string, EntityAnchor>();
    private readonly selectionRing: GameObjects.Ellipse;
    private readonly hoverRing: GameObjects.Ellipse;
    private preferences: ViewPreferences = DEFAULT_VIEW_PREFERENCES;
    private hoverTimer?: Time.TimerEvent;
    private cameraDragged = false;

    public constructor(private readonly scene: Scene, private readonly floor: FloorDefinition) {
        this.selectionRing = scene.add.ellipse(0, 0, 34, 16, 0x000000, 0).setStrokeStyle(3, 0xffd36a).setVisible(false).setDepth(999999);
        this.hoverRing = scene.add.ellipse(0, 0, 30, 14, 0x000000, 0).setStrokeStyle(2, 0x8de8ef).setVisible(false).setDepth(999998);
        EventBus.on('floor-drag-state', this.handleDragState, this);
        scene.events.once('shutdown', this.destroy, this);
        scene.events.once('destroy', this.destroy, this);
    }

    public render(): number {
        createPixelArtTextures(this.scene);
        this.drawSpaces();
        this.drawDepartmentLabels();
        this.drawWalls();
        this.drawDoorsAndThresholds();
        this.drawFurniture();
        this.drawWorkspaces();
        this.drawArchitecture();
        this.drawAmbientEffects();
        this.drawOccupants();
        this.updateView(1, this.preferences);
        return this.renderedObjectCount;
    }

    public updateView(zoom: number, preferences: ViewPreferences): void {
        this.preferences = preferences;
        const showDetail = preferences.labels === 'on' || (preferences.labels === 'auto' && zoom >= 1.18);
        this.overviewLabels.forEach((label) => label.setVisible(preferences.labels !== 'minimal' || label.getData('essential') === true));
        this.detailLabels.forEach((label) => label.setVisible(showDetail));
        this.occupantObjects.forEach((object) => object.setVisible(preferences.occupants));
        this.workspaceObjects.forEach((object) => object.setVisible(preferences.workspaceStates));
        this.accessObjects.forEach((object) => object.setVisible(preferences.accessIndicators));
        const effectsVisible = preferences.effects !== 'off';
        this.ambientObjects.forEach((object) => object.setVisible(effectsVisible).setAlpha(preferences.effects === 'reduced' ? 0.38 : 0.78));
        this.ambientTweens.forEach((tween) => preferences.effects === 'on' ? tween.resume() : tween.pause());
    }

    public selectEntity(id?: string): InspectionDetails | undefined {
        const anchor = id ? this.entityAnchors.get(id) : undefined;
        this.selectionRing.setVisible(Boolean(anchor && this.preferences.roomHighlights));
        if (anchor) this.selectionRing.setPosition(anchor.screen.x, anchor.screen.y + 5).setDepth(anchor.depth + 9000);
        EventBus.emit('floor-selection', anchor?.details);
        return anchor?.details;
    }

    public getEntityWorldPosition(id: string): Point2D | undefined {
        return this.entityAnchors.get(id)?.details.position;
    }

    private drawSpaces(): void {
        [...this.floor.rooms, ...this.floor.zones].forEach((space) => {
            const points = projectBounds(space.bounds);
            const graphics = this.scene.add.graphics().setDepth(points[0].depth - 1000);
            drawDiamond(graphics, points, paletteColor(space.visual), space.visual.floorPattern);
            const inset = projectBounds({ x: space.bounds.x + 8, y: space.bounds.y + 8, width: Math.max(1, space.bounds.width - 16), height: Math.max(1, space.bounds.height - 16) });
            graphics.lineStyle(1, 0xf0d8b4, 0.3).beginPath().moveTo(inset[0].x, inset[0].y);
            inset.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
            graphics.closePath().strokePath();
            this.renderedObjectCount += 1;

            const entityType: InspectableEntityType = 'roomType' in space ? 'room' : 'zone';
            const center = worldToIsometric({ x: space.bounds.x + space.bounds.width / 2, y: space.bounds.y + space.bounds.height / 2 });
            const minX = Math.min(...points.map((point) => point.x));
            const maxX = Math.max(...points.map((point) => point.x));
            const minY = Math.min(...points.map((point) => point.y));
            const maxY = Math.max(...points.map((point) => point.y));
            const hitZone = this.scene.add.zone(center.x, center.y, Math.max(24, maxX - minX), Math.max(18, maxY - minY)).setDepth(points[0].depth - 900).setInteractive({ useHandCursor: true });
            this.bindInteraction(hitZone, entityType, space.id, center);

            if (space.visual.labelVisibility !== 'hidden') {
                const labelPoint = worldToIsometric({ x: space.bounds.x + space.bounds.width / 2, y: space.bounds.y + 10 });
                const label = this.scene.add.text(Math.round(labelPoint.x), Math.round(labelPoint.y), space.visual.shortLabel ?? space.visual.label, {
                    fontFamily: 'monospace', fontSize: '8px', color: '#f5e5c9', backgroundColor: '#201a17e8', padding: { x: 3, y: 2 }, align: 'center', wordWrap: { width: 112 },
                }).setOrigin(0.5).setDepth(labelPoint.depth + 5000);
                const essential = ('zoneType' in space && ['nexus', 'reception'].includes(space.zoneType)) || ('roomType' in space && space.roomType === 'construction');
                label.setData('essential', essential);
                (essential ? this.overviewLabels : this.detailLabels).push(label);
                this.renderedObjectCount += 1;
            }
        });
    }

    private drawWalls(): void {
        this.floor.walls.forEach((wall) => {
            const from = worldToIsometric(wall.from);
            const to = worldToIsometric(wall.to);
            const graphics = this.scene.add.graphics().setDepth(Math.max(from.depth, to.depth) + 200);
            const alpha = wall.material === 'glass' ? 0.38 : 1;
            const color = wall.material === 'construction-barrier' ? 0xb8782d : 0x625349;
            graphics.fillStyle(0x211b18, alpha * 0.55).beginPath().moveTo(from.x + 4, from.y + 5).lineTo(to.x + 4, to.y + 5).lineTo(to.x + 4, to.y - wall.height + 5).lineTo(from.x + 4, from.y - wall.height + 5).closePath().fillPath();
            graphics.fillStyle(color, alpha).beginPath().moveTo(from.x, from.y).lineTo(to.x, to.y).lineTo(to.x, to.y - wall.height).lineTo(from.x, from.y - wall.height).closePath().fillPath();
            graphics.lineStyle(2, wall.material === 'glass' ? 0xa8e8ed : 0x2a211c, alpha).strokePath();
            graphics.lineStyle(3, wall.material === 'construction-barrier' ? 0xf1b54f : 0xd5b78f, alpha * 0.76).lineBetween(from.x, from.y - wall.height, to.x, to.y - wall.height);
            graphics.lineStyle(1, 0x342a25, alpha * 0.8).lineBetween(from.x, from.y - 4, to.x, to.y - 4);
            this.renderedObjectCount += 1;
        });
    }

    private drawDepartmentLabels(): void {
        this.floor.departments.forEach((department) => {
            const point = worldToIsometric(department.labelPosition);
            const color = paletteColor(department.visual);
            const label = this.scene.add.text(Math.round(point.x), Math.round(point.y), department.visual.shortLabel ?? `${department.number}. ${department.name}`, {
                fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', color: '#fff3d6', backgroundColor: `#${color.toString(16).padStart(6, '0')}f2`,
                padding: { x: 7, y: 3 }, align: 'center', wordWrap: { width: 184 },
            }).setOrigin(0.5).setDepth(point.depth + 8000).setInteractive({ useHandCursor: true });
            label.setData('essential', true);
            this.overviewLabels.push(label);
            this.bindInteraction(label, 'department', department.id, point);
            this.renderedObjectCount += 1;
        });
    }

    private drawDoorsAndThresholds(): void {
        this.floor.doors.forEach((door) => {
            const point = worldToIsometric(door.position);
            const color = accessColor(door.accessLevel);
            const frame = this.scene.add.rectangle(Math.round(point.x), Math.round(point.y - 11), Math.max(12, door.width / 3), 22, 0x2b2623).setStrokeStyle(2, 0x9a826a).setDepth(point.depth + 300).setInteractive({ useHandCursor: true });
            this.scene.add.rectangle(Math.round(point.x), Math.round(point.y - 11), 3, 16, color).setDepth(point.depth + 302);
            this.scene.add.rectangle(Math.round(point.x + 6), Math.round(point.y - 17), 3, 3, color).setDepth(point.depth + 303);
            this.accessObjects.push(frame);
            this.bindInteraction(frame, 'door', door.id, point);
            this.renderedObjectCount += 3;
        });
        this.floor.accessThresholds.forEach((threshold) => {
            const point = worldToIsometric(threshold.position);
            const marker = this.scene.add.rectangle(Math.round(point.x + 8), Math.round(point.y - 7), 6, 10, accessColor(threshold.accessLevel)).setStrokeStyle(1, 0x171210).setDepth(point.depth + 350);
            this.accessObjects.push(marker);
            this.renderedObjectCount += 1;
        });
    }

    private addPixelImage(key: string, position: Point2D, scale = 1.25, visualVariant = ''): GameObjects.Image {
        const point = worldToIsometric(position);
        const image = this.scene.add.image(Math.round(point.x), Math.round(point.y), key).setScale(scale).setOrigin(0.5, 0.8).setDepth(point.depth + 400);
        const tint = variantTint(visualVariant);
        if (tint !== undefined) image.setTint(tint);
        this.renderedObjectCount += 1;
        return image;
    }

    private drawFurniture(): void {
        this.floor.furniture.forEach((entity) => this.addPixelImage(ensureFurnitureTexture(this.scene, entity.furnitureType, entity.visualVariant), entity.position, 1.28));
    }

    private drawWorkspaces(): void {
        this.floor.workspaces.forEach((entity) => {
            const point = worldToIsometric(entity.position);
            const state = entity.workspaceType === 'temporary' ? { color: 0xe4bd4c, code: 'T' } : entity.workspaceType === 'sandbox' ? { color: 0xa56ad4, code: 'C' } : entity.occupancyState === 'vacant' ? { color: 0x5d9dd5, code: 'V' } : entity.workspaceType === 'shared-surge' || (entity.shared && entity.occupancyState === 'standby') ? { color: 0x89979b, code: 'S' } : { color: 0x55b46a, code: 'A' };
            const plate = this.scene.add.rectangle(Math.round(point.x), Math.round(point.y + 5), 15, 7, state.color, 0.92).setStrokeStyle(1, 0x1b1714).setDepth(point.depth + 350).setInteractive({ useHandCursor: true });
            const code = this.scene.add.text(Math.round(point.x), Math.round(point.y + 5), state.code, { fontFamily: 'monospace', fontSize: '6px', color: '#101010' }).setOrigin(0.5).setDepth(point.depth + 351);
            this.workspaceObjects.push(plate, code);
            this.bindInteraction(plate, 'workspace', entity.id, point);
            this.renderedObjectCount += 2;
        });
    }

    private drawArchitecture(): void {
        this.floor.architecturalObjects.forEach((entity) => {
            const image = this.addPixelImage(ensureArchitectureTexture(this.scene, entity.architecturalType, entity.visualVariant), entity.position, 1.28).setInteractive({ useHandCursor: true });
            this.bindInteraction(image, 'architecture', entity.id, worldToIsometric(entity.position));
        });
    }

    private drawOccupants(): void {
        this.floor.occupants.forEach((entity) => {
            const image = this.addPixelImage(occupantTextureKey(entity.category), entity.position, 1.25, entity.visualVariant).setInteractive({ useHandCursor: true });
            this.occupantObjects.push(image);
            this.bindInteraction(image, 'occupant', entity.id, worldToIsometric(entity.position));
        });
    }

    private drawAmbientEffects(): void {
        const nexusParticles: GameObjects.Rectangle[] = [];
        this.floor.architecturalObjects.filter((entity) => entity.architecturalType === 'hologram').forEach((entity) => {
            const point = worldToIsometric(entity.position);
            for (let index = 0; index < 9; index += 1) {
                const particle = this.scene.add.rectangle(
                    Math.round(point.x - 16 + (index * 11) % 34),
                    Math.round(point.y - 10 - (index * 7) % 25),
                    index % 3 === 0 ? 3 : 2,
                    index % 2 === 0 ? 3 : 2,
                    0x67efff,
                    0.75,
                ).setDepth(point.depth + 720);
                nexusParticles.push(particle);
                this.ambientObjects.push(particle);
            }
        });
        if (nexusParticles.length > 0) {
            this.ambientTweens.push(this.scene.tweens.add({ targets: nexusParticles, y: '-=14', alpha: { from: 0.78, to: 0.18 }, duration: 1250, repeat: -1, yoyo: true, stagger: 85, ease: 'Stepped' }));
        }

        const containmentParticles: GameObjects.Rectangle[] = [];
        this.floor.occupants.filter((occupant) => occupant.category === 'sandbox').forEach((occupant, occupantIndex) => {
            const point = worldToIsometric(occupant.position);
            const colors = [0x6eeaff, 0x6edb84, 0xbd83e4, 0xf0aa45];
            for (let index = 0; index < 3; index += 1) {
                const particle = this.scene.add.rectangle(point.x - 8 + index * 7, point.y - 10 - index * 4, 2, 3, colors[occupantIndex % colors.length], 0.72).setDepth(point.depth + 610);
                containmentParticles.push(particle);
                this.ambientObjects.push(particle);
            }
        });
        if (containmentParticles.length > 0) {
            this.ambientTweens.push(this.scene.tweens.add({ targets: containmentParticles, y: '-=7', alpha: { from: 0.72, to: 0.28 }, duration: 1550, repeat: -1, yoyo: true, stagger: 110, ease: 'Stepped' }));
        }

        const equipmentLights: GameObjects.Rectangle[] = [];
        this.floor.furniture.filter((item) => ['operations-console', 'security-terminal'].includes(item.furnitureType)).forEach((item, index) => {
            if (index % 2 !== 0) return;
            const point = worldToIsometric(item.position);
            const light = this.scene.add.rectangle(point.x + 8, point.y - 11, 3, 2, item.furnitureType === 'operations-console' ? 0x52e6ed : 0xe76a53, 0.76).setDepth(point.depth + 730);
            equipmentLights.push(light);
            this.ambientObjects.push(light);
        });
        if (equipmentLights.length > 0) {
            this.ambientTweens.push(this.scene.tweens.add({ targets: equipmentLights, alpha: { from: 0.8, to: 0.28 }, duration: 900, repeat: -1, yoyo: true, stagger: 70, ease: 'Stepped' }));
        }
    }

    private bindInteraction(object: GameObjects.GameObject, entityType: InspectableEntityType, id: string, screen: Point2D): void {
        const details = inspectEntity(this.floor, entityType, id);
        if (!details) return;
        const depth = worldToIsometric(details.position).depth;
        this.entityAnchors.set(id, { details, screen, depth });
        object.on('pointerover', (pointer: Input.Pointer) => {
            if (pointer.isDown) return;
            this.hoverTimer?.remove(false);
            this.hoverTimer = this.scene.time.delayedCall(220, () => {
                this.hoverRing.setPosition(screen.x, screen.y + 5).setDepth(depth + 8999).setVisible(true);
                EventBus.emit('floor-hover', { details, x: pointer.x, y: pointer.y });
            });
        });
        object.on('pointermove', (pointer: Input.Pointer) => {
            if (!pointer.isDown && this.hoverRing.visible) EventBus.emit('floor-hover', { details, x: pointer.x, y: pointer.y });
        });
        object.on('pointerout', () => {
            this.hoverTimer?.remove(false);
            this.hoverTimer = undefined;
            this.hoverRing.setVisible(false);
            EventBus.emit('floor-hover', undefined);
        });
        object.on('pointerup', (pointer: Input.Pointer) => {
            if (!this.cameraDragged && this.scene.registry.get('camera-dragged') !== true && pointer.getDistance() <= 6) this.selectEntity(id);
        });
    }

    private handleDragState(dragged: boolean): void {
        this.cameraDragged = dragged;
        if (dragged) {
            this.hoverTimer?.remove(false);
            this.hoverRing.setVisible(false);
            EventBus.emit('floor-hover', undefined);
        }
    }

    private destroy(): void {
        this.hoverTimer?.remove(false);
        EventBus.off('floor-drag-state', this.handleDragState, this);
        this.ambientTweens.forEach((tween) => tween.destroy());
    }
}
