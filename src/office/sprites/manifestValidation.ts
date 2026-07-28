import { getSourceAsset, isProductionUsable } from './inventory';
import {
    SPRITE_BLEND_MODES,
    SPRITE_LOOP_MODES,
    SPRITE_Z_LAYERS,
    SpriteAnimation,
    SpriteAssetSet,
    SpriteFrameRect,
    SpriteManifest,
} from './manifestTypes';

/**
 * Deterministic manifest validation.
 *
 * Validation fails closed: any structural problem produces an error, and
 * production animations are additionally required to be backed by an approved,
 * measured source asset. Issues are returned in a stable order so tests and
 * generated reports never flap.
 */

export type SpriteIssueSeverity = 'error' | 'warning';

export type SpriteValidationIssue = Readonly<{
    severity: SpriteIssueSeverity;
    code: string;
    target: string;
    message: string;
}>;

export type SpriteValidationResult = Readonly<{
    valid: boolean;
    errors: readonly SpriteValidationIssue[];
    warnings: readonly SpriteValidationIssue[];
    issues: readonly SpriteValidationIssue[];
}>;

function issue(
    severity: SpriteIssueSeverity,
    code: string,
    target: string,
    message: string,
): SpriteValidationIssue {
    return { severity, code, target, message };
}

function isFiniteNumber(value: number): boolean {
    return Number.isFinite(value);
}

function isPositiveInteger(value: number): boolean {
    return Number.isInteger(value) && value > 0;
}

function isNormalized(value: number): boolean {
    return isFiniteNumber(value) && value >= 0 && value <= 1;
}

function validateAssetSet(asset: SpriteAssetSet, out: SpriteValidationIssue[]): void {
    const target = asset.id;
    if (asset.id.trim() === '') {
        out.push(issue('error', 'ASSET_ID_EMPTY', target, 'Asset set ID must not be empty.'));
    }
    if (asset.publicPath.trim() === '' || asset.publicPath.startsWith('/')) {
        out.push(issue('error', 'ASSET_PATH_INVALID', target,
            'Public path must be non-empty and relative (no leading slash) so BASE_URL resolution works.'));
    }
    const { width, height } = asset.sourceDimensions;
    if (!isPositiveInteger(width) || !isPositiveInteger(height)) {
        out.push(issue('error', 'ASSET_SOURCE_DIMENSIONS_INVALID', target,
            `Source dimensions must be positive integers; received ${width}x${height}.`));
    }

    // Cross-check the manifest against the measured inventory.
    const record = getSourceAsset(asset.sourcePath);
    if (!record) {
        out.push(issue('error', 'ASSET_SOURCE_MISSING', target,
            `Source path "${asset.sourcePath}" is not present in the measured source-asset inventory.`));
        return;
    }
    if (record.width !== width || record.height !== height) {
        out.push(issue('error', 'ASSET_DIMENSION_MISMATCH', target,
            `Manifest dimensions ${width}x${height} do not match measured PNG dimensions ${record.width}x${record.height}.`));
    }
    if (record.sha256 !== asset.sha256) {
        out.push(issue('error', 'ASSET_CHECKSUM_MISMATCH', target,
            'Manifest SHA-256 does not match the measured source checksum.'));
    }
    if (record.hasAlphaChannel !== asset.hasAlphaChannel) {
        out.push(issue('error', 'ASSET_ALPHA_MISMATCH', target,
            'Manifest alpha-channel flag does not match the measured PNG colour type.'));
    }
    if (asset.productionApproved && asset.approvalStatus !== 'production-approved') {
        out.push(issue('error', 'ASSET_APPROVAL_INCONSISTENT', target,
            `Asset is flagged productionApproved but approvalStatus is "${asset.approvalStatus}".`));
    }
    if (asset.productionApproved && !isProductionUsable(record)) {
        out.push(issue('error', 'ASSET_REFERENCE_ONLY', target,
            `Asset is marked production-approved but the inventory classifies it as "${record.readiness}"${record.ambiguous ? ' (ambiguous)' : ''}.`));
    }
}

function validateFrameRectangle(
    rect: SpriteFrameRect,
    asset: SpriteAssetSet | undefined,
    target: string,
    out: SpriteValidationIssue[],
): void {
    if (!isFiniteNumber(rect.x) || !isFiniteNumber(rect.y)
        || !isPositiveInteger(rect.width) || !isPositiveInteger(rect.height)) {
        out.push(issue('error', 'FRAME_RECT_INVALID', target,
            `Frame ${rect.index} has an invalid rectangle.`));
        return;
    }
    if (rect.x < 0 || rect.y < 0) {
        out.push(issue('error', 'FRAME_RECT_OUT_OF_BOUNDS', target,
            `Frame ${rect.index} has a negative origin.`));
        return;
    }
    if (!asset) return;
    const { width, height } = asset.sourceDimensions;
    if (rect.x + rect.width > width || rect.y + rect.height > height) {
        out.push(issue('error', 'FRAME_RECT_OUT_OF_BOUNDS', target,
            `Frame ${rect.index} rectangle (${rect.x},${rect.y},${rect.width}x${rect.height}) extends past the ${width}x${height} source image.`));
    }
}

function validateAnimation(
    animation: SpriteAnimation,
    assetsById: ReadonlyMap<string, SpriteAssetSet>,
    out: SpriteValidationIssue[],
): void {
    const target = animation.id;
    const asset = assetsById.get(animation.assetSetId);
    if (!asset) {
        out.push(issue('error', 'ANIMATION_ASSET_MISSING', target,
            `Animation references unknown asset set "${animation.assetSetId}".`));
    }

    if (!isPositiveInteger(animation.rows) || !isPositiveInteger(animation.columns)) {
        out.push(issue('error', 'ANIMATION_GRID_INVALID', target,
            `Rows and columns must be positive integers; received ${animation.rows}x${animation.columns}.`));
    }
    if (!isPositiveInteger(animation.frameWidth) || !isPositiveInteger(animation.frameHeight)) {
        out.push(issue('error', 'ANIMATION_FRAME_DIMENSIONS_INVALID', target,
            `Frame dimensions must be positive integers; received ${animation.frameWidth}x${animation.frameHeight}.`));
    }
    if (animation.frameIndexBase !== 0) {
        out.push(issue('error', 'ANIMATION_FRAME_BASE_INVALID', target,
            'Frame indexing must be zero-based.'));
    }

    const expectedCells = animation.rows * animation.columns;
    if (isPositiveInteger(animation.rows) && isPositiveInteger(animation.columns)
        && animation.totalCellCount !== expectedCells) {
        out.push(issue('error', 'ANIMATION_CELL_COUNT_MISMATCH', target,
            `totalCellCount ${animation.totalCellCount} does not equal rows x columns (${expectedCells}).`));
    }

    // Explicit rectangles are mandatory for non-uniform sheets.
    if (!animation.uniformGrid && (!animation.frameRectangles || animation.frameRectangles.length === 0)) {
        out.push(issue('error', 'ANIMATION_RECTANGLES_REQUIRED', target,
            'Non-uniform sheets must supply explicit per-frame rectangles.'));
    }
    if (animation.frameRectangles) {
        const seen = new Set<number>();
        for (const rect of animation.frameRectangles) {
            // Rectangle indexes must be real cell indexes, not arbitrary numbers.
            if (!Number.isInteger(rect.index)) {
                out.push(issue('error', 'FRAME_RECT_INDEX_INVALID', target,
                    `Frame rectangle index ${rect.index} is not an integer.`));
                continue;
            }
            if (rect.index < 0 || rect.index >= animation.totalCellCount) {
                out.push(issue('error', 'FRAME_RECT_INDEX_OUT_OF_RANGE', target,
                    `Frame rectangle index ${rect.index} is outside 0..${animation.totalCellCount - 1}.`));
                continue;
            }
            if (seen.has(rect.index)) {
                out.push(issue('error', 'FRAME_RECT_DUPLICATE', target,
                    `Duplicate frame rectangle index ${rect.index}.`));
            }
            seen.add(rect.index);
            validateFrameRectangle(rect, asset, target, out);
        }

        // Coverage: anything the animation can actually display must have
        // geometry now, rather than silently falling back at render time.
        const requireRect = (index: number, reason: string) => {
            if (Number.isInteger(index) && index >= 0 && !seen.has(index)) {
                out.push(issue('error', 'FRAME_RECT_MISSING', target,
                    `No frame rectangle defined for ${reason} index ${index}.`));
            }
        };
        for (const index of animation.frameOrder) requireRect(index, 'frameOrder');
        for (const index of animation.usedFrameIndexes) requireRect(index, 'usedFrameIndexes');
        requireRect(animation.reducedMotionFrameIndex, 'reducedMotionFrameIndex');
    } else if (animation.uniformGrid && asset) {
        // A uniform grid must physically fit inside the source image.
        const neededWidth = animation.columns * animation.frameWidth;
        const neededHeight = animation.rows * animation.frameHeight;
        if (neededWidth > asset.sourceDimensions.width || neededHeight > asset.sourceDimensions.height) {
            out.push(issue('error', 'ANIMATION_GRID_OVERFLOW', target,
                `Uniform grid ${neededWidth}x${neededHeight} exceeds the ${asset.sourceDimensions.width}x${asset.sourceDimensions.height} source image.`));
        }
    }

    if (animation.frameOrder.length === 0) {
        out.push(issue('error', 'ANIMATION_SEQUENCE_EMPTY', target,
            'Animation frame order must contain at least one frame.'));
    }

    const maxIndex = animation.totalCellCount - 1;
    for (const index of animation.frameOrder) {
        if (!Number.isInteger(index) || index < 0 || index > maxIndex) {
            out.push(issue('error', 'FRAME_INDEX_OUT_OF_RANGE', target,
                `Frame index ${index} is outside the valid range 0..${maxIndex}.`));
        }
    }

    const usedSet = new Set<number>();
    for (const index of animation.usedFrameIndexes) {
        if (usedSet.has(index)) {
            out.push(issue('error', 'FRAME_INDEX_DUPLICATE', target,
                `Duplicate used frame index ${index}.`));
        }
        usedSet.add(index);
        if (!Number.isInteger(index) || index < 0 || index > maxIndex) {
            out.push(issue('error', 'FRAME_INDEX_OUT_OF_RANGE', target,
                `Used frame index ${index} is outside the valid range 0..${maxIndex}.`));
        }
    }
    const unusedSet = new Set<number>();
    for (const index of animation.unusedFrameIndexes) {
        if (unusedSet.has(index)) {
            out.push(issue('error', 'FRAME_INDEX_DUPLICATE', target,
                `Duplicate unused frame index ${index}.`));
        }
        unusedSet.add(index);
        // Range-check unused indexes too: an out-of-range value would otherwise
        // preserve the set-size accounting below while omitting a real cell.
        if (!Number.isInteger(index) || index < 0 || index > maxIndex) {
            out.push(issue('error', 'FRAME_INDEX_OUT_OF_RANGE', target,
                `Unused frame index ${index} is outside the valid range 0..${maxIndex}.`));
        }
        if (usedSet.has(index)) {
            out.push(issue('error', 'FRAME_USED_UNUSED_OVERLAP', target,
                `Frame index ${index} appears in both used and unused lists.`));
        }
    }
    for (const index of animation.frameOrder) {
        if (!usedSet.has(index)) {
            out.push(issue('error', 'FRAME_ORDER_NOT_MARKED_USED', target,
                `Frame index ${index} is played but not listed in usedFrameIndexes.`));
        }
    }

    // Complete cell accounting: used + unused must describe every declared cell.
    if (usedSet.size + unusedSet.size !== animation.totalCellCount) {
        out.push(issue('error', 'FRAME_ACCOUNTING_INCOMPLETE', target,
            `Used (${usedSet.size}) + unused (${unusedSet.size}) frames do not account for all ${animation.totalCellCount} declared cells.`));
    }

    if (!isFiniteNumber(animation.defaultFrameDurationMs) || animation.defaultFrameDurationMs <= 0) {
        out.push(issue('error', 'TIMING_INVALID', target,
            `defaultFrameDurationMs must be a positive number; received ${animation.defaultFrameDurationMs}.`));
    }
    if (animation.frameDurationsMs.length > 0
        && animation.frameDurationsMs.length !== animation.frameOrder.length) {
        out.push(issue('error', 'TIMING_LENGTH_MISMATCH', target,
            `frameDurationsMs has ${animation.frameDurationsMs.length} entries but frameOrder has ${animation.frameOrder.length}.`));
    }
    for (const duration of animation.frameDurationsMs) {
        if (!isFiniteNumber(duration) || duration <= 0) {
            out.push(issue('error', 'TIMING_INVALID', target,
                `Frame duration ${duration} must be a positive number.`));
        }
    }

    if (!SPRITE_LOOP_MODES.includes(animation.loopMode)) {
        out.push(issue('error', 'LOOP_MODE_UNSUPPORTED', target,
            `Unsupported loop mode "${animation.loopMode}".`));
    }
    if (!SPRITE_Z_LAYERS.includes(animation.zLayer)) {
        out.push(issue('error', 'Z_LAYER_INVALID', target,
            `Unsupported z-layer "${animation.zLayer}".`));
    }
    if (!SPRITE_BLEND_MODES.includes(animation.blendMode)) {
        out.push(issue('error', 'BLEND_MODE_INVALID', target,
            `Unsupported blend mode "${animation.blendMode}".`));
    }
    if (!isNormalized(animation.anchor.x) || !isNormalized(animation.anchor.y)) {
        out.push(issue('error', 'ANCHOR_INVALID', target,
            `Anchor must be normalized to 0..1; received (${animation.anchor.x}, ${animation.anchor.y}).`));
    }
    if (!isNormalized(animation.opacity)) {
        out.push(issue('error', 'OPACITY_INVALID', target,
            `Opacity must be between 0 and 1; received ${animation.opacity}.`));
    }
    if (!isFiniteNumber(animation.worldScale) || animation.worldScale <= 0) {
        out.push(issue('error', 'SCALE_INVALID', target,
            `World scale must be a positive number; received ${animation.worldScale}.`));
    }
    if (!Number.isInteger(animation.reducedMotionFrameIndex)
        || animation.reducedMotionFrameIndex < 0
        || animation.reducedMotionFrameIndex > maxIndex) {
        out.push(issue('error', 'REDUCED_MOTION_FRAME_INVALID', target,
            `Reduced-motion frame ${animation.reducedMotionFrameIndex} is outside 0..${maxIndex}.`));
    }
    if (animation.pixelArt && animation.interpolation !== 'nearest') {
        out.push(issue('error', 'INTERPOLATION_INVALID', target,
            'Pixel-art animations must use nearest-neighbour interpolation.'));
    }

    if (animation.production && asset && !asset.productionApproved) {
        out.push(issue('error', 'PRODUCTION_BACKED_BY_REFERENCE', target,
            `Production animation is backed by non-approved asset set "${asset.id}".`));
    }
    // Approval is an authored decision; the two flags must never disagree.
    if (animation.production && animation.approvalStatus !== 'production-approved') {
        out.push(issue('error', 'PRODUCTION_WITHOUT_APPROVAL', target,
            `Animation is marked production but approvalStatus is "${animation.approvalStatus}".`));
    }
    if (animation.production && animation.sequenceAuthorship !== 'source-verified') {
        out.push(issue('error', 'PRODUCTION_SEQUENCE_UNVERIFIED', target,
            'Production animation cannot use an unverified curated frame order.'));
    }

    for (const warning of animation.warnings) {
        out.push(issue('warning', 'ANIMATION_NOTE', target, warning));
    }
}

export function validateSpriteManifest(manifest: SpriteManifest): SpriteValidationResult {
    const collected: SpriteValidationIssue[] = [];

    const assetsById = new Map<string, SpriteAssetSet>();
    for (const asset of manifest.assetSets) {
        if (assetsById.has(asset.id)) {
            collected.push(issue('error', 'ASSET_ID_DUPLICATE', asset.id,
                `Duplicate asset set ID "${asset.id}".`));
            continue;
        }
        assetsById.set(asset.id, asset);
    }
    for (const asset of manifest.assetSets) {
        validateAssetSet(asset, collected);
    }

    const animationIds = new Set<string>();
    for (const animation of manifest.animations) {
        if (animationIds.has(animation.id)) {
            collected.push(issue('error', 'ANIMATION_ID_DUPLICATE', animation.id,
                `Duplicate animation ID "${animation.id}".`));
            continue;
        }
        animationIds.add(animation.id);
    }
    for (const animation of manifest.animations) {
        validateAnimation(animation, assetsById, collected);
    }

    // Fallback references must resolve to a real animation, and must terminate.
    const byId = new Map(manifest.animations.map(a => [a.id, a]));
    for (const animation of manifest.animations) {
        if (animation.fallbackAnimationId && !animationIds.has(animation.fallbackAnimationId)) {
            collected.push(issue('error', 'FALLBACK_ANIMATION_MISSING', animation.id,
                `Fallback animation "${animation.fallbackAnimationId}" does not exist.`));
            continue;
        }
        // Walk the chain; a repeat means a cycle that would otherwise recurse forever.
        const visited = new Set<string>([animation.id]);
        let cursor = animation.fallbackAnimationId;
        while (cursor) {
            if (visited.has(cursor)) {
                collected.push(issue('error', 'FALLBACK_ANIMATION_CYCLE', animation.id,
                    `Fallback chain forms a cycle at "${cursor}".`));
                break;
            }
            visited.add(cursor);
            cursor = byId.get(cursor)?.fallbackAnimationId ?? null;
        }
    }

    const errors = collected.filter(i => i.severity === 'error');
    const warnings = collected.filter(i => i.severity === 'warning');
    return { valid: errors.length === 0, errors, warnings, issues: collected };
}

/** Throws when a manifest contains errors. Used to fail closed in dev and tests. */
export function assertValidSpriteManifest(manifest: SpriteManifest): void {
    const result = validateSpriteManifest(manifest);
    if (!result.valid) {
        const detail = result.errors
            .map(e => `${e.code} [${e.target}]: ${e.message}`)
            .join('\n');
        throw new Error(`Invalid sprite manifest:\n${detail}`);
    }
}

/**
 * Minimal sub-manifest containing one animation, its asset set and every
 * recursively referenced fallback animation (plus their assets).
 *
 * The renderer uses this so validating a single entry does not spuriously
 * report `FALLBACK_ANIMATION_MISSING` for a fallback that exists in the full
 * manifest. Fallback validation stays enabled rather than being disabled.
 */
export function buildAnimationDependencyClosure(
    manifest: SpriteManifest,
    animationId: string,
): SpriteManifest {
    const byId = new Map(manifest.animations.map(a => [a.id, a]));
    const animations: SpriteAnimation[] = [];
    const seen = new Set<string>();

    let cursor: string | null = animationId;
    while (cursor && !seen.has(cursor)) {
        seen.add(cursor);
        const found: SpriteAnimation | undefined = byId.get(cursor);
        if (!found) break;
        animations.push(found);
        cursor = found.fallbackAnimationId;
    }

    const neededAssets = new Set(animations.map(a => a.assetSetId));
    return {
        schemaVersion: manifest.schemaVersion,
        assetSets: manifest.assetSets.filter(a => neededAssets.has(a.id)),
        animations,
    };
}
