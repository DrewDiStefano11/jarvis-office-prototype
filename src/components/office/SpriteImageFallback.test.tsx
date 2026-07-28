// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SpriteSheetRenderer } from './SpriteSheetRenderer';
import {
    ANIM_CENTRAL_NEXUS_FLOAT,
    ANIM_CENTRAL_NEXUS_IDLE,
    CENTRAL_NEXUS_PUBLIC_PATH,
    getAnimation,
} from '../../office/sprites/manifest';
import { SpriteAnimation } from '../../office/sprites/manifestTypes';

const idle = getAnimation(ANIM_CENTRAL_NEXUS_IDLE) as SpriteAnimation;
const float = getAnimation(ANIM_CENTRAL_NEXUS_FLOAT) as SpriteAnimation;

type Outcome = 'load' | 'error' | { width: number; height: number };

/**
 * Image stub whose behaviour is decided per-load, letting a test fail the first
 * candidate and succeed on the fallback even though both use the same asset.
 */
function stubImages(plan: Outcome[] | ((attempt: number, src: string) => Outcome)) {
    const attempts: string[] = [];
    const resolve = typeof plan === 'function'
        ? plan
        : (attempt: number) => plan[Math.min(attempt, plan.length - 1)];

    class PlannedImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        naturalWidth = 0;
        naturalHeight = 0;
        set src(value: string) {
            const attempt = attempts.length;
            attempts.push(value);
            const outcome = resolve(attempt, value);
            queueMicrotask(() => {
                if (outcome === 'error') {
                    this.onerror?.();
                    return;
                }
                if (outcome === 'load') {
                    this.naturalWidth = 1254;
                    this.naturalHeight = 1254;
                } else {
                    this.naturalWidth = outcome.width;
                    this.naturalHeight = outcome.height;
                }
                this.onload?.();
            });
        }
    }
    vi.stubGlobal('Image', PlannedImage as unknown as typeof Image);
    return attempts;
}

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('fallback after image-load failure', () => {
    it('falls back when the primary image is missing', async () => {
        // First load (float) errors; second (idle fallback) succeeds.
        stubImages((attempt) => (attempt === 0 ? 'error' : 'load'));
        render(<SpriteSheetRenderer animation={float} label="missing-primary" />);
        const node = await screen.findByRole('img', { name: 'missing-primary' });
        await waitFor(() => expect(node.getAttribute('data-sprite-state')).toBe('ready'));
        expect(node.getAttribute('data-animation-id')).toBe(ANIM_CENTRAL_NEXUS_IDLE);
        expect(node.getAttribute('data-fallback-active')).toBe('true');
        expect(node.getAttribute('data-failure-reason')).toBe('missing');
    });

    it('falls back when the primary image has invalid dimensions', async () => {
        stubImages((attempt) => (attempt === 0 ? { width: 64, height: 64 } : 'load'));
        render(<SpriteSheetRenderer animation={float} label="bad-dimensions" />);
        const node = await screen.findByRole('img', { name: 'bad-dimensions' });
        await waitFor(() => expect(node.getAttribute('data-sprite-state')).toBe('ready'));
        expect(node.getAttribute('data-animation-id')).toBe(ANIM_CENTRAL_NEXUS_IDLE);
        expect(node.getAttribute('data-fallback-active')).toBe('true');
        expect(node.getAttribute('data-failure-reason')).toBe('invalid-dimensions');
    });

    it('renders the fallback using its own asset and metadata', async () => {
        stubImages((attempt) => (attempt === 0 ? 'error' : 'load'));
        render(
            <SpriteSheetRenderer animation={float} manualFrameIndex={3} label="own-metadata" />,
        );
        const node = await screen.findByRole('img', { name: 'own-metadata' });
        await waitFor(() => expect(node.getAttribute('data-sprite-state')).toBe('ready'));

        const content = node.querySelector('.sprite-sheet-renderer__frame') as HTMLElement;
        const rect = idle.frameRectangles!.find(r => r.index === 3)!;
        // Geometry comes from the fallback animation's own rectangles.
        expect(content.style.width).toBe(`${rect.width}px`);
        expect(content.style.backgroundPosition).toBe(`${-rect.x}px ${-rect.y}px`);
        expect(content.style.backgroundImage).toContain(CENTRAL_NEXUS_PUBLIC_PATH);
    });

    it('does not activate a fallback when the primary loads successfully', async () => {
        stubImages(['load']);
        render(<SpriteSheetRenderer animation={float} label="primary-ok" />);
        const node = await screen.findByRole('img', { name: 'primary-ok' });
        await waitFor(() => expect(node.getAttribute('data-sprite-state')).toBe('ready'));
        expect(node.getAttribute('data-animation-id')).toBe(ANIM_CENTRAL_NEXUS_FLOAT);
        expect(node.getAttribute('data-fallback-active')).toBeNull();
        expect(node.getAttribute('data-failure-reason')).toBeNull();
    });

    it('walks a multi-step chain to a second-level fallback', async () => {
        // A -> B -> idle; A and B both fail their image load.
        const a: SpriteAnimation = { ...float, id: 'ANIM_A', fallbackAnimationId: ANIM_CENTRAL_NEXUS_FLOAT };
        stubImages((attempt) => (attempt < 2 ? 'error' : 'load'));
        render(<SpriteSheetRenderer animation={a} label="chain" />);
        const node = await screen.findByRole('img', { name: 'chain' });
        await waitFor(() => expect(node.getAttribute('data-sprite-state')).toBe('ready'));
        expect(node.getAttribute('data-animation-id')).toBe(ANIM_CENTRAL_NEXUS_IDLE);
        expect(node.getAttribute('data-fallback-active')).toBe('true');
    });

    it('terminates safely when the declared chain is cyclic', async () => {
        // idle -> float -> idle, with every image failing.
        const cyclicIdle: SpriteAnimation = { ...idle, fallbackAnimationId: ANIM_CENTRAL_NEXUS_FLOAT };
        stubImages(['error']);
        render(<SpriteSheetRenderer animation={cyclicIdle} label="cyclic" />);
        // Must settle on the placeholder rather than looping forever.
        await waitFor(async () => {
            const node = await screen.findByRole('img', { name: /cyclic/ });
            expect(['missing', 'invalid']).toContain(node.getAttribute('data-sprite-state'));
        });
    });

    it('shows the placeholder when the primary and every fallback fail', async () => {
        stubImages(['error']);
        render(<SpriteSheetRenderer animation={float} label="all-fail" />);
        const node = await screen.findByRole('img', { name: /all-fail/ });
        await waitFor(() => {
            expect(node.getAttribute('data-sprite-state')).toBe('missing');
        });
        expect(node.className).toContain('sprite-sheet-renderer--fallback');
    });

    it('ignores a stale primary callback after a fallback is selected', async () => {
        // The first image resolves late, after the fallback has already loaded.
        const pending: Array<() => void> = [];
        class LateImage {
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;
            naturalWidth = 1254;
            naturalHeight = 1254;
            private attempt = 0;
            set src(_v: string) {
                this.attempt = LateImage.count++;
                if (this.attempt === 0) {
                    // Primary: fail now, then try to "succeed" later.
                    queueMicrotask(() => this.onerror?.());
                    pending.push(() => this.onload?.());
                } else {
                    queueMicrotask(() => this.onload?.());
                }
            }
            static count = 0;
        }
        vi.stubGlobal('Image', LateImage as unknown as typeof Image);

        render(<SpriteSheetRenderer animation={float} label="stale" />);
        const node = await screen.findByRole('img', { name: 'stale' });
        await waitFor(() => expect(node.getAttribute('data-sprite-state')).toBe('ready'));
        expect(node.getAttribute('data-animation-id')).toBe(ANIM_CENTRAL_NEXUS_IDLE);

        // Fire the superseded primary callback; it must not take over.
        pending.forEach(fire => fire());
        await new Promise(resolve => setTimeout(resolve, 20));
        expect(node.getAttribute('data-animation-id')).toBe(ANIM_CENTRAL_NEXUS_IDLE);
        expect(node.getAttribute('data-sprite-state')).toBe('ready');
    });

    it('resets image-failure state when the requested animation changes', async () => {
        // Only the very first load fails, so the initial render lands on the
        // idle fallback; later loads succeed.
        stubImages((attempt) => (attempt === 0 ? 'error' : 'load'));
        const { rerender } = render(<SpriteSheetRenderer animation={float} label="reset" />);
        const node = await screen.findByRole('img', { name: 'reset' });
        await waitFor(() => expect(node.getAttribute('data-fallback-active')).toBe('true'));

        // New request must start clean, not inherit the recorded failure.
        rerender(<SpriteSheetRenderer animation={idle} label="reset" />);
        const reset = await screen.findByRole('img', { name: 'reset' });
        await waitFor(() => expect(reset.getAttribute('data-sprite-state')).toBe('ready'));
        expect(reset.getAttribute('data-animation-id')).toBe(ANIM_CENTRAL_NEXUS_IDLE);
        expect(reset.getAttribute('data-fallback-active')).toBeNull();
    });

    it('respects reduced motion after an image fallback', async () => {
        stubImages((attempt) => (attempt === 0 ? 'error' : 'load'));
        render(
            <SpriteSheetRenderer animation={float} forceReducedMotion label="reduced-fallback" />,
        );
        const node = await screen.findByRole('img', { name: 'reduced-fallback' });
        await waitFor(() => expect(node.getAttribute('data-sprite-state')).toBe('ready'));
        expect(node.getAttribute('data-animation-id')).toBe(ANIM_CENTRAL_NEXUS_IDLE);
        expect(node.getAttribute('data-frame-index'))
            .toBe(String(idle.reducedMotionFrameIndex));
    });

    it('keeps the anchor and logical frame box stable after an image fallback', async () => {
        stubImages((attempt) => (attempt === 0 ? 'error' : 'load'));
        render(<SpriteSheetRenderer animation={float} label="anchor-after-fallback" />);
        const node = await screen.findByRole('img', { name: 'anchor-after-fallback' });
        await waitFor(() => expect(node.getAttribute('data-sprite-state')).toBe('ready'));
        expect(node.style.width).toBe(`${idle.frameWidth}px`);
        expect(node.style.height).toBe(`${idle.frameHeight}px`);
        expect(node.style.transform)
            .toBe(`translate(${-0.5 * idle.frameWidth}px, ${-1 * idle.frameHeight}px)`);
    });
});
