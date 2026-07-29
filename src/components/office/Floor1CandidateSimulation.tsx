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
import {
    advanceCandidateAgents,
    buildCandidateNavigationGraph,
    CandidateAgentFixture,
    CandidateDestinationKind,
    CandidateRouteResult,
    planCandidateRoute,
} from '../../office/floor1/navigation/candidateNavigation';
import type { Point } from '../../office/types';
import { SpritePlayer } from './SpritePlayer';
import './floor1-candidate-simulation.css';

type Props = Readonly<{
    active: boolean;
    reducedMotion: boolean;
}>;

type AgentRuntime = Readonly<{
    fixture: CandidateAgentFixture;
    point: Point;
    status: 'idle' | 'walking' | 'paused' | 'arrived' | 'blocked';
    route: CandidateRouteResult | null;
    progress: number;
    revision: number;
}>;

type RoutePreview = Readonly<{
    agentId: string;
    destinationId: string;
    startPoint: Point;
    agentRevision: number;
    result: CandidateRouteResult;
}>;

const REVIEW_SPEED_PX_PER_SECOND = 420;
const PREVIEW_START_TOLERANCE = 0.5;
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

export function Floor1CandidateSimulation({ active, reducedMotion }: Props) {
    const graph = useMemo(() => buildCandidateNavigationGraph({ rooms, positions, doors, computers, interactiveObjects, walls, objects, walkPaths }), []);
    const [runtime] = useState(() => new SpriteSurfaceRuntime());
    const [agents, setAgents] = useState<readonly AgentRuntime[]>(() => graph.agents.map(fixture => ({
        fixture,
        point: fixture.point,
        status: 'idle',
        route: null,
        progress: 0,
        revision: 0,
    })));
    const [selectedAgentId, setSelectedAgentId] = useState(graph.agents[0]?.id ?? null);
    const [destinationFilter, setDestinationFilter] = useState<DestinationFilter>('room');
    const [destinationSearch, setDestinationSearch] = useState('');
    const destinationsForFilter = useMemo(() => graph.destinations.filter(destination => {
        if (destinationFilter === 'standard-position') return destination.kind === 'position' && destination.accessTier === 'standard';
        if (destinationFilter === 'priority-position') return destination.kind === 'position' && destination.accessTier === 'priority';
        return destination.kind === destinationFilter;
    }).filter(destination => `${destination.label} ${destination.roomName} ${destination.id}`.toLowerCase().includes(destinationSearch.toLowerCase())).slice(0, 240), [destinationFilter, destinationSearch, graph.destinations]);
    const [destinationId, setDestinationId] = useState(() => graph.destinations.find(destination => destination.kind === 'room')?.id ?? graph.destinations[0]?.id ?? '');
    const [preview, setPreview] = useState<RoutePreview | null>(null);
    const [showGraph, setShowGraph] = useState(false);
    const [showColliders, setShowColliders] = useState(false);
    const [showRoute, setShowRoute] = useState(true);
    const [controlPortal, setControlPortal] = useState<HTMLElement | null>(null);
    const frameRef = useRef<number | null>(null);
    const lastTimestampRef = useRef<number | null>(null);

    const selectedAgent = agents.find(agent => agent.fixture.id === selectedAgentId) ?? agents[0] ?? null;
    const anyWalking = agents.some(agent => agent.status === 'walking');
    const beginEnabled = previewIsStartValid(selectedAgent, preview, destinationId);

    useEffect(() => {
        setControlPortal(document.querySelector<HTMLElement>('.office-viewport'));
    }, []);

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
            const delta = last === null ? 0 : timestamp - last;
            setAgents(previous => advanceCandidateAgents(previous, delta, REVIEW_SPEED_PX_PER_SECOND));
            frameRef.current = requestAnimationFrame(tick);
        };
        frameRef.current = requestAnimationFrame(tick);
        return () => {
            if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
            lastTimestampRef.current = null;
        };
    }, [active, anyWalking]);

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
            start: selectedAgent.point,
            destinationId,
            agentId: selectedAgent.fixture.id,
        });
        setPreview({
            agentId: selectedAgent.fixture.id,
            destinationId,
            startPoint: selectedAgent.point,
            agentRevision: selectedAgent.revision,
            result,
        });
        if (result.status !== 'valid') {
            setAgents(previous => previous.map(agent => agent.fixture.id === selectedAgent.fixture.id
                ? { ...agent, status: 'blocked', route: null, progress: 0, revision: agent.revision + 1 }
                : agent));
        }
    };

    const startMovement = () => {
        if (!selectedAgent || !beginEnabled || !preview) return;
        const route = planCandidateRoute(graph, {
            start: selectedAgent.point,
            destinationId,
            agentId: selectedAgent.fixture.id,
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
        setAgents(previous => previous.map(agent => agent.fixture.id === selectedAgentId && agent.status === 'walking'
            ? { ...agent, status: 'paused', revision: agent.revision + 1 }
            : agent));
        setPreview(null);
    };

    const resumeSelected = () => {
        setAgents(previous => previous.map(agent => agent.fixture.id === selectedAgentId && agent.status === 'paused'
            ? { ...agent, status: 'walking', revision: agent.revision + 1 }
            : agent));
    };

    const cancelSelected = () => {
        setAgents(previous => previous.map(agent => agent.fixture.id === selectedAgentId
            ? { ...agent, status: 'idle', route: null, progress: 0, revision: agent.revision + 1 }
            : agent));
        setPreview(null);
    };

    const route = preview?.result ?? selectedAgent?.route ?? null;

    const controls = (
        <section className="floor1-candidate-controls" aria-label="Candidate navigation review controls">
                <h2>Candidate navigation</h2>
                <p role="status" aria-live="polite">{selectedRouteLabel(preview)}</p>
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
                    <button type="button" onClick={cancelSelected}>Cancel</button>
                </div>
                <fieldset>
                    <legend>Debug overlays</legend>
                    <label><input type="checkbox" checked={showRoute} onChange={event => setShowRoute(event.target.checked)} /> Route segments</label>
                    <label><input type="checkbox" checked={showGraph} onChange={event => setShowGraph(event.target.checked)} /> Walk-path and door graph nodes</label>
                    <label><input type="checkbox" checked={showColliders} onChange={event => setShowColliders(event.target.checked)} /> Wall/object colliders</label>
                </fieldset>
                {selectedAgent && (
                    <dl>
                        <dt>Current agent state</dt><dd>{selectedAgent.status}</dd>
                        <dt>Current sprite clip</dt><dd>{selectedAgent.status === 'walking' ? 'walking' : 'idle/offline fallback'}</dd>
                        <dt>Current world coordinate</dt><dd>{Math.round(selectedAgent.point.x)}, {Math.round(selectedAgent.point.y)}</dd>
                        <dt>Route cost</dt><dd>{route?.cost ?? 0}px · {route?.nodeSequence.join(' → ') ?? 'none'}</dd>
                        <dt>Performance bounds</dt><dd>{graph.nodeCount} nodes · {graph.edgeCount} edges · {runtime.clock.subscriberCount} sprite subscribers · {runtime.textures.size} cached textures</dd>
                        <dt>Limitations</dt><dd>Candidate routes validate static world collisions only; dynamic agent-to-agent avoidance is not implemented.</dd>
                    </dl>
                )}
        </section>
    );

    return (
        <div className="floor1-candidate-simulation" aria-label="Floor 1 candidate navigation simulation">
            {showColliders && (
                <svg className="floor1-candidate-debug floor1-candidate-debug--colliders" aria-hidden="true">
                    {graph.colliders.slice(0, 260).map(collider => (
                        <polyline key={collider.id} points={collider.points.map(point => `${point.x},${point.y}`).join(' ')} />
                    ))}
                </svg>
            )}
            {showGraph && (
                <svg className="floor1-candidate-debug floor1-candidate-debug--graph" aria-hidden="true">
                    {graph.walkNodes.slice(0, 500).map(node => <circle key={node.id} cx={node.point.x} cy={node.point.y} r="14" />)}
                    {graph.doors.map(door => <circle key={door.id} className="door" cx={door.point.x} cy={door.point.y} r="24" />)}
                    {graph.doors.map(door => <text key={`${door.id}-label`} x={door.point.x + 28} y={door.point.y}>{door.id}</text>)}
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
            <div className="floor1-candidate-agent-layer">
                {agents.map(agent => (
                    <button
                        key={agent.fixture.id}
                        type="button"
                        className={`floor1-candidate-agent ${selectedAgentId === agent.fixture.id ? 'floor1-candidate-agent--selected' : ''}`}
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
                            state={agent.status === 'walking' && !reducedMotion ? 'walking' : agent.status === 'blocked' ? 'offline' : 'idle'}
                            reducedMotion={reducedMotion}
                            scale={0.52}
                        />
                        <span className="floor1-candidate-agent__label">{agent.fixture.label}</span>
                    </button>
                ))}
            </div>
            {controlPortal ? createPortal(controls, controlPortal) : controls}

        </div>
    );
}
