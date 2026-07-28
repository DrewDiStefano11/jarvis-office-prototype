import { describe, expect, it } from 'vitest';
import { buildPlaybackSequence, nextPlaybackIndex } from '../animation';
import { AnimationDefinition } from '../types';

const animation: AnimationDefinition = {
    frameWidth: 32,
    frameHeight: 48,
    frameCount: 4,
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
});
