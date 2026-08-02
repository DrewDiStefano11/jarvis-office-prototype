/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { planCandidateRoute } from '../../office/floor1/navigation/candidateNavigation';
import { SimulationEvent } from './useSimulationEngine';

interface Props {
    active: boolean;
    graph: any;
    agents: any[];
    setAgents: (agents: any[]) => void;
    eventLog: SimulationEvent[];
    addEvent: (msg: string, cat?: string) => void;
    doorRuntimes: Record<string, any>;
    setDoorRuntimes: (doors: Record<string, any>) => void;
    preview: any;
    setPreview: (p: any) => void;
    playbackSpeed: number;
    setPlaybackSpeed: (s: number) => void;
    visibleLayers: Set<string>;
    setVisibleLayers: (l: Set<string>) => void;
    opacity: number;
    setOpacity: (o: number) => void;
    selectedId: string | null;
    onSelectId: (id: string | null) => void;
    onPlacementModeToggle: (active: boolean) => void;
    placementModeActive: boolean;
}

export const ALL_DEBUG_LAYERS = [
    'rooms', 'room-labels', 'walk-paths', 'walls', 'doors',
    'computers', 'desks', 'objects', 'positions', 'interactive-objects',
    'interaction-hitboxes', 'restricted-regions', 'colliders',
    'graph-nodes', 'graph-edges', 'candidate-route', 'destination-markers',
    'door-clearance', 'agent-footprints', 'agent-labels', 'error-locations'
];

export function OfficeDebugToolbar({
    active, graph, agents, setAgents, eventLog, addEvent, doorRuntimes, setDoorRuntimes,
    preview, setPreview, playbackSpeed, setPlaybackSpeed,
    visibleLayers, setVisibleLayers, opacity, setOpacity,
    selectedId, onSelectId, onPlacementModeToggle, placementModeActive
}: Props) {
    const [portal, setPortal] = useState<HTMLElement | null>(null);
    useEffect(() => setPortal(document.querySelector<HTMLElement>('.office-viewport')), []);

    const [panelsOpen, setPanelsOpen] = useState({ layers: false, agents: false, nav: true, interact: false, log: false });
    const togglePanel = (p: keyof typeof panelsOpen) => setPanelsOpen(v => ({...v, [p]: !v[p]}));

    const [destinationId, setDestinationId] = useState<string>('');

    // Draggable toolbar
    const [pos, setPos] = useState({ x: 20, y: 20 });
    const dragging = useRef(false);
    const offset = useRef({ x: 0, y: 0 });

    const onPointerDown = (e: React.PointerEvent) => {
        if ((e.target as HTMLElement).tagName.match(/BUTTON|INPUT|SELECT|OPTION/)) return;
        dragging.current = true;
        offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (dragging.current) setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
    };

    const onPointerUp = (e: React.PointerEvent) => {
        dragging.current = false;
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

    const applyPreset = (preset: string) => {
        let set: string[] = [];
        if (preset === 'Geometry') set = ['rooms', 'walls', 'colliders'];
        if (preset === 'Navigation') set = ['walk-paths', 'doors', 'graph-nodes', 'graph-edges', 'candidate-route', 'destination-markers'];
        if (preset === 'Interactions') set = ['computers', 'desks', 'interactive-objects', 'interaction-hitboxes', 'door-clearance'];
        if (preset === 'Agents') set = ['agent-footprints', 'agent-labels'];
        if (preset === 'Everything') set = ALL_DEBUG_LAYERS;
        setVisibleLayers(new Set(set));
    };

    const handlePreviewRoute = () => {
        if (!selectedId || !destinationId || !graph) return;
        const agent = agents.find(a => a.fixture.id === selectedId);
        if (!agent) return;
        const dest = graph.destinations.find((d: any) => d.id === destinationId);
        if (!dest) return;
        try {
            const result = planCandidateRoute(graph, { start: agent.point, end: dest.point, accessTier: dest.accessTier } as any);
            setPreview({ agentId: selectedId, destinationId, agentRevision: agent.revision, startPoint: agent.point, result });
            addEvent(`Previewed route: ${result.status}`, 'navigation');
        } catch (e) {
            addEvent('Route planning failed', 'error');
        }
    };

    const beginMovement = () => {
        if (!preview || preview.result.status !== 'valid' || !selectedId) return;
        setAgents(agents.map(a => a.fixture.id === selectedId ? {
            ...a, status: 'walking', route: preview.result, progress: 0, revision: a.revision + 1
        } : a));
        setPreview(null);
        addEvent(`Movement started for ${selectedId}`, 'navigation');
    };

    const ui = (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 100 }}>
             <div
                 onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onWheelCapture={e => e.stopPropagation()}
                 style={{ pointerEvents: 'auto', background: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc', padding: '1rem', width: '350px', position: 'absolute', left: pos.x, top: pos.y, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 'calc(100% - 2rem)', overflowY: 'auto' }}>

                 <div style={{ cursor: 'grab' }}>
                     <h3 style={{ margin: '0' }}>Development Sandbox</h3>
                     <p style={{ margin: 0, fontSize: '0.85rem', color: '#c00', fontWeight: 'bold' }}>Unverified Floor 1 development simulation</p>
                 </div>

                 <button onClick={() => togglePanel('layers')}>Layers {panelsOpen.layers ? '▼' : '▶'}</button>
                 {panelsOpen.layers && (
                     <div style={{ border: '1px solid #ddd', padding: '0.5rem' }}>
                         <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                            {['Geometry', 'Navigation', 'Agents'].map(p => <button key={p} onClick={() => applyPreset(p)}>{p}</button>)}
                         </div>
                         <label>Opacity: <input type="range" min="0" max="1" step="0.1" value={opacity} onChange={e => setOpacity(parseFloat(e.target.value))} /></label>
                         <div style={{ maxHeight: '100px', overflowY: 'auto', border: '1px solid #eee', padding: '0.25rem', marginTop: '0.5rem' }}>
                            {ALL_DEBUG_LAYERS.map(l => (
                                <label key={l} style={{display:'block'}}><input type="checkbox" checked={visibleLayers.has(l)} onChange={e => { const next = new Set(visibleLayers); if (e.target.checked) next.add(l); else next.delete(l); setVisibleLayers(next); }} /> {l}</label>
                            ))}
                         </div>
                     </div>
                 )}

                 <button onClick={() => togglePanel('agents')}>Agents ({agents.length}/25) {panelsOpen.agents ? '▼' : '▶'}</button>
                 {panelsOpen.agents && (
                     <div style={{ border: '1px solid #ddd', padding: '0.5rem' }}>
                         <button style={{background: placementModeActive ? 'lightblue' : ''}} onClick={() => onPlacementModeToggle(!placementModeActive)}>{placementModeActive ? 'Click map to place...' : 'Add Test Agent'}</button>
                         <div style={{ maxHeight: '100px', overflowY: 'auto', marginTop: '0.5rem' }}>
                            {agents.map(a => (
                                <div key={a.fixture.id} onClick={() => onSelectId(a.fixture.id)} style={{ cursor: 'pointer', background: selectedId === a.fixture.id ? '#cce5ff' : '#eee', margin: '2px', padding: '2px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{a.fixture.label} ({a.status})</span>
                                    <button onClick={(e) => { e.stopPropagation(); setAgents(agents.filter(x => x.fixture.id !== a.fixture.id)); }}>X</button>
                                </div>
                            ))}
                         </div>
                     </div>
                 )}

                 <button onClick={() => togglePanel('nav')}>Navigation {panelsOpen.nav ? '▼' : '▶'}</button>
                 {panelsOpen.nav && (
                     <div style={{ border: '1px solid #ddd', padding: '0.5rem' }}>
                         <select value={destinationId} onChange={e => setDestinationId(e.target.value)} style={{width: '100%', marginBottom: '0.5rem'}}>
                            <option value="">Select Destination...</option>
                            {graph?.destinations?.map((d: any) => <option key={d.id} value={d.id}>{d.kind}: {d.label}</option>)}
                         </select>
                         <div style={{display:'flex', gap:'0.25rem', flexWrap: 'wrap'}}>
                            <button disabled={!selectedId || !destinationId} onClick={handlePreviewRoute}>Preview</button>
                            <button disabled={!preview || preview.result.status !== 'valid'} onClick={beginMovement}>Begin</button>
                            <button disabled={!selectedId} onClick={() => setAgents(agents.map(a => a.fixture.id === selectedId ? {...a, status: 'paused'} : a))}>Pause</button>
                            <button disabled={!selectedId} onClick={() => setAgents(agents.map(a => a.fixture.id === selectedId ? {...a, status: 'walking'} : a))}>Resume</button>
                         </div>
                         <label style={{marginTop: '0.5rem', display: 'block'}}>Speed: <input type="range" min="0" max="4" step="0.25" value={playbackSpeed} onChange={e => setPlaybackSpeed(parseFloat(e.target.value))} /> {playbackSpeed}x</label>
                     </div>
                 )}

                 <button onClick={() => togglePanel('interact')}>Interactions {panelsOpen.interact ? '▼' : '▶'}</button>
                 {panelsOpen.interact && (
                     <div style={{ border: '1px solid #ddd', padding: '0.5rem', maxHeight: '100px', overflowY: 'auto' }}>
                         {graph?.doors?.slice(0,5).map((d: any) => (
                             <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem', background: '#eee', marginBottom: '0.25rem' }}>
                                 <span>{d.id}</span>
                                 <select value={doorRuntimes[d.id]?.state || 'closed'} onChange={e => {
                                     setDoorRuntimes({ ...doorRuntimes, [d.id]: { ...doorRuntimes[d.id], state: e.target.value } });
                                     addEvent(`Door ${d.id} overridden to ${e.target.value}`);
                                 }}>
                                     <option value="closed">Closed</option>
                                     <option value="open">Force Open</option>
                                 </select>
                             </div>
                         ))}
                     </div>
                 )}

                 <button onClick={() => togglePanel('log')}>Event Log {panelsOpen.log ? '▼' : '▶'}</button>
                 {panelsOpen.log && (
                     <div style={{ border: '1px solid #ddd', padding: '0.5rem', maxHeight: '100px', overflowY: 'auto', fontSize: '0.75rem' }}>
                         {eventLog.map((l, i) => <div key={i}>[{Math.round(l.time)}] {l.msg}</div>)}
                     </div>
                 )}
             </div>
        </div>
    );

    return active && portal ? createPortal(ui, portal) : null;
}
