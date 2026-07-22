import { GameObjects, Geom, Input, Math as PhaserMath, Scene, Tweens } from 'phaser';
import { EventBus } from '../EventBus';
import { DEFAULT_VISUAL_LAB_PREFERENCES, EXPANSIVE_LAB_PROFILES, LAB_PALETTES, VISUAL_LAB_PROFILE_BY_ID } from '../../visual-lab/profiles';
import { ensureLabCharacterTexture, ensureLabFurnitureTexture } from '../../visual-lab/textures';
import type { VisualLabCandidateId, VisualLabEffectsMode, VisualLabFacing, VisualLabFurnitureType, VisualLabMode, VisualLabPreferences, VisualLabProfile, VisualLabRole, VisualLabSelection } from '../../visual-lab/types';

type ScreenInsets = { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number };
type RoomPaletteKey = keyof typeof LAB_PALETTES;

interface LabRoom {
    readonly id: string;
    readonly title: string;
    readonly sign: string;
    readonly subtitle: string;
    readonly palette: RoomPaletteKey;
    readonly material: 'wood' | 'carpet' | 'technical' | 'secure' | 'transition';
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly depth: number;
}

interface SuiteContext {
    readonly profile: VisualLabProfile;
    readonly container: GameObjects.Container;
    readonly scaleX: number;
    readonly scaleY: number;
    readonly rooms: readonly LabRoom[];
    readonly comparison: boolean;
    readonly titleTexts: Map<string, GameObjects.Text>;
    readonly dimensionObjects: GameObjects.Text[];
    readonly anchorObjects: Array<GameObjects.Rectangle | GameObjects.Ellipse>;
    readonly boundObjects: GameObjects.Graphics[];
    readonly ambientObjects: GameObjects.Rectangle[];
    readonly movementObjects: GameObjects.Graphics[];
    readonly circulationObjects: GameObjects.Graphics[];
    readonly furnitureBoundObjects: GameObjects.Rectangle[];
    readonly interactionBoundObjects: GameObjects.Graphics[];
    readonly particleObjects: GameObjects.Rectangle[];
    readonly lightingObjects: GameObjects.Rectangle[];
}

const BASE_SUITE = { width: 840, depth: 500 } as const;
const EXPANSIVE_SUITE = { width: 1000, depth: 700 } as const;
const MIN_ZOOM = 0.38;
const MAX_ZOOM = 2.8;
const ZOOM_STEP = 0.16;

const BASE_ROOMS: readonly LabRoom[] = [
    { id: 'engineering-open-work', title: 'Software Engineering Studio', sign: 'ENGINEERING', subtitle: 'Open work area · assigned, vacant, and surge workstations', palette: 'engineering', material: 'carpet', x: 0, y: 0, width: 320, depth: 210 },
    { id: 'executive-private-office', title: 'Executive Command Office', sign: 'EXECUTIVE', subtitle: 'Private office · warm wood, storage, and visitor seating', palette: 'executive', material: 'wood', x: 340, y: 0, width: 220, depth: 210 },
    { id: 'operations-console-area', title: 'Reliability Operations Console', sign: 'OPERATIONS', subtitle: 'Technical console · monitoring displays and raised floor', palette: 'operations', material: 'technical', x: 580, y: 0, width: 260, depth: 210 },
    { id: 'meeting-area', title: 'Project Review Room', sign: 'PROJECT REVIEW', subtitle: 'Meeting area · four chairs, presenter, display, and documents', palette: 'meeting', material: 'carpet', x: 0, y: 230, width: 390, depth: 210 },
    { id: 'secure-glass-area', title: 'Security Containment Review', sign: 'SECURE REVIEW', subtitle: 'Secure glass · reader, sensor, restricted threshold, and visitor', palette: 'security', material: 'secure', x: 410, y: 230, width: 250, depth: 210 },
    { id: 'transition-corridor', title: 'Knowledge Transition Corridor', sign: 'KNOWLEDGE', subtitle: 'Circulation · floor transition, sign, lighting, and plant', palette: 'corridor', material: 'transition', x: 680, y: 230, width: 160, depth: 210 },
] as const;

const EXPANSIVE_ROOMS: readonly LabRoom[] = [
    { id: 'engineering-open-work', title: 'Software Engineering Studio', sign: 'ENGINEERING', subtitle: 'Four workstations, collaboration, storage, and movement-ready desk access', palette: 'engineering', material: 'carpet', x: 0, y: 0, width: 390, depth: 270 },
    { id: 'executive-private-office', title: 'Executive Command Office', sign: 'EXECUTIVE', subtitle: 'Premium private office with full desk circulation and visitor zone', palette: 'executive', material: 'wood', x: 420, y: 0, width: 260, depth: 270 },
    { id: 'operations-console-area', title: 'Reliability Operations Center', sign: 'OPERATIONS', subtitle: 'Multi-console technical area with operator and supervisor aisles', palette: 'operations', material: 'technical', x: 710, y: 0, width: 290, depth: 270 },
    { id: 'meeting-area', title: 'Project Review Boardroom', sign: 'PROJECT REVIEW', subtitle: 'Presenter zone, detailed table, varied seating, and perimeter circulation', palette: 'meeting', material: 'carpet', x: 0, y: 300, width: 360, depth: 240 },
    { id: 'secure-glass-area', title: 'Security Containment Review', sign: 'SECURE REVIEW', subtitle: 'Contained secure route, observation lane, reader, camera, and privacy glass', palette: 'security', material: 'secure', x: 390, y: 300, width: 290, depth: 240 },
    { id: 'reception-waiting', title: 'Reception and Controlled Intake', sign: 'RECEPTION', subtitle: 'Public waiting, intake, escort, and visible checkpoint approach', palette: 'reception', material: 'transition', x: 710, y: 300, width: 290, depth: 240 },
    { id: 'knowledge-archive', title: 'Knowledge and Archive Corner', sign: 'KNOWLEDGE', subtitle: 'Search, reading, shelving, documents, and clear archive access', palette: 'knowledge', material: 'wood', x: 0, y: 570, width: 460, depth: 130 },
    { id: 'primary-circulation', title: 'Primary Movement Spine', sign: 'MOVEMENT SPINE', subtitle: 'Two-way circulation with future path anchors and no furniture encroachment', palette: 'corridor', material: 'transition', x: 490, y: 570, width: 510, depth: 130 },
] as const;

const iso = (x: number, y: number) => ({ x: (x - y) * 0.5, y: (x + y) * 0.25, depth: x + y });
const roomPoints = (room: LabRoom, scaleX: number, scaleY: number) => [
    iso(room.x * scaleX, room.y * scaleY),
    iso((room.x + room.width) * scaleX, room.y * scaleY),
    iso((room.x + room.width) * scaleX, (room.y + room.depth) * scaleY),
    iso(room.x * scaleX, (room.y + room.depth) * scaleY),
] as const;

function polygon(graphics: GameObjects.Graphics, color: number, points: readonly { readonly x: number; readonly y: number }[], alpha = 1): void {
    graphics.fillStyle(color, alpha).beginPath().moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
    graphics.closePath().fillPath();
}

const nextEffects = (effects: VisualLabEffectsMode): VisualLabEffectsMode => effects === 'on' ? 'reduced' : effects === 'reduced' ? 'off' : 'on';

export class HighResolutionLabScene extends Scene {
    private mode: VisualLabMode = 'comparison';
    private preferences: VisualLabPreferences = DEFAULT_VISUAL_LAB_PREFERENCES;
    private safeArea: ScreenInsets = { top: 18, right: 18, bottom: 18, left: 326 };
    private root?: GameObjects.Container;
    private suiteContexts: SuiteContext[] = [];
    private ambientTweens: Tweens.Tween[] = [];
    private selectedRoomId?: string;
    private hoveredRoomId?: string;
    private dragging = false;
    private dragDistance = 0;
    private pointerStart = { x: 0, y: 0 };
    private renderedObjectCount = 0;
    private generatedTextureKeys = new Set<string>();

    public constructor() {
        super('HighResolutionLabScene');
    }

    public create(): void {
        try {
            this.cameras.main.setBackgroundColor('#12100f').setRoundPixels(true);
            this.bindInput();
            this.renderMode();
            EventBus.emit('visual-lab-rendered', this.sceneSummary());
            EventBus.emit('current-scene-ready', this);
        } catch (error) {
            EventBus.emit('visual-lab-error', error instanceof Error ? error.message : 'Unknown visual-lab initialization failure');
        }
    }

    private bindInput(): void {
        this.input.addPointer(2);
        this.input.on('pointerdown', this.handlePointerDown, this);
        this.input.on('pointermove', this.handlePointerMove, this);
        this.input.on('pointerup', this.handlePointerUp, this);
        this.input.on('pointerupoutside', this.handlePointerUp, this);
        this.input.on('wheel', this.handleWheel, this);
        this.scale.on('resize', this.handleResize, this);
        EventBus.on('visual-lab-candidate', this.handleCandidate, this);
        EventBus.on('visual-lab-camera-command', this.handleCameraCommand, this);
        EventBus.on('visual-lab-preferences', this.handlePreferences, this);
        EventBus.on('visual-lab-safe-area', this.handleSafeArea, this);
        EventBus.on('visual-lab-clear-selection', this.clearSelection, this);
        this.input.keyboard?.on('keydown-F', this.fitPrototype, this);
        this.input.keyboard?.on('keydown-ZERO', this.resetView, this);
        this.events.once('shutdown', this.cleanup, this);
        this.events.once('destroy', this.cleanup, this);
        this.game.canvas.style.cursor = 'grab';
    }

    private renderMode(): void {
        this.ambientTweens.forEach((tween) => tween.destroy());
        this.ambientTweens = [];
        this.root?.destroy(true);
        this.root = this.add.container(0, 0);
        this.suiteContexts = [];
        this.renderedObjectCount = 0;
        this.selectedRoomId = undefined;
        this.hoveredRoomId = undefined;

        if (this.mode === 'comparison') {
            const placements = [
                { profile: EXPANSIVE_LAB_PROFILES[0], x: 0, y: -250 },
                { profile: EXPANSIVE_LAB_PROFILES[1], x: -420, y: 230 },
                { profile: EXPANSIVE_LAB_PROFILES[2], x: 420, y: 230 },
            ];
            placements.forEach(({ profile, x, y }) => {
                const suite = this.renderSuite(profile, true);
                suite.container.setPosition(x, y).setScale(0.43);
                this.root?.add(suite.container);
                const header = this.add.text(x, y - 152, `${profile.shortName.toUpperCase()}  ·  ${profile.assets.standing.width}×${profile.assets.standing.height} CHAR  ·  ${profile.assets.furniture} PX FURNITURE  ·  +${profile.dimensions.usableAreaIncrease}% AREA`, {
                    fontFamily: 'monospace', fontSize: '15px', fontStyle: 'bold', color: profile.id === 'baseline' ? '#d8c4a6' : '#fff0cb', backgroundColor: '#161310f2', padding: { x: 8, y: 5 },
                }).setOrigin(0.5).setDepth(100000);
                this.root?.add(header);
                this.renderedObjectCount += 1;
            });
        } else {
            const suite = this.renderSuite(VISUAL_LAB_PROFILE_BY_ID[this.mode], false);
            this.root.add(suite.container);
        }
        this.root.sort('depth');
        this.updatePreferenceVisibility();
        this.time.delayedCall(0, () => this.fitPrototype());
    }

    private renderSuite(profile: VisualLabProfile, comparison: boolean): SuiteContext {
        const container = this.add.container(0, 0);
        const expansive = profile.id === 'candidate-d' || profile.id === 'candidate-e';
        const layout = expansive ? EXPANSIVE_SUITE : BASE_SUITE;
        const rooms = expansive ? EXPANSIVE_ROOMS : BASE_ROOMS;
        const context: SuiteContext = {
            profile,
            container,
            scaleX: profile.dimensions.suiteWidth / layout.width,
            scaleY: profile.dimensions.suiteDepth / layout.depth,
            rooms,
            comparison,
            titleTexts: new Map(),
            dimensionObjects: [],
            anchorObjects: [],
            boundObjects: [],
            ambientObjects: [],
            movementObjects: [],
            circulationObjects: [],
            furnitureBoundObjects: [],
            interactionBoundObjects: [],
            particleObjects: [],
            lightingObjects: [],
        };
        this.suiteContexts.push(context);
        rooms.forEach((room) => this.drawRoom(context, room));
        if (expansive) this.drawExpansiveFurnitureAndOccupants(context);
        else this.drawFurnitureAndOccupants(context);
        this.drawGlassAndAccess(context);
        this.drawMovementValidation(context);
        this.drawAmbientDetail(context);
        container.sort('depth');
        return context;
    }

    private drawRoom(context: SuiteContext, room: LabRoom): void {
        const { profile, container, scaleX, scaleY, comparison } = context;
        const palette = LAB_PALETTES[room.palette];
        const points = roomPoints(room, scaleX, scaleY);
        const graphics = this.add.graphics().setDepth(points[0].depth - 5000);
        polygon(graphics, palette.floor, points);
        graphics.lineStyle(Math.max(1, profile.detailLevel), palette.floorLight, 0.42).strokePath();
        const patternStep = profile.id === 'baseline' ? 48 : profile.id === 'candidate-a' ? 38 : profile.id === 'candidate-b' ? 30 : 24;
        if (profile.detailLevel > 0 || room.material === 'technical') {
            for (let offset = patternStep; offset < room.width; offset += patternStep) {
                const start = iso((room.x + offset) * scaleX, room.y * scaleY);
                const end = iso((room.x + offset) * scaleX, (room.y + room.depth) * scaleY);
                graphics.lineStyle(1, room.material === 'wood' ? 0x8a5c37 : palette.floorLight, room.material === 'wood' ? 0.34 : 0.22).lineBetween(start.x, start.y, end.x, end.y);
            }
            if (room.material === 'technical' || room.material === 'secure') {
                for (let offset = patternStep; offset < room.depth; offset += patternStep) {
                    const start = iso(room.x * scaleX, (room.y + offset) * scaleY);
                    const end = iso((room.x + room.width) * scaleX, (room.y + offset) * scaleY);
                    graphics.lineStyle(1, palette.accent, 0.18).lineBetween(start.x, start.y, end.x, end.y);
                }
            }
        }
        container.add(graphics);
        this.renderedObjectCount += 1;

        if (!comparison) {
            const polygonGeometry = new Geom.Polygon(points.map((point) => ({ x: point.x, y: point.y })));
            graphics.setInteractive(polygonGeometry, Geom.Polygon.Contains);
            graphics.on('pointerover', (pointer: Input.Pointer) => this.handleRoomHover(room, pointer));
            graphics.on('pointermove', (pointer: Input.Pointer) => this.handleRoomHover(room, pointer));
            graphics.on('pointerout', () => this.handleRoomOut(room.id));
            graphics.on('pointerdown', () => { if (!this.dragging) this.selectRoom(room); });
        }

        this.drawWall(context, points[0], points[1], palette, profile);
        this.drawWall(context, points[0], points[3], palette, profile);

        const centerWorld = { x: (room.x + room.width / 2) * scaleX, y: (room.y + room.depth / 2) * scaleY };
        const center = iso(centerWorld.x, centerWorld.y);
        const signPoint = iso((room.x + 18) * scaleX, (room.y + 12) * scaleY);
        const physicalSign = this.add.text(Math.round(signPoint.x), Math.round(signPoint.y - (26 + profile.detailLevel * 7)), room.sign, {
            fontFamily: 'monospace', fontSize: comparison ? '6px' : `${6 + Math.min(2, profile.detailLevel)}px`, fontStyle: 'bold', color: '#f8e8c7', backgroundColor: '#211d1adf', padding: { x: 3, y: 1 }, align: 'left',
        }).setOrigin(0, 0.5).setDepth(signPoint.depth + 6000);
        physicalSign.setData('physical-sign', true);
        container.add(physicalSign);
        this.renderedObjectCount += 1;

        const floatingTitle = this.add.text(Math.round(center.x), Math.round(center.y - 56), room.title, {
            fontFamily: 'monospace', fontSize: profile.id === 'baseline' ? '14px' : '12px', fontStyle: 'bold', color: '#fff4d6', backgroundColor: profile.id === 'baseline' ? '#675247f0' : '#141d21f2', padding: { x: profile.id === 'baseline' ? 10 : 7, y: 4 }, wordWrap: { width: profile.id === 'baseline' ? 210 : 180 }, align: 'center',
        }).setOrigin(0.5).setDepth(center.depth + 9000);
        floatingTitle.setData('room-id', room.id);
        context.titleTexts.set(room.id, floatingTitle);
        container.add(floatingTitle);
        this.renderedObjectCount += 1;

        const dimension = this.add.text(Math.round(center.x), Math.round(center.y + 48), `${Math.round(room.width * scaleX)}×${Math.round(room.depth * scaleY)} · ${Math.round(room.width * scaleX * room.depth * scaleY).toLocaleString()} AREA`, {
            fontFamily: 'monospace', fontSize: '9px', color: '#ffdc8a', backgroundColor: '#181510dc', padding: { x: 4, y: 2 },
        }).setOrigin(0.5).setDepth(center.depth + 9100);
        context.dimensionObjects.push(dimension);
        container.add(dimension);

        const bounds = this.add.graphics().setDepth(center.depth + 9050).lineStyle(2, 0xffca66, 0.8).strokePoints(points.map((point) => new PhaserMath.Vector2(point.x, point.y)), true);
        context.boundObjects.push(bounds);
        container.add(bounds);
        const interactionBounds = this.add.graphics().setDepth(center.depth + 9060).lineStyle(3, 0x4ee7f0, 0.78).strokePoints(points.map((point) => new PhaserMath.Vector2(point.x, point.y)), true).setVisible(false);
        context.interactionBoundObjects.push(interactionBounds);
        container.add(interactionBounds);
    }

    private drawWall(context: SuiteContext, start: { readonly x: number; readonly y: number }, end: { readonly x: number; readonly y: number }, palette: typeof LAB_PALETTES[RoomPaletteKey], profile: VisualLabProfile): void {
        const height = 32 + profile.detailLevel * 8;
        const graphics = this.add.graphics().setDepth(500);
        polygon(graphics, palette.wallSide, [
            { x: start.x + profile.dimensions.wallThickness / 4, y: start.y + 4 },
            { x: end.x + profile.dimensions.wallThickness / 4, y: end.y + 4 },
            { x: end.x + profile.dimensions.wallThickness / 4, y: end.y - height + 4 },
            { x: start.x + profile.dimensions.wallThickness / 4, y: start.y - height + 4 },
        ]);
        polygon(graphics, palette.wall, [start, end, { x: end.x, y: end.y - height }, { x: start.x, y: start.y - height }]);
        graphics.lineStyle(Math.max(2, profile.detailLevel + 1), palette.trim).lineBetween(start.x, start.y - height, end.x, end.y - height);
        graphics.lineStyle(Math.max(1, profile.detailLevel), 0x2a2422, 0.9).lineBetween(start.x, start.y - 4, end.x, end.y - 4);
        if (profile.detailLevel > 1) graphics.lineStyle(1, 0xe8d6b5, 0.25).lineBetween(start.x, start.y - height + 5, end.x, end.y - height + 5);
        context.container.add(graphics);
        this.renderedObjectCount += 1;
    }

    private addFurniture(context: SuiteContext, type: VisualLabFurnitureType, paletteKey: RoomPaletteKey, x: number, y: number, scale = 1, depthOffset = 500): GameObjects.Image {
        const { profile } = context;
        const palette = LAB_PALETTES[paletteKey];
        const key = ensureLabFurnitureTexture(this, profile, type, paletteKey, palette.accent, palette.wood, palette.upholstery, palette.screen);
        this.generatedTextureKeys.add(key);
        const point = iso(x * context.scaleX, y * context.scaleY);
        const image = this.add.image(Math.round(point.x), Math.round(point.y), key).setScale(scale).setOrigin(0.5, 0.84).setDepth(point.depth + depthOffset);
        context.container.add(image);
        this.renderedObjectCount += 1;
        const anchor = this.add.rectangle(Math.round(point.x), Math.round(point.y), 4, 4, 0xffd05f).setDepth(point.depth + 9500);
        context.anchorObjects.push(anchor);
        context.container.add(anchor);
        const footprint = this.add.rectangle(Math.round(point.x), Math.round(point.y), Math.max(18, context.profile.assets.furniture * scale * 0.62), Math.max(10, context.profile.assets.furniture * scale * 0.28), 0x000000, 0).setStrokeStyle(1, 0xff9e4f, 0.9).setDepth(point.depth + 9400).setVisible(false);
        context.furnitureBoundObjects.push(footprint);
        context.container.add(footprint);
        return image;
    }

    private addCharacter(context: SuiteContext, role: VisualLabRole, facing: VisualLabFacing, x: number, y: number, scale = 1): GameObjects.Image {
        const key = ensureLabCharacterTexture(this, context.profile, role, facing);
        this.generatedTextureKeys.add(key);
        const point = iso(x * context.scaleX, y * context.scaleY);
        const seated = ['seated', 'operations', 'meeting'].includes(role);
        const image = this.add.image(Math.round(point.x), Math.round(point.y), key).setScale(scale).setOrigin(0.5, seated ? 0.88 : 0.92).setDepth(point.depth + (seated ? 590 : 680));
        image.setData('floor-y', image.y);
        context.container.add(image);
        this.renderedObjectCount += 1;
        const anchor = this.add.ellipse(Math.round(point.x), Math.round(point.y + 2), 12, 6, 0x000000, 0).setStrokeStyle(1, 0xffd05f).setDepth(point.depth + 9500);
        context.anchorObjects.push(anchor);
        context.container.add(anchor);
        return image;
    }

    private drawFurnitureAndOccupants(context: SuiteContext): void {
        const detailScale = context.profile.id === 'baseline' ? 1.05 : context.profile.id === 'candidate-a' ? 0.95 : context.profile.id === 'candidate-b' ? 0.92 : 0.88;
        // Open work area: two normal, one vacant, and one surge position.
        [[70, 72], [210, 72], [70, 158], [220, 158]].forEach(([x, y], index) => {
            this.addFurniture(context, 'desk', 'engineering', x, y, detailScale);
            this.addFurniture(context, 'monitor', 'engineering', x, y - 14, detailScale * 0.72, 560);
            this.addFurniture(context, 'chair', 'engineering', x, y + 30, detailScale * 0.78, 470);
            if (index === 0) this.addCharacter(context, 'seated', 'front-right', x, y + 24, detailScale);
            if (index === 1) this.addCharacter(context, 'permanent', 'front-left', x + 30, y + 28, detailScale);
            if (index === 3) this.addCharacter(context, 'temporary', 'front-right', x + 22, y + 25, detailScale);
        });
        this.addFurniture(context, 'plant', 'engineering', 292, 184, detailScale * 0.78);

        // Private executive office.
        this.addFurniture(context, 'executive-desk', 'executive', 440, 86, detailScale * 1.04);
        this.addFurniture(context, 'monitor', 'executive', 440, 66, detailScale * 0.70, 560);
        this.addFurniture(context, 'chair', 'executive', 440, 118, detailScale * 0.82, 470);
        this.addCharacter(context, 'executive', 'front-left', 440, 110, detailScale);
        this.addFurniture(context, 'meeting-chair', 'executive', 382, 158, detailScale * 0.74);
        this.addFurniture(context, 'meeting-chair', 'executive', 500, 158, detailScale * 0.74);
        this.addFurniture(context, 'shelf', 'executive', 525, 52, detailScale * 0.84);
        this.addFurniture(context, 'plant', 'executive', 365, 52, detailScale * 0.74);

        // Technical console area.
        this.addFurniture(context, 'console', 'operations', 650, 92, detailScale * 1.08);
        this.addFurniture(context, 'technical-chair', 'operations', 650, 133, detailScale * 0.82, 470);
        this.addCharacter(context, 'operations', 'front-right', 650, 122, detailScale);
        this.addFurniture(context, 'console', 'operations', 770, 92, detailScale * 1.08);
        this.addFurniture(context, 'technical-chair', 'operations', 770, 133, detailScale * 0.82, 470);
        this.addCharacter(context, 'permanent', 'front-left', 770, 160, detailScale);

        // Meeting area with four chairs, two seated occupants, and presenter.
        this.addFurniture(context, 'meeting-table', 'meeting', 190, 330, detailScale * 1.25);
        [[120, 300], [260, 300], [120, 385], [260, 385]].forEach(([x, y], index) => {
            this.addFurniture(context, 'meeting-chair', 'meeting', x, y, detailScale * 0.76, 470);
            if (index < 2) this.addCharacter(context, 'meeting', index === 0 ? 'front-right' : 'front-left', x, y - 8, detailScale);
        });
        this.addCharacter(context, 'presenter', 'front-right', 330, 350, detailScale);
        this.addFurniture(context, 'monitor', 'meeting', 58, 285, detailScale * 0.82);

        // Secure area and corridor occupants.
        this.addCharacter(context, 'security', 'front-right', 455, 350, detailScale);
        this.addCharacter(context, 'visitor', 'front-left', 520, 350, detailScale);
        this.addCharacter(context, 'sandbox', 'front-right', 610, 350, detailScale);
        this.addFurniture(context, 'desk', 'security', 510, 300, detailScale * 0.90);
        this.addFurniture(context, 'monitor', 'security', 510, 284, detailScale * 0.68, 560);
        this.addFurniture(context, 'plant', 'corridor', 760, 350, detailScale * 0.76);
        this.addFurniture(context, 'shelf', 'corridor', 740, 280, detailScale * 0.78);
        this.addCharacter(context, 'temporary', 'front-left', 790, 400, detailScale);
    }

    private drawExpansiveFurnitureAndOccupants(context: SuiteContext): void {
        const scale = context.profile.id === 'candidate-e' ? 0.72 : 0.82;
        const compact = scale * 0.78;

        // Engineering: four accessible desks, one vacant, one temporary/shared, collaboration and storage.
        [[72, 72], [205, 72], [72, 190], [205, 190]].forEach(([x, y], index) => {
            this.addFurniture(context, index === 3 ? 'temporary-desk' : 'engineering-desk', 'engineering', x, y, scale);
            this.addFurniture(context, 'monitor', 'engineering', x, y - 18, compact, 560);
            this.addFurniture(context, 'ergonomic-chair', 'engineering', x, y + 38, compact, 470);
            if (index === 0) this.addCharacter(context, 'engineering', 'front-right', x, y + 30, scale);
            if (index === 1) this.addCharacter(context, 'platform', 'front-left', x, y + 30, scale);
            if (index === 3) this.addCharacter(context, 'temporary', 'front-right', x + 28, y + 34, scale);
        });
        this.addFurniture(context, 'planning-table', 'engineering', 320, 135, scale * 0.95);
        this.addFurniture(context, 'shelf', 'engineering', 345, 45, compact);
        this.addFurniture(context, 'storage', 'engineering', 340, 230, compact);
        this.addFurniture(context, 'plant', 'engineering', 300, 225, compact);
        this.addFurniture(context, 'monitor', 'engineering', 36, 132, compact);

        // Executive: full circulation around desk and two visitor seats.
        this.addFurniture(context, 'executive-desk', 'executive', 520, 95, scale * 1.05);
        this.addFurniture(context, 'monitor', 'executive', 520, 72, compact, 560);
        this.addFurniture(context, 'executive-chair', 'executive', 520, 140, compact, 470);
        this.addCharacter(context, 'executive', 'front-left', 520, 128, scale);
        this.addFurniture(context, 'meeting-chair', 'executive', 465, 205, compact);
        this.addFurniture(context, 'meeting-chair', 'executive', 580, 205, compact);
        this.addFurniture(context, 'side-table', 'executive', 620, 190, compact);
        this.addFurniture(context, 'shelf', 'executive', 635, 55, compact);
        this.addFurniture(context, 'storage', 'executive', 450, 55, compact);
        this.addFurniture(context, 'plant', 'executive', 630, 230, compact);

        // Operations: three consoles, two active operators, one visibly vacant, rear access and equipment.
        [[760, 85], [855, 85], [950, 85]].forEach(([x, y], index) => {
            this.addFurniture(context, 'console', 'operations', x, y, scale);
            this.addFurniture(context, 'technical-chair', 'operations', x, y + 52, compact, 470);
            if (index < 2) this.addCharacter(context, 'operations', index === 0 ? 'front-right' : 'front-left', x, y + 38, scale);
        });
        this.addFurniture(context, 'equipment-rack', 'operations', 965, 220, compact);
        this.addFurniture(context, 'equipment-rack', 'operations', 735, 220, compact);
        this.addCharacter(context, 'quality', 'front-right', 860, 220, scale);

        // Boardroom: six chairs, three participants, presenter zone, documents and display.
        this.addFurniture(context, 'meeting-table', 'meeting', 175, 405, scale * 1.18);
        [[82, 355], [175, 345], [268, 355], [82, 475], [175, 485], [268, 475]].forEach(([x, y], index) => {
            this.addFurniture(context, 'meeting-chair', 'meeting', x, y, compact, 470);
            if (index < 3) this.addCharacter(context, index === 2 ? 'project' : 'meeting', index % 2 === 0 ? 'front-right' : 'front-left', x, y - 10, scale);
        });
        this.addCharacter(context, 'presenter', 'front-right', 325, 420, scale);
        this.addFurniture(context, 'monitor', 'meeting', 38, 355, compact);
        this.addFurniture(context, 'side-table', 'meeting', 320, 500, compact);

        // Security: observation lane, independent audit, contained occupant, hardware and storage.
        this.addFurniture(context, 'security-desk', 'security', 450, 380, scale);
        this.addFurniture(context, 'monitor', 'security', 450, 360, compact, 560);
        this.addFurniture(context, 'technical-chair', 'security', 450, 425, compact, 470);
        this.addCharacter(context, 'security', 'front-right', 450, 413, scale);
        this.addCharacter(context, 'audit', 'front-left', 525, 440, scale);
        this.addCharacter(context, 'sandbox', 'front-right', 625, 435, scale);
        this.addFurniture(context, 'archive-cabinet', 'security', 640, 340, compact);
        this.addFurniture(context, 'equipment-rack', 'security', 625, 500, compact);

        // Reception: desk, intake, visitor/escort and waiting zone.
        this.addFurniture(context, 'reception-desk', 'reception', 800, 385, scale * 1.05);
        this.addFurniture(context, 'monitor', 'reception', 800, 365, compact, 560);
        this.addCharacter(context, 'project', 'front-left', 800, 420, scale);
        [[905, 380], [950, 420], [905, 470]].forEach(([x, y]) => this.addFurniture(context, 'waiting-chair', 'reception', x, y, compact));
        this.addCharacter(context, 'visitor', 'front-right', 905, 445, scale);
        this.addCharacter(context, 'escort', 'front-left', 970, 500, scale);
        this.addFurniture(context, 'plant', 'reception', 745, 500, compact);
        this.addFurniture(context, 'side-table', 'reception', 940, 495, compact);

        // Knowledge/archive: searchable storage, reading desk, printer and clear shelf access.
        this.addFurniture(context, 'shelf', 'knowledge', 55, 625, compact);
        this.addFurniture(context, 'shelf', 'knowledge', 125, 625, compact);
        this.addFurniture(context, 'archive-cabinet', 'knowledge', 200, 625, compact);
        this.addFurniture(context, 'research-desk', 'knowledge', 315, 625, scale);
        this.addFurniture(context, 'research-chair', 'knowledge', 315, 665, compact, 470);
        this.addCharacter(context, 'knowledge', 'front-left', 315, 652, scale);
        this.addFurniture(context, 'printer', 'knowledge', 400, 625, compact);

        // Primary circulation remains intentionally open; signs, plant and future path anchor only.
        this.addFurniture(context, 'plant', 'corridor', 535, 640, compact);
        this.addFurniture(context, 'monitor', 'corridor', 930, 620, compact);
        this.addCharacter(context, 'escort', 'front-right', 760, 650, scale);
    }

    private drawMovementValidation(context: SuiteContext): void {
        if (!['candidate-d', 'candidate-e'].includes(context.profile.id)) return;
        context.rooms.forEach((room) => {
            const inset = room.id === 'primary-circulation' ? 12 : 26;
            const inner: LabRoom = { ...room, x: room.x + inset, y: room.y + inset, width: Math.max(20, room.width - inset * 2), depth: Math.max(20, room.depth - inset * 2) };
            const points = roomPoints(inner, context.scaleX, context.scaleY);
            const walkable = this.add.graphics().setDepth(points[0].depth + 8800);
            polygon(walkable, room.id === 'secure-glass-area' ? 0xa56ad4 : 0x67c889, points, 0.17);
            walkable.lineStyle(2, room.id === 'secure-glass-area' ? 0xd2a3f2 : 0x9ee0aa, 0.72).strokePoints(points.map((point) => new PhaserMath.Vector2(point.x, point.y)), true).setVisible(false);
            context.movementObjects.push(walkable);
            context.container.add(walkable);
        });
        const routeStart = iso(515 * context.scaleX, 635 * context.scaleY);
        const routeEnd = iso(970 * context.scaleX, 635 * context.scaleY);
        const route = this.add.graphics().setDepth(routeStart.depth + 9000).lineStyle(10, 0x72dca0, 0.34).lineBetween(routeStart.x, routeStart.y, routeEnd.x, routeEnd.y).setVisible(false);
        context.circulationObjects.push(route);
        context.container.add(route);
    }

    private drawGlassAndAccess(context: SuiteContext): void {
        const profile = context.profile;
        const palette = LAB_PALETTES.security;
        const expansive = profile.id === 'candidate-d' || profile.id === 'candidate-e';
        const start = iso((expansive ? 390 : 410) * context.scaleX, (expansive ? 420 : 315) * context.scaleY);
        const end = iso((expansive ? 680 : 660) * context.scaleX, (expansive ? 420 : 315) * context.scaleY);
        const height = 46 + profile.detailLevel * 8;
        const glass = this.add.graphics().setDepth(start.depth + 760);
        polygon(glass, 0x7fd8e2, [start, end, { x: end.x, y: end.y - height }, { x: start.x, y: start.y - height }], profile.id === 'baseline' ? 0.25 : 0.34);
        glass.lineStyle(Math.max(2, profile.detailLevel + 1), 0xb8f4f5, 0.78).lineBetween(start.x, start.y - height, end.x, end.y - height);
        glass.lineStyle(Math.max(2, profile.detailLevel), 0x31464d, 0.95).lineBetween(start.x, start.y, end.x, end.y);
        const panelCount = 3 + profile.detailLevel;
        for (let index = 1; index < panelCount; index += 1) {
            const amount = index / panelCount;
            const x = start.x + (end.x - start.x) * amount;
            const y = start.y + (end.y - start.y) * amount;
            glass.lineStyle(1, 0xd9ffff, 0.6).lineBetween(x, y, x, y - height);
        }
        context.container.add(glass);
        this.renderedObjectCount += 1;
        this.addFurniture(context, 'door', 'security', expansive ? 565 : 575, expansive ? 420 : 315, profile.id === 'baseline' ? 0.72 : expansive ? 0.68 : 0.82, 820);
        this.addFurniture(context, 'secure-reader', 'security', expansive ? 600 : 600, expansive ? 425 : 320, profile.id === 'baseline' ? 0.46 : expansive ? 0.44 : 0.54, 840);
        const thresholdA = iso((expansive ? 535 : 560) * context.scaleX, (expansive ? 440 : 330) * context.scaleY);
        const thresholdB = iso((expansive ? 625 : 625) * context.scaleX, (expansive ? 440 : 330) * context.scaleY);
        const threshold = this.add.graphics().setDepth(thresholdA.depth + 200).lineStyle(3 + profile.detailLevel, palette.accent, 0.88).lineBetween(thresholdA.x, thresholdA.y, thresholdB.x, thresholdB.y);
        context.container.add(threshold);
        this.renderedObjectCount += 1;
    }

    private drawAmbientDetail(context: SuiteContext): void {
        const expansive = context.profile.id === 'candidate-d' || context.profile.id === 'candidate-e';
        const operations = iso((expansive ? 835 : 710) * context.scaleX, 62 * context.scaleY);
        const lights: GameObjects.Rectangle[] = [];
        const count = context.profile.id === 'baseline' ? 3 : 4 + context.profile.detailLevel * 2;
        for (let index = 0; index < count; index += 1) {
            const light = this.add.rectangle(operations.x - 34 + index * 11, operations.y - 22 - (index % 2) * 4, 3 + Math.min(2, context.profile.detailLevel), 2 + Math.min(2, context.profile.detailLevel), 0x52eff5, 0.78).setDepth(operations.depth + 900);
            context.ambientObjects.push(light);
            context.lightingObjects.push(light);
            context.container.add(light);
            lights.push(light);
            this.renderedObjectCount += 1;
        }
        if (lights.length > 0 && !context.comparison) {
            this.ambientTweens.push(this.tweens.add({ targets: lights, alpha: { from: 0.82, to: 0.25 }, duration: 900, repeat: -1, yoyo: true, stagger: 75, ease: 'Stepped' }));
        }
        if (expansive) {
            const particleCount = context.profile.particleProfileCount;
            for (let index = 0; index < particleCount; index += 1) {
                const point = iso((120 + index * 93) * context.scaleX, (610 + (index % 2) * 34) * context.scaleY);
                const particle = this.add.rectangle(point.x, point.y - 22 - index % 3 * 4, 2 + index % 2, 2 + index % 2, index % 3 === 0 ? 0x79dca5 : 0x74cfe0, 0.54).setDepth(point.depth + 880);
                context.particleObjects.push(particle);
                context.container.add(particle);
                this.renderedObjectCount += 1;
            }
        }
    }

    private handleRoomHover(room: LabRoom, pointer: Input.Pointer): void {
        if (pointer.isDown || this.dragging) return;
        this.hoveredRoomId = room.id;
        this.updateRoomTitles();
        EventBus.emit('visual-lab-hover', { id: room.id, title: room.title, subtitle: room.subtitle, x: pointer.x, y: pointer.y } satisfies VisualLabSelection & { x: number; y: number });
    }

    private handleRoomOut(roomId: string): void {
        if (this.hoveredRoomId === roomId) this.hoveredRoomId = undefined;
        this.updateRoomTitles();
        EventBus.emit('visual-lab-hover', undefined);
    }

    private selectRoom(room: LabRoom): void {
        this.selectedRoomId = room.id;
        this.updateRoomTitles();
        EventBus.emit('visual-lab-selection', { id: room.id, title: room.title, subtitle: room.subtitle } satisfies VisualLabSelection);
    }

    private clearSelection(): void {
        this.selectedRoomId = undefined;
        this.updateRoomTitles();
        EventBus.emit('visual-lab-selection', undefined);
    }

    private updateRoomTitles(): void {
        this.suiteContexts.forEach((context) => context.titleTexts.forEach((text, roomId) => {
            const baselinePersistent = context.profile.id === 'baseline';
            const visible = baselinePersistent || this.preferences.labels === 'on' || roomId === this.selectedRoomId || (this.preferences.labels === 'auto' && roomId === this.hoveredRoomId);
            text.setVisible(visible && this.preferences.labels !== 'minimal' || roomId === this.selectedRoomId);
            text.setScale(roomId === this.hoveredRoomId && !baselinePersistent ? 1.04 : 1);
        }));
    }

    private updatePreferenceVisibility(): void {
        this.suiteContexts.forEach((context) => {
            context.dimensionObjects.forEach((object) => object.setVisible(this.preferences.showDimensions));
            context.anchorObjects.forEach((object) => object.setVisible(this.preferences.showAnchors));
            context.boundObjects.forEach((object) => object.setVisible(this.preferences.showBounds));
            context.movementObjects.forEach((object) => object.setVisible(this.preferences.showMovementClearance));
            context.circulationObjects.forEach((object) => object.setVisible(this.preferences.showCirculationRoutes));
            context.furnitureBoundObjects.forEach((object) => object.setVisible(this.preferences.showFurnitureBounds));
            context.interactionBoundObjects.forEach((object) => object.setVisible(this.preferences.showInteractionBounds));
            context.ambientObjects.forEach((object) => object.setVisible(this.preferences.effects !== 'off' && this.preferences.lighting).setAlpha(this.preferences.effects === 'reduced' ? 0.35 : 0.78));
            context.particleObjects.forEach((object) => object.setVisible(this.preferences.effects !== 'off' && this.preferences.particles !== 'off').setAlpha(this.preferences.particles === 'reduced' ? 0.25 : 0.54));
        });
        this.ambientTweens.forEach((tween) => this.preferences.effects === 'on' ? tween.resume() : tween.pause());
        this.updateRoomTitles();
    }

    private handleCandidate(mode: VisualLabMode): void {
        if (!['baseline', 'candidate-a', 'candidate-b', 'candidate-c', 'candidate-d', 'candidate-e', 'comparison'].includes(mode)) {
            EventBus.emit('visual-lab-error', `Unknown visual-lab profile: ${String(mode)}`);
            return;
        }
        this.mode = mode;
        this.renderMode();
        EventBus.emit('visual-lab-rendered', this.sceneSummary());
    }

    private handlePreferences(preferences: VisualLabPreferences): void {
        this.preferences = preferences;
        this.updatePreferenceVisibility();
    }

    private handleSafeArea(safeArea: ScreenInsets): void {
        this.safeArea = safeArea;
        this.fitPrototype();
    }

    private handleCameraCommand(command: 'fit' | 'reset' | 'zoom-in' | 'zoom-out'): void {
        if (command === 'fit') this.fitPrototype();
        else if (command === 'reset') this.resetView();
        else this.zoomAt(this.cameras.main.width / 2, this.cameras.main.height / 2, command === 'zoom-in' ? ZOOM_STEP : -ZOOM_STEP);
    }

    private fitPrototype(): void {
        if (!this.root) return;
        const bounds = this.root.getBounds();
        const camera = this.cameras.main;
        const availableWidth = Math.max(320, camera.width - this.safeArea.left - this.safeArea.right);
        const availableHeight = Math.max(260, camera.height - this.safeArea.top - this.safeArea.bottom);
        const zoom = PhaserMath.Clamp(Math.min(availableWidth / Math.max(1, bounds.width + 80), availableHeight / Math.max(1, bounds.height + 90)), MIN_ZOOM, this.mode === 'comparison' ? 1.12 : 1.55);
        const desiredScreenX = this.safeArea.left + availableWidth / 2;
        const desiredScreenY = this.safeArea.top + availableHeight / 2;
        camera.setZoom(zoom);
        camera.centerOn(bounds.centerX - (desiredScreenX - camera.width / 2) / zoom, bounds.centerY - (desiredScreenY - camera.height / 2) / zoom);
        this.emitCameraState('Fit');
    }

    private resetView(): void {
        this.fitPrototype();
        this.clearSelection();
        EventBus.emit('visual-lab-view-reset');
    }

    private zoomAt(screenX: number, screenY: number, delta: number): void {
        const camera = this.cameras.main;
        const before = camera.getWorldPoint(screenX, screenY);
        camera.setZoom(PhaserMath.Clamp(camera.zoom + delta, MIN_ZOOM, MAX_ZOOM));
        const after = camera.getWorldPoint(screenX, screenY);
        camera.setScroll(Math.round(camera.scrollX + before.x - after.x), Math.round(camera.scrollY + before.y - after.y));
        this.emitCameraState('Detail');
    }

    private handlePointerDown(pointer: Input.Pointer): void {
        if (pointer.event.target !== this.game.canvas || (!pointer.leftButtonDown() && !pointer.middleButtonDown())) return;
        this.dragging = true;
        this.dragDistance = 0;
        this.pointerStart = { x: pointer.x, y: pointer.y };
        this.hoveredRoomId = undefined;
        this.updateRoomTitles();
        EventBus.emit('visual-lab-hover', undefined);
        this.game.canvas.style.cursor = 'grabbing';
    }

    private handlePointerMove(pointer: Input.Pointer): void {
        if (!this.dragging || !pointer.isDown) return;
        const camera = this.cameras.main;
        this.dragDistance = Math.max(this.dragDistance, Math.hypot(pointer.x - this.pointerStart.x, pointer.y - this.pointerStart.y));
        camera.setScroll(Math.round(camera.scrollX - (pointer.x - pointer.prevPosition.x) / camera.zoom), Math.round(camera.scrollY - (pointer.y - pointer.prevPosition.y) / camera.zoom));
        this.emitCameraState('Panned');
    }

    private handlePointerUp(): void {
        this.dragging = false;
        this.game.canvas.style.cursor = 'grab';
    }

    private handleWheel(pointer: Input.Pointer, _objects: GameObjects.GameObject[], _deltaX: number, deltaY: number): void {
        if (pointer.event.target !== this.game.canvas) return;
        pointer.event.preventDefault();
        this.zoomAt(pointer.x, pointer.y, -deltaY * 0.0008);
    }

    private handleResize(): void {
        this.fitPrototype();
    }

    private emitCameraState(view: string): void {
        const camera = this.cameras.main;
        EventBus.emit('visual-lab-camera-state', { zoom: camera.zoom, scrollX: camera.scrollX, scrollY: camera.scrollY, view });
    }

    private sceneSummary() {
        const profile = this.mode === 'comparison' ? undefined : VISUAL_LAB_PROFILE_BY_ID[this.mode as VisualLabCandidateId];
        return {
            mode: this.mode,
            profile,
            objectCount: this.renderedObjectCount,
            generatedTextureCount: this.generatedTextureKeys.size,
            activeAnimationCount: this.ambientTweens.length,
            particleCount: this.suiteContexts.reduce((sum, context) => sum + context.particleObjects.length, 0),
            lightingCount: this.suiteContexts.reduce((sum, context) => sum + context.lightingObjects.length, 0),
        };
    }

    private cleanup(): void {
        this.input.off('pointerdown', this.handlePointerDown, this);
        this.input.off('pointermove', this.handlePointerMove, this);
        this.input.off('pointerup', this.handlePointerUp, this);
        this.input.off('pointerupoutside', this.handlePointerUp, this);
        this.input.off('wheel', this.handleWheel, this);
        this.scale.off('resize', this.handleResize, this);
        EventBus.off('visual-lab-candidate', this.handleCandidate, this);
        EventBus.off('visual-lab-camera-command', this.handleCameraCommand, this);
        EventBus.off('visual-lab-preferences', this.handlePreferences, this);
        EventBus.off('visual-lab-safe-area', this.handleSafeArea, this);
        EventBus.off('visual-lab-clear-selection', this.clearSelection, this);
        this.input.keyboard?.off('keydown-F', this.fitPrototype, this);
        this.input.keyboard?.off('keydown-ZERO', this.resetView, this);
        this.ambientTweens.forEach((tween) => tween.destroy());
        this.game.canvas.style.cursor = '';
    }
}

export { nextEffects };
