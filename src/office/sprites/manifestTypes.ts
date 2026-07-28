/**
 * Typed animation-manifest contract implementing `docs/ANIMATION_MANIFEST.md`.
 *
 * Every field an animation needs is explicit. Nothing is inferred at runtime:
 * if a value is not stated here, the animation is invalid rather than guessed.
 */

export type SpriteLoopMode = 'loop' | 'once' | 'ping-pong' | 'hold';
export type SpritePlaybackDirection = 'forward' | 'reverse';
export type SpriteHoldBehavior = 'first-frame' | 'last-frame' | 'none';
export type SpriteInterpolationMode = 'nearest' | 'smooth';
export type SpriteBlendMode = 'normal' | 'screen' | 'multiply';
/**
 * `trimmed-ink-bounds` means the source rectangles are measured ink bounds, not
 * complete authored cells, so a stable logical frame box plus per-frame offsets
 * are required to keep placement steady.
 */
export type SpriteTrimBehavior = 'none' | 'trimmed-ink-bounds';

/**
 * Approval lifecycle. This is an authored human decision and is deliberately
 * separate from generated measurements: measuring an asset never approves it.
 */
export type SpriteApprovalStatus =
    | 'candidate-unverified'
    | 'production-approved'
    | 'reference-only';

export const SPRITE_APPROVAL_STATUSES: readonly SpriteApprovalStatus[] = [
    'candidate-unverified',
    'production-approved',
    'reference-only',
];
export type SpritePreloadBehavior = 'eager' | 'lazy';
export type SpriteFrameIndexBase = 0;

/** Layer names map to the office overlay stacking order. */
export type SpriteZLayer = 'effects' | 'sprites' | 'labels';

export type SpriteAssetSetId = string;
export type SpriteAnimationId = string;

/** Normalized anchor: 0..1 within the frame rectangle. */
export type NormalizedAnchor = Readonly<{ x: number; y: number }>;

export type SpriteFrameRect = Readonly<{
    index: number;
    row: number;
    column: number;
    /** Source rectangle within the sheet (may be tight ink bounds). */
    x: number;
    y: number;
    width: number;
    height: number;
}>;

/**
 * Placement of one source rectangle inside the stable logical frame box.
 * Keeping this separate from the source rectangle is what stops variable-width
 * frames from moving the sprite around as the animation plays.
 */
export type SpriteFramePlacement = Readonly<{
    rect: SpriteFrameRect;
    /** Offset of the source content within the logical frame box. */
    offsetX: number;
    offsetY: number;
}>;

export type SpriteSourceDimensions = Readonly<{ width: number; height: number }>;

/**
 * A manifest asset set binds a stable ID to one public sprite image plus the
 * measured facts about that image.
 */
export type SpriteAssetSet = Readonly<{
    id: SpriteAssetSetId;
    /** Public path relative to the deployment base, without a leading slash. */
    publicPath: string;
    /** Source file the production copy was made from. */
    sourcePath: string;
    /** SHA-256 of both source and production copy; they must match byte-for-byte. */
    sha256: string;
    sourceDimensions: SpriteSourceDimensions;
    hasAlphaChannel: boolean;
    pixelArt: boolean;
    /**
     * True only when a human has approved the asset for the office runtime.
     * Must be false unless `approvalStatus === 'production-approved'`.
     */
    productionApproved: boolean;
    approvalStatus: SpriteApprovalStatus;
    notes: readonly string[];
}>;

export type SpriteAnimation = Readonly<{
    id: SpriteAnimationId;
    assetSetId: SpriteAssetSetId;
    /** Grid description. `uniformGrid` false requires explicit frameRectangles. */
    uniformGrid: boolean;
    rows: number;
    columns: number;
    totalCellCount: number;
    /**
     * Stable logical frame box. Every played frame occupies exactly this outer
     * size regardless of its individual source-rectangle dimensions.
     */
    frameWidth: number;
    frameHeight: number;
    frameIndexBase: SpriteFrameIndexBase;
    /** Explicit rectangles, required when `uniformGrid` is false. */
    frameRectangles: readonly SpriteFrameRect[] | null;
    /** Playback order, expressed as zero-based frame indexes. */
    frameOrder: readonly number[];
    usedFrameIndexes: readonly number[];
    unusedFrameIndexes: readonly number[];
    /** Per-frame overrides keyed by position in `frameOrder`; empty means uniform. */
    frameDurationsMs: readonly number[];
    defaultFrameDurationMs: number;
    loopMode: SpriteLoopMode;
    playbackDirection: SpritePlaybackDirection;
    holdBehavior: SpriteHoldBehavior;
    anchor: NormalizedAnchor;
    trimBehavior: SpriteTrimBehavior;
    worldScale: number;
    pixelArt: boolean;
    interpolation: SpriteInterpolationMode;
    zLayer: SpriteZLayer;
    blendMode: SpriteBlendMode;
    opacity: number;
    preload: SpritePreloadBehavior;
    /** Frame shown when the user prefers reduced motion. */
    reducedMotionFrameIndex: number;
    /** Optional animation to fall back to; null means use the reduced-motion frame. */
    fallbackAnimationId: SpriteAnimationId | null;
    /** True only for entries cleared to render in the real office runtime. */
    production: boolean;
    approvalStatus: SpriteApprovalStatus;
    /**
     * True when the frame order is a review-time curatorial choice rather than
     * an ordering established by the source asset.
     */
    sequenceAuthorship: 'source-verified' | 'curated-preview-unverified';
    notes: readonly string[];
    warnings: readonly string[];
}>;

export type SpriteManifest = Readonly<{
    schemaVersion: 1;
    assetSets: readonly SpriteAssetSet[];
    animations: readonly SpriteAnimation[];
}>;

export const SPRITE_LOOP_MODES: readonly SpriteLoopMode[] = ['loop', 'once', 'ping-pong', 'hold'];
export const SPRITE_Z_LAYERS: readonly SpriteZLayer[] = ['effects', 'sprites', 'labels'];
export const SPRITE_BLEND_MODES: readonly SpriteBlendMode[] = ['normal', 'screen', 'multiply'];
