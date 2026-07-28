import { getSourceAsset, NEXUS_TUBE_SOURCE_PATH } from './inventory';
import {
    SpriteAnimation,
    SpriteAssetSet,
    SpriteFramePlacement,
    SpriteFrameRect,
    SpriteManifest,
} from './manifestTypes';

/**
 * The production sprite manifest.
 *
 * All geometry is read from the generated source-asset inventory rather than
 * being retyped here, so the manifest cannot drift from the measured pixels.
 * Only curatorial decisions (which frames to play, timing, anchor, layer) are
 * authored by hand, and each is justified in `notes`.
 */

export const ASSETSET_CENTRAL_NEXUS_HOLOGRAM = 'ASSETSET_CENTRAL_NEXUS_HOLOGRAM';
export const ANIM_CENTRAL_NEXUS_IDLE = 'ANIM_CENTRAL_NEXUS_IDLE';
export const ANIM_CENTRAL_NEXUS_FLOAT = 'ANIM_CENTRAL_NEXUS_FLOAT';

/**
 * Isolated candidate path. The legacy registry path
 * (`assets/office/sprites/central-blue-tube-hologram.png`) is deliberately left
 * absent: the office sample overlay declares that asset as a uniform
 * 128x192 / 8-frame / 8-column sheet, which this 1254x1254 non-uniform pose grid
 * does not satisfy. Populating it would silently change runtime loading and
 * break the intentional missing-asset fallback.
 */
export const CENTRAL_NEXUS_PUBLIC_PATH =
    'assets/office/sprites/holograms/candidates/central-nexus-pose-grid.png';

/** Left intentionally unpopulated until a separate reviewed integration task. */
export const LEGACY_OFFICE_HOLOGRAM_PATH =
    'assets/office/sprites/central-blue-tube-hologram.png';

const nexusRecord = getSourceAsset(NEXUS_TUBE_SOURCE_PATH);
if (!nexusRecord || !nexusRecord.nexusGrid) {
    throw new Error('Central Nexus source asset is missing from the measured inventory.');
}
const nexusGrid = nexusRecord.nexusGrid;

/** Measured per-frame rectangles; the sheet is not a uniform grid. */
export const CENTRAL_NEXUS_FRAME_RECTS: readonly SpriteFrameRect[] = nexusGrid.frameRectangles;

export const CENTRAL_NEXUS_COLUMNS = nexusGrid.detectedColumns;
export const CENTRAL_NEXUS_ROWS = nexusGrid.detectedRows;
export const CENTRAL_NEXUS_TOTAL_CELLS = nexusGrid.totalCells;

/**
 * Stable logical frame box for the candidate sequence.
 *
 * The measured rectangles are tight ink bounds and vary in size, so a single
 * outer box is derived from the largest played frame. Every frame then renders
 * inside that identical box, which is what keeps the sprite from jittering as
 * frames change.
 */
const logicalFrameWidth = Math.max(...CENTRAL_NEXUS_FRAME_RECTS.map(r => r.width));
const logicalFrameHeight = Math.max(...CENTRAL_NEXUS_FRAME_RECTS.map(r => r.height));

/**
 * Places a tight source rectangle inside the logical box.
 *
 * Horizontal: centred. Vertical: bottom-aligned, because the tube stands on the
 * floor and the manifest anchor is bottom-centre. The source carries no authored
 * registration point, so this alignment is a documented review-time choice
 * rather than a measured fact (see the animation warnings).
 */
export function centralNexusPlacement(rect: SpriteFrameRect): SpriteFramePlacement {
    return {
        rect,
        offsetX: Math.round((logicalFrameWidth - rect.width) / 2),
        offsetY: logicalFrameHeight - rect.height,
    };
}

/**
 * Row 0 is the only run of ten consecutive cells that share one measured
 * height (123px) and sit on a common baseline, so it is the single defensible
 * loop in this sheet. The remaining rows are pose variations, not ordered
 * animation frames — similarity analysis found consecutive cells no more alike
 * than random pairs — so they are explicitly marked unused pending human review.
 */
const IDLE_FRAME_ORDER: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const allIndexes = CENTRAL_NEXUS_FRAME_RECTS.map(r => r.index);
const idleUnused = allIndexes.filter(i => !IDLE_FRAME_ORDER.includes(i));

const centralNexusAssetSet: SpriteAssetSet = {
    id: ASSETSET_CENTRAL_NEXUS_HOLOGRAM,
    publicPath: CENTRAL_NEXUS_PUBLIC_PATH,
    sourcePath: NEXUS_TUBE_SOURCE_PATH,
    sha256: nexusRecord.sha256,
    sourceDimensions: { width: nexusRecord.width, height: nexusRecord.height },
    hasAlphaChannel: nexusRecord.hasAlphaChannel,
    pixelArt: true,
    // Measured as `conditionally_usable`; no human has approved it for runtime.
    productionApproved: false,
    approvalStatus: 'candidate-unverified',
    notes: [
        'CANDIDATE ONLY - not approved for the office runtime.',
        'Copied byte-for-byte from the repository-root source; checksums must match.',
        'Deliberately NOT placed at the legacy central-blue-tube-hologram.png path.',
        `Measured grid: ${nexusGrid.detectedColumns} columns x ${nexusGrid.detectedRows} rows = ${nexusGrid.totalCells} cells (not 10x10).`,
        'Cell sizes vary, so explicit per-frame rectangles are mandatory.',
    ],
};

const centralNexusIdle: SpriteAnimation = {
    id: ANIM_CENTRAL_NEXUS_IDLE,
    assetSetId: ASSETSET_CENTRAL_NEXUS_HOLOGRAM,
    uniformGrid: false,
    rows: CENTRAL_NEXUS_ROWS,
    columns: CENTRAL_NEXUS_COLUMNS,
    totalCellCount: CENTRAL_NEXUS_TOTAL_CELLS,
    // Stable logical frame box: every frame occupies these outer dimensions.
    frameWidth: logicalFrameWidth,
    frameHeight: logicalFrameHeight,
    frameIndexBase: 0,
    frameRectangles: CENTRAL_NEXUS_FRAME_RECTS,
    frameOrder: IDLE_FRAME_ORDER,
    usedFrameIndexes: IDLE_FRAME_ORDER,
    unusedFrameIndexes: idleUnused,
    frameDurationsMs: [],
    defaultFrameDurationMs: 120,
    loopMode: 'ping-pong',
    playbackDirection: 'forward',
    holdBehavior: 'first-frame',
    // Tube stands on the floor: anchor at bottom-centre of the frame box.
    anchor: { x: 0.5, y: 1 },
    // Rectangles are measured ink bounds, not authored cells.
    trimBehavior: 'trimmed-ink-bounds',
    worldScale: 1,
    pixelArt: true,
    interpolation: 'nearest',
    zLayer: 'sprites',
    blendMode: 'normal',
    opacity: 1,
    preload: 'lazy',
    reducedMotionFrameIndex: 0,
    fallbackAnimationId: null,
    production: false,
    approvalStatus: 'candidate-unverified',
    sequenceAuthorship: 'curated-preview-unverified',
    notes: [
        'Row 0 only: ten cells sharing a measured 123px height and a common baseline.',
        'Ping-pong avoids a hard cut between frame 9 and frame 0, which are not continuous.',
        'The tube housing is redrawn in every cell; only the robot pose changes.',
    ],
    warnings: [
        'CANDIDATE: preview only. Not approved for the office runtime.',
        'Frame order is a curatorial reading order chosen for review, NOT a verified animation order from the source.',
        'Rows 1-8 remain unused pending human confirmation of intended pose sequencing.',
        'Horizontal alignment within the logical frame box is centred; the source provides no authored registration point, so sub-pixel alignment remains unverified.',
    ],
};

/**
 * Float shares the idle frames; the vertical bob is applied as a transform by
 * the renderer, deliberately kept separate from frame selection so it can be
 * disabled without changing the animation.
 */
const centralNexusFloat: SpriteAnimation = {
    ...centralNexusIdle,
    id: ANIM_CENTRAL_NEXUS_FLOAT,
    defaultFrameDurationMs: 160,
    loopMode: 'loop',
    fallbackAnimationId: ANIM_CENTRAL_NEXUS_IDLE,
    notes: [
        'CANDIDATE ONLY - not approved for the office runtime.',
        'Same measured frames as idle, played slower for an ambient state.',
        'The vertical float is a CSS transform applied by the renderer, not a frame change.',
    ],
};

export const SPRITE_MANIFEST: SpriteManifest = {
    schemaVersion: 1,
    assetSets: [centralNexusAssetSet],
    animations: [centralNexusIdle, centralNexusFloat],
};

export function getAnimation(id: string): SpriteAnimation | undefined {
    return SPRITE_MANIFEST.animations.find(a => a.id === id);
}

export function getAssetSet(id: string): SpriteAssetSet | undefined {
    return SPRITE_MANIFEST.assetSets.find(a => a.id === id);
}
