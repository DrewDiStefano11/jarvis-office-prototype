import { describe, expect, it } from 'vitest';
import {
    ANIM_CENTRAL_NEXUS_FLOAT,
    ANIM_CENTRAL_NEXUS_IDLE,
    ASSETSET_CENTRAL_NEXUS_HOLOGRAM,
    CENTRAL_NEXUS_PUBLIC_PATH,
    LEGACY_OFFICE_HOLOGRAM_PATH,
    SPRITE_MANIFEST,
    getAnimation,
    getAssetSet,
} from '../sprites/manifest';
import { SpriteAnimation, SpriteManifest } from '../sprites/manifestTypes';
import {
    assertValidSpriteManifest,
    validateSpriteManifest,
} from '../sprites/manifestValidation';

const idle = getAnimation(ANIM_CENTRAL_NEXUS_IDLE) as SpriteAnimation;
const assetSet = getAssetSet(ASSETSET_CENTRAL_NEXUS_HOLOGRAM)!;

function manifestWith(animation: SpriteAnimation): SpriteManifest {
    return { schemaVersion: 1, assetSets: [assetSet], animations: [animation] };
}

function codesFor(animation: SpriteAnimation): string[] {
    return validateSpriteManifest(manifestWith(animation)).errors.map(e => e.code);
}

describe('sprite manifest', () => {
    it('validates the shipped manifest', () => {
        const result = validateSpriteManifest(SPRITE_MANIFEST);
        expect(result.errors).toEqual([]);
        expect(result.valid).toBe(true);
        expect(() => assertValidSpriteManifest(SPRITE_MANIFEST)).not.toThrow();
    });

    it('uses an isolated candidate path, not the legacy registry path', () => {
        expect(CENTRAL_NEXUS_PUBLIC_PATH)
            .toBe('assets/office/sprites/holograms/candidates/central-nexus-pose-grid.png');
        expect(assetSet.publicPath).toBe(CENTRAL_NEXUS_PUBLIC_PATH);
        expect(assetSet.publicPath.startsWith('/')).toBe(false);
        expect(assetSet.publicPath).not.toBe(LEGACY_OFFICE_HOLOGRAM_PATH);
    });

    it('ships the Nexus entries as candidate-unverified, never production', () => {
        expect(assetSet.approvalStatus).toBe('candidate-unverified');
        expect(assetSet.productionApproved).toBe(false);
        for (const id of [ANIM_CENTRAL_NEXUS_IDLE, ANIM_CENTRAL_NEXUS_FLOAT]) {
            const animation = getAnimation(id)!;
            expect(animation.production, id).toBe(false);
            expect(animation.approvalStatus, id).toBe('candidate-unverified');
            expect(animation.sequenceAuthorship, id).toBe('curated-preview-unverified');
        }
    });

    it('keeps the candidate valid for the review lab while barring production', () => {
        // Structurally valid...
        expect(validateSpriteManifest(SPRITE_MANIFEST).valid).toBe(true);
        // ...but flipping it to production must fail closed.
        const forced = validateSpriteManifest({
            schemaVersion: 1,
            assetSets: [assetSet],
            animations: [{ ...idle, production: true }],
        });
        expect(forced.valid).toBe(false);
        const codes = forced.errors.map(e => e.code);
        expect(codes).toContain('PRODUCTION_WITHOUT_APPROVAL');
        expect(codes).toContain('PRODUCTION_BACKED_BY_REFERENCE');
    });

    it('cannot mark a conditionally_usable asset as production-approved', () => {
        const result = validateSpriteManifest({
            schemaVersion: 1,
            assetSets: [{
                ...assetSet,
                productionApproved: true,
                approvalStatus: 'production-approved',
            }],
            animations: [],
        });
        // Nexus measures as conditionally_usable, so approval must be refused.
        expect(result.errors.map(e => e.code)).toContain('ASSET_REFERENCE_ONLY');
    });

    it('rejects an asset whose approval flags disagree', () => {
        const result = validateSpriteManifest({
            schemaVersion: 1,
            assetSets: [{ ...assetSet, productionApproved: true }],
            animations: [],
        });
        expect(result.errors.map(e => e.code)).toContain('ASSET_APPROVAL_INCONSISTENT');
    });

    it('rejects a production animation built on an unverified curated order', () => {
        const codes = codesFor({
            ...idle,
            production: true,
            approvalStatus: 'production-approved',
        });
        expect(codes).toContain('PRODUCTION_SEQUENCE_UNVERIFIED');
    });

    it('describes the Central Nexus sheet with measured, non-uniform geometry', () => {
        expect(idle.uniformGrid).toBe(false);
        expect(idle.rows).toBe(9);
        expect(idle.columns).toBe(10);
        expect(idle.totalCellCount).toBe(90);
        expect(idle.frameRectangles).toHaveLength(90);
        expect(idle.frameIndexBase).toBe(0);
        expect(idle.pixelArt).toBe(true);
        expect(idle.interpolation).toBe('nearest');
    });

    it('keeps used and unused frame lists complete and disjoint', () => {
        const used = new Set(idle.usedFrameIndexes);
        const unused = new Set(idle.unusedFrameIndexes);
        expect(used.size + unused.size).toBe(idle.totalCellCount);
        for (const index of used) expect(unused.has(index)).toBe(false);
    });

    it('rejects duplicate asset IDs', () => {
        const result = validateSpriteManifest({
            schemaVersion: 1,
            assetSets: [assetSet, assetSet],
            animations: [],
        });
        expect(result.errors.map(e => e.code)).toContain('ASSET_ID_DUPLICATE');
    });

    it('rejects duplicate animation IDs', () => {
        const result = validateSpriteManifest({
            schemaVersion: 1,
            assetSets: [assetSet],
            animations: [idle, idle],
        });
        expect(result.errors.map(e => e.code)).toContain('ANIMATION_ID_DUPLICATE');
    });

    it('rejects animations that reference a missing asset set', () => {
        expect(codesFor({ ...idle, assetSetId: 'ASSETSET_DOES_NOT_EXIST' }))
            .toContain('ANIMATION_ASSET_MISSING');
    });

    it('rejects a source file that is not in the measured inventory', () => {
        const result = validateSpriteManifest({
            schemaVersion: 1,
            assetSets: [{ ...assetSet, sourcePath: 'not-a-real-file.png' }],
            animations: [],
        });
        expect(result.errors.map(e => e.code)).toContain('ASSET_SOURCE_MISSING');
    });

    it('rejects manifest dimensions that disagree with the actual PNG', () => {
        const result = validateSpriteManifest({
            schemaVersion: 1,
            assetSets: [{ ...assetSet, sourceDimensions: { width: 999, height: 999 } }],
            animations: [],
        });
        expect(result.errors.map(e => e.code)).toContain('ASSET_DIMENSION_MISMATCH');
    });

    it('rejects invalid frame dimensions', () => {
        expect(codesFor({ ...idle, frameWidth: 0, frameHeight: -4 }))
            .toContain('ANIMATION_FRAME_DIMENSIONS_INVALID');
    });

    it('rejects invalid row or column counts', () => {
        const codes = codesFor({ ...idle, rows: 0, columns: -1 });
        expect(codes).toContain('ANIMATION_GRID_INVALID');
    });

    it('rejects frame rectangles that fall outside the image', () => {
        const rects = [...idle.frameRectangles!];
        rects[0] = { ...rects[0], x: 1200, width: 400 };
        expect(codesFor({ ...idle, frameRectangles: rects }))
            .toContain('FRAME_RECT_OUT_OF_BOUNDS');
    });

    it('rejects duplicate frame rectangle indexes', () => {
        const rects = [...idle.frameRectangles!];
        rects[1] = { ...rects[1], index: rects[0].index };
        expect(codesFor({ ...idle, frameRectangles: rects }))
            .toContain('FRAME_RECT_DUPLICATE');
    });

    it('rejects out-of-range frame indexes', () => {
        expect(codesFor({ ...idle, frameOrder: [0, 500], usedFrameIndexes: [0, 500] }))
            .toContain('FRAME_INDEX_OUT_OF_RANGE');
    });

    it('rejects duplicate used frame indexes', () => {
        expect(codesFor({ ...idle, usedFrameIndexes: [0, 0, 1] }))
            .toContain('FRAME_INDEX_DUPLICATE');
    });

    it('rejects overlap between used and unused frames', () => {
        expect(codesFor({ ...idle, unusedFrameIndexes: [...idle.unusedFrameIndexes, 0] }))
            .toContain('FRAME_USED_UNUSED_OVERLAP');
    });

    it('rejects an empty animation sequence', () => {
        expect(codesFor({ ...idle, frameOrder: [] })).toContain('ANIMATION_SEQUENCE_EMPTY');
    });

    it('rejects invalid timing values', () => {
        expect(codesFor({ ...idle, defaultFrameDurationMs: 0 })).toContain('TIMING_INVALID');
        expect(codesFor({ ...idle, frameDurationsMs: [100, -5] })).toContain('TIMING_INVALID');
    });

    it('rejects unsupported loop modes', () => {
        const broken = { ...idle, loopMode: 'bounce' } as unknown as SpriteAnimation;
        expect(codesFor(broken)).toContain('LOOP_MODE_UNSUPPORTED');
    });

    it('rejects anchors outside the normalized range', () => {
        expect(codesFor({ ...idle, anchor: { x: 1.5, y: -0.2 } })).toContain('ANCHOR_INVALID');
    });

    it('rejects invalid opacity and scale', () => {
        expect(codesFor({ ...idle, opacity: 2 })).toContain('OPACITY_INVALID');
        expect(codesFor({ ...idle, worldScale: 0 })).toContain('SCALE_INVALID');
    });

    it('rejects invalid z-layers', () => {
        const broken = { ...idle, zLayer: 'basement' } as unknown as SpriteAnimation;
        expect(codesFor(broken)).toContain('Z_LAYER_INVALID');
    });

    it('rejects a non-uniform sheet with no explicit rectangles', () => {
        expect(codesFor({ ...idle, frameRectangles: null }))
            .toContain('ANIMATION_RECTANGLES_REQUIRED');
    });

    it('rejects a reference-only asset backing a production animation', () => {
        const referenceBacked = {
            ...assetSet,
            id: 'ASSETSET_REFERENCE',
            sourcePath: 'Sprite Jobs.png',
            sha256: 'x'.repeat(64),
            hasAlphaChannel: false,
            productionApproved: true,
        };
        const result = validateSpriteManifest({
            schemaVersion: 1,
            assetSets: [referenceBacked],
            animations: [],
        });
        expect(result.errors.map(e => e.code)).toContain('ASSET_REFERENCE_ONLY');
    });

    it('rejects production animations backed by unapproved asset sets', () => {
        const result = validateSpriteManifest({
            schemaVersion: 1,
            assetSets: [{ ...assetSet, productionApproved: false }],
            animations: [{ ...idle, production: true }],
        });
        expect(result.errors.map(e => e.code)).toContain('PRODUCTION_BACKED_BY_REFERENCE');
    });

    it('rejects a missing fallback animation reference', () => {
        const result = validateSpriteManifest({
            schemaVersion: 1,
            assetSets: [assetSet],
            animations: [{ ...idle, fallbackAnimationId: 'ANIM_NOPE' }],
        });
        expect(result.errors.map(e => e.code)).toContain('FALLBACK_ANIMATION_MISSING');
    });

    it('rejects an invalid reduced-motion frame', () => {
        expect(codesFor({ ...idle, reducedMotionFrameIndex: 900 }))
            .toContain('REDUCED_MOTION_FRAME_INVALID');
    });

    it('requires nearest-neighbour interpolation for pixel art', () => {
        expect(codesFor({ ...idle, interpolation: 'smooth' }))
            .toContain('INTERPOLATION_INVALID');
    });

    it('throws when asserting an invalid manifest', () => {
        expect(() => assertValidSpriteManifest(manifestWith({ ...idle, frameOrder: [] })))
            .toThrow(/Invalid sprite manifest/);
    });

    it('exposes a float variant that reuses the idle frames', () => {
        const float = getAnimation(ANIM_CENTRAL_NEXUS_FLOAT);
        expect(float?.frameOrder).toEqual(idle.frameOrder);
        expect(float?.fallbackAnimationId).toBe(ANIM_CENTRAL_NEXUS_IDLE);
    });
});
