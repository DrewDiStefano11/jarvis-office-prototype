import { OFFICE_SOURCE_HEIGHT, OFFICE_SOURCE_WIDTH } from '../../constants';
import type { Point } from '../../types';
import type { SpriteDirection, SpriteState } from '../../sprites/types';
import {
    AGENT_FOOTPRINT_RADIUS,
    advanceCandidateAgents,
    candidatePointHasStaticClearance,
    candidateSegmentHasStaticClearance,
    pointInPolygon,
    type CandidateAgentFixture,
    type CandidateDoorStep,
    type CandidateDoorRuntime,
    type CandidateNavigationGraph,
    type CandidateRouteResult,
} from './candidateNavigation';

export const PROTOTYPE_AGENT_LIMIT = 25;
export const PROTOTYPE_AMBIENT_COUNTS = [15, 20, 25, 30] as const;
export const PROTOTYPE_CLICK_SNAP_LIMIT = 620;
export const PROTOTYPE_DOOR_POLICY = 'prototype-open' as const;
export const PROTOTYPE_AGENT_RADIUS = AGENT_FOOTPRINT_RADIUS;
export const PROTOTYPE_AGENT_DIAMETER = PROTOTYPE_AGENT_RADIUS * 2;
export const PROTOTYPE_SPRITE_WORLD_SIZE = 181;
export const PROTOTYPE_NOMINAL_WALK_SPEED = 180;
export const PROTOTYPE_DIRECTION_VELOCITY_EPSILON = 8;
export const PROTOTYPE_DIRECTION_AXIS_HYSTERESIS = 1.28;
const PROTOTYPE_TRAFFIC_CELL_SIZE = 160;
const PROTOTYPE_TRAFFIC_CLEARANCE = PROTOTYPE_AGENT_DIAMETER + 4;

export type PrototypeActivityState = 'walking' | 'working-at-desk' | 'idle' | 'talking' | 'waiting' | 'moving-to-task';
export type PrototypeMovementState = 'idle' | 'walking' | 'waiting' | 'paused' | 'arrived' | 'stopped' | 'blocked';

type TimedTask = Readonly<{ startedAtMs: number }>;
export type PrototypeTask =
    | (TimedTask & Readonly<{ kind: 'idle'; reason: 'spawned' | 'assigned' | 'ambient-break' | 'arrived' }>)
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
    routeTangent: Point;
    speed: number;
    distanceTravelled: number;
    walkCycleElapsedMs: number;
    activityUntil: number;
    blockedDurationMs: number;
    blockedByAgentId?: string;
    reservedNodeId?: string;
    reservedEdgeKey?: string;
    replanCooldownMs: number;
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
    adjacency: ReadonlyMap<string, readonly Readonly<{ to: string; length: number }>[] >;
}>;

const WALK_NETWORK_CACHE = new WeakMap<object, PrototypeWalkNetwork>();
const WORKSTATION_CACHE = new WeakMap<object, readonly PrototypeWorkstation[]>();

function prototypeWalkNetwork(graph: CandidateNavigationGraph, metrics?: PrototypeRuntimeMetrics): PrototypeWalkNetwork {
    const cached = WALK_NETWORK_CACHE.get(graph);
    if (cached) return cached;
    if (metrics) metrics.graphBuilds += 1;
    const points = new Map<string, Point>();
    const nodeIds = new Map<string, string>();
    const mutable = new Map<string, Array<{ to: string; length: number }>>();
    for (const node of graph.walkNodes) {
        const key = pointKey(node.point);
        points.set(key, node.point);
        if (!nodeIds.has(key) || node.id.localeCompare(nodeIds.get(key)!) < 0) nodeIds.set(key, node.id);
    }
    for (const segment of graph.walkSegments) {
        const a = pointKey(segment.a);
        const b = pointKey(segment.b);
        points.set(a, segment.a);
        points.set(b, segment.b);
        const length = distance(segment.a, segment.b);
        mutable.set(a, [...(mutable.get(a) ?? []), { to: b, length }]);
        mutable.set(b, [...(mutable.get(b) ?? []), { to: a, length }]);
    }
    const componentByKey = new Map<string, number>();
    let componentId = 0;
    for (const key of points.keys()) {
        if (componentByKey.has(key)) continue;
        const queue = [key];
        componentByKey.set(key, componentId);
        while (queue.length > 0) {
            const current = queue.shift()!;
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
        const connectorComponents = new Set<number>();
        const connectors: Array<{ key: string; point: Point }> = [];
        for (const [key, point] of [...points.entries()].filter(([candidateKey]) => !candidateKey.startsWith('door:')).sort((a, b) => distance(a[1], door.point) - distance(b[1], door.point) || a[0].localeCompare(b[0]))) {
            const candidateComponent = componentByKey.get(key);
            if (candidateComponent === undefined || connectorComponents.has(candidateComponent)) continue;
            connectors.push({ key, point });
            connectorComponents.add(candidateComponent);
            if (connectors.length >= 2) break;
        }
        for (const connector of connectors) {
            const length = distance(connector.point, door.point);
            const nodeKey = connector.key;
            mutable.set(nodeKey, [...(mutable.get(nodeKey) ?? []), { to: doorKey, length }]);
            mutable.set(doorKey, [...(mutable.get(doorKey) ?? []), { to: nodeKey, length }]);
        }
    }
    const adjacency = new Map<string, readonly Readonly<{ to: string; length: number }>[] >();
    mutable.forEach((edges, key) => adjacency.set(key, edges.sort((a, b) => a.to.localeCompare(b.to))));
    const network = { points, nodeIds, adjacency };
    WALK_NETWORK_CACHE.set(graph, network);
    return network;
}

export function prototypeDoorTraversalCoverage(graph: CandidateNavigationGraph): readonly string[] {
    return graph.doors.map(door => door.id).sort((a, b) => a.localeCompare(b));
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
    while (queue.length > 0) {
        const current = queue.shift()!;
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
    const best = new Map([[start, 0]]);
    const previous = new Map<string, string>();
    let expanded = 0;
    while (queue.length > 0) {
        queue.sort((a, b) => a.cost - b.cost || a.key.localeCompare(b.key));
        const current = queue.shift()!;
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
            queue.push({ key: edge.to, cost });
        }
    }
    return null;
}

function prototypeDoorPath(graph: CandidateNavigationGraph, startRoomIds: readonly string[], targetRoomIds: readonly string[]) {
    const queue = startRoomIds.map(roomId => ({ roomId, doors: [] as CandidateNavigationGraph['doors'][number][] }));
    const visited = new Set(startRoomIds);
    while (queue.length > 0) {
        const current = queue.shift()!;
        if (targetRoomIds.includes(current.roomId)) return current.doors;
        for (const door of graph.doors) {
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

function geometricPrototypeDoorPath(graph: CandidateNavigationGraph, start: Point, target: Point) {
    const dx = target.x - start.x;
    const dy = target.y - start.y;
    const denominator = dx * dx + dy * dy;
    if (denominator < 1_000_000) return [];
    const candidates = graph.doors.map(door => {
        const projection = Math.max(0, Math.min(1, ((door.point.x - start.x) * dx + (door.point.y - start.y) * dy) / denominator));
        return { door, projection, corridorDistance: pointSegmentDistance(door.point, start, target) };
    }).filter(item => item.projection > 0.08 && item.projection < 0.92)
        .sort((a, b) => a.corridorDistance - b.corridorDistance || a.projection - b.projection || a.door.id.localeCompare(b.door.id));
    const selected = candidates.slice(0, Math.hypot(dx, dy) > 2_000 ? 3 : 1).sort((a, b) => a.projection - b.projection);
    return selected.map(item => item.door);
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

export function prototypeSpriteState(agent: PrototypeAgent): SpriteState {
    if (agent.movementState === 'walking') return 'walking';
    if (agent.movementState === 'blocked') return 'blocked';
    if (agent.task.kind === 'work' && agent.task.phase === 'working') return 'working';
    if (agent.activityState === 'waiting') return 'waiting';
    return 'idle';
}

export function prototypeSpriteDirection(agent: PrototypeAgent): SpriteDirection {
    return agent.direction;
}

export function prototypeTaskSummary(task: PrototypeTask): string {
    if (task.kind === 'idle') return task.reason === 'ambient-break' ? 'Taking an ambient break' : 'Idle';
    if (task.kind === 'stopped') return 'Stopped';
    if (task.kind === 'walk') return task.phase === 'traveling' ? 'Walking to assigned point' : 'Arrived at assigned point';
    if (task.kind === 'work') return task.phase === 'traveling' ? `Heading to ${task.workstationId}` : `Working at ${task.workstationId}`;
    if (task.kind === 'talk') return task.phase === 'traveling' ? `Heading to ${task.partnerAgentId}` : `Talking with ${task.partnerAgentId}`;
    if (task.kind === 'wander') return task.phase === 'traveling' ? 'Wandering through current room' : 'Finished wandering';
    return 'Choosing a valid reposition node';
}

export function prototypeOpenGraph(graph: CandidateNavigationGraph): CandidateNavigationGraph {
    return {
        ...graph,
        doors: graph.doors.map(door => ({
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
        })),
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
    const candidates = graph.walkNodes
        .filter(node => node.roomIds.length > 0)
        .filter(node => candidatePointHasStaticClearance(graph, node.point))
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id));
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
        spriteAssetId: graph.agents[index % Math.max(1, graph.agents.length)]?.spriteAssetId ?? 'agent-sheet-01',
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
        const varied = index % 6;
        const activityState: PrototypeActivityState = mode === 'debug'
            ? 'idle'
            : varied === 0 ? 'moving-to-task'
                : varied === 1 || varied === 2 ? 'working-at-desk'
                    : varied === 3 ? 'idle' : 'talking';
        const partnerIndex = varied === 4 ? index + 1 : varied === 5 ? index - 1 : -1;
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
            routeTangent: { x: 0, y: 0 },
            speed: 1,
            distanceTravelled: 0,
            walkCycleElapsedMs: 0,
            activityUntil: 4_000 + (index % 7) * 1_100,
            blockedDurationMs: 0,
            replanCooldownMs: 0,
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

export function planPrototypeRouteToPoint(
    graph: CandidateNavigationGraph,
    agent: PrototypeAgent,
    clickedPoint: Point,
    metrics?: PrototypeRuntimeMetrics,
): PrototypeRoutePlan | null {
    if (metrics) metrics.routePlans += 1;
    if (clickedPoint.x < 0 || clickedPoint.y < 0 || clickedPoint.x > OFFICE_SOURCE_WIDTH || clickedPoint.y > OFFICE_SOURCE_HEIGHT) return null;
    const network = prototypeWalkNetwork(graph, metrics);
    const startKey = nearestNetworkKey(network, agent.point);
    if (!startKey) return null;
    const candidates = [...network.points]
        .map(([key, point]) => ({ key, point, snapDistance: distance(point, clickedPoint) }))
        .filter(candidate => candidate.snapDistance <= PROTOTYPE_CLICK_SNAP_LIMIT)
        .sort((a, b) => a.snapDistance - b.snapDistance || a.key.localeCompare(b.key));
    const reached = reachableKeys(network, startKey);
    const target = candidates.find(candidate => reached.has(candidate.key)) ?? candidates[0];
    if (!target) return null;
    const path = shortestNetworkPath(network, startKey, target.key);
    const startRoomIds = graph.rooms.filter(room => pointInPolygon(agent.point, room.polygon)).map(room => room.id);
    const targetRoomIds = graph.rooms.filter(room => pointInPolygon(target.point, room.polygon)).map(room => room.id);
    const topologyDoorPath = targetRoomIds.length > 0 ? prototypeDoorPath(graph, startRoomIds, targetRoomIds) : [];
    const doorPath = topologyDoorPath.length > 0 ? topologyDoorPath : geometricPrototypeDoorPath(graph, agent.point, target.point);
    if (doorPath.length > 0) {
        const routeKeys = [startKey];
        let currentKey = startKey;
        let expandedNodeCount = 0;
        for (const door of doorPath) {
            const segment = shortestNetworkPath(network, currentKey, `door:${door.id}`);
            routeKeys.push(...(segment?.keys.slice(1) ?? [`door:${door.id}`]));
            expandedNodeCount += segment?.expanded ?? 0;
            currentKey = `door:${door.id}`;
        }
        const finalSegment = shortestNetworkPath(network, currentKey, target.key);
        routeKeys.push(...(finalSegment?.keys.slice(1) ?? [target.key]));
        expandedNodeCount += finalSegment?.expanded ?? 0;
        const routePoints = [agent.point, ...routeKeys.map(key => network.points.get(key)!)].filter((point, index, all) => index === 0 || distance(point, all[index - 1]) > 0.001);
        const doorSteps: CandidateDoorStep[] = [];
        let progress = 0;
        for (let index = 1; index < routePoints.length; index += 1) {
            progress += distance(routePoints[index - 1], routePoints[index]);
            const door = doorPath.find(item => distance(item.point, routePoints[index]) < 0.001);
            if (!door) continue;
            doorSteps.push({
                doorId: door.id,
                permission: 'general',
                initialPhysicalState: 'open',
                requiredAction: 'none',
                approachPoint: routePoints[index - 1],
                thresholdPoint: door.point,
                exitPoint: door.point,
                approachDistance: Math.max(0, progress - distance(routePoints[index - 1], door.point)),
                thresholdDistance: progress,
                exitDistance: progress,
                clearanceReleaseDistance: progress + 68,
            });
        }
        const length = routePoints.slice(1).reduce((total, point, index) => total + distance(routePoints[index], point), 0);
        return {
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
        };
    }
    if (!path) return null;
    const points = [agent.point, ...path.keys.map(key => network.points.get(key)!)].filter((point, index, all) => index === 0 || distance(point, all[index - 1]) > 0.001);
    const crossedDoorIds = graph.doors
        .filter(door => points.some((point, index) => index > 0 && pointSegmentDistance(door.point, points[index - 1], point) <= door.apertureRadius))
        .map(door => door.id)
        .sort((a, b) => a.localeCompare(b));
    const length = points.slice(1).reduce((total, point, index) => total + distance(points[index], point), 0);
    const route: CandidateRouteResult = {
        status: 'valid',
        reason: crossedDoorIds.length > 0 ? `Prototype route traverses open doors ${crossedDoorIds.join(', ')}.` : 'Prototype route follows the reachable walk graph.',
        points,
        crossedDoorIds,
        doorSteps: [],
        nodeSequence: path.keys.map(key => network.nodeIds.get(key) ?? `walk:${key}`),
        cost: Math.round(path.cost),
        length,
        expandedNodeCount: path.expanded,
    };
    return {
        route,
        clickedPoint,
        snappedPoint: target.point,
        snappedNodeId: network.nodeIds.get(target.key) ?? `walk:${target.key}`,
        snapDistance: target.snapDistance,
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
        blockedDurationMs: 0,
        blockedByAgentId: undefined,
        reservedNodeId: plan.route.nodeSequence[1] ?? plan.route.nodeSequence[0],
        reservedEdgeKey: undefined,
        replanCooldownMs: 0,
        trafficOffset: { x: 0, y: 0 },
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
        routeTangent: { x: 0, y: 0 },
        blockedDurationMs: 0,
        blockedByAgentId: undefined,
        reservedNodeId: undefined,
        reservedEdgeKey: undefined,
        replanCooldownMs: 0,
        trafficOffset: { x: 0, y: 0 },
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
        const plan = planPrototypeRouteToPoint(graph, agent, workstation.approachPoint, metrics);
        if (!plan || !prototypeRouteHasStaticClearance(graph, plan.route)) continue;
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
    let fallbackPlan: PrototypeRoutePlan | null = null;
    for (const approach of approaches) {
        if (seen.has(approach.id)) continue;
        seen.add(approach.id);
        const plan = planPrototypeRouteToPoint(graph, agent, approach.point, metrics);
        if (!plan) continue;
        fallbackPlan ??= plan;
        if (!prototypeRouteHasStaticClearance(graph, plan.route)) continue;
        return startPrototypeRoute(agent, plan, {
            kind: 'talk', phase: 'traveling', partnerAgentId: partner.fixture.id, destination: plan.snappedPoint, nodeId: plan.snappedNodeId, startedAtMs,
        });
    }
    if (fallbackPlan && allowCandidateFallback) return startPrototypeRoute(agent, fallbackPlan, {
        kind: 'talk', phase: 'traveling', partnerAgentId: partner.fixture.id, destination: fallbackPlan.snappedPoint, nodeId: fallbackPlan.snappedNodeId, startedAtMs,
    });
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
        const plan = planPrototypeRouteToPoint(graph, agent, target.point, metrics);
        if (!plan || plan.route.length <= 20 || !prototypeRouteHasStaticClearance(graph, plan.route)) continue;
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
        routeTangent: { x: 0, y: 0 },
        blockedDurationMs: 0,
        blockedByAgentId: undefined,
        reservedNodeId: undefined,
        reservedEdgeKey: undefined,
        replanCooldownMs: 0,
        trafficOffset: { x: 0, y: 0 },
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
    return route.points.every((point, index) => candidatePointHasStaticClearance(graph, point, route.crossedDoorIds)
        && (index === 0 || candidateSegmentHasStaticClearance(graph, route.points[index - 1], point, route.crossedDoorIds)));
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
        activityState: task.kind === 'talk' && task.phase === 'talking' ? 'talking' : 'idle',
        velocity: { x: 0, y: 0 },
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
    const proposals = agents.map((previous): PrototypeAgent => {
        if (!['walking', 'waiting', 'blocked'].includes(previous.movementState) || !previous.route) {
            if (previous.velocity.x === 0 && previous.velocity.y === 0 && previous.replanCooldownMs <= 0) return previous;
            return {
                ...previous,
                velocity: { x: 0, y: 0 },
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
        const staticClear = offsetClear || directClear;
        return {
            ...previous,
            point: staticClear ? point : previous.point,
            progress: staticClear ? safeProgress : previous.progress,
            movementState: staticClear ? movementState : 'blocked',
            activityState: staticClear && movementState === 'walking' ? 'walking' : staticClear ? previous.activityState : 'waiting',
            velocity: staticClear ? velocity : { x: 0, y: 0 },
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
    agents.forEach(agent => currentHash.insert(agent.fixture.id, agent.point));
    const edgeOwners = new Map<string, string>();
    const order = agents.map((agent, index) => ({ agent, index }))
        .sort((a, b) => taskTrafficPriority(b.agent) - taskTrafficPriority(a.agent) || a.agent.fixture.id.localeCompare(b.agent.fixture.id));
    const accepted = [...proposals];
    for (const { agent: previous, index } of order) {
        const proposal = proposals[index];
        if (proposal.movementState === 'arrived') {
            accepted[index] = settleArrivedPrototypeAgent(graph, previous, proposal);
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
        accepted[index] = {
            ...previous,
            point,
            movementState: 'waiting',
            activityState: 'waiting',
            velocity,
            routeTangent: tangent,
            direction: prototypeFacingFromVelocity(previous.direction, velocity),
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
        if (agent.staticCollisionStatus !== 'blocked' || agent.blockedDurationMs < 750) return agent;
        if (metrics) metrics.routeReplans += 1;
        return {
            ...assignPrototypeIdle(agent, agent.task.startedAtMs + agent.blockedDurationMs),
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
        if (index % 6 !== 0) continue;
        const agent = agents[index];
        const target = ambientPrototypeTarget(graph, agent, index);
        if (!target) continue;
        // Routing does not depend on the mutable prototype-agent roster. Keep the
        // stable graph identity so prototypeWalkNetwork can reuse its WeakMap cache
        // for every ambient seed instead of rebuilding the full office network.
        const plan = planPrototypeRouteToPoint(graph, agent, target);
        if (!plan || !prototypeRouteHasStaticClearance(graph, plan.route)) continue;
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
        routeTangent: { x: 0, y: 0 },
        blockedDurationMs: 0,
        blockedByAgentId: undefined,
        reservedNodeId: undefined,
        reservedEdgeKey: undefined,
        replanCooldownMs: 0,
        trafficOffset: { x: 0, y: 0 },
        staticCollisionStatus: 'clear',
        partnerAgentId: undefined,
        workstationId: undefined,
        task: { kind: 'stopped', reason: 'reset', startedAtMs: 0 },
        revision: agent.revision + 1,
    };
}
