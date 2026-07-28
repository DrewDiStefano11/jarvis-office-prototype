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
export type SpriteTrimBehavior = 'none' | 'trimmed';
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
    x: number;
    y: number;
    width: number;
    height: number;
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
    /** True when the asset may back a production animation. */
    productionApproved: boolean;
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
    /** Nominal frame size. For non-uniform sheets this is the maximum cell size. */
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
    /** True for entries intended to render in the real office. */
    production: boolean;
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
