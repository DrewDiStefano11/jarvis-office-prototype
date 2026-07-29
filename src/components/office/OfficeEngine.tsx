import { useEffect, useMemo, useState } from 'react';
import { NON_PRODUCTION_OVERLAY } from '../../domain/seed';
import { SPRITE_DEMO_AGENTS } from '../../domain/seed';
import { isAgentSpriteDemoRequested } from '../../office/sprites/routes';
import {
    candidateEntityCounts,
    FLOOR1_CANDIDATE_LABEL,
    FLOOR1_CANDIDATE_LAYER_CONTROLS,
    FLOOR1_CANDIDATE_LAYERS,
    loadFloor1CandidateOverlay,
} from '../../office/floor1/candidateReview';
import {
    isFloor1CandidateReviewRequested,
    loadVerifiedProductionOverlay,
} from '../../office/floor1/runtime';
import { reconcileSelection, toggleLayerVisibility } from '../../office/interaction';
import { LAYER_ORDER } from '../../office/layers';
import { OfficeLayer, OfficeOverlayDocument, Point, ViewTransform } from '../../office/types';
import { EntityInspector } from './EntityInspector';
import { OfficeViewport } from './OfficeViewport';
import './office-engine.css';

const EMPTY_REVIEW_DOCUMENT: OfficeOverlayDocument = {
    schemaVersion: 1,
    source: { width: 8192, height: 5460 },
    production: false,
    entities: [],
    pathNodes: [],
};

type Props = Readonly<{
    active: boolean;
    candidateLoader?: () => Promise<OfficeOverlayDocument>;
}>;

export function OfficeEngine({ active, candidateLoader }: Props) {
    const candidateReviewRequested = isFloor1CandidateReviewRequested(window.location.search);
    const spriteDemoRequested = isAgentSpriteDemoRequested(window.location.search) && !candidateReviewRequested;
    const [document, setDocument] = useState<OfficeOverlayDocument>(
        candidateReviewRequested ? EMPTY_REVIEW_DOCUMENT : NON_PRODUCTION_OVERLAY,
    );
    const [dataSource, setDataSource] = useState<'sample' | 'candidate-review' | 'approved-production'>(
        candidateReviewRequested ? 'candidate-review' : 'sample',
    );
    const [loadError, setLoadError] = useState<string | null>(null);
    const [debug, setDebug] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [showScopeOverlays, setShowScopeOverlays] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [pointer, setPointer] = useState<Point | null>(null);
    const [transform, setTransform] = useState<ViewTransform>({ scale: 1, x: 0, y: 0 });
    const [visibleLayers, setVisibleLayers] = useState<ReadonlySet<OfficeLayer>>(
        () => new Set(candidateReviewRequested ? FLOOR1_CANDIDATE_LAYERS : LAYER_ORDER),
    );
    const [focusRequest, setFocusRequest] = useState(0);
    const [selectedDemoAgentId, setSelectedDemoAgentId] = useState<string | null>(null);
    const selected = useMemo(
        () => document.entities.find(entity => entity.id === selectedId) ?? null,
        [document.entities, selectedId],
    );
    const hovered = useMemo(
        () => document.entities.find(entity => entity.id === hoveredId) ?? null,
        [document.entities, hoveredId],
    );
    const inspected = selected ?? hovered;
    const counts = useMemo(() => candidateEntityCounts(document), [document]);
    const renderedVisibleLayers = candidateReviewRequested && !showScopeOverlays
        ? new Set<OfficeLayer>()
        : visibleLayers;

    useEffect(() => {
        setSelectedId(previous => reconcileSelection(previous, document.entities));
        setHoveredId(previous => reconcileSelection(previous, document.entities));
    }, [document.entities]);

    useEffect(() => {
        let cancelled = false;
        setLoadError(null);

        if (candidateReviewRequested) {
            const loadCandidate = candidateLoader ?? loadFloor1CandidateOverlay;
            loadCandidate().then(candidate => {
                if (cancelled) return;
                setDocument(candidate);
                setDataSource('candidate-review');
                setVisibleLayers(new Set(FLOOR1_CANDIDATE_LAYERS));
            }).catch(error => {
                if (cancelled) return;
                setLoadError(error instanceof Error ? error.message : 'Floor 1 candidate data failed validation.');
            });
            return () => { cancelled = true; };
        }

        loadVerifiedProductionOverlay().then(production => {
            if (cancelled || !production) return;
            setDocument(production);
            setDataSource('approved-production');
        }).catch(error => {
            if (cancelled) return;
            setLoadError(error instanceof Error ? error.message : 'Approved Floor 1 data failed validation.');
        });
        return () => { cancelled = true; };
    }, [candidateLoader, candidateReviewRequested]);

    const toggleLayer = (layer: OfficeLayer) => {
        setVisibleLayers(previous => toggleLayerVisibility(previous, layer));
    };

    const toggleScopeOverlays = (visible: boolean) => {
        setShowScopeOverlays(visible);
        if (!visible) {
            setSelectedId(null);
            setHoveredId(null);
        }
    };

    const focusInspected = () => {
        if (!inspected) return;
        setSelectedId(inspected.id);
        setFocusRequest(value => value + 1);
    };

    const statusLabel = dataSource === 'approved-production'
        ? 'Approved production Floor 1'
        : candidateReviewRequested
            ? FLOOR1_CANDIDATE_LABEL
            : 'Sample fallback — not production Floor 1';

    return (
        <main className={`office-engine ${sidebarOpen ? '' : 'office-engine--collapsed'}`}>
            <header className="engine-header">
                <div>
                    <p className="eyebrow">Jarvis office prototype</p>
                    <h1>Interactive office engine</h1>
                </div>
                <div className="header-actions">
                    <span
                        className={`sample-badge ${candidateReviewRequested ? 'sample-badge--candidate' : ''}`}
                        data-testid="floor1-runtime-status"
                    >
                        {spriteDemoRequested ? 'Sprite demonstration — positions are not assignments' : statusLabel}
                    </span>
                    {candidateReviewRequested && (
                        <label className="debug-toggle">
                            <input
                                type="checkbox"
                                checked={showScopeOverlays}
                                onChange={event => toggleScopeOverlays(event.target.checked)}
                            />
                            Show scope overlays
                        </label>
                    )}
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
                {loadError && (
                    <p className="asset-status asset-status--error" role="alert">
                        {loadError} {candidateReviewRequested
                            ? 'Candidate review remains empty; sample data was not loaded.'
                            : 'Existing sample data remains active.'}
                    </p>
                )}
                <OfficeViewport
                    active={active}
                    document={document}
                    debug={debug}
                    reviewMode={candidateReviewRequested}
                    selectedId={selectedId}
                    hoveredId={hoveredId}
                    visibleLayers={renderedVisibleLayers}
                    onSelect={setSelectedId}
                    onHover={setHoveredId}
                    onPointerOfficePoint={setPointer}
                    onTransformChange={setTransform}
                    focusRequest={focusRequest}
                    spriteDemoAgents={spriteDemoRequested ? SPRITE_DEMO_AGENTS : []}
                    selectedDemoAgentId={selectedDemoAgentId}
                    onSelectDemoAgent={setSelectedDemoAgentId}
                />
                <aside className="engine-sidebar" aria-hidden={!sidebarOpen}>
                    {spriteDemoRequested && (
                        <section className="engine-panel" aria-label="Sprite demonstration inspector">
                            <h2>Sprite demonstration</h2>
                            <p className="muted">Deterministic review positions only. No Floor 1 assignments or candidate data are modified.</p>
                            <strong>{SPRITE_DEMO_AGENTS.find(agent => agent.id === selectedDemoAgentId)?.displayName ?? 'Select an agent'}</strong>
                            {selectedDemoAgentId && (
                                <p>{SPRITE_DEMO_AGENTS.find(agent => agent.id === selectedDemoAgentId)?.state} · provisional profile-to-art mapping</p>
                            )}
                        </section>
                    )}
                    {candidateReviewRequested && (
                        <section className="engine-panel candidate-layers" aria-label="Floor 1 candidate layer visibility">
                            <div className="panel-heading">
                                <div>
                                    <h2>Candidate scope layers</h2>
                                    <p className="muted">{document.entities.length} entities loaded</p>
                                </div>
                                <div className="layer-actions">
                                    <button type="button" onClick={() => setVisibleLayers(new Set(FLOOR1_CANDIDATE_LAYERS))}>All</button>
                                    <button type="button" onClick={() => setVisibleLayers(new Set())}>None</button>
                                </div>
                            </div>
                            <div className="layer-grid">
                                {FLOOR1_CANDIDATE_LAYER_CONTROLS.map(control => (
                                    <label key={control.category}>
                                        <input
                                            type="checkbox"
                                            aria-label={control.label}
                                            checked={visibleLayers.has(control.layer)}
                                            onChange={() => toggleLayer(control.layer)}
                                        />
                                        <span>{control.label}</span>
                                        <small>{counts[control.category]}</small>
                                    </label>
                                ))}
                            </div>
                        </section>
                    )}
                    {debug && !candidateReviewRequested && (
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
                        </section>
                    )}
                    {debug && (
                        <section className="engine-panel">
                            <h2>Debug readout</h2>
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
