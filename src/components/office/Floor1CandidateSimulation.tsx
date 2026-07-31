import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
    activeCandidateDoorRequestIds,
    activeCandidateDoorStep,
    advanceCandidateAgents,
    advanceCandidateDoorRuntimes,
    buildCandidateNavigationGraph,
    type CandidateAgentFixture,
    type CandidateDestinationKind,
    type CandidateDoorRuntime,
    type CandidateNavigationGraph,
    type CandidateRouteResult,
    type CandidateVerificationMode,
    isCandidateAdvancingStatus,
    isCandidatePausableStatus,
    type MarkupRegistration,
    planCandidateRoute,
} from '../../office/floor1/navigation/candidateNavigation';
import type { Point } from '../../office/types';
import { SpritePlayer } from './SpritePlayer';
import './floor1-candidate-simulation.css';

type Props = Readonly<{
    active: boolean;
    reducedMotion: boolean;
    registration?: MarkupRegistration;
}>;

type AgentRuntime = Readonly<{
    fixture: CandidateAgentFixture;
    startPoint: Point;
    point: Point;
    status: 'idle' | 'walking' | 'waiting_for_door' | 'crossing_door' | 'paused' | 'arrived' | 'blocked';
    route: CandidateRouteResult | null;
    progress: number;
    revision: number;
    pausedFromStatus?: 'walking' | 'waiting_for_door' | 'crossing_door' | 'canceling_clearance';
}>;

type SimulationState = Readonly<{
    agents: readonly AgentRuntime[];
    doorRuntimes: Readonly<Record<string, CandidateDoorRuntime>>;
    speedPxPerSecond: number;
}>;

const DEFAULT_SPEED_PX_PER_SECOND = 420;
const PREVIEW_START_TOLERANCE = 0.5;
const MIN_SPEED = 50;
const MAX_SPEED = 2000;
const INITIAL_SPEED = DEFAULT_SPEED_PX_PER_SECOND;

const DESTINATION_KIND_LABELS: Readonly<Record<CandidateDestinationKind, string>> = {
    room: 'Rooms',
    computer: 'Computers',
    'interactive-object': 'Interactive objects',
    position: 'Positions',
    waypoint: 'Waypoints',
};

function routeLength(points: readonly Point[]): number {
    let total = 0;
    for (let index = 1; index < points.length; index += 1) {
        total += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
    }
    return total;
}

function distance(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function createInitialAgents(graph: CandidateNavigationGraph): AgentRuntime[] {
    return graph.agents.map(fixture => ({
        fixture,
        startPoint: fixture.point,
        point: fixture.point,
        status: 'idle' as const,
        route: null,
        progress: 0,
        revision: 0,
    }));
}

function createInitialDoorRuntimes(graph: CandidateNavigationGraph): Readonly<Record<string, CandidateDoorRuntime>> {
    return Object.fromEntries(graph.doors.map(door => [
        door.id,
        { doorId: door.id, state: door.currentState ?? 'closed', stateElapsedMs: 0, revision: 0 } satisfies CandidateDoorRuntime,
    ]));
}

type PreviewRecord = Readonly<{
    agentId: string;
    destinationId: string;
    startPoint: Point;
    agentRevision: number;
    result: CandidateRouteResult;
}>;

function previewIsValid(preview: PreviewRecord | null, agent: AgentRuntime | null, destinationId: string): boolean {
    return !!preview && !!agent
        && preview.agentId === agent.fixture.id
        && preview.destinationId === destinationId
        && preview.agentRevision === agent.revision
        && preview.result.status === 'valid'
        && distance(preview.startPoint, agent.point) <= PREVIEW_START_TOLERANCE;
}

function routeStatusLabel(preview: PreviewRecord | null): string {
    if (!preview) return 'No route planned.';
    const route = preview.result;
    if (route.status !== 'valid') return `Route failed: ${route.reason}`;
    return `Route ready · ${Math.round(route.length)}px · ${route.points.length} points · ${route.crossedDoorIds.length} door(s)`;
}

export function Floor1CandidateSimulation({ active, reducedMotion, registration }: Props) {
    const verificationMode: CandidateVerificationMode = 'unverified-sandbox';
    const graph = useMemo(
        () => buildCandidateNavigationGraph(
            { rooms, positions, doors, computers, interactiveObjects, walls, objects, walkPaths },
            { registration, verificationMode },
        ),
        [registration, verificationMode],
    );

    const [runtime] = useState(() => new SpriteSurfaceRuntime());

    const simulationRef = useRef<SimulationState>({
        agents: createInitialAgents(graph),
        doorRuntimes: createInitialDoorRuntimes(graph),
        speedPxPerSecond: INITIAL_SPEED,
    });

    const [selectedAgentId, setSelectedAgentId] = useState(graph.agents[0]?.id ?? null);
    const [destinationFilter, setDestinationFilter] = useState<CandidateDestinationKind>('room');
    const [destinationSearch, setDestinationSearch] = useState('');
    const [destinationId, setDestinationId] = useState(
        () => graph.destinations.find(d => d.kind === 'room')?.id ?? graph.destinations[0]?.id ?? '',
    );
    const [preview, setPreview] = useState<PreviewRecord | null>(null);
    const [showGraph, setShowGraph] = useState(false);
    const [showColliders, setShowColliders] = useState(false);
    const [showRoute, setShowRoute] = useState(true);
    const [speed, setSpeed] = useState(INITIAL_SPEED);
    const [renderTick, setRenderTick] = useState(0);
    const [controlPortal, setControlPortal] = useState<HTMLElement | null>(null);

    const frameRef = useRef<number | null>(null);
    const lastTimestampRef = useRef<number | null>(null);
    const mountedRef = useRef(true);

    const agents = simulationRef.current.agents;

    const selectedAgent = agents.find(a => a.fixture.id === selectedAgentId) ?? agents[0] ?? null;
    const anyAdvancing = agents.some(a => a.status === 'walking' || a.status === 'waiting_for_door' || a.status === 'crossing_door');

    const destinationsForFilter = useMemo(() => graph.destinations.filter(d => {
        if (d.kind !== destinationFilter) return false;
        if (!destinationSearch) return true;
        const query = destinationSearch.toLowerCase();
        return `${d.label} ${d.roomName} ${d.id}`.toLowerCase().includes(query);
    }).slice(0, 240), [destinationFilter, destinationSearch, graph.destinations]);

    useEffect(() => {
        if (!destinationsForFilter.some(d => d.id === destinationId)) {
            setDestinationId(destinationsForFilter[0]?.id ?? '');
            setPreview(null);
        }
    }, [destinationId, destinationsForFilter]);

    useEffect(() => {
        setControlPortal(document.querySelector<HTMLElement>('.office-viewport'));
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        runtime.setActive(active && !document.hidden);
        const handleVisibility = (): void => {
            runtime.setActive(active && !document.hidden);
            lastTimestampRef.current = null;
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            mountedRef.current = false;
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [active, runtime]);

    useEffect(() => () => {
        runtime.dispose();
        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
        lastTimestampRef.current = null;
    }, [runtime]);

    useEffect(() => {
        if (!active || !anyAdvancing) {
            if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
            lastTimestampRef.current = null;
            return undefined;
        }
        const tick = (timestamp: number): void => {
            if (!mountedRef.current) return;
            const last = lastTimestampRef.current;
            lastTimestampRef.current = timestamp;
            const delta = last === null ? 0 : timestamp - last;
            const current = simulationRef.current;
            const requestingDoorIds = activeCandidateDoorRequestIds(current.agents, graph.doors);
            const nextDoorRuntimes = advanceCandidateDoorRuntimes(current.doorRuntimes, requestingDoorIds, delta);
            const resumed = current.agents.map(agent => {
                if (agent.status !== 'waiting_for_door' || !agent.route) return agent;
                const step = activeCandidateDoorStep(agent)?.step;
                const ready = step ? nextDoorRuntimes[step.doorId]?.state === 'open' : false;
                return ready ? { ...agent, status: 'walking' as const } : agent;
            });
            const nextAgents = advanceCandidateAgents(resumed, delta, current.speedPxPerSecond, nextDoorRuntimes) as readonly AgentRuntime[];
            simulationRef.current = { ...current, agents: nextAgents, doorRuntimes: nextDoorRuntimes };
            setRenderTick(t => t + 1);
            frameRef.current = requestAnimationFrame(tick);
        };
        frameRef.current = requestAnimationFrame(tick);
        return () => {
            if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
            lastTimestampRef.current = null;
        };
    }, [active, anyAdvancing, graph.doors]);

    const planRoute = useCallback((): void => {
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
    }, [selectedAgent, destinationId, graph]);

    const startMovement = useCallback((): void => {
        if (!previewIsValid(preview, selectedAgent, destinationId)) return;
        const current = simulationRef.current;
        const nextAgents = current.agents.map(agent => {
            if (agent.fixture.id !== selectedAgent?.fixture.id) return agent;
            return {
                ...agent,
                status: 'walking' as const,
                route: preview!.result,
                progress: 0,
                point: preview!.result.points[0] ?? agent.point,
                revision: agent.revision + 1,
            };
        });
        simulationRef.current = { ...current, agents: nextAgents };
        setPreview(null);
        setRenderTick(t => t + 1);
    }, [preview, selectedAgent, destinationId]);

    const pauseSelected = useCallback((): void => {
        const current = simulationRef.current;
        const nextAgents = current.agents.map(agent => {
            if (agent.fixture.id !== selectedAgentId || !isCandidatePausableStatus(agent.status)) return agent;
            return {
                ...agent,
                status: 'paused' as const,
                pausedFromStatus: agent.status as 'walking' | 'waiting_for_door' | 'crossing_door',
                revision: agent.revision + 1,
            };
        });
        simulationRef.current = { ...current, agents: nextAgents };
        setRenderTick(t => t + 1);
    }, [selectedAgentId]);

    const resumeSelected = useCallback((): void => {
        const current = simulationRef.current;
        const nextAgents = current.agents.map((agent): AgentRuntime => {
            if (agent.fixture.id !== selectedAgentId || agent.status !== 'paused') return agent;
            const restored: 'walking' | 'waiting_for_door' | 'crossing_door' = agent.pausedFromStatus === 'waiting_for_door'
                ? (activeCandidateDoorStep(agent)?.step && current.doorRuntimes[activeCandidateDoorStep(agent)!.step.doorId]?.state === 'open' ? 'walking' : 'waiting_for_door')
                : agent.pausedFromStatus === 'crossing_door' ? 'crossing_door' : 'walking';
            return { ...agent, status: restored, pausedFromStatus: undefined, revision: agent.revision + 1 };
        });
        simulationRef.current = { ...current, agents: nextAgents };
        setRenderTick(t => t + 1);
    }, [selectedAgentId]);

    const resetSelected = useCallback((): void => {
        const current = simulationRef.current;
        const nextAgents = current.agents.map(agent => {
            if (agent.fixture.id !== selectedAgentId) return agent;
            return {
                ...agent,
                status: 'idle' as const,
                route: null,
                progress: 0,
                point: agent.startPoint,
                pausedFromStatus: undefined,
                revision: agent.revision + 1,
            };
        });
        simulationRef.current = { ...current, agents: nextAgents };
        setPreview(null);
        setRenderTick(t => t + 1);
    }, [selectedAgentId]);

    const clearRoute = useCallback((): void => {
        setPreview(null);
    }, []);

    const updateSpeed = useCallback((value: number): void => {
        const clamped = Math.max(MIN_SPEED, Math.min(MAX_SPEED, value));
        setSpeed(clamped);
        simulationRef.current = { ...simulationRef.current, speedPxPerSecond: clamped };
    }, []);

    const currentRoute = preview?.result ?? selectedAgent?.route ?? null;

    const unavailableNotice = !graph.navigationAvailable ? (
        <div className="floor1-candidate-unavailable" role="status">
            {graph.unavailableReason ?? 'Candidate navigation unavailable.'}
        </div>
    ) : null;

    const controls = (
        <section
            className="floor1-candidate-controls"
            aria-label="Candidate navigation review controls"
            onWheelCapture={event => event.stopPropagation()}
            onPointerDownCapture={event => event.stopPropagation()}
            onPointerMoveCapture={event => event.stopPropagation()}
            onPointerUpCapture={event => event.stopPropagation()}
            onTouchStartCapture={event => event.stopPropagation()}
            onTouchMoveCapture={event => event.stopPropagation()}
        >
            <div className="floor1-candidate-warning" role="alert">
                <strong>⚠ Unverified candidate data sandbox</strong>
                <span>All navigation data is provisional and unreviewed. Not for production use.</span>
            </div>
            <h2>Candidate navigation debug</h2>
            <p className="floor1-candidate-status" role="status" aria-live="polite">{routeStatusLabel(preview)}</p>

            <label className="floor1-candidate-label">
                <span>Agent</span>
                <select
                    aria-label="Agent"
                    value={selectedAgentId ?? ''}
                    onChange={event => { setSelectedAgentId(event.target.value); setPreview(null); }}
                >
                    {agents.map(agent => (
                        <option key={agent.fixture.id} value={agent.fixture.id}>
                            {agent.fixture.label} — {agent.fixture.roomName}
                        </option>
                    ))}
                </select>
            </label>

            <label className="floor1-candidate-label">
                <span>Destination category</span>
                <select
                    aria-label="Destination category"
                    value={destinationFilter}
                    onChange={event => { setDestinationFilter(event.target.value as CandidateDestinationKind); setPreview(null); }}
                >
                    {Object.entries(DESTINATION_KIND_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
            </label>

            <label className="floor1-candidate-label">
                <span>Search destinations</span>
                <input
                    value={destinationSearch}
                    onChange={event => { setDestinationSearch(event.target.value); setPreview(null); }}
                    placeholder="Filter by ID, label, or room"
                />
            </label>

            <label className="floor1-candidate-label">
                <span>Destination</span>
                <select
                    aria-label="Destination"
                    value={destinationId}
                    onChange={event => { setDestinationId(event.target.value); setPreview(null); }}
                >
                    {destinationsForFilter.map(dest => (
                        <option key={dest.id} value={dest.id}>
                            {dest.kind}: {dest.label} — {dest.roomName}
                        </option>
                    ))}
                </select>
            </label>

            <div className="floor1-candidate-actions">
                <button type="button" onClick={planRoute}>Plan route</button>
                <button type="button" onClick={startMovement} disabled={!previewIsValid(preview, selectedAgent, destinationId)}>Start</button>
                <button type="button" onClick={pauseSelected} disabled={!selectedAgent || !isCandidatePausableStatus(selectedAgent.status)}>Pause</button>
                <button type="button" onClick={resumeSelected} disabled={!selectedAgent || selectedAgent.status !== 'paused'}>Resume</button>
                <button type="button" onClick={resetSelected}>Reset</button>
                <button type="button" onClick={clearRoute}>Clear route</button>
            </div>

            <label className="floor1-candidate-label floor1-candidate-speed">
                <span>Speed: {speed}px/s</span>
                <input
                    type="range"
                    min={MIN_SPEED}
                    max={MAX_SPEED}
                    step={10}
                    value={speed}
                    onChange={event => updateSpeed(Number(event.target.value))}
                    aria-label="Movement speed"
                />
            </label>

            <fieldset className="floor1-candidate-fieldset">
                <legend>Debug overlays</legend>
                <label><input type="checkbox" checked={showRoute} onChange={event => setShowRoute(event.target.checked)} /> Route segments</label>
                <label><input type="checkbox" checked={showGraph} onChange={event => setShowGraph(event.target.checked)} /> Walk-path and door graph nodes</label>
                <label><input type="checkbox" checked={showColliders} onChange={event => setShowColliders(event.target.checked)} /> Wall/object colliders</label>
            </fieldset>

            {selectedAgent && (
                <dl className="floor1-candidate-readout">
                    <dt>Agent</dt><dd>{selectedAgent.fixture.label}</dd>
                    <dt>Status</dt><dd>{selectedAgent.status}</dd>
                    <dt>World position</dt><dd>{Math.round(selectedAgent.point.x)}, {Math.round(selectedAgent.point.y)}</dd>
                    <dt>Progress</dt><dd>{selectedAgent.route ? `${Math.round(selectedAgent.progress)}px / ${Math.round(routeLength(selectedAgent.route.points))}px` : '—'}</dd>
                    <dt>Sprite clip</dt><dd>{!reducedMotion && isCandidateAdvancingStatus(selectedAgent.status) ? 'walking' : selectedAgent.status === 'blocked' ? 'offline' : 'idle'}</dd>
                    <dt>Graph</dt><dd>{graph.nodeCount} nodes · {graph.edgeCount} edges</dd>
                    <dt>Verification</dt><dd className="floor1-candidate-readout--unverified">{graph.verificationMode}</dd>
                </dl>
            )}
        </section>
    );

    // Suppress unused variable warning — renderTick drives re-render from animation loop
    void renderTick;

    return (
        <div className="floor1-candidate-simulation" aria-label="Floor 1 candidate navigation simulation">
            {showColliders && (
                <svg className="floor1-candidate-debug floor1-candidate-debug--colliders" aria-hidden="true">
                    {graph.colliders.slice(0, 260).map(collider => {
                        const points = collider.points.map(p => `${p.x},${p.y}`).join(' ');
                        return collider.closed
                            ? <polygon key={collider.id} points={points} strokeWidth={collider.thickness} strokeLinejoin="round" data-collider-layer="modeled-geometry" />
                            : <polyline key={collider.id} points={points} strokeWidth={collider.thickness} fill="none" strokeLinecap="round" strokeLinejoin="round" data-collider-layer="modeled-geometry" />;
                    })}
                </svg>
            )}
            {showGraph && (
                <svg className="floor1-candidate-debug floor1-candidate-debug--graph" aria-hidden="true">
                    {graph.walkNodes.map(node => <circle key={node.id} cx={node.point.x} cy={node.point.y} r="14" />)}
                    {graph.doors.map(door => <circle key={door.id} className="door" cx={door.point.x} cy={door.point.y} r="24" />)}
                    {graph.doors.map(door => <text key={`${door.id}-label`} x={door.point.x + 28} y={door.point.y}>{door.id}</text>)}
                </svg>
            )}
            {showRoute && currentRoute?.points && currentRoute.points.length > 0 && (
                <svg className="floor1-candidate-route" aria-hidden="true">
                    <polyline points={currentRoute.points.map(p => `${p.x},${p.y}`).join(' ')} />
                    <circle className="start" cx={currentRoute.points[0].x} cy={currentRoute.points[0].y} r="30" />
                    <circle className="destination" cx={currentRoute.points[currentRoute.points.length - 1].x} cy={currentRoute.points[currentRoute.points.length - 1].y} r="30" />
                </svg>
            )}
            <div className="floor1-candidate-agent-layer">
                {agents.map(agent => (
                    <button
                        key={agent.fixture.id}
                        type="button"
                        className={`floor1-candidate-agent ${selectedAgentId === agent.fixture.id ? 'floor1-candidate-agent--selected' : ''}`}
                        style={{ left: agent.point.x, top: agent.point.y }}
                        onClick={event => {
                            event.stopPropagation();
                            setSelectedAgentId(agent.fixture.id);
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
                        <span className="floor1-candidate-agent__label">{agent.fixture.label}</span>
                    </button>
                ))}
            </div>
            {controlPortal ? createPortal(<>{unavailableNotice}{controls}</>, controlPortal) : <>{unavailableNotice}{controls}</>}
        </div>
    );
}
