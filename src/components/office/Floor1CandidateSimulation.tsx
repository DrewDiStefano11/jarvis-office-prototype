import { useEffect, useMemo, useRef, useState } from 'react';
import rooms from '../../office/data/floor1/provisional/rooms.json';
import positions from '../../office/data/floor1/provisional/positions.json';
import doors from '../../office/data/floor1/provisional/doors.json';
import computers from '../../office/data/floor1/provisional/computers.json';
import interactiveObjects from '../../office/data/floor1/provisional/interactive-objects.json';
import walls from '../../office/data/floor1/provisional/walls.json';
import objects from '../../office/data/floor1/provisional/objects.json';
import { AGENT_SPRITE_MANIFEST } from '../../office/sprites/manifest';
import { SpriteSurfaceRuntime } from '../../office/sprites/runtime';
import {
    buildCandidateNavigationGraph,
    CandidateAgentFixture,
    CandidateRouteResult,
    interpolateRoute,
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
}>;

const REVIEW_SPEED_PX_PER_SECOND = 420;

function distance(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function routeLength(points: readonly Point[]): number {
    return points.slice(1).reduce((acc, point, index) => acc + distance(points[index], point), 0);
}

function selectedRouteLabel(route: CandidateRouteResult | null): string {
    if (!route) return 'No route previewed.';
    return `${route.status}: ${route.reason} Length ${route.length}px; expanded ${route.expandedNodeCount}; doors ${route.crossedDoorIds.join(', ') || 'none'}.`;
}

export function Floor1CandidateSimulation({ active, reducedMotion }: Props) {
    const graph = useMemo(() => buildCandidateNavigationGraph({ rooms, positions, doors, computers, interactiveObjects, walls, objects }), []);
    const [runtime] = useState(() => new SpriteSurfaceRuntime());
    const [agents, setAgents] = useState<readonly AgentRuntime[]>(() => graph.agents.map(fixture => ({
        fixture,
        point: fixture.point,
        status: 'idle',
        route: null,
        progress: 0,
    })));
    const [selectedAgentId, setSelectedAgentId] = useState(graph.agents[0]?.id ?? null);
    const [destinationId, setDestinationId] = useState(graph.destinations[0]?.id ?? '');
    const [route, setRoute] = useState<CandidateRouteResult | null>(null);
    const [movementEnabled, setMovementEnabled] = useState(true);
    const [showGraph, setShowGraph] = useState(false);
    const [showColliders, setShowColliders] = useState(false);
    const [showRoute, setShowRoute] = useState(true);
    const frameRef = useRef<number | null>(null);
    const lastTimestampRef = useRef<number | null>(null);

    const selectedAgent = agents.find(agent => agent.fixture.id === selectedAgentId) ?? agents[0] ?? null;

    useEffect(() => {
        runtime.setActive(active && !document.hidden);
        const handleVisibility = () => runtime.setActive(active && !document.hidden);
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [active, runtime]);

    useEffect(() => () => {
        runtime.dispose();
        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    }, [runtime]);

    useEffect(() => {
        if (!active || !movementEnabled) return;
        const tick = (timestamp: number) => {
            const last = lastTimestampRef.current ?? timestamp;
            lastTimestampRef.current = timestamp;
            const delta = reducedMotion ? 180 : Math.min(64, timestamp - last);
            setAgents(previous => previous.map(agent => {
                if (agent.status !== 'walking' || !agent.route || agent.route.status !== 'valid') return agent;
                const length = routeLength(agent.route.points);
                const nextProgress = Math.min(length, agent.progress + (REVIEW_SPEED_PX_PER_SECOND * delta) / 1000);
                return {
                    ...agent,
                    point: interpolateRoute(agent.route.points, nextProgress),
                    progress: nextProgress,
                    status: nextProgress >= length ? 'arrived' : 'walking',
                };
            }));
            frameRef.current = requestAnimationFrame(tick);
        };
        frameRef.current = requestAnimationFrame(tick);
        return () => {
            if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
            lastTimestampRef.current = null;
        };
    }, [active, movementEnabled, reducedMotion]);

    const previewRoute = () => {
        if (!selectedAgent) return;
        const next = planCandidateRoute(graph, selectedAgent.point, destinationId);
        setRoute(next);
        setAgents(previous => previous.map(agent => agent.fixture.id === selectedAgent.fixture.id
            ? { ...agent, route: next, status: next.status === 'valid' ? agent.status : 'blocked' }
            : agent));
    };

    const startMovement = () => {
        if (!selectedAgent || !route || route.status !== 'valid') return;
        setAgents(previous => previous.map(agent => agent.fixture.id === selectedAgent.fixture.id
            ? { ...agent, route, status: 'walking', progress: 0, point: route.points[0] }
            : agent));
        setMovementEnabled(true);
    };

    const pauseSelected = () => {
        setAgents(previous => previous.map(agent => agent.fixture.id === selectedAgentId && agent.status === 'walking'
            ? { ...agent, status: 'paused' }
            : agent));
    };

    const resumeSelected = () => {
        setAgents(previous => previous.map(agent => agent.fixture.id === selectedAgentId && agent.status === 'paused'
            ? { ...agent, status: 'walking' }
            : agent));
    };

    const cancelSelected = () => {
        setAgents(previous => previous.map(agent => agent.fixture.id === selectedAgentId
            ? { ...agent, status: 'idle', route: null, progress: 0 }
            : agent));
    };

    return (
        <div className="floor1-candidate-simulation" aria-label="Floor 1 candidate navigation simulation">
            {showColliders && (
                <svg className="floor1-candidate-debug floor1-candidate-debug--colliders" aria-hidden="true">
                    {graph.colliders.slice(0, 180).map(collider => (
                        <polygon key={collider.id} points={collider.points.map(point => `${point.x},${point.y}`).join(' ')} />
                    ))}
                </svg>
            )}
            {showGraph && (
                <svg className="floor1-candidate-debug floor1-candidate-debug--graph" aria-hidden="true">
                    {graph.doors.map(door => <circle key={door.id} cx={door.point.x} cy={door.point.y} r="24" />)}
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
                            setSelectedAgentId(agent.fixture.id);
                            setRoute(agent.route);
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
            <section className="floor1-candidate-controls" aria-label="Candidate navigation review controls">
                <h2>Candidate navigation</h2>
                <p role="status" aria-live="polite">{selectedRouteLabel(route)}</p>
                <label>
                    Agent
                    <select value={selectedAgentId ?? ''} onChange={event => setSelectedAgentId(event.target.value)}>
                        {agents.map(agent => <option key={agent.fixture.id} value={agent.fixture.id}>{agent.fixture.label} — {agent.fixture.roomName}</option>)}
                    </select>
                </label>
                <label>
                    Destination
                    <select value={destinationId} onChange={event => setDestinationId(event.target.value)}>
                        {graph.destinations.slice(0, 120).map(destination => <option key={destination.id} value={destination.id}>{destination.kind}: {destination.label}</option>)}
                    </select>
                </label>
                <div className="floor1-candidate-actions">
                    <button type="button" onClick={previewRoute}>Preview route</button>
                    <button type="button" onClick={startMovement} disabled={route?.status !== 'valid'}>Begin movement</button>
                    <button type="button" onClick={pauseSelected}>Pause</button>
                    <button type="button" onClick={resumeSelected}>Resume</button>
                    <button type="button" onClick={cancelSelected}>Cancel</button>
                </div>
                <fieldset>
                    <legend>Debug overlays</legend>
                    <label><input type="checkbox" checked={showRoute} onChange={event => setShowRoute(event.target.checked)} /> Route segments</label>
                    <label><input type="checkbox" checked={showGraph} onChange={event => setShowGraph(event.target.checked)} /> Door graph nodes</label>
                    <label><input type="checkbox" checked={showColliders} onChange={event => setShowColliders(event.target.checked)} /> Wall/object colliders</label>
                </fieldset>
                {selectedAgent && (
                    <dl>
                        <dt>Current agent state</dt><dd>{selectedAgent.status}</dd>
                        <dt>Current sprite clip</dt><dd>{selectedAgent.status === 'walking' ? 'walking' : 'idle/offline fallback'}</dd>
                        <dt>World coordinate</dt><dd>{Math.round(selectedAgent.point.x)}, {Math.round(selectedAgent.point.y)}</dd>
                        <dt>Performance bounds</dt><dd>{graph.nodeCount} nodes · {runtime.clock.subscriberCount} sprite subscribers · {runtime.textures.size} cached textures</dd>
                        <dt>Limitations</dt><dd>Candidate routes validate static world collisions only; dynamic agent-to-agent avoidance is not implemented.</dd>
                    </dl>
                )}
            </section>
        </div>
    );
}
