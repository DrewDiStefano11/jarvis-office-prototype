import { GameObjects, Geom, Input, Math as PhaserMath, Scene, Tweens } from 'phaser';
import { EventBus } from '../EventBus';
import { APPROVED_PROOF_CHARACTERS, APPROVED_PROOF_DOORS, APPROVED_PROOF_FURNITURE, APPROVED_PROOF_ROOMS, APPROVED_PROOF_ROUTES, DEFAULT_APPROVED_PROOF_PREFERENCES } from '../../approved-proof/data';
import type { ApprovedProofCharacter, ApprovedProofFurniture, ApprovedProofPreferences, ApprovedProofRoom, ApprovedProofSelection } from '../../approved-proof/types';
import { ensureLabCharacterTexture, ensureLabFurnitureTexture } from '../../visual-lab/textures';
import { VISUAL_LAB_PROFILE_BY_ID } from '../../visual-lab/profiles';
import type { VisualLabFurnitureType, VisualLabRole } from '../../visual-lab/types';

type Insets = { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number };
const PROFILE = VISUAL_LAB_PROFILE_BY_ID['candidate-e'];
const WORLD = { width: 1200, depth: 800 } as const;
const MIN_ZOOM = 0.34;
const MAX_ZOOM = 2.35;

const iso = (x: number, y: number) => ({ x: (x - y) * 0.72, y: (x + y) * 0.36, depth: x + y });
const pointsFor = (room: ApprovedProofRoom) => room.polygon.map((point) => iso(point.x, point.y));

function fillPolygon(graphics: GameObjects.Graphics, color: number, points: readonly { readonly x: number; readonly y: number }[], alpha = 1): void {
    graphics.fillStyle(color, alpha).beginPath().moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
    graphics.closePath().fillPath();
}

const furnitureTexture = (type: ApprovedProofFurniture['type']): VisualLabFurnitureType => ({
    'engineering-desk': 'engineering-desk', 'executive-desk': 'executive-desk', 'reception-desk': 'reception-desk', 'security-desk': 'security-desk',
    'ergonomic-chair': 'ergonomic-chair', 'executive-chair': 'executive-chair', 'conference-chair': 'meeting-chair', 'waiting-chair': 'waiting-chair', 'technical-chair': 'technical-chair',
    'nexus-console': 'console', 'release-table': 'meeting-table', 'side-table': 'side-table', shelf: 'shelf', 'archive-cabinet': 'archive-cabinet',
    'equipment-rack': 'equipment-rack', monitor: 'monitor', 'wall-display': 'monitor', whiteboard: 'monitor', printer: 'printer', 'plant-tall': 'plant', 'plant-table': 'plant',
    'checkpoint-gate': 'secure-reader', 'badge-reader': 'secure-reader', 'containment-pod': 'equipment-rack', lamp: 'plant',
}[type] as VisualLabFurnitureType);

const characterRole = (character: ApprovedProofCharacter): VisualLabRole => {
    if (character.roomId === 'executive') return 'executive';
    if (character.roomId === 'nexus') return 'operations';
    if (character.roomId === 'engineering') return character.role.includes('Lead') ? 'platform' : 'engineering';
    if (character.roomId === 'release-review') return 'meeting';
    if (character.roomId === 'public-entry') return character.role === 'Visitor' ? 'visitor' : 'permanent';
    if (character.roomId === 'sandbox-cell') return 'sandbox';
    return 'security';
};

export class ApprovedFloorProofScene extends Scene {
    private root?: GameObjects.Container;
    private preferences: ApprovedProofPreferences = DEFAULT_APPROVED_PROOF_PREFERENCES;
    private safeArea: Insets = { top: 18, right: 18, bottom: 18, left: 326 };
    private labels: GameObjects.Text[] = [];
    private movement: GameObjects.Graphics[] = [];
    private doorClearances: GameObjects.Graphics[] = [];
    private furnitureBounds: GameObjects.Rectangle[] = [];
    private effectObjects: GameObjects.Rectangle[] = [];
    private effectTweens: Tweens.Tween[] = [];
    private dragging = false;
    private dragDistance = 0;
    private startPointer = { x: 0, y: 0 };
    private textureKeys = new Set<string>();
    private objectCount = 0;

    public constructor() { super('ApprovedFloorProofScene'); }

    public create(): void {
        try {
            this.cameras.main.setBackgroundColor('#151311').setRoundPixels(true);
            this.renderProof();
            this.bindInput();
            this.time.delayedCall(0, () => this.fitFloor());
            EventBus.emit('approved-proof-rendered', { objectCount: this.objectCount, textureCount: this.textureKeys.size, roomCount: APPROVED_PROOF_ROOMS.length, characterCount: APPROVED_PROOF_CHARACTERS.length });
            EventBus.emit('current-scene-ready', this);
        } catch (error) {
            EventBus.emit('approved-proof-error', error instanceof Error ? error.message : 'Unknown approved-proof initialization failure');
        }
    }

    private renderProof(): void {
        this.root = this.add.container(0, 0);
        this.drawFoundation();
        APPROVED_PROOF_ROOMS.forEach((room) => this.drawRoom(room));
        this.drawRoutes();
        APPROVED_PROOF_DOORS.forEach((door) => this.drawDoor(door));
        APPROVED_PROOF_FURNITURE.forEach((item) => this.drawFurniture(item));
        APPROVED_PROOF_CHARACTERS.forEach((character) => this.drawCharacter(character));
        this.drawEffects();
        this.root.sort('depth');
        this.updatePreferences();
    }

    private drawFoundation(): void {
        const footprint = [{ x: 390, y: 0 }, { x: 785, y: 78 }, { x: 810, y: 130 }, { x: 1170, y: 130 }, { x: 1200, y: 655 }, { x: 845, y: 800 }, { x: 0, y: 790 }, { x: 0, y: 520 }, { x: 55, y: 365 }, { x: 105, y: 290 }, { x: 355, y: 410 }].map((point) => iso(point.x, point.y));
        const foundation = this.add.graphics().setDepth(-9000);
        const shadow = footprint.map((point) => ({ x: point.x + 14, y: point.y + 20 }));
        fillPolygon(foundation, 0x07090a, shadow, 0.8);
        fillPolygon(foundation, 0x52504b, footprint);
        foundation.lineStyle(6, 0x262729, 1).strokePoints(footprint.map((point) => new PhaserMath.Vector2(point.x, point.y)), true);
        foundation.lineStyle(2, 0xa4957f, 0.62).strokePoints(footprint.map((point) => new PhaserMath.Vector2(point.x, point.y)), true);
        this.root?.add(foundation); this.objectCount += 1;
    }

    private drawRoom(room: ApprovedProofRoom): void {
        const points = pointsFor(room);
        const graphics = this.add.graphics().setDepth(Math.min(...room.polygon.map((point) => point.x + point.y)) - 4000);
        fillPolygon(graphics, room.palette.floor, points);
        graphics.lineStyle(2, room.palette.floorLight, 0.35).strokePoints(points.map((point) => new PhaserMath.Vector2(point.x, point.y)), true);
        this.root?.add(graphics); this.objectCount += 1;

        this.drawWall(points[0], points[1], room);
        this.drawWall(points[0], points[points.length - 1], room);

        const polygon = new Geom.Polygon(points.map((point) => ({ x: point.x, y: point.y })));
        graphics.setInteractive(polygon, Geom.Polygon.Contains);
        graphics.on('pointerover', (pointer: Input.Pointer) => this.hoverRoom(room, pointer));
        graphics.on('pointermove', (pointer: Input.Pointer) => this.hoverRoom(room, pointer));
        graphics.on('pointerout', () => EventBus.emit('approved-proof-hover', undefined));
        graphics.on('pointerup', () => { if (this.dragDistance < 7) this.select({ id: room.id, title: room.title, subtitle: room.subtitle, kind: 'room' }); });

        const center = room.polygon.reduce((sum, point) => ({ x: sum.x + point.x / room.polygon.length, y: sum.y + point.y / room.polygon.length }), { x: 0, y: 0 });
        const labelPoint = iso(center.x, center.y);
        const label = this.add.text(labelPoint.x, labelPoint.y - 74, room.sign, { fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold', color: '#fff0c8', backgroundColor: '#181613e8', padding: { x: 7, y: 4 }, align: 'center' }).setOrigin(0.5).setDepth(labelPoint.depth + 8500);
        this.labels.push(label); this.root?.add(label); this.objectCount += 1;
    }

    private drawWall(start: { x: number; y: number; depth: number }, end: { x: number; y: number; depth: number }, room: ApprovedProofRoom): void {
        const h = 58;
        const wall = this.add.graphics().setDepth(Math.max(start.depth, end.depth) + 600);
        fillPolygon(wall, room.palette.wallSide, [start, end, { x: end.x + 7, y: end.y - h + 7 }, { x: start.x + 7, y: start.y - h + 7 }]);
        fillPolygon(wall, room.palette.wall, [start, end, { x: end.x, y: end.y - h }, { x: start.x, y: start.y - h }]);
        wall.lineStyle(4, room.palette.trim).lineBetween(start.x, start.y - h, end.x, end.y - h);
        wall.lineStyle(2, 0x241f1c, 0.9).lineBetween(start.x, start.y - 5, end.x, end.y - 5);
        wall.lineStyle(1, 0xf1ddba, 0.25).lineBetween(start.x, start.y - h + 8, end.x, end.y - h + 8);
        for (let panel = 1; panel <= 3; panel += 1) {
            const t0 = panel * 0.22 - 0.08; const t1 = t0 + 0.12;
            const a = { x: PhaserMath.Linear(start.x, end.x, t0), y: PhaserMath.Linear(start.y, end.y, t0) };
            const b = { x: PhaserMath.Linear(start.x, end.x, t1), y: PhaserMath.Linear(start.y, end.y, t1) };
            fillPolygon(wall, 0x202b31, [{ x: a.x, y: a.y - 44 }, { x: b.x, y: b.y - 44 }, { x: b.x, y: b.y - 18 }, { x: a.x, y: a.y - 18 }], 0.86);
            wall.lineStyle(1, room.palette.screen, 0.45).lineBetween(a.x, a.y - 42, b.x, b.y - 42);
        }
        this.root?.add(wall); this.objectCount += 1;
    }

    private drawRoutes(): void {
        APPROVED_PROOF_ROUTES.forEach((route) => {
            const graphics = this.add.graphics().setDepth(1800);
            const color = route.accessLevel === 'general' ? 0x72c790 : route.accessLevel === 'department' ? 0x66bce9 : route.accessLevel === 'restricted' ? 0xd1964e : 0xc172dd;
            const points = route.points.map((point) => iso(point.x, point.y));
            graphics.lineStyle(Math.max(6, route.width * 0.24), color, 0.16).strokePoints(points.map((point) => new PhaserMath.Vector2(point.x, point.y)));
            graphics.lineStyle(2, color, 0.82).strokePoints(points.map((point) => new PhaserMath.Vector2(point.x, point.y)));
            this.movement.push(graphics); this.root?.add(graphics); this.objectCount += 1;
        });
    }

    private drawDoor(door: (typeof APPROVED_PROOF_DOORS)[number]): void {
        const room = APPROVED_PROOF_ROOMS.find((candidate) => candidate.id === door.roomId)!;
        const point = iso(door.position.x, door.position.y);
        const mapped = door.visualType === 'containment' || door.visualType === 'checkpoint' ? 'secure-reader' : 'door';
        const key = ensureLabFurnitureTexture(this, PROFILE, mapped, `proof-door-${door.visualType}`, room.palette.accent, room.palette.wood, room.palette.fabric, room.palette.screen);
        this.textureKeys.add(key);
        const image = this.add.image(point.x, point.y - 12, key).setOrigin(0.5, 0.82).setScale(0.48).setDepth(point.depth + 4200);
        this.root?.add(image); this.objectCount += 1;
        const clearance = this.add.graphics().setDepth(point.depth + 3800);
        const p = [iso(door.position.x - door.clearance.width / 2, door.position.y - door.clearance.depth / 2), iso(door.position.x + door.clearance.width / 2, door.position.y - door.clearance.depth / 2), iso(door.position.x + door.clearance.width / 2, door.position.y + door.clearance.depth / 2), iso(door.position.x - door.clearance.width / 2, door.position.y + door.clearance.depth / 2)];
        fillPolygon(clearance, 0x60db8b, p, 0.2); clearance.lineStyle(2, 0x78ef9e, 0.8).strokePoints(p.map((value) => new PhaserMath.Vector2(value.x, value.y)), true);
        this.doorClearances.push(clearance); this.root?.add(clearance); this.objectCount += 1;
    }

    private drawFurniture(item: ApprovedProofFurniture): void {
        const room = APPROVED_PROOF_ROOMS.find((candidate) => candidate.id === item.roomId)!;
        const type = furnitureTexture(item.type);
        const key = ensureLabFurnitureTexture(this, PROFILE, type, `${room.id}-${item.type}`, room.palette.accent, room.palette.wood, room.palette.fabric, room.palette.screen);
        this.textureKeys.add(key);
        const point = iso(item.position.x, item.position.y);
        const image = this.add.image(point.x, point.y, key).setOrigin(0.5, 0.84).setScale((item.scale ?? 1) * 0.54).setFlipX(item.facing.includes('left')).setDepth(point.depth + 3000);
        this.root?.add(image); this.objectCount += 1;
        const bounds = this.add.rectangle(point.x, point.y, 54 * (item.scale ?? 1), 30 * (item.scale ?? 1), 0x000000, 0).setStrokeStyle(2, 0xffca66, 0.8).setDepth(point.depth + 7200);
        this.furnitureBounds.push(bounds); this.root?.add(bounds); this.objectCount += 1;
    }

    private drawCharacter(character: ApprovedProofCharacter): void {
        const role = characterRole(character);
        const key = ensureLabCharacterTexture(this, PROFILE, role, character.facing.includes('left') ? 'front-left' : 'front-right');
        this.textureKeys.add(key);
        const point = iso(character.position.x, character.position.y);
        const seated = character.pose !== 'standing' && character.pose !== 'contained';
        const image = this.add.image(point.x, point.y + (seated ? 8 : 0), key).setOrigin(0.5, 0.92).setScale(seated ? 0.58 : 0.66).setDepth(point.depth + 5200).setInteractive({ useHandCursor: true });
        image.on('pointerover', (pointer: Input.Pointer) => EventBus.emit('approved-proof-hover', { id: character.id, title: character.name, subtitle: `${character.role} · ${character.pose.replace(/-/g, ' ')}`, kind: 'character', x: pointer.x, y: pointer.y }));
        image.on('pointerout', () => EventBus.emit('approved-proof-hover', undefined));
        image.on('pointerup', () => { if (this.dragDistance < 7) this.select({ id: character.id, title: character.name, subtitle: `${character.role} · ${character.pose.replace(/-/g, ' ')}`, kind: 'character' }); });
        this.root?.add(image); this.objectCount += 1;
    }

    private drawEffects(): void {
        const centers = [{ x: 585, y: 390, color: 0x5ceaf2 }, { x: 1010, y: 275, color: 0x57c8ed }, { x: 260, y: 650, color: 0xc27fe3 }];
        centers.forEach((center, group) => {
            for (let index = 0; index < (group === 0 ? 10 : 5); index += 1) {
                const point = iso(center.x + (index % 4) * 18 - 30, center.y + Math.floor(index / 4) * 18 - 18);
                const dot = this.add.rectangle(point.x, point.y - 20, group === 0 ? 4 : 3, group === 0 ? 9 : 6, center.color, 0.55).setDepth(point.depth + 6900);
                this.effectObjects.push(dot); this.root?.add(dot); this.objectCount += 1;
                this.effectTweens.push(this.tweens.add({ targets: dot, y: dot.y - (8 + index % 3 * 3), alpha: { from: 0.28, to: 0.82 }, duration: 1050 + index * 90, yoyo: true, repeat: -1, delay: index * 75 }));
            }
        });
    }

    private bindInput(): void {
        this.input.addPointer(2);
        this.input.on('pointerdown', this.pointerDown, this); this.input.on('pointermove', this.pointerMove, this); this.input.on('pointerup', this.pointerUp, this); this.input.on('pointerupoutside', this.pointerUp, this); this.input.on('wheel', this.wheel, this);
        this.scale.on('resize', this.fitFloor, this);
        EventBus.on('approved-proof-camera-command', this.cameraCommand, this); EventBus.on('approved-proof-preferences', this.preferencesChanged, this); EventBus.on('approved-proof-safe-area', this.safeAreaChanged, this); EventBus.on('approved-proof-clear-selection', this.clearSelection, this);
        this.input.keyboard?.on('keydown-F', this.fitFloor, this); this.input.keyboard?.on('keydown-ZERO', this.resetView, this);
        this.events.once('shutdown', this.cleanup, this); this.events.once('destroy', this.cleanup, this);
        this.game.canvas.style.cursor = 'grab';
    }

    private pointerDown(pointer: Input.Pointer): void { this.dragging = true; this.dragDistance = 0; this.startPointer = { x: pointer.x, y: pointer.y }; this.game.canvas.style.cursor = 'grabbing'; }
    private pointerMove(pointer: Input.Pointer): void { if (!this.dragging) return; const dx = pointer.x - this.startPointer.x; const dy = pointer.y - this.startPointer.y; this.dragDistance += Math.abs(dx) + Math.abs(dy); this.cameras.main.scrollX -= dx / this.cameras.main.zoom; this.cameras.main.scrollY -= dy / this.cameras.main.zoom; this.startPointer = { x: pointer.x, y: pointer.y }; this.emitCamera('Manual'); }
    private pointerUp(): void { this.dragging = false; this.game.canvas.style.cursor = 'grab'; }
    private wheel(pointer: Input.Pointer, _objects: unknown, _dx: number, dy: number): void { const camera = this.cameras.main; const before = camera.getWorldPoint(pointer.x, pointer.y); camera.setZoom(PhaserMath.Clamp(camera.zoom - Math.sign(dy) * 0.12, MIN_ZOOM, MAX_ZOOM)); const after = camera.getWorldPoint(pointer.x, pointer.y); camera.scrollX += before.x - after.x; camera.scrollY += before.y - after.y; this.emitCamera('Pointer zoom'); }
    private cameraCommand(command: 'fit' | 'reset' | 'zoom-in' | 'zoom-out'): void { if (command === 'fit') this.fitFloor(); else if (command === 'reset') this.resetView(); else { this.cameras.main.setZoom(PhaserMath.Clamp(this.cameras.main.zoom + (command === 'zoom-in' ? 0.14 : -0.14), MIN_ZOOM, MAX_ZOOM)); this.emitCamera('Manual'); } }

    private fitFloor(): void {
        const camera = this.cameras.main; const top = iso(0, 0); const right = iso(WORLD.width, 0); const bottom = iso(WORLD.width, WORLD.depth); const left = iso(0, WORLD.depth);
        const minX = Math.min(top.x, right.x, bottom.x, left.x) - 95; const maxX = Math.max(top.x, right.x, bottom.x, left.x) + 95; const minY = -145; const maxY = Math.max(top.y, right.y, bottom.y, left.y) + 90;
        const availableWidth = camera.width - this.safeArea.left - this.safeArea.right; const availableHeight = camera.height - this.safeArea.top - this.safeArea.bottom;
        camera.setZoom(PhaserMath.Clamp(Math.min(availableWidth / (maxX - minX), availableHeight / (maxY - minY)), MIN_ZOOM, 1.35));
        const centerScreenX = this.safeArea.left + availableWidth / 2; const centerScreenY = this.safeArea.top + availableHeight / 2;
        camera.centerOn((minX + maxX) / 2 - (centerScreenX - camera.width / 2) / camera.zoom, (minY + maxY) / 2 - (centerScreenY - camera.height / 2) / camera.zoom); this.emitCamera('Fit Floor');
    }
    private resetView(): void { this.safeArea = { top: 18, right: 18, bottom: 18, left: 326 }; this.fitFloor(); this.emitCamera('Reset View'); }
    private emitCamera(view: string): void { const camera = this.cameras.main; EventBus.emit('approved-proof-camera-state', { zoom: camera.zoom, view, scrollX: camera.scrollX, scrollY: camera.scrollY }); }
    private hoverRoom(room: ApprovedProofRoom, pointer: Input.Pointer): void { EventBus.emit('approved-proof-hover', { id: room.id, title: room.title, subtitle: room.subtitle, kind: 'room', x: pointer.x, y: pointer.y }); }
    private select(selection: ApprovedProofSelection): void { EventBus.emit('approved-proof-selection', selection); }
    private clearSelection(): void { EventBus.emit('approved-proof-selection', undefined); }
    private preferencesChanged(preferences: ApprovedProofPreferences): void { this.preferences = preferences; this.updatePreferences(); }
    private safeAreaChanged(safeArea: Insets): void { this.safeArea = safeArea; this.fitFloor(); }
    private updatePreferences(): void { this.labels.forEach((label) => label.setVisible(this.preferences.labels !== 'minimal')); this.movement.forEach((item) => item.setVisible(this.preferences.showMovement)); this.doorClearances.forEach((item) => item.setVisible(this.preferences.showDoors)); this.furnitureBounds.forEach((item) => item.setVisible(this.preferences.showFurnitureBounds)); this.effectObjects.forEach((item) => item.setVisible(this.preferences.effects !== 'off')); this.effectTweens.forEach((tween) => tween.timeScale = this.preferences.effects === 'reduced' ? 0.35 : 1); }
    private cleanup(): void { this.effectTweens.forEach((tween) => tween.destroy()); this.effectTweens = []; this.input.off('pointerdown', this.pointerDown, this); this.input.off('pointermove', this.pointerMove, this); this.input.off('pointerup', this.pointerUp, this); this.input.off('pointerupoutside', this.pointerUp, this); this.input.off('wheel', this.wheel, this); this.scale.off('resize', this.fitFloor, this); EventBus.off('approved-proof-camera-command', this.cameraCommand, this); EventBus.off('approved-proof-preferences', this.preferencesChanged, this); EventBus.off('approved-proof-safe-area', this.safeAreaChanged, this); EventBus.off('approved-proof-clear-selection', this.clearSelection, this); this.game.canvas.style.cursor = 'default'; }
}
