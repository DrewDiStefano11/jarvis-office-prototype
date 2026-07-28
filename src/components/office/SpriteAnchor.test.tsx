// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SpriteSheetRenderer } from './SpriteSheetRenderer';
import {
    ANIM_CENTRAL_NEXUS_FLOAT,
    ANIM_CENTRAL_NEXUS_IDLE,
    getAnimation,
} from '../../office/sprites/manifest';
import { SpriteAnimation } from '../../office/sprites/manifestTypes';

const idle = getAnimation(ANIM_CENTRAL_NEXUS_IDLE) as SpriteAnimation;
const float = getAnimation(ANIM_CENTRAL_NEXUS_FLOAT) as SpriteAnimation;

class StubImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    naturalWidth = 1254;
    naturalHeight = 1254;
    set src(_v: string) { queueMicrotask(() => this.onload?.()); }
}

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

async function renderFrame(
    frame: number,
    overrides: Partial<SpriteAnimation> = {},
    props: Record<string, unknown> = {},
) {
    vi.stubGlobal('Image', StubImage as unknown as typeof Image);
    const label = `frame-${frame}-${Math.random()}`;
    render(
        <SpriteSheetRenderer
            animation={{ ...idle, ...overrides }}
            manualFrameIndex={frame}
            label={label}
            {...props}
        />,
    );
    const node = await screen.findByRole('img', { name: label });
    await waitFor(() => expect(node.getAttribute('data-sprite-state')).toBe('ready'));
    return {
        outer: node,
        content: node.querySelector('.sprite-sheet-renderer__frame') as HTMLElement,
        floatLayer: node.querySelector('.sprite-sheet-renderer__float') as HTMLElement,
    };
}

describe('stable logical frame box and anchoring', () => {
    it('gives frame 0 and frame 9 identical outer dimensions', async () => {
        // The two frames have different measured ink widths (88 vs 88) and the
        // sequence spans widths 86..103 overall, so this is the real guard
        // against per-frame layout movement.
        const a = await renderFrame(0);
        const outerA = { w: a.outer.style.width, h: a.outer.style.height };
        cleanup();
        const b = await renderFrame(9);
        expect(b.outer.style.width).toBe(outerA.w);
        expect(b.outer.style.height).toBe(outerA.h);
        expect(outerA.w).toBe(`${idle.frameWidth}px`);
        expect(outerA.h).toBe(`${idle.frameHeight}px`);
    });

    it('keeps every played frame at the same outer size', async () => {
        const sizes = new Set<string>();
        for (const frame of idle.frameOrder) {
            const { outer } = await renderFrame(frame);
            sizes.add(`${outer.style.width}x${outer.style.height}`);
            cleanup();
        }
        expect(sizes.size).toBe(1);
    });

    it('bottom-centres narrower frames inside the logical box', async () => {
        const rects = idle.frameRectangles!;
        const narrow = rects.reduce((min, r) => (r.width < min.width ? r : min), rects[0]);
        const { content } = await renderFrame(narrow.index);
        const expectedLeft = Math.round((idle.frameWidth - narrow.width) / 2);
        expect(content.style.left).toBe(`${expectedLeft}px`);
        // Bottom-aligned: content floor meets the box floor.
        expect(content.style.top).toBe(`${idle.frameHeight - narrow.height}px`);
    });

    it('does not move the attachment point when frame heights differ', async () => {
        const a = await renderFrame(0);
        const transformA = a.outer.style.transform;
        cleanup();
        // Frame 80 sits in the truncated final row (97px vs 123px).
        const b = await renderFrame(80);
        expect(b.outer.style.transform).toBe(transformA);
    });

    it('applies the bottom-centre anchor as a translation', async () => {
        const { outer } = await renderFrame(0);
        const w = idle.frameWidth;
        const h = idle.frameHeight;
        expect(outer.style.transform).toBe(`translate(${-0.5 * w}px, ${-1 * h}px)`);
    });

    it('honours different anchor X and Y values', async () => {
        const { outer } = await renderFrame(0, { anchor: { x: 0, y: 0 } });
        expect(outer.style.transform).toBe('translate(0px, 0px)');
        cleanup();
        const centred = await renderFrame(0, { anchor: { x: 0.5, y: 0.5 } });
        expect(centred.outer.style.transform)
            .toBe(`translate(${-0.5 * idle.frameWidth}px, ${-0.5 * idle.frameHeight}px)`);
    });

    it('scales the anchor translation with display scale', async () => {
        const { outer } = await renderFrame(0, {}, { displayScale: 2 });
        expect(outer.style.width).toBe(`${idle.frameWidth * 2}px`);
        expect(outer.style.transform)
            .toBe(`translate(${-0.5 * idle.frameWidth * 2}px, ${-1 * idle.frameHeight * 2}px)`);
    });

    it('keeps float on a separate layer so it cannot overwrite the anchor', async () => {
        vi.stubGlobal('Image', StubImage as unknown as typeof Image);
        render(<SpriteSheetRenderer animation={float} floatTransform label="floating" />);
        const node = await screen.findByRole('img', { name: 'floating' });
        await waitFor(() => expect(node.getAttribute('data-sprite-state')).toBe('ready'));
        // Anchor transform still lives on the outer element.
        expect(node.style.transform).toContain('translate(');
        // Float is applied to a nested element, never replacing it.
        const floatLayer = node.querySelector('.sprite-sheet-renderer__float');
        expect(floatLayer).toBeTruthy();
        expect(floatLayer!.className).toContain('sprite-sheet-renderer--float');
    });

    it('float does not change frame selection or anchor alignment', async () => {
        const plain = await renderFrame(4, {}, { floatTransform: false });
        const anchor = plain.outer.style.transform;
        const left = plain.content.style.left;
        const frame = plain.outer.getAttribute('data-frame-index');
        cleanup();
        const floating = await renderFrame(4, {}, { floatTransform: true });
        expect(floating.outer.getAttribute('data-frame-index')).toBe(frame);
        expect(floating.outer.style.transform).toBe(anchor);
        expect(floating.content.style.left).toBe(left);
    });

    it('reduced motion disables float while preserving anchor placement', async () => {
        vi.stubGlobal('Image', StubImage as unknown as typeof Image);
        render(
            <SpriteSheetRenderer
                animation={float}
                floatTransform
                forceReducedMotion
                label="reduced"
            />,
        );
        const node = await screen.findByRole('img', { name: 'reduced' });
        await waitFor(() => expect(node.getAttribute('data-sprite-state')).toBe('ready'));
        const floatLayer = node.querySelector('.sprite-sheet-renderer__float')!;
        expect(floatLayer.className).not.toContain('sprite-sheet-renderer--float');
        // Anchor is unaffected by the reduced-motion path.
        expect(node.style.transform)
            .toBe(`translate(${-0.5 * float.frameWidth}px, ${-1 * float.frameHeight}px)`);
        expect(node.getAttribute('data-frame-index')).toBe(String(float.reducedMotionFrameIndex));
    });
});

describe('fallback dependency rendering', () => {
    it('renders the idle animation ready', async () => {
        vi.stubGlobal('Image', StubImage as unknown as typeof Image);
        render(<SpriteSheetRenderer animation={idle} label="idle-render" />);
        const node = await screen.findByRole('img', { name: 'idle-render' });
        await waitFor(() => expect(node.getAttribute('data-sprite-state')).toBe('ready'));
    });

    it('renders the float animation ready despite its fallback reference', async () => {
        // Previously produced FALLBACK_ANIMATION_MISSING and rendered unavailable.
        vi.stubGlobal('Image', StubImage as unknown as typeof Image);
        render(<SpriteSheetRenderer animation={float} label="float-render" />);
        const node = await screen.findByRole('img', { name: 'float-render' });
        await waitFor(() => expect(node.getAttribute('data-sprite-state')).toBe('ready'));
    });

    it('still fails closed for a genuinely missing fallback', async () => {
        vi.stubGlobal('Image', StubImage as unknown as typeof Image);
        render(
            <SpriteSheetRenderer
                animation={{ ...idle, fallbackAnimationId: 'ANIM_DOES_NOT_EXIST' }}
                label="broken-fallback"
            />,
        );
        const node = await screen.findByRole('img', { name: /unavailable/ });
        expect(node.getAttribute('data-sprite-state')).toBe('invalid');
    });
});
