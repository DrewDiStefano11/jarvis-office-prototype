import { OFFICE_SOURCE_HEIGHT, OFFICE_SOURCE_WIDTH } from '../../constants';
import type { Point } from '../../types';

export type CandidateAccessOutcome = 'allowed' | 'blocked' | 'restricted' | 'reserved' | 'manual-review-required' | 'malformed-door';
export type CandidateRouteStatus = 'valid' | 'blocked' | 'restricted' | 'unreachable' | 'malformed';
export type CandidateDestinationKind = 'position' | 'room' | 'computer' | 'interactive-object' | 'waypoint';

export type CandidateAgentFixture = Readonly<{
    id: string;
    label: string;
    positionId: string;
    roomId: string;
    roomIds: readonly string[];
    roomName: string;
    point: Point;
    accessTier: 'standard' | 'priority';
    spriteAssetId: string;
    provisionalSpriteAssignment: true;
}>;

export type CandidateDestination = Readonly<{
    id: string;
    label: string;
    kind: CandidateDestinationKind;
    point: Point;
    roomId: string;
    roomIds: readonly string[];
    roomName: string;
    accessTier?: 'standard' | 'priority';
}>;

export type CandidateDoorNode = Readonly<{
    id: string;
    point: Point;
    zones: readonly string[];
    zoneIds: readonly string[];
    accessMode: string;
    manualReviewRequired: boolean;
    apertureRadius: number;
    malformedReason?: string;
}>;

export type CandidateCollider = Readonly<{
    id: string;
    kind: 'wall' | 'object';
    points: readonly Point[];
    closed: boolean;
    thickness: number;
}>;

export type CandidateWalkNode = Readonly<{
    id: string;
    point: Point;
    roomId: string;
    roomIds: readonly string[];
    pathId: string;
}>;

export type CandidateWalkSegment = Readonly<{
    id: string;
    a: Point;
    b: Point;
    pathId: string;
}>;

export type CandidateNavigationGraph = Readonly<{
    rooms: readonly CandidateRoom[];
    doors: readonly CandidateDoorNode[];
    agents: readonly CandidateAgentFixture[];
    destinations: readonly CandidateDestination[];
    colliders: readonly CandidateCollider[];
    walkNodes: readonly CandidateWalkNode[];
    walkSegments: readonly CandidateWalkSegment[];
    roomDiagnostics: readonly string[];
    nodeCount: number;
    edgeCount: number;
}>;

export type CandidateRouteResult = Readonly<{
    status: CandidateRouteStatus;
    reason: string;
    points: readonly Point[];
    crossedDoorIds: readonly string[];
    nodeSequence: readonly string[];
    cost: number;
    length: number;
    expandedNodeCount: number;
    failureCategory?: string;
}>;

type UnknownRecord = Record<string, unknown>;
type CandidateRoom = Readonly<{ id: string; name: string; polygon: readonly Point[]; center: Point }>;

type CandidateDocuments = Readonly<{
    rooms: unknown;
    positions: unknown;
    doors: unknown;
    computers: unknown;
    interactiveObjects: unknown;
    walls: unknown;
    objects: unknown;
    walkPaths?: unknown;
}>;

type NativePath = Readonly<{ id: string; points: readonly Point[]; thickness: number; closed: boolean }>;

const MAX_ROUTE_POINTS = 160;
const MAX_EXPANDED_NODES = 1_024;
const MAX_WALK_NODES = 1_600;
const SAFE_REASON_LIMIT = 180;
const SPRITE_SHEET_COUNT = 16;
const DOOR_APERTURE_RADIUS = 96;
const AGENT_FOOTPRINT_RADIUS = 34;
const CONNECTOR_SEARCH_LIMIT = 18;
const CONNECTOR_MAX_DISTANCE = 420;
const CONNECTOR_INGRESS_DISTANCE = 180;
const WALK_SUPPORT_RADIUS = 260;
const WALK_SAMPLE_INTERVAL = 96;
const MAX_FRAME_DELTA_MS = 100;

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
    if (polygon.length < 3) return false;
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

function routeLength(pointsIn: readonly Point[]): number {
    return pointsIn.slice(1).reduce((acc, item, index) => acc + distance(pointsIn[index], item), 0);
}

function orientation(a: Point, b: Point, c: Point): number {
    const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
    if (Math.abs(value) < 1e-7) return 0;
    return Math.sign(value);
}

function onSegment(a: Point, b: Point, c: Point): boolean {
    return Math.min(a.x, c.x) - 1e-7 <= b.x && b.x <= Math.max(a.x, c.x) + 1e-7
        && Math.min(a.y, c.y) - 1e-7 <= b.y && b.y <= Math.max(a.y, c.y) + 1e-7;
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

function pointSegmentDistance(pointValue: Point, a: Point, b: Point): number {
    const lengthSquared = ((b.x - a.x) ** 2) + ((b.y - a.y) ** 2);
    if (lengthSquared === 0) return distance(pointValue, a);
    const t = Math.max(0, Math.min(1, ((pointValue.x - a.x) * (b.x - a.x) + (pointValue.y - a.y) * (b.y - a.y)) / lengthSquared));
    return distance(pointValue, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
}

function closestPointOnSegment(pointValue: Point, a: Point, b: Point): Point {
    const lengthSquared = ((b.x - a.x) ** 2) + ((b.y - a.y) ** 2);
    if (lengthSquared === 0) return a;
    const t = Math.max(0, Math.min(1, ((pointValue.x - a.x) * (b.x - a.x) + (pointValue.y - a.y) * (b.y - a.y)) / lengthSquared));
    return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
}

function segmentDistance(a: Point, b: Point, c: Point, d: Point): number {
    if (segmentsIntersect(a, b, c, d)) return 0;
    return Math.min(pointSegmentDistance(a, c, d), pointSegmentDistance(b, c, d), pointSegmentDistance(c, a, b), pointSegmentDistance(d, a, b));
}

function lineIntersectionPoint(a: Point, b: Point, c: Point, d: Point): Point | null {
    const denominator = (a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x);
    if (Math.abs(denominator) < 1e-7) return null;
    const x = ((a.x * b.y - a.y * b.x) * (c.x - d.x) - (a.x - b.x) * (c.x * d.y - c.y * d.x)) / denominator;
    const y = ((a.x * b.y - a.y * b.x) * (c.y - d.y) - (a.y - b.y) * (c.x * d.y - c.y * d.x)) / denominator;
    const pointValue = { x, y };
    return onSegment(a, pointValue, b) && onSegment(c, pointValue, d) ? pointValue : null;
}

function colliderIntersections(a: Point, b: Point, collider: CandidateCollider): Point[] {
    const hits: Point[] = [];
    if (collider.closed && (pointInPolygon(a, collider.points) || pointInPolygon(b, collider.points))) hits.push(a);
    const segmentCount = collider.closed ? collider.points.length : collider.points.length - 1;
    for (let i = 0; i < segmentCount; i += 1) {
        const c = collider.points[i];
        const d = collider.points[(i + 1) % collider.points.length];
        if (segmentDistance(a, b, c, d) <= collider.thickness / 2 + AGENT_FOOTPRINT_RADIUS) {
            hits.push(lineIntersectionPoint(a, b, c, d) ?? closestPointOnSegment(c, a, b));
        }
    }
    return hits;
}

function nativePathsFromRecord(source: UnknownRecord, context: string): NativePath[] {
    const native = record(source.nativeGeometry, `${context}.nativeGeometry`);
    const sourceId = text(source.id, context);
    const style = source.style && typeof source.style === 'object' ? record(source.style, `${context}.style`) : {};
    const rawWidth = typeof style.width === 'number' && Number.isFinite(style.width) ? style.width * 16 / 9 : 10;
    const thickness = Math.max(8, Math.min(96, rawWidth));
    if (native.kind === 'polygon') return [{ id: sourceId, points: points(native.points, `${context}.points`), thickness, closed: true }];
    if (native.kind === 'rectangle') {
        const rect = record(native.rect, `${context}.rect`);
        const x1 = finite(rect.x1, `${context}.rect.x1`);
        const x2 = finite(rect.x2, `${context}.rect.x2`);
        const y1 = finite(rect.y1, `${context}.rect.y1`);
        const y2 = finite(rect.y2, `${context}.rect.y2`);
        const rectPoints = [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }];
        rectPoints.forEach((item, index) => { if (!bounded(item)) throw new Error(`${context}.rect[${index}] is out of bounds.`); });
        return [{ id: sourceId, points: rectPoints, thickness, closed: true }];
    }
    if (native.kind === 'ink') {
        return array(native.paths, `${context}.paths`).map((pathValue, index) => {
            const pathPoints = points(pathValue, `${context}.paths[${index}]`).filter((item, pointIndex, all) => pointIndex === 0 || distance(item, all[pointIndex - 1]) > 0.001);
            if (pathPoints.length < 2) throw new Error(`${context}.paths[${index}] must contain at least two bounded points.`);
            const closed = pathPoints.length >= 3 && distance(pathPoints[0], pathPoints[pathPoints.length - 1]) <= Math.max(4, thickness);
            return { id: `${sourceId}:path:${String(index + 1).padStart(2, '0')}`, points: pathPoints, thickness, closed };
        });
    }
    return [];
}

function roomMembershipsForPoint(rooms: readonly CandidateRoom[], value: Point): readonly CandidateRoom[] {
    const containing = rooms.filter(room => pointInPolygon(value, room.polygon)).sort((a, b) => a.id.localeCompare(b.id));
    if (containing.length > 0) return containing;
    const nearest = [...rooms].sort((a, b) => distance(a.center, value) - distance(b.center, value) || a.id.localeCompare(b.id))[0];
    return nearest ? [nearest] : [{ id: 'candidate-zone-unresolved', name: 'Unresolved candidate zone', polygon: [], center: value }];
}

function primaryRoom(rooms: readonly CandidateRoom[], value: Point): CandidateRoom {
    return roomMembershipsForPoint(rooms, value)[0];
}

function membershipIds(rooms: readonly CandidateRoom[], value: Point): readonly string[] {
    return roomMembershipsForPoint(rooms, value).map(room => room.id);
}

function normalizeZone(value: string): string {
    return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function makeZoneResolver(rooms: readonly CandidateRoom[]) {
    const byName = new Map<string, CandidateRoom[]>();
    rooms.forEach(room => {
        const key = normalizeZone(room.name);
        byName.set(key, [...(byName.get(key) ?? []), room]);
    });
    const diagnostics: string[] = [];
    const resolve = (zoneName: string): string => {
        const key = normalizeZone(zoneName);
        const exact = byName.get(key) ?? [];
        if (exact.length === 1) return exact[0].id;
        if (exact.length > 1) {
            diagnostics.push(`Ambiguous room name "${zoneName}" maps to ${exact.map(room => room.id).join(', ')}.`);
            return `ambiguous:${key}`;
        }
        const partial = rooms.filter(room => key.includes(normalizeZone(room.name)) || normalizeZone(room.name).includes(key));
        if (partial.length === 1) return partial[0].id;
        if (partial.length > 1) {
            diagnostics.push(`Ambiguous door zone "${zoneName}" maps to ${partial.map(room => room.id).join(', ')}.`);
            return `ambiguous:${key}`;
        }
        diagnostics.push(`Door zone "${zoneName}" has no stable room ID mapping; retaining provisional zone ID.`);
        return `zone:${key || 'unresolved'}`;
    };
    return { resolve, diagnostics };
}

export function accessOutcome(door: CandidateDoorNode): CandidateAccessOutcome {
    if (door.malformedReason || !door.id || door.zoneIds.length < 2 || !door.accessMode || door.zoneIds.some(zone => zone.startsWith('ambiguous:'))) return 'malformed-door';
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

function destinationSort(a: CandidateDestination, b: CandidateDestination): number {
    const kindOrder: Record<CandidateDestinationKind, number> = { room: 0, computer: 1, 'interactive-object': 2, position: 3, waypoint: 4 };
    return kindOrder[a.kind] - kindOrder[b.kind]
        || (a.accessTier ?? '').localeCompare(b.accessTier ?? '')
        || a.label.localeCompare(b.label)
        || a.id.localeCompare(b.id);
}

export function buildCandidateNavigationGraph(documents: CandidateDocuments): CandidateNavigationGraph {
    const roomData = wrapperData(documents.rooms, 'rooms');
    const positionData = wrapperData(documents.positions, 'positions');
    const doorData = wrapperData(documents.doors, 'doors');
    const computerData = wrapperData(documents.computers, 'computers');
    const interactiveData = wrapperData(documents.interactiveObjects, 'interactive-objects');
    const wallData = wrapperData(documents.walls, 'walls');
    const objectData = wrapperData(documents.objects, 'objects');
    const walkPathData = documents.walkPaths ? wrapperData(documents.walkPaths, 'walk-paths') : { records: [] };

    const rooms: CandidateRoom[] = array(roomData.rooms, 'rooms').map((value, index) => {
        const item = record(value, `room[${index}]`);
        const polygon = points(item.pdfPolygon, `room[${index}].pdfPolygon`);
        return { id: text(item.id, `ROOM_${index + 1}`), name: text(item.canonicalName, `Room ${index + 1}`), polygon, center: centroid(polygon) };
    }).sort((a, b) => a.id.localeCompare(b.id));
    const zoneResolver = makeZoneResolver(rooms);

    const positions = array(positionData.positions, 'positions').map((value, index) => {
        const item = record(value, `position[${index}]`);
        const candidatePoint = point(item.pdfAnchor, `position[${index}].pdfAnchor`);
        const memberships = roomMembershipsForPoint(rooms, candidatePoint);
        const room = memberships[0];
        return { id: text(item.id, `POSITION_${String(index + 1).padStart(3, '0')}`), point: candidatePoint, tier: item.accessTier === 'priority' ? 'priority' as const : 'standard' as const, room, roomIds: memberships.map(itemRoom => itemRoom.id) };
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
        roomIds: item.roomIds,
        roomName: item.room.name,
        point: item.point,
        accessTier: item.tier,
        spriteAssetId: `agent-sheet-${String((index % SPRITE_SHEET_COUNT) + 1).padStart(2, '0')}`,
        provisionalSpriteAssignment: true,
    }));

    const positionDestinations = positions.map((item): CandidateDestination => ({ id: `position:${item.id}`, label: `${item.id} (${item.tier})`, kind: 'position', point: item.point, roomId: item.room.id, roomIds: item.roomIds, roomName: item.room.name, accessTier: item.tier }));
    const computerDestinations = array(computerData.records, 'computers.records').map((value, index): CandidateDestination | null => {
        const item = record(value, `computer[${index}]`);
        const native = nativePathsFromRecord(item, `computer[${index}]`)[0];
        if (!native) return null;
        const candidatePoint = centroid(native.points);
        const memberships = roomMembershipsForPoint(rooms, candidatePoint);
        const room = memberships[0];
        return { id: `computer:${text(item.id, `COMPUTER_${index + 1}`)}`, label: `Computer ${String(index + 1).padStart(3, '0')}`, kind: 'computer', point: candidatePoint, roomId: room.id, roomIds: memberships.map(itemRoom => itemRoom.id), roomName: room.name };
    }).filter((item): item is CandidateDestination => item !== null && bounded(item.point));
    const roomDestinations = rooms.map((room): CandidateDestination => ({ id: `room:${room.id}`, label: room.name, kind: 'room', point: room.center, roomId: room.id, roomIds: [room.id], roomName: room.name }));
    const interactiveDestinations = array(interactiveData.interactiveObjects, 'interactiveObjects').map((value, index): CandidateDestination => {
        const item = record(value, `interactive[${index}]`);
        const polygon = points(item.pdfPolygon, `interactive[${index}].pdfPolygon`);
        const candidatePoint = centroid(polygon);
        const memberships = roomMembershipsForPoint(rooms, candidatePoint);
        const room = memberships[0];
        return { id: `interactive:${text(item.id, `INTERACTIVE_${index + 1}`)}`, label: text(item.name, `Interactive object ${index + 1}`), kind: 'interactive-object', point: candidatePoint, roomId: room.id, roomIds: memberships.map(itemRoom => itemRoom.id), roomName: room.name };
    }).filter(item => bounded(item.point));

    const doors = array(doorData.doors, 'doors').map((value, index): CandidateDoorNode => {
        const item = record(value, `door[${index}]`);
        const facts = record(item.authoredFacts, `door[${index}].authoredFacts`);
        const polygon = points(item.pdfPolygon, `door[${index}].pdfPolygon`);
        const zones = [text(facts.zone_a, ''), text(facts.zone_b, '')].filter(Boolean);
        const zoneIds = zones.map(zoneResolver.resolve);
        return {
            id: text(item.id, `D${String(index + 1).padStart(2, '0')}`),
            point: centroid(polygon),
            zones,
            zoneIds,
            accessMode: text(item.csvAccessMode, text(facts.access_mode, '')),
            manualReviewRequired: item.manualReviewRequired === true || text(facts.manual_review_required, 'no') === 'yes',
            apertureRadius: DOOR_APERTURE_RADIUS,
            malformedReason: polygon.length < 3 || zoneIds.length < 2 ? 'Malformed doorway geometry or zone association.' : undefined,
        };
    }).sort((a, b) => a.id.localeCompare(b.id));

    const colliders: CandidateCollider[] = [];
    for (const [kind, data] of [['wall', wallData], ['object', objectData]] as const) {
        array(data.records, `${kind}.records`).forEach((value, index) => {
            const item = record(value, `${kind}[${index}]`);
            nativePathsFromRecord(item, `${kind}[${index}]`).forEach(path => {
                if (path.points.length >= 2) colliders.push({ id: `${kind}:${path.id}`, kind, points: path.points, closed: path.closed, thickness: path.thickness });
            });
        });
    }

    const walkNodes: CandidateWalkNode[] = [];
    const walkSegments: CandidateWalkSegment[] = [];
    array(walkPathData.records, 'walk-paths.records').forEach((value, index) => {
        const item = record(value, `walk-path[${index}]`);
        nativePathsFromRecord(item, `walk-path[${index}]`).forEach(path => {
            for (let segmentIndex = 1; segmentIndex < path.points.length && walkSegments.length < MAX_WALK_NODES * 4; segmentIndex += 1) {
                walkSegments.push({ id: `walk-segment:${path.id}:${String(segmentIndex).padStart(3, '0')}`, a: path.points[segmentIndex - 1], b: path.points[segmentIndex], pathId: path.id });
            }
            const step = Math.max(1, Math.ceil(path.points.length / 10));
            path.points.forEach((pathPoint, pointIndex) => {
                if ((pointIndex === 0 || pointIndex === path.points.length - 1 || pointIndex % step === 0) && walkNodes.length < MAX_WALK_NODES) {
                    const memberships = roomMembershipsForPoint(rooms, pathPoint);
                    const room = memberships[0];
                    walkNodes.push({ id: `walk:${path.id}:${String(pointIndex).padStart(3, '0')}`, point: pathPoint, roomId: room.id, roomIds: memberships.map(itemRoom => itemRoom.id), pathId: path.id });
                }
            });
        });
    });

    return {
        rooms,
        doors,
        agents,
        destinations: [...positionDestinations, ...computerDestinations, ...roomDestinations, ...interactiveDestinations].sort(destinationSort),
        colliders: colliders.sort((a, b) => a.id.localeCompare(b.id)),
        walkNodes: walkNodes.sort((a, b) => a.id.localeCompare(b.id)),
        walkSegments: walkSegments.sort((a, b) => a.id.localeCompare(b.id)),
        roomDiagnostics: zoneResolver.diagnostics,
        nodeCount: rooms.length + doors.length + positionDestinations.length + computerDestinations.length + interactiveDestinations.length + walkNodes.length,
        edgeCount: doors.length + walkSegments.length,
    };
}

function destinationById(graph: CandidateNavigationGraph, destinationId: string): CandidateDestination | null {
    return graph.destinations.find(destination => destination.id === destinationId) ?? null;
}

function routeFailure(status: CandidateRouteStatus, reason: string, failureCategory: string, expandedNodeCount = 0, crossedDoorIds: readonly string[] = []): CandidateRouteResult {
    return { status, reason: safeReason(reason), points: [], crossedDoorIds, nodeSequence: [], cost: 0, length: 0, expandedNodeCount, failureCategory };
}

function validatePoint(graph: CandidateNavigationGraph, value: Point, label: string): CandidateRouteResult | null {
    if (!bounded(value)) return routeFailure('malformed', `${label} is outside bounded Floor 1 candidate coordinates.`, 'bounds');
    const collider = graph.colliders.find(item => pointOverlapsColliderFootprint(value, item));
    if (collider) return routeFailure('blocked', `${label} footprint overlaps candidate ${collider.kind} collision geometry (${collider.id}).`, 'collision');
    return null;
}

function pointOverlapsColliderFootprint(pointValue: Point, collider: CandidateCollider): boolean {
    if (collider.closed && pointInPolygon(pointValue, collider.points)) return true;
    const segmentCount = collider.closed ? collider.points.length : collider.points.length - 1;
    for (let index = 0; index < segmentCount; index += 1) {
        const a = collider.points[index];
        const b = collider.points[(index + 1) % collider.points.length];
        if (pointSegmentDistance(pointValue, a, b) <= collider.thickness / 2 + AGENT_FOOTPRINT_RADIUS) return true;
    }
    return false;
}

function doorForHit(graph: CandidateNavigationGraph, pointValue: Point, crossedDoorIds: readonly string[]): CandidateDoorNode | null {
    return crossedDoorIds.map(id => graph.doors.find(door => door.id === id) ?? null)
        .find((door): door is CandidateDoorNode => door !== null && door.apertureRadius > AGENT_FOOTPRINT_RADIUS && distance(pointValue, door.point) <= door.apertureRadius - AGENT_FOOTPRINT_RADIUS) ?? null;
}

function isDoorAperturePoint(graph: CandidateNavigationGraph, pointValue: Point, crossedDoorIds: readonly string[]): boolean {
    return !!doorForHit(graph, pointValue, crossedDoorIds);
}

function isWalkSupported(graph: CandidateNavigationGraph, pointValue: Point): boolean {
    if (graph.walkSegments.length === 0 && graph.walkNodes.length === 0) return true;
    return graph.walkSegments.some(segment => pointSegmentDistance(pointValue, segment.a, segment.b) <= WALK_SUPPORT_RADIUS)
        || graph.walkNodes.some(node => distance(pointValue, node.point) <= WALK_SUPPORT_RADIUS);
}

type SegmentKind = 'start_connector' | 'walk_network' | 'doorway_transition' | 'destination_connector';

function segmentHasWalkSupport(graph: CandidateNavigationGraph, a: Point, b: Point, crossedDoorIds: readonly string[], kind: SegmentKind): boolean {
    if (graph.walkSegments.length === 0) return true;
    const length = distance(a, b);
    if ((kind === 'start_connector' || kind === 'destination_connector') && length > CONNECTOR_MAX_DISTANCE) return false;
    const sampleCount = Math.max(2, Math.ceil(length / WALK_SAMPLE_INTERVAL));
    let supportedSeen = false;
    for (let index = 0; index <= sampleCount; index += 1) {
        const ratio = index / sampleCount;
        const sample = { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio };
        if (isDoorAperturePoint(graph, sample, crossedDoorIds)) { supportedSeen = true; continue; }
        const supported = isWalkSupported(graph, sample);
        if (supported) { supportedSeen = true; continue; }
        if (kind === 'start_connector' && distance(sample, a) <= CONNECTOR_INGRESS_DISTANCE && !supportedSeen) continue;
        if (kind === 'destination_connector' && distance(sample, b) <= CONNECTOR_INGRESS_DISTANCE) continue;
        return false;
    }
    return kind === 'walk_network' || kind === 'doorway_transition' || supportedSeen;
}

function segmentKind(index: number, routePoints: readonly Point[], crossedDoorIds: readonly string[], graph: CandidateNavigationGraph): SegmentKind {
    const a = routePoints[index - 1];
    const b = routePoints[index];
    const nearDoor = crossedDoorIds.some(doorId => {
        const door = graph.doors.find(item => item.id === doorId);
        return door ? distance(a, door.point) <= door.apertureRadius || distance(b, door.point) <= door.apertureRadius : false;
    });
    if (nearDoor) return 'doorway_transition';
    if (index === 1) return 'start_connector';
    if (index === routePoints.length - 1) return 'destination_connector';
    return 'walk_network';
}

export function validateCandidateRouteSegments(graph: CandidateNavigationGraph, routePoints: readonly Point[], crossedDoorIds: readonly string[]): CandidateRouteResult | null {
    for (let index = 1; index < routePoints.length; index += 1) {
        const a = routePoints[index - 1];
        const b = routePoints[index];
        if (!bounded(a) || !bounded(b)) return routeFailure('malformed', 'Route includes out-of-bounds coordinates.', 'bounds', index, crossedDoorIds);
        const kind = segmentKind(index, routePoints, crossedDoorIds, graph);
        for (const collider of graph.colliders) {
            const hits = colliderIntersections(a, b, collider);
            if (hits.length === 0) continue;
            if (collider.kind === 'object') return routeFailure('blocked', `Route segment intersects candidate object collision geometry (${collider.id}).`, 'collision', index, crossedDoorIds);
            const invalidWallHit = hits.find(hit => !doorForHit(graph, hit, crossedDoorIds));
            if (invalidWallHit) return routeFailure('blocked', `Route segment intersects candidate wall collision geometry outside a validated doorway aperture (${collider.id}).`, 'collision', index, crossedDoorIds);
            const uniqueDoors = new Set(hits.map(hit => doorForHit(graph, hit, crossedDoorIds)?.id).filter(Boolean));
            if (uniqueDoors.size > 1) return routeFailure('blocked', 'Route segment crosses multiple wall apertures without intermediate doorway nodes.', 'door-aperture', index, crossedDoorIds);
        }
        if (!segmentHasWalkSupport(graph, a, b, crossedDoorIds, kind)) {
            const category = kind === 'start_connector' ? 'start_connector_unsupported'
                : kind === 'destination_connector' ? 'destination_connector_unsupported'
                    : 'route_leaves_walkable_geometry';
            return routeFailure('blocked', `Route ${kind.replace(/_/g, ' ')} leaves candidate walk-path geometry.`, category, index, crossedDoorIds);
        }
    }
    return null;
}

function nearestWalkPoint(graph: CandidateNavigationGraph, source: Point, roomIds: readonly string[]): Point | null {
    const roomSet = new Set(roomIds);
    const candidates = graph.walkNodes
        .filter(node => node.roomIds.some(roomId => roomSet.has(roomId)))
        .sort((a, b) => distance(a.point, source) - distance(b.point, source) || a.id.localeCompare(b.id))
        .slice(0, CONNECTOR_SEARCH_LIMIT);
    return candidates.find(node => distance(node.point, source) <= CONNECTOR_MAX_DISTANCE)?.point ?? null;
}

function buildTopology(graph: CandidateNavigationGraph) {
    const adjacency = new Map<string, Array<{ to: string; door: CandidateDoorNode }>>();
    const denied: CandidateDoorNode[] = [];
    for (const door of graph.doors) {
        const outcome = accessOutcome(door);
        if (outcome !== 'allowed') { denied.push(door); continue; }
        const [a, b] = door.zoneIds;
        if (!a || !b) continue;
        adjacency.set(a, [...(adjacency.get(a) ?? []), { to: b, door }]);
        adjacency.set(b, [...(adjacency.get(b) ?? []), { to: a, door }]);
    }
    adjacency.forEach(edges => edges.sort((a, b) => a.door.id.localeCompare(b.door.id) || a.to.localeCompare(b.to)));
    return { adjacency, denied };
}

function findDoorPath(graph: CandidateNavigationGraph, startRoomIds: readonly string[], destRoomIds: readonly string[]) {
    const { adjacency, denied } = buildTopology(graph);
    const destSet = new Set(destRoomIds);
    const queue: Array<{ roomId: string; path: CandidateDoorNode[]; nodes: string[] }> = startRoomIds.map(roomId => ({ roomId, path: [], nodes: [roomId] }));
    const visited = new Set(startRoomIds);
    let expanded = 0;
    while (queue.length > 0 && expanded < MAX_EXPANDED_NODES) {
        const current = queue.shift();
        if (!current) break;
        expanded += 1;
        if (destSet.has(current.roomId)) return { path: current.path, nodes: current.nodes, expanded, denied };
        for (const edge of adjacency.get(current.roomId) ?? []) {
            if (visited.has(edge.to)) continue;
            visited.add(edge.to);
            queue.push({ roomId: edge.to, path: [...current.path, edge.door], nodes: [...current.nodes, edge.to] });
        }
    }
    return { path: null, nodes: [] as string[], expanded, denied };
}

function roomName(graph: CandidateNavigationGraph, roomId: string): string {
    return graph.rooms.find(room => room.id === roomId)?.name ?? roomId.replace(/^zone:/, '');
}

export function planCandidateRoute(graph: CandidateNavigationGraph, start: Point, destinationId: string): CandidateRouteResult {
    const startValidation = validatePoint(graph, start, 'Route start');
    if (startValidation) return startValidation;
    const destination = destinationById(graph, destinationId);
    if (!destination) return routeFailure('malformed', 'Destination could not be resolved to a candidate review point.', 'destination');
    const destinationValidation = validatePoint(graph, destination.point, 'Route destination');
    if (destinationValidation) return destinationValidation;

    const startRooms = roomMembershipsForPoint(graph.rooms, start);
    const startRoomIds = startRooms.map(room => room.id);
    const destRoomIds = destination.roomIds.length > 0 ? destination.roomIds : membershipIds(graph.rooms, destination.point);
    const destRoom = graph.rooms.find(room => room.id === destination.roomId) ?? graph.rooms.find(room => room.id === destRoomIds[0]) ?? primaryRoom(graph.rooms, destination.point);
    const crossedDoorIds: string[] = [];
    const pointsOut: Point[] = [start];
    const nodeSequence = [`point:start`, ...startRoomIds];
    const startWalk = nearestWalkPoint(graph, start, startRoomIds);
    if (startWalk && distance(startWalk, start) > 1) pointsOut.push(startWalk);

    const doorSearch = findDoorPath(graph, startRoomIds, destRoomIds);
    const overlappingMembership = startRoomIds.some(roomId => destRoomIds.includes(roomId));
    if (!overlappingMembership) {
        if (!doorSearch.path) {
            const relevantDenied = doorSearch.denied.find(door => door.zoneIds.some(roomId => startRoomIds.includes(roomId)) || door.zoneIds.some(roomId => destRoomIds.includes(roomId)));
            if (relevantDenied) {
                const outcome = accessOutcome(relevantDenied);
                return routeFailure(outcome === 'restricted' ? 'restricted' : 'blocked', `${relevantDenied.id} is ${outcome}; candidate search continued but no allowed alternate route reached ${roomName(graph, destRoomIds[0] ?? destRoom.id)}.`, outcome, doorSearch.expanded, [relevantDenied.id]);
            }
            return routeFailure('unreachable', `No allowed candidate door path connects ${roomName(graph, startRoomIds[0] ?? 'unresolved')} to ${roomName(graph, destRoomIds[0] ?? destRoom.id)}.`, 'disconnected', doorSearch.expanded);
        }
        for (const door of doorSearch.path) {
            if (door.apertureRadius <= AGENT_FOOTPRINT_RADIUS) {
                return routeFailure('blocked', `${door.id} doorway aperture cannot fit the candidate agent footprint.`, 'collision', doorSearch.expanded, [door.id]);
            }
            pointsOut.push(door.point);
            crossedDoorIds.push(door.id);
            nodeSequence.push(`door:${door.id}`);
            if (pointsOut.length > MAX_ROUTE_POINTS) return routeFailure('malformed', 'Route exceeded the candidate route point limit.', 'limits', doorSearch.expanded, crossedDoorIds);
        }
    }

    const destWalk = nearestWalkPoint(graph, destination.point, destRoomIds);
    if (destWalk && distance(destWalk, destination.point) > 1) pointsOut.push(destWalk);
    pointsOut.push(destination.point);
    nodeSequence.push(...destRoomIds, `destination:${destination.id}`);

    const compact = pointsOut.filter((item, index, all) => index === 0 || distance(item, all[index - 1]) > 0.001);
    const segmentFailure = validateCandidateRouteSegments(graph, compact, crossedDoorIds);
    if (segmentFailure) return { ...segmentFailure, expandedNodeCount: Math.max(segmentFailure.expandedNodeCount, doorSearch.expanded) };
    const length = routeLength(compact);
    return {
        status: 'valid',
        reason: crossedDoorIds.length > 0 ? `Candidate route allowed through ${crossedDoorIds.join(', ')}.` : 'Candidate same-room route is valid.',
        points: compact,
        crossedDoorIds,
        nodeSequence,
        cost: Math.round(length),
        length: Math.round(length),
        expandedNodeCount: doorSearch.expanded,
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

export function advanceCandidateAgents<T extends { status: string; route: CandidateRouteResult | null; progress: number; point: Point }>(
    agents: readonly T[],
    deltaMs: number,
    speedPxPerSecond: number,
): readonly T[] {
    const clampedDelta = Math.min(MAX_FRAME_DELTA_MS, Math.max(0, deltaMs));
    if (clampedDelta === 0 || agents.every(agent => agent.status !== 'walking')) return agents;
    let changed = false;
    const next = agents.map(agent => {
        if (agent.status !== 'walking' || !agent.route || agent.route.status !== 'valid') return agent;
        const length = routeLength(agent.route.points);
        const nextProgress = Math.min(length, agent.progress + (speedPxPerSecond * clampedDelta) / 1000);
        const nextAgent = {
            ...agent,
            point: interpolateRoute(agent.route.points, nextProgress),
            progress: nextProgress,
            status: nextProgress >= length ? 'arrived' : 'walking',
        };
        changed = true;
        return nextAgent as T;
    });
    return changed ? next : agents;
}
