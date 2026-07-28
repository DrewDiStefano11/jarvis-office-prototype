import { PointerEvent as ReactPointerEvent, WheelEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { OFFICE_ASSETS } from '../../office/assets';
import { constrainTransform, fitTransform, screenToOffice, zoomAtScreenPoint } from '../../office/coordinates';
import { DEFAULT_VIEWPORT_OPTIONS, OFFICE_SOURCE_HEIGHT, OFFICE_SOURCE_WIDTH } from '../../office/constants';
import { focusEntityTransform, panTransform } from '../../office/interaction';
import { LAYER_ORDER } from '../../office/layers';
import { OfficeLayer, OfficeOverlayDocument, Point, ViewTransform, ViewportSize } from '../../office/types';
import { OverlayRenderer } from './OverlayRenderer';

type Props = Readonly<{
    document: OfficeOverlayDocument;
    debug: boolean;
    selectedId: string | null;
    hoveredId: string | null;
    visibleLayers: ReadonlySet<OfficeLayer>;
    onSelect: (id: string | null) => void;
    onHover: (id: string | null) => void;
    onPointerOfficePoint: (point: Point | null) => void;
    onTransformChange: (transform: ViewTransform) => void;
    focusRequest: number;
}>;

export function OfficeViewport({
    document,
    debug,
    selectedId,
    hoveredId,
    visibleLayers,
    onSelect,
    onHover,
    onPointerOfficePoint,
    onTransformChange,
    focusRequest,
}: Props) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const transformRef = useRef<ViewTransform>({ scale: 0.1, x: 0, y: 0 });
    const pointerRef = useRef<{ id: number; x: number; y: number } | null>(null);
    const touchesRef = useRef(new Map<number, Point>());
    const pinchRef = useRef<{ distance: number; transform: ViewTransform } | null>(null);
    const frameRef = useRef<number | null>(null);
    const pointerFrameRef = useRef<number | null>(null);
    const pendingTransformRef = useRef<ViewTransform | null>(null);
    const [transform, setTransform] = useState(transformRef.current);
    const [viewport, setViewport] = useState<ViewportSize>({ width: 1, height: 1 });
    const [backgroundState, setBackgroundState] = useState<'loading' | 'ready' | 'error'>('loading');
    const reducedMotion = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);

    const commitTransform = useCallback((next: ViewTransform) => {
        const constrained = constrainTransform(next, viewport, OFFICE_SOURCE_WIDTH, OFFICE_SOURCE_HEIGHT, DEFAULT_VIEWPORT_OPTIONS.boundaryPadding);
        transformRef.current = constrained;
        setTransform(constrained);
        onTransformChange(constrained);
    }, [onTransformChange, viewport]);

    const fit = useCallback(() => {
        if (viewport.width <= 1 || viewport.height <= 1) return;
        commitTransform(fitTransform(viewport));
    }, [commitTransform, viewport]);

    useLayoutEffect(() => {
        const element = viewportRef.current;
        if (!element) return;
        let firstMeasurement = true;
        const observer = new ResizeObserver(entries => {
            const rect = entries[0]?.contentRect;
            if (!rect) return;
            const nextViewport = { width: rect.width, height: rect.height };
            setViewport(nextViewport);
            if (firstMeasurement) {
                const next = fitTransform(nextViewport);
                transformRef.current = next;
                setTransform(next);
                onTransformChange(next);
                firstMeasurement = false;
            } else {
                const next = constrainTransform(transformRef.current, nextViewport, OFFICE_SOURCE_WIDTH, OFFICE_SOURCE_HEIGHT, DEFAULT_VIEWPORT_OPTIONS.boundaryPadding);
                transformRef.current = next;
                setTransform(next);
                onTransformChange(next);
            }
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, [onTransformChange]);

    useEffect(() => () => {
        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
        if (pointerFrameRef.current !== null) cancelAnimationFrame(pointerFrameRef.current);
    }, []);

    useEffect(() => {
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onSelect(null);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onSelect]);

    useEffect(() => {
        if (!focusRequest || !selectedId) return;
        const entity = document.entities.find(item => item.id === selectedId);
        if (!entity) return;
        commitTransform(focusEntityTransform(entity, transformRef.current, viewport, DEFAULT_VIEWPORT_OPTIONS.maximumZoom));
    }, [commitTransform, document.entities, focusRequest, selectedId, viewport]);

    const localPoint = (clientX: number, clientY: number): Point => {
        const rect = viewportRef.current?.getBoundingClientRect();
        return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) };
    };

    const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
        event.preventDefault();
        const point = localPoint(event.clientX, event.clientY);
        const multiplier = Math.exp(-event.deltaY * 0.0015);
        const nextScale = Math.min(DEFAULT_VIEWPORT_OPTIONS.maximumZoom, Math.max(DEFAULT_VIEWPORT_OPTIONS.minimumZoom, transformRef.current.scale * multiplier));
        commitTransform(zoomAtScreenPoint(transformRef.current, point, nextScale));
    };

    const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.button !== 0 && event.pointerType === 'mouse') return;
        event.currentTarget.setPointerCapture(event.pointerId);
        touchesRef.current.set(event.pointerId, localPoint(event.clientX, event.clientY));
        if (touchesRef.current.size === 1) {
            pointerRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        } else if (touchesRef.current.size === 2) {
            const [a, b] = [...touchesRef.current.values()];
            pinchRef.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), transform: transformRef.current };
        }
    };

    const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        const local = localPoint(event.clientX, event.clientY);
        if (pointerFrameRef.current !== null) cancelAnimationFrame(pointerFrameRef.current);
        pointerFrameRef.current = requestAnimationFrame(() => onPointerOfficePoint(screenToOffice(local, transformRef.current)));
        if (!touchesRef.current.has(event.pointerId)) return;
        touchesRef.current.set(event.pointerId, local);
        if (touchesRef.current.size === 2 && pinchRef.current) {
            const [a, b] = [...touchesRef.current.values()];
            const distance = Math.hypot(a.x - b.x, a.y - b.y);
            const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            const nextScale = Math.min(DEFAULT_VIEWPORT_OPTIONS.maximumZoom, Math.max(DEFAULT_VIEWPORT_OPTIONS.minimumZoom, pinchRef.current.transform.scale * distance / pinchRef.current.distance));
            commitTransform(zoomAtScreenPoint(pinchRef.current.transform, center, nextScale));
            return;
        }
        const drag = pointerRef.current;
        if (!drag || drag.id !== event.pointerId) return;
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;
        pointerRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        const base = pendingTransformRef.current ?? transformRef.current;
        pendingTransformRef.current = panTransform(base, dx, dy, viewport, OFFICE_SOURCE_WIDTH, OFFICE_SOURCE_HEIGHT, DEFAULT_VIEWPORT_OPTIONS.boundaryPadding);
        if (frameRef.current === null) {
            frameRef.current = requestAnimationFrame(() => {
                const next = pendingTransformRef.current;
                pendingTransformRef.current = null;
                frameRef.current = null;
                if (next) commitTransform(next);
            });
        }
    };

    const releasePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
        touchesRef.current.delete(event.pointerId);
        if (pointerRef.current?.id === event.pointerId) pointerRef.current = null;
        if (touchesRef.current.size < 2) pinchRef.current = null;
    };

    const zoomBy = (factor: number) => {
        const center = { x: viewport.width / 2, y: viewport.height / 2 };
        const nextScale = Math.min(DEFAULT_VIEWPORT_OPTIONS.maximumZoom, Math.max(DEFAULT_VIEWPORT_OPTIONS.minimumZoom, transform.scale * factor));
        commitTransform(zoomAtScreenPoint(transform, center, nextScale));
    };

    return (
        <div className="office-viewport-shell">
            <div className="viewport-controls" aria-label="Viewport controls">
                <button type="button" onClick={() => zoomBy(DEFAULT_VIEWPORT_OPTIONS.zoomStep)} aria-label="Zoom in">+</button>
                <button type="button" onClick={() => zoomBy(1 / DEFAULT_VIEWPORT_OPTIONS.zoomStep)} aria-label="Zoom out">−</button>
                <button type="button" onClick={fit}>Fit</button>
                <button type="button" onClick={fit}>Reset</button>
            </div>
            <div
                ref={viewportRef}
                className="office-viewport"
                onWheel={handleWheel}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={releasePointer}
                onPointerCancel={releasePointer}
                onPointerLeave={() => {
                    if (pointerFrameRef.current !== null) cancelAnimationFrame(pointerFrameRef.current);
                    pointerFrameRef.current = null;
                    onPointerOfficePoint(null);
                }}
                onDoubleClick={fit}
                onClick={event => {
                    if (event.target === event.currentTarget || (event.target as HTMLElement).classList.contains('office-surface')) onSelect(null);
                }}
            >
                <div
                    className="office-surface"
                    style={{ transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})` }}
                >
                    {backgroundState !== 'error' && (
                        <img
                            className="office-background"
                            src={OFFICE_ASSETS.background.path}
                            alt="Jarvis office"
                            draggable={false}
                            onLoad={event => {
                                const image = event.currentTarget;
                                setBackgroundState(image.naturalWidth === OFFICE_SOURCE_WIDTH && image.naturalHeight === OFFICE_SOURCE_HEIGHT ? 'ready' : 'error');
                            }}
                            onError={() => setBackgroundState('error')}
                        />
                    )}
                    {backgroundState !== 'ready' && <div className="office-background-fallback" aria-hidden="true" />}
                    <OverlayRenderer
                        entities={document.entities}
                        visibleLayers={visibleLayers}
                        debug={debug}
                        selectedId={selectedId}
                        hoveredId={hoveredId}
                        showLabels={transform.scale >= 0.15}
                        reducedMotion={reducedMotion}
                        onHover={onHover}
                        onSelect={id => onSelect(id)}
                    />
                </div>
                {backgroundState === 'loading' && <div className="asset-status" role="status">Loading 8K office image…</div>}
                {backgroundState === 'error' && (
                    <div className="asset-status asset-status--error" role="alert">
                        Required 8192×5460 background missing or dimensionally invalid: <code>{OFFICE_ASSETS.background.path}</code>
                    </div>
                )}
                {debug && <div className="debug-layer-order">Layers: {LAYER_ORDER.join(' → ')}</div>}
            </div>
        </div>
    );
}
