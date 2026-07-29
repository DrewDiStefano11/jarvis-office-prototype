// @vitest-environment happy-dom

import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
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

    it('keeps the displayed animation frame when playback is paused', async () => {
        const image = { naturalWidth: 1086, naturalHeight: 1448 } as HTMLImageElement;
        let tick: ((elapsed: number) => void) | undefined;
        const unsubscribe = vi.fn();
        const runtime = {
            textures: { load: vi.fn().mockResolvedValue(image) },
            clock: {
                subscribe: vi.fn((subscriber: (elapsed: number) => void) => {
                    tick = subscriber;
                    return unsubscribe;
                }),
            },
        } as unknown as SpriteSurfaceRuntime;
        const { container, rerender } = render(
            <SpritePlayer
                manifest={AGENT_SPRITE_MANIFEST}
                runtime={runtime}
                assetId="agent-sheet-01"
                state="walking"
            />,
        );

        const frame = () => container.querySelector<HTMLElement>('.sprite-player__frame');
        await waitFor(() => expect(runtime.clock.subscribe).toHaveBeenCalledOnce());
        act(() => tick?.(10_000));
        expect(frame()?.style.backgroundPosition).toBe('0px 0px');
        act(() => tick?.(10_250));
        expect(frame()?.style.backgroundPosition).toBe('-362px 0px');

        rerender(
            <SpritePlayer
                manifest={AGENT_SPRITE_MANIFEST}
                runtime={runtime}
                assetId="agent-sheet-01"
                state="walking"
                paused
            />,
        );

        expect(frame()?.style.backgroundPosition).toBe('-362px 0px');
        expect(unsubscribe).toHaveBeenCalledOnce();
    });

    it('does not subscribe a static clip to the animation clock', async () => {
        const image = { naturalWidth: 1086, naturalHeight: 1448 } as HTMLImageElement;
        const runtime = {
            textures: { load: vi.fn().mockResolvedValue(image) },
            clock: { subscribe: vi.fn() },
        } as unknown as SpriteSurfaceRuntime;

        const { container } = render(
            <SpritePlayer
                manifest={AGENT_SPRITE_MANIFEST}
                runtime={runtime}
                assetId="agent-sheet-01"
                state="idle"
            />,
        );

        await waitFor(() => {
            expect(container.querySelector<HTMLElement>('.sprite-player__frame')?.style.visibility).toBe('visible');
        });
        expect(runtime.clock.subscribe).not.toHaveBeenCalled();
    });

    it('starts a newly activated clip from its own first frame instead of shared clock lifetime', async () => {
        const image = { naturalWidth: 1086, naturalHeight: 1448 } as HTMLImageElement;
        let tick: ((elapsed: number) => void) | undefined;
        const runtime = {
            textures: { load: vi.fn().mockResolvedValue(image) },
            clock: {
                subscribe: vi.fn((subscriber: (elapsed: number) => void) => {
                    tick = subscriber;
                    return vi.fn();
                }),
            },
        } as unknown as SpriteSurfaceRuntime;
        const { container, rerender } = render(
            <SpritePlayer manifest={AGENT_SPRITE_MANIFEST} runtime={runtime} assetId="agent-sheet-01" state="walking" />,
        );
        const frame = () => container.querySelector<HTMLElement>('.sprite-player__frame');
        await waitFor(() => expect(runtime.clock.subscribe).toHaveBeenCalledOnce());
        act(() => tick?.(250_000));
        expect(frame()?.style.backgroundPosition).toBe('0px 0px');
        act(() => tick?.(250_250));
        expect(frame()?.style.backgroundPosition).toBe('-362px 0px');
        rerender(<SpritePlayer manifest={AGENT_SPRITE_MANIFEST} runtime={runtime} assetId="agent-sheet-01" state="offline" />);
        await waitFor(() => expect(frame()?.style.backgroundPosition).toBe('0px 0px'));
    });

    it('excludes an individual paused player from shared clock elapsed while other sprites can continue', async () => {
        const image = { naturalWidth: 1086, naturalHeight: 1448 } as HTMLImageElement;
        let tick: ((elapsed: number) => void) | undefined;
        const runtime = {
            textures: { load: vi.fn().mockResolvedValue(image) },
            clock: {
                subscribe: vi.fn((subscriber: (elapsed: number) => void) => {
                    tick = subscriber;
                    return vi.fn();
                }),
            },
        } as unknown as SpriteSurfaceRuntime;
        const { container, rerender } = render(
            <SpritePlayer manifest={AGENT_SPRITE_MANIFEST} runtime={runtime} assetId="agent-sheet-01" state="walking" />,
        );
        const frame = () => container.querySelector<HTMLElement>('.sprite-player__frame');
        await waitFor(() => expect(runtime.clock.subscribe).toHaveBeenCalledOnce());
        act(() => tick?.(1_000));
        act(() => tick?.(1_250));
        const pausedFrame = frame()?.style.backgroundPosition;
        expect(pausedFrame).toBe('-362px 0px');

        rerender(<SpritePlayer manifest={AGENT_SPRITE_MANIFEST} runtime={runtime} assetId="agent-sheet-01" state="walking" paused />);
        act(() => tick?.(20_000));
        expect(frame()?.style.backgroundPosition).toBe(pausedFrame);

        rerender(<SpritePlayer manifest={AGENT_SPRITE_MANIFEST} runtime={runtime} assetId="agent-sheet-01" state="walking" />);
        act(() => tick?.(20_000));
        expect(frame()?.style.backgroundPosition).toBe(pausedFrame);
        act(() => tick?.(20_125));
        expect(frame()?.style.backgroundPosition).not.toBe(pausedFrame);
    });

    it('unsubscribes when a one-shot clip reaches its final frame', async () => {
        const manifest = structuredClone(AGENT_SPRITE_MANIFEST);
        const walking = manifest.assets[0].clips.find(clip => clip.state === 'walking');
        if (!walking) throw new Error('Expected the generated walking clip.');
        (walking as { loop: boolean }).loop = false;
        const image = { naturalWidth: 1086, naturalHeight: 1448 } as HTMLImageElement;
        let tick: ((elapsed: number) => void) | undefined;
        const unsubscribe = vi.fn();
        const runtime = {
            textures: { load: vi.fn().mockResolvedValue(image) },
            clock: {
                subscribe: vi.fn((subscriber: (elapsed: number) => void) => {
                    tick = subscriber;
                    return unsubscribe;
                }),
            },
        } as unknown as SpriteSurfaceRuntime;

        render(
            <SpritePlayer
                manifest={manifest}
                runtime={runtime}
                assetId="agent-sheet-01"
                state="walking"
            />,
        );

        await waitFor(() => expect(runtime.clock.subscribe).toHaveBeenCalledOnce());
        act(() => tick?.(10_000));
        act(() => tick?.(10_750));
        expect(unsubscribe).toHaveBeenCalledOnce();
    });
});
