import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react';
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
    candidatePointHasStaticClearance,
    type CandidateNavigationGraph,
    type MarkupRegistration,
} from '../../office/floor1/navigation/candidateNavigation';
import {
    advancePrototypeAgents,
    assignPrototypeAmbientPatrol,
    auditPrototypePortalEndpoints,
    assignPrototypeIdle,
    assignPrototypeTalk,
    assignPrototypeWander,
    assignPrototypeWork,
    createPrototypeRuntimeMetrics,
    createPrototypeAgents,
    continuousPrototypeNavigationField,
    layoutPrototypeAgentLabels,
    findValidatedPrototypeRouteToPoint,
    PROTOTYPE_AGENT_LIMIT,
    PROTOTYPE_AGENT_RADIUS,
    PROTOTYPE_CLICK_SNAP_LIMIT,
    PROTOTYPE_DOOR_POLICY,
    PROTOTYPE_SPRITE_WORLD_SIZE,
    prototypeOpenDoorRuntimes,
    prototypeOpenGraph,
    prototypeRoomAtPoint,
    prototypeSpriteDirection,
    prototypeSpriteAssetId,
    prototypeSpriteState,
    prototypeTaskSummary,
    prototypeWorkstations,
    resetPrototypeAgent,
    startPrototypeRoute,
    type PrototypeActivityState,
    type PrototypeAgent,
    type PrototypeRoutePlan,
    type PrototypeRuntimeMetrics,
} from '../../office/floor1/navigation/prototypeRuntime';
import { AGENT_SPRITE_MANIFEST } from '../../office/sprites/manifest';
import { frameAtElapsedTime, resolveSpriteClip } from '../../office/sprites/resolver';
import { SpriteSurfaceRuntime } from '../../office/sprites/runtime';
import type { OfficeLayer, Point, ViewTransform, ViewportSize } from '../../office/types';
import { PrototypeAgentRenderer } from './PrototypeAgentRenderer';
import { SpritePlayer } from './SpritePlayer';
import './floor1-candidate-simulation.css';

type Props = Readonly<{
    active: boolean;
    reducedMotion: boolean;
    registration?: MarkupRegistration;
    controlHost?: HTMLElement | null;
    overlayHost?: HTMLElement | null;
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
    workstations: boolean;
}>;

type OverlaySnapshot = Readonly<{ layers: ReadonlySet<OfficeLayer>; local: LocalOverlays }>;

const BASE_SPEED_PX_PER_SECOND = 180;
const UI_SNAPSHOT_INTERVAL_MS = 250;
const RENDER_SNAPSHOT_INTERVAL_MS = 1000 / 30;
const SIMULATION_STEP_INTERVAL_MS = 1000 / 30;

type RuntimeDiagnosticsSnapshot = Readonly<PrototypeRuntimeMetrics & {
    fps: number;
    medianFrameMs: number;
    p95FrameMs: number;
}>;
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
    workstations: true,
};

type CommandMode = 'talk' | null;
type ClickRouteDiagnostic = Readonly<{
    screen: Point;
    viewportLocal: Point;
    world: Point;
    candidatesEvaluated: number;
    searchRadius: number;
    acceptedEndpoint: Point | null;
    rejectionReason: string | null;
    routeCost: number | null;
    clickOffset: number | null;
}>;
type DragState = Readonly<{
    agentId: string;
    pointerId: number;
    startClient: Point;
    origin: Point;
    originalAgent: PrototypeAgent;
    preview: Point;
    active: boolean;
    plan: PrototypeRoutePlan | null;
}>;
const NO_LOCAL_OVERLAYS: LocalOverlays = {
    nodes: false,
    edges: false,
    doors: false,
    colliders: false,
    routes: false,
    destinations: false,
    labels: false,
    agentBounds: false,
    workstations: false,
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
        : { ...NO_LOCAL_OVERLAYS, routes: true, destinations: true };
}

function mergeAgentCount(graph: CandidateNavigationGraph, current: readonly PrototypeAgent[], count: number, mode: 'ambient' | 'debug'): readonly PrototypeAgent[] {
    const generated = createPrototypeAgents(graph, count, mode);
    const currentById = new Map(current.map(agent => [agent.fixture.id, agent]));
    return generated.map(agent => currentById.get(agent.fixture.id) ?? agent);
}

function nextAmbientActivity(index: number, revision: number): PrototypeActivityState {
    const phase = (index * 7 + revision) % 20;
    if (phase < 13) return 'working-at-desk';
    if (phase < 17) return 'moving-to-task';
    if (phase < 19) return 'talking';
    return 'idle';
}

function selectedStatus(agent: PrototypeAgent | null): string {
    if (!agent) return 'No agent selected';
    if (agent.task.kind === 'work' && agent.task.phase === 'working') return 'Working';
    if (agent.task.kind === 'talk' && agent.task.phase === 'talking') return 'Talking';
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
    overlayHost = null,
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
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [cardOpen, setCardOpen] = useState(false);
    const [localOverlays, setLocalOverlays] = useState<LocalOverlays>(() => initialLocalOverlays(mode));
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [paused, setPaused] = useState(false);
    const [autoMovement, setAutoMovement] = useState(false);
    const [feedback, setFeedback] = useState(mode === 'debug' ? 'Add an agent, then drag it toward a reachable destination.' : 'Ambient simulation running.');
    const [clickRouteDiagnostic, setClickRouteDiagnostic] = useState<ClickRouteDiagnostic | null>(null);
    const [panelCollapsed, setPanelCollapsed] = useState(false);
    const [commandMode, setCommandMode] = useState<CommandMode>(null);
    const [dragState, setDragState] = useState<DragState | null>(null);
    const dragRef = useRef<DragState | null>(null);
    const suppressAgentClickRef = useRef(false);
    const [simulationElapsedMs, setSimulationElapsedMs] = useState(0);
    const simulationElapsedRef = useRef(0);
    const [selectedSpriteFrame, setSelectedSpriteFrame] = useState(0);
    const [selectedSpriteAvailability, setSelectedSpriteAvailability] = useState<Readonly<{ available: boolean; reason: string | null }>>({ available: true, reason: null });
    const [removeConfirmation, setRemoveConfirmation] = useState(false);
    const [spriteRuntime] = useState(() => new SpriteSurfaceRuntime());
    const [runtimeDiagnostics, setRuntimeDiagnostics] = useState<RuntimeDiagnosticsSnapshot>(() => ({
        ...createPrototypeRuntimeMetrics(), fps: 0, medianFrameMs: 0, p95FrameMs: 0,
    }));
    const agentsRef = useRef(agents);
    const lastTimestampRef = useRef<number | null>(null);
    const frameRef = useRef<number | null>(null);
    const lastUiSnapshotRef = useRef(0);
    const lastRenderSnapshotRef = useRef(0);
    const frameDurationsRef = useRef<number[]>([]);
    const runtimeMetricsRef = useRef(createPrototypeRuntimeMetrics());
    const navigationField = useMemo(() => continuousPrototypeNavigationField(graph, runtimeMetricsRef.current), [graph]);
    const continuousOverlay = useMemo(() => {
        if (!localOverlays.nodes && !localOverlays.edges) return { cells: [], edges: [] };
        const cells = navigationField.cells.filter((_cell, index) => index % 2 === 0);
        const edges = [...navigationField.adjacency.entries()].flatMap(([fromId, adjacency]) => adjacency
            .filter(edge => fromId.localeCompare(edge.to) < 0)
            .map(edge => ({ from: navigationField.cellById.get(fromId)!, to: navigationField.cellById.get(edge.to)!, doorId: edge.doorId })))
            .filter((_edge, index) => index % 4 === 0);
        return { cells, edges };
    }, [localOverlays.edges, localOverlays.nodes, navigationField]);
    const previousOverlayRef = useRef<OverlaySnapshot | null>(null);
    const previousLabelPlacementsRef = useRef<ReturnType<typeof layoutPrototypeAgentLabels>>(new Map());
    const labelLayoutUpdatedAtRef = useRef(0);
    const labelLayoutContextRef = useRef('');

    const commitAgents = useCallback((update: (current: readonly PrototypeAgent[]) => readonly PrototypeAgent[]) => {
        const next = update(agentsRef.current);
        agentsRef.current = next;
        setAgents(next);
    }, []);

    const selectedAgent = agents.find(agent => agent.fixture.id === selectedAgentId) ?? null;
    const anyDiagnosticOverlay = visibleLayers.size > 0 || Object.values(localOverlays).some(Boolean);
    const atLimit = agents.length >= PROTOTYPE_AGENT_LIMIT;
    const movingCount = agents.filter(agent => agent.movementState === 'walking').length;
    const workingCount = agents.filter(agent => agent.activityState === 'working-at-desk').length;
    const talkingCount = agents.filter(agent => agent.activityState === 'talking').length;
    const waitingCount = agents.filter(agent => ['waiting', 'blocked'].includes(agent.movementState)).length;
    const workstations = useMemo(() => prototypeWorkstations(graph, runtimeMetricsRef.current), [graph]);
    const portalEndpointAudit = useMemo(() => auditPrototypePortalEndpoints(graph), [graph]);
    const d46RegistrationOverlay = useMemo(() => {
        const door = graph.doors.find(candidate => candidate.id === 'D46');
        const repairedLink = navigationField.doorLinks.find(candidate => candidate.doorId === 'D46');
        const room = graph.rooms.find(candidate => candidate.id === 'ROOM_FOCUS_D');
        if (!door || !room || !repairedLink) return null;
        const nearestForZone = (zoneId: string) => graph.walkNodes
            .filter(node => node.roomId === zoneId || node.roomIds.includes(zoneId))
            .filter(node => candidatePointHasStaticClearance(graph, node.point))
            .slice()
            .sort((a, b) => Math.hypot(a.point.x - door.point.x, a.point.y - door.point.y)
                - Math.hypot(b.point.x - door.point.x, b.point.y - door.point.y)
                || a.id.localeCompare(b.id))[0]?.point ?? null;
        const approachPoint = nearestForZone(door.zoneIds[1]);
        const interiorPoint = nearestForZone('ROOM_FOCUS_D');
        const bounds = [door.point, room.center, ...(approachPoint ? [approachPoint] : []), ...(interiorPoint ? [interiorPoint] : [])];
        const minX = Math.min(...bounds.map(point => point.x)) - 180;
        const maxX = Math.max(...bounds.map(point => point.x)) + 180;
        const minY = Math.min(...bounds.map(point => point.y)) - 180;
        const maxY = Math.max(...bounds.map(point => point.y)) + 180;
        const nearbyColliders = graph.colliders.filter(collider => {
            const colliderMinX = Math.min(...collider.points.map(point => point.x));
            const colliderMaxX = Math.max(...collider.points.map(point => point.x));
            const colliderMinY = Math.min(...collider.points.map(point => point.y));
            const colliderMaxY = Math.max(...collider.points.map(point => point.y));
            return colliderMaxX >= minX && colliderMinX <= maxX && colliderMaxY >= minY && colliderMinY <= maxY;
        });
        return {
            door,
            room,
            approachPoint,
            interiorPoint,
            nearbyColliders,
            audit: portalEndpointAudit.find(item => item.doorId === 'D46') ?? null,
            repairedLink,
        };
    }, [graph, navigationField, portalEndpointAudit]);
    const labelPlacements = useMemo(() => {
        const contextKey = `${selectedAgentId ?? ''}:${transform.scale}:${transform.x}:${transform.y}:${viewport.width}:${viewport.height}:${agents.length}`;
        const now = typeof performance === 'undefined' ? Date.now() : performance.now();
        if (labelLayoutContextRef.current === contextKey
            && previousLabelPlacementsRef.current.size === agents.length
            && now - labelLayoutUpdatedAtRef.current < 200) return previousLabelPlacementsRef.current;
        const placements = layoutPrototypeAgentLabels(agents, transform.scale, {
            offsetX: transform.x,
            offsetY: transform.y,
            viewportWidth: viewport.width,
            viewportHeight: viewport.height,
            selectedAgentId,
            previous: previousLabelPlacementsRef.current,
        });
        previousLabelPlacementsRef.current = placements;
        labelLayoutUpdatedAtRef.current = now;
        labelLayoutContextRef.current = contextKey;
        return placements;
    }, [agents, selectedAgentId, transform.scale, transform.x, transform.y, viewport.height, viewport.width]);

    useEffect(() => { agentsRef.current = agents; }, [agents]);

    useEffect(() => {
        if (!import.meta.env.DEV) return;
        for (const agent of agents) {
            const root = document.querySelector<HTMLElement>(`.prototype-agent[data-agent-id="${agent.fixture.id}"]`);
            const primaryVisualCount = root?.querySelectorAll('[data-primary-sprite-visual="true"]').length ?? 0;
            if (primaryVisualCount !== 1) console.error(`[floor1-agent-integrity] ${agent.fixture.id} has ${primaryVisualCount} primary sprite visuals; expected exactly one.`);
        }
    }, [agents]);

    useEffect(() => () => spriteRuntime.dispose(), [spriteRuntime]);

    useEffect(() => {
        const nextCount = mode === 'ambient' ? 20 : 0;
        const reset = createPrototypeAgents(graph, nextCount, mode);
        agentsRef.current = reset;
        setAgents(reset);
        setSelectedAgentId(null);
        setCardOpen(false);
        setLocalOverlays(initialLocalOverlays(mode));
        setPaused(false);
        simulationElapsedRef.current = 0;
        setSimulationElapsedMs(0);
        setCommandMode(null);
        setDragState(null);
        dragRef.current = null;
        setRemoveConfirmation(false);
        setFeedback(mode === 'debug' ? 'Add an agent, then drag it toward a reachable destination.' : 'Ambient team running with 20 agents.');
    }, [graph, mode]);

    const scheduleAmbient = useCallback((current: readonly PrototypeAgent[]) => {
        if (mode !== 'ambient' && !autoMovement) return current;
        const now = simulationElapsedRef.current;
        const occupiedWorkstations = new Set(current.flatMap(agent => agent.workstationId ? [agent.workstationId] : []));
        const next = [...current];
        let changed = false;
        let plannedThisTick = false;
        for (let index = 0; index < next.length; index += 1) {
            const agent = next[index];
            if (['walking', 'waiting', 'blocked', 'paused'].includes(agent.movementState) && agent.route) continue;
            if (agent.task.kind === 'idle' && agent.task.reason === 'route-failed') {
                continue;
            }
            if (agent.replanCooldownMs > 0) continue;
            if (agent.movementState === 'arrived') {
                const settledActivity = agent.task.kind === 'work' ? 'working-at-desk'
                    : agent.task.kind === 'talk' ? 'talking' : 'idle';
                const isAmbientRoamer = mode === 'ambient' && index % 5 === 0;
                next[index] = {
                    ...agent,
                    movementState: 'idle' as const,
                    activityState: settledActivity as PrototypeActivityState,
                    activityUntil: now + (isAmbientRoamer ? 240 + index * 23 : settledActivity === 'idle' ? 3_600 : 7_200 + (index % 4) * 900),
                };
                changed = true;
                continue;
            }
            if (now < agent.activityUntil) continue;
            // Automatic scheduling must stay inside the prevalidated local-patrol cache.
            // Cross-room work/talk assignments remain available through explicit commands
            // and drag routing, where their synchronous planning cost cannot accumulate
            // across the whole roster in a single simulation tick.
            if (mode === 'ambient' || autoMovement) {
                if (agent.task.kind === 'work' && agent.task.phase === 'working') {
                    next[index] = { ...agent, activityUntil: now + 45_000 + (index % 7) * 2_300 };
                    changed = true;
                    continue;
                }
                if (agent.task.kind === 'talk' && agent.task.phase === 'talking') {
                    next[index] = { ...agent, activityUntil: now + 12_000 + (index % 4) * 1_400 };
                    changed = true;
                    continue;
                }
                if (plannedThisTick) {
                    next[index] = { ...agent, activityUntil: now + 180 + (index % 5) * 45 };
                    changed = true;
                    continue;
                }
                const wander = assignPrototypeAmbientPatrol(graph, agent, now)
                    ?? (mode === 'debug' ? assignPrototypeWander(graph, agent, index + agent.revision, now, runtimeMetricsRef.current) : null);
                if (wander && (wander.route?.length ?? 0) > 20) {
                    next[index] = { ...wander, activityUntil: 0 };
                    plannedThisTick = true;
                    changed = true;
                    continue;
                }
                next[index] = { ...assignPrototypeIdle(agent, now), activityUntil: now + 5_000 + (index % 5) * 900 };
                changed = true;
                continue;
            }
            const scheduledActivity = nextAmbientActivity(index, agent.revision + 1);
            const activity = scheduledActivity;
            if (agent.workstationId) occupiedWorkstations.delete(agent.workstationId);
            if (plannedThisTick && activity !== 'idle') {
                next[index] = { ...agent, activityUntil: now + 120 + (index % 5) * 40 };
                changed = true;
                continue;
            }
            if (activity === 'moving-to-task') {
                const wander = assignPrototypeWander(graph, agent, index + agent.revision, now, runtimeMetricsRef.current);
                if (wander && (wander.route?.length ?? 0) > 20) {
                    next[index] = { ...wander, activityUntil: 0 };
                    plannedThisTick = true;
                    changed = true;
                    continue;
                }
            }
            if (activity === 'working-at-desk') {
                const working = assignPrototypeWork(graph, agent, now, occupiedWorkstations, runtimeMetricsRef.current);
                if (working) {
                    next[index] = { ...working, activityUntil: 0 };
                    if (working.workstationId) occupiedWorkstations.add(working.workstationId);
                    plannedThisTick = true;
                    changed = true;
                    continue;
                }
            }
            if (activity === 'talking') {
                const partnerIndex = index % 2 === 0 ? Math.min(current.length - 1, index + 1) : index - 1;
                const partner = next[partnerIndex];
                const talking = partner && partner.fixture.id !== agent.fixture.id
                    ? assignPrototypeTalk(graph, agent, partner, now, runtimeMetricsRef.current, false)
                    : null;
                if (talking) {
                    next[index] = { ...talking, activityUntil: 0 };
                    plannedThisTick = true;
                    changed = true;
                    continue;
                }
            }
            next[index] = {
                ...assignPrototypeIdle(agent, now),
                activityUntil: now + 4_500 + ((index + agent.revision) % 6) * 1_250,
            };
            changed = true;
        }
        return changed ? next : current;
    }, [autoMovement, graph, mode]);

    useEffect(() => {
        if (!active || paused || agents.length === 0) {
            if (frameRef.current !== null) window.clearTimeout(frameRef.current);
            frameRef.current = null;
            lastTimestampRef.current = null;
            return undefined;
        }
        const tick = () => {
            const timestamp = typeof performance === 'undefined' ? Date.now() : performance.now();
            const last = lastTimestampRef.current;
            lastTimestampRef.current = timestamp;
            const rawDelta = last === null ? 0 : timestamp - last;
            const delta = Math.min(100, rawDelta);
            simulationElapsedRef.current += delta;
            const metrics = runtimeMetricsRef.current;
            metrics.rafFrames += 1;
            metrics.longestFrameMs = Math.max(metrics.longestFrameMs, rawDelta);
            if (rawDelta > 250) metrics.lastGlobalPauseMs = rawDelta;
            if (rawDelta > 0) {
                const frames = frameDurationsRef.current;
                frames.push(rawDelta);
                if (frames.length > 120) frames.shift();
            }
            const advanced = scheduleAmbient(advancePrototypeAgents(
                agentsRef.current, delta, BASE_SPEED_PX_PER_SECOND * playbackSpeed, false, doorRuntimes, graph, metrics,
            ));
            agentsRef.current = advanced;
            if (timestamp - lastRenderSnapshotRef.current >= RENDER_SNAPSHOT_INTERVAL_MS) {
                lastRenderSnapshotRef.current = timestamp;
                metrics.stateCommits += 1;
                setAgents(advanced);
            }
            if (timestamp - lastUiSnapshotRef.current >= UI_SNAPSHOT_INTERVAL_MS) {
                lastUiSnapshotRef.current = timestamp;
                const sortedFrames = [...frameDurationsRef.current].sort((a, b) => a - b);
                const percentile = (ratio: number) => sortedFrames[Math.min(sortedFrames.length - 1, Math.floor(sortedFrames.length * ratio))] ?? 0;
                const medianFrameMs = percentile(0.5);
                setSimulationElapsedMs(simulationElapsedRef.current);
                setRuntimeDiagnostics({
                    ...metrics,
                    fps: medianFrameMs > 0 ? 1000 / medianFrameMs : 0,
                    medianFrameMs,
                    p95FrameMs: percentile(0.95),
                });
            }
            frameRef.current = window.setTimeout(tick, SIMULATION_STEP_INTERVAL_MS);
        };
        frameRef.current = window.setTimeout(tick, SIMULATION_STEP_INTERVAL_MS);
        return () => {
            if (frameRef.current !== null) window.clearTimeout(frameRef.current);
            frameRef.current = null;
            lastTimestampRef.current = null;
        };
    }, [active, agents.length, doorRuntimes, graph, paused, playbackSpeed, scheduleAmbient]);

    useEffect(() => {
        if (!active) return;
        const cancel = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (dragRef.current) {
                dragRef.current = null;
                setDragState(null);
                setFeedback('Reposition canceled. Agent returned to its original node.');
                return;
            }
            if (commandMode) {
                setCommandMode(null);
                setFeedback('Task command canceled.');
                return;
            }
            if (selectedAgentId) {
                if (cardOpen) {
                    setCardOpen(false);
                    setFeedback('Command canceled. Agent card closed.');
                    return;
                }
                setSelectedAgentId(null);
                setRemoveConfirmation(false);
                setFeedback('Command canceled. Agent selection cleared.');
            }
        };
        window.addEventListener('keydown', cancel);
        return () => window.removeEventListener('keydown', cancel);
    }, [active, cardOpen, commandMode, selectedAgentId]);

    const setAgentCount = (count: number) => {
        const bounded = Math.max(0, Math.min(PROTOTYPE_AGENT_LIMIT, count));
        commitAgents(previous => mergeAgentCount(graph, previous, bounded, mode));
        if (mode === 'ambient') setAmbientCount(bounded);
        if (bounded === 0 || (selectedAgentId && Number(selectedAgentId.slice(-2)) > bounded)) setSelectedAgentId(null);
    };

    const addAgents = (count: number) => {
        if (atLimit) return;
        const nextCount = Math.min(PROTOTYPE_AGENT_LIMIT, agents.length + count);
        setAgentCount(nextCount);
        const addedId = `prototype-agent-${String(agents.length + 1).padStart(2, '0')}`;
        setSelectedAgentId(addedId);
        setCardOpen(true);
        setFeedback(nextCount === PROTOTYPE_AGENT_LIMIT
            ? `${PROTOTYPE_AGENT_LIMIT}-agent limit reached.`
            : `${count === 1 ? `Agent ${String(agents.length + 1).padStart(2, '0')}` : `${nextCount - agents.length} agents`} added and selected. Drag an agent toward a destination to assign a route.`);
    };

    const removeSelected = () => {
        if (!selectedAgentId) return;
        commitAgents(previous => previous.filter(agent => agent.fixture.id !== selectedAgentId));
        const remaining = agents.filter(agent => agent.fixture.id !== selectedAgentId);
        setSelectedAgentId(remaining[0]?.fixture.id ?? null);
        setCardOpen(false);
        setRemoveConfirmation(false);
        setFeedback('Selected agent removed.');
    };

    const clearAgents = () => {
        commitAgents(() => []);
        setSelectedAgentId(null);
        setCardOpen(false);
        setFeedback('All agents removed.');
    };

    const resetAgents = () => {
        const count = mode === 'ambient' ? ambientCount : agents.length;
        commitAgents(() => createPrototypeAgents(graph, count, mode));
        setSelectedAgentId(mode === 'debug' && count > 0 ? 'prototype-agent-01' : null);
        setCardOpen(mode === 'debug' && count > 0);
        setPaused(false);
        setFeedback(mode === 'ambient' ? 'Ambient simulation reset deterministically.' : 'Agents reset to deterministic spawn nodes.');
    };

    const stopSelected = () => {
        if (!selectedAgentId) return;
        commitAgents(previous => previous.map(agent => agent.fixture.id === selectedAgentId
            ? assignPrototypeIdle(agent, simulationElapsedRef.current, true)
            : agent));
        setCommandMode(null);
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
        event.stopPropagation();
        if (!selectedAgent) {
            setFeedback('Add or select an agent before dragging it toward a destination.');
            return;
        }
        if (commandMode === 'talk') {
            setFeedback('Choose another agent sprite as the conversation partner, or press Escape.');
            return;
        }
        setFeedback('Map clicks do not move agents. Drag an agent toward a reachable destination and release to assign a walking route.');
    };

    const resetSelected = () => {
        if (!selectedAgentId) return;
        commitAgents(previous => previous.map(agent => agent.fixture.id === selectedAgentId ? resetPrototypeAgent(agent) : agent));
        setFeedback('Selected agent returned to its deterministic spawn.');
    };

    const selectAgent = (agentId: string) => {
        if (suppressAgentClickRef.current) {
            suppressAgentClickRef.current = false;
            return;
        }
        if (commandMode === 'talk' && selectedAgent && agentId !== selectedAgent.fixture.id) {
            const partner = agents.find(agent => agent.fixture.id === agentId);
            if (!partner) return;
            const assigned = assignPrototypeTalk(graph, selectedAgent, partner, simulationElapsedRef.current, runtimeMetricsRef.current);
            if (!assigned) {
                setFeedback(`No reachable conversation approach near ${partner.fixture.label}.`);
                return;
            }
            commitAgents(previous => previous.map(agent => {
                if (agent.fixture.id === selectedAgent.fixture.id) return assigned;
                if (agent.fixture.id !== partner.fixture.id) return agent;
                return {
                    ...agent,
                    partnerAgentId: selectedAgent.fixture.id,
                    activityState: 'talking' as const,
                    task: {
                        kind: 'talk' as const,
                        phase: 'talking' as const,
                        partnerAgentId: selectedAgent.fixture.id,
                        destination: agent.point,
                        nodeId: agent.currentNodeId,
                        startedAtMs: simulationElapsedRef.current,
                    },
                    activityUntil: simulationElapsedRef.current + 8_000,
                    revision: agent.revision + 1,
                };
            }));
            setCommandMode(null);
            setCardOpen(true);
            setFeedback(`${selectedAgent.fixture.label} is heading to talk with ${partner.fixture.label}.`);
            return;
        }
        if (selectedAgentId === agentId) setCardOpen(value => !value);
        else {
            setSelectedAgentId(agentId);
            setCardOpen(true);
        }
        setRemoveConfirmation(false);
        setFeedback(`${agents.find(item => item.fixture.id === agentId)?.fixture.label ?? 'Agent'} selected.`);
    };

    const assignWork = () => {
        if (!selectedAgent) return;
        const occupied = new Set(agents.flatMap(agent => agent.workstationId && agent.fixture.id !== selectedAgent.fixture.id ? [agent.workstationId] : []));
        const assigned = assignPrototypeWork(graph, selectedAgent, simulationElapsedRef.current, occupied, runtimeMetricsRef.current);
        if (!assigned) {
            setFeedback('No reachable workstation destination is available.');
            return;
        }
        commitAgents(previous => previous.map(agent => agent.fixture.id === assigned.fixture.id ? assigned : agent));
        setCommandMode(null);
        setFeedback(`${selectedAgent.fixture.label} is heading to ${assigned.workstationId}.`);
    };

    const assignWander = () => {
        if (!selectedAgent) return;
        const assigned = assignPrototypeWander(graph, selectedAgent, selectedAgent.revision + agents.length, simulationElapsedRef.current, runtimeMetricsRef.current);
        if (!assigned) {
            setFeedback('No reachable wander target is available in the current room.');
            return;
        }
        commitAgents(previous => previous.map(agent => agent.fixture.id === assigned.fixture.id ? assigned : agent));
        setCommandMode(null);
        setFeedback(`${selectedAgent.fixture.label} is wandering on the navigation graph.`);
    };

    const assignNavigationProbe = (kind: 'long' | 'projection' | 'd46' | 'exterior') => {
        if (!selectedAgent) return;
        const d46 = navigationField.doorLinks.find(link => link.doorId === 'D46');
        const d46Cells = d46 ? [d46.approachCellId, d46.exitCellId].flatMap(id => id ? [navigationField.cellById.get(id)] : []).filter((cell): cell is NonNullable<typeof cell> => Boolean(cell)) : [];
        const d46FocusCell = d46Cells.find(cell => cell.roomIds.includes('ROOM_FOCUS_D'));
        const d46Rm10Cell = d46Cells.find(cell => cell.id !== d46FocusCell?.id);
        const atD46Rm10Approach = Boolean(d46Rm10Cell && Math.hypot(selectedAgent.point.x - d46Rm10Cell.point.x, selectedAgent.point.y - d46Rm10Cell.point.y) <= PROTOTYPE_AGENT_RADIUS * 2);
        const targets = {
            long: navigationField.cells.find(cell => navigationField.componentByCellId.get(cell.id) === navigationField.interiorComponentId && cell.point.x < 1_200 && cell.point.y < 1_800)?.point,
            projection: graph.colliders.find(collider => collider.kind === 'object' && collider.points.length > 0)?.points[0],
            d46: (atD46Rm10Approach ? d46FocusCell : d46Rm10Cell)?.point ?? d46?.thresholdPoint,
            exterior: graph.rooms.find(room => room.id === 'ROOM_RM5')?.center,
        } satisfies Record<typeof kind, Point | undefined>;
        const target = targets[kind];
        if (!target) { setFeedback(`${kind} probe is unavailable because its geometry is missing.`); return; }
        const selection = findValidatedPrototypeRouteToPoint(graph, selectedAgent, target, runtimeMetricsRef.current, {
            occupiedPoints: agentsRef.current.filter(agent => agent.fixture.id !== selectedAgent.fixture.id).map(agent => agent.point),
        });
        if (selection.status === 'rejected') {
            setFeedback(`${kind} probe rejected safely: ${selection.message}`);
            return;
        }
        const plan = selection.plan;
        commitAgents(previous => previous.map(agent => agent.fixture.id === selectedAgent.fixture.id
            ? startPrototypeRoute(agent, plan, { kind: 'walk', phase: 'traveling', destination: plan.snappedPoint, nodeId: plan.snappedNodeId, startedAtMs: simulationElapsedRef.current })
            : agent));
        setFeedback(`${kind} probe accepted on ${plan.navigationRevision ?? 'the current navigation revision'}; ${plan.route.crossedDoorIds.join(', ') || 'no door transition'}.`);
    };

    const beginDrag = (event: PointerEvent<HTMLButtonElement>, agentId: string) => {
        if (mode !== 'debug' || event.button !== 0) return;
        const agent = agentsRef.current.find(candidate => candidate.fixture.id === agentId);
        if (!agent) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        const next: DragState = {
            agentId,
            pointerId: event.pointerId,
            startClient: { x: event.clientX, y: event.clientY },
            origin: agent.point,
            originalAgent: agent,
            preview: agent.point,
            active: false,
            plan: null,
        };
        dragRef.current = next;
        setDragState(next);
    };

    const updateDrag = (event: PointerEvent<HTMLButtonElement>, agentId: string) => {
        const current = dragRef.current;
        if (!current || current.agentId !== agentId || current.pointerId !== event.pointerId) return;
        const activeDrag = current.active || Math.hypot(event.clientX - current.startClient.x, event.clientY - current.startClient.y) >= 6;
        if (!activeDrag) return;
        event.preventDefault();
        const rect = overlayHost?.getBoundingClientRect();
        const local = { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
        const preview = {
            x: (local.x - transform.x) / Math.max(0.001, transform.scale),
            y: (local.y - transform.y) / Math.max(0.001, transform.scale),
        };
        const selection = findValidatedPrototypeRouteToPoint(graph, current.originalAgent, preview, runtimeMetricsRef.current, {
            occupiedPoints: agentsRef.current.filter(agent => agent.fixture.id !== agentId).map(agent => agent.point),
        });
        const next: DragState = { ...current, active: true, preview, plan: selection.status === 'accepted' ? selection.plan : null };
        if (!current.active) {
            setSelectedAgentId(agentId);
            setCardOpen(false);
            setRemoveConfirmation(false);
        }
        dragRef.current = next;
        setDragState(next);
        setFeedback(next.plan ? `Reachable continuous destination preview. Release to walk there.` : 'Invalid destination. Release to keep the agent at its original point.');
    };

    const finishDrag = (event: PointerEvent<HTMLButtonElement>, agentId: string, canceled = false) => {
        const current = dragRef.current;
        if (!current || current.agentId !== agentId || current.pointerId !== event.pointerId) return;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        if (current.active) suppressAgentClickRef.current = true;
        dragRef.current = null;
        setDragState(null);
        if (!current.active) return;
        if (canceled || !current.plan) {
            setFeedback(canceled ? 'Destination drag canceled.' : 'Invalid destination. Agent remained at its original point.');
            return;
        }
        const liveAgent = agentsRef.current.find(agent => agent.fixture.id === agentId);
        if (!liveAgent || liveAgent.revision !== current.originalAgent.revision) {
            setFeedback('Destination preview became stale because the agent changed. Drag again to assign a current route.');
            return;
        }
        const plan = current.plan;
        setClickRouteDiagnostic({
            screen: { x: event.clientX, y: event.clientY }, viewportLocal: current.preview, world: current.preview,
            candidatesEvaluated: plan.candidatesEvaluated, searchRadius: plan.searchRadius,
            acceptedEndpoint: plan.snappedPoint, rejectionReason: null, routeCost: plan.route.cost, clickOffset: plan.snapDistance,
        });
        if (Math.hypot(plan.snappedPoint.x - current.originalAgent.point.x, plan.snappedPoint.y - current.originalAgent.point.y) <= PROTOTYPE_AGENT_RADIUS) {
            setFeedback('Already near the best reachable destination.');
            return;
        }
        commitAgents(previous => previous.map(agent => agent.fixture.id === agentId
            ? startPrototypeRoute(agent, plan, {
                kind: 'walk', phase: 'traveling', destination: plan.snappedPoint, nodeId: plan.snappedNodeId, startedAtMs: simulationElapsedRef.current,
            })
            : agent));
        setCommandMode(null);
        setCardOpen(true);
        setFeedback(plan.snapDistance > 20
            ? `Walking now. Target snapped ${Math.round(plan.snapDistance)}px to reachable navigation.`
            : 'Walking now on the navigation graph.');
    };

    const currentRoom = selectedAgent ? prototypeRoomAtPoint(graph, selectedAgent.point) : null;
    const requestedSpriteState = selectedAgent ? prototypeSpriteState(selectedAgent) : 'idle';
    const requestedSpriteDirection = selectedAgent ? prototypeSpriteDirection(selectedAgent) : 'none';
    const requestedSpriteAssetId = selectedAgent ? prototypeSpriteAssetId(selectedAgent) : null;
    const resolvedSprite = selectedAgent
        ? resolveSpriteClip(AGENT_SPRITE_MANIFEST, requestedSpriteAssetId!, requestedSpriteState, requestedSpriteDirection, reducedMotion)
        : null;
    const selectedSpriteElapsed = selectedAgent && ['walking', 'waiting'].includes(selectedAgent.movementState)
        ? selectedAgent.walkCycleElapsedMs
        : selectedAgent ? Math.max(0, simulationElapsedMs - selectedAgent.task.startedAtMs) : 0;
    const computedSpriteFrame = resolvedSprite && selectedAgent
        ? frameAtElapsedTime(resolvedSprite, selectedSpriteElapsed, 1)
        : selectedSpriteFrame;
    const cardWidth = 326;
    const cardHeightEstimate = mode === 'debug' ? 560 : 300;
    const agentScreenPoint = selectedAgent ? {
        x: transform.x + selectedAgent.point.x * transform.scale,
        y: transform.y + selectedAgent.point.y * transform.scale,
    } : null;
    const cardStyle: CSSProperties | undefined = agentScreenPoint ? {
        left: Math.max(12, Math.min(viewport.width - cardWidth - 12, agentScreenPoint.x + cardWidth + 30 > viewport.width ? agentScreenPoint.x - cardWidth - 22 : agentScreenPoint.x + 22)),
        top: Math.max(12, Math.min(Math.max(12, viewport.height - cardHeightEstimate - 12), agentScreenPoint.y - 150)),
        width: cardWidth,
    } : undefined;

    const agentCard = selectedAgent && cardStyle && cardOpen && !commandMode && !dragState?.active ? (
        <aside
            className="prototype-agent-card"
            style={cardStyle}
            aria-label={`${selectedAgent.fixture.label} details`}
            onClick={event => event.stopPropagation()}
            onWheel={event => event.stopPropagation()}
            onPointerDown={event => event.stopPropagation()}
        >
            <header className="prototype-agent-card__header">
                <div className={`prototype-agent-card__avatar prototype-agent--facing-${selectedAgent.direction}`} aria-hidden="true">
                    <SpritePlayer
                        manifest={AGENT_SPRITE_MANIFEST}
                        runtime={spriteRuntime}
                        assetId={requestedSpriteAssetId!}
                        state={requestedSpriteState}
                        direction={requestedSpriteDirection}
                        reducedMotion={reducedMotion}
                        paused={paused}
                        externalElapsedMs={selectedSpriteElapsed}
                        scale={0.3}
                    />
                </div>
                <div><strong>{selectedAgent.fixture.label}</strong><span>{selectedStatus(selectedAgent)}</span></div>
                <button type="button" aria-label="Close agent card" onClick={() => { setCardOpen(false); setCommandMode(null); }}>×</button>
            </header>
            <div className="prototype-agent-card__facts">
                <div><span>Current task</span><strong>{prototypeTaskSummary(selectedAgent.task)}</strong></div>
                <div><span>Location</span><strong>{currentRoom?.name ?? selectedAgent.fixture.roomName}</strong>{selectedAgent.workstationId && <small>{selectedAgent.workstationId}</small>}</div>
                <div><span>Movement</span><strong>{selectedAgent.movementState} · {(BASE_SPEED_PX_PER_SECOND * playbackSpeed * selectedAgent.speed).toFixed(0)} px/s</strong><small>{selectedAgent.route ? `${Math.max(0, Math.round(selectedAgent.route.length - selectedAgent.progress))}px remaining · ${Math.round(selectedAgent.progress / Math.max(1, selectedAgent.route.length) * 100)}%` : 'No active route'} · {Math.max(0, Math.floor((simulationElapsedMs - selectedAgent.task.startedAtMs) / 1000))}s</small></div>
                {(selectedAgent.workstationId || selectedAgent.partnerAgentId) && <div><span>Relationship</span><strong>{selectedAgent.workstationId ?? `With ${agents.find(agent => agent.fixture.id === selectedAgent.partnerAgentId)?.fixture.label ?? selectedAgent.partnerAgentId}`}</strong></div>}
            </div>
            {mode === 'debug' ? (
                <section className="prototype-agent-card__actions" aria-label="Assign task">
                    <h3>Assign task</h3>
                    <button type="button" onClick={assignWork}>Work at desk</button>
                    <button type="button" className={commandMode === 'talk' ? 'is-active' : ''} onClick={() => { setCommandMode('talk'); setCardOpen(false); setFeedback('Choose another agent sprite as the conversation partner.'); }}>Talk to agent</button>
                    <button type="button" onClick={assignWander}>Wander</button>
                    <button type="button" onClick={() => {
                        commitAgents(previous => previous.map(agent => agent.fixture.id === selectedAgent.fixture.id ? assignPrototypeIdle(agent, simulationElapsedRef.current) : agent));
                        setFeedback(`${selectedAgent.fixture.label} is idle here.`);
                    }}>Idle here</button>
                    <button type="button" onClick={stopSelected}>Stop current task</button>
                    {!removeConfirmation ? (
                        <button type="button" className="prototype-destructive" aria-label="Remove from agent card" onClick={() => setRemoveConfirmation(true)}>Remove</button>
                    ) : (
                        <div className="prototype-remove-confirm" role="alert">
                            <span>Remove this agent?</span><button type="button" onClick={removeSelected}>Confirm</button><button type="button" onClick={() => setRemoveConfirmation(false)}>Cancel</button>
                        </div>
                    )}
                </section>
            ) : <p className="prototype-agent-card__readonly">Office Engine is ambient and read-only. Open Agent Simulation to assign tasks or drag agents to destinations.</p>}
            <details className="prototype-agent-card__advanced">
                <summary>Advanced diagnostics</summary>
                <dl>
                    <dt>Sprite asset</dt><dd>{selectedAgent.fixture.spriteAssetId} · provisional</dd>
                    <dt>Sprite URL</dt><dd>{resolvedSprite?.asset.generatedAssetUrl ?? 'unresolved'}</dd>
                    <dt>Request</dt><dd>{requestedSpriteState} · {requestedSpriteDirection}</dd>
                    <dt>Resolved</dt><dd>{resolvedSprite ? `${resolvedSprite.resolvedState} · ${resolvedSprite.resolvedDirection}` : 'unavailable'}</dd>
                    <dt>Frame</dt><dd>{selectedSpriteFrame || computedSpriteFrame} / {resolvedSprite?.asset.frameCount ?? 0}</dd>
                    <dt>Fallback</dt><dd>{!selectedSpriteAvailability.available ? selectedSpriteAvailability.reason ?? 'texture unavailable' : resolvedSprite?.fallbackChain.join(' → ') ?? 'unresolved'}</dd>
                    <dt>Route</dt><dd>{selectedAgent.route ? `${selectedAgent.route.nodeSequence.length} nodes · ${selectedAgent.route.length}px` : 'none'}</dd>
                    <dt>Node</dt><dd>{selectedAgent.currentNodeId}</dd>
                    <dt>Coordinates</dt><dd>{coordinate(selectedAgent.point)}</dd>
                    <dt>Doors</dt><dd>{selectedAgent.route?.crossedDoorIds.join(', ') || 'none'}</dd>
                    <dt>Velocity</dt><dd>{selectedAgent.velocity.x.toFixed(1)}, {selectedAgent.velocity.y.toFixed(1)} px/s</dd>
                    <dt>Tangent</dt><dd>{selectedAgent.routeTangent.x.toFixed(2)}, {selectedAgent.routeTangent.y.toFixed(2)}</dd>
                    <dt>Footprint</dt><dd>r={PROTOTYPE_AGENT_RADIUS}px</dd>
                    <dt>Sprite size</dt><dd>{PROTOTYPE_SPRITE_WORLD_SIZE} world px · {(PROTOTYPE_SPRITE_WORLD_SIZE * transform.scale).toFixed(1)} screen px</dd>
                    <dt>Reserved</dt><dd>{selectedAgent.reservedNodeId ?? 'none'} · {selectedAgent.reservedEdgeKey ?? 'no edge'}</dd>
                    <dt>Traffic</dt><dd>{selectedAgent.blockedByAgentId ? `waiting for ${selectedAgent.blockedByAgentId}` : 'clear'} · {Math.round(selectedAgent.blockedDurationMs)}ms</dd>
                    <dt>Static check</dt><dd>{selectedAgent.staticCollisionStatus}</dd>
                </dl>
            </details>
        </aside>
    ) : null;
    const interactionBanner = (mode === 'debug' || commandMode || dragState?.active) ? (
        <div className={`prototype-command-banner ${dragState?.active && !dragState.plan ? 'is-invalid' : ''}`}>
            {dragState?.active
                ? `Route ${selectedAgent?.fixture.label ?? 'agent'} · ${dragState.plan ? 'release to walk' : 'invalid destination'} · Esc cancels`
                : commandMode === 'talk' ? 'Choose a conversation partner · Esc cancels'
                    : selectedAgent ? 'Agent click: inspect · agent drag: preview and assign route · empty drag: pan' : 'Agent click: inspect · empty drag: pan'}
        </div>
    ) : null;

    const advancedDetails = (
        <details className="prototype-advanced">
            <summary>Advanced diagnostics</summary>
            <dl>
                <dt>Continuous graph</dt><dd>{navigationField.cells.length} cells · {navigationField.componentSizes[navigationField.interiorComponentId]} authoritative · revision {navigationField.navigationRevision}</dd>
                <dt>Connectivity</dt><dd>1 interior component · {navigationField.excludedComponents.length} classified exclusions · {navigationField.doorLinks.filter(link => link.classification === 'interior').length} reversible doors</dd>
                <dt>Transform</dt><dd>zoom {transform.scale.toFixed(3)} · pan {Math.round(transform.x)}, {Math.round(transform.y)}</dd>
                <dt>Viewport</dt><dd>{Math.round(viewport.width)} × {Math.round(viewport.height)}</dd>
                <dt>Pointer</dt><dd>{coordinate(pointer)}</dd>
                <dt>Last destination drag</dt><dd>{clickRouteDiagnostic
                    ? `screen ${coordinate(clickRouteDiagnostic.screen)} · local ${coordinate(clickRouteDiagnostic.viewportLocal)} · world ${coordinate(clickRouteDiagnostic.world)} · ${clickRouteDiagnostic.candidatesEvaluated} candidates/${clickRouteDiagnostic.searchRadius}px · endpoint ${coordinate(clickRouteDiagnostic.acceptedEndpoint)} · cost ${clickRouteDiagnostic.routeCost ?? 'n/a'} · offset ${clickRouteDiagnostic.clickOffset === null ? 'n/a' : Math.round(clickRouteDiagnostic.clickOffset)} · ${clickRouteDiagnostic.rejectionReason ?? 'accepted'}`
                    : 'none'}</dd>
                <dt>Agent node</dt><dd>{selectedAgent?.currentNodeId ?? 'none'}</dd>
                <dt>Route</dt><dd>{selectedAgent?.route ? `${selectedAgent.route.nodeSequence.length} nodes · ${selectedAgent.route.length}px · ${selectedAgent.route.crossedDoorIds.join(', ') || 'no doors'}` : 'none'}</dd>
                <dt>Door policy</dt><dd>{PROTOTYPE_DOOR_POLICY} · {graph.doors.length}/{graph.doors.length} open</dd>
                <dt>Door endpoints</dt><dd>{portalEndpointAudit.filter(item => item.status === 'provisional-valid').length}/{portalEndpointAudit.length} provisional-valid</dd>
                <dt>Door classifications</dt><dd>{navigationField.doorLinks.filter(item => item.classification === 'interior').length} interior · {navigationField.doorLinks.filter(item => item.classification === 'exterior').length} exterior · {navigationField.doorLinks.filter(item => item.classification === 'malformed').length} malformed</dd>
                <dt>D46 repair</dt><dd>{navigationField.doorLinks.find(item => item.doorId === 'D46')?.reason ?? 'missing'}</dd>
                <dt>Loop</dt><dd>1 RAF · {runtimeDiagnostics.fps.toFixed(1)} fps · median {runtimeDiagnostics.medianFrameMs.toFixed(1)}ms · p95 {runtimeDiagnostics.p95FrameMs.toFixed(1)}ms</dd>
                <dt>Tick</dt><dd>{runtimeDiagnostics.lastTickMs.toFixed(2)}ms · max {runtimeDiagnostics.longestTickMs.toFixed(2)}ms · frame max {runtimeDiagnostics.longestFrameMs.toFixed(1)}ms</dd>
                <dt>Traffic</dt><dd>{movingCount} moving · {waitingCount} waiting · {runtimeDiagnostics.collisionChecks} checks · {runtimeDiagnostics.collisionConflicts} conflicts</dd>
                <dt>Portals</dt><dd>{agents.filter(agent => Boolean(agent.portalTransition)).length} active · {runtimeDiagnostics.portalTransitions} transitions · {runtimeDiagnostics.portalWaits} waits</dd>
                <dt>Planning</dt><dd>{runtimeDiagnostics.graphBuilds} graph builds · {runtimeDiagnostics.routePlans} plans · {runtimeDiagnostics.routeReplans} replans</dd>
                <dt>Route outcomes</dt><dd>{runtimeDiagnostics.routeSuccessfulPlans} successful · {runtimeDiagnostics.routeProjectedDestinations} projected · {runtimeDiagnostics.routeStartRecoveries} recovered starts · {runtimeDiagnostics.routeFailures} rejected · max {runtimeDiagnostics.longestRoutePlanMs.toFixed(1)}ms</dd>
                <dt>Route cache</dt><dd>{runtimeDiagnostics.routeCacheHits} hits · {runtimeDiagnostics.routeCacheMisses} misses · {runtimeDiagnostics.routeCacheSize}/256 entries</dd>
                <dt>Commits</dt><dd>{runtimeDiagnostics.stateCommits} agent snapshots · 30/s maximum</dd>
                <dt>Last message</dt><dd>{feedback}</dd>
                <dt>Last pause</dt><dd>{runtimeDiagnostics.lastGlobalPauseMs.toFixed(1)}ms</dd>
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
                {atLimit && <p className="prototype-limit" role="status">{PROTOTYPE_AGENT_LIMIT}-agent limit reached</p>}
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
                    <div className="prototype-inline-actions" aria-label="Navigation probes">
                        <button type="button" onClick={() => assignNavigationProbe('long')}>Long route probe</button>
                        <button type="button" onClick={() => assignNavigationProbe('projection')}>Projection probe</button>
                        <button type="button" onClick={() => assignNavigationProbe('d46')}>D46 probe</button>
                        <button type="button" onClick={() => assignNavigationProbe('exterior')}>Exterior probe</button>
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
                        ['nodes', 'Continuous clearance cells'], ['edges', 'Continuous navigation edges'], ['colliders', 'Modeled colliders'], ['doors', 'Door classifications'],
                        ['routes', 'Route previews'], ['destinations', 'Destinations'], ['labels', 'Agent labels'], ['agentBounds', 'Agent debug bounds'],
                        ['workstations', 'Workstation anchors'],
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
                <label className="prototype-count-label">Agents · {ambientCount}
                    <input aria-label="Office Engine agent count" type="range" min="1" max={PROTOTYPE_AGENT_LIMIT} step="1" value={ambientCount} onChange={event => setAgentCount(Number(event.target.value))} />
                </label>
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
                    {localOverlays.edges && continuousOverlay.edges.map((edge, index) => <line key={`${edge.from.id}:${edge.to.id}:${index}`} className={edge.doorId ? 'edge edge--door' : 'edge'} x1={edge.from.point.x} y1={edge.from.point.y} x2={edge.to.point.x} y2={edge.to.point.y} />)}
                    {localOverlays.nodes && continuousOverlay.cells.map(cell => <circle key={cell.id} className={navigationField.componentByCellId.get(cell.id) === navigationField.interiorComponentId ? 'node' : 'node node--excluded'} cx={cell.point.x} cy={cell.point.y} r="12" />)}
                    {localOverlays.doors && navigationField.doorLinks.map(door => <g key={door.doorId} data-door-id={door.doorId} data-door-classification={door.classification}><circle className={`door door--${door.classification}`} cx={door.thresholdPoint.x} cy={door.thresholdPoint.y} r="32" />{localOverlays.labels && <text x={door.thresholdPoint.x + 38} y={door.thresholdPoint.y}>{door.doorId}</text>}</g>)}
                </svg>
            )}
            {localOverlays.doors && d46RegistrationOverlay && (
                <svg className="floor1-candidate-debug floor1-candidate-debug--d46" aria-label="D46 provisional registration audit">
                    <polygon className="room" points={d46RegistrationOverlay.room.polygon.map(point => `${point.x},${point.y}`).join(' ')} />
                    <circle className="envelope" cx={d46RegistrationOverlay.door.point.x} cy={d46RegistrationOverlay.door.point.y} r={PROTOTYPE_CLICK_SNAP_LIMIT} />
                    <line className="proposal" x1={d46RegistrationOverlay.door.point.x} y1={d46RegistrationOverlay.door.point.y} x2={d46RegistrationOverlay.repairedLink.thresholdPoint.x} y2={d46RegistrationOverlay.repairedLink.thresholdPoint.y} />
                    <circle className="approach" cx={d46RegistrationOverlay.repairedLink.thresholdPoint.x} cy={d46RegistrationOverlay.repairedLink.thresholdPoint.y} r="42" />
                    <text x={d46RegistrationOverlay.repairedLink.thresholdPoint.x + 50} y={d46RegistrationOverlay.repairedLink.thresholdPoint.y - 45}>D46 image-guided repair</text>
                    {d46RegistrationOverlay.nearbyColliders.map(collider => collider.closed
                        ? <polygon className="collision" key={collider.id} points={collider.points.map(point => `${point.x},${point.y}`).join(' ')} strokeWidth={collider.thickness} />
                        : <polyline className="collision" key={collider.id} points={collider.points.map(point => `${point.x},${point.y}`).join(' ')} strokeWidth={collider.thickness} fill="none" />)}
                    {d46RegistrationOverlay.approachPoint && <>
                        <line className="proposal" x1={d46RegistrationOverlay.door.point.x} y1={d46RegistrationOverlay.door.point.y} x2={d46RegistrationOverlay.approachPoint.x} y2={d46RegistrationOverlay.approachPoint.y} />
                        <circle className="approach" cx={d46RegistrationOverlay.approachPoint.x} cy={d46RegistrationOverlay.approachPoint.y} r="34" />
                        <text x={d46RegistrationOverlay.approachPoint.x + 46} y={d46RegistrationOverlay.approachPoint.y - 32}>proposed approach</text>
                    </>}
                    {d46RegistrationOverlay.interiorPoint && <>
                        <line className="proposal proposal--rejected" x1={d46RegistrationOverlay.door.point.x} y1={d46RegistrationOverlay.door.point.y} x2={d46RegistrationOverlay.interiorPoint.x} y2={d46RegistrationOverlay.interiorPoint.y} />
                        <circle className="interior" cx={d46RegistrationOverlay.interiorPoint.x} cy={d46RegistrationOverlay.interiorPoint.y} r="34" />
                        <text x={d46RegistrationOverlay.interiorPoint.x + 46} y={d46RegistrationOverlay.interiorPoint.y + 76}>nearest Focus D support (outside envelope)</text>
                    </>}
                    <circle className="threshold" cx={d46RegistrationOverlay.door.point.x} cy={d46RegistrationOverlay.door.point.y} r="42" />
                    <text x={d46RegistrationOverlay.door.point.x + 54} y={d46RegistrationOverlay.door.point.y + 72}>D46 registered threshold · unsupported</text>
                    <text className="status" x={d46RegistrationOverlay.door.point.x - 570} y={d46RegistrationOverlay.door.point.y + 700}>
                        legacy 620px baseline · {d46RegistrationOverlay.audit?.status ?? 'audit missing'} · repaired continuous threshold shown
                    </text>
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
            {localOverlays.workstations && (
                <svg className="floor1-candidate-debug floor1-candidate-debug--graph" aria-label="Workstation anchors">
                    {workstations.map(workstation => <g key={workstation.id} data-workstation-id={workstation.id}>
                        <line className="edge" x1={workstation.approachPoint.x} y1={workstation.approachPoint.y} x2={workstation.workingAnchor.x} y2={workstation.workingAnchor.y} />
                        <circle className="node" cx={workstation.approachPoint.x} cy={workstation.approachPoint.y} r={PROTOTYPE_AGENT_RADIUS} />
                        <circle className="door door--open" cx={workstation.workingAnchor.x} cy={workstation.workingAnchor.y} r="22" />
                        <text x={workstation.workingAnchor.x + 30} y={workstation.workingAnchor.y}>{workstation.id}</text>
                    </g>)}
                </svg>
            )}
            {dragState?.active && (
                <svg className="floor1-candidate-drag-feedback" aria-label="Agent route destination preview">
                    <circle className="origin" cx={dragState.origin.x} cy={dragState.origin.y} r="58" />
                    <line x1={dragState.origin.x} y1={dragState.origin.y} x2={dragState.preview.x} y2={dragState.preview.y} />
                    {dragState.plan && <circle className="snap" cx={dragState.plan.snappedPoint.x} cy={dragState.plan.snappedPoint.y} r="48" />}
                </svg>
            )}
            <div className="prototype-agent-layer">
                {agents.map(agent => {
                    const dragging = dragState?.active && dragState.agentId === agent.fixture.id;
                    return (
                        <PrototypeAgentRenderer
                            key={agent.fixture.id}
                            agent={agent}
                            runtime={spriteRuntime}
                            elapsedMs={simulationElapsedMs}
                            selected={selectedAgentId === agent.fixture.id}
                            transformScale={transform.scale}
                            reducedMotion={reducedMotion}
                            paused={paused}
                            showLabel={mode === 'debug' ? localOverlays.labels : selectedAgentId === agent.fixture.id}
                            showBounds={localOverlays.agentBounds}
                            dragging={Boolean(dragging)}
                            labelPlacement={labelPlacements.get(agent.fixture.id)}
                            onSelect={selectAgent}
                            onPointerDown={beginDrag}
                            onPointerMove={updateDrag}
                            onPointerUp={(event, agentId) => finishDrag(event, agentId)}
                            onPointerCancel={(event, agentId) => finishDrag(event, agentId, true)}
                            onFrameChange={selectedAgentId === agent.fixture.id ? (_agentId, frame) => setSelectedSpriteFrame(frame) : undefined}
                            onAvailabilityChange={selectedAgentId === agent.fixture.id ? (_agentId, available, reason) => setSelectedSpriteAvailability(previous => previous.available === available && previous.reason === reason ? previous : { available, reason }) : undefined}
                        />
                    );
                })}
            </div>
            {!graph.navigationAvailable && <div className="floor1-candidate-unavailable" role="alert">{graph.unavailableReason ?? 'Candidate navigation unavailable.'}</div>}
            {controlHost ? createPortal(mode === 'ambient' ? ambientControls : debugControls, controlHost) : mode === 'ambient' ? ambientControls : debugControls}
            {overlayHost
                ? createPortal(<>{interactionBanner}{agentCard}</>, overlayHost)
                : <>{interactionBanner}{agentCard}</>}
        </div>
    );
}
