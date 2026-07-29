import { OFFICE_SOURCE_HEIGHT, OFFICE_SOURCE_WIDTH } from '../../constants';
import type { Point } from '../../types';

export type CandidateAccessOutcome = 'allowed' | 'blocked' | 'restricted' | 'reserved' | 'manual-review-required' | 'malformed-door';
export type CandidateRouteStatus = 'valid' | 'blocked' | 'restricted' | 'unreachable' | 'malformed';

export type CandidateAgentFixture = Readonly<{
    id: string;
    label: string;
    positionId: string;
    roomId: string;
    roomName: string;
    point: Point;
    accessTier: 'standard' | 'priority';
    spriteAssetId: string;
    provisionalSpriteAssignment: true;
}>;

export type CandidateDestination = Readonly<{
    id: string;
    label: string;
    kind: 'position' | 'room' | 'computer' | 'interactive-object' | 'waypoint';
    point: Point;
    roomId: string;
    roomName: string;
}>;

export type CandidateDoorNode = Readonly<{
    id: string;
    point: Point;
    zones: readonly string[];
    accessMode: string;
    manualReviewRequired: boolean;
}>;

export type CandidateNavigationGraph = Readonly<{
    rooms: readonly CandidateRoom[];
    doors: readonly CandidateDoorNode[];
    agents: readonly CandidateAgentFixture[];
    destinations: readonly CandidateDestination[];
    colliders: readonly CandidateCollider[];
    nodeCount: number;
}>;

export type CandidateRouteResult = Readonly<{
    status: CandidateRouteStatus;
    reason: string;
    points: readonly Point[];
    crossedDoorIds: readonly string[];
    cost: number;
    length: number;
    expandedNodeCount: number;
    failureCategory?: string;
}>;

type UnknownRecord = Record<string, unknown>;
type CandidateRoom = Readonly<{ id: string; name: string; polygon: readonly Point[]; center: Point }>;
type CandidateCollider = Readonly<{ id: string; kind: 'wall' | 'object'; points: readonly Point[] }>;

type CandidateDocuments = Readonly<{
    rooms: unknown;
    positions: unknown;
    doors: unknown;
    computers: unknown;
    interactiveObjects: unknown;
    walls: unknown;
    objects: unknown;
}>;

const MAX_ROUTE_POINTS = 96;
const MAX_EXPANDED_NODES = 512;
const SAFE_REASON_LIMIT = 180;
const SPRITE_SHEET_COUNT = 16;

function record(value: unknown, context: string): UnknownRecord {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${context} is malformed.`);
    return value as UnknownRecord;
}

function array(value: unknown, context: string): unknown[] {
    if (!Array.isArray(value)) throw new Error(`${context} must be an array.`);
    return value;
}

function finite(value: unknown, context: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${context} must be finite.`);
    return value;
}

function text(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function point(value: unknown, context: string): Point {
    const item = record(value, context);
    return { x: finite(item.x, `${context}.x`), y: finite(item.y, `${context}.y`) };
}

function points(value: unknown, context: string): Point[] {
    return array(value, context).map((item, index) => point(item, `${context}[${index}]`));
}

function wrapperData(value: unknown, context: string): UnknownRecord {
    const wrapper = record(value, context);
    if (wrapper.productionApproved !== false || wrapper.registrationStatus !== 'candidate-unverified') {
        throw new Error(`${context} is not candidate-only provisional data.`);
    }
    return record(wrapper.data, `${context}.data`);
}

function bounded(pointValue: Point): boolean {
    return Number.isFinite(pointValue.x) && Number.isFinite(pointValue.y)
        && pointValue.x >= 0 && pointValue.y >= 0
        && pointValue.x <= OFFICE_SOURCE_WIDTH && pointValue.y <= OFFICE_SOURCE_HEIGHT;
}

function centroid(polygon: readonly Point[]): Point {
    if (polygon.length === 0) return { x: 0, y: 0 };
    const sum = polygon.reduce((acc, item) => ({ x: acc.x + item.x, y: acc.y + item.y }), { x: 0, y: 0 });
    return { x: sum.x / polygon.length, y: sum.y / polygon.length };
}

export function pointInPolygon(target: Point, polygon: readonly Point[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[i];
        const b = polygon[j];
        const intersects = (a.y > target.y) !== (b.y > target.y)
            && target.x < ((b.x - a.x) * (target.y - a.y)) / ((b.y - a.y) || Number.EPSILON) + a.x;
        if (intersects) inside = !inside;
    }
    return inside;
}

function distance(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function orientation(a: Point, b: Point, c: Point): number {
    return Math.sign((b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y));
}

function onSegment(a: Point, b: Point, c: Point): boolean {
    return Math.min(a.x, c.x) <= b.x && b.x <= Math.max(a.x, c.x)
        && Math.min(a.y, c.y) <= b.y && b.y <= Math.max(a.y, c.y);
}

export function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
    const o1 = orientation(a, b, c);
    const o2 = orientation(a, b, d);
    const o3 = orientation(c, d, a);
    const o4 = orientation(c, d, b);
    if (o1 !== o2 && o3 !== o4) return true;
    return (o1 === 0 && onSegment(a, c, b))
        || (o2 === 0 && onSegment(a, d, b))
        || (o3 === 0 && onSegment(c, a, d))
        || (o4 === 0 && onSegment(c, b, d));
}

function segmentIntersectsPolygon(a: Point, b: Point, polygon: readonly Point[]): boolean {
    if (pointInPolygon(a, polygon) || pointInPolygon(b, polygon)) return true;
    for (let i = 0; i < polygon.length; i += 1) {
        if (segmentsIntersect(a, b, polygon[i], polygon[(i + 1) % polygon.length])) return true;
    }
    return false;
}

function candidatePolygonFromNative(source: UnknownRecord, context: string): readonly Point[] | null {
    const native = record(source.nativeGeometry, `${context}.nativeGeometry`);
    if (native.kind === 'polygon') return points(native.points, `${context}.points`);
    if (native.kind === 'rectangle') {
        const rect = record(native.rect, `${context}.rect`);
        const x1 = finite(rect.x1, `${context}.rect.x1`);
        const x2 = finite(rect.x2, `${context}.rect.x2`);
        const y1 = finite(rect.y1, `${context}.rect.y1`);
        const y2 = finite(rect.y2, `${context}.rect.y2`);
        return [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }];
    }
    if (native.kind === 'ink') {
        const paths = array(native.paths, `${context}.paths`);
        const first = paths[0];
        if (!first) return null;
        return points(first, `${context}.paths[0]`);
    }
    return null;
}

function roomForPoint(rooms: readonly CandidateRoom[], value: Point): CandidateRoom {
    return rooms.find(room => pointInPolygon(value, room.polygon))
        ?? [...rooms].sort((a, b) => distance(a.center, value) - distance(b.center, value) || a.id.localeCompare(b.id))[0]
        ?? { id: 'candidate-zone-unresolved', name: 'Unresolved candidate zone', polygon: [], center: value };
}

function accessOutcome(door: CandidateDoorNode): CandidateAccessOutcome {
    if (!door.id || door.zones.length < 2 || !door.accessMode) return 'malformed-door';
    if (door.manualReviewRequired) return 'manual-review-required';
    if (door.accessMode === 'open' || door.accessMode === 'elevator') return 'allowed';
    if (door.accessMode === 'blocked') return 'blocked';
    if (door.accessMode === 'restricted') return 'restricted';
    if (door.accessMode === 'event') return 'reserved';
    return 'malformed-door';
}

function safeReason(reason: string): string {
    return reason.length <= SAFE_REASON_LIMIT ? reason : `${reason.slice(0, SAFE_REASON_LIMIT - 1)}…`;
}

export function buildCandidateNavigationGraph(documents: CandidateDocuments): CandidateNavigationGraph {
    const roomData = wrapperData(documents.rooms, 'rooms');
    const positionData = wrapperData(documents.positions, 'positions');
    const doorData = wrapperData(documents.doors, 'doors');
    const computerData = wrapperData(documents.computers, 'computers');
    const interactiveData = wrapperData(documents.interactiveObjects, 'interactive-objects');
    const wallData = wrapperData(documents.walls, 'walls');
    const objectData = wrapperData(documents.objects, 'objects');

    const rooms: CandidateRoom[] = array(roomData.rooms, 'rooms').map((value, index) => {
        const item = record(value, `room[${index}]`);
        const polygon = points(item.pdfPolygon, `room[${index}].pdfPolygon`);
        return {
            id: text(item.id, `ROOM_${index + 1}`),
            name: text(item.canonicalName, `Room ${index + 1}`),
            polygon,
            center: centroid(polygon),
        };
    }).sort((a, b) => a.id.localeCompare(b.id));

    const positions = array(positionData.positions, 'positions').map((value, index) => {
        const item = record(value, `position[${index}]`);
        const candidatePoint = point(item.pdfAnchor, `position[${index}].pdfAnchor`);
        const room = roomForPoint(rooms, candidatePoint);
        return {
            id: text(item.id, `POSITION_${String(index + 1).padStart(3, '0')}`),
            point: candidatePoint,
            tier: item.accessTier === 'priority' ? 'priority' as const : 'standard' as const,
            room,
        };
    }).filter(item => bounded(item.point));

    const selectedPositions: typeof positions = [];
    for (const tier of ['priority', 'standard'] as const) {
        for (const item of positions.filter(position => position.tier === tier).sort((a, b) => a.id.localeCompare(b.id))) {
            if (selectedPositions.length >= 40) break;
            if (selectedPositions.every(existing => distance(existing.point, item.point) >= 38)) selectedPositions.push(item);
        }
    }
    selectedPositions.sort((a, b) => a.id.localeCompare(b.id));

    const agents = selectedPositions.map((item, index): CandidateAgentFixture => ({
        id: `floor1-review-agent-${String(index + 1).padStart(2, '0')}`,
        label: `Review agent ${String(index + 1).padStart(2, '0')}`,
        positionId: item.id,
        roomId: item.room.id,
        roomName: item.room.name,
        point: item.point,
        accessTier: item.tier,
        spriteAssetId: `agent-sheet-${String((index % SPRITE_SHEET_COUNT) + 1).padStart(2, '0')}`,
        provisionalSpriteAssignment: true,
    }));

    const positionDestinations = positions.map((item): CandidateDestination => ({
        id: `position:${item.id}`,
        label: `${item.id} (${item.tier})`,
        kind: 'position',
        point: item.point,
        roomId: item.room.id,
        roomName: item.room.name,
    }));
    const computerDestinations = array(computerData.records, 'computers.records').map((value, index): CandidateDestination | null => {
        const item = record(value, `computer[${index}]`);
        const polygon = candidatePolygonFromNative(item, `computer[${index}]`);
        if (!polygon) return null;
        const candidatePoint = centroid(polygon);
        const room = roomForPoint(rooms, candidatePoint);
        return { id: `computer:${text(item.id, `COMPUTER_${index + 1}`)}`, label: `Computer ${index + 1}`, kind: 'computer', point: candidatePoint, roomId: room.id, roomName: room.name };
    }).filter((item): item is CandidateDestination => item !== null && bounded(item.point));
    const roomDestinations = rooms.map((room): CandidateDestination => ({ id: `room:${room.id}`, label: room.name, kind: 'room', point: room.center, roomId: room.id, roomName: room.name }));
    const interactiveDestinations = array(interactiveData.interactiveObjects, 'interactiveObjects').map((value, index): CandidateDestination => {
        const item = record(value, `interactive[${index}]`);
        const polygon = points(item.pdfPolygon, `interactive[${index}].pdfPolygon`);
        const candidatePoint = centroid(polygon);
        const room = roomForPoint(rooms, candidatePoint);
        return { id: `interactive:${text(item.id, `INTERACTIVE_${index + 1}`)}`, label: text(item.name, `Interactive object ${index + 1}`), kind: 'interactive-object', point: candidatePoint, roomId: room.id, roomName: room.name };
    }).filter(item => bounded(item.point));

    const doors = array(doorData.doors, 'doors').map((value, index): CandidateDoorNode => {
        const item = record(value, `door[${index}]`);
        const facts = record(item.authoredFacts, `door[${index}].authoredFacts`);
        const polygon = points(item.pdfPolygon, `door[${index}].pdfPolygon`);
        return {
            id: text(item.id, `D${String(index + 1).padStart(2, '0')}`),
            point: centroid(polygon),
            zones: [text(facts.zone_a, ''), text(facts.zone_b, '')].filter(Boolean),
            accessMode: text(item.csvAccessMode, text(facts.access_mode, '')),
            manualReviewRequired: item.manualReviewRequired === true || text(facts.manual_review_required, 'no') === 'yes',
        };
    }).sort((a, b) => a.id.localeCompare(b.id));

    const colliders: CandidateCollider[] = [];
    for (const [kind, data] of [['wall', wallData], ['object', objectData]] as const) {
        array(data.records, `${kind}.records`).forEach((value, index) => {
            const item = record(value, `${kind}[${index}]`);
            const polygon = candidatePolygonFromNative(item, `${kind}[${index}]`);
            if (polygon && polygon.length >= 3) colliders.push({ id: `${kind}:${text(item.id, `${kind}-${index + 1}`)}`, kind, points: polygon });
        });
    }

    return {
        rooms,
        doors,
        agents,
        destinations: [...positionDestinations, ...computerDestinations, ...roomDestinations, ...interactiveDestinations]
            .sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id)),
        colliders,
        nodeCount: rooms.length + doors.length + positionDestinations.length + computerDestinations.length + interactiveDestinations.length,
    };
}

function destinationById(graph: CandidateNavigationGraph, destinationId: string): CandidateDestination | null {
    return graph.destinations.find(destination => destination.id === destinationId) ?? null;
}

function validatePoint(graph: CandidateNavigationGraph, value: Point, label: string): CandidateRouteResult | null {
    if (!bounded(value)) return { status: 'malformed', reason: safeReason(`${label} is outside bounded Floor 1 candidate coordinates.`), points: [], crossedDoorIds: [], cost: 0, length: 0, expandedNodeCount: 0, failureCategory: 'bounds' };
    const collider = graph.colliders.find(item => pointInPolygon(value, item.points));
    if (collider) return { status: 'blocked', reason: safeReason(`${label} is inside candidate ${collider.kind} collision geometry.`), points: [], crossedDoorIds: [], cost: 0, length: 0, expandedNodeCount: 0, failureCategory: 'collision' };
    return null;
}

function validateSegments(graph: CandidateNavigationGraph, routePoints: readonly Point[], crossedDoorIds: readonly string[]): CandidateRouteResult | null {
    for (let index = 1; index < routePoints.length; index += 1) {
        const a = routePoints[index - 1];
        const b = routePoints[index];
        if (!bounded(a) || !bounded(b)) return { status: 'malformed', reason: 'Route includes out-of-bounds coordinates.', points: [], crossedDoorIds: [], cost: 0, length: 0, expandedNodeCount: index, failureCategory: 'bounds' };
        const collider = graph.colliders.find(item => segmentIntersectsPolygon(a, b, item.points));
        if (collider) {
            const isDoorEndpoint = crossedDoorIds.some(doorId => {
                const door = graph.doors.find(item => item.id === doorId);
                return door ? distance(door.point, a) < 2 || distance(door.point, b) < 2 : false;
            });
            if (!isDoorEndpoint) return { status: 'blocked', reason: safeReason(`Route segment intersects candidate ${collider.kind} collision geometry.`), points: [], crossedDoorIds, cost: 0, length: 0, expandedNodeCount: index, failureCategory: 'collision' };
        }
    }
    return null;
}

function doorBetween(graph: CandidateNavigationGraph, a: CandidateRoom, b: CandidateRoom): CandidateDoorNode | null {
    const candidates = graph.doors.filter(door => door.zones.includes(a.name) && door.zones.includes(b.name));
    return candidates.sort((left, right) => accessOutcome(left).localeCompare(accessOutcome(right)) || left.id.localeCompare(right.id))[0] ?? null;
}

export function planCandidateRoute(
    graph: CandidateNavigationGraph,
    start: Point,
    destinationId: string,
): CandidateRouteResult {
    const startValidation = validatePoint(graph, start, 'Route start');
    if (startValidation) return startValidation;
    const destination = destinationById(graph, destinationId);
    if (!destination) return { status: 'malformed', reason: 'Destination could not be resolved to a candidate review point.', points: [], crossedDoorIds: [], cost: 0, length: 0, expandedNodeCount: 0, failureCategory: 'destination' };
    const destinationValidation = validatePoint(graph, destination.point, 'Route destination');
    if (destinationValidation) return destinationValidation;

    const startRoom = roomForPoint(graph.rooms, start);
    const destRoom = roomForPoint(graph.rooms, destination.point);
    const crossedDoorIds: string[] = [];
    const pointsOut: Point[] = [start];
    let expanded = 1;

    if (startRoom.id !== destRoom.id) {
        const queue: Array<{ room: CandidateRoom; path: CandidateDoorNode[] }> = [{ room: startRoom, path: [] }];
        const visited = new Set([startRoom.name]);
        let found: CandidateDoorNode[] | null = null;
        while (queue.length > 0 && expanded < MAX_EXPANDED_NODES) {
            const current = queue.shift();
            if (!current) break;
            if (current.room.name === destRoom.name) { found = current.path; break; }
            const nextDoors = graph.doors.filter(door => door.zones.includes(current.room.name)).sort((a, b) => a.id.localeCompare(b.id));
            for (const door of nextDoors) {
                expanded += 1;
                const otherName = door.zones.find(zone => zone !== current.room.name);
                if (!otherName || visited.has(otherName)) continue;
                const otherRoom = graph.rooms.find(room => room.name === otherName) ?? { id: `zone:${otherName}`, name: otherName, polygon: [], center: door.point };
                visited.add(otherName);
                queue.push({ room: otherRoom, path: [...current.path, door] });
            }
        }
        if (!found) {
            const directDoor = doorBetween(graph, startRoom, destRoom);
            if (directDoor) found = [directDoor];
        }
        if (!found || found.length === 0) return { status: 'unreachable', reason: safeReason(`No candidate door path connects ${startRoom.name} to ${destRoom.name}.`), points: [], crossedDoorIds: [], cost: 0, length: 0, expandedNodeCount: expanded, failureCategory: 'disconnected' };
        for (const door of found) {
            const outcome = accessOutcome(door);
            if (outcome !== 'allowed') {
                const status = outcome === 'restricted' ? 'restricted' : 'blocked';
                return { status, reason: safeReason(`${door.id} is ${outcome}; candidate movement will not pass through it.`), points: [], crossedDoorIds: [door.id], cost: 0, length: 0, expandedNodeCount: expanded, failureCategory: outcome };
            }
            pointsOut.push(door.point);
            crossedDoorIds.push(door.id);
            if (pointsOut.length > MAX_ROUTE_POINTS) return { status: 'malformed', reason: 'Route exceeded the candidate route point limit.', points: [], crossedDoorIds, cost: 0, length: 0, expandedNodeCount: expanded, failureCategory: 'limits' };
        }
    }
    pointsOut.push(destination.point);
    const segmentFailure = validateSegments(graph, pointsOut, crossedDoorIds);
    if (segmentFailure) return segmentFailure;
    const length = pointsOut.slice(1).reduce((acc, pointValue, index) => acc + distance(pointsOut[index], pointValue), 0);
    return {
        status: 'valid',
        reason: crossedDoorIds.length > 0 ? `Candidate route allowed through ${crossedDoorIds.join(', ')}.` : 'Candidate same-room route is valid.',
        points: pointsOut,
        crossedDoorIds,
        cost: Math.round(length),
        length: Math.round(length),
        expandedNodeCount: expanded,
    };
}

export function interpolateRoute(pointsIn: readonly Point[], distanceAlongRoute: number): Point {
    if (pointsIn.length === 0) return { x: 0, y: 0 };
    let remaining = Math.max(0, distanceAlongRoute);
    for (let index = 1; index < pointsIn.length; index += 1) {
        const start = pointsIn[index - 1];
        const end = pointsIn[index];
        const segmentLength = distance(start, end);
        if (remaining <= segmentLength) {
            const ratio = segmentLength === 0 ? 0 : remaining / segmentLength;
            return { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio };
        }
        remaining -= segmentLength;
    }
    return pointsIn[pointsIn.length - 1];
}
