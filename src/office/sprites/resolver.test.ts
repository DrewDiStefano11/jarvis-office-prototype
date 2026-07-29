import { describe, expect, it } from 'vitest';
import { AGENT_SPRITE_MANIFEST } from './manifest';
import { frameAtElapsedTime, framePosition, resolveSpriteClip } from './resolver';

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
});
