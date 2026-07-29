import { describe, expect, it } from 'vitest';
import { AGENT_SPRITE_MANIFEST } from './manifest';
import { frameAtElapsedTime, framePosition, resolveSpriteClip, spriteFrameSequence } from './resolver';
import { SpriteManifest } from './types';

describe('sprite state resolution', () => {
    it('selects an exact walking clip and advances deterministically', () => {
        const resolved = resolveSpriteClip(AGENT_SPRITE_MANIFEST, 'agent-sheet-01', 'walking', 'none');
        expect(resolved?.resolvedState).toBe('walking');
        expect(frameAtElapsedTime(resolved!, 130)).toBe(1);
        expect(framePosition(resolved!.asset, 7)).toEqual({ column: 1, row: 1, x: -181, y: -181 });
    });

    it('uses explicit fallback chains for unsupported states and directions', () => {
        const resolved = resolveSpriteClip(AGENT_SPRITE_MANIFEST, 'agent-sheet-01', 'reviewing', 'west');
        expect(resolved?.fallbackChain).toEqual(['reviewing', 'working', 'idle']);
        expect(resolved?.resolvedState).toBe('idle');
        expect(resolved?.resolvedDirection).toBe('none');
    });

    it('uses a static reduced-motion frame and handles missing assets safely', () => {
        const resolved = resolveSpriteClip(AGENT_SPRITE_MANIFEST, 'agent-sheet-01', 'walking', 'none', true);
        expect(resolved?.staticFrame).toBe(0);
        expect(frameAtElapsedTime(resolved!, 10_000)).toBe(0);
        expect(resolveSpriteClip(AGENT_SPRITE_MANIFEST, 'missing', 'idle', 'none')).toBeNull();
    });

    it('resolves offline to its explicitly declared terminal frame', () => {
        const resolved = resolveSpriteClip(AGENT_SPRITE_MANIFEST, 'agent-sheet-01', 'offline', 'none');
        expect(resolved?.resolvedState).toBe('offline');
        expect(resolved?.clip.frames).toEqual([0]);
        expect(frameAtElapsedTime(resolved!, 10_000)).toBe(0);
    });

    it('builds correct yoyo frame sequences for looping and non-looping clips', () => {
        expect(spriteFrameSequence([0, 1], true, false)).toEqual([0, 1, 0]);
        expect(spriteFrameSequence([0, 1, 2], true, false)).toEqual([0, 1, 2, 1, 0]);
        expect(spriteFrameSequence([0, 1, 2], true, true)).toEqual([0, 1, 2, 1]);
        expect(spriteFrameSequence([0, 1, 2], false, false)).toEqual([0, 1, 2]);
    });

    it('finishes a non-looping yoyo clip on its initial frame', () => {
        const manifest = structuredClone(AGENT_SPRITE_MANIFEST);
        const walking = manifest.assets[0].clips.find(clip => clip.state === 'walking');
        if (!walking) throw new Error('Expected walking clip.');
        const mutableWalking = walking as unknown as { loop: boolean; yoyo: boolean; frames: number[] };
        mutableWalking.loop = false;
        mutableWalking.yoyo = true;
        mutableWalking.frames = [0, 1, 2];
        const resolved = resolveSpriteClip(manifest, 'agent-sheet-01', 'walking', 'none');
        expect(frameAtElapsedTime(resolved!, 10_000)).toBe(0);
    });

    it('returns explicit unavailability instead of guessing an unrelated clip', () => {
        const partial = structuredClone(AGENT_SPRITE_MANIFEST) as unknown as {
            assets: Array<{ clips: typeof AGENT_SPRITE_MANIFEST.assets[number]['clips'] }>;
        };
        partial.assets[0].clips = partial.assets[0].clips.filter(clip => clip.state === 'walking');
        expect(resolveSpriteClip(
            partial as unknown as SpriteManifest,
            'agent-sheet-01',
            'reviewing',
            'none',
        )).toBeNull();
    });
});
