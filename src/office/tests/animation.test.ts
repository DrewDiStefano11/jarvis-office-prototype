import { describe, expect, it } from 'vitest';
import {
    buildPlaybackSequence,
    hasValidSpriteSheetDimensions,
    nextPlaybackIndex,
    spriteFrameLayout,
    spriteSheetDimensions,
} from '../animation';
import { AnimationDefinition } from '../types';

const animation: AnimationDefinition = {
    frameWidth: 32,
    frameHeight: 48,
    frameCount: 4,
    columns: 2,
    frameSequence: [0, 1, 2, 3],
    frameDurationMs: 100,
    loop: true,
    pingPong: true,
    idle: true,
};

describe('sprite playback helpers', () => {
    it('builds ping-pong playback without duplicating terminal frames', () => {
        expect(buildPlaybackSequence(animation)).toEqual([0, 1, 2, 3, 2, 1]);
        expect(buildPlaybackSequence({ ...animation, pingPong: false })).toEqual([0, 1, 2, 3]);
    });

    it('loops or holds the final frame deterministically', () => {
        expect(nextPlaybackIndex(5, 6, true)).toBe(0);
        expect(nextPlaybackIndex(5, 6, false)).toBe(5);
        expect(nextPlaybackIndex(2, 6, true)).toBe(3);
    });

    it('maps frame indexes across rows and columns', () => {
        expect(spriteFrameLayout(3, animation)).toEqual({ column: 1, row: 1, x: -32, y: -48 });
        expect(spriteFrameLayout(3, animation, 2)).toEqual({ column: 1, row: 1, x: -64, y: -96 });
        expect(spriteSheetDimensions(animation)).toEqual({ width: 64, height: 96, rows: 2 });
    });

    it('supports and dimension-checks a 10 by 10 sprite sheet', () => {
        const grid = { ...animation, frameWidth: 128, frameHeight: 192, frameCount: 100, columns: 10 };
        expect(spriteFrameLayout(99, grid)).toEqual({ column: 9, row: 9, x: -1152, y: -1728 });
        expect(spriteSheetDimensions(grid)).toEqual({ width: 1280, height: 1920, rows: 10 });
        expect(hasValidSpriteSheetDimensions(1280, 1920, grid)).toBe(true);
        expect(hasValidSpriteSheetDimensions(12800, 192, grid)).toBe(false);
    });
});
