/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { buildCandidateSandboxGraph } from '../../office/floor1/navigation/candidateNavigation';
import { advanceCandidateAgents, advanceCandidateDoorRuntimes,  planCandidateRoute } from '../../office/floor1/navigation/candidateNavigation';
import { SpriteSurfaceRuntime } from '../../office/sprites/runtime';
import { SpritePlayer } from './SpritePlayer';
import { AGENT_SPRITE_MANIFEST } from '../../office/sprites/manifest';
import { Point, ViewTransform } from '../../office/types';
import { CandidateDoorRuntime } from '../../office/floor1/navigation/candidateNavigation';
import { FLOOR1_CANDIDATE_REGISTRATION } from '../../office/floor1/candidateRegistration';
import roomsJson from '../../office/data/floor1/provisional/rooms.json';
import positionsJson from '../../office/data/floor1/provisional/positions.json';
import doorsJson from '../../office/data/floor1/provisional/doors.json';
import computersJson from '../../office/data/floor1/provisional/computers.json';
import interactiveObjectsJson from '../../office/data/floor1/provisional/interactive-objects.json';
import wallsJson from '../../office/data/floor1/provisional/walls.json';
import walkPathsJson from '../../office/data/floor1/provisional/walk-paths.json';
import doorLightsJson from '../../office/data/floor1/provisional/door-lights.json';

const ALL_LAYERS = [
    'rooms', 'room-labels', 'walk-paths', 'walls', 'doors',
    'computers', 'desks', 'objects', 'positions', 'interactive-objects',
    'interaction-hitboxes', 'restricted-regions', 'colliders',
    'graph-nodes', 'graph-edges', 'candidate-route', 'destination-markers',
    'door-clearance', 'agent-footprints', 'agent-labels', 'error-locations'
];

interface Props {
    active: boolean;
    reducedMotion?: boolean;
    transform: ViewTransform;
    pointer?: Point | null;
    selectedId: string | null;
    onSelectId: (id: string | null) => void;
    visibleLayers: Set<string>;
    setVisibleLayers: (layers: Set<string>) => void;
}

export function OfficeDebugEnvironment({
    active, reducedMotion = false, transform, selectedId, onSelectId, visibleLayers, setVisibleLayers
}: Props) {
    const graph = useMemo(() => {
        try {
            return buildCandidateSandboxGraph({
                rooms: roomsJson as unknown as any,
                positions: positionsJson as unknown as any,
                doors: doorsJson as unknown as any,
                doorLights: doorLightsJson as unknown as any,
                computers: computersJson as unknown as any,
                interactiveObjects: interactiveObjectsJson as unknown as any,
                walls: wallsJson as unknown as any,
                walkPaths: walkPathsJson as unknown as any,
                objects: [] as unknown as any
            } as unknown as any, FLOOR1_CANDIDATE_REGISTRATION);
        } catch {
            return null;
        }
    }, []);

    const [runtime] = useState(() => new SpriteSurfaceRuntime());
    const [agents, setAgents] = useState<any[]>([]);
    const [doorRuntimes, setDoorRuntimes] = useState<Record<string, CandidateDoorRuntime>>({});

    useEffect(() => {
        if (graph && agents.length < 1) {
            setAgents(graph.agents.slice(0, 2).map(fixture => ({
                fixture, point: fixture.point, status: 'idle', route: null, progress: 0, revision: 0
            })));
            setDoorRuntimes(Object.fromEntries(graph.doors.map((d: { id: string; point: Point; kind?: string; label?: string; }) => [d.id, { doorId: d.id, state: (d as any).currentState ?? "closed", stateElapsedMs: 0, revision: 0 }])));
        }
    }, [graph, agents.length]);

    const agentsRef = useRef(agents);
    const doorRuntimesRef = useRef(doorRuntimes);
    useEffect(() => { agentsRef.current = agents; }, [agents]);
    useEffect(() => { doorRuntimesRef.current = doorRuntimes; }, [doorRuntimes]);

    const [destinationId, setDestinationId] = useState<string>('');
    const [preview, setPreview] = useState<any | null>(null);
    const [opacity, setOpacity] = useState(1.0);
    const [eventLog, setEventLog] = useState<{time: number; msg: string; category?: string}[]>([]);
    const [panelsOpen, setPanelsOpen] = useState({ layers: false, agents: true, navigation: true, log: false });

    const [controlPortal, setControlPortal] = useState<HTMLElement | null>(null);
    useEffect(() => setControlPortal(window.document.querySelector<HTMLElement>('.office-viewport')), []);

    const frameRef = useRef<number | null>(null);
    const lastTimestampRef = useRef<number | null>(null);

    const togglePanel = (p: keyof typeof panelsOpen) => setPanelsOpen(v => ({...v, [p]: !v[p]}));
    const addEvent = (msg: string, category = 'system') => setEventLog(prev => [{ time: performance.now(), msg, category }, ...prev].slice(0, 100));

    // Animation Loop
    useEffect(() => {
        runtime.setActive(active && !window.document.hidden);
        const handleVisibility = () => {
            runtime.setActive(active && !window.document.hidden);
            lastTimestampRef.current = null;
        };
        window.document.addEventListener('visibilitychange', handleVisibility);
        return () => window.document.removeEventListener('visibilitychange', handleVisibility);
    }, [active, runtime]);

    useEffect(() => () => {
        runtime.dispose();
        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    }, [runtime]);

    const anyWalking = agents.some(a => a.status === 'walking' || a.status === 'waiting_for_door' || a.status === 'crossing_door');

    useEffect(() => {
        if (!active || !anyWalking || !graph) {
            if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
            lastTimestampRef.current = null;
            return undefined;
        }
        const loop = (timestamp: number) => {
            const currentAgents = agentsRef.current;
            const currentDoors = doorRuntimesRef.current;
            if (lastTimestampRef.current !== null) {
                let elapsedMs = timestamp - lastTimestampRef.current;
                if (elapsedMs > 100) elapsedMs = 100;
                if (elapsedMs > 0) {
                    const advancedDoors = advanceCandidateDoorRuntimes(currentDoors, currentAgents, elapsedMs);
                    const advancedAgents = advanceCandidateAgents(currentAgents as unknown as any, elapsedMs, 100, advancedDoors);
                    let changedDoors = false;
                    for (const id in advancedDoors) {
                        if (advancedDoors[id] !== currentDoors[id]) { changedDoors = true; break; }
                    }
                    if (changedDoors) setDoorRuntimes(advancedDoors);
                    let changedAgents = false;
                    for (let i = 0; i < advancedAgents.length; i++) {
                        if (advancedAgents[i] !== currentAgents[i]) {
                            changedAgents = true;
                            if (currentAgents[i].status !== 'arrived' && advancedAgents[i].status === 'arrived') {
                                addEvent(`Agent ${(advancedAgents[i] as unknown as any).fixture.id} arrived`, 'navigation');
                            }
                        }
                    }
                    if (changedAgents) setAgents(advancedAgents as unknown as any);
                }
            }
            lastTimestampRef.current = timestamp;
            frameRef.current = requestAnimationFrame(loop);
        };
        frameRef.current = requestAnimationFrame(loop);
        return () => {
            if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
            lastTimestampRef.current = null;
        };
    }, [active, anyWalking, graph]);

    const previewRoute = () => {
        if (!graph || !selectedId || !destinationId) return;
        const agent = agents.find(a => a.fixture.id === selectedId);
        if (!agent) return;
        const dest = graph.destinations.find((d: { id: string; point: Point; kind?: string; label?: string; }) => d.id === destinationId);
        if (!dest) return;
        const result = planCandidateRoute(graph, { start: agent.point, end: dest.point, accessTier: dest.accessTier } as unknown as any);
        setPreview({
            agentId: selectedId,
            destinationId,
            agentRevision: agent.revision,
            startPoint: agent.point,
            result
        });
        addEvent(`Previewed route: ${result.status}`, 'navigation');
    };

    const beginMovement = () => {
        if (!preview || preview.result.status !== 'valid' || !selectedId) return;
        setAgents(prev => prev.map(a => a.fixture.id === selectedId ? {
            ...a, status: 'walking', route: preview.result, progress: 0, revision: a.revision + 1
        } : a));
        setPreview(null);
        addEvent(`Movement started for ${selectedId}`, 'navigation');
    };

    const applyPreset = (preset: string) => {
        let set: string[] = [];
        if (preset === 'Geometry') set = ['rooms', 'walls', 'colliders'];
        if (preset === 'Navigation') set = ['walk-paths', 'doors', 'graph-nodes', 'graph-edges', 'candidate-route', 'destination-markers'];
        if (preset === 'Interactions') set = ['computers', 'desks', 'interactive-objects', 'interaction-hitboxes', 'door-clearance'];
        if (preset === 'Agents') set = ['agent-footprints', 'agent-labels'];
        if (preset === 'Everything') set = ALL_LAYERS;
        setVisibleLayers(new Set(set));
    };

    const overlaySvg = (
        <svg
            className="office-debug-overlays"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: '0 0' }}
            aria-hidden="true"
        >
            {graph && visibleLayers.has('colliders') && graph.colliders.map((c: { id: string; thickness: number; points: readonly Point[] }) => (
                <polygon key={c.id} points={c.points.map((p: any) => `${p.x},${p.y}`).join(' ')} stroke="red" strokeWidth={c.thickness || 2} fill="none" opacity={opacity} />
            ))}
            {graph && visibleLayers.has('graph-nodes') && graph.walkNodes.map((n: any) => (
                <circle key={n.id} cx={n.point.x} cy={n.point.y} r="14" fill="rgba(0, 0, 255, 0.5)" opacity={opacity} />
            ))}
            {graph && visibleLayers.has('doors') && graph.doors.map((d: { id: string; point: Point; kind?: string; label?: string; }) => (
                <circle key={d.id} cx={d.point.x} cy={d.point.y} r="24" fill="rgba(255, 165, 0, 0.5)" opacity={opacity} />
            ))}
            {visibleLayers.has('destination-markers') && graph?.destinations.map((d: { id: string; point: Point; kind?: string; label?: string; }) => (
                <rect key={d.id} x={d.point.x - 10} y={d.point.y - 10} width={20} height={20} fill="magenta" opacity={opacity} />
            ))}
            {visibleLayers.has('candidate-route') && preview?.result.status === 'valid' && (
                <polyline points={preview.result.points.map((p: any) => `${p.x},${p.y}`).join(' ')} stroke="blue" strokeWidth="4" fill="none" opacity={opacity} />
            )}
            <g className="floor1-candidate-agent-layer" style={{ pointerEvents: 'auto' }}>
                {agents.map((agent: any) => (
                    <g key={agent.fixture.id} style={{ cursor: 'pointer' }} onClick={() => onSelectId(agent.fixture.id)} transform={`translate(${agent.point.x}, ${agent.point.y})`}>
                        {selectedId === agent.fixture.id && <circle r="45" fill="rgba(0,0,255,0.3)" />}
                        <foreignObject x="-30" y="-80" width="60" height="120" style={{ pointerEvents: 'none' }}>
                            <SpritePlayer
                                manifest={AGENT_SPRITE_MANIFEST}
                                runtime={runtime}
                                assetId={agent.fixture.spriteAssetId}
                                state={!reducedMotion && ['walking', 'waiting_for_door', 'crossing_door'].includes(agent.status) ? 'walking' : agent.status === 'blocked' ? 'offline' : 'idle'}
                                reducedMotion={reducedMotion}
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

    const ui = (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 100 }}>
             <div style={{ pointerEvents: 'auto', background: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc', padding: '1rem', width: '350px', margin: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 'calc(100% - 2rem)', overflowY: 'auto' }} onWheelCapture={e => e.stopPropagation()} onPointerDownCapture={e => e.stopPropagation()}>
                 <h3 style={{ margin: '0' }}>Development Sandbox</h3>
                 <p style={{ margin: 0, fontSize: '0.85rem', color: '#c00', fontWeight: 'bold' }}>Unverified Floor 1 development simulation — visual troubleshooting only</p>

                 <button onClick={() => togglePanel('layers')}>Layers {panelsOpen.layers ? '▼' : '▶'}</button>
                 {panelsOpen.layers && (
                     <div style={{ border: '1px solid #ddd', padding: '0.5rem' }}>
                         <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                            <button onClick={() => applyPreset('Geometry')}>Geometry</button>
                            <button onClick={() => applyPreset('Navigation')}>Navigation</button>
                            <button onClick={() => applyPreset('Agents')}>Agents</button>
                         </div>
                         <label>Opacity: <input type="range" min="0" max="1" step="0.1" value={opacity} onChange={e => setOpacity(parseFloat(e.target.value))} /></label>
                         <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
                            {ALL_LAYERS.map(l => (
                                <label key={l} style={{display:'block'}}><input type="checkbox" checked={visibleLayers.has(l)} onChange={e => { const next = new Set(visibleLayers); if (e.target.checked) next.add(l); else next.delete(l); setVisibleLayers(next); }} /> {l}</label>
                            ))}
                         </div>
                         <div style={{marginTop: '0.5rem'}}><button onClick={() => setVisibleLayers(new Set(ALL_LAYERS))}>Show All</button> <button onClick={() => setVisibleLayers(new Set())}>Hide All</button></div>
                     </div>
                 )}

                 <button onClick={() => togglePanel('agents')}>Agents ({agents.length}/25) {panelsOpen.agents ? '▼' : '▶'}</button>
                 {panelsOpen.agents && (
                     <div style={{ border: '1px solid #ddd', padding: '0.5rem' }}>
                         <button onClick={() => { if(agents.length>=25)return; const f = graph?.agents[agents.length % (graph?.agents.length||1)]; if(f) { setAgents([...agents, { fixture: {...f, id: `test-${Date.now()}`, label: `Test ${agents.length+1}`}, point: f.point, status: 'idle', route: null, progress: 0, revision: 0 }]); } }}>Add Agent</button>
                         <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
                            {agents.map(a => (
                                <div key={a.fixture.id} onClick={() => onSelectId(a.fixture.id)} style={{ cursor: 'pointer', background: selectedId === a.fixture.id ? '#cce5ff' : '#eee', margin: '2px', padding: '2px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{a.fixture.label} ({a.status})</span>
                                    <button onClick={(e) => { e.stopPropagation(); setAgents(agents.filter(x => x.fixture.id !== a.fixture.id)); }}>X</button>
                                </div>
                            ))}
                         </div>
                     </div>
                 )}

                 <button onClick={() => togglePanel('navigation')}>Navigation {panelsOpen.navigation ? '▼' : '▶'}</button>
                 {panelsOpen.navigation && (
                     <div style={{ border: '1px solid #ddd', padding: '0.5rem' }}>
                         <select value={destinationId} onChange={e => setDestinationId(e.target.value)} style={{width: '100%', marginBottom: '0.5rem'}}>
                            <option value="">Select Destination...</option>
                            {graph?.destinations?.map((d: any) => <option key={d.id} value={d.id}>{d.kind}: {d.label}</option>)}
                         </select>
                         <div style={{display:'flex', gap:'0.25rem', flexWrap: 'wrap'}}>
                            <button disabled={!selectedId || !destinationId} onClick={previewRoute}>Preview</button>
                            <button disabled={!preview || preview.result.status !== 'valid'} onClick={beginMovement}>Begin</button>
                            <button disabled={!selectedId} onClick={() => setAgents(agents.map(a => a.fixture.id === selectedId ? {...a, status: 'paused'} : a))}>Pause</button>
                            <button disabled={!selectedId} onClick={() => setAgents(agents.map(a => a.fixture.id === selectedId ? {...a, status: 'walking'} : a))}>Resume</button>
                            <button disabled={!selectedId} onClick={() => setAgents(agents.map(a => a.fixture.id === selectedId ? {...a, status: 'idle', route: null, progress: 0, revision: a.revision+1} : a))}>Cancel</button>
                         </div>
                         {preview && <div style={{fontSize:'0.8rem', marginTop:'0.5rem'}}>Route status: {preview.result.status}</div>}
                     </div>
                 )}

                 <button onClick={() => togglePanel('log')}>Event Log {panelsOpen.log ? '▼' : '▶'}</button>
                 {panelsOpen.log && (
                     <div style={{ border: '1px solid #ddd', padding: '0.5rem', maxHeight: '100px', overflowY: 'auto', fontSize: '0.75rem' }}>
                         <button onClick={() => setEventLog([])}>Clear</button>
                         {eventLog.map((l, i) => <div key={i}>[{Math.round(l.time)}] {l.msg}</div>)}
                     </div>
                 )}
             </div>
        </div>
    );

    return controlPortal ? createPortal(<>{overlaySvg}{ui}</>, controlPortal) : null;
}
