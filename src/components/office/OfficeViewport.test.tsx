// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LAYER_ORDER } from '../../office/layers';
import { NON_PRODUCTION_OVERLAY } from '../../office/sampleOverlay';
import { OfficeLayer, ViewTransform } from '../../office/types';
import { OfficeViewport } from './OfficeViewport';

const ROOM_ID = 'sample.room.central';
const visibleLayers = new Set<OfficeLayer>(LAYER_ORDER);
const originalCaptureDescriptors = {
    set: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'setPointerCapture'),
    release: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'releasePointerCapture'),
    has: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'hasPointerCapture'),
};

let capturedPointers: Set<number>;
let animationFrames: Map<number, FrameRequestCallback>;
let nextAnimationFrame: number;
let setPointerCapture: ReturnType<typeof vi.fn>;
let releasePointerCapture: ReturnType<typeof vi.fn>;

function restorePrototypeProperty(
    name: 'setPointerCapture' | 'releasePointerCapture' | 'hasPointerCapture',
    descriptor: PropertyDescriptor | undefined,
): void {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, name, descriptor);
    else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[name];
}

function flushAnimationFrames(): void {
    const pending = [...animationFrames.entries()];
    animationFrames.clear();
    act(() => pending.forEach(([, callback]) => callback(0)));
}

function pointer(
    pointerId: number,
    pointerType: 'mouse' | 'touch',
    clientX: number,
    clientY: number,
): PointerEventInit {
    return { pointerId, pointerType, button: 0, clientX, clientY, bubbles: true };
}

function renderViewport() {
    const onSelect = vi.fn<(id: string | null) => void>();
    const onTransformChange = vi.fn<(transform: ViewTransform) => void>();
    const result = render(
        <OfficeViewport
            active
            document={NON_PRODUCTION_OVERLAY}
            debug={false}
            selectedId={null}
            hoveredId={null}
            visibleLayers={visibleLayers}
            onSelect={onSelect}
            onHover={() => undefined}
            onPointerOfficePoint={() => undefined}
            onTransformChange={onTransformChange}
            focusRequest={0}
        />,
    );
    const viewport = result.container.querySelector('.office-viewport') as HTMLDivElement;
    const room = result.container.querySelector(`[data-entity-id="${ROOM_ID}"]`) as SVGGElement;
    Object.defineProperty(viewport, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({
            x: 0, y: 0, left: 0, top: 0, right: 1200, bottom: 800,
            width: 1200, height: 800, toJSON: () => undefined,
        }),
    });
    return { ...result, onSelect, onTransformChange, room, viewport };
}

beforeEach(() => {
    capturedPointers = new Set();
    animationFrames = new Map();
    nextAnimationFrame = 1;
    setPointerCapture = vi.fn((pointerId: number) => capturedPointers.add(pointerId));
    releasePointerCapture = vi.fn((pointerId: number) => capturedPointers.delete(pointerId));
    Object.defineProperties(HTMLElement.prototype, {
        setPointerCapture: { configurable: true, value: setPointerCapture },
        releasePointerCapture: { configurable: true, value: releasePointerCapture },
        hasPointerCapture: {
            configurable: true,
            value: (pointerId: number) => capturedPointers.has(pointerId),
        },
    });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
        const id = nextAnimationFrame;
        nextAnimationFrame += 1;
        animationFrames.set(id, callback);
        return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => animationFrames.delete(id));
    vi.stubGlobal('ResizeObserver', class {
        constructor(private readonly callback: ResizeObserverCallback) {}
        observe(): void {
            this.callback(
                [{ contentRect: { width: 1200, height: 800 } } as ResizeObserverEntry],
                this as unknown as ResizeObserver,
            );
        }
        disconnect(): void {}
        unobserve(): void {}
    });
    Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: vi.fn(() => ({
            matches: false,
            media: '',
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    restorePrototypeProperty('setPointerCapture', originalCaptureDescriptors.set);
    restorePrototypeProperty('releasePointerCapture', originalCaptureDescriptors.release);
    restorePrototypeProperty('hasPointerCapture', originalCaptureDescriptors.has);
});

describe('OfficeViewport pointer interactions', () => {
    it('selects an interactive room with a normal mouse click', () => {
        const { onSelect, room } = renderViewport();
        fireEvent.pointerDown(room, pointer(1, 'mouse', 100, 100));
        fireEvent.pointerUp(room, pointer(1, 'mouse', 100, 100));
        fireEvent.click(room);
        expect(onSelect).toHaveBeenCalledWith(ROOM_ID);
    });

    it('selects an interactive room with a normal touch tap', () => {
        const { onSelect, room } = renderViewport();
        fireEvent.pointerDown(room, pointer(2, 'touch', 100, 100));
        fireEvent.pointerUp(room, pointer(2, 'touch', 100, 100));
        fireEvent.click(room);
        expect(onSelect).toHaveBeenCalledWith(ROOM_ID);
    });

    it('does not capture or retarget a stationary pointer sequence', () => {
        const { onSelect, room } = renderViewport();
        fireEvent.pointerDown(room, pointer(3, 'mouse', 100, 100));
        fireEvent.pointerUp(room, pointer(3, 'mouse', 100, 100));
        expect(setPointerCapture).not.toHaveBeenCalled();
        fireEvent.click(room);
        expect(onSelect).toHaveBeenLastCalledWith(ROOM_ID);
    });

    it('clears selection when the empty office background is clicked', () => {
        const { onSelect, viewport } = renderViewport();
        fireEvent.pointerDown(viewport, pointer(4, 'mouse', 500, 400));
        fireEvent.pointerUp(viewport, pointer(4, 'mouse', 500, 400));
        fireEvent.click(viewport);
        expect(onSelect).toHaveBeenLastCalledWith(null);
    });

    it('pans from an entity and suppresses its post-drag selection', () => {
        const { onSelect, onTransformChange, room, viewport } = renderViewport();
        const initialTransformCalls = onTransformChange.mock.calls.length;
        fireEvent.pointerDown(room, pointer(5, 'mouse', 100, 100));
        fireEvent.pointerMove(room, pointer(5, 'mouse', 120, 115));
        expect(setPointerCapture).toHaveBeenCalledWith(5);
        flushAnimationFrames();
        fireEvent.pointerUp(viewport, pointer(5, 'mouse', 120, 115));
        fireEvent.click(viewport);
        expect(onTransformChange.mock.calls.length).toBeGreaterThan(initialTransformCalls);
        expect(onSelect).not.toHaveBeenCalledWith(ROOM_ID);
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('pans normally when a drag begins on the background', () => {
        const { onSelect, onTransformChange, viewport } = renderViewport();
        const initialTransformCalls = onTransformChange.mock.calls.length;
        fireEvent.pointerDown(viewport, pointer(6, 'mouse', 400, 300));
        fireEvent.pointerMove(viewport, pointer(6, 'mouse', 430, 325));
        flushAnimationFrames();
        fireEvent.pointerUp(viewport, pointer(6, 'mouse', 430, 325));
        fireEvent.click(viewport);
        expect(setPointerCapture).toHaveBeenCalledWith(6);
        expect(onTransformChange.mock.calls.length).toBeGreaterThan(initialTransformCalls);
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('starts pointer capture only after crossing the pan threshold', () => {
        const { room } = renderViewport();
        fireEvent.pointerDown(room, pointer(7, 'mouse', 100, 100));
        fireEvent.pointerMove(room, pointer(7, 'mouse', 103, 102));
        expect(setPointerCapture).not.toHaveBeenCalled();
        fireEvent.pointerMove(room, pointer(7, 'mouse', 108, 100));
        expect(setPointerCapture).toHaveBeenCalledTimes(1);
        expect(setPointerCapture).toHaveBeenCalledWith(7);
    });

    it('captures both pinch pointers and resumes captured one-finger panning', () => {
        const { onTransformChange, viewport } = renderViewport();
        fireEvent.pointerDown(viewport, pointer(8, 'touch', 100, 100));
        expect(setPointerCapture).not.toHaveBeenCalled();
        fireEvent.pointerDown(viewport, pointer(9, 'touch', 200, 100));
        expect(setPointerCapture).toHaveBeenCalledWith(8);
        expect(setPointerCapture).toHaveBeenCalledWith(9);
        fireEvent.pointerMove(viewport, pointer(9, 'touch', 230, 120));
        const afterPinch = onTransformChange.mock.calls.length;
        fireEvent.pointerUp(viewport, pointer(9, 'touch', 230, 120));
        fireEvent.pointerMove(viewport, pointer(8, 'touch', 112, 110));
        flushAnimationFrames();
        expect(onTransformChange.mock.calls.length).toBeGreaterThan(afterPinch);
        expect(capturedPointers.has(8)).toBe(true);
        expect(capturedPointers.has(9)).toBe(false);
    });

    it('does not select after pointer cancellation or lost capture', () => {
        const cancelled = renderViewport();
        fireEvent.pointerDown(cancelled.room, pointer(10, 'mouse', 100, 100));
        fireEvent.pointerMove(cancelled.room, pointer(10, 'mouse', 120, 100));
        fireEvent.pointerCancel(cancelled.viewport, pointer(10, 'mouse', 120, 100));
        fireEvent.click(cancelled.viewport);
        expect(cancelled.onSelect).not.toHaveBeenCalled();
        cleanup();

        const lost = renderViewport();
        fireEvent.pointerDown(lost.room, pointer(11, 'mouse', 100, 100));
        fireEvent.pointerMove(lost.room, pointer(11, 'mouse', 120, 100));
        capturedPointers.delete(11);
        fireEvent.lostPointerCapture(lost.viewport, pointer(11, 'mouse', 120, 100));
        fireEvent.click(lost.viewport);
        expect(lost.onSelect).not.toHaveBeenCalled();
    });

    it('preserves keyboard selection with Enter and Space', () => {
        const { onSelect, room } = renderViewport();
        fireEvent.keyDown(room, { key: 'Enter' });
        fireEvent.keyDown(room, { key: ' ' });
        expect(onSelect.mock.calls).toEqual([[ROOM_ID], [ROOM_ID]]);
    });
});
