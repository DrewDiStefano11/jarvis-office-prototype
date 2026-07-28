// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { OfficeViewport } from './components/office/OfficeViewport';
import { constrainTransform, fitTransform, zoomAtScreenPoint } from './office/coordinates';
import {
    DEFAULT_VIEWPORT_OPTIONS,
    OFFICE_SOURCE_HEIGHT,
    OFFICE_SOURCE_WIDTH,
} from './office/constants';
import { LAYER_ORDER } from './office/layers';
import { NON_PRODUCTION_OVERLAY } from './office/sampleOverlay';
import { OfficeLayer, ViewTransform, ViewportSize } from './office/types';

vi.mock('./components/LegacyAgentSimulation', () => ({
    LegacyAgentSimulation: () => <div>Agent simulation view</div>,
}));

const ROOM_ID = 'sample.room.central';
const visibleLayers = new Set<OfficeLayer>(LAYER_ORDER);

class DeterministicResizeObserver implements ResizeObserver {
    private static readonly instances = new Set<DeterministicResizeObserver>();
    private readonly observed = new Set<Element>();

    constructor(private readonly callback: ResizeObserverCallback) {
        DeterministicResizeObserver.instances.add(this);
    }

    observe(target: Element): void {
        this.observed.add(target);
    }

    unobserve(target: Element): void {
        this.observed.delete(target);
    }

    disconnect(): void {
        this.observed.clear();
        DeterministicResizeObserver.instances.delete(this);
    }

    takeRecords(): ResizeObserverEntry[] {
        return [];
    }

    static emit(target: Element, width: number, height: number): void {
        for (const observer of DeterministicResizeObserver.instances) {
            if (!observer.observed.has(target)) continue;
            observer.callback(
                [{ target, contentRect: { width, height } } as ResizeObserverEntry],
                observer,
            );
        }
    }

    static activeCount(): number {
        return DeterministicResizeObserver.instances.size;
    }
}

function emitResize(target: Element, width: number, height: number): void {
    act(() => DeterministicResizeObserver.emit(target, width, height));
}

function switchTo(label: 'Office engine' | 'Agent simulation'): void {
    fireEvent.click(screen.getByRole('button', { name: label }));
}

function transformStyle(transform: ViewTransform): string {
    return `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`;
}

function fittedAndZoomed(viewport: ViewportSize): ViewTransform {
    const fitted = fitTransform(viewport);
    return constrainTransform(
        zoomAtScreenPoint(
            fitted,
            { x: viewport.width / 2, y: viewport.height / 2 },
            fitted.scale * DEFAULT_VIEWPORT_OPTIONS.zoomStep,
        ),
        viewport,
        OFFICE_SOURCE_WIDTH,
        OFFICE_SOURCE_HEIGHT,
        DEFAULT_VIEWPORT_OPTIONS.boundaryPadding,
    );
}

beforeEach(() => {
    vi.stubGlobal('ResizeObserver', DeterministicResizeObserver);
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
    expect(DeterministicResizeObserver.activeCount()).toBe(0);
    vi.unstubAllGlobals();
});

describe('inactive office lifecycle', () => {
    it('preserves a zoomed transform through a hidden zero-size measurement and constrains a real resize', () => {
        const initialViewport = { width: 1200, height: 800 };
        const resizedViewport = { width: 1600, height: 1000 };
        const { container } = render(<App />);
        const viewport = container.querySelector('.office-viewport') as HTMLDivElement;
        const surface = container.querySelector('.office-surface') as HTMLDivElement;

        emitResize(viewport, initialViewport.width, initialViewport.height);
        fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
        const preservedTransform = fittedAndZoomed(initialViewport);
        expect(surface.style.transform).toBe(transformStyle(preservedTransform));
        expect(DeterministicResizeObserver.activeCount()).toBe(1);

        switchTo('Agent simulation');
        emitResize(viewport, 0, 0);
        expect(surface.style.transform).toBe(transformStyle(preservedTransform));
        expect(DeterministicResizeObserver.activeCount()).toBe(1);

        switchTo('Office engine');
        emitResize(viewport, initialViewport.width, initialViewport.height);
        expect(surface.style.transform).toBe(transformStyle(preservedTransform));
        expect(DeterministicResizeObserver.activeCount()).toBe(1);

        emitResize(viewport, resizedViewport.width, resizedViewport.height);
        const constrainedTransform = constrainTransform(
            preservedTransform,
            resizedViewport,
            OFFICE_SOURCE_WIDTH,
            OFFICE_SOURCE_HEIGHT,
            DEFAULT_VIEWPORT_OPTIONS.boundaryPadding,
        );
        expect(surface.style.transform).toBe(transformStyle(constrainedTransform));
        expect(constrainedTransform).toEqual(preservedTransform);
    });

    it('uses the first valid positive-size measurement for the initial fit', () => {
        const onTransformChange = vi.fn<(transform: ViewTransform) => void>();
        const { container } = render(
            <OfficeViewport
                active
                document={NON_PRODUCTION_OVERLAY}
                debug={false}
                selectedId={null}
                hoveredId={null}
                visibleLayers={visibleLayers}
                onSelect={() => undefined}
                onHover={() => undefined}
                onPointerOfficePoint={() => undefined}
                onTransformChange={onTransformChange}
                focusRequest={0}
            />,
        );
        const viewport = container.querySelector('.office-viewport') as HTMLDivElement;
        const surface = container.querySelector('.office-surface') as HTMLDivElement;
        const initialStyle = surface.style.transform;

        emitResize(viewport, 0, 0);
        emitResize(viewport, -1, 800);
        emitResize(viewport, 1200, -1);
        emitResize(viewport, 1200, Number.NaN);
        emitResize(viewport, Number.POSITIVE_INFINITY, 800);
        emitResize(viewport, 1200, Number.POSITIVE_INFINITY);

        expect(surface.style.transform).toBe(initialStyle);
        expect(onTransformChange).not.toHaveBeenCalled();

        const validViewport = { width: 1200, height: 800 };
        const fitted = fitTransform(validViewport);
        emitResize(viewport, validViewport.width, validViewport.height);

        expect(onTransformChange).toHaveBeenCalledTimes(1);
        expect(onTransformChange).toHaveBeenCalledWith(fitted);
        expect(surface.style.transform).toBe(transformStyle(fitted));
    });

    it('focuses the hovered entity currently shown in the inspector', () => {
        const { container } = render(<App />);
        const viewport = container.querySelector('.office-viewport') as HTMLDivElement;
        const surface = container.querySelector('.office-surface') as HTMLDivElement;
        const room = container.querySelector(`[data-entity-id="${ROOM_ID}"]`) as SVGGElement;

        emitResize(viewport, 1200, 800);
        const fittedTransform = surface.style.transform;
        fireEvent.pointerEnter(room);
        expect(screen.getByText(ROOM_ID)).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Focus' }));
        expect(surface.style.transform).not.toBe(fittedTransform);

        fireEvent.pointerLeave(room);
        expect(screen.getByText(ROOM_ID)).toBeTruthy();
    });

    it('isolates office Escape handling while hidden and restores it when active', () => {
        const { container } = render(<App />);
        const room = container.querySelector(`[data-entity-id="${ROOM_ID}"]`) as SVGGElement;

        fireEvent.click(room);
        expect(screen.getByText(ROOM_ID)).toBeTruthy();

        switchTo('Agent simulation');
        fireEvent.keyDown(window, { key: 'Escape' });
        switchTo('Office engine');
        expect(screen.getByText(ROOM_ID)).toBeTruthy();

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(screen.queryByText(ROOM_ID)).toBeNull();
        expect(screen.getByText('Select an interaction region to inspect it.')).toBeTruthy();
    });
});
