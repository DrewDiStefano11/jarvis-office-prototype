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

    it('recomputes a manually selected frame crop when scale changes', async () => {
        const image = { naturalWidth: 1086, naturalHeight: 1448 } as HTMLImageElement;
        const runtime = {
            textures: { load: vi.fn().mockResolvedValue(image) },
            clock: { subscribe: vi.fn() },
        } as unknown as SpriteSurfaceRuntime;
        const { container, rerender } = render(
            <SpritePlayer
                manifest={AGENT_SPRITE_MANIFEST}
                runtime={runtime}
                assetId="agent-sheet-01"
                state="walking"
                manualFrame={1}
                scale={1}
            />,
        );

        const frame = () => container.querySelector<HTMLElement>('.sprite-player__frame');
        await waitFor(() => expect(frame()?.style.backgroundPosition).toBe('-181px 0px'));
        rerender(
            <SpritePlayer
                manifest={AGENT_SPRITE_MANIFEST}
                runtime={runtime}
                assetId="agent-sheet-01"
                state="walking"
                manualFrame={1}
                scale={2}
            />,
        );
        await waitFor(() => expect(frame()?.style.backgroundPosition).toBe('-362px 0px'));
    });
});
