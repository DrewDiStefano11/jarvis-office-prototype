// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AGENT_SPRITE_MANIFEST } from '../../office/sprites/manifest';
import { SpriteSurfaceRuntime } from '../../office/sprites/runtime';
import { SpritePlayer } from './SpritePlayer';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('SpritePlayer texture failure', () => {
    it('reports explicit unavailability and logs the development-only diagnostic', async () => {
        const failure = new Error('generated texture unavailable');
        const runtime = {
            textures: { load: vi.fn().mockRejectedValue(failure) },
            clock: { subscribe: vi.fn() },
        } as unknown as SpriteSurfaceRuntime;
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        render(
            <SpritePlayer
                manifest={AGENT_SPRITE_MANIFEST}
                runtime={runtime}
                assetId="agent-sheet-01"
                state="reviewing"
            />,
        );

        await waitFor(() => expect(screen.getByRole('img').getAttribute('aria-label')).toContain(failure.message));
        expect(screen.getByText('?')).toBeTruthy();
        expect(error).toHaveBeenCalledWith(failure.message);
        expect(runtime.clock.subscribe).not.toHaveBeenCalled();
    });
});
