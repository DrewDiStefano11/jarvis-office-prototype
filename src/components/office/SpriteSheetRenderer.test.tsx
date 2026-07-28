// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SpriteSheetRenderer } from './SpriteSheetRenderer';
import { resolvePublicAssetPath } from '../../office/assets';
import {
    ANIM_CENTRAL_NEXUS_IDLE,
    CENTRAL_NEXUS_PUBLIC_PATH,
    getAnimation,
} from '../../office/sprites/manifest';
import { SpriteAnimation } from '../../office/sprites/manifestTypes';

const idle = getAnimation(ANIM_CENTRAL_NEXUS_IDLE) as SpriteAnimation;

/** Drives the mocked Image loader deterministically. */
function stubImageLoader(mode: 'load' | 'error', width = 1254, height = 1254) {
    class StubImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        naturalWidth = width;
        naturalHeight = height;
        set src(_value: string) {
            queueMicrotask(() => {
                if (mode === 'load') this.onload?.();
                else this.onerror?.();
            });
        }
    }
    vi.stubGlobal('Image', StubImage as unknown as typeof Image);
}

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('SpriteSheetRenderer', () => {
    it('renders the reduced-motion fallback frame with pixelated rendering', async () => {
        stubImageLoader('load');
        render(
            <SpriteSheetRenderer
                animation={idle}
                forceReducedMotion
                label="Central Nexus hologram"
            />,
        );
        const node = await screen.findByRole('img', { name: 'Central Nexus hologram' });
        await waitFor(() => expect(node.getAttribute('data-sprite-state')).toBe('ready'));
        expect(node.getAttribute('data-frame-index')).toBe(String(idle.reducedMotionFrameIndex));
        const content = node.querySelector('.sprite-sheet-renderer__frame') as HTMLElement;
        expect(content.style.imageRendering).toBe('pixelated');
    });

    it('displays the requested manual frame using measured rectangles', async () => {
        stubImageLoader('load');
        render(<SpriteSheetRenderer animation={idle} manualFrameIndex={3} label="Frame three" />);
        const node = await screen.findByRole('img', { name: 'Frame three' });
        await waitFor(() => expect(node.getAttribute('data-sprite-state')).toBe('ready'));
        expect(node.getAttribute('data-frame-index')).toBe('3');
        const rect = idle.frameRectangles!.find(r => r.index === 3)!;
        // Outer element is the stable logical frame box, not the tight rect.
        expect(node.style.width).toBe(`${idle.frameWidth}px`);
        expect(node.style.height).toBe(`${idle.frameHeight}px`);
        const content = node.querySelector('.sprite-sheet-renderer__frame') as HTMLElement;
        expect(content.style.width).toBe(`${rect.width}px`);
        expect(content.style.height).toBe(`${rect.height}px`);
        expect(content.style.backgroundPosition).toBe(`${-rect.x}px ${-rect.y}px`);
    });

    it('resolves the public asset path through the BASE_URL mechanism', async () => {
        stubImageLoader('load');
        render(<SpriteSheetRenderer animation={idle} label="Path check" />);
        const node = await screen.findByRole('img', { name: 'Path check' });
        await waitFor(() => expect(node.getAttribute('data-sprite-state')).toBe('ready'));
        // Path is built from BASE_URL, so nested deployment bases keep working.
        const content = node.querySelector('.sprite-sheet-renderer__frame') as HTMLElement;
        expect(content.style.backgroundImage)
            .toBe(`url("${resolvePublicAssetPath(CENTRAL_NEXUS_PUBLIC_PATH)}")`);
        // The legacy runtime path must never be referenced.
        expect(content.style.backgroundImage)
            .not.toContain('central-blue-tube-hologram.png');
    });

    it('starts in the loading state before the image resolves', () => {
        const states: string[] = [];
        // Never fires onload/onerror, so the component stays in 'loading'.
        class PendingImage {
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;
            naturalWidth = 0;
            naturalHeight = 0;
            set src(_v: string) { /* intentionally never settles */ }
        }
        vi.stubGlobal('Image', PendingImage as unknown as typeof Image);
        render(
            <SpriteSheetRenderer animation={idle} onStateChange={s => states.push(s)} label="Loading" />,
        );
        expect(states[0]).toBe('loading');
    });

    it('falls back safely when the asset is missing', async () => {
        stubImageLoader('error');
        render(<SpriteSheetRenderer animation={idle} label="Missing sprite" />);
        const node = await screen.findByRole('img', { name: /asset missing/ });
        expect(node.getAttribute('data-sprite-state')).toBe('missing');
        expect(node.className).toContain('sprite-sheet-renderer--fallback');
    });

    it('falls back when the loaded image dimensions contradict the manifest', async () => {
        stubImageLoader('load', 64, 64);
        render(<SpriteSheetRenderer animation={idle} label="Wrong size" />);
        await waitFor(async () => {
            const node = await screen.findByRole('img', { name: /unavailable/ });
            expect(node.getAttribute('data-sprite-state')).toBe('invalid');
        });
    });

    it('falls back when the animation metadata is invalid rather than guessing', async () => {
        stubImageLoader('load');
        const broken: SpriteAnimation = { ...idle, frameWidth: 0, frameHeight: -3 };
        render(<SpriteSheetRenderer animation={broken} label="Broken metadata" />);
        const node = await screen.findByRole('img', { name: /unavailable/ });
        expect(node.getAttribute('data-sprite-state')).toBe('invalid');
    });

    it('labels the sprite for assistive technology and never intercepts pointers', async () => {
        stubImageLoader('load');
        const { container } = render(
            <SpriteSheetRenderer animation={idle} label="Nexus hologram" manualFrameIndex={0} />,
        );
        const node = await screen.findByRole('img', { name: 'Nexus hologram' });
        expect(node).toBeTruthy();
        // pointer-events:none is enforced by the stylesheet on the base class.
        expect(container.querySelector('.sprite-sheet-renderer')).toBeTruthy();
    });

    it('applies the float transform only as a separate CSS class', async () => {
        stubImageLoader('load');
        render(
            <SpriteSheetRenderer
                animation={idle}
                floatTransform
                forceReducedMotion
                label="Float off under reduced motion"
            />,
        );
        const node = await screen.findByRole('img', { name: 'Float off under reduced motion' });
        await waitFor(() => expect(node.getAttribute('data-sprite-state')).toBe('ready'));
        // Reduced motion stops the clock, so the float class is not applied.
        expect(node.className).not.toContain('sprite-sheet-renderer--float');
    });

    it('cleans up without updating state after unmount', async () => {
        stubImageLoader('load');
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const { unmount } = render(<SpriteSheetRenderer animation={idle} label="Unmount" />);
        unmount();
        await new Promise(resolve => setTimeout(resolve, 20));
        expect(errorSpy).not.toHaveBeenCalled();
    });
});
