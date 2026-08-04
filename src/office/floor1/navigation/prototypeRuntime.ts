import { OFFICE_SOURCE_HEIGHT, OFFICE_SOURCE_WIDTH } from '../../constants';
import type { Point } from '../../types';
import type { SpriteDirection, SpriteState } from '../../sprites/types';
import {
    advanceCandidateAgents,
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

export type PrototypeActivityState = 'walking' | 'working-at-desk' | 'idle' | 'talking' | 'waiting' | 'moving-to-task';
export type PrototypeMovementState = 'idle' | 'walking' | 'paused' | 'arrived' | 'stopped' | 'blocked';

type TimedTask = Readonly<{ startedAtMs: number }>;
export type PrototypeTask =
    | (TimedTask & Readonly<{ kind: 'idle'; reason: 'spawned' | 'assigned' | 'ambient-break' | 'arrived' }>)
    | (TimedTask & Readonly<{ kind: 'stopped'; reason: 'user' | 'reset' }>)
    | (TimedTask & Readonly<{ kind: 'walk'; phase: 'traveling' | 'arrived'; destination: Point; nodeId: string }>)
    | (TimedTask & Readonly<{ kind: 'work'; phase: 'traveling' | 'working'; workstationId: string; destination: Point; nodeId: string }>)
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
    speed: number;
    activityUntil: number;
    partnerAgentId?: string;
    workstationId?: string;
    task: PrototypeTask;
    revision: number;
}>;

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

type PrototypeWalkNetwork = Readonly<{
    points: ReadonlyMap<string, Point>;
    nodeIds: ReadonlyMap<string, string>;
    adjacency: ReadonlyMap<string, readonly Readonly<{ to: string; length: number }>[] >;
}>;

const WALK_NETWORK_CACHE = new WeakMap<object, PrototypeWalkNetwork>();

function prototypeWalkNetwork(graph: CandidateNavigationGraph): PrototypeWalkNetwork {
    const cached = WALK_NETWORK_CACHE.get(graph);
    if (cached) return cached;
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
    const network = prototypeWalkNetwork(graph);
    return graph.doors
        .filter(door => (network.adjacency.get(`door:${door.id}`)?.length ?? 0) >= 2)
        .map(door => door.id)
        .sort((a, b) => a.localeCompare(b));
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
        const workstation = graph.destinations
            .filter(destination => (destination.kind === 'position' || destination.kind === 'computer') && destination.availability !== 'unavailable')
            .slice()
            .sort((a, b) => distance(a.point, node.point) - distance(b.point, node.point) || a.id.localeCompare(b.id))[0];
        const task: PrototypeTask = mode === 'debug'
            ? { kind: 'idle', reason: 'spawned', startedAtMs: 0 }
            : activityState === 'working-at-desk' && workstation
                ? { kind: 'work', phase: 'working', workstationId: workstation.id, destination: node.point, nodeId: node.id, startedAtMs: 0 }
                : activityState === 'talking' && partnerAgentId
                    ? { kind: 'talk', phase: 'talking', partnerAgentId, destination: node.point, nodeId: node.id, startedAtMs: 0 }
                    : { kind: 'idle', reason: 'ambient-break', startedAtMs: 0 };
        return {
            fixture,
            point: node.point,
            spawnPoint: node.point,
            currentNodeId: node.id,
            route: null,
            progress: 0,
            movementState: 'idle',
            activityState,
            targetPoint: null,
            clickedPoint: null,
            direction: index % 4 === 0 ? 'east' : index % 4 === 1 ? 'south' : index % 4 === 2 ? 'west' : 'north',
            speed: 1,
            activityUntil: 4_000 + (index % 7) * 1_100,
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
): PrototypeRoutePlan | null {
    if (clickedPoint.x < 0 || clickedPoint.y < 0 || clickedPoint.x > OFFICE_SOURCE_WIDTH || clickedPoint.y > OFFICE_SOURCE_HEIGHT) return null;
    const network = prototypeWalkNetwork(graph);
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
            expandedNodeCount += segment?.expanded ?? 1;
            currentKey = `door:${door.id}`;
        }
        const finalSegment = shortestNetworkPath(network, currentKey, target.key);
        routeKeys.push(...(finalSegment?.keys.slice(1) ?? [target.key]));
        expandedNodeCount += finalSegment?.expanded ?? 1;
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
                length: Math.round(length),
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
    const length = points.slice(1).reduce((total, point, index) => total + distance(points[index], point), 0);
    const crossedDoorIds = graph.doors
        .filter(door => points.some((point, index) => index > 0 && pointSegmentDistance(door.point, points[index - 1], point) <= door.apertureRadius))
        .map(door => door.id)
        .sort((a, b) => a.localeCompare(b));
    const route: CandidateRouteResult = {
        status: 'valid',
        reason: crossedDoorIds.length > 0 ? `Prototype route traverses open doors ${crossedDoorIds.join(', ')}.` : 'Prototype route follows the reachable walk graph.',
        points,
        crossedDoorIds,
        doorSteps: [],
        nodeSequence: path.keys.map(key => network.nodeIds.get(key) ?? `walk:${key}`),
        cost: Math.round(path.cost),
        length: Math.round(length),
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

function directionBetween(from: Point, to: Point, fallback: PrototypeAgent['direction']): PrototypeAgent['direction'] {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return fallback;
    return Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'east' : 'west') : (dy >= 0 ? 'south' : 'north');
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
): PrototypeAgent | null {
    const runtimeGraph = { ...graph, agents: [agent.fixture] };
    const candidates = graph.destinations
        .filter(destination => (destination.kind === 'position' || destination.kind === 'computer') && destination.availability !== 'unavailable')
        .slice()
        .sort((a, b) => distance(a.point, agent.point) - distance(b.point, agent.point) || a.id.localeCompare(b.id));
    for (const destination of candidates) {
        const plan = planPrototypeRouteToPoint(runtimeGraph, agent, destination.point);
        if (!plan) continue;
        return startPrototypeRoute(agent, plan, {
            kind: 'work', phase: 'traveling', workstationId: destination.id, destination: plan.snappedPoint, nodeId: plan.snappedNodeId, startedAtMs,
        });
    }
    return null;
}

export function assignPrototypeTalk(
    graph: CandidateNavigationGraph,
    agent: PrototypeAgent,
    partner: PrototypeAgent,
    startedAtMs: number,
): PrototypeAgent | null {
    const offset = agent.fixture.id.localeCompare(partner.fixture.id) < 0 ? -90 : 90;
    const intended = { x: partner.point.x + offset, y: partner.point.y + 36 };
    const distinctSnap = snapPrototypePoint(graph, intended, PROTOTYPE_CLICK_SNAP_LIMIT, new Set([partner.currentNodeId]));
    const plan = distinctSnap
        ? planPrototypeRouteToPoint({ ...graph, agents: [agent.fixture, partner.fixture] }, agent, distinctSnap.point)
        : null;
    if (!plan) return null;
    return startPrototypeRoute(agent, plan, {
        kind: 'talk', phase: 'traveling', partnerAgentId: partner.fixture.id, destination: plan.snappedPoint, nodeId: plan.snappedNodeId, startedAtMs,
    });
}

export function assignPrototypeWander(
    graph: CandidateNavigationGraph,
    agent: PrototypeAgent,
    seed: number,
    startedAtMs: number,
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
    for (const target of ordered.slice(0, 12)) {
        const plan = planPrototypeRouteToPoint({ ...graph, agents: [agent.fixture] }, agent, target.point);
        if (!plan || plan.route.length <= 20) continue;
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
        task: { kind: 'idle', reason: 'assigned', startedAtMs },
        revision: agent.revision + 1,
    };
}

export function advancePrototypeAgents(
    agents: readonly PrototypeAgent[],
    deltaMs: number,
    baseSpeed: number,
    paused: boolean,
    doors: Readonly<Record<string, CandidateDoorRuntime>>,
): readonly PrototypeAgent[] {
    if (paused) return agents;
    const advanced = advanceCandidateAgents(
        agents.map(agent => ({ ...agent, status: agent.movementState })),
        deltaMs,
        baseSpeed,
        doors,
    );
    return advanced.map((candidate, index) => {
        const previous = agents[index];
        const movementState = candidate.status as PrototypeMovementState;
        const arrived = movementState === 'arrived' && previous.movementState === 'walking';
        const task: PrototypeTask = !arrived ? previous.task
            : previous.task.kind === 'work' ? { ...previous.task, phase: 'working' }
                : previous.task.kind === 'talk' ? { ...previous.task, phase: 'talking' }
                    : previous.task.kind === 'walk' ? { ...previous.task, phase: 'arrived' }
                        : previous.task.kind === 'wander' ? { ...previous.task, phase: 'arrived' }
                            : previous.task;
        const activityState: PrototypeActivityState = movementState === 'walking' ? 'walking'
            : task.kind === 'work' && task.phase === 'working' ? 'working-at-desk'
                : task.kind === 'talk' && task.phase === 'talking' ? 'talking'
                    : previous.activityState === 'walking' ? 'idle' : previous.activityState;
        return {
            ...previous,
            point: candidate.point,
            progress: candidate.progress,
            movementState,
            activityState,
            task,
            direction: directionBetween(previous.point, candidate.point, previous.direction),
            currentNodeId: movementState === 'arrived' && previous.targetPoint
                ? previous.route?.nodeSequence[previous.route.nodeSequence.length - 1] ?? previous.currentNodeId
                : previous.currentNodeId,
        };
    });
}

export function seedAmbientMovement(graph: CandidateNavigationGraph, input: readonly PrototypeAgent[]): readonly PrototypeAgent[] {
    let agents = input;
    for (let index = 0; index < agents.length; index += 1) {
        if (index % 6 !== 0) continue;
        const agent = agents[index];
        const target = ambientPrototypeTarget(graph, agent, index);
        if (!target) continue;
        const plan = planPrototypeRouteToPoint({ ...graph, agents: agents.map(item => item.fixture) }, agent, target);
        if (!plan) continue;
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
        partnerAgentId: undefined,
        workstationId: undefined,
        task: { kind: 'stopped', reason: 'reset', startedAtMs: 0 },
        revision: agent.revision + 1,
    };
}
