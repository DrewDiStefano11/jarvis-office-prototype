import { describe, expect, it } from 'vitest';
import { isAgentSpriteDemoRequested, isAgentSpriteVisualLabRequested } from './routes';

describe('sprite development route gating', () => {
    it('activates only for exact development queries', () => {
        expect(isAgentSpriteVisualLabRequested('?visualLab=agent-sprites', true)).toBe(true);
        expect(isAgentSpriteDemoRequested('?spriteDemo=agents', true)).toBe(true);
        expect(isAgentSpriteVisualLabRequested('?visualLab=other', true)).toBe(false);
        expect(isAgentSpriteDemoRequested('', true)).toBe(false);
    });

    it('is harmless in production builds', () => {
        expect(isAgentSpriteVisualLabRequested('?visualLab=agent-sprites', false)).toBe(false);
        expect(isAgentSpriteDemoRequested('?spriteDemo=agents', false)).toBe(false);
    });
});
