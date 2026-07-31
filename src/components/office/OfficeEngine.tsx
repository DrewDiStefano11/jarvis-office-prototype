/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useState, useEffect, Suspense, useMemo } from 'react';
import { loadVerifiedProductionOverlay } from '../../office/floor1/runtime';
import { loadFloor1CandidateOverlay } from '../../office/floor1/candidateReview';
import { OfficeOverlayDocument, OfficeLayer, ViewTransform, Point } from '../../office/types';
import { EntityInspector } from './EntityInspector';
import { OfficeViewport } from './OfficeViewport';
import './office-engine.css';
import { useSimulationEngine } from './useSimulationEngine';
import { OfficeDebugToolbar } from './OfficeDebugToolbar';
import { buildCandidateSandboxGraph } from '../../office/floor1/navigation/candidateNavigation';
import { FLOOR1_CANDIDATE_REGISTRATION } from '../../office/floor1/candidateRegistration';
import roomsJson from '../../office/data/floor1/provisional/rooms.json';
import positionsJson from '../../office/data/floor1/provisional/positions.json';
import doorsJson from '../../office/data/floor1/provisional/doors.json';
import computersJson from '../../office/data/floor1/provisional/computers.json';
import interactiveObjectsJson from '../../office/data/floor1/provisional/interactive-objects.json';
import wallsJson from '../../office/data/floor1/provisional/walls.json';
import walkPathsJson from '../../office/data/floor1/provisional/walk-paths.json';
import doorLightsJson from '../../office/data/floor1/provisional/door-lights.json';
import { createPortal } from 'react-dom';
import { SpritePlayer } from './SpritePlayer';
import { AGENT_SPRITE_MANIFEST } from '../../office/sprites/manifest';

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
    const [opacity, setOpacity] = useState(1.0);
    const [placementModeActive, setPlacementModeActive] = useState(false);

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

    const graph = useMemo(() => {
        if (!debug && dataSource !== 'candidate-review') return null;
        try {
            return buildCandidateSandboxGraph({
                rooms: roomsJson, positions: positionsJson, doors: doorsJson, doorLights: doorLightsJson,
                computers: computersJson, interactiveObjects: interactiveObjectsJson, walls: wallsJson, walkPaths: walkPathsJson, objects: []
            } as any, FLOOR1_CANDIDATE_REGISTRATION);
        } catch { return null; }
    }, [debug, dataSource]);

    const sim = useSimulationEngine(active && (debug || dataSource === 'candidate-review'), graph as any);

    const handleViewportClick = (point: Point | null) => {
        if (!point) return;
        if (!placementModeActive || !graph) return;

        let nearest = graph.walkNodes[0];
        let minDist = Infinity;
        for (const n of graph.walkNodes) {
            const d = Math.hypot(n.point.x - point.x, n.point.y - point.y);
            if (d < minDist) { minDist = d; nearest = n; }
        }

        if (nearest && minDist < 200) {
            if (sim.agents.length >= 25) {
                sim.addEvent('Capacity reached', 'error');
                return;
            }
            const newAgent = {
                fixture: { id: `test-${Date.now()}`, label: `Agent ${sim.agents.length+1}`, spriteAssetId: 'c_agent_1' },
                point: nearest.point, status: 'idle', route: null, progress: 0, revision: 0
            };
            sim.setAgents([...sim.agents, newAgent as any]);
            setSelectedId(newAgent.fixture.id);
            sim.addEvent(`Placed agent at ${Math.round(nearest.point.x)}, ${Math.round(nearest.point.y)}`);
            setPlacementModeActive(false);
        } else {
            sim.addEvent('Invalid placement: Too far from walk paths', 'error');
        }
    };

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
            sim.setAgents([]);
            setSelectedId(null);
            setPlacementModeActive(false);
        }
    }

    const [portal, setPortal] = useState<HTMLElement | null>(null);
    useEffect(() => {
        setPortal(window.document.querySelector<HTMLElement>('.office-viewport'));
    }, [document]);

    const overlaySvg = (
        <svg
            className="office-debug-overlays"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: '0 0' }}
            aria-hidden="true"
        >
            {graph && visibleLayers.has('colliders') && graph.colliders.map((c: any) => (
                <polygon key={c.id} points={c.points.map((p: any) => `${p.x},${p.y}`).join(' ')} stroke="red" strokeWidth={c.thickness || 2} fill="none" opacity={opacity} />
            ))}
            {graph && visibleLayers.has('graph-nodes') && graph.walkNodes.map((n: any) => (
                <circle key={n.id} cx={n.point.x} cy={n.point.y} r="14" fill="rgba(0, 0, 255, 0.5)" opacity={opacity} />
            ))}
            {graph && visibleLayers.has('doors') && graph.doors.map((d: any) => (
                <circle key={d.id} cx={d.point.x} cy={d.point.y} r="24" fill="rgba(255, 165, 0, 0.5)" opacity={opacity} />
            ))}
            {visibleLayers.has('destination-markers') && graph?.destinations.map((d: any) => (
                <rect key={d.id} x={d.point.x - 10} y={d.point.y - 10} width={20} height={20} fill="magenta" opacity={opacity} />
            ))}
            {visibleLayers.has('candidate-route') && sim.preview?.result.status === 'valid' && (
                <polyline points={sim.preview.result.points.map((p: any) => `${p.x},${p.y}`).join(' ')} stroke="blue" strokeWidth="4" fill="none" opacity={opacity} />
            )}
            <g className="floor1-candidate-agent-layer" style={{ pointerEvents: 'auto' }}>
                {sim.agents.map((agent: any) => (
                    <g key={agent.fixture.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedId(agent.fixture.id)} transform={`translate(${agent.point.x}, ${agent.point.y})`}>
                        {selectedId === agent.fixture.id && <circle r="45" fill="rgba(0,0,255,0.3)" />}
                        <foreignObject x="-30" y="-80" width="60" height="120" style={{ pointerEvents: 'none' }}>
                            <SpritePlayer
                                manifest={AGENT_SPRITE_MANIFEST}
                                runtime={sim.runtime}
                                assetId={agent.fixture.spriteAssetId}
                                state={['walking', 'waiting_for_door', 'crossing_door'].includes(agent.status) ? 'walking' : agent.status === 'blocked' ? 'offline' : 'idle'}
                                reducedMotion={false}
                                scale={0.52}
                            />
                        </foreignObject>
                        {visibleLayers.has('agent-labels') && (
                            <text y="-90" textAnchor="middle" fill="black" fontSize="32" fontWeight="bold" opacity={opacity}>{agent.fixture.label}</text>
                        )}
                    </g>
                ))}
            </g>
        </svg>
    );

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
                    onPointerOfficePoint={handleViewportClick}
                    onTransformChange={setTransform}
                    focusRequest={focusRequest}
                />

                {debug && portal && createPortal(overlaySvg, portal)}

                {debug && graph && (
                    <Suspense fallback={null}>
                        <OfficeDebugToolbar
                            active={active} graph={graph}
                            agents={sim.agents} setAgents={sim.setAgents}
                            eventLog={sim.eventLog} addEvent={sim.addEvent}
                            doorRuntimes={sim.doorRuntimes} setDoorRuntimes={sim.setDoorRuntimes}
                            preview={sim.preview} setPreview={sim.setPreview}
                            playbackSpeed={sim.playbackSpeed} setPlaybackSpeed={sim.setPlaybackSpeed}
                            visibleLayers={visibleLayers} setVisibleLayers={setVisibleLayers}
                            opacity={opacity} setOpacity={setOpacity}
                            selectedId={selectedId} onSelectId={setSelectedId}
                            placementModeActive={placementModeActive} onPlacementModeToggle={setPlacementModeActive}
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
