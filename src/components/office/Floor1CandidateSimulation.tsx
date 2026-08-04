import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import rooms from '../../office/data/floor1/provisional/rooms.json';
import positions from '../../office/data/floor1/provisional/positions.json';
import doors from '../../office/data/floor1/provisional/doors.json';
import computers from '../../office/data/floor1/provisional/computers.json';
import interactiveObjects from '../../office/data/floor1/provisional/interactive-objects.json';
import walls from '../../office/data/floor1/provisional/walls.json';
import objects from '../../office/data/floor1/provisional/objects.json';
import walkPaths from '../../office/data/floor1/provisional/walk-paths.json';
import { AGENT_SPRITE_MANIFEST } from '../../office/sprites/manifest';
import { SpriteSurfaceRuntime } from '../../office/sprites/runtime';
import { FLOOR1_CANDIDATE_LAYER_CONTROLS } from '../../office/floor1/candidateReview';
import {
    activeCandidateDoorRequestIds,
    activeCandidateDoorStep,
    isCandidatePausableStatus,
    isCandidateAdvancingStatus,
    advanceCandidateAgents,
    advanceCandidateDoorRuntimes,
    buildCandidateSandboxGraph,
    buildCandidateNavigationGraph,
    CandidateAgentFixture,
    CandidateDestinationKind,
    CandidateDoorRuntime,
    CandidateNavigationGraph,
    CandidateRouteResult,
    MarkupRegistration,
    planCandidateRoute,
} from '../../office/floor1/navigation/candidateNavigation';
import type { OfficeLayer, Point, ViewTransform, ViewportSize } from '../../office/types';
import { SpritePlayer } from './SpritePlayer';
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
    onToggleLayer?: (layer: OfficeLayer) => void;
    onFitOffice?: () => void;
    onFocusPoint?: (point: Point) => void;
}>;

type AgentRuntime = Readonly<{
    fixture: CandidateAgentFixture;
    point: Point;
    status: 'idle' | 'walking' | 'waiting_for_door' | 'crossing_door' | 'paused' | 'arrived' | 'blocked';
    route: CandidateRouteResult | null;
    progress: number;
    revision: number;
    pausedFromStatus?: 'walking' | 'waiting_for_door' | 'crossing_door' | 'canceling_clearance';
}>;

type RoutePreview = Readonly<{
    agentId: string;
    destinationId: string;
    startPoint: Point;
    agentRevision: number;
    result: CandidateRouteResult;
}>;

const REVIEW_SPEED_PX_PER_SECOND = 120;
const PREVIEW_START_TOLERANCE = 0.5;
const CANDIDATE_DOCUMENTS = { rooms, positions, doors, computers, interactiveObjects, walls, objects, walkPaths } as const;
const SANDBOX_GRAPH_CACHE = new WeakMap<object, CandidateNavigationGraph>();

function candidateGraph(registration?: MarkupRegistration): CandidateNavigationGraph {
    if (!registration) return buildCandidateNavigationGraph(CANDIDATE_DOCUMENTS);
    const cached = SANDBOX_GRAPH_CACHE.get(registration);
    if (cached) return cached;
    const graph = buildCandidateSandboxGraph(CANDIDATE_DOCUMENTS, registration);
    SANDBOX_GRAPH_CACHE.set(registration, graph);
    return graph;
}
const DESTINATION_KIND_LABELS: Readonly<Record<CandidateDestinationKind | 'standard-position' | 'priority-position', string>> = {
    room: 'Rooms',
    computer: 'Computers',
    'interactive-object': 'Interactive objects',
    position: 'All positions',
    waypoint: 'Review waypoints',
    'standard-position': 'Standard positions',
    'priority-position': 'Priority positions',
};

type DestinationFilter = keyof typeof DESTINATION_KIND_LABELS;

function distance(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function selectedRouteLabel(preview: RoutePreview | null): string {
    if (!preview) return 'No route previewed.';
    const route = preview.result;
    return `${route.status}: ${route.reason} Length ${route.length}px; expanded ${route.expandedNodeCount}; doors ${route.crossedDoorIds.join(', ') || 'none'}.`;
}

function previewIsStartValid(agent: AgentRuntime | null, preview: RoutePreview | null, destinationId: string): boolean {
    return !!agent && !!preview
        && preview.agentId === agent.fixture.id
        && preview.destinationId === destinationId
        && preview.agentRevision === agent.revision
        && preview.result.status === 'valid'
        && distance(preview.startPoint, agent.point) <= PREVIEW_START_TOLERANCE;
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
    onToggleLayer = () => undefined,
    onFitOffice = () => undefined,
    onFocusPoint = () => undefined,
}: Props) {
    const graph = useMemo(() => candidateGraph(registration), [registration]);
    const [runtime] = useState(() => new SpriteSurfaceRuntime());
    const [agents, setAgents] = useState<readonly AgentRuntime[]>(() => graph.agents.map(fixture => ({
        fixture,
        point: fixture.point,
        status: 'idle',
        route: null,
        progress: 0,
        revision: 0,
    })));
    const [doorRuntimes, setDoorRuntimes] = useState<Readonly<Record<string, CandidateDoorRuntime>>>(() => Object.fromEntries(graph.doors.map(door => [door.id, {
        doorId: door.id,
        state: door.currentState ?? 'closed',
        stateElapsedMs: 0,
        revision: 0,
    }])));
    const agentsRef = useRef<readonly AgentRuntime[]>(agents);
    const doorRuntimesRef = useRef<Readonly<Record<string, CandidateDoorRuntime>>>(doorRuntimes);
    const initialFixture = graph.agents[0];
    const initialSelection = useMemo(() => {
        if (!initialFixture || !graph.navigationAvailable) return null;
        for (const destination of graph.destinations) {
            if (destination.id === `position:${initialFixture.positionId}`) continue;
            const result = planCandidateRoute(graph, { destinationId: destination.id, agent: { id: initialFixture.id, currentPoint: initialFixture.point, revision: 0 } });
            if (result.status === 'valid' && result.length > 180) return { destination, result };
        }
        const destination = graph.destinations.find(item => item.id === `position:${initialFixture.positionId}`) ?? graph.destinations[0];
        if (!destination) return null;
        return { destination, result: planCandidateRoute(graph, { destinationId: destination.id, agent: { id: initialFixture.id, currentPoint: initialFixture.point, revision: 0 } }) };
    }, [graph, initialFixture]);
    const [selectedAgentId, setSelectedAgentId] = useState(graph.agents[0]?.id ?? null);
    const [destinationFilter, setDestinationFilter] = useState<DestinationFilter>((initialSelection?.destination.kind ?? 'position') as DestinationFilter);
    const [destinationSearch, setDestinationSearch] = useState('');
    const destinationsForFilter = useMemo(() => graph.destinations.filter(destination => {
        if (destinationFilter === 'standard-position') return destination.kind === 'position' && destination.accessTier === 'standard';
        if (destinationFilter === 'priority-position') return destination.kind === 'position' && destination.accessTier === 'priority';
        return destination.kind === destinationFilter;
    }).filter(destination => `${destination.label} ${destination.roomName} ${destination.id}`.toLowerCase().includes(destinationSearch.toLowerCase())).slice(0, 240), [destinationFilter, destinationSearch, graph.destinations]);
    const initialDestinationId = initialSelection?.destination.id ?? '';
    const [destinationId, setDestinationId] = useState(initialDestinationId);
    const [preview, setPreview] = useState<RoutePreview | null>(() => {
        const fixture = initialFixture;
        if (!fixture || !initialDestinationId || !graph.navigationAvailable) return null;
        return { agentId: fixture.id, destinationId: initialDestinationId, startPoint: fixture.point, agentRevision: 0, result: initialSelection!.result };
    });
    const [showNodes, setShowNodes] = useState(true);
    const [showEdges, setShowEdges] = useState(true);
    const [showDoors, setShowDoors] = useState(true);
    const [showColliders, setShowColliders] = useState(false);
    const [showRoute, setShowRoute] = useState(true);
    const [showDestination, setShowDestination] = useState(true);
    const [showAgentLabels, setShowAgentLabels] = useState(true);
    const [showAgentBounds, setShowAgentBounds] = useState(false);
    const [showAllFixtures, setShowAllFixtures] = useState(false);
    const [selectedDoorId, setSelectedDoorId] = useState(graph.doors[0]?.id ?? '');
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const frameRef = useRef<number | null>(null);
    const lastTimestampRef = useRef<number | null>(null);
    const controlsRef = useRef<HTMLElement>(null);

    const selectedAgent = agents.find(agent => agent.fixture.id === selectedAgentId) ?? agents[0] ?? null;
    const defaultDemoAgentIds = useMemo(() => {
        const first = graph.agents[0];
        if (!first) return new Set<string>();
        const distant = graph.agents.reduce((best, candidate) => distance(first.point, candidate.point) > distance(first.point, best.point) ? candidate : best, first);
        return new Set([first.id, distant.id]);
    }, [graph.agents]);
    const renderedAgents = showAllFixtures
        ? agents
        : agents.filter(agent => defaultDemoAgentIds.has(agent.fixture.id) || agent.fixture.id === selectedAgentId);
    const selectedDestination = graph.destinations.find(destination => destination.id === destinationId) ?? null;
    const selectedDoor = graph.doors.find(door => door.id === selectedDoorId) ?? null;
    const anyWalking = agents.some(agent => agent.status === 'walking' || agent.status === 'waiting_for_door' || agent.status === 'crossing_door');
    const beginEnabled = previewIsStartValid(selectedAgent, preview, destinationId);

    useEffect(() => { agentsRef.current = agents; }, [agents]);
    useEffect(() => { doorRuntimesRef.current = doorRuntimes; }, [doorRuntimes]);
    useEffect(() => {
        if (controlsRef.current) controlsRef.current.scrollTop = 0;
    }, [presentation]);

    useEffect(() => {
        runtime.setActive(active && !document.hidden);
        const handleVisibility = () => {
            runtime.setActive(active && !document.hidden);
            lastTimestampRef.current = null;
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [active, runtime]);

    useEffect(() => () => {
        runtime.dispose();
        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    }, [runtime]);

    useEffect(() => {
        if (!active || !anyWalking) {
            if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
            lastTimestampRef.current = null;
            return undefined;
        }
        const tick = (timestamp: number) => {
            const last = lastTimestampRef.current;
            lastTimestampRef.current = timestamp;
            const delta = last === null ? 0 : (timestamp - last) * playbackSpeed;
            const requestingDoorIds = activeCandidateDoorRequestIds(agentsRef.current, graph.doors);
            setDoorRuntimes(previous => {
                const nextDoorRuntimes = advanceCandidateDoorRuntimes(previous, requestingDoorIds, delta);
                doorRuntimesRef.current = nextDoorRuntimes;
                return nextDoorRuntimes;
            });
            setAgents(previous => {
                const currentDoorRuntimes = doorRuntimesRef.current;
                const resumed = previous.map(agent => {
                    if (agent.status !== 'waiting_for_door' || !agent.route) return agent;
                    const activeStep = activeCandidateDoorStep(agent)?.step;
                    const ready = activeStep ? currentDoorRuntimes[activeStep.doorId]?.state === 'open' : false;
                    return ready ? { ...agent, status: 'walking' as const } : agent;
                });
                const nextAgents = advanceCandidateAgents(resumed, delta, REVIEW_SPEED_PX_PER_SECOND, currentDoorRuntimes) as readonly AgentRuntime[];
                agentsRef.current = nextAgents;
                return nextAgents;
            });
            frameRef.current = requestAnimationFrame(tick);
        };
        frameRef.current = requestAnimationFrame(tick);
        return () => {
            if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
            lastTimestampRef.current = null;
        };
    }, [active, anyWalking, graph.doors, playbackSpeed]);

    useEffect(() => {
        if (!destinationsForFilter.some(destination => destination.id === destinationId)) {
            setDestinationId(destinationsForFilter[0]?.id ?? '');
            setPreview(null);
        }
    }, [destinationId, destinationsForFilter]);

    const updateSelectedAgent = (agentId: string) => {
        setSelectedAgentId(agentId);
        setPreview(null);
    };

    const updateDestination = (nextDestinationId: string) => {
        setDestinationId(nextDestinationId);
        setPreview(null);
    };

    const previewRoute = () => {
        if (!selectedAgent || !destinationId) return;
        const result = planCandidateRoute(graph, {
            destinationId,
            agent: { id: selectedAgent.fixture.id, currentPoint: selectedAgent.point, revision: selectedAgent.revision },
        });
        setPreview({
            agentId: selectedAgent.fixture.id,
            destinationId,
            startPoint: selectedAgent.point,
            agentRevision: selectedAgent.revision,
            result,
        });
    };

    const startMovement = () => {
        if (!selectedAgent || !beginEnabled || !preview) return;
        const route = planCandidateRoute(graph, {
            destinationId,
            agent: { id: selectedAgent.fixture.id, currentPoint: selectedAgent.point, revision: selectedAgent.revision },
        });
        if (route.status !== 'valid') {
            setPreview({ ...preview, result: route });
            return;
        }
        setAgents(previous => previous.map(agent => {
            if (agent.fixture.id !== selectedAgent.fixture.id) return agent;
            if (agent.revision !== preview.agentRevision || distance(agent.point, preview.startPoint) > PREVIEW_START_TOLERANCE) return agent;
            return { ...agent, route, status: 'walking', progress: 0, revision: agent.revision + 1 };
        }));
        setPreview(null);
    };

    const pauseSelected = () => {
        setAgents(previous => previous.map(agent => agent.fixture.id === selectedAgentId && isCandidatePausableStatus(agent.status)
            ? { ...agent, pausedFromStatus: agent.status as 'walking' | 'waiting_for_door' | 'crossing_door' | 'canceling_clearance', status: 'paused', revision: agent.revision + 1 }
            : agent));
        setPreview(null);
    };

    const resumeSelected = () => {
        setAgents(previous => previous.map(agent => {
            if (agent.fixture.id !== selectedAgentId || agent.status !== 'paused') return agent;
            const restored = agent.pausedFromStatus === 'waiting_for_door'
                ? (activeCandidateDoorStep(agent)?.step && doorRuntimes[activeCandidateDoorStep(agent)!.step.doorId]?.state === 'open' ? 'walking' : 'waiting_for_door')
                : agent.pausedFromStatus === 'crossing_door' ? 'crossing_door' : 'walking';
            return { ...agent, status: restored, pausedFromStatus: undefined, revision: agent.revision + 1 };
        }));
    };

    const resetSelected = () => {
        setAgents(previous => previous.map(agent => agent.fixture.id === selectedAgentId
            ? { ...agent, point: agent.fixture.point, status: 'idle', route: null, progress: 0, revision: agent.revision + 1 }
            : agent));
        setPreview(null);
    };

    const route = preview?.result ?? selectedAgent?.route ?? null;
    const routeStatus = selectedAgent?.status === 'walking' ? 'Moving'
        : selectedAgent?.status === 'paused' ? 'Paused'
            : selectedAgent?.status === 'arrived' ? 'Arrived'
                : route?.status === 'valid' ? 'Route ready'
                    : route ? 'No route available' : 'Reset';

    const unavailableNotice = !graph.navigationAvailable ? (
        <div className="floor1-candidate-unavailable" role="status">
            {graph.unavailableReason ?? 'Candidate navigation unavailable.'}
        </div>
    ) : null;

    const controls = (
        <section
            ref={controlsRef}
            className="floor1-candidate-controls"
            aria-label="Candidate navigation review controls"
            onWheelCapture={event => event.stopPropagation()}
            onPointerDownCapture={event => event.stopPropagation()}
            onPointerMoveCapture={event => event.stopPropagation()}
            onPointerUpCapture={event => event.stopPropagation()}
            onTouchStartCapture={event => event.stopPropagation()}
            onTouchMoveCapture={event => event.stopPropagation()}
        >
                <div className="floor1-candidate-panel-heading">
                    <div>
                        <p className="eyebrow">{presentation === 'inspection' ? 'Office inspector' : 'Route lab'}</p>
                        <h2>{presentation === 'inspection' ? 'Floor 1 debugger' : 'Agent simulation'}</h2>
                    </div>
                    <button type="button" onClick={onFitOffice}>Fit office</button>
                </div>
                <p className="floor1-candidate-verification">Unverified sandbox: provisional geometry and routing are not production approved.</p>
                <p className="floor1-candidate-route-status" role="status" aria-live="polite"><strong>{routeStatus}</strong> - {selectedRouteLabel(preview)}</p>
                <label>
                    Agent
                    <select value={selectedAgentId ?? ''} onChange={event => updateSelectedAgent(event.target.value)}>
                        {agents.map(agent => <option key={agent.fixture.id} value={agent.fixture.id}>{agent.fixture.label} — {agent.fixture.roomName}</option>)}
                    </select>
                </label>
                <label>
                    Destination category
                    <select value={destinationFilter} onChange={event => {
                        setDestinationFilter(event.target.value as DestinationFilter);
                        setPreview(null);
                    }}>
                        {Object.entries(DESTINATION_KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                </label>
                <label>
                    Search destinations
                    <input value={destinationSearch} onChange={event => { setDestinationSearch(event.target.value); setPreview(null); }} placeholder="Filter by ID, label, or room" />
                </label>
                <label>
                    Destination
                    <select value={destinationId} onChange={event => updateDestination(event.target.value)}>
                        {destinationsForFilter.map(destination => <option key={destination.id} value={destination.id}>{destination.kind}: {destination.label} — {destination.roomName}</option>)}
                    </select>
                </label>
                <div className="floor1-candidate-actions">
                    <button type="button" onClick={previewRoute}>Preview route</button>
                    <button type="button" onClick={startMovement} disabled={!beginEnabled}>Begin movement</button>
                    <button type="button" onClick={pauseSelected}>Pause</button>
                    <button type="button" onClick={resumeSelected}>Resume</button>
                    <button type="button" onClick={resetSelected}>Reset</button>
                    <button type="button" onClick={() => selectedDestination && onFocusPoint(selectedDestination.markerPoint ?? selectedDestination.point)} disabled={!selectedDestination}>Focus destination</button>
                </div>
                <label>
                    Playback speed: {playbackSpeed}×
                    <select aria-label="Playback speed" value={playbackSpeed} onChange={event => setPlaybackSpeed(Number(event.target.value))}>
                        {[0.25, 0.5, 1, 2, 4].map(speed => <option key={speed} value={speed}>{speed}×</option>)}
                    </select>
                </label>
                <fieldset>
                    <legend>Debug overlays</legend>
                    <div className="floor1-candidate-layer-grid">
                        {FLOOR1_CANDIDATE_LAYER_CONTROLS.map(control => (
                            <label key={control.category}><input type="checkbox" checked={visibleLayers.has(control.layer)} onChange={() => onToggleLayer(control.layer)} /> {control.label}</label>
                        ))}
                        <label><input type="checkbox" checked={showNodes} onChange={event => setShowNodes(event.target.checked)} /> Navigation nodes</label>
                        <label><input type="checkbox" checked={showEdges} onChange={event => setShowEdges(event.target.checked)} /> Navigation edges</label>
                        <label><input type="checkbox" checked={showDoors} onChange={event => setShowDoors(event.target.checked)} /> Graph doors</label>
                        <label><input type="checkbox" checked={showRoute} onChange={event => setShowRoute(event.target.checked)} /> Agent routes</label>
                        <label><input type="checkbox" checked={showDestination} onChange={event => setShowDestination(event.target.checked)} /> Destination markers</label>
                        <label><input type="checkbox" checked={showAgentLabels} onChange={event => setShowAgentLabels(event.target.checked)} /> Agent labels</label>
                        <label><input type="checkbox" checked={showAgentBounds} onChange={event => setShowAgentBounds(event.target.checked)} /> Agent collision bounds</label>
                        <label><input type="checkbox" checked={showColliders} onChange={event => setShowColliders(event.target.checked)} /> Modeled colliders</label>
                    </div>
                </fieldset>
                <fieldset>
                    <legend>Door runtime</legend>
                    {graph.doors.slice(0, 5).map(door => (
                        <label key={door.id}>
                            {door.id} · {door.permission}
                            <select
                                aria-label={`${door.id} runtime state`}
                                value={doorRuntimes[door.id]?.state ?? door.currentState ?? 'closed'}
                                onChange={event => setDoorRuntimes(previous => ({
                                    ...previous,
                                    [door.id]: {
                                        doorId: door.id,
                                        state: event.target.value as CandidateDoorRuntime['state'],
                                        stateElapsedMs: 0,
                                        revision: (previous[door.id]?.revision ?? 0) + 1,
                                    },
                                }))}
                            >
                                <option value="closed">Closed</option>
                                <option value="open">Open</option>
                                <option value="unavailable">Unavailable</option>
                            </select>
                        </label>
                    ))}
                </fieldset>
                <fieldset>
                    <legend>Inspect any door</legend>
                    <label>Door
                        <select aria-label="Inspect door" value={selectedDoorId} onChange={event => setSelectedDoorId(event.target.value)}>
                            {graph.doors.map(door => <option key={door.id} value={door.id}>{door.id} - {door.permission}</option>)}
                        </select>
                    </label>
                    {selectedDoor && (
                        <dl>
                            <dt>ID</dt><dd>{selectedDoor.id}</dd>
                            <dt>Access</dt><dd>{selectedDoor.permission}</dd>
                            <dt>Default</dt><dd>{selectedDoor.defaultState ?? 'unknown'}</dd>
                            <dt>Current</dt><dd>{doorRuntimes[selectedDoor.id]?.state ?? selectedDoor.currentState ?? 'unknown'}</dd>
                            <dt>Linked zones</dt><dd>{selectedDoor.zones.join(', ') || 'unknown'}</dd>
                            <dt>On route</dt><dd>{route?.crossedDoorIds.includes(selectedDoor.id) ? 'yes' : 'no'}</dd>
                            <dt>Traversal</dt><dd>{selectedDoor.malformedReason ?? selectedDoor.openRule ?? selectedDoor.permission ?? 'unknown'}</dd>
                        </dl>
                    )}
                </fieldset>
                <label className="floor1-candidate-fixtures"><input type="checkbox" checked={showAllFixtures} onChange={event => setShowAllFixtures(event.target.checked)} /> Show all {agents.length} available fixtures (two active by default)</label>
                {selectedAgent && (
                    <dl>
                        <dt>Agent ID</dt><dd>{selectedAgent.fixture.id}</dd>
                        <dt>Agent name</dt><dd>{selectedAgent.fixture.label}</dd>
                        <dt>Verification</dt><dd>{graph.verificationMode}</dd>
                        <dt>Current agent state</dt><dd>{selectedAgent.status}</dd>
                        <dt>Current node</dt><dd>{route?.nodeSequence[Math.min(Math.floor(selectedAgent.progress), Math.max(0, route.nodeSequence.length - 1))] ?? selectedAgent.fixture.positionId}</dd>
                        <dt>Route status</dt><dd>{routeStatus}</dd>
                        <dt>Destination</dt><dd>{selectedDestination?.label ?? 'none'}</dd>
                        <dt>Movement speed</dt><dd>{REVIEW_SPEED_PX_PER_SECOND * playbackSpeed}px/s</dd>
                        <dt>Blocked / waiting</dt><dd>{selectedAgent.status === 'waiting_for_door' || selectedAgent.status === 'blocked' ? route?.reason ?? selectedAgent.status : 'none'}</dd>
                        <dt>Current sprite clip</dt><dd>{!reducedMotion && isCandidateAdvancingStatus(selectedAgent.status) ? 'walking' : selectedAgent.status === 'blocked' ? 'offline' : 'idle'}</dd>
                        <dt>Current world coordinate</dt><dd>{Math.round(selectedAgent.point.x)}, {Math.round(selectedAgent.point.y)}</dd>
                        <dt>Route cost</dt><dd>{route?.cost ?? 0}px · {route?.nodeSequence.join(' → ') ?? 'none'}</dd>
                        <dt>Door runtime</dt><dd>{route?.doorSteps.map(step => `${step.doorId}:${doorRuntimes[step.doorId]?.state ?? step.initialPhysicalState}:${step.requiredAction}`).join(', ') || 'none'}</dd>
                        <dt>Performance bounds</dt><dd>{graph.nodeCount} nodes · {graph.edgeCount} edges · {runtime.clock.subscriberCount} sprite subscribers · {runtime.textures.size} cached textures</dd>
                        <dt>Diagnostics</dt><dd>{graph.rooms.length} rooms / {graph.doors.length} doors / {graph.destinations.length} destinations / {renderedAgents.length} visible agents</dd>
                        <dt>Viewport</dt><dd>{Math.round(viewport.width)} x {Math.round(viewport.height)} / zoom {transform.scale.toFixed(3)} / pan {Math.round(transform.x)}, {Math.round(transform.y)}</dd>
                        <dt>Pointer</dt><dd>{pointer ? `${Math.round(pointer.x)}, ${Math.round(pointer.y)}` : 'outside map'}</dd>
                        <dt>Last error</dt><dd>{route && route.status !== 'valid' ? route.reason : 'none'}</dd>
                        <dt>Initialization</dt><dd>background: ready / candidate data: ready / overlay: ready / graph: ready / agents: ready / viewport: ready</dd>
                        <dt>Limitations</dt><dd>Candidate routes validate static world collisions only; dynamic agent-to-agent avoidance is not implemented.</dd>
                    </dl>
                )}
        </section>
    );

    return (
        <div className="floor1-candidate-simulation" aria-label="Floor 1 candidate navigation simulation">
            {showColliders && (
                <svg className="floor1-candidate-debug floor1-candidate-debug--colliders" aria-hidden="true">
                    {graph.colliders.slice(0, 260).map(collider => {
                        const points = collider.points.map(point => `${point.x},${point.y}`).join(' ');
                        return collider.closed
                            ? <polygon key={collider.id} points={points} strokeWidth={collider.thickness} strokeLinejoin="round" data-collider-layer="modeled-geometry" />
                            : <polyline key={collider.id} points={points} strokeWidth={collider.thickness} fill="none" strokeLinecap="round" strokeLinejoin="round" data-collider-layer="modeled-geometry" />;
                    })}
                </svg>
            )}
            {(showNodes || showEdges || showDoors) && (
                <svg className="floor1-candidate-debug floor1-candidate-debug--graph" aria-hidden="true">
                    {showEdges && graph.walkSegments.map(segment => <line key={segment.id} className="edge" x1={segment.a.x} y1={segment.a.y} x2={segment.b.x} y2={segment.b.y} />)}
                    {showNodes && graph.walkNodes.map(node => <circle key={node.id} className="node" cx={node.point.x} cy={node.point.y} r="18" />)}
                    {showDoors && graph.doors.map(door => <circle key={door.id} className={`door door--${door.permission}`} cx={door.point.x} cy={door.point.y} r="32" />)}
                    {showDoors && graph.doors.map(door => <text key={`${door.id}-label`} x={door.point.x + 38} y={door.point.y}>{door.id}</text>)}
                </svg>
            )}
            {showRoute && route?.points && route.points.length > 0 && selectedAgent && (
                <svg className="floor1-candidate-route" aria-hidden="true">
                    <polyline points={route.points.map(point => `${point.x},${point.y}`).join(' ')} />
                    <circle className="start" cx={route.points[0].x} cy={route.points[0].y} r="30" />
                    <circle className="destination" cx={route.points[route.points.length - 1].x} cy={route.points[route.points.length - 1].y} r="30" />
                    {route.crossedDoorIds.map(doorId => {
                        const door = graph.doors.find(item => item.id === doorId);
                        return door ? <text key={doorId} x={door.point.x + 34} y={door.point.y - 20}>{doorId}</text> : null;
                    })}
                </svg>
            )}
            {showDestination && destinationId && (() => {
                const destination = graph.destinations.find(item => item.id === destinationId);
                return destination ? (
                    <svg className="floor1-candidate-destination" aria-label={`Destination marker: ${destination.label}`}>
                        <circle cx={destination.markerPoint?.x ?? destination.point.x} cy={destination.markerPoint?.y ?? destination.point.y} r="42" />
                    </svg>
                ) : null;
            })()}
            <div className="floor1-candidate-agent-layer">
                {renderedAgents.map(agent => (
                    <button
                        key={agent.fixture.id}
                        type="button"
                        className={`floor1-candidate-agent ${selectedAgentId === agent.fixture.id ? 'floor1-candidate-agent--selected' : ''} ${showAgentBounds ? 'floor1-candidate-agent--debug-bounds' : ''}`}
                        style={{ left: agent.point.x, top: agent.point.y }}
                        onClick={event => {
                            event.stopPropagation();
                            updateSelectedAgent(agent.fixture.id);
                        }}
                        aria-label={`${agent.fixture.label}. ${agent.status}. Candidate review fixture at ${agent.fixture.positionId} in ${agent.fixture.roomName}. Provisional sprite assignment.`}
                        aria-pressed={selectedAgentId === agent.fixture.id}
                    >
                        <SpritePlayer
                            manifest={AGENT_SPRITE_MANIFEST}
                            runtime={runtime}
                            assetId={agent.fixture.spriteAssetId}
                            state={!reducedMotion && isCandidateAdvancingStatus(agent.status) ? 'walking' : agent.status === 'blocked' ? 'offline' : 'idle'}
                            reducedMotion={reducedMotion}
                            scale={0.52}
                        />
                        {showAgentLabels && <span className="floor1-candidate-agent__label">{agent.fixture.label}</span>}
                    </button>
                ))}
            </div>
            {controlHost ? createPortal(<>{unavailableNotice}{controls}</>, controlHost) : <>{unavailableNotice}{controls}</>}

        </div>
    );
}
