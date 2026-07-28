import { useEffect, useMemo, useState } from 'react';
import { NON_PRODUCTION_OVERLAY } from '../../domain/seed';
import { LAYER_ORDER } from '../../office/layers';
import { reconcileSelection, toggleLayerVisibility } from '../../office/interaction';
import { loadVerifiedProductionOverlay } from '../../office/floor1/runtime';
import { OfficeLayer, Point, ViewTransform } from '../../office/types';
import { EntityInspector } from './EntityInspector';
import { OfficeViewport } from './OfficeViewport';
import './office-engine.css';

const DEFAULT_VISIBLE_LAYERS = new Set<OfficeLayer>(LAYER_ORDER);

type Props = Readonly<{
    active: boolean;
}>;

export function OfficeEngine({ active }: Props) {
    const [document, setDocument] = useState(NON_PRODUCTION_OVERLAY);
    const [dataSource, setDataSource] = useState<'sample' | 'approved-production'>('sample');
    const [productionError, setProductionError] = useState<string | null>(null);
    const [debug, setDebug] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [pointer, setPointer] = useState<Point | null>(null);
    const [transform, setTransform] = useState<ViewTransform>({ scale: 1, x: 0, y: 0 });
    const [visibleLayers, setVisibleLayers] = useState<ReadonlySet<OfficeLayer>>(DEFAULT_VISIBLE_LAYERS);
    const [focusRequest, setFocusRequest] = useState(0);
    const selected = useMemo(() => document.entities.find(entity => entity.id === selectedId) ?? null, [document.entities, selectedId]);
    const hovered = useMemo(() => document.entities.find(entity => entity.id === hoveredId) ?? null, [document.entities, hoveredId]);
    const inspected = selected ?? hovered;

    useEffect(() => {
        setSelectedId(previous => reconcileSelection(previous, document.entities));
    }, [document.entities, selectedId]);

    useEffect(() => {
        let cancelled = false;
        loadVerifiedProductionOverlay().then(production => {
            if (cancelled || !production) return;
            setDocument(production);
            setDataSource('approved-production');
        }).catch(error => {
            if (cancelled) return;
            setProductionError(error instanceof Error ? error.message : 'Approved Floor 1 data failed validation.');
        });
        return () => { cancelled = true; };
    }, []);

    const toggleLayer = (layer: OfficeLayer) => {
        setVisibleLayers(previous => {
            return toggleLayerVisibility(previous, layer);
        });
    };

    const focusInspected = () => {
        if (!inspected) return;
        setSelectedId(inspected.id);
        setFocusRequest(value => value + 1);
    };

    return (
        <main className={`office-engine ${sidebarOpen ? '' : 'office-engine--collapsed'}`}>
            <header className="engine-header">
                <div>
                    <p className="eyebrow">Jarvis office prototype</p>
                    <h1>Interactive office engine</h1>
                </div>
                <div className="header-actions">
                    <span className="sample-badge">{dataSource === 'approved-production' ? 'Approved production Floor 1' : 'Non-production coordinates'}</span>
                    <label className="debug-toggle">
                        <input type="checkbox" checked={debug} onChange={event => setDebug(event.target.checked)} />
                        Debug overlays
                    </label>
                    <button type="button" onClick={() => setSidebarOpen(value => !value)} aria-expanded={sidebarOpen}>
                        {sidebarOpen ? 'Hide inspector' : 'Show inspector'}
                    </button>
                </div>
            </header>
            <section className="engine-workspace">
                {productionError && <p className="asset-status asset-status--error" role="alert">{productionError} Existing sample data remains active.</p>}
                <OfficeViewport
                    active={active}
                    document={document}
                    debug={debug}
                    selectedId={selectedId}
                    hoveredId={hoveredId}
                    visibleLayers={visibleLayers}
                    onSelect={setSelectedId}
                    onHover={setHoveredId}
                    onPointerOfficePoint={setPointer}
                    onTransformChange={setTransform}
                    focusRequest={focusRequest}
                />
                <aside className="engine-sidebar" aria-hidden={!sidebarOpen}>
                    {debug && (
                        <section className="engine-panel">
                            <div className="panel-heading">
                                <h2>Layer visibility</h2>
                                <div className="layer-actions">
                                    <button type="button" onClick={() => setVisibleLayers(new Set(LAYER_ORDER))}>All</button>
                                    <button type="button" onClick={() => setVisibleLayers(new Set())}>None</button>
                                </div>
                            </div>
                            <div className="layer-grid">
                                {LAYER_ORDER.map(layer => (
                                    <label key={layer}>
                                        <input type="checkbox" checked={visibleLayers.has(layer)} onChange={() => toggleLayer(layer)} />
                                        {layer}
                                    </label>
                                ))}
                            </div>
                            <div className="debug-readout">
                                <span>Zoom <strong>{transform.scale.toFixed(4)}×</strong></span>
                                <span>Pointer <strong>{pointer ? `${pointer.x.toFixed(1)}, ${pointer.y.toFixed(1)}` : '—'}</strong></span>
                                <span>Hovered <strong>{hovered?.id ?? '—'}</strong></span>
                                <span>Selected <strong>{selected?.id ?? '—'}</strong></span>
                            </div>
                        </section>
                    )}
                    <EntityInspector entity={inspected} onFocus={focusInspected} />
                    <section className="engine-panel access-legend">
                        <h2>Access semantics</h2>
                        <p><i className="green" /> Green · general access</p>
                        <p><i className="blue" /> Blue · member or role restricted</p>
                        <p><i className="yellow" /> Yellow · temporarily reserved</p>
                        <p><i className="red" /> Red · blocked</p>
                        <small>For seats only: yellow means priority; red means standard.</small>
                    </section>
                </aside>
            </section>
        </main>
    );
}
