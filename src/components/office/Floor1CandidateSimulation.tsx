import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import rooms from '../../office/data/floor1/provisional/rooms.json';
import positions from '../../office/data/floor1/provisional/positions.json';
import doors from '../../office/data/floor1/provisional/doors.json';
import computers from '../../office/data/floor1/provisional/computers.json';
import interactiveObjects from '../../office/data/floor1/provisional/interactive-objects.json';
import walls from '../../office/data/floor1/provisional/walls.json';
import objects from '../../office/data/floor1/provisional/objects.json';
import walkPaths from '../../office/data/floor1/provisional/walk-paths.json';
import { FLOOR1_CANDIDATE_LAYER_CONTROLS } from '../../office/floor1/candidateReview';
import {
    buildCandidateNavigationGraph,
    buildCandidateSandboxGraph,
    type CandidateNavigationGraph,
    type MarkupRegistration,
} from '../../office/floor1/navigation/candidateNavigation';
import {
    advancePrototypeAgents,
    ambientPrototypeTarget,
    createPrototypeAgents,
    planPrototypeRouteToPoint,
    PROTOTYPE_AGENT_LIMIT,
    PROTOTYPE_AMBIENT_COUNTS,
    PROTOTYPE_DOOR_POLICY,
    prototypeOpenDoorRuntimes,
    prototypeOpenGraph,
    resetPrototypeAgent,
    startPrototypeRoute,
    type PrototypeActivityState,
    type PrototypeAgent,
} from '../../office/floor1/navigation/prototypeRuntime';
import type { OfficeLayer, Point, ViewTransform, ViewportSize } from '../../office/types';
import { PrototypeAgentRenderer } from './PrototypeAgentRenderer';
import './floor1-candidate-simulation.css';

type Props = Readonly<{
    active: boolean;
    reducedMotion: boolean;
    registration?: MarkupRegistration;
    controlHost?: HTMLElement | null;
    presentation?: 'inspection' | 'simulation';
    visibleLayers?: ReadonlySet<OfficeLayer>;
    transform?: ViewTransform;
    viewport?: ViewportSize;
    pointer?: Point | null;
    onSetVisibleLayers?: (layers: ReadonlySet<OfficeLayer>) => void;
    onFitOffice?: () => void;
    onFocusPoint?: (point: Point) => void;
    onOpenDebugger?: () => void;
}>;

type LocalOverlays = Readonly<{
    nodes: boolean;
    edges: boolean;
    doors: boolean;
    colliders: boolean;
    routes: boolean;
    destinations: boolean;
    labels: boolean;
    agentBounds: boolean;
}>;

type OverlaySnapshot = Readonly<{ layers: ReadonlySet<OfficeLayer>; local: LocalOverlays }>;

const BASE_SPEED_PX_PER_SECOND = 180;
const NOOP_SET_LAYERS = () => undefined;
const NOOP_ACTION = () => undefined;
const NOOP_FOCUS: (point: Point) => void = () => undefined;
const CANDIDATE_DOCUMENTS = { rooms, positions, doors, computers, interactiveObjects, walls, objects, walkPaths } as const;
const SANDBOX_GRAPH_CACHE = new WeakMap<object, CandidateNavigationGraph>();
const SOURCE_LAYERS = [...new Set(FLOOR1_CANDIDATE_LAYER_CONTROLS.map(control => control.layer))];
const ALL_LOCAL_OVERLAYS: LocalOverlays = {
    nodes: true,
    edges: true,
    doors: true,
    colliders: true,
    routes: true,
    destinations: true,
    labels: true,
    agentBounds: true,
};
const NO_LOCAL_OVERLAYS: LocalOverlays = {
    nodes: false,
    edges: false,
    doors: false,
    colliders: false,
    routes: false,
    destinations: false,
    labels: false,
    agentBounds: false,
};

function candidateGraph(registration?: MarkupRegistration): CandidateNavigationGraph {
    if (!registration) return buildCandidateNavigationGraph(CANDIDATE_DOCUMENTS);
    const cached = SANDBOX_GRAPH_CACHE.get(registration);
    if (cached) return cached;
    const graph = buildCandidateSandboxGraph(CANDIDATE_DOCUMENTS, registration);
    SANDBOX_GRAPH_CACHE.set(registration, graph);
    return graph;
}

function initialLocalOverlays(mode: 'ambient' | 'debug'): LocalOverlays {
    return mode === 'ambient'
        ? NO_LOCAL_OVERLAYS
        : { ...NO_LOCAL_OVERLAYS, routes: true, destinations: true, labels: true };
}

function mergeAgentCount(graph: CandidateNavigationGraph, current: readonly PrototypeAgent[], count: number): readonly PrototypeAgent[] {
    const generated = createPrototypeAgents(graph, count, 'debug');
    const currentById = new Map(current.map(agent => [agent.fixture.id, agent]));
    return generated.map(agent => currentById.get(agent.fixture.id) ?? agent);
}

function nextAmbientActivity(index: number, revision: number): PrototypeActivityState {
    const phase = (index + revision) % 5;
    return phase === 0 ? 'moving-to-task' : phase === 1 || phase === 2 ? 'working-at-desk' : phase === 3 ? 'idle' : 'talking';
}

function selectedStatus(agent: PrototypeAgent | null): string {
    if (!agent) return 'No agent selected';
    if (agent.movementState === 'walking') return 'Walking';
    if (agent.movementState === 'paused') return 'Paused';
    if (agent.movementState === 'arrived') return 'Arrived';
    return agent.activityState.replace(/-/g, ' ');
}

function coordinate(point: Point | null): string {
    return point ? `${Math.round(point.x)}, ${Math.round(point.y)}` : 'none';
}

export function Floor1CandidateSimulation({
    active,
    reducedMotion,
    registration,
    controlHost = null,
    presentation = 'inspection',
    visibleLayers = new Set<OfficeLayer>(),
    transform = { x: 0, y: 0, scale: 1 },
    viewport = { width: 0, height: 0 },
    pointer = null,
    onSetVisibleLayers = NOOP_SET_LAYERS,
    onFitOffice = NOOP_ACTION,
    onFocusPoint = NOOP_FOCUS,
    onOpenDebugger = NOOP_ACTION,
}: Props) {
    const mode = presentation === 'inspection' ? 'ambient' : 'debug';
    const graph = useMemo(() => prototypeOpenGraph(candidateGraph(registration)), [registration]);
    const doorRuntimes = useMemo(() => prototypeOpenDoorRuntimes(graph), [graph]);
    const [ambientCount, setAmbientCount] = useState(20);
    const [agents, setAgents] = useState<readonly PrototypeAgent[]>(() => createPrototypeAgents(graph, mode === 'ambient' ? 20 : 0, mode));
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(() => mode === 'ambient' ? 'prototype-agent-01' : null);
    const [localOverlays, setLocalOverlays] = useState<LocalOverlays>(() => initialLocalOverlays(mode));
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [paused, setPaused] = useState(false);
    const [autoMovement, setAutoMovement] = useState(false);
    const [feedback, setFeedback] = useState(mode === 'debug' ? 'Add an agent, then click the office to send it there.' : 'Ambient simulation running.');
    const [panelCollapsed, setPanelCollapsed] = useState(false);
    const agentsRef = useRef(agents);
    const lastTimestampRef = useRef<number | null>(null);
    const frameRef = useRef<number | null>(null);
    const previousOverlayRef = useRef<OverlaySnapshot | null>(null);

    const selectedAgent = agents.find(agent => agent.fixture.id === selectedAgentId) ?? null;
    const anyDiagnosticOverlay = visibleLayers.size > 0 || Object.values(localOverlays).some(Boolean);
    const atLimit = agents.length >= PROTOTYPE_AGENT_LIMIT;
    const movingCount = agents.filter(agent => agent.movementState === 'walking').length;
    const workingCount = agents.filter(agent => agent.activityState === 'working-at-desk').length;
    const talkingCount = agents.filter(agent => agent.activityState === 'talking').length;

    useEffect(() => { agentsRef.current = agents; }, [agents]);

    useEffect(() => {
        const nextCount = mode === 'ambient' ? ambientCount : 0;
        setAgents(createPrototypeAgents(graph, nextCount, mode));
        setSelectedAgentId(mode === 'ambient' && nextCount > 0 ? 'prototype-agent-01' : null);
        setLocalOverlays(initialLocalOverlays(mode));
        setPaused(false);
        setFeedback(mode === 'debug' ? 'Add an agent, then click the office to send it there.' : `Ambient team running with ${ambientCount} agents.`);
    }, [ambientCount, graph, mode]);

    const scheduleAmbient = useCallback((current: readonly PrototypeAgent[], deltaMs: number) => {
        if (mode !== 'ambient' && !autoMovement) return current;
        const runtimeGraph = { ...graph, agents: current.map(agent => agent.fixture) };
        return current.map((agent, index) => {
            if (agent.movementState === 'walking' || agent.movementState === 'paused') return agent;
            const remaining = agent.activityUntil - deltaMs;
            if (remaining > 0 && agent.movementState !== 'arrived') return { ...agent, activityUntil: remaining };
            const activity = nextAmbientActivity(index, agent.revision + 1);
            if (activity === 'moving-to-task') {
                const target = ambientPrototypeTarget(graph, agent, index + agent.revision);
                const plan = target ? planPrototypeRouteToPoint(runtimeGraph, agent, target) : null;
                if (plan && plan.route.length > 20) return { ...startPrototypeRoute(agent, plan), activityUntil: 0 };
            }
            return {
                ...agent,
                route: null,
                progress: 0,
                movementState: 'idle' as const,
                activityState: activity === 'moving-to-task' ? 'idle' : activity,
                targetPoint: null,
                clickedPoint: null,
                activityUntil: 4_500 + ((index + agent.revision) % 6) * 1_250,
                revision: agent.revision + 1,
            };
        });
    }, [autoMovement, graph, mode]);

    useEffect(() => {
        if (!active || paused || agents.length === 0) {
            if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
            lastTimestampRef.current = null;
            return undefined;
        }
        const tick = (timestamp: number) => {
            const last = lastTimestampRef.current;
            lastTimestampRef.current = timestamp;
            const delta = last === null ? 0 : Math.min(100, timestamp - last);
            setAgents(previous => scheduleAmbient(
                advancePrototypeAgents(previous, delta, BASE_SPEED_PX_PER_SECOND * playbackSpeed, false, doorRuntimes),
                delta,
            ));
            frameRef.current = requestAnimationFrame(tick);
        };
        frameRef.current = requestAnimationFrame(tick);
        return () => {
            if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
            lastTimestampRef.current = null;
        };
    }, [active, agents.length, doorRuntimes, paused, playbackSpeed, scheduleAmbient]);

    useEffect(() => {
        if (!active) return;
        const cancel = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            setFeedback('Command canceled. Click an agent to select it.');
            setAgents(previous => previous.map(agent => agent.fixture.id === selectedAgentId && agent.movementState !== 'walking'
                ? { ...agent, clickedPoint: null, targetPoint: null }
                : agent));
        };
        window.addEventListener('keydown', cancel);
        return () => window.removeEventListener('keydown', cancel);
    }, [active, selectedAgentId]);

    const setAgentCount = (count: number) => {
        const bounded = Math.max(0, Math.min(PROTOTYPE_AGENT_LIMIT, count));
        setAgents(previous => mergeAgentCount(graph, previous, bounded));
        if (bounded === 0) setSelectedAgentId(null);
        else if (!selectedAgentId || Number(selectedAgentId.slice(-2)) > bounded) setSelectedAgentId(`prototype-agent-${String(bounded).padStart(2, '0')}`);
    };

    const addAgents = (count: number) => {
        if (atLimit) return;
        const nextCount = Math.min(PROTOTYPE_AGENT_LIMIT, agents.length + count);
        setAgentCount(nextCount);
        const addedId = `prototype-agent-${String(agents.length + 1).padStart(2, '0')}`;
        setSelectedAgentId(addedId);
        setFeedback(nextCount === PROTOTYPE_AGENT_LIMIT
            ? '25-agent limit reached.'
            : `${count === 1 ? `Agent ${String(agents.length + 1).padStart(2, '0')}` : `${nextCount - agents.length} agents`} added and selected. Click the office to move it.`);
    };

    const removeSelected = () => {
        if (!selectedAgentId) return;
        setAgents(previous => previous.filter(agent => agent.fixture.id !== selectedAgentId));
        const remaining = agents.filter(agent => agent.fixture.id !== selectedAgentId);
        setSelectedAgentId(remaining[0]?.fixture.id ?? null);
        setFeedback('Selected agent removed.');
    };

    const clearAgents = () => {
        setAgents([]);
        setSelectedAgentId(null);
        setFeedback('All agents removed.');
    };

    const resetAgents = () => {
        const count = mode === 'ambient' ? ambientCount : agents.length;
        setAgents(createPrototypeAgents(graph, count, mode));
        setSelectedAgentId(count > 0 ? 'prototype-agent-01' : null);
        setPaused(false);
        setFeedback(mode === 'ambient' ? 'Ambient simulation reset deterministically.' : 'Agents reset to deterministic spawn nodes.');
    };

    const stopSelected = () => {
        if (!selectedAgentId) return;
        setAgents(previous => previous.map(agent => agent.fixture.id === selectedAgentId
            ? { ...agent, route: null, progress: 0, movementState: 'stopped', activityState: 'idle', targetPoint: null, clickedPoint: null, revision: agent.revision + 1 }
            : agent));
        setFeedback('Selected agent stopped.');
    };

    const toggleLocalOverlay = (key: keyof LocalOverlays) => setLocalOverlays(previous => ({ ...previous, [key]: !previous[key] }));

    const toggleAllOverlays = () => {
        if (anyDiagnosticOverlay) {
            previousOverlayRef.current = { layers: new Set(visibleLayers), local: localOverlays };
            onSetVisibleLayers(new Set());
            setLocalOverlays(NO_LOCAL_OVERLAYS);
            return;
        }
        const previous = previousOverlayRef.current;
        onSetVisibleLayers(previous?.layers ?? new Set(SOURCE_LAYERS));
        setLocalOverlays(previous?.local ?? ALL_LOCAL_OVERLAYS);
    };

    const handleMapClick = (event: MouseEvent<HTMLDivElement>) => {
        if (mode !== 'debug') return;
        if (!selectedAgent) {
            setFeedback('Add or select an agent before choosing a destination.');
            return;
        }
        const rect = event.currentTarget.getBoundingClientRect();
        const scale = rect.width / 8192;
        const clickedPoint = { x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale };
        const runtimeGraph = { ...graph, agents: agents.map(agent => agent.fixture) };
        const plan = planPrototypeRouteToPoint(runtimeGraph, selectedAgent, clickedPoint);
        if (!plan) {
            setFeedback('No reachable path near clicked location.');
            return;
        }
        setAgents(previous => previous.map(agent => agent.fixture.id === selectedAgent.fixture.id ? startPrototypeRoute(agent, plan) : agent));
        setFeedback(plan.snapDistance > 20
            ? `Walking now. Target snapped ${Math.round(plan.snapDistance)}px to reachable navigation.`
            : 'Walking now on the navigation graph.');
    };

    const resetSelected = () => {
        if (!selectedAgentId) return;
        setAgents(previous => previous.map(agent => agent.fixture.id === selectedAgentId ? resetPrototypeAgent(agent) : agent));
        setFeedback('Selected agent returned to its deterministic spawn.');
    };

    const advancedDetails = (
        <details className="prototype-advanced">
            <summary>Advanced diagnostics</summary>
            <dl>
                <dt>Graph</dt><dd>{graph.nodeCount} nodes · {graph.edgeCount} edges</dd>
                <dt>Transform</dt><dd>zoom {transform.scale.toFixed(3)} · pan {Math.round(transform.x)}, {Math.round(transform.y)}</dd>
                <dt>Viewport</dt><dd>{Math.round(viewport.width)} × {Math.round(viewport.height)}</dd>
                <dt>Pointer</dt><dd>{coordinate(pointer)}</dd>
                <dt>Agent node</dt><dd>{selectedAgent?.currentNodeId ?? 'none'}</dd>
                <dt>Route</dt><dd>{selectedAgent?.route ? `${selectedAgent.route.nodeSequence.length} nodes · ${selectedAgent.route.length}px · ${selectedAgent.route.crossedDoorIds.join(', ') || 'no doors'}` : 'none'}</dd>
                <dt>Door policy</dt><dd>{PROTOTYPE_DOOR_POLICY} · {graph.doors.length}/{graph.doors.length} open</dd>
                <dt>Last message</dt><dd>{feedback}</dd>
                <dt>Limitation</dt><dd>Dynamic agent-to-agent avoidance is future work.</dd>
            </dl>
        </details>
    );

    const debugControls = panelCollapsed ? (
        <button type="button" className="prototype-panel-reopen" onClick={() => setPanelCollapsed(false)}>Open debugger</button>
    ) : (
        <section
            className="floor1-candidate-controls prototype-debug-panel"
            aria-label="Agent simulation controls"
            onClick={event => event.stopPropagation()}
            onWheelCapture={event => event.stopPropagation()}
            onPointerDownCapture={event => event.stopPropagation()}
            onPointerMoveCapture={event => event.stopPropagation()}
            onPointerUpCapture={event => event.stopPropagation()}
        >
            <header className="prototype-panel-header">
                <div><h2>Agent Simulation</h2><p>{agents.length} active · {movingCount} moving</p></div>
                <button type="button" aria-label="Collapse debugger panel" onClick={() => setPanelCollapsed(true)}>Collapse</button>
            </header>
            <p className="prototype-warning"><strong>Candidate sandbox</strong> · unverified geometry and routing.</p>
            <p className="prototype-door-policy">Prototype mode: all doors forced open for simulation.</p>
            <p className="prototype-feedback" role="status" aria-live="polite">{feedback}</p>

            <section className="prototype-panel-section">
                <h3>Quick actions</h3>
                <div className="prototype-action-grid">
                    <button type="button" onClick={() => addAgents(1)} disabled={atLimit}>Add agent</button>
                    <button type="button" onClick={() => addAgents(5)} disabled={atLimit}>Add 5</button>
                    <button type="button" onClick={() => addAgents(10)} disabled={atLimit}>Add 10</button>
                    <button type="button" className="prototype-destructive" onClick={clearAgents} disabled={agents.length === 0}>Clear agents</button>
                    <button type="button" onClick={toggleAllOverlays}>{anyDiagnosticOverlay ? 'Hide all overlays' : 'Show all overlays'}</button>
                    <button type="button" onClick={onFitOffice}>Fit office</button>
                    <button type="button" onClick={() => setPaused(value => !value)} disabled={agents.length === 0}>{paused ? 'Resume all' : 'Pause all'}</button>
                    <button type="button" onClick={resetAgents} disabled={agents.length === 0}>Reset agents</button>
                </div>
                {atLimit && <p className="prototype-limit" role="status">25-agent limit reached</p>}
            </section>

            <section className="prototype-panel-section">
                <h3>Selected agent</h3>
                {selectedAgent ? <>
                    <label className="prototype-field">Agent
                        <select aria-label="Selected agent" value={selectedAgent.fixture.id} onChange={event => setSelectedAgentId(event.target.value)}>
                            {agents.map(agent => <option key={agent.fixture.id} value={agent.fixture.id}>{agent.fixture.label}</option>)}
                        </select>
                    </label>
                    <div className="prototype-selected-summary">
                        <strong>{selectedAgent.fixture.label}</strong><span>{selectedStatus(selectedAgent)}</span>
                        <small>{coordinate(selectedAgent.point)} · {selectedAgent.fixture.roomName}</small>
                    </div>
                    <div className="prototype-inline-actions">
                        <button type="button" onClick={stopSelected}>Stop</button>
                        <button type="button" onClick={() => onFocusPoint(selectedAgent.point)}>Focus</button>
                        <button type="button" onClick={resetSelected}>Reset</button>
                        <button type="button" className="prototype-destructive" onClick={removeSelected}>Remove</button>
                    </div>
                </> : <p className="prototype-muted">No agent selected. Add an agent to begin.</p>}
            </section>

            <section className="prototype-panel-section">
                <h3>Simulation settings</h3>
                <label className="prototype-field">Agent count
                    <input aria-label="Agent count" type="number" min="0" max={PROTOTYPE_AGENT_LIMIT} value={agents.length} onChange={event => setAgentCount(Number(event.target.value))} />
                </label>
                <label className="prototype-field">Global speed · {playbackSpeed.toFixed(1)}×
                    <input aria-label="Global speed" type="range" min="0.5" max="3" step="0.5" value={playbackSpeed} onChange={event => setPlaybackSpeed(Number(event.target.value))} />
                </label>
                <label className="prototype-check"><input type="checkbox" checked={autoMovement} onChange={event => setAutoMovement(event.target.checked)} /> Automatic movement</label>
            </section>

            <section className="prototype-panel-section">
                <div className="prototype-section-heading"><h3>Overlays</h3><button type="button" onClick={toggleAllOverlays}>{anyDiagnosticOverlay ? 'Hide all' : 'Show all'}</button></div>
                <div className="prototype-overlay-grid">
                    {FLOOR1_CANDIDATE_LAYER_CONTROLS.map(control => (
                        <label key={control.category}><input type="checkbox" checked={visibleLayers.has(control.layer)} onChange={() => {
                            const next = new Set(visibleLayers);
                            if (next.has(control.layer)) next.delete(control.layer); else next.add(control.layer);
                            onSetVisibleLayers(next);
                        }} /> {control.label}</label>
                    ))}
                    {([
                        ['nodes', 'Navigation nodes'], ['edges', 'Navigation edges'], ['colliders', 'Modeled colliders'], ['doors', 'Open door state'],
                        ['routes', 'Route previews'], ['destinations', 'Destinations'], ['labels', 'Agent labels'], ['agentBounds', 'Agent debug bounds'],
                    ] as const).map(([key, label]) => <label key={key}><input type="checkbox" checked={localOverlays[key]} onChange={() => toggleLocalOverlay(key)} /> {label}</label>)}
                </div>
            </section>
            {advancedDetails}
        </section>
    );

    const ambientControls = (
        <section className="prototype-office-toolbar" aria-label="Office Engine simulation controls">
            <div className="prototype-toolbar-actions">
                <button type="button" onClick={() => setPaused(value => !value)}>{paused ? 'Resume' : 'Pause'}</button>
                <button type="button" onClick={resetAgents}>Reset simulation</button>
                <span className="prototype-count-label">Agents</span>
                {PROTOTYPE_AMBIENT_COUNTS.map(count => <button key={count} type="button" aria-pressed={ambientCount === count} onClick={() => setAmbientCount(count)}>{count}</button>)}
                <label>Speed <input aria-label="Simulation speed" type="range" min="0.5" max="2" step="0.5" value={playbackSpeed} onChange={event => setPlaybackSpeed(Number(event.target.value))} /></label>
                <button type="button" onClick={onFitOffice}>Fit office</button>
                <button type="button" onClick={onOpenDebugger}>Open debugger</button>
            </div>
            <div className="prototype-ambient-status" role="status">{agents.length} agents · {movingCount} walking · {workingCount} working · {talkingCount} talking</div>
            <p className="prototype-door-policy">Prototype mode: all doors forced open for simulation.</p>
        </section>
    );

    const selectedRoute = selectedAgent?.route;
    return (
        <div
            className={`floor1-candidate-simulation floor1-candidate-simulation--${mode} ${reducedMotion ? 'floor1-candidate-simulation--reduced-motion' : ''}`}
            aria-label={mode === 'ambient' ? 'Ambient office simulation' : 'Agent navigation simulation'}
            onClick={handleMapClick}
            onContextMenu={event => {
                event.preventDefault();
                setFeedback('Command canceled.');
            }}
        >
            {localOverlays.colliders && (
                <svg className="floor1-candidate-debug floor1-candidate-debug--colliders" aria-hidden="true">
                    {graph.colliders.slice(0, 260).map(collider => collider.closed
                        ? <polygon key={collider.id} points={collider.points.map(point => `${point.x},${point.y}`).join(' ')} strokeWidth={collider.thickness} />
                        : <polyline key={collider.id} points={collider.points.map(point => `${point.x},${point.y}`).join(' ')} strokeWidth={collider.thickness} fill="none" strokeLinecap="round" strokeLinejoin="round" />)}
                </svg>
            )}
            {(localOverlays.nodes || localOverlays.edges || localOverlays.doors) && (
                <svg className="floor1-candidate-debug floor1-candidate-debug--graph" aria-hidden="true">
                    {localOverlays.edges && graph.walkSegments.map(segment => <line key={segment.id} className="edge" x1={segment.a.x} y1={segment.a.y} x2={segment.b.x} y2={segment.b.y} />)}
                    {localOverlays.nodes && graph.walkNodes.map(node => <circle key={node.id} className="node" cx={node.point.x} cy={node.point.y} r="18" />)}
                    {localOverlays.doors && graph.doors.map(door => <g key={door.id} data-door-id={door.id} data-door-state="open"><circle className="door door--open" cx={door.point.x} cy={door.point.y} r="32" />{localOverlays.labels && <text x={door.point.x + 38} y={door.point.y}>{door.id}</text>}</g>)}
                </svg>
            )}
            {localOverlays.routes && selectedRoute?.status === 'valid' && (
                <svg className="floor1-candidate-route" aria-label="Selected agent route">
                    <polyline points={selectedRoute.points.map(point => `${point.x},${point.y}`).join(' ')} />
                </svg>
            )}
            {localOverlays.destinations && selectedAgent?.clickedPoint && (
                <svg className={`floor1-candidate-destination ${selectedAgent.movementState === 'arrived' ? 'floor1-candidate-destination--arrived' : ''}`} aria-label="Clicked destination marker">
                    <circle cx={selectedAgent.clickedPoint.x} cy={selectedAgent.clickedPoint.y} r="46" />
                    {selectedAgent.targetPoint && <circle className="snapped" cx={selectedAgent.targetPoint.x} cy={selectedAgent.targetPoint.y} r="24" />}
                </svg>
            )}
            <div className="prototype-agent-layer">
                {agents.map((agent, index) => (
                    <PrototypeAgentRenderer
                        key={agent.fixture.id}
                        agent={agent}
                        selected={selectedAgentId === agent.fixture.id}
                        transformScale={transform.scale}
                        showLabel={mode === 'debug' ? localOverlays.labels : false}
                        showBounds={localOverlays.agentBounds}
                        visualOffsetIndex={index % 3 === 0 ? 0 : index % 3}
                        onSelect={agentId => {
                            setSelectedAgentId(agentId);
                            setFeedback(`${agents.find(item => item.fixture.id === agentId)?.fixture.label ?? 'Agent'} selected.`);
                        }}
                    />
                ))}
            </div>
            {!graph.navigationAvailable && <div className="floor1-candidate-unavailable" role="alert">{graph.unavailableReason ?? 'Candidate navigation unavailable.'}</div>}
            {controlHost ? createPortal(mode === 'ambient' ? ambientControls : debugControls, controlHost) : mode === 'ambient' ? ambientControls : debugControls}
        </div>
    );
}
