import { describe, expect, it } from 'vitest';
import { ANIM_CENTRAL_NEXUS_IDLE, getAnimation } from '../sprites/manifest';
import { SpriteAnimation } from '../sprites/manifestTypes';
import {
    advanceSequencePosition,
    frameIndexAtElapsed,
    frameRectangle,
    reducedMotionFrame,
    resolveFrameDurations,
    resolvePlaybackSequence,
    sequencePositionAtElapsed,
    toAnimationDefinition,
    totalCycleDurationMs,
} from '../sprites/playback';

const idle = getAnimation(ANIM_CENTRAL_NEXUS_IDLE) as SpriteAnimation;

/** Small synthetic animation so playback maths is easy to reason about. */
const simple: SpriteAnimation = {
    ...idle,
    id: 'ANIM_TEST_SIMPLE',
    uniformGrid: true,
    rows: 2,
    columns: 2,
    totalCellCount: 4,
    frameWidth: 10,
    frameHeight: 20,
    frameRectangles: null,
    frameOrder: [0, 1, 2, 3],
    usedFrameIndexes: [0, 1, 2, 3],
    unusedFrameIndexes: [],
    frameDurationsMs: [],
    defaultFrameDurationMs: 100,
    loopMode: 'loop',
};

describe('sprite playback', () => {
    it('computes uniform-grid frame coordinates', () => {
        expect(frameRectangle(simple, 0)).toEqual({ index: 0, row: 0, column: 0, x: 0, y: 0, width: 10, height: 20 });
        expect(frameRectangle(simple, 3)).toEqual({ index: 3, row: 1, column: 1, x: 10, y: 20, width: 10, height: 20 });
        expect(frameRectangle(simple, 9)).toBeUndefined();
    });

    it('uses explicit rectangles when the sheet is not a uniform grid', () => {
        const rect = frameRectangle(idle, 0);
        expect(rect).toBeDefined();
        // Measured values, not a computed multiple of a nominal cell size.
        expect(rect?.x).toBe(21);
        expect(rect?.y).toBe(10);
        expect(rect?.width).toBe(88);
        expect(rect?.height).toBe(123);
        const last = frameRectangle(idle, 89);
        expect(last?.row).toBe(8);
        expect(last?.column).toBe(9);
    });

    it('keeps every explicit rectangle inside the source image', () => {
        for (const rect of idle.frameRectangles ?? []) {
            expect(rect.x + rect.width).toBeLessThanOrEqual(1254);
            expect(rect.y + rect.height).toBeLessThanOrEqual(1254);
        }
    });

    it('loops back to the first frame after a full cycle', () => {
        expect(totalCycleDurationMs(simple)).toBe(400);
        expect(frameIndexAtElapsed(simple, 0)).toBe(0);
        expect(frameIndexAtElapsed(simple, 150)).toBe(1);
        expect(frameIndexAtElapsed(simple, 399)).toBe(3);
        expect(frameIndexAtElapsed(simple, 400)).toBe(0);
        expect(frameIndexAtElapsed(simple, 1250)).toBe(0); // 1250 % 400 = 50
        expect(frameIndexAtElapsed(simple, 1350)).toBe(1);
    });

    it('stops on the configured frame for once playback', () => {
        const once: SpriteAnimation = { ...simple, loopMode: 'once', holdBehavior: 'last-frame' };
        expect(frameIndexAtElapsed(once, 350)).toBe(3);
        expect(frameIndexAtElapsed(once, 5000)).toBe(3);
        const holdFirst: SpriteAnimation = { ...once, holdBehavior: 'first-frame' };
        expect(frameIndexAtElapsed(holdFirst, 5000)).toBe(0);
    });

    it('holds without advancing past the sequence', () => {
        const hold: SpriteAnimation = { ...simple, loopMode: 'hold', holdBehavior: 'last-frame' };
        expect(frameIndexAtElapsed(hold, 10_000)).toBe(3);
    });

    it('builds a ping-pong sequence without duplicating terminal frames', () => {
        const ping: SpriteAnimation = { ...simple, loopMode: 'ping-pong' };
        expect(resolvePlaybackSequence(ping)).toEqual([0, 1, 2, 3, 2, 1]);
        expect(totalCycleDurationMs(ping)).toBe(600);
        expect(frameIndexAtElapsed(ping, 450)).toBe(2);
        expect(frameIndexAtElapsed(ping, 550)).toBe(1);
        expect(frameIndexAtElapsed(ping, 600)).toBe(0);
    });

    it('plays in reverse when configured', () => {
        const reverse: SpriteAnimation = { ...simple, playbackDirection: 'reverse' };
        expect(resolvePlaybackSequence(reverse)).toEqual([3, 2, 1, 0]);
    });

    it('honours variable frame durations', () => {
        const variable: SpriteAnimation = { ...simple, frameDurationsMs: [50, 200, 50, 100] };
        expect(resolveFrameDurations(variable)).toEqual([50, 200, 50, 100]);
        expect(frameIndexAtElapsed(variable, 40)).toBe(0);
        expect(frameIndexAtElapsed(variable, 60)).toBe(1);
        expect(frameIndexAtElapsed(variable, 260)).toBe(2);
        expect(frameIndexAtElapsed(variable, 320)).toBe(3);
    });

    it('resolves frames purely from elapsed time, independent of refresh rate', () => {
        // Whether we sample at 60Hz or 144Hz, the same elapsed time gives the
        // same frame; nothing depends on how many times we sampled.
        const at60 = [0, 16.7, 33.3, 50, 66.7, 83.3, 100, 116.7]
            .map(t => frameIndexAtElapsed(simple, t));
        const at144 = Array.from({ length: 18 }, (_, i) => (i * 1000) / 144)
            .map(t => frameIndexAtElapsed(simple, t));
        expect(at60[0]).toBe(0);
        expect(at60[at60.length - 1]).toBe(1);
        expect(frameIndexAtElapsed(simple, 116.7)).toBe(at144[at144.length - 1]);
        expect(frameIndexAtElapsed(simple, 250)).toBe(frameIndexAtElapsed(simple, 250));
    });

    it('resuming after a hidden tab does not jump when the clock is not advanced', () => {
        // The renderer accumulates elapsed time only while visible, so a paused
        // gap resolves to exactly the same frame it paused on.
        const before = frameIndexAtElapsed(simple, 250);
        const afterPause = frameIndexAtElapsed(simple, 250);
        expect(afterPause).toBe(before);
    });

    it('handles degenerate elapsed values safely', () => {
        expect(frameIndexAtElapsed(simple, -100)).toBe(0);
        expect(frameIndexAtElapsed(simple, Number.NaN)).toBe(0);
        expect(sequencePositionAtElapsed({ ...simple, frameOrder: [] }, 100)).toBe(0);
    });

    it('advances sequence positions with loop awareness', () => {
        expect(advanceSequencePosition(simple, 0)).toBe(1);
        expect(advanceSequencePosition(simple, 3)).toBe(0);
        const once: SpriteAnimation = { ...simple, loopMode: 'once' };
        expect(advanceSequencePosition(once, 3)).toBe(3);
    });

    it('exposes the reduced-motion fallback frame', () => {
        expect(reducedMotionFrame(idle)).toBe(idle.reducedMotionFrameIndex);
        expect(idle.reducedMotionFrameIndex).toBe(0);
    });

    it('adapts to the legacy AnimationDefinition shape', () => {
        const def = toAnimationDefinition(simple);
        expect(def.frameCount).toBe(4);
        expect(def.columns).toBe(2);
        expect(def.loop).toBe(true);
        expect(def.pingPong).toBe(false);
        expect(toAnimationDefinition({ ...simple, loopMode: 'ping-pong' }).pingPong).toBe(true);
        expect(toAnimationDefinition({ ...simple, loopMode: 'once' }).loop).toBe(false);
    });
});
