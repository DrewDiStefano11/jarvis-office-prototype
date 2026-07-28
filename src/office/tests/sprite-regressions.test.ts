import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
    ANIM_CENTRAL_NEXUS_FLOAT,
    ANIM_CENTRAL_NEXUS_IDLE,
    LEGACY_OFFICE_HOLOGRAM_PATH,
    SPRITE_MANIFEST,
    getAnimation,
    getAssetSet,
} from '../sprites/manifest';
import { SpriteAnimation, SpriteManifest } from '../sprites/manifestTypes';
import {
    buildAnimationDependencyClosure,
    validateSpriteManifest,
} from '../sprites/manifestValidation';
import { resolveFrameDurations, resolvePlaybackSteps } from '../sprites/playback';
import { OFFICE_ASSETS } from '../assets';
import { getSourceAsset, isProductionUsable, requiresHumanReview } from '../sprites/inventory';
import { NON_PRODUCTION_OVERLAY } from '../../domain/seed';

const idle = getAnimation(ANIM_CENTRAL_NEXUS_IDLE) as SpriteAnimation;
const assetSet = getAssetSet(idle.assetSetId)!;

function codesFor(animation: SpriteAnimation): string[] {
    return validateSpriteManifest({
        schemaVersion: 1,
        assetSets: [assetSet],
        animations: [animation],
    }).errors.map(e => e.code);
}

describe('regression: production approval is an authored decision', () => {
    it('does not treat conditionally_usable as production-usable', () => {
        const nexus = getSourceAsset('Nexus Tube Sprite.png')!;
        expect(nexus.readiness).toBe('conditionally_usable');
        // Measurement alone must never grant approval.
        expect(isProductionUsable(nexus)).toBe(false);
        expect(requiresHumanReview(nexus)).toBe(true);
    });

    it('still accepts a genuinely production_ready measured asset', () => {
        const agent = getSourceAsset('d85660f4-dd62-4dbc-baa6-7ccd75361bf0.png')!;
        expect(agent.readiness).toBe('production_ready');
        expect(isProductionUsable(agent)).toBe(true);
        expect(requiresHumanReview(agent)).toBe(false);
    });

    it('flags ambiguous assets as needing review', () => {
        const ambiguous = getSourceAsset('d85660f4-dd62-4dbc-baa6-7ccd75361bf0 (11).png')!;
        expect(ambiguous.ambiguous).toBe(true);
        expect(isProductionUsable(ambiguous)).toBe(false);
        expect(requiresHumanReview(ambiguous)).toBe(true);
    });

    it('ships no production-approved asset sets or animations at all', () => {
        for (const a of SPRITE_MANIFEST.assetSets) expect(a.productionApproved).toBe(false);
        for (const a of SPRITE_MANIFEST.animations) expect(a.production).toBe(false);
    });
});

describe('regression: legacy runtime path stays unpopulated', () => {
    it('leaves the registered office hologram file absent', () => {
        expect(existsSync(`public/${LEGACY_OFFICE_HOLOGRAM_PATH}`)).toBe(false);
    });

    it('keeps the candidate file at its isolated candidate path', () => {
        expect(existsSync(`public/${assetSet.publicPath}`)).toBe(true);
        expect(assetSet.publicPath).toContain('holograms/candidates/');
    });

    it('leaves the office asset registry entry untouched and still optional', () => {
        // Unchanged registry: the engine keeps pointing at the legacy path,
        // which remains missing, so its fallback behaviour is preserved.
        expect(OFFICE_ASSETS.hologram.id).toBe('central-blue-tube-hologram');
        expect(OFFICE_ASSETS.hologram.required).toBe(false);
        expect(OFFICE_ASSETS.hologram.path).toContain('central-blue-tube-hologram.png');
    });

    it('leaves the non-production sample overlay metadata unchanged', () => {
        const sprite = NON_PRODUCTION_OVERLAY.entities
            .map(e => e.sprite)
            .find(s => s?.assetId === 'central-blue-tube-hologram');
        expect(sprite).toBeDefined();
        // The sample still declares its own legacy uniform geometry, which the
        // candidate pose grid deliberately does not attempt to satisfy.
        expect(sprite?.animation.frameWidth).toBe(128);
        expect(sprite?.animation.frameHeight).toBe(192);
        expect(sprite?.animation.frameCount).toBe(8);
        expect(sprite?.animation.columns).toBe(8);
    });

    it('exposes the candidate only through the isolated sprite manifest', () => {
        expect(SPRITE_MANIFEST.assetSets.map(a => a.publicPath))
            .not.toContain(LEGACY_OFFICE_HOLOGRAM_PATH);
    });
});

describe('regression: fallback dependency closure', () => {
    it('includes the fallback animation so float validates cleanly', () => {
        const closure = buildAnimationDependencyClosure(SPRITE_MANIFEST, ANIM_CENTRAL_NEXUS_FLOAT);
        expect(closure.animations.map(a => a.id))
            .toEqual([ANIM_CENTRAL_NEXUS_FLOAT, ANIM_CENTRAL_NEXUS_IDLE]);
        expect(validateSpriteManifest(closure).valid).toBe(true);
    });

    it('validates the idle animation alone', () => {
        const closure = buildAnimationDependencyClosure(SPRITE_MANIFEST, ANIM_CENTRAL_NEXUS_IDLE);
        expect(closure.animations.map(a => a.id)).toEqual([ANIM_CENTRAL_NEXUS_IDLE]);
        expect(validateSpriteManifest(closure).valid).toBe(true);
    });

    it('still fails closed when a fallback genuinely does not exist', () => {
        const result = validateSpriteManifest({
            schemaVersion: 1,
            assetSets: [assetSet],
            animations: [{ ...idle, fallbackAnimationId: 'ANIM_NOT_REAL' }],
        });
        expect(result.errors.map(e => e.code)).toContain('FALLBACK_ANIMATION_MISSING');
    });

    it('follows chained fallbacks', () => {
        const c: SpriteAnimation = { ...idle, id: 'C', fallbackAnimationId: null };
        const b: SpriteAnimation = { ...idle, id: 'B', fallbackAnimationId: 'C' };
        const a: SpriteAnimation = { ...idle, id: 'A', fallbackAnimationId: 'B' };
        const manifest: SpriteManifest = { schemaVersion: 1, assetSets: [assetSet], animations: [a, b, c] };
        expect(buildAnimationDependencyClosure(manifest, 'A').animations.map(x => x.id))
            .toEqual(['A', 'B', 'C']);
        expect(validateSpriteManifest(manifest).valid).toBe(true);
    });

    it('detects cyclic fallbacks instead of recursing forever', () => {
        const a: SpriteAnimation = { ...idle, id: 'A', fallbackAnimationId: 'B' };
        const b: SpriteAnimation = { ...idle, id: 'B', fallbackAnimationId: 'A' };
        const manifest: SpriteManifest = { schemaVersion: 1, assetSets: [assetSet], animations: [a, b] };
        // Closure construction terminates.
        expect(buildAnimationDependencyClosure(manifest, 'A').animations.map(x => x.id))
            .toEqual(['A', 'B']);
        expect(validateSpriteManifest(manifest).errors.map(e => e.code))
            .toContain('FALLBACK_ANIMATION_CYCLE');
    });

    it('detects a self-referencing fallback', () => {
        const selfRef: SpriteAnimation = { ...idle, id: 'SELF', fallbackAnimationId: 'SELF' };
        expect(validateSpriteManifest({
            schemaVersion: 1, assetSets: [assetSet], animations: [selfRef],
        }).errors.map(e => e.code)).toContain('FALLBACK_ANIMATION_CYCLE');
    });
});

describe('regression: nonuniform rectangle coverage validation', () => {
    it('rejects a non-integer rectangle index', () => {
        const rects = [...idle.frameRectangles!];
        rects[0] = { ...rects[0], index: 1.5 };
        expect(codesFor({ ...idle, frameRectangles: rects }))
            .toContain('FRAME_RECT_INDEX_INVALID');
    });

    it('rejects a negative rectangle index', () => {
        const rects = [...idle.frameRectangles!];
        rects[0] = { ...rects[0], index: -1 };
        expect(codesFor({ ...idle, frameRectangles: rects }))
            .toContain('FRAME_RECT_INDEX_OUT_OF_RANGE');
    });

    it('rejects a rectangle index at or beyond totalCellCount', () => {
        const rects = [...idle.frameRectangles!];
        rects[0] = { ...rects[0], index: idle.totalCellCount };
        expect(codesFor({ ...idle, frameRectangles: rects }))
            .toContain('FRAME_RECT_INDEX_OUT_OF_RANGE');
    });

    it('rejects a missing rectangle for a frame in frameOrder', () => {
        // Drop the rectangle for played frame 5.
        const rects = idle.frameRectangles!.filter(r => r.index !== 5);
        const codes = codesFor({ ...idle, frameRectangles: rects });
        expect(codes).toContain('FRAME_RECT_MISSING');
    });

    it('rejects a missing rectangle for a usedFrameIndexes entry', () => {
        const rects = idle.frameRectangles!.filter(r => r.index !== 7);
        expect(codesFor({ ...idle, frameRectangles: rects })).toContain('FRAME_RECT_MISSING');
    });

    it('rejects a missing rectangle for the reduced-motion frame', () => {
        const rects = idle.frameRectangles!.filter(r => r.index !== idle.reducedMotionFrameIndex);
        expect(codesFor({ ...idle, frameRectangles: rects })).toContain('FRAME_RECT_MISSING');
    });

    it('rejects rectangles with invalid dimensions', () => {
        const rects = [...idle.frameRectangles!];
        rects[0] = { ...rects[0], width: 0, height: -5 };
        expect(codesFor({ ...idle, frameRectangles: rects })).toContain('FRAME_RECT_INVALID');
    });

    it('rejects incomplete used/unused cell accounting', () => {
        expect(codesFor({ ...idle, unusedFrameIndexes: idle.unusedFrameIndexes.slice(0, 5) }))
            .toContain('FRAME_ACCOUNTING_INCOMPLETE');
    });

    it('accepts the shipped fully-covered manifest', () => {
        expect(codesFor(idle)).toEqual([]);
    });
});

describe('regression: durations keyed by sequence position', () => {
    const base: SpriteAnimation = {
        ...idle,
        uniformGrid: true,
        frameRectangles: null,
        rows: 1,
        columns: 4,
        totalCellCount: 4,
        frameWidth: 10,
        frameHeight: 10,
        usedFrameIndexes: [0, 1],
        unusedFrameIndexes: [2, 3],
        reducedMotionFrameIndex: 0,
    };

    it('preserves 50/100/200 for frameOrder [0,1,0] (the reported bug)', () => {
        const a: SpriteAnimation = {
            ...base, frameOrder: [0, 1, 0], frameDurationsMs: [50, 100, 200], loopMode: 'loop',
        };
        expect(resolveFrameDurations(a)).toEqual([50, 100, 200]);
        expect(resolvePlaybackSteps(a).map(s => s.sourcePosition)).toEqual([0, 1, 2]);
        expect(resolvePlaybackSteps(a).map(s => s.frameIndex)).toEqual([0, 1, 0]);
    });

    it('reverses duration order for reverse playback', () => {
        const a: SpriteAnimation = {
            ...base,
            frameOrder: [0, 1, 0],
            frameDurationsMs: [50, 100, 200],
            loopMode: 'loop',
            playbackDirection: 'reverse',
        };
        expect(resolveFrameDurations(a)).toEqual([200, 100, 50]);
    });

    it('expands ping-pong durations by mirrored position without repeating endpoints', () => {
        const a: SpriteAnimation = {
            ...base,
            frameOrder: [0, 1, 2],
            usedFrameIndexes: [0, 1, 2],
            unusedFrameIndexes: [3],
            frameDurationsMs: [50, 100, 200],
            loopMode: 'ping-pong',
        };
        expect(resolvePlaybackSteps(a).map(s => s.frameIndex)).toEqual([0, 1, 2, 1]);
        expect(resolveFrameDurations(a)).toEqual([50, 100, 200, 100]);
    });

    it('falls back to the default duration where none is authored', () => {
        const a: SpriteAnimation = {
            ...base, frameOrder: [0, 1], frameDurationsMs: [], defaultFrameDurationMs: 75,
        };
        expect(resolveFrameDurations(a)).toEqual([75, 75]);
    });
});
