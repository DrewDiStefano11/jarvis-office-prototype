import { OFFICE_SOURCE_HEIGHT, OFFICE_SOURCE_WIDTH } from '../../constants';
import type { Point } from '../../types';
import type { SpriteDirection, SpriteState } from '../../sprites/types';
import { AGENT_SPRITE_MANIFEST } from '../../sprites/manifest';
import {
    AGENT_FOOTPRINT_RADIUS,
    advanceCandidateAgents,
    candidatePointHasStaticClearance,
    candidateSegmentHasStaticClearance,
    pointInPolygon,
    validateCandidateRouteSegments,
    type CandidateAgentFixture,
    type CandidateDoorStep,
    type CandidateDoorRuntime,
    type CandidateNavigationGraph,
    type CandidateRouteResult,
} from './candidateNavigation';

export const PROTOTYPE_AGENT_LIMIT = 50;
export const PROTOTYPE_ACTIVITY_SPRITE_ASSET_ID = 'agent-activity-sheet-01';
export const PROTOTYPE_CLICK_SNAP_LIMIT = 620;
export const PROTOTYPE_DOOR_POLICY = 'prototype-open' as const;
export const PROTOTYPE_AGENT_RADIUS = AGENT_FOOTPRINT_RADIUS;
export const PROTOTYPE_AGENT_DIAMETER = PROTOTYPE_AGENT_RADIUS * 2;
export const PROTOTYPE_SPRITE_WORLD_SIZE = 181;
export const PROTOTYPE_NOMINAL_WALK_SPEED = 180;
export const PROTOTYPE_DIRECTION_VELOCITY_EPSILON = 8;
export const PROTOTYPE_DIRECTION_AXIS_HYSTERESIS = 1.28;
export const PROTOTYPE_PORTAL_OUT_MS = 160;
export const PROTOTYPE_PORTAL_HIDDEN_MS = 120;
export const PROTOTYPE_PORTAL_IN_MS = 220;
export const PROTOTYPE_PORTAL_TOTAL_MS = PROTOTYPE_PORTAL_OUT_MS + PROTOTYPE_PORTAL_HIDDEN_MS + PROTOTYPE_PORTAL_IN_MS;
export const PROTOTYPE_D01_ROOM_BRIDGE = [
    { x: 958.194311111111, y: 2011.9608888888893 },
    { x: 800, y: 2100 },
    { x: 800, y: 2350 },
    { x: 950, y: 2350 },
    { x: 1500, y: 2430 },
    { x: 2000.9333333333334, y: 2450.3128888888887 },
] as const satisfies readonly Point[];
const PROTOTYPE_TRAFFIC_CELL_SIZE = 160;
const PROTOTYPE_TRAFFIC_CLEARANCE = PROTOTYPE_AGENT_DIAMETER + 4;
const PROTOTYPE_MOTION_SPRITE_ASSETS = AGENT_SPRITE_MANIFEST.assets
    .filter(asset => asset.runtimeCapability === 'limited-cardinal-idle-walk');

export type PrototypeActivityState = 'walking' | 'working-at-desk' | 'idle' | 'talking' | 'waiting' | 'moving-to-task';
export type PrototypePortalPhase = 'portal-out' | 'hidden-transition' | 'portal-in';
export type PrototypeMovementState = 'idle' | 'walking' | 'waiting' | 'paused' | 'arrived' | 'stopped' | 'blocked' | PrototypePortalPhase;

export type PrototypePortalTransition = Readonly<{
    doorId: string;
    phase: PrototypePortalPhase;
    elapsedMs: number;
    approachPoint: Point;
    thresholdPoint: Point;
    exitPoint: Point;
    exitDistance: number;
}>;

type TimedTask = Readonly<{ startedAtMs: number }>;
export type PrototypeTask =
    | (TimedTask & Readonly<{ kind: 'idle'; reason: 'spawned' | 'assigned' | 'ambient-break' | 'arrived' | 'route-failed' }>)
    | (TimedTask & Readonly<{ kind: 'stopped'; reason: 'user' | 'reset' }>)
    | (TimedTask & Readonly<{ kind: 'walk'; phase: 'traveling' | 'arrived'; destination: Point; nodeId: string }>)
    | (TimedTask & Readonly<{ kind: 'work'; phase: 'traveling' | 'approaching' | 'working'; workstationId: string; destination: Point; nodeId: string; workingAnchor?: Point; facing?: PrototypeAgent['direction'] }>)
    | (TimedTask & Readonly<{ kind: 'talk'; phase: 'traveling' | 'talking'; partnerAgentId: string; destination: Point; nodeId: string }>)
    | (TimedTask & Readonly<{ kind: 'wander'; phase: 'traveling' | 'arrived'; destination: Point; nodeId: string; seed: number }>)
    | (TimedTask & Readonly<{ kind: 'reposition'; origin: Point; preview: Point | null }>);

export type PrototypeAgent = Readonly<{
    fixture: CandidateAgentFixture;
    point: Point;
    spawnPoint: Point;
    currentNodeId: string;
    route: CandidateRouteResult | null;
    progress: number;
    movementState: PrototypeMovementState;
    activityState: PrototypeActivityState;
    targetPoint: Point | null;
    clickedPoint: Point | null;
    direction: 'north' | 'south' | 'east' | 'west';
    velocity: Point;
    resolvedVelocity: Point;
    routeTangent: Point;
    portalTransition?: PrototypePortalTransition;
    speed: number;
    distanceTravelled: number;
    walkCycleElapsedMs: number;
    activityUntil: number;
    blockedDurationMs: number;
    blockedByAgentId?: string;
    reservedNodeId?: string;
    reservedEdgeKey?: string;
    replanCooldownMs: number;
    replanAttempts: number;
    trafficOffset: Point;
    staticCollisionStatus: 'clear' | 'blocked';
    partnerAgentId?: string;
    workstationId?: string;
    task: PrototypeTask;
    revision: number;
}>;

export type PrototypeWorkstation = Readonly<{
    id: string;
    computerId?: string;
    workingAnchor: Point;
    approachPoint: Point;
    approachNodeId: string;
    facing: PrototypeAgent['direction'];
}>;

export type PrototypeRuntimeMetrics = {
    rafFrames: number;
    simulationTicks: number;
    graphBuilds: number;
    routePlans: number;
    routeReplans: number;
    collisionChecks: number;
    collisionConflicts: number;
    longestTickMs: number;
    lastTickMs: number;
    longestFrameMs: number;
    lastGlobalPauseMs: number;
    stateCommits: number;
    portalTransitions: number;
    portalWaits: number;
};

export function createPrototypeRuntimeMetrics(): PrototypeRuntimeMetrics {
    return {
        rafFrames: 0,
        simulationTicks: 0,
        graphBuilds: 0,
        routePlans: 0,
        routeReplans: 0,
        collisionChecks: 0,
        collisionConflicts: 0,
        longestTickMs: 0,
        lastTickMs: 0,
        longestFrameMs: 0,
        lastGlobalPauseMs: 0,
        stateCommits: 0,
        portalTransitions: 0,
        portalWaits: 0,
    };
}

export type PrototypeSnapResult = Readonly<{
    point: Point;
    nodeId: string;
    roomId: string;
    distance: number;
}>;

export type PrototypeRoutePlan = Readonly<{
    route: CandidateRouteResult;
    clickedPoint: Point;
    snappedPoint: Point;
    snappedNodeId: string;
    snapDistance: number;
    candidatesEvaluated: number;
    searchRadius: number;
}>;

export type PrototypeLabelSide = 'above' | 'upper-left' | 'upper-right' | 'below' | 'lower-left' | 'lower-right';
export type PrototypeLabelPlacement = Readonly<{ x: number; y: number; side: PrototypeLabelSide }>;
export type PrototypeLabelLayoutOptions = Readonly<{
    offsetX?: number;
    offsetY?: number;
    viewportWidth?: number;
    viewportHeight?: number;
    selectedAgentId?: string | null;
    previous?: ReadonlyMap<string, PrototypeLabelPlacement>;
}>;

export function layoutPrototypeAgentLabels(
    agents: readonly PrototypeAgent[],
    transformScale: number,
    options: PrototypeLabelLayoutOptions = {},
): ReadonlyMap<string, PrototypeLabelPlacement> {
    const scale = Math.max(0.001, transformScale);
    const occupied: Array<{ left: number; top: number; right: number; bottom: number }> = [];
    const result = new Map<string, PrototypeLabelPlacement>();
    const candidates = [
        { side: 'above' as const, dx: 0, dy: -205 },
        { side: 'upper-left' as const, dx: -68, dy: -187 },
        { side: 'upper-right' as const, dx: 68, dy: -187 },
        { side: 'below' as const, dx: 0, dy: 25 },
        { side: 'lower-left' as const, dx: -74, dy: 22 },
        { side: 'lower-right' as const, dx: 74, dy: 22 },
    ];
    const sortedAgents = agents.slice().sort((a, b) => {
        const selectedOrder = Number(b.fixture.id === options.selectedAgentId) - Number(a.fixture.id === options.selectedAgentId);
        return selectedOrder || a.point.y - b.point.y || a.fixture.id.localeCompare(b.fixture.id);
    });
    for (const agent of sortedAgents) {
        const baseX = agent.point.x * scale + (options.offsetX ?? 0);
        const baseY = agent.point.y * scale + (options.offsetY ?? 0);
        const previousSide = options.previous?.get(agent.fixture.id)?.side;
        const scored = candidates.map((candidate, preference) => {
            const centerX = baseX + candidate.dx;
            const centerY = baseY + candidate.dy;
            const box = { left: centerX - 28, right: centerX + 28, top: centerY - 15, bottom: centerY + 15 };
            const overlapCount = occupied.filter(item => !(box.right + 4 < item.left || box.left - 4 > item.right || box.bottom + 4 < item.top || box.top - 4 > item.bottom)).length;
            const clipped = Math.max(0, -box.left)
                + Math.max(0, -box.top)
                + Math.max(0, box.right - (options.viewportWidth ?? Number.POSITIVE_INFINITY))
                + Math.max(0, box.bottom - (options.viewportHeight ?? Number.POSITIVE_INFINITY));
            const stabilityPenalty = previousSide && previousSide !== candidate.side ? 12 : 0;
            return { candidate, score: overlapCount * 10_000 + clipped * 100 + preference * 10 + stabilityPenalty };
        });
        const chosen = scored.sort((a, b) => a.score - b.score || a.candidate.side.localeCompare(b.candidate.side))[0].candidate;
        const centerX = baseX + chosen.dx;
        const centerY = baseY + chosen.dy;
        occupied.push({ left: centerX - 28, right: centerX + 28, top: centerY - 15, bottom: centerY + 15 });
        result.set(agent.fixture.id, {
            x: PROTOTYPE_SPRITE_WORLD_SIZE / 2 + chosen.dx / scale,
            y: PROTOTYPE_SPRITE_WORLD_SIZE + chosen.dy / scale,
            side: chosen.side,
        });
    }
    return result;
}

export type PrototypeRouteRejectionReason =
    | 'outside-office'
    | 'no-navigation-start'
    | 'no-nearby-candidate'
    | 'different-component'
    | 'collision-blocked'
    | 'destination-occupied'
    | 'transition-unavailable'
    | 'no-route';

export type PrototypeRouteSelection =
    | Readonly<{ status: 'accepted'; plan: PrototypeRoutePlan }>
    | Readonly<{
        status: 'rejected';
        reason: PrototypeRouteRejectionReason;
        message: string;
        candidatesEvaluated?: number;
        searchRadius?: number;
    }>;

function distance(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointSegmentDistance(point: Point, a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const denominator = dx * dx + dy * dy;
    if (denominator === 0) return distance(point, a);
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / denominator));
    return distance(point, { x: a.x + dx * t, y: a.y + dy * t });
}

function projectPointToSegment(point: Point, a: Point, b: Point): Point {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const denominator = dx * dx + dy * dy;
    if (denominator <= 1e-7) return a;
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / denominator));
    return { x: a.x + dx * t, y: a.y + dy * t };
}

function pointKey(point: Point): string {
    return `${Math.round(point.x * 100) / 100},${Math.round(point.y * 100) / 100}`;
}

function subtract(a: Point, b: Point): Point {
    return { x: a.x - b.x, y: a.y - b.y };
}

function add(a: Point, b: Point): Point {
    return { x: a.x + b.x, y: a.y + b.y };
}

function scalePoint(point: Point, scale: number): Point {
    return { x: point.x * scale, y: point.y * scale };
}

function normalize(point: Point): Point {
    const length = Math.hypot(point.x, point.y);
    return length <= 1e-7 ? { x: 0, y: 0 } : { x: point.x / length, y: point.y / length };
}

function runtimeNow(): number {
    return typeof performance === 'undefined' ? Date.now() : performance.now();
}

export function prototypeFacingFromVelocity(
    current: PrototypeAgent['direction'],
    velocity: Point,
    epsilon = PROTOTYPE_DIRECTION_VELOCITY_EPSILON,
    hysteresis = PROTOTYPE_DIRECTION_AXIS_HYSTERESIS,
): PrototypeAgent['direction'] {
    const absX = Math.abs(velocity.x);
    const absY = Math.abs(velocity.y);
    if (Math.hypot(absX, absY) < epsilon) return current;
    const horizontal = current === 'east' || current === 'west';
    if (horizontal && absY <= absX * hysteresis) return velocity.x >= 0 ? 'east' : 'west';
    if (!horizontal && absX <= absY * hysteresis) return velocity.y >= 0 ? 'south' : 'north';
    return absX >= absY ? (velocity.x >= 0 ? 'east' : 'west') : (velocity.y >= 0 ? 'south' : 'north');
}

function routePointAtProgress(points: readonly Point[], progress: number): Point {
    if (points.length === 0) return { x: 0, y: 0 };
    let remaining = Math.max(0, progress);
    for (let index = 1; index < points.length; index += 1) {
        const segmentLength = distance(points[index - 1], points[index]);
        if (remaining <= segmentLength) {
            const ratio = segmentLength <= 1e-7 ? 0 : remaining / segmentLength;
            return {
                x: points[index - 1].x + (points[index].x - points[index - 1].x) * ratio,
                y: points[index - 1].y + (points[index].y - points[index - 1].y) * ratio,
            };
        }
        remaining -= segmentLength;
    }
    return points[points.length - 1];
}

function routeSegmentAtProgress(points: readonly Point[], progress: number) {
    let remaining = Math.max(0, progress);
    for (let index = 1; index < points.length; index += 1) {
        const segmentLength = distance(points[index - 1], points[index]);
        if (remaining <= segmentLength || index === points.length - 1) {
            const tangent = normalize(subtract(points[index], points[index - 1]));
            return { index, tangent, from: points[index - 1], to: points[index] };
        }
        remaining -= segmentLength;
    }
    return null;
}

function routeSegmentEndProgress(points: readonly Point[], progress: number): number {
    let accumulated = 0;
    for (let index = 1; index < points.length; index += 1) {
        accumulated += distance(points[index - 1], points[index]);
        if (progress < accumulated - 0.001 || index === points.length - 1) return accumulated;
    }
    return accumulated;
}

function undirectedEdgeKey(a: Point, b: Point): string {
    const first = pointKey(a);
    const second = pointKey(b);
    return first.localeCompare(second) <= 0 ? `${first}|${second}` : `${second}|${first}`;
}

class PrototypeSpatialHash {
    private readonly cells = new Map<string, Array<{ id: string; point: Point }>>();

    private key(point: Point): string {
        return `${Math.floor(point.x / PROTOTYPE_TRAFFIC_CELL_SIZE)},${Math.floor(point.y / PROTOTYPE_TRAFFIC_CELL_SIZE)}`;
    }

    insert(id: string, point: Point): void {
        const key = this.key(point);
        this.cells.set(key, [...(this.cells.get(key) ?? []), { id, point }]);
    }

    nearby(point: Point): readonly { id: string; point: Point }[] {
        const cellX = Math.floor(point.x / PROTOTYPE_TRAFFIC_CELL_SIZE);
        const cellY = Math.floor(point.y / PROTOTYPE_TRAFFIC_CELL_SIZE);
        const result: Array<{ id: string; point: Point }> = [];
        for (let x = cellX - 1; x <= cellX + 1; x += 1) {
            for (let y = cellY - 1; y <= cellY + 1; y += 1) result.push(...(this.cells.get(`${x},${y}`) ?? []));
        }
        return result;
    }
}

type PrototypeWalkNetwork = Readonly<{
    points: ReadonlyMap<string, Point>;
    nodeIds: ReadonlyMap<string, string>;
    keyByNodeId: ReadonlyMap<string, string>;
    roomIdsByKey: ReadonlyMap<string, readonly string[]>;
    adjacency: ReadonlyMap<string, readonly Readonly<{ to: string; length: number }>[] >;
    componentByKey: ReadonlyMap<string, number>;
    clearSegmentKeys: ReadonlySet<string>;
}>;

const WALK_NETWORK_CACHE = new WeakMap<object, PrototypeWalkNetwork>();
const WORKSTATION_CACHE = new WeakMap<object, readonly PrototypeWorkstation[]>();
const PORTAL_AUDIT_CACHE = new WeakMap<object, readonly PrototypePortalEndpointAudit[]>();
const AMBIENT_PATROL_CACHE = new WeakMap<object, Map<string, Readonly<{ forward: PrototypeRoutePlan; reverse: PrototypeRoutePlan }>>>();

function prototypeWalkNetwork(graph: CandidateNavigationGraph, metrics?: PrototypeRuntimeMetrics): PrototypeWalkNetwork {
    const cached = WALK_NETWORK_CACHE.get(graph);
    if (cached) return cached;
    if (metrics) metrics.graphBuilds += 1;
    const points = new Map<string, Point>();
    const nodeIds = new Map<string, string>();
    const keyByNodeId = new Map<string, string>();
    const roomIdsByKey = new Map<string, readonly string[]>();
    const mutable = new Map<string, Array<{ to: string; length: number }>>();
    const clearSegmentKeys = new Set<string>();
    for (const node of graph.walkNodes) {
        const key = pointKey(node.point);
        points.set(key, node.point);
        keyByNodeId.set(node.id, key);
        const roomIds = node.roomIds.length > 0 ? node.roomIds : [node.roomId];
        roomIdsByKey.set(key, [...new Set([...(roomIdsByKey.get(key) ?? []), ...roomIds])]);
        if (!nodeIds.has(key) || node.id.localeCompare(nodeIds.get(key)!) < 0) nodeIds.set(key, node.id);
    }
    for (const segment of graph.walkSegments) {
        const a = pointKey(segment.a);
        const b = pointKey(segment.b);
        points.set(a, segment.a);
        points.set(b, segment.b);
        if (candidateSegmentHasStaticClearance(graph, segment.a, segment.b)) {
            clearSegmentKeys.add(undirectedEdgeKey(segment.a, segment.b));
            const length = distance(segment.a, segment.b);
            mutable.set(a, [...(mutable.get(a) ?? []), { to: b, length }]);
            mutable.set(b, [...(mutable.get(b) ?? []), { to: a, length }]);
        }
    }
    const componentByKey = new Map<string, number>();
    let componentId = 0;
    for (const key of points.keys()) {
        if (componentByKey.has(key)) continue;
        const queue = [key];
        componentByKey.set(key, componentId);
        for (let cursor = 0; cursor < queue.length; cursor += 1) {
            const current = queue[cursor];
            for (const edge of mutable.get(current) ?? []) {
                if (componentByKey.has(edge.to)) continue;
                componentByKey.set(edge.to, componentId);
                queue.push(edge.to);
            }
        }
        componentId += 1;
    }
    for (const door of graph.doors) {
        const doorKey = `door:${door.id}`;
        points.set(doorKey, door.point);
        nodeIds.set(doorKey, doorKey);
    }
    const adjacency = new Map<string, readonly Readonly<{ to: string; length: number }>[] >();
    mutable.forEach((edges, key) => adjacency.set(key, edges.sort((a, b) => a.to.localeCompare(b.to))));
    const network = { points, nodeIds, keyByNodeId, roomIdsByKey, adjacency, componentByKey, clearSegmentKeys };
    WALK_NETWORK_CACHE.set(graph, network);
    return network;
}

export function prototypeDoorTraversalCoverage(graph: CandidateNavigationGraph): readonly string[] {
    return graph.doors.map(door => door.id).sort((a, b) => a.localeCompare(b));
}

export type PrototypePortalEndpointAudit = Readonly<{
    doorId: string;
    approachPoint: Point | null;
    exitPoint: Point | null;
    status: 'provisional-valid' | 'disabled-incomplete';
    reason: string;
}>;

export type PrototypeDoorConnectivityAudit = Readonly<{
    doorId: string;
    doorPoint: Point;
    probePoint: Point | null;
    probeNodeId: string | null;
    probeNodePoint: Point | null;
    probeRoomIds: readonly string[];
    probeComponentId: number | null;
    zones: readonly Readonly<{
        zoneId: string;
        roomExists: boolean;
        nearbyNodes: readonly Readonly<{ id: string; point: Point; componentId: number | null; distance: number }>[];
        nearestClearConnector: Readonly<{ fromNodeId: string; from: Point; toNodeId: string; to: Point; length: number }> | null;
        clearConnectors: readonly Readonly<{ fromNodeId: string; from: Point; toNodeId: string; to: Point; length: number }>[];
    }>[];
}>;

export function auditPrototypeDoorConnectivity(
    graph: CandidateNavigationGraph,
    doorId: string,
    probePoint: Point | null = null,
): PrototypeDoorConnectivityAudit | null {
    const door = graph.doors.find(candidate => candidate.id === doorId);
    if (!door) return null;
    const network = prototypeWalkNetwork(graph);
    const probeKey = probePoint ? nearestNetworkKey(network, probePoint) : null;
    const probeNode = probeKey ? graph.walkNodes
        .filter(node => pointKey(node.point) === probeKey)
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id))[0] ?? null : null;
    const probeComponentId = probeKey ? network.componentByKey.get(probeKey) ?? null : null;
    const probeComponentNodes = probeComponentId === null ? [] : graph.walkNodes
        .filter(node => network.componentByKey.get(pointKey(node.point)) === probeComponentId);
    return {
        doorId,
        doorPoint: door.point,
        probePoint,
        probeNodeId: probeKey ? network.nodeIds.get(probeKey) ?? null : null,
        probeNodePoint: probeNode?.point ?? null,
        probeRoomIds: probeNode ? (probeNode.roomIds.length > 0 ? probeNode.roomIds : [probeNode.roomId]) : [],
        probeComponentId,
        zones: door.zoneIds.map(zoneId => {
            const zoneNodes = graph.walkNodes
                .filter(node => node.roomId === zoneId || node.roomIds.includes(zoneId))
                .filter(node => candidatePointHasStaticClearance(graph, node.point));
            const nearbyNodes = zoneNodes
                .map(node => ({
                    id: node.id,
                    point: node.point,
                    componentId: network.componentByKey.get(pointKey(node.point)) ?? null,
                    distance: distance(node.point, door.point),
                }))
                .filter(node => node.distance <= PROTOTYPE_CLICK_SNAP_LIMIT)
                .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));
            const nearbyComponentIds = new Set(nearbyNodes.map(node => node.componentId).filter((id): id is number => id !== null));
            const clearConnectors = probeComponentNodes.flatMap(fromNode => zoneNodes
                .filter(toNode => nearbyComponentIds.has(network.componentByKey.get(pointKey(toNode.point)) ?? -1))
                .filter(toNode => candidateSegmentHasStaticClearance(graph, fromNode.point, toNode.point))
                .map(toNode => ({
                    fromNodeId: fromNode.id,
                    from: fromNode.point,
                    toNodeId: toNode.id,
                    to: toNode.point,
                    length: distance(fromNode.point, toNode.point),
                })))
                .sort((a, b) => a.length - b.length || a.fromNodeId.localeCompare(b.fromNodeId) || a.toNodeId.localeCompare(b.toNodeId))
                .slice(0, 16);
            return {
                zoneId,
                roomExists: graph.rooms.some(room => room.id === zoneId),
                nearbyNodes,
                nearestClearConnector: clearConnectors[0] ?? null,
                clearConnectors,
            };
        }),
    };
}

export function auditPrototypePortalEndpoints(graph: CandidateNavigationGraph): readonly PrototypePortalEndpointAudit[] {
    const cached = PORTAL_AUDIT_CACHE.get(graph);
    if (cached) return cached;
    const audit: PrototypePortalEndpointAudit[] = graph.doors.map(door => {
        const endpointForZone = (zoneId: string | undefined) => graph.walkNodes
            .filter(node => !zoneId || node.roomIds.includes(zoneId) || node.roomId === zoneId)
            .filter(node => candidatePointHasStaticClearance(graph, node.point))
            .filter(node => distance(node.point, door.point) <= PROTOTYPE_CLICK_SNAP_LIMIT)
            .slice()
            .sort((a, b) => distance(a.point, door.point) - distance(b.point, door.point) || a.id.localeCompare(b.id))[0]?.point ?? null;
        const approachPoint = endpointForZone(door.zoneIds[0]);
        const exitPoint = endpointForZone(door.zoneIds[1]);
        const valid = Boolean(approachPoint && exitPoint && distance(approachPoint, exitPoint) > 0.001);
        return {
            doorId: door.id,
            approachPoint,
            exitPoint,
            status: valid ? 'provisional-valid' : 'disabled-incomplete',
            reason: valid
                ? 'Provisional endpoint pair derived from collision-clear registered walk nodes in each connected zone.'
                : 'A collision-clear registered walk node was not found for both connected zones.',
        };
    });
    PORTAL_AUDIT_CACHE.set(graph, audit);
    return audit;
}

export function prototypeWorkstations(
    graph: CandidateNavigationGraph,
    metrics?: PrototypeRuntimeMetrics,
): readonly PrototypeWorkstation[] {
    const cached = WORKSTATION_CACHE.get(graph);
    if (cached) return cached;
    const network = prototypeWalkNetwork(graph, metrics);
    const source = [
        ...graph.destinations.filter(destination => destination.kind === 'computer' && destination.availability !== 'unavailable'),
        ...graph.destinations.filter(destination => destination.kind === 'position' && destination.availability !== 'unavailable'),
    ];
    const usedAnchors = new Set<string>();
    const workstations: PrototypeWorkstation[] = [];
    for (const destination of source) {
        const anchorKey = destination.approachPositionId ?? pointKey(destination.point);
        if (usedAnchors.has(anchorKey) || !candidatePointHasStaticClearance(graph, destination.point)) continue;
        const approach = [...network.points.entries()]
            .filter(([key]) => !key.startsWith('door:'))
            .map(([key, point]) => ({ key, point, distance: distance(point, destination.point) }))
            .filter(candidate => candidate.distance <= PROTOTYPE_CLICK_SNAP_LIMIT)
            .sort((a, b) => a.distance - b.distance || a.key.localeCompare(b.key))
            .slice(0, 24)
            .find(candidate => candidateSegmentHasStaticClearance(graph, candidate.point, destination.point));
        if (!approach) continue;
        const markerPoint = destination.markerPoint ?? destination.point;
        const facing = prototypeFacingFromVelocity('south', subtract(markerPoint, destination.point), 0, 1);
        workstations.push({
            id: destination.id,
            computerId: destination.kind === 'computer' ? destination.id.replace(/^computer:/, '') : undefined,
            workingAnchor: destination.point,
            approachPoint: approach.point,
            approachNodeId: network.nodeIds.get(approach.key) ?? `walk:${approach.key}`,
            facing,
        });
        usedAnchors.add(anchorKey);
    }
    const result = workstations.sort((a, b) => a.id.localeCompare(b.id));
    WORKSTATION_CACHE.set(graph, result);
    return result;
}

function nearestNetworkKey(network: PrototypeWalkNetwork, point: Point): string | null {
    let best: string | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const [key, candidate] of network.points) {
        const candidateDistance = distance(candidate, point);
        if (candidateDistance < bestDistance || (candidateDistance === bestDistance && key.localeCompare(best ?? key) < 0)) {
            best = key;
            bestDistance = candidateDistance;
        }
    }
    return best;
}

function reachableKeys(network: PrototypeWalkNetwork, start: string): ReadonlySet<string> {
    const reached = new Set([start]);
    const queue = [start];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const current = queue[cursor];
        for (const edge of network.adjacency.get(current) ?? []) {
            if (reached.has(edge.to)) continue;
            reached.add(edge.to);
            queue.push(edge.to);
        }
    }
    return reached;
}

function shortestNetworkPath(network: PrototypeWalkNetwork, start: string, end: string) {
    const queue = [{ key: start, cost: 0 }];
    const compare = (left: { key: string; cost: number }, right: { key: string; cost: number }) =>
        left.cost - right.cost || left.key.localeCompare(right.key);
    const push = (item: { key: string; cost: number }) => {
        queue.push(item);
        let index = queue.length - 1;
        while (index > 0) {
            const parent = Math.floor((index - 1) / 2);
            if (compare(queue[parent], queue[index]) <= 0) break;
            [queue[parent], queue[index]] = [queue[index], queue[parent]];
            index = parent;
        }
    };
    const pop = () => {
        const first = queue[0];
        const last = queue.pop()!;
        if (queue.length > 0) {
            queue[0] = last;
            let index = 0;
            while (index < queue.length) {
                const left = index * 2 + 1;
                const right = left + 1;
                let smallest = index;
                if (left < queue.length && compare(queue[left], queue[smallest]) < 0) smallest = left;
                if (right < queue.length && compare(queue[right], queue[smallest]) < 0) smallest = right;
                if (smallest === index) break;
                [queue[index], queue[smallest]] = [queue[smallest], queue[index]];
                index = smallest;
            }
        }
        return first;
    };
    const best = new Map([[start, 0]]);
    const previous = new Map<string, string>();
    let expanded = 0;
    while (queue.length > 0) {
        const current = pop();
        expanded += 1;
        if (current.key === end) {
            const keys = [end];
            while (keys[0] !== start) keys.unshift(previous.get(keys[0])!);
            return { keys, cost: current.cost, expanded };
        }
        if (current.cost !== best.get(current.key)) continue;
        for (const edge of network.adjacency.get(current.key) ?? []) {
            const cost = current.cost + edge.length;
            if (cost >= (best.get(edge.to) ?? Number.POSITIVE_INFINITY)) continue;
            best.set(edge.to, cost);
            previous.set(edge.to, current.key);
            push({ key: edge.to, cost });
        }
    }
    return null;
}

function prototypeDoorPath(
    graph: CandidateNavigationGraph,
    startRoomIds: readonly string[],
    targetRoomIds: readonly string[],
    startPoint: Point,
    targetPoint: Point,
) {
    const queue = startRoomIds.map(roomId => ({ roomId, doors: [] as CandidateNavigationGraph['doors'][number][] }));
    const visited = new Set(startRoomIds);
    while (queue.length > 0) {
        const current = queue.shift()!;
        if (targetRoomIds.includes(current.roomId)) return current.doors;
        const focus = current.doors.length === 0 ? startPoint : targetPoint;
        for (const door of graph.doors.slice().sort((a, b) => distance(a.point, focus) - distance(b.point, focus) || a.id.localeCompare(b.id))) {
            if (!door.zoneIds.includes(current.roomId)) continue;
            for (const nextRoomId of door.zoneIds) {
                if (nextRoomId === current.roomId || visited.has(nextRoomId)) continue;
                visited.add(nextRoomId);
                queue.push({ roomId: nextRoomId, doors: [...current.doors, door] });
            }
        }
    }
    return [];
}

function roomLabel(roomId: string): string {
    return roomId.replace(/^zone:/, '').replace(/^ROOM_/, '').replace(/_/g, ' ');
}

export function prototypeRoomAtPoint(graph: CandidateNavigationGraph, point: Point) {
    const room = graph.rooms.find(candidate => pointInPolygon(point, candidate.polygon));
    if (room) return { id: room.id, name: room.name };
    const node = graph.walkNodes.slice().sort((a, b) => distance(a.point, point) - distance(b.point, point) || a.id.localeCompare(b.id))[0];
    const roomId = node?.roomIds[0] ?? node?.roomId ?? 'unknown';
    return { id: roomId, name: graph.rooms.find(candidate => candidate.id === roomId)?.name ?? roomLabel(roomId) };
}

export function snapPrototypePoint(
    graph: CandidateNavigationGraph,
    point: Point,
    maximumDistance = PROTOTYPE_CLICK_SNAP_LIMIT,
    occupiedNodeIds: ReadonlySet<string> = new Set(),
): PrototypeSnapResult | null {
    if (point.x < 0 || point.y < 0 || point.x > OFFICE_SOURCE_WIDTH || point.y > OFFICE_SOURCE_HEIGHT) return null;
    const node = graph.walkNodes
        .filter(candidate => !occupiedNodeIds.has(candidate.id))
        .filter(candidate => candidatePointHasStaticClearance(graph, candidate.point))
        .map(candidate => ({ candidate, distance: distance(candidate.point, point) }))
        .filter(candidate => candidate.distance <= maximumDistance)
        .sort((a, b) => a.distance - b.distance || a.candidate.id.localeCompare(b.candidate.id))[0];
    if (!node) return null;
    return {
        point: node.candidate.point,
        nodeId: node.candidate.id,
        roomId: node.candidate.roomIds[0] ?? node.candidate.roomId,
        distance: node.distance,
    };
}

export function prototypeSpriteState(agent: PrototypeAgent, elapsedMs?: number): SpriteState {
    if (agent.movementState === 'walking') return 'walking';
    if (agent.movementState === 'blocked') return 'blocked';
    if (agent.task.kind === 'work' && agent.task.phase === 'working') {
        if (elapsedMs === undefined) return 'typing';
        const fixtureOffset = Number(agent.fixture.id.match(/(\d+)$/)?.[1] ?? 0) % 3;
        const phase = (Math.floor(Math.max(0, elapsedMs - agent.task.startedAtMs) / 4_000) + fixtureOffset) % 3;
        return (['sitting', 'typing', 'working'] as const)[phase];
    }
    if (agent.task.kind === 'talk' && agent.task.phase === 'talking') return 'talking';
    if (agent.activityState === 'waiting') return 'waiting';
    return 'idle';
}

export function prototypeSpriteAssetId(agent: PrototypeAgent): string {
    const state = prototypeSpriteState(agent);
    return ['typing', 'working', 'sitting', 'talking', 'waiting', 'blocked'].includes(state)
        ? PROTOTYPE_ACTIVITY_SPRITE_ASSET_ID
        : agent.fixture.spriteAssetId;
}

export function prototypeSpriteDirection(agent: PrototypeAgent): SpriteDirection {
    return agent.direction;
}

export function prototypeTaskSummary(task: PrototypeTask): string {
    if (task.kind === 'idle') return task.reason === 'ambient-break' ? 'Taking an ambient break' : task.reason === 'route-failed' ? 'Route failed safely' : 'Idle';
    if (task.kind === 'stopped') return 'Stopped';
    if (task.kind === 'walk') return task.phase === 'traveling' ? 'Walking to assigned point' : 'Arrived at assigned point';
    if (task.kind === 'work') return task.phase === 'traveling' ? `Heading to ${task.workstationId}` : `Working at ${task.workstationId}`;
    if (task.kind === 'talk') return task.phase === 'traveling' ? `Heading to ${task.partnerAgentId}` : `Talking with ${task.partnerAgentId}`;
    if (task.kind === 'wander') return task.phase === 'traveling' ? 'Wandering through current room' : 'Finished wandering';
    return 'Choosing a valid reposition node';
}

export function prototypeOpenGraph(graph: CandidateNavigationGraph): CandidateNavigationGraph {
    const openDoors = graph.doors.map(door => ({
        ...door,
        permission: 'general' as const,
        accessMode: PROTOTYPE_DOOR_POLICY,
        defaultState: 'open',
        currentState: 'open' as const,
        manualReviewRequired: false,
        malformedReason: undefined,
        openRule: 'Prototype runtime keeps every candidate door open.',
        closeRule: 'Prototype runtime does not close doors.',
        collisionRule: 'Prototype runtime door collision disabled.',
    }));
    const provisionalGraph: CandidateNavigationGraph = { ...graph, doors: openDoors };
    const walkNodes = [...graph.walkNodes];
    const walkSegments = [...graph.walkSegments];

    // The registered walk markup leaves A21's room-side path as an isolated
    // component. This reviewed polyline follows the visible lower aisle around
    // the workstation field and joins an existing D01 room-side component.
    // It is deliberately registration-specific and is ignored unless both
    // extracted endpoints and every collision-clear segment still match.
    const d01Room = graph.rooms.find(room => room.id === 'ROOM_AGENT_PLATFORM_AND_MODELS');
    const d01BridgeEndpointsMatch = [PROTOTYPE_D01_ROOM_BRIDGE[0], PROTOTYPE_D01_ROOM_BRIDGE[PROTOTYPE_D01_ROOM_BRIDGE.length - 1]].every(point =>
        walkNodes.some(node => distance(node.point, point) < 1),
    );
    const d01BridgeIsClear = Boolean(d01Room)
        && PROTOTYPE_D01_ROOM_BRIDGE.every(point => pointInPolygon(point, d01Room!.polygon) && candidatePointHasStaticClearance(provisionalGraph, point))
        && PROTOTYPE_D01_ROOM_BRIDGE.slice(1).every((point, index) =>
            candidateSegmentHasStaticClearance(provisionalGraph, PROTOTYPE_D01_ROOM_BRIDGE[index], point));
    if (d01BridgeEndpointsMatch && d01BridgeIsClear) {
        const pathId = 'prototype-reviewed-bridge:D01:agent-platform-lower-aisle';
        PROTOTYPE_D01_ROOM_BRIDGE.slice(1, -1).forEach((point, index) => walkNodes.push({
            id: `${pathId}:node:${String(index + 1).padStart(2, '0')}`,
            point,
            roomId: d01Room!.id,
            roomIds: [d01Room!.id],
            pathId,
        }));
        PROTOTYPE_D01_ROOM_BRIDGE.slice(1).forEach((point, index) => walkSegments.push({
            id: `${pathId}:segment:${String(index + 1).padStart(2, '0')}`,
            a: PROTOTYPE_D01_ROOM_BRIDGE[index],
            b: point,
            pathId,
        }));
    }

    for (const door of openDoors) {
        for (const zoneId of door.zoneIds) {
            const zoneNodes = walkNodes.filter(node => node.roomId === zoneId || node.roomIds.includes(zoneId));
            const hasEndpoint = zoneNodes.some(node =>
                distance(node.point, door.point) <= PROTOTYPE_CLICK_SNAP_LIMIT
                && candidatePointHasStaticClearance(provisionalGraph, node.point),
            );
            if (hasEndpoint) continue;
            const room = graph.rooms.find(candidate => candidate.id === zoneId);
            if (!room || zoneNodes.length === 0) continue;

            const samples: Point[] = [];
            for (let radius = 72; radius <= 600; radius += 48) {
                for (let degrees = 0; degrees < 360; degrees += 15) {
                    const radians = degrees * Math.PI / 180;
                    samples.push({
                        x: door.point.x + Math.cos(radians) * radius,
                        y: door.point.y + Math.sin(radians) * radius,
                    });
                }
            }
            for (let step = 1; step <= 12; step += 1) {
                const ratio = step / 12;
                samples.push({
                    x: door.point.x + (room.center.x - door.point.x) * ratio,
                    y: door.point.y + (room.center.y - door.point.y) * ratio,
                });
            }

            const support = samples
                .filter(point => pointInPolygon(point, room.polygon))
                .filter(point => candidatePointHasStaticClearance(provisionalGraph, point))
                .map(point => ({
                    point,
                    connector: zoneNodes
                        .filter(node => candidatePointHasStaticClearance(provisionalGraph, node.point))
                        .filter(node => candidateSegmentHasStaticClearance(provisionalGraph, point, node.point))
                        .slice()
                        .sort((a, b) => distance(point, a.point) - distance(point, b.point) || a.id.localeCompare(b.id))[0],
                }))
                .filter(candidate => candidate.connector)
                .sort((a, b) => distance(a.point, door.point) - distance(b.point, door.point)
                    || distance(a.point, a.connector!.point) - distance(b.point, b.connector!.point))[0];
            if (!support?.connector) continue;

            const pathId = `prototype-portal-support:${door.id}:${zoneId}`;
            walkNodes.push({
                id: `${pathId}:node`,
                point: support.point,
                roomId: zoneId,
                roomIds: [zoneId],
                pathId,
            });
            walkSegments.push({
                id: `${pathId}:segment`,
                a: support.connector.point,
                b: support.point,
                pathId,
            });
        }
    }

    for (const door of openDoors) {
        const claimedPoints: Point[] = [];
        for (const zoneId of door.zoneIds) {
            const endpoint = walkNodes
                .filter(node => node.roomId === zoneId || node.roomIds.includes(zoneId))
                .filter(node => candidatePointHasStaticClearance(provisionalGraph, node.point))
                .filter(node => distance(node.point, door.point) <= PROTOTYPE_CLICK_SNAP_LIMIT)
                .slice()
                .sort((a, b) => distance(a.point, door.point) - distance(b.point, door.point) || a.id.localeCompare(b.id))[0];
            if (endpoint) {
                claimedPoints.push(endpoint.point);
                continue;
            }
            if (graph.rooms.some(room => room.id === zoneId)) continue;

            const opposite = claimedPoints[0];
            const candidate = graph.walkNodes
                .filter(node => candidatePointHasStaticClearance(provisionalGraph, node.point))
                .filter(node => distance(node.point, door.point) <= PROTOTYPE_CLICK_SNAP_LIMIT)
                .filter(node => claimedPoints.every(point => distance(node.point, point) > Math.max(48, door.apertureRadius * 0.45)))
                .map(node => {
                    const fromDoor = subtract(node.point, door.point);
                    const oppositeVector = opposite ? subtract(opposite, door.point) : null;
                    const oppositeSide = oppositeVector ? fromDoor.x * oppositeVector.x + fromDoor.y * oppositeVector.y < 0 : false;
                    return { node, oppositeSide };
                })
                .sort((a, b) => Number(b.oppositeSide) - Number(a.oppositeSide)
                    || distance(a.node.point, door.point) - distance(b.node.point, door.point)
                    || a.node.id.localeCompare(b.node.id))[0]?.node;
            if (!candidate) continue;
            const pathId = `prototype-portal-alias:${door.id}:${zoneId}`;
            walkNodes.push({
                ...candidate,
                id: `${pathId}:node`,
                roomIds: [...new Set([...candidate.roomIds, zoneId])],
                pathId,
            });
            claimedPoints.push(candidate.point);
        }
    }

    return {
        ...graph,
        doors: openDoors,
        walkNodes,
        walkSegments,
        nodeCount: walkNodes.length,
        edgeCount: walkSegments.length,
    };
}

export function prototypeOpenDoorRuntimes(graph: CandidateNavigationGraph): Readonly<Record<string, CandidateDoorRuntime>> {
    return Object.fromEntries(graph.doors.map(door => [door.id, {
        doorId: door.id,
        state: 'open' as const,
        stateElapsedMs: 0,
        revision: 0,
    }]));
}

export function distributedPrototypeSpawnNodes(graph: CandidateNavigationGraph, count: number) {
    const network = prototypeWalkNetwork(graph);
    const portalReadyComponents = new Set<number>();
    for (const node of graph.walkNodes) {
        const component = network.componentByKey.get(pointKey(node.point));
        if (component === undefined) continue;
        const relevantDoorIsNearby = graph.doors.some(door =>
            door.zoneIds.some(zoneId => node.roomIds.includes(zoneId) || node.roomId === zoneId)
            && distance(node.point, door.point) <= PROTOTYPE_CLICK_SNAP_LIMIT,
        );
        if (relevantDoorIsNearby) portalReadyComponents.add(component);
    }
    const allCandidates = graph.walkNodes
        .filter(node => node.roomIds.length > 0)
        .filter(node => candidatePointHasStaticClearance(graph, node.point))
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id));
    const portalReadyCandidates = allCandidates.filter(node => {
        const component = network.componentByKey.get(pointKey(node.point));
        return component !== undefined && portalReadyComponents.has(component);
    });
    const candidates = portalReadyCandidates.length >= count ? portalReadyCandidates : allCandidates;
    if (candidates.length === 0 || count <= 0) return [];
    const center = { x: OFFICE_SOURCE_WIDTH / 2, y: OFFICE_SOURCE_HEIGHT / 2 };
    const first = candidates.reduce((best, node) => distance(node.point, center) < distance(best.point, center) ? node : best, candidates[0]);
    const selected = [first];
    const selectedIds = new Set([first.id]);
    while (selected.length < Math.min(count, candidates.length)) {
        let best = candidates.find(node => !selectedIds.has(node.id));
        if (!best) break;
        let bestSpacing = -1;
        for (const candidate of candidates) {
            if (selectedIds.has(candidate.id)) continue;
            const spacing = selected.reduce((minimum, item) => Math.min(minimum, distance(candidate.point, item.point)), Number.POSITIVE_INFINITY);
            if (spacing > bestSpacing || (spacing === bestSpacing && candidate.id.localeCompare(best.id) < 0)) {
                best = candidate;
                bestSpacing = spacing;
            }
        }
        selected.push(best);
        selectedIds.add(best.id);
    }
    return selected;
}

function agentFixture(graph: CandidateNavigationGraph, node: CandidateNavigationGraph['walkNodes'][number], index: number): CandidateAgentFixture {
    const suffix = String(index + 1).padStart(2, '0');
    const roomId = node.roomIds[0] ?? node.roomId;
    return {
        id: `prototype-agent-${suffix}`,
        label: `Agent ${suffix}`,
        positionId: node.id,
        roomId,
        roomIds: node.roomIds.length > 0 ? node.roomIds : [roomId],
        roomName: graph.rooms.find(room => room.id === roomId)?.name ?? roomLabel(roomId),
        point: node.point,
        accessTier: 'standard',
        spriteAssetId: PROTOTYPE_MOTION_SPRITE_ASSETS[index % Math.max(1, PROTOTYPE_MOTION_SPRITE_ASSETS.length)]?.id ?? 'agent-sheet-01',
        provisionalSpriteAssignment: true,
    };
}

export function createPrototypeAgents(
    graph: CandidateNavigationGraph,
    count: number,
    mode: 'debug' | 'ambient' = 'debug',
): readonly PrototypeAgent[] {
    const nodes = distributedPrototypeSpawnNodes(graph, count);
    const workstations = mode === 'ambient' ? prototypeWorkstations(graph) : [];
    const occupiedWorkstations = new Set<string>();
    const agents = nodes.map((node, index): PrototypeAgent => {
        const fixture = agentFixture(graph, node, index);
        const varied = index % 20;
        const activityState: PrototypeActivityState = mode === 'debug'
            ? 'idle'
            : varied < 13 ? 'working-at-desk'
                : varied < 17 ? 'moving-to-task'
                    : varied < 19 ? 'talking' : 'idle';
        const partnerIndex = varied === 17 ? index + 1 : varied === 18 ? index - 1 : -1;
        const partnerAgentId = partnerIndex >= 0 && partnerIndex < nodes.length
            ? `prototype-agent-${String(partnerIndex + 1).padStart(2, '0')}`
            : undefined;
        const workstation = workstations
            .filter(candidate => !occupiedWorkstations.has(candidate.id))
            .slice()
            .sort((a, b) => distance(a.workingAnchor, node.point) - distance(b.workingAnchor, node.point) || a.id.localeCompare(b.id))[0];
        if (activityState === 'working-at-desk' && workstation) occupiedWorkstations.add(workstation.id);
        const task: PrototypeTask = mode === 'debug'
            ? { kind: 'idle', reason: 'spawned', startedAtMs: 0 }
            : activityState === 'working-at-desk' && workstation
                ? { kind: 'work', phase: 'working', workstationId: workstation.id, destination: workstation.workingAnchor, nodeId: workstation.approachNodeId, workingAnchor: workstation.workingAnchor, facing: workstation.facing, startedAtMs: 0 }
                : activityState === 'talking' && partnerAgentId
                    ? { kind: 'talk', phase: 'talking', partnerAgentId, destination: node.point, nodeId: node.id, startedAtMs: 0 }
                    : { kind: 'idle', reason: 'ambient-break', startedAtMs: 0 };
        const point = task.kind === 'work' && task.phase === 'working' && task.workingAnchor ? task.workingAnchor : node.point;
        const direction = task.kind === 'work' && task.phase === 'working' && task.facing
            ? task.facing
            : index % 4 === 0 ? 'east' : index % 4 === 1 ? 'south' : index % 4 === 2 ? 'west' : 'north';
        return {
            fixture,
            point,
            spawnPoint: point,
            currentNodeId: task.kind === 'work' ? task.nodeId : node.id,
            route: null,
            progress: 0,
            movementState: 'idle',
            activityState,
            targetPoint: null,
            clickedPoint: null,
            direction,
            velocity: { x: 0, y: 0 },
            resolvedVelocity: { x: 0, y: 0 },
            routeTangent: { x: 0, y: 0 },
            speed: 1,
            distanceTravelled: 0,
            walkCycleElapsedMs: 0,
            activityUntil: activityState === 'working-at-desk'
                ? 18_000 + (index % 9) * 1_700
                : activityState === 'talking'
                    ? 6_000 + (index % 5) * 1_200
                    : activityState === 'moving-to-task' ? 0 : 4_500 + (index % 4) * 1_300,
            blockedDurationMs: 0,
            replanCooldownMs: 0,
            replanAttempts: 0,
            trafficOffset: { x: 0, y: 0 },
            staticCollisionStatus: 'clear',
            partnerAgentId,
            workstationId: task.kind === 'work' ? task.workstationId : undefined,
            task,
            revision: 0,
        };
    });
    if (mode !== 'ambient') return agents;
    return seedAmbientMovement(graph, agents);
}

export function selectPrototypeRouteToPoint(
    graph: CandidateNavigationGraph,
    agent: PrototypeAgent,
    clickedPoint: Point,
    metrics?: PrototypeRuntimeMetrics,
): PrototypeRouteSelection {
    if (metrics) metrics.routePlans += 1;
    if (clickedPoint.x < 0 || clickedPoint.y < 0 || clickedPoint.x > OFFICE_SOURCE_WIDTH || clickedPoint.y > OFFICE_SOURCE_HEIGHT) {
        return { status: 'rejected', reason: 'outside-office', message: 'That point is outside the Floor 1 world bounds.' };
    }
    const network = prototypeWalkNetwork(graph, metrics);
    const startKey = network.keyByNodeId.get(agent.currentNodeId) ?? nearestNetworkKey(network, agent.point);
    if (!startKey) return { status: 'rejected', reason: 'no-navigation-start', message: 'The selected agent is not connected to the navigation graph.' };
    const reached = reachableKeys(network, startKey);
    const exactTargetKey = pointKey(clickedPoint);
    const exactTarget = network.points.get(exactTargetKey);
    const nearbyCandidates: Array<{ key: string; point: Point; snapDistance: number; kind: 'node' | 'segment' }> = exactTarget && !exactTargetKey.startsWith('door:')
        ? [{ key: exactTargetKey, point: exactTarget, snapDistance: 0, kind: 'node' }]
        : (() => {
            const rawCandidates: Array<{ key: string; point: Point; snapDistance: number; kind: 'node' | 'segment' }> = [...network.points]
                .filter(([key]) => !key.startsWith('door:'))
                .map(([key, point]) => ({ key, point, snapDistance: distance(point, clickedPoint), kind: 'node' as const }));
            const seenEdges = new Set<string>();
            for (const [fromKey, edges] of network.adjacency) {
                if (fromKey.startsWith('door:')) continue;
                for (const edge of edges) {
                    if (edge.to.startsWith('door:')) continue;
                    const edgeKey = [fromKey, edge.to].sort().join('|');
                    if (seenEdges.has(edgeKey)) continue;
                    seenEdges.add(edgeKey);
                    const from = network.points.get(fromKey);
                    const to = network.points.get(edge.to);
                    if (!from || !to) continue;
                    const projected = projectPointToSegment(clickedPoint, from, to);
                    const anchors = [fromKey, edge.to].filter(key => reached.has(key));
                    if (anchors.length === 0) continue;
                    const anchor = anchors.sort((a, b) => distance(network.points.get(a)!, projected) - distance(network.points.get(b)!, projected) || a.localeCompare(b))[0];
                    rawCandidates.push({ key: anchor, point: projected, snapDistance: distance(projected, clickedPoint), kind: 'segment' });
                }
            }
            return rawCandidates
                .filter(candidate => candidate.snapDistance <= PROTOTYPE_CLICK_SNAP_LIMIT)
                .sort((a, b) => a.snapDistance - b.snapDistance || a.key.localeCompare(b.key));
        })();
    if (nearbyCandidates.length === 0) {
        return { status: 'rejected', reason: 'no-nearby-candidate', message: `No navigation path lies within ${PROTOTYPE_CLICK_SNAP_LIMIT}px of that point.` };
    }
    const target = nearbyCandidates.find(candidate => reached.has(candidate.key)) ?? nearbyCandidates[0];
    const path = shortestNetworkPath(network, startKey, target.key);
    const roomIdsForPoint = (point: Point, key?: string) => {
        const indexedRoomIds = key ? network.roomIdsByKey.get(key) : undefined;
        if (indexedRoomIds?.length) return [...indexedRoomIds];
        const polygonRoomIds = graph.rooms.filter(room => pointInPolygon(point, room.polygon)).map(room => room.id);
        if (polygonRoomIds.length > 0) return polygonRoomIds;
        const nearest = graph.walkNodes.slice()
            .sort((a, b) => distance(a.point, point) - distance(b.point, point) || a.id.localeCompare(b.id))[0];
        return nearest ? (nearest.roomIds.length > 0 ? [...nearest.roomIds] : [nearest.roomId]) : [];
    };
    const startRoomIds = roomIdsForPoint(agent.point, startKey);
    const targetRoomIds = roomIdsForPoint(target.point, target.key);
    const topologyDoorPath = targetRoomIds.length > 0 ? prototypeDoorPath(graph, startRoomIds, targetRoomIds, agent.point, target.point) : [];
    const doorPath = topologyDoorPath;
    if (doorPath.length > 0) {
        const endpointAudit = new Map(auditPrototypePortalEndpoints(graph).map(item => [item.doorId, item]));
        const unavailableDoor = doorPath.find(door => endpointAudit.get(door.id)?.status !== 'provisional-valid');
        if (unavailableDoor) {
            return { status: 'rejected', reason: 'transition-unavailable', message: `Door ${unavailableDoor.id} has no validated portal endpoint pair.` };
        }
        const routeKeys = [startKey];
        let currentKey = startKey;
        let currentRoomIds = [...startRoomIds];
        let expandedNodeCount = 0;
        for (let doorIndex = 0; doorIndex < doorPath.length; doorIndex += 1) {
            const door = doorPath[doorIndex];
            const currentReachable = reachableKeys(network, currentKey);
            const approachKey = [...currentReachable]
                .filter(key => !key.startsWith('door:'))
                .sort((a, b) => distance(network.points.get(a)!, door.point) - distance(network.points.get(b)!, door.point) || a.localeCompare(b))[0];
            if (!approachKey) return { status: 'rejected', reason: 'no-route', message: `No collision-clear approach connects to door ${door.id}.` };
            if (distance(network.points.get(approachKey)!, door.point) > PROTOTYPE_CLICK_SNAP_LIMIT) {
                return { status: 'rejected', reason: 'transition-unavailable', message: `Door ${door.id} has no nearby approach in the agent's reachable component.` };
            }
            const segment = shortestNetworkPath(network, currentKey, approachKey);
            if (!segment) return { status: 'rejected', reason: 'no-route', message: `No collision-clear approach connects to door ${door.id}.` };
            routeKeys.push(...segment.keys.slice(1));
            expandedNodeCount += segment.expanded;
            routeKeys.push(`door:${door.id}`);
            const nextRoomId = door.zoneIds.find(roomId => !currentRoomIds.includes(roomId)) ?? door.zoneIds[1] ?? door.zoneIds[0];
            const nextDoor = doorPath[doorIndex + 1];
            const exitCandidates = [...network.points.entries()]
                .filter(([key]) => !key.startsWith('door:') && !currentReachable.has(key))
                .filter(([, point]) => candidatePointHasStaticClearance(graph, point))
                .filter(([, point]) => !nextRoomId || graph.rooms.some(room => room.id === nextRoomId && pointInPolygon(point, room.polygon)))
                .map(([key, point]) => ({
                    key,
                    point,
                    onwardDistance: nextDoor ? distance(point, nextDoor.point) : distance(point, target.point),
                    doorDistance: distance(point, door.point),
                }))
                .sort((a, b) => a.doorDistance - b.doorDistance || a.onwardDistance - b.onwardDistance || a.key.localeCompare(b.key));
            const exit = exitCandidates.find(candidate => {
                const exitReachable = reachableKeys(network, candidate.key);
                return doorIndex < doorPath.length - 1 || exitReachable.has(target.key);
            }) ?? exitCandidates[0];
            if (!exit) return { status: 'rejected', reason: 'no-route', message: `Door ${door.id} has no registered portal exit in ${nextRoomId ?? 'its connected zone'}.` };
            if (exit.doorDistance > PROTOTYPE_CLICK_SNAP_LIMIT) {
                return { status: 'rejected', reason: 'transition-unavailable', message: `Door ${door.id} has no nearby collision-clear portal exit.` };
            }
            routeKeys.push(exit.key);
            currentKey = exit.key;
            currentRoomIds = nextRoomId ? [nextRoomId] : currentRoomIds;
        }
        const finalSegment = shortestNetworkPath(network, currentKey, target.key);
        if (!finalSegment) return { status: 'rejected', reason: 'no-route', message: 'No collision-clear route leaves the final doorway for that destination.' };
        routeKeys.push(...finalSegment.keys.slice(1));
        expandedNodeCount += finalSegment.expanded;
        const routePoints = [agent.point, ...routeKeys.map(key => network.points.get(key)!), target.point].filter((point, index, all) => index === 0 || distance(point, all[index - 1]) > 0.001);
        const doorSteps: CandidateDoorStep[] = [];
        let progress = 0;
        for (let index = 1; index < routePoints.length; index += 1) {
            progress += distance(routePoints[index - 1], routePoints[index]);
            const door = doorPath.find(item => distance(item.point, routePoints[index]) < 0.001);
            if (!door) continue;
            const exitPoint = routePoints[index + 1] ?? door.point;
            const exitDistance = progress + distance(door.point, exitPoint);
            doorSteps.push({
                doorId: door.id,
                permission: 'general',
                initialPhysicalState: 'open',
                requiredAction: 'none',
                approachPoint: routePoints[index - 1],
                thresholdPoint: door.point,
                exitPoint,
                approachDistance: Math.max(0, progress - distance(routePoints[index - 1], door.point)),
                thresholdDistance: progress,
                exitDistance,
                clearanceReleaseDistance: exitDistance + 68,
            });
        }
        const length = routePoints.slice(1).reduce((total, point, index) => total + distance(routePoints[index], point), 0);
        const plan: PrototypeRoutePlan = {
            route: {
                status: 'valid',
                reason: `Prototype route traverses open doors ${doorPath.map(door => door.id).join(', ')}.`,
                points: routePoints,
                crossedDoorIds: doorPath.map(door => door.id),
                doorSteps,
                nodeSequence: routeKeys.map(key => network.nodeIds.get(key) ?? `walk:${key}`),
                cost: Math.round(length),
                length,
                expandedNodeCount,
            },
            clickedPoint,
            snappedPoint: target.point,
            snappedNodeId: network.nodeIds.get(target.key) ?? `walk:${target.key}`,
            snapDistance: target.snapDistance,
            candidatesEvaluated: nearbyCandidates.length,
            searchRadius: target.snapDistance <= 160 ? 160 : target.snapDistance <= 320 ? 320 : PROTOTYPE_CLICK_SNAP_LIMIT,
        };
        return { status: 'accepted', plan };
    }
    if (!path) return {
        status: 'rejected',
        reason: reached.has(target.key) ? 'no-route' : 'different-component',
        message: reached.has(target.key)
            ? 'No route connects the selected agent to the nearby navigation geometry.'
            : 'The nearby navigation geometry is disconnected from this agent.',
    };
    const rawPoints = [agent.point, ...path.keys.map(key => network.points.get(key)!), target.point]
        .filter((point, index, all) => index === 0 || distance(point, all[index - 1]) > 0.001);
    const points: Point[] = [rawPoints[0]];
    const crossedDoors: CandidateNavigationGraph['doors'][number][] = [];
    for (let index = 1; index < rawPoints.length; index += 1) {
        const a = rawPoints[index - 1];
        const b = rawPoints[index];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const denominator = dx * dx + dy * dy;
        const segmentDoors = graph.doors
            .filter(door => pointSegmentDistance(door.point, a, b) <= door.apertureRadius)
            .map(door => ({
                door,
                projection: denominator <= 1e-7 ? 0 : ((door.point.x - a.x) * dx + (door.point.y - a.y) * dy) / denominator,
            }))
            .filter(item => item.projection > 0.001 && item.projection < 0.999)
            .sort((left, right) => left.projection - right.projection || left.door.id.localeCompare(right.door.id));
        for (const item of segmentDoors) {
            points.push(item.door.point);
            crossedDoors.push(item.door);
        }
        points.push(b);
    }
    const crossedDoorIds = [...new Set(crossedDoors.map(door => door.id))].sort((a, b) => a.localeCompare(b));
    const doorSteps: CandidateDoorStep[] = [];
    let routeProgress = 0;
    for (let index = 1; index < points.length; index += 1) {
        routeProgress += distance(points[index - 1], points[index]);
        const door = crossedDoors.find(candidate => distance(candidate.point, points[index]) < 0.001);
        if (!door) continue;
        const exitPoint = points[index + 1] ?? door.point;
        const exitDistance = routeProgress + distance(door.point, exitPoint);
        doorSteps.push({
            doorId: door.id,
            permission: 'general',
            initialPhysicalState: 'open',
            requiredAction: 'none',
            approachPoint: points[index - 1],
            thresholdPoint: door.point,
            exitPoint,
            approachDistance: Math.max(0, routeProgress - distance(points[index - 1], door.point)),
            thresholdDistance: routeProgress,
            exitDistance,
            clearanceReleaseDistance: exitDistance + 68,
        });
    }
    const length = points.slice(1).reduce((total, point, index) => total + distance(points[index], point), 0);
    const route: CandidateRouteResult = {
        status: 'valid',
        reason: crossedDoorIds.length > 0 ? `Prototype route traverses open doors ${crossedDoorIds.join(', ')}.` : 'Prototype route follows the reachable walk graph.',
        points,
        crossedDoorIds,
        doorSteps,
        nodeSequence: path.keys.map(key => network.nodeIds.get(key) ?? `walk:${key}`),
        cost: Math.round(path.cost),
        length,
        expandedNodeCount: path.expanded,
    };
    const plan: PrototypeRoutePlan = {
        route,
        clickedPoint,
        snappedPoint: target.point,
        snappedNodeId: network.nodeIds.get(target.key) ?? `walk:${target.key}`,
        snapDistance: target.snapDistance,
        candidatesEvaluated: nearbyCandidates.length,
        searchRadius: target.snapDistance <= 160 ? 160 : target.snapDistance <= 320 ? 320 : PROTOTYPE_CLICK_SNAP_LIMIT,
    };
    return { status: 'accepted', plan };
}

function resolvePrototypeVelocity(previous: Point, actual: Point, deltaMs: number): Point {
    if (Math.hypot(actual.x, actual.y) < PROTOTYPE_DIRECTION_VELOCITY_EPSILON * 0.35) return { x: 0, y: 0 };
    const alpha = 1 - Math.exp(-Math.max(0, deltaMs) / 90);
    return {
        x: previous.x + (actual.x - previous.x) * alpha,
        y: previous.y + (actual.y - previous.y) * alpha,
    };
}

function advancePortalTransition(agent: PrototypeAgent, deltaMs: number): PrototypeAgent {
    const transition = agent.portalTransition;
    if (!transition) return agent;
    const elapsedMs = Math.min(PROTOTYPE_PORTAL_TOTAL_MS, transition.elapsedMs + deltaMs);
    if (elapsedMs >= PROTOTYPE_PORTAL_TOTAL_MS) {
        return {
            ...agent,
            point: transition.exitPoint,
            progress: transition.exitDistance,
            movementState: 'walking',
            activityState: 'walking',
            velocity: { x: 0, y: 0 },
            resolvedVelocity: { x: 0, y: 0 },
            portalTransition: undefined,
            blockedDurationMs: 0,
        };
    }
    const phase: PrototypePortalPhase = elapsedMs < PROTOTYPE_PORTAL_OUT_MS
        ? 'portal-out'
        : elapsedMs < PROTOTYPE_PORTAL_OUT_MS + PROTOTYPE_PORTAL_HIDDEN_MS
            ? 'hidden-transition'
            : 'portal-in';
    const onExitSide = phase !== 'portal-out';
    return {
        ...agent,
        point: onExitSide ? transition.exitPoint : transition.approachPoint,
        progress: onExitSide ? transition.exitDistance : agent.progress,
        movementState: phase,
        activityState: 'waiting',
        velocity: { x: 0, y: 0 },
        resolvedVelocity: { x: 0, y: 0 },
        routeTangent: { x: 0, y: 0 },
        portalTransition: { ...transition, phase, elapsedMs },
        blockedDurationMs: 0,
        blockedByAgentId: undefined,
    };
}

export function planPrototypeRouteToPoint(
    graph: CandidateNavigationGraph,
    agent: PrototypeAgent,
    clickedPoint: Point,
    metrics?: PrototypeRuntimeMetrics,
): PrototypeRoutePlan | null {
    const selection = selectPrototypeRouteToPoint(graph, agent, clickedPoint, metrics);
    return selection.status === 'accepted' ? selection.plan : null;
}

function samePoint(a: Point, b: Point): boolean {
    return distance(a, b) <= 0.001;
}

function isPortalJump(route: CandidateRouteResult, a: Point, b: Point): boolean {
    return route.doorSteps.some(step =>
        (samePoint(a, step.approachPoint) && samePoint(b, step.thresholdPoint))
        || (samePoint(a, step.thresholdPoint) && samePoint(b, step.exitPoint)),
    );
}

export function validatePrototypeRouteSegments(
    graph: CandidateNavigationGraph,
    route: CandidateRouteResult,
): CandidateRouteResult | null {
    const network = prototypeWalkNetwork(graph);
    for (let index = 1; index < route.points.length; index += 1) {
        const a = route.points[index - 1];
        const b = route.points[index];
        if (isPortalJump(route, a, b)) continue;
        if (network.clearSegmentKeys.has(undirectedEdgeKey(a, b))) continue;
        const failure = validateCandidateRouteSegments(graph, [a, b], route.crossedDoorIds);
        if (failure) return failure;
    }
    return null;
}

export function findValidatedPrototypeRouteToPoint(
    graph: CandidateNavigationGraph,
    agent: PrototypeAgent,
    clickedPoint: Point,
    metrics?: PrototypeRuntimeMetrics,
    context: Readonly<{ occupiedPoints?: readonly Point[] }> = {},
): PrototypeRouteSelection {
    const initial = selectPrototypeRouteToPoint(graph, agent, clickedPoint, metrics);
    if (initial.status === 'rejected' && ['outside-office', 'no-navigation-start', 'no-nearby-candidate'].includes(initial.reason)) return initial;
    const initialFailure = initial.status === 'accepted'
        ? validatePrototypeRouteSegments(graph, initial.plan.route)
        : null;
    if (initial.status === 'accepted'
        && !initialFailure
        && initial.plan.snapDistance <= 20
        && !context.occupiedPoints?.some(point => distance(point, initial.plan.snappedPoint) < PROTOTYPE_TRAFFIC_CLEARANCE)) {
        return { status: 'accepted', plan: { ...initial.plan, candidatesEvaluated: 1, searchRadius: 160 } };
    }
    const validPlans: PrototypeRoutePlan[] = [];
    const initialIsOccupied = initial.status === 'accepted'
        && context.occupiedPoints?.some(point => distance(point, initial.plan.snappedPoint) < PROTOTYPE_TRAFFIC_CLEARANCE);
    if (initial.status === 'accepted' && !initialFailure && !initialIsOccupied) validPlans.push(initial.plan);
    const candidates = [
        ...graph.walkNodes.map(node => ({ id: node.id, point: node.point })),
        ...graph.destinations
            .filter(destination => destination.availability !== 'unavailable')
            .map(destination => ({ id: destination.id, point: destination.point })),
    ]
        .map(candidate => ({ ...candidate, distance: distance(candidate.point, clickedPoint) }))
        .filter(candidate => candidate.distance <= PROTOTYPE_CLICK_SNAP_LIMIT)
        .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));
    let candidatesEvaluated = initial.status === 'accepted' ? 1 : 0;
    let occupiedCandidates = 0;
    const evaluatedCandidateIds = new Set<string>();
    const clickRoomId = prototypeRoomAtPoint(graph, clickedPoint).id;
    for (const radius of [160, 320, PROTOTYPE_CLICK_SNAP_LIMIT]) {
        for (const candidate of candidates.filter(item => item.distance <= radius).slice(0, 24)) {
            if (evaluatedCandidateIds.has(candidate.id)) continue;
            evaluatedCandidateIds.add(candidate.id);
            const selection = selectPrototypeRouteToPoint(graph, agent, candidate.point, metrics);
            candidatesEvaluated += 1;
            if (selection.status === 'rejected') continue;
            if (validatePrototypeRouteSegments(graph, selection.plan.route)) continue;
            const snapDistance = distance(clickedPoint, selection.plan.snappedPoint);
            if (context.occupiedPoints?.some(point => distance(point, selection.plan.snappedPoint) < PROTOTYPE_TRAFFIC_CLEARANCE)) {
                occupiedCandidates += 1;
                continue;
            }
            if (!validPlans.some(plan => samePoint(plan.snappedPoint, selection.plan.snappedPoint))) validPlans.push({
                ...selection.plan,
                clickedPoint,
                snapDistance,
            });
        }
        const eligible = validPlans.filter(plan => plan.snapDistance <= radius);
        if (eligible.length > 0) {
            const plan = eligible.map(candidate => {
                const roomPenalty = prototypeRoomAtPoint(graph, candidate.snappedPoint).id === clickRoomId ? 0 : 180;
                const score = candidate.snapDistance + candidate.route.cost * 0.08 + candidate.route.doorSteps.length * 35 + roomPenalty;
                return { candidate, score };
            }).sort((a, b) => a.score - b.score || a.candidate.snapDistance - b.candidate.snapDistance || a.candidate.snappedNodeId.localeCompare(b.candidate.snappedNodeId))[0].candidate;
            return {
                status: 'accepted',
                plan: {
                    ...plan,
                    clickedPoint,
                    candidatesEvaluated,
                    searchRadius: radius,
                },
            };
        }
    }
    return {
        status: 'rejected',
        reason: occupiedCandidates > 0
            ? 'destination-occupied'
            : initial.status === 'rejected' ? initial.reason : 'collision-blocked',
        message: occupiedCandidates > 0
            ? `Nearby reachable destinations are occupied; no spacing-safe alternative was found within ${PROTOTYPE_CLICK_SNAP_LIMIT}px.`
            : `${initialFailure?.reason ?? (initial.status === 'rejected' ? initial.message : 'The initial route was invalid.')} No collision-clear alternative was found within ${PROTOTYPE_CLICK_SNAP_LIMIT}px.`,
        candidatesEvaluated,
        searchRadius: PROTOTYPE_CLICK_SNAP_LIMIT,
    };
}

export function startPrototypeRoute(agent: PrototypeAgent, plan: PrototypeRoutePlan, task?: PrototypeTask): PrototypeAgent {
    return {
        ...agent,
        route: plan.route,
        progress: 0,
        movementState: 'walking',
        activityState: 'walking',
        targetPoint: plan.snappedPoint,
        clickedPoint: plan.clickedPoint,
        velocity: { x: 0, y: 0 },
        resolvedVelocity: { x: 0, y: 0 },
        blockedDurationMs: 0,
        blockedByAgentId: undefined,
        reservedNodeId: plan.route.nodeSequence[1] ?? plan.route.nodeSequence[0],
        reservedEdgeKey: undefined,
        replanCooldownMs: 0,
        replanAttempts: 0,
        trafficOffset: { x: 0, y: 0 },
        portalTransition: undefined,
        staticCollisionStatus: 'clear',
        partnerAgentId: task?.kind === 'talk' ? task.partnerAgentId : undefined,
        workstationId: task?.kind === 'work' ? task.workstationId : undefined,
        task: task ?? {
            kind: 'walk', phase: 'traveling', destination: plan.snappedPoint, nodeId: plan.snappedNodeId, startedAtMs: agent.task.startedAtMs,
        },
        revision: agent.revision + 1,
    };
}

export function assignPrototypeIdle(agent: PrototypeAgent, startedAtMs: number, stopped = false): PrototypeAgent {
    return {
        ...agent,
        route: null,
        progress: 0,
        movementState: stopped ? 'stopped' : 'idle',
        activityState: 'idle',
        targetPoint: null,
        clickedPoint: null,
        velocity: { x: 0, y: 0 },
        resolvedVelocity: { x: 0, y: 0 },
        routeTangent: { x: 0, y: 0 },
        blockedDurationMs: 0,
        blockedByAgentId: undefined,
        reservedNodeId: undefined,
        reservedEdgeKey: undefined,
        replanCooldownMs: 0,
        replanAttempts: 0,
        trafficOffset: { x: 0, y: 0 },
        portalTransition: undefined,
        staticCollisionStatus: 'clear',
        partnerAgentId: undefined,
        workstationId: undefined,
        task: stopped
            ? { kind: 'stopped', reason: 'user', startedAtMs }
            : { kind: 'idle', reason: 'assigned', startedAtMs },
        revision: agent.revision + 1,
    };
}

export function assignPrototypeWork(
    graph: CandidateNavigationGraph,
    agent: PrototypeAgent,
    startedAtMs: number,
    occupiedWorkstationIds: ReadonlySet<string> = new Set(),
    metrics?: PrototypeRuntimeMetrics,
): PrototypeAgent | null {
    const candidates = prototypeWorkstations(graph, metrics)
        .filter(workstation => !occupiedWorkstationIds.has(workstation.id))
        .slice()
        .sort((a, b) => distance(a.approachPoint, agent.point) - distance(b.approachPoint, agent.point) || a.id.localeCompare(b.id))
        .slice(0, 24);
    for (const workstation of candidates) {
        const selection = findValidatedPrototypeRouteToPoint(graph, agent, workstation.approachPoint, metrics);
        if (selection.status === 'rejected') continue;
        const { plan } = selection;
        return startPrototypeRoute(agent, plan, {
            kind: 'work',
            phase: 'traveling',
            workstationId: workstation.id,
            destination: workstation.workingAnchor,
            nodeId: workstation.approachNodeId,
            workingAnchor: workstation.workingAnchor,
            facing: workstation.facing,
            startedAtMs,
        });
    }
    return null;
}

export function assignPrototypeTalk(
    graph: CandidateNavigationGraph,
    agent: PrototypeAgent,
    partner: PrototypeAgent,
    startedAtMs: number,
    metrics?: PrototypeRuntimeMetrics,
    allowCandidateFallback = true,
): PrototypeAgent | null {
    const offset = agent.fixture.id.localeCompare(partner.fixture.id) < 0 ? -90 : 90;
    const intended = { x: partner.point.x + offset, y: partner.point.y + 36 };
    const distinctSnap = snapPrototypePoint(graph, intended, PROTOTYPE_CLICK_SNAP_LIMIT, new Set([partner.currentNodeId]));
    const approaches = [
        ...(distinctSnap ? [{ point: distinctSnap.point, id: distinctSnap.nodeId }] : []),
        ...graph.walkNodes
            .filter(node => node.id !== partner.currentNodeId)
            .map(node => ({ point: node.point, id: node.id, partnerDistance: distance(node.point, partner.point), intendedDistance: distance(node.point, intended) }))
            .filter(candidate => candidate.partnerDistance >= PROTOTYPE_AGENT_DIAMETER && candidate.partnerDistance <= 320)
            .sort((a, b) => a.intendedDistance - b.intendedDistance || a.id.localeCompare(b.id))
            .slice(0, 20),
    ];
    const seen = new Set<string>();
    for (const approach of approaches) {
        if (seen.has(approach.id)) continue;
        seen.add(approach.id);
        const plan = planPrototypeRouteToPoint(graph, agent, approach.point, metrics);
        if (!plan || !prototypeRouteHasStaticClearance(graph, plan.route)) continue;
        return startPrototypeRoute(agent, plan, {
            kind: 'talk', phase: 'traveling', partnerAgentId: partner.fixture.id, destination: plan.snappedPoint, nodeId: plan.snappedNodeId, startedAtMs,
        });
    }
    if (allowCandidateFallback) {
        const selection = findValidatedPrototypeRouteToPoint(graph, agent, intended, metrics);
        if (selection.status === 'accepted') return startPrototypeRoute(agent, selection.plan, {
            kind: 'talk', phase: 'traveling', partnerAgentId: partner.fixture.id, destination: selection.plan.snappedPoint, nodeId: selection.plan.snappedNodeId, startedAtMs,
        });
    }
    return null;
}

export function assignPrototypeWander(
    graph: CandidateNavigationGraph,
    agent: PrototypeAgent,
    seed: number,
    startedAtMs: number,
    metrics?: PrototypeRuntimeMetrics,
): PrototypeAgent | null {
    const roomIds = new Set(prototypeRoomAtPoint(graph, agent.point).id ? [prototypeRoomAtPoint(graph, agent.point).id] : agent.fixture.roomIds);
    const currentPathId = graph.walkNodes.find(node => node.id === agent.currentNodeId)?.pathId;
    const candidates = graph.walkNodes
        .filter(node => distance(node.point, agent.point) >= 180 && distance(node.point, agent.point) <= 1_600)
        .slice()
        .sort((a, b) => {
            const aPath = a.pathId === currentPathId ? 0 : 1;
            const bPath = b.pathId === currentPathId ? 0 : 1;
            const aLocal = a.roomIds.some(roomId => roomIds.has(roomId)) ? 0 : 1;
            const bLocal = b.roomIds.some(roomId => roomIds.has(roomId)) ? 0 : 1;
            return aPath - bPath || aLocal - bLocal || a.id.localeCompare(b.id);
        });
    const preferred = currentPathId ? candidates.filter(node => node.pathId === currentPathId) : [];
    const pool = preferred.length > 0 ? preferred : candidates;
    const offset = pool.length > 0 ? Math.abs(seed * 17) % pool.length : 0;
    const ordered = [...pool.slice(offset), ...pool.slice(0, offset), ...candidates.filter(node => !pool.includes(node))];
    for (const target of ordered.slice(0, 4)) {
        const selection = findValidatedPrototypeRouteToPoint(graph, agent, target.point, metrics);
        if (selection.status === 'rejected') continue;
        const { plan } = selection;
        if (plan.route.length <= 20) continue;
        return startPrototypeRoute(agent, plan, {
            kind: 'wander', phase: 'traveling', destination: plan.snappedPoint, nodeId: plan.snappedNodeId, seed, startedAtMs,
        });
    }
    return null;
}

export function repositionPrototypeAgent(agent: PrototypeAgent, snap: PrototypeSnapResult, startedAtMs: number): PrototypeAgent {
    return {
        ...agent,
        point: snap.point,
        spawnPoint: snap.point,
        currentNodeId: snap.nodeId,
        route: null,
        progress: 0,
        movementState: 'idle',
        activityState: 'idle',
        targetPoint: null,
        clickedPoint: null,
        velocity: { x: 0, y: 0 },
        resolvedVelocity: { x: 0, y: 0 },
        routeTangent: { x: 0, y: 0 },
        blockedDurationMs: 0,
        blockedByAgentId: undefined,
        reservedNodeId: undefined,
        reservedEdgeKey: undefined,
        replanCooldownMs: 0,
        replanAttempts: 0,
        trafficOffset: { x: 0, y: 0 },
        portalTransition: undefined,
        staticCollisionStatus: 'clear',
        partnerAgentId: undefined,
        workstationId: undefined,
        task: { kind: 'idle', reason: 'assigned', startedAtMs },
        revision: agent.revision + 1,
    };
}

function directPrototypeRoute(from: Point, to: Point, nodeId: string): CandidateRouteResult {
    const length = distance(from, to);
    return {
        status: 'valid',
        reason: 'Collision-validated workstation final approach.',
        points: [from, to],
        crossedDoorIds: [],
        doorSteps: [],
        nodeSequence: [nodeId, `work-anchor:${pointKey(to)}`],
        cost: Math.round(length),
        length,
        expandedNodeCount: 1,
    };
}

function prototypeRouteHasStaticClearance(graph: CandidateNavigationGraph, route: CandidateRouteResult): boolean {
    return validatePrototypeRouteSegments(graph, route) === null;
}

function taskTrafficPriority(agent: PrototypeAgent): number {
    const taskPriority = agent.task.kind === 'work' ? 4 : agent.task.kind === 'walk' ? 3 : agent.task.kind === 'talk' ? 2 : 1;
    return agent.blockedDurationMs * 10 + taskPriority;
}

function settleArrivedPrototypeAgent(
    graph: CandidateNavigationGraph | undefined,
    previous: PrototypeAgent,
    candidate: PrototypeAgent,
): PrototypeAgent {
    if (candidate.movementState !== 'arrived') return candidate;
    if (previous.task.kind === 'work' && previous.task.phase === 'traveling' && previous.task.workingAnchor && graph) {
        if (candidateSegmentHasStaticClearance(graph, candidate.point, previous.task.workingAnchor)) {
            const route = directPrototypeRoute(candidate.point, previous.task.workingAnchor, previous.task.nodeId);
            return {
                ...candidate,
                route,
                progress: 0,
                movementState: route.length <= 1 ? 'arrived' : 'walking',
                activityState: route.length <= 1 ? 'working-at-desk' : 'walking',
                targetPoint: previous.task.workingAnchor,
                task: { ...previous.task, phase: route.length <= 1 ? 'working' : 'approaching' },
                direction: route.length <= 1 ? previous.task.facing ?? candidate.direction : candidate.direction,
            };
        }
        return { ...candidate, movementState: 'blocked', activityState: 'waiting', staticCollisionStatus: 'blocked' };
    }
    if (previous.task.kind === 'work' && previous.task.phase === 'approaching') {
        return {
            ...candidate,
            point: previous.task.workingAnchor ?? candidate.point,
            route: null,
            progress: 0,
            movementState: 'arrived',
            activityState: 'working-at-desk',
            velocity: { x: 0, y: 0 },
            resolvedVelocity: { x: 0, y: 0 },
            routeTangent: { x: 0, y: 0 },
            direction: previous.task.facing ?? candidate.direction,
            task: { ...previous.task, phase: 'working' },
            reservedEdgeKey: undefined,
            reservedNodeId: previous.task.nodeId,
        };
    }
    const task: PrototypeTask = previous.task.kind === 'talk' ? { ...previous.task, phase: 'talking' }
        : previous.task.kind === 'walk' ? { ...previous.task, phase: 'arrived' }
            : previous.task.kind === 'wander' ? { ...previous.task, phase: 'arrived' }
                : previous.task;
    return {
        ...candidate,
        task,
        activityState: task.kind === 'work' && task.phase === 'working' ? 'working-at-desk'
            : task.kind === 'talk' && task.phase === 'talking' ? 'talking' : 'idle',
        velocity: { x: 0, y: 0 },
        resolvedVelocity: { x: 0, y: 0 },
        routeTangent: { x: 0, y: 0 },
        reservedEdgeKey: undefined,
    };
}

export function advancePrototypeAgents(
    agents: readonly PrototypeAgent[],
    deltaMs: number,
    baseSpeed: number,
    paused: boolean,
    doors: Readonly<Record<string, CandidateDoorRuntime>>,
    graph?: CandidateNavigationGraph,
    metrics?: PrototypeRuntimeMetrics,
): readonly PrototypeAgent[] {
    if (paused || deltaMs <= 0) return agents;
    const tickStartedAt = runtimeNow();
    if (metrics) metrics.simulationTicks += 1;
    const deltaSeconds = Math.max(0.001, deltaMs / 1000);
    const portalOwners = new Map<string, string>();
    for (const agent of agents) {
        if (!agent.portalTransition) continue;
        portalOwners.set(`${agent.portalTransition.doorId}:${pointKey(agent.portalTransition.exitPoint)}`, agent.fixture.id);
    }
    const proposals = agents.map((previous): PrototypeAgent => {
        if (previous.portalTransition) return advancePortalTransition(previous, deltaMs);
        if (!['walking', 'waiting', 'blocked'].includes(previous.movementState) || !previous.route) {
            if (previous.velocity.x === 0 && previous.velocity.y === 0 && previous.replanCooldownMs <= 0) return previous;
            return {
                ...previous,
                velocity: { x: 0, y: 0 },
                resolvedVelocity: { x: 0, y: 0 },
                routeTangent: { x: 0, y: 0 },
                replanCooldownMs: Math.max(0, previous.replanCooldownMs - deltaMs),
            };
        }
        const activeRoute = previous.route;
        const [candidate] = advanceCandidateAgents(
            [{ ...previous, point: routePointAtProgress(activeRoute.points, previous.progress), status: 'walking' }],
            deltaMs,
            baseSpeed * previous.speed,
            doors,
        );
        const segmentEndProgress = routeSegmentEndProgress(activeRoute.points, previous.progress);
        const safeProgress = Math.min(candidate.progress, segmentEndProgress);
        const portalStep = activeRoute.doorSteps.find(step =>
            step.exitDistance > previous.progress + 0.001
            && safeProgress >= step.approachDistance - 0.001,
        );
        if (portalStep) {
            const reservationKey = `${portalStep.doorId}:${pointKey(portalStep.exitPoint)}`;
            const owner = portalOwners.get(reservationKey);
            if (owner && owner !== previous.fixture.id) {
                if (metrics) metrics.portalWaits += 1;
                const normalizedPortalTangent = normalize(subtract(portalStep.exitPoint, portalStep.approachPoint));
                const portalTangent = Math.hypot(normalizedPortalTangent.x, normalizedPortalTangent.y) > 0.001
                    ? normalizedPortalTangent
                    : { x: 1, y: 0 };
                const sign = previous.fixture.id.localeCompare(owner) < 0 ? -1 : 1;
                const offsetPoint = add(portalStep.approachPoint, {
                    x: -portalTangent.y * PROTOTYPE_TRAFFIC_CLEARANCE * sign,
                    y: portalTangent.x * PROTOTYPE_TRAFFIC_CLEARANCE * sign,
                });
                const waitPoint = !graph || candidateSegmentHasStaticClearance(graph, portalStep.approachPoint, offsetPoint, activeRoute.crossedDoorIds)
                    ? offsetPoint
                    : portalStep.approachPoint;
                return {
                    ...previous,
                    point: waitPoint,
                    progress: portalStep.approachDistance,
                    movementState: 'waiting',
                    activityState: 'waiting',
                    velocity: { x: 0, y: 0 },
                    resolvedVelocity: { x: 0, y: 0 },
                    blockedDurationMs: previous.blockedDurationMs + deltaMs,
                    blockedByAgentId: owner,
                };
            }
            portalOwners.set(reservationKey, previous.fixture.id);
            if (metrics) metrics.portalTransitions += 1;
            return {
                ...previous,
                point: portalStep.approachPoint,
                progress: portalStep.approachDistance,
                movementState: 'portal-out',
                activityState: 'waiting',
                velocity: { x: 0, y: 0 },
                resolvedVelocity: { x: 0, y: 0 },
                routeTangent: { x: 0, y: 0 },
                portalTransition: {
                    doorId: portalStep.doorId,
                    phase: 'portal-out',
                    elapsedMs: 0,
                    approachPoint: portalStep.approachPoint,
                    thresholdPoint: portalStep.thresholdPoint,
                    exitPoint: portalStep.exitPoint,
                    exitDistance: portalStep.exitDistance,
                },
                blockedDurationMs: 0,
                blockedByAgentId: undefined,
            };
        }
        const movementState: PrototypeMovementState = safeProgress >= activeRoute.length - 0.001 ? 'arrived' : 'walking';
        const segment = routeSegmentAtProgress(activeRoute.points, safeProgress);
        const decay = Math.pow(0.82, deltaMs / (1000 / 60));
        const trafficOffset = scalePoint(previous.trafficOffset, decay);
        const routePoint = routePointAtProgress(activeRoute.points, safeProgress);
        const offsetPoint = add(routePoint, trafficOffset);
        const offsetClear = !graph || candidateSegmentHasStaticClearance(graph, previous.point, offsetPoint, activeRoute.crossedDoorIds);
        const directClear = offsetClear || !graph || candidateSegmentHasStaticClearance(graph, previous.point, routePoint, activeRoute.crossedDoorIds);
        const point = offsetClear ? offsetPoint : directClear ? routePoint : previous.point;
        const movedDistance = distance(previous.point, point);
        const velocity = scalePoint(subtract(point, previous.point), 1 / deltaSeconds);
        const resolvedVelocity = resolvePrototypeVelocity(previous.resolvedVelocity, velocity, deltaMs);
        const staticClear = offsetClear || directClear;
        return {
            ...previous,
            point: staticClear ? point : previous.point,
            progress: staticClear ? safeProgress : previous.progress,
            movementState: staticClear ? movementState : 'blocked',
            activityState: staticClear && movementState === 'walking' ? 'walking' : staticClear ? previous.activityState : 'waiting',
            velocity: staticClear ? velocity : { x: 0, y: 0 },
            resolvedVelocity: staticClear ? resolvedVelocity : { x: 0, y: 0 },
            routeTangent: segment?.tangent ?? previous.routeTangent,
            direction: prototypeFacingFromVelocity(previous.direction, velocity),
            distanceTravelled: previous.distanceTravelled + (staticClear ? movedDistance : 0),
            walkCycleElapsedMs: previous.walkCycleElapsedMs + (staticClear ? movedDistance / PROTOTYPE_NOMINAL_WALK_SPEED * 1000 : 0),
            blockedDurationMs: staticClear ? 0 : previous.blockedDurationMs + deltaMs,
            blockedByAgentId: staticClear ? undefined : previous.blockedByAgentId,
            reservedNodeId: segment ? pointKey(segment.to) : previous.reservedNodeId,
            reservedEdgeKey: segment ? undirectedEdgeKey(segment.from, segment.to) : undefined,
            replanCooldownMs: Math.max(0, previous.replanCooldownMs - deltaMs),
            trafficOffset: offsetClear ? trafficOffset : { x: 0, y: 0 },
            staticCollisionStatus: staticClear ? 'clear' : 'blocked',
            currentNodeId: movementState === 'arrived'
                ? activeRoute.nodeSequence[activeRoute.nodeSequence.length - 1] ?? previous.currentNodeId
                : previous.currentNodeId,
        };
    });

    const currentHash = new PrototypeSpatialHash();
    agents.filter(agent => agent.movementState !== 'hidden-transition')
        .forEach(agent => currentHash.insert(agent.fixture.id, agent.point));
    const edgeOwners = new Map<string, string>();
    const arrivalOwners = agents
        .filter(agent => !agent.route || !['walking', 'waiting', 'blocked'].includes(agent.movementState))
        .map(agent => ({ id: agent.fixture.id, point: agent.point }));
    const order = agents.map((agent, index) => ({ agent, index }))
        .sort((a, b) => taskTrafficPriority(b.agent) - taskTrafficPriority(a.agent) || a.agent.fixture.id.localeCompare(b.agent.fixture.id));
    const accepted = [...proposals];
    for (const { agent: previous, index } of order) {
        const proposal = proposals[index];
        if (proposal.movementState === 'arrived') {
            const occupied = arrivalOwners.find(item => item.id !== previous.fixture.id && distance(item.point, proposal.point) < PROTOTYPE_TRAFFIC_CLEARANCE);
            if (occupied) {
                const safeProgress = Math.max(0, (previous.route?.length ?? previous.progress) - PROTOTYPE_TRAFFIC_CLEARANCE);
                const safePoint = previous.route ? routePointAtProgress(previous.route.points, safeProgress) : previous.point;
                accepted[index] = {
                    ...previous,
                    point: safePoint,
                    progress: safeProgress,
                    movementState: 'waiting',
                    activityState: 'waiting',
                    velocity: { x: 0, y: 0 },
                    resolvedVelocity: { x: 0, y: 0 },
                    blockedDurationMs: previous.blockedDurationMs + deltaMs,
                    blockedByAgentId: occupied.id,
                };
            } else {
                const settled = settleArrivedPrototypeAgent(graph, previous, proposal);
                accepted[index] = settled;
                arrivalOwners.push({ id: settled.fixture.id, point: settled.point });
            }
            continue;
        }
        if (proposal.movementState === 'waiting'
            && proposal.blockedByAgentId
            && proposal.velocity.x === 0
            && proposal.velocity.y === 0
            && proposal.progress === previous.progress) {
            accepted[index] = proposal;
            continue;
        }
        if (!['walking', 'waiting', 'blocked'].includes(proposal.movementState) || !proposal.route) continue;
        const edgeOwner = proposal.reservedEdgeKey ? edgeOwners.get(proposal.reservedEdgeKey) : undefined;
        const edgeOwnerAgent = edgeOwner ? agents.find(candidate => candidate.fixture.id === edgeOwner) : undefined;
        const opposingEdgeConflict = edgeOwnerAgent
            && distance(edgeOwnerAgent.point, proposal.point) < PROTOTYPE_TRAFFIC_CELL_SIZE
            && edgeOwnerAgent.routeTangent.x * proposal.routeTangent.x + edgeOwnerAgent.routeTangent.y * proposal.routeTangent.y < -0.35
            ? edgeOwnerAgent.fixture.id
            : undefined;
        const nearby = currentHash.nearby(proposal.point)
            .filter(candidate => candidate.id !== previous.fixture.id)
            .map(candidate => ({ ...candidate, distance: distance(candidate.point, proposal.point) }))
            .filter(candidate => candidate.distance < PROTOTYPE_TRAFFIC_CLEARANCE)
            .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));
        if (metrics) metrics.collisionChecks += Math.max(1, nearby.length);
        const conflictId = opposingEdgeConflict && opposingEdgeConflict !== previous.fixture.id ? opposingEdgeConflict : nearby[0]?.id;
        if (!conflictId && proposal.staticCollisionStatus === 'clear') {
            if (proposal.reservedEdgeKey) edgeOwners.set(proposal.reservedEdgeKey, previous.fixture.id);
            accepted[index] = settleArrivedPrototypeAgent(graph, previous, proposal);
            continue;
        }
        if (metrics) metrics.collisionConflicts += 1;
        const activeRoute = previous.route;
        if (!activeRoute) continue;
        const segment = routeSegmentAtProgress(activeRoute.points, previous.progress);
        const tangent = segment?.tangent ?? previous.routeTangent;
        const sign = previous.fixture.id.localeCompare(conflictId ?? '') <= 0 ? -1 : 1;
        const targetOffset = { x: -tangent.y * PROTOTYPE_TRAFFIC_CLEARANCE * sign, y: tangent.x * PROTOTYPE_TRAFFIC_CLEARANCE * sign };
        const deltaOffset = subtract(targetOffset, previous.trafficOffset);
        const lateralStep = Math.min(Math.hypot(deltaOffset.x, deltaOffset.y), baseSpeed * deltaSeconds * 0.65);
        const nextOffset = add(previous.trafficOffset, scalePoint(normalize(deltaOffset), lateralStep));
        const basePoint = routePointAtProgress(activeRoute.points, previous.progress);
        const sidestepPoint = add(basePoint, nextOffset);
        const sidestepClear = Boolean(graph)
            && candidateSegmentHasStaticClearance(graph!, previous.point, sidestepPoint, activeRoute.crossedDoorIds)
            && currentHash.nearby(sidestepPoint).every(candidate => candidate.id === previous.fixture.id || distance(candidate.point, sidestepPoint) >= PROTOTYPE_AGENT_DIAMETER);
        const point = sidestepClear ? sidestepPoint : previous.point;
        const movedDistance = distance(previous.point, point);
        const velocity = scalePoint(subtract(point, previous.point), 1 / deltaSeconds);
        const resolvedVelocity = resolvePrototypeVelocity(previous.resolvedVelocity, velocity, deltaMs);
        accepted[index] = {
            ...previous,
            point,
            movementState: 'waiting',
            activityState: 'waiting',
            velocity,
            resolvedVelocity,
            routeTangent: tangent,
            direction: prototypeFacingFromVelocity(previous.direction, resolvedVelocity),
            distanceTravelled: previous.distanceTravelled + movedDistance,
            walkCycleElapsedMs: previous.walkCycleElapsedMs + movedDistance / PROTOTYPE_NOMINAL_WALK_SPEED * 1000,
            blockedDurationMs: previous.blockedDurationMs + deltaMs,
            blockedByAgentId: conflictId,
            reservedNodeId: proposal.reservedNodeId,
            reservedEdgeKey: proposal.reservedEdgeKey,
            replanCooldownMs: Math.max(0, previous.replanCooldownMs - deltaMs),
            trafficOffset: sidestepClear ? nextOffset : previous.trafficOffset,
            staticCollisionStatus: proposal.staticCollisionStatus,
        };
    }
    const recovered = accepted.map(agent => {
        const rejectedFinalEndpoint = Boolean(agent.route)
            && agent.staticCollisionStatus === 'blocked'
            && agent.progress >= (agent.route?.length ?? Number.POSITIVE_INFINITY) - 0.001;
        if (rejectedFinalEndpoint) {
            const failed = assignPrototypeIdle(agent, agent.task.startedAtMs + agent.blockedDurationMs);
            return {
                ...failed,
                task: { kind: 'idle' as const, reason: 'route-failed' as const, startedAtMs: failed.task.startedAtMs },
                replanCooldownMs: 2_500,
            };
        }
        const stalledAgainstStatic = agent.staticCollisionStatus === 'blocked' && agent.blockedDurationMs >= 750;
        const stalledInTraffic = agent.movementState === 'waiting' && agent.blockedDurationMs >= 2_500;
        if ((!stalledAgainstStatic && !stalledInTraffic) || agent.replanCooldownMs > 0) return agent;
        if (metrics) metrics.routeReplans += 1;
        if (graph && agent.targetPoint && agent.replanAttempts < 1) {
            const selection = findValidatedPrototypeRouteToPoint(graph, agent, agent.targetPoint, undefined, {
                occupiedPoints: accepted.filter(other => other.fixture.id !== agent.fixture.id).map(other => other.point),
            });
            if (selection.status === 'accepted' && selection.plan.route.length > 1) {
                return {
                    ...startPrototypeRoute(agent, selection.plan, agent.task),
                    replanCooldownMs: 2_500,
                    replanAttempts: agent.replanAttempts + 1,
                };
            }
        }
        const failed = assignPrototypeIdle(agent, agent.task.startedAtMs + agent.blockedDurationMs);
        return {
            ...failed,
            task: { kind: 'idle' as const, reason: 'route-failed' as const, startedAtMs: failed.task.startedAtMs },
            replanCooldownMs: 2_500,
        };
    });
    const tickDuration = runtimeNow() - tickStartedAt;
    if (metrics) {
        metrics.lastTickMs = tickDuration;
        metrics.longestTickMs = Math.max(metrics.longestTickMs, tickDuration);
    }
    return recovered;
}

export function seedAmbientMovement(graph: CandidateNavigationGraph, input: readonly PrototypeAgent[]): readonly PrototypeAgent[] {
    let agents = input;
    for (let index = 0; index < agents.length; index += 1) {
        const agent = agents[index];
        if (agent.activityState !== 'moving-to-task') continue;
        const target = ambientPrototypeTarget(graph, agent, index);
        if (!target) continue;
        // Routing does not depend on the mutable prototype-agent roster. Keep the
        // stable graph identity so prototypeWalkNetwork can reuse its WeakMap cache
        // for every ambient seed instead of rebuilding the full office network.
        const plan = planPrototypeRouteToPoint(graph, agent, target);
        if (!plan || !prototypeRouteHasStaticClearance(graph, plan.route)) continue;
        if (plan.route.doorSteps.length > 0) continue;
        const reverse: PrototypeRoutePlan = {
            ...plan,
            route: {
                ...plan.route,
                reason: 'Prototype ambient patrol returns along its prevalidated local route.',
                points: [...plan.route.points].reverse(),
                nodeSequence: [...plan.route.nodeSequence].reverse(),
                crossedDoorIds: [],
                doorSteps: [],
            },
            clickedPoint: agent.spawnPoint,
            snappedPoint: agent.spawnPoint,
            snappedNodeId: agent.currentNodeId,
            snapDistance: 0,
        };
        const cache = AMBIENT_PATROL_CACHE.get(graph) ?? new Map();
        cache.set(agent.fixture.id, { forward: plan, reverse });
        AMBIENT_PATROL_CACHE.set(graph, cache);
        agents = agents.map(item => item.fixture.id === agent.fixture.id
            ? {
                ...startPrototypeRoute(item, plan, {
                    kind: 'wander', phase: 'traveling', destination: plan.snappedPoint, nodeId: plan.snappedNodeId, seed: index, startedAtMs: 0,
                }),
                activityState: 'walking', activityUntil: 0,
            }
            : item);
    }
    return agents;
}

export function assignPrototypeAmbientPatrol(
    graph: CandidateNavigationGraph,
    agent: PrototypeAgent,
    startedAtMs: number,
): PrototypeAgent | null {
    const patrol = AMBIENT_PATROL_CACHE.get(graph)?.get(agent.fixture.id);
    if (!patrol) return null;
    const atForwardEnd = distance(agent.point, patrol.forward.snappedPoint) <= PROTOTYPE_AGENT_RADIUS;
    const plan = atForwardEnd ? patrol.reverse : patrol.forward;
    return startPrototypeRoute(agent, plan, {
        kind: 'wander', phase: 'traveling', destination: plan.snappedPoint, nodeId: plan.snappedNodeId,
        seed: agent.revision + 1, startedAtMs,
    });
}

export function ambientPrototypeTarget(graph: CandidateNavigationGraph, agent: PrototypeAgent, seed: number): Point | null {
    const roomIds = new Set(agent.fixture.roomIds);
    const localCandidates = graph.walkNodes
        .filter(node => node.roomIds.some(roomId => roomIds.has(roomId)))
        .filter(node => distance(node.point, agent.point) >= 180 && distance(node.point, agent.point) <= 1_200)
        .sort((a, b) => a.id.localeCompare(b.id));
    const candidates = localCandidates.length > 0 ? localCandidates : graph.walkNodes
        .filter(node => distance(node.point, agent.point) >= 180 && distance(node.point, agent.point) <= 1_200)
        .sort((a, b) => a.id.localeCompare(b.id));
    return candidates.length > 0 ? candidates[Math.abs(seed * 17) % candidates.length].point : null;
}

export function resetPrototypeAgent(agent: PrototypeAgent): PrototypeAgent {
    return {
        ...agent,
        point: agent.spawnPoint,
        route: null,
        progress: 0,
        movementState: 'idle',
        activityState: 'idle',
        targetPoint: null,
        clickedPoint: null,
        velocity: { x: 0, y: 0 },
        resolvedVelocity: { x: 0, y: 0 },
        routeTangent: { x: 0, y: 0 },
        blockedDurationMs: 0,
        blockedByAgentId: undefined,
        reservedNodeId: undefined,
        reservedEdgeKey: undefined,
        replanCooldownMs: 0,
        replanAttempts: 0,
        trafficOffset: { x: 0, y: 0 },
        staticCollisionStatus: 'clear',
        partnerAgentId: undefined,
        workstationId: undefined,
        task: { kind: 'stopped', reason: 'reset', startedAtMs: 0 },
        revision: agent.revision + 1,
    };
}
