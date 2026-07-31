/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useState, useEffect, lazy, Suspense } from 'react';
import { loadVerifiedProductionOverlay } from '../../office/floor1/runtime';
import { loadFloor1CandidateOverlay } from '../../office/floor1/candidateReview';
import { OfficeOverlayDocument, OfficeLayer, ViewTransform } from '../../office/types';
import { EntityInspector } from './EntityInspector';
import { OfficeViewport } from './OfficeViewport';
import './office-engine.css';

const OfficeDebugEnvironment = import.meta.env.DEV
    ? lazy(() => import('./OfficeDebugEnvironment').then(m => ({ default: m.OfficeDebugEnvironment })))
    : null;

interface OfficeEngineProps {
    active: boolean;
    candidateLoader?: () => Promise<OfficeOverlayDocument>;
}

export function OfficeEngine({ active, candidateLoader }: OfficeEngineProps) {
    const [document, setDocument] = useState<OfficeOverlayDocument | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [dataSource, setDataSource] = useState<'approved-production' | 'candidate-review' | 'sample-fallback'>('sample-fallback');
    const [debug, setDebug] = useState(false);

    // Viewport state
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const [transform, setTransform] = useState<ViewTransform>({ x: 0, y: 0, scale: 1 });
    const [focusRequest, setFocusRequest] = useState(0);

    // Overlays driven by debug
    const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set());


    useEffect(() => {
        let cancelled = false;

        const url = new URL(window.location.href);
        const reviewRequested = url.searchParams.get('floor1Review') === 'candidate';

        if (reviewRequested || debug) {
            const loadCandidate = candidateLoader ?? loadFloor1CandidateOverlay;
            loadCandidate().then(candidate => {
                if (cancelled) return;
                setDocument(candidate);
                setDataSource('candidate-review');
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
    }, [candidateLoader, debug]);

    const statusLabel = dataSource === 'approved-production'
        ? 'Approved production Floor 1'
        : dataSource === 'candidate-review'
            ? 'Candidate review / Debug'
            : 'Sample fallback — not production Floor 1';

    const inspected = document?.entities?.find(e => e.id === hoveredId) ?? document?.entities?.find(e => e.id === selectedId) ?? null;

    const toggleDebug = (checked: boolean) => {
        setDebug(checked);
        if (!checked) {
            setVisibleLayers(new Set());

            setSelectedId(null);
        }
    }

    return (
        <main className="office-engine">
            <header className="engine-header">
                <div>
                    <p className="eyebrow">Jarvis office prototype</p>
                    <h1>Interactive office engine</h1>
                </div>
                <div className="header-actions">
                    <span className={`sample-badge ${dataSource === 'candidate-review' ? 'sample-badge--candidate' : ''}`}>
                        {statusLabel}
                    </span>
                    {import.meta.env.DEV && (
                        <label className="debug-toggle">
                            <input type="checkbox" checked={debug} onChange={event => toggleDebug(event.target.checked)} />
                            {debug ? 'Disable debug mode' : 'Enable debug mode'}
                        </label>
                    )}
                </div>
            </header>
            <section className="engine-workspace">
                {loadError && (
                    <p className="asset-status asset-status--error" role="alert">
                        {loadError}
                    </p>
                )}

                <OfficeViewport
                    active={active}
                    document={document as unknown as any}
                    debug={false}
                    reviewMode={dataSource === 'candidate-review'}
                    selectedId={selectedId}
                    hoveredId={hoveredId}
                    visibleLayers={visibleLayers as unknown as ReadonlySet<OfficeLayer>}
                    onSelect={setSelectedId}
                    onHover={setHoveredId}

                    onTransformChange={setTransform}
                    onPointerOfficePoint={() => {}}
                    focusRequest={focusRequest}
                />

                {debug && OfficeDebugEnvironment && document && (
                    <Suspense fallback={null}>
                        <OfficeDebugEnvironment
                            active={active}

                            transform={transform}

                            selectedId={selectedId}
                            onSelectId={setSelectedId}
                            visibleLayers={visibleLayers}
                            setVisibleLayers={setVisibleLayers}


                        />
                    </Suspense>
                )}

                {!debug && (
                    <aside className="engine-sidebar">
                        <section className="engine-panel access-legend">
                            <h2>Access semantics</h2>
                            <p><i className="green" /> Green · general access</p>
                            <p><i className="blue" /> Blue · member or role restricted</p>
                            <p><i className="yellow" /> Yellow · temporarily reserved</p>
                            <p><i className="red" /> Red · blocked</p>
                            <small>For seats only: yellow means priority; red means standard.</small>
                        </section>
                        <EntityInspector entity={inspected} onFocus={() => setFocusRequest(v => v + 1)} />
                    </aside>
                )}
            </section>
        </main>
    );
}
