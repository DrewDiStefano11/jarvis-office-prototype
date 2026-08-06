import { OFFICE_SOURCE_HEIGHT, OFFICE_SOURCE_WIDTH } from '../../constants';
import type { Point } from '../../types';
import {
    AGENT_FOOTPRINT_RADIUS,
    candidatePointHasStaticClearance,
    pointInPolygon,
    type CandidateDoorNode,
    type CandidateDoorStep,
    type CandidateNavigationGraph,
} from './candidateNavigation';

export const FLOOR1_NAVIGATION_SCHEMA_VERSION = 1;
export const FLOOR1_NAVIGATION_BASE_SPACING = 48;
export const FLOOR1_NAVIGATION_SEGMENT_SAMPLE_SPACING = 16;
export const FLOOR1_NAVIGATION_PREFERRED_CLEARANCE = 18;
export const FLOOR1_WALK_PATH_POSITIVE_RADIUS = 96;

export type NavigationDoorClassification = 'interior' | 'exterior' | 'malformed';

export type ContinuousNavigationConfig = Readonly<{
    spacing: number;
    segmentSampleSpacing: number;
    footprintRadius: number;
    preferredClearance: number;
    maximumDoorEndpointDistance: number;
}>;

export type ContinuousNavigationCell = Readonly<{
    id: string;
    point: Point;
    roomIds: readonly string[];
    provenance: 'clearance-lattice';
}>;

export type ContinuousNavigationEdge = Readonly<{
    to: string;
    distance: number;
    doorId?: string;
}>;

export type ContinuousNavigationDoorLink = Readonly<{
    doorId: string;
    classification: NavigationDoorClassification;
    sourcePoint: Point;
    thresholdPoint: Point;
    approachCellId: string | null;
    exitCellId: string | null;
    connectedRoomIds: readonly string[];
    provenance: 'registered-door' | 'image-guided-d46-repair' | 'exterior-authority' | 'malformed';
    reason: string;
}>;

export type ContinuousNavigationIssue = Readonly<{
    code: string;
    entityId: string;
    message: string;
}>;

export type ContinuousNavigationField = Readonly<{
    schemaVersion: 1;
    navigationRevision: string;
    sourceGeometryRevision: string;
    config: ContinuousNavigationConfig;
    graph: CandidateNavigationGraph;
    cells: readonly ContinuousNavigationCell[];
    cellById: ReadonlyMap<string, ContinuousNavigationCell>;
    adjacency: ReadonlyMap<string, readonly ContinuousNavigationEdge[]>;
    componentByCellId: ReadonlyMap<string, number>;
    componentSizes: readonly number[];
    interiorComponentId: number;
    excludedComponents: readonly Readonly<{ componentId: number; size: number; classification: 'exterior-isolated' | 'collision-enclosed'; roomIds: readonly string[]; reason: string }>[];
    doorLinks: readonly ContinuousNavigationDoorLink[];
    issues: readonly ContinuousNavigationIssue[];
    buildDurationMs: number;
}>;

export type NavigationProjectionReason = 'exact-valid' | 'obstacle-clearance' | 'wall-side' | 'door-threshold' | 'nearest-valid' | 'outside-office' | 'exterior-isolated' | 'disconnected-pocket';

export type ContinuousNavigationProjection = Readonly<{
    status: 'accepted' | 'rejected';
    requestId: string;
    navigationRevision: string;
    requestedPoint: Point;
    acceptedPoint: Point | null;
    distance: number;
    requestedRoomIds: readonly string[];
    acceptedRoomIds: readonly string[];
    sameWallSide: boolean;
    exact: boolean;
    reason: NavigationProjectionReason;
}>;

export type ContinuousNavigationRouteMetrics = Readonly<{
    totalDistance: number;
    rawDistance: number;
    turnCount: number;
    turnAngleSumDegrees: number;
    doorCount: number;
    expandedCellCount: number;
    smoothingReductionPercentage: number;
    projectionDurationMs: number;
    searchDurationMs: number;
    smoothingDurationMs: number;
}>;

export type ContinuousNavigationRoute = Readonly<{
    status: 'valid' | 'rejected';
    requestId: string;
    navigationRevision: string;
    reason: string;
    requestedStart: Point;
    recoveredStart: Point;
    requestedDestination: Point;
    projectedDestination: Point;
    startRecovery: ContinuousNavigationProjection;
    destinationProjection: ContinuousNavigationProjection;
    rawPoints: readonly Point[];
    points: readonly Point[];
    cellSequence: readonly string[];
    crossedDoorIds: readonly string[];
    doorSteps: readonly CandidateDoorStep[];
    metrics: ContinuousNavigationRouteMetrics;
}>;

export class BoundedNavigationCache<Value> {
    private readonly values = new Map<string, Value>();

    constructor(readonly maximumSize = 256) {
        if (!Number.isInteger(maximumSize) || maximumSize < 1) throw new Error('Navigation cache maximumSize must be a positive integer.');
    }

    get size(): number {
        return this.values.size;
    }

    get(key: string): Value | undefined {
        const value = this.values.get(key);
        if (value === undefined) return undefined;
        this.values.delete(key);
        this.values.set(key, value);
        return value;
    }

    set(key: string, value: Value): void {
        this.values.delete(key);
        this.values.set(key, value);
        while (this.values.size > this.maximumSize) this.values.delete(this.values.keys().next().value!);
    }

    clear(): void {
        this.values.clear();
    }
}

const DEFAULT_CONFIG: ContinuousNavigationConfig = {
    spacing: FLOOR1_NAVIGATION_BASE_SPACING,
    segmentSampleSpacing: FLOOR1_NAVIGATION_SEGMENT_SAMPLE_SPACING,
    footprintRadius: AGENT_FOOTPRINT_RADIUS,
    preferredClearance: FLOOR1_NAVIGATION_PREFERRED_CLEARANCE,
    maximumDoorEndpointDistance: 960,
};

const EXTERIOR_ZONE_PATTERN = /(?:exterior|future floor|service boundary|restricted\/future|central elevator$|upper-(?:left|right) restricted)/i;
const D46_REPAIRED_THRESHOLD: Point = { x: 7510, y: 2708 };

function now(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function finitePoint(point: Point): boolean {
    return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function bounded(point: Point): boolean {
    return finitePoint(point) && point.x >= 0 && point.y >= 0 && point.x <= OFFICE_SOURCE_WIDTH && point.y <= OFFICE_SOURCE_HEIGHT;
}

function distance(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointSegmentDistance(point: Point, a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const denominator = dx * dx + dy * dy;
    const ratio = denominator <= 1e-9 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / denominator));
    return distance(point, { x: a.x + dx * ratio, y: a.y + dy * ratio });
}

function pointKey(point: Point): string {
    return `${point.x.toFixed(3)},${point.y.toFixed(3)}`;
}

function latticeCellId(column: number, row: number): string {
    return `cell:${String(column).padStart(3, '0')}:${String(row).padStart(3, '0')}`;
}

function roomIdsAtPoint(graph: CandidateNavigationGraph, point: Point): string[] {
    return graph.rooms.filter(room => pointInPolygon(point, room.polygon)).map(room => room.id).sort((a, b) => a.localeCompare(b));
}

const WALK_POSITIVE_BUCKET_SIZE = 256;
const WALK_POSITIVE_INDEX = new WeakMap<object, ReadonlyMap<string, readonly Readonly<{ a: Point; b: Point }>[]>>();

function walkPositiveIndex(graph: CandidateNavigationGraph): ReadonlyMap<string, readonly Readonly<{ a: Point; b: Point }>[]> {
    const cached = WALK_POSITIVE_INDEX.get(graph);
    if (cached) return cached;
    const mutable = new Map<string, Array<Readonly<{ a: Point; b: Point }>>>();
    const entries = [
        ...graph.walkSegments.map(segment => ({ a: segment.a, b: segment.b })),
        ...graph.walkNodes.map(node => ({ a: node.point, b: node.point })),
    ];
    for (const entry of entries) {
        const minColumn = Math.floor((Math.min(entry.a.x, entry.b.x) - FLOOR1_WALK_PATH_POSITIVE_RADIUS) / WALK_POSITIVE_BUCKET_SIZE);
        const maxColumn = Math.floor((Math.max(entry.a.x, entry.b.x) + FLOOR1_WALK_PATH_POSITIVE_RADIUS) / WALK_POSITIVE_BUCKET_SIZE);
        const minRow = Math.floor((Math.min(entry.a.y, entry.b.y) - FLOOR1_WALK_PATH_POSITIVE_RADIUS) / WALK_POSITIVE_BUCKET_SIZE);
        const maxRow = Math.floor((Math.max(entry.a.y, entry.b.y) + FLOOR1_WALK_PATH_POSITIVE_RADIUS) / WALK_POSITIVE_BUCKET_SIZE);
        for (let row = minRow; row <= maxRow; row += 1) {
            for (let column = minColumn; column <= maxColumn; column += 1) {
                const key = `${column}:${row}`;
                mutable.set(key, [...(mutable.get(key) ?? []), entry]);
            }
        }
    }
    WALK_POSITIVE_INDEX.set(graph, mutable);
    return mutable;
}

function isPositiveFloorSpace(graph: CandidateNavigationGraph, point: Point): boolean {
    if (roomIdsAtPoint(graph, point).length > 0) return true;
    const key = `${Math.floor(point.x / WALK_POSITIVE_BUCKET_SIZE)}:${Math.floor(point.y / WALK_POSITIVE_BUCKET_SIZE)}`;
    return (walkPositiveIndex(graph).get(key) ?? []).some(entry => pointSegmentDistance(point, entry.a, entry.b) <= FLOOR1_WALK_PATH_POSITIVE_RADIUS);
}

function pointValid(graph: CandidateNavigationGraph, point: Point): boolean {
    return bounded(point) && isPositiveFloorSpace(graph, point) && candidatePointHasStaticClearance(graph, point);
}

export function continuousNavigationPointIsValid(field: ContinuousNavigationField, point: Point): boolean {
    if (!pointValid(field.graph, point)) return false;
    const centerColumn = Math.round(point.x / field.config.spacing);
    const centerRow = Math.round(point.y / field.config.spacing);
    for (let rowOffset = -4; rowOffset <= 4; rowOffset += 1) {
        for (let columnOffset = -4; columnOffset <= 4; columnOffset += 1) {
            const cell = field.cellById.get(latticeCellId(centerColumn + columnOffset, centerRow + rowOffset));
            if (!cell || field.componentByCellId.get(cell.id) !== field.interiorComponentId) continue;
            if (distance(point, cell.point) <= field.config.spacing * 4
                && segmentValid(field.graph, point, cell.point, field.config.segmentSampleSpacing)) return true;
        }
    }
    return false;
}

function segmentValid(graph: CandidateNavigationGraph, a: Point, b: Point, sampleSpacing: number): boolean {
    if (!pointValid(graph, a) || !pointValid(graph, b)) return false;
    const length = distance(a, b);
    const samples = Math.max(1, Math.ceil(length / sampleSpacing));
    for (let index = 1; index < samples; index += 1) {
        const ratio = index / samples;
        if (!pointValid(graph, { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio })) return false;
    }
    return true;
}

export function continuousNavigationSegmentIsValid(field: ContinuousNavigationField, a: Point, b: Point): boolean {
    return segmentValid(field.graph, a, b, field.config.segmentSampleSpacing);
}

function polygonArea(points: readonly Point[]): number {
    let area = 0;
    for (let index = 0; index < points.length; index += 1) {
        const a = points[index];
        const b = points[(index + 1) % points.length];
        area += a.x * b.y - b.x * a.y;
    }
    return area / 2;
}

function geometryIssues(graph: CandidateNavigationGraph): ContinuousNavigationIssue[] {
    const issues: ContinuousNavigationIssue[] = [];
    const ids = new Set<string>();
    const checkId = (id: string, kind: string) => {
        if (ids.has(`${kind}:${id}`)) issues.push({ code: 'duplicate-id', entityId: id, message: `Duplicate ${kind} ID.` });
        ids.add(`${kind}:${id}`);
    };
    for (const room of graph.rooms) {
        checkId(room.id, 'room');
        if (room.polygon.length < 3 || room.polygon.some(point => !finitePoint(point))) issues.push({ code: 'malformed-room', entityId: room.id, message: 'Room polygon is missing finite vertices.' });
        else if (Math.abs(polygonArea(room.polygon)) < 1) issues.push({ code: 'zero-area-room', entityId: room.id, message: 'Room polygon has zero area.' });
        else if (room.polygon.some(point => !bounded(point))) issues.push({ code: 'geometry-outside-source', entityId: room.id, message: 'Finite candidate room geometry extends outside the source image and remains registration-review evidence.' });
        if (new Set(room.polygon.map(pointKey)).size !== room.polygon.length) issues.push({ code: 'duplicate-room-vertex', entityId: room.id, message: 'Room polygon contains duplicate vertices.' });
    }
    for (const collider of graph.colliders) {
        checkId(collider.id, 'collider');
        if (collider.points.length < 2 || collider.points.some(point => !finitePoint(point)) || !Number.isFinite(collider.thickness) || collider.thickness <= 0) {
            issues.push({ code: 'malformed-collider', entityId: collider.id, message: 'Collider has non-finite points or invalid thickness.' });
        } else if (collider.points.some(point => !bounded(point))) {
            issues.push({ code: 'geometry-outside-source', entityId: collider.id, message: 'Finite candidate collider geometry extends outside the source image and remains registration-review evidence.' });
        }
    }
    for (const door of graph.doors) {
        checkId(door.id, 'door');
        if (!finitePoint(door.point) || door.apertureRadius <= AGENT_FOOTPRINT_RADIUS) issues.push({ code: 'malformed-door', entityId: door.id, message: 'Door point or aperture is invalid.' });
        else if (!bounded(door.point)) issues.push({ code: 'geometry-outside-source', entityId: door.id, message: 'Finite candidate door geometry extends outside the source image and remains registration-review evidence.' });
    }
    return issues;
}

function stableHash(value: string): string {
    let hash = 0x811c9dc5;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
}

function sourceRevision(graph: CandidateNavigationGraph, config: ContinuousNavigationConfig): string {
    const canonical = JSON.stringify({
        schema: FLOOR1_NAVIGATION_SCHEMA_VERSION,
        config,
        walkPathPositiveRadius: FLOOR1_WALK_PATH_POSITIVE_RADIUS,
        rooms: graph.rooms.map(room => [room.id, room.polygon]),
        colliders: graph.colliders.map(collider => [collider.id, collider.kind, collider.closed, collider.thickness, collider.points]),
        doors: graph.doors.map(door => [door.id, door.point, door.zones, door.zoneIds, door.accessMode]),
        walkSegments: graph.walkSegments.map(segment => [segment.id, segment.a, segment.b, segment.pathId]),
    });
    return `floor1-${stableHash(canonical)}`;
}

function addEdge(mutable: Map<string, ContinuousNavigationEdge[]>, from: string, edge: ContinuousNavigationEdge): void {
    const existing = mutable.get(from) ?? [];
    if (!existing.some(candidate => candidate.to === edge.to && candidate.doorId === edge.doorId)) mutable.set(from, [...existing, edge]);
}

function removeOrdinaryEdge(mutable: Map<string, ContinuousNavigationEdge[]>, from: string, to: string): void {
    const existing = mutable.get(from);
    if (!existing) return;
    mutable.set(from, existing.filter(edge => edge.to !== to || Boolean(edge.doorId)));
}

function segmentCrossesDoorPortal(
    a: Point,
    b: Point,
    approach: Point,
    exit: Point,
    apertureRadius: number,
): boolean {
    const normalX = exit.x - approach.x;
    const normalY = exit.y - approach.y;
    const normalLength = Math.hypot(normalX, normalY);
    if (normalLength < 0.001) return false;
    const nx = normalX / normalLength;
    const ny = normalY / normalLength;
    const portalCenter = { x: (approach.x + exit.x) / 2, y: (approach.y + exit.y) / 2 };
    const signedA = (a.x - portalCenter.x) * nx + (a.y - portalCenter.y) * ny;
    const signedB = (b.x - portalCenter.x) * nx + (b.y - portalCenter.y) * ny;
    if (signedA * signedB > 0 || Math.abs(signedA - signedB) < 0.001) return false;
    const interpolation = signedA / (signedA - signedB);
    if (interpolation < 0 || interpolation > 1) return false;
    const crossing = { x: a.x + (b.x - a.x) * interpolation, y: a.y + (b.y - a.y) * interpolation };
    const tangentDistance = Math.abs((crossing.x - portalCenter.x) * -ny + (crossing.y - portalCenter.y) * nx);
    return tangentDistance <= apertureRadius;
}

function classifyDoor(door: CandidateDoorNode): NavigationDoorClassification {
    if (door.id === 'D47' || door.accessMode === 'elevator') return 'exterior';
    if (door.zones.some(zone => EXTERIOR_ZONE_PATTERN.test(zone))) return 'exterior';
    if (!finitePoint(door.point) || door.zones.length < 2) return 'malformed';
    return 'interior';
}

function ordinaryTransitionAllowed(graph: CandidateNavigationGraph, aRoomIds: readonly string[], bRoomIds: readonly string[]): boolean {
    if (aRoomIds.length === 0 || bRoomIds.length === 0 || aRoomIds.some(roomId => bRoomIds.includes(roomId))) return true;
    return !graph.doors.some(door => classifyDoor(door) === 'interior'
        && door.zoneIds.some(roomId => aRoomIds.includes(roomId))
        && door.zoneIds.some(roomId => bRoomIds.includes(roomId)));
}

function repairedDoorPoint(door: CandidateDoorNode): Readonly<{ point: Point; provenance: ContinuousNavigationDoorLink['provenance']; reason: string }> {
    if (door.id !== 'D46') return { point: door.point, provenance: 'registered-door', reason: 'Registered candidate door threshold retained.' };
    return {
        point: D46_REPAIRED_THRESHOLD,
        provenance: 'image-guided-d46-repair',
        reason: 'Registered D46 lands on a red wall console. Clean-image inspection places the Focus D west entrance at the brown door between Focus D and RM10 circulation.',
    };
}

function endpointCandidates(cells: readonly ContinuousNavigationCell[], threshold: Point, maximumDistance: number): ContinuousNavigationCell[] {
    return cells.filter(cell => distance(cell.point, threshold) <= maximumDistance)
        .sort((a, b) => distance(a.point, threshold) - distance(b.point, threshold) || a.id.localeCompare(b.id));
}

function chooseDoorEndpoints(
    door: CandidateDoorNode,
    threshold: Point,
    cells: readonly ContinuousNavigationCell[],
    maximumDistance: number,
): readonly [ContinuousNavigationCell, ContinuousNavigationCell] | null {
    const candidates = endpointCandidates(cells, threshold, maximumDistance);
    if (candidates.length < 2) return null;
    const resolvedZones = door.zoneIds.filter(zoneId => cells.some(cell => cell.roomIds.includes(zoneId)));
    const first = resolvedZones.length > 0
        ? candidates.find(cell => cell.roomIds.includes(resolvedZones[0]))
        : candidates[0];
    if (!first) return null;
    const firstVector = { x: first.point.x - threshold.x, y: first.point.y - threshold.y };
    const secondResolvedZone = resolvedZones.find(zoneId => !first.roomIds.includes(zoneId));
    const second = candidates.find(cell => {
        if (cell.id === first.id) return false;
        if (secondResolvedZone && !cell.roomIds.includes(secondResolvedZone)) return false;
        if (!secondResolvedZone && cell.roomIds.some(roomId => first.roomIds.includes(roomId))) return false;
        const vector = { x: cell.point.x - threshold.x, y: cell.point.y - threshold.y };
        return firstVector.x * vector.x + firstVector.y * vector.y < 0;
    }) ?? candidates.find(cell => cell.id !== first.id
        && !cell.roomIds.some(roomId => first.roomIds.includes(roomId)))
        ?? candidates.find(cell => cell.id !== first.id && distance(cell.point, first.point) >= AGENT_FOOTPRINT_RADIUS * 2);
    return second ? [first, second] : null;
}

function computeComponents(cells: readonly ContinuousNavigationCell[], adjacency: ReadonlyMap<string, readonly ContinuousNavigationEdge[]>) {
    const componentByCellId = new Map<string, number>();
    const componentSizes: number[] = [];
    for (const cell of cells) {
        if (componentByCellId.has(cell.id)) continue;
        const componentId = componentSizes.length;
        const queue = [cell.id];
        componentByCellId.set(cell.id, componentId);
        for (let cursor = 0; cursor < queue.length; cursor += 1) {
            for (const edge of adjacency.get(queue[cursor]) ?? []) {
                if (componentByCellId.has(edge.to)) continue;
                componentByCellId.set(edge.to, componentId);
                queue.push(edge.to);
            }
        }
        componentSizes.push(queue.length);
    }
    return { componentByCellId, componentSizes };
}

export function buildContinuousNavigationField(
    graph: CandidateNavigationGraph,
    configOverrides: Partial<ContinuousNavigationConfig> = {},
): ContinuousNavigationField {
    const started = now();
    const config = { ...DEFAULT_CONFIG, ...configOverrides };
    const issues = geometryIssues(graph);
    if (!Number.isFinite(config.spacing) || config.spacing < config.footprintRadius) {
        issues.push({ code: 'invalid-config', entityId: 'navigation', message: 'Navigation spacing must be finite and at least the footprint radius.' });
    }
    const cells: ContinuousNavigationCell[] = [];
    const byGridKey = new Map<string, ContinuousNavigationCell>();
    const columns = Math.floor(OFFICE_SOURCE_WIDTH / config.spacing);
    const rows = Math.floor(OFFICE_SOURCE_HEIGHT / config.spacing);
    for (let row = 0; row <= rows; row += 1) {
        for (let column = 0; column <= columns; column += 1) {
            const point = { x: Math.min(OFFICE_SOURCE_WIDTH, column * config.spacing), y: Math.min(OFFICE_SOURCE_HEIGHT, row * config.spacing) };
            const roomIds = roomIdsAtPoint(graph, point);
            if (!isPositiveFloorSpace(graph, point) || !candidatePointHasStaticClearance(graph, point)) continue;
            const cell = { id: latticeCellId(column, row), point, roomIds, provenance: 'clearance-lattice' as const };
            cells.push(cell);
            byGridKey.set(`${column},${row}`, cell);
        }
    }
    cells.sort((a, b) => a.id.localeCompare(b.id));
    const cellById = new Map(cells.map(cell => [cell.id, cell]));
    const mutableAdjacency = new Map<string, ContinuousNavigationEdge[]>();
    const offsets = [[1, 0], [0, 1], [1, 1], [-1, 1]] as const;
    for (let row = 0; row <= rows; row += 1) {
        for (let column = 0; column <= columns; column += 1) {
            const cell = byGridKey.get(`${column},${row}`);
            if (!cell) continue;
            for (const [dx, dy] of offsets) {
                const neighbor = byGridKey.get(`${column + dx},${row + dy}`);
                if (!neighbor) continue;
                if (!ordinaryTransitionAllowed(graph, cell.roomIds, neighbor.roomIds)) continue;
                if (dx !== 0 && dy !== 0 && (!byGridKey.has(`${column + dx},${row}`) || !byGridKey.has(`${column},${row + dy}`))) continue;
                if (!segmentValid(graph, cell.point, neighbor.point, config.segmentSampleSpacing)) continue;
                const edgeDistance = distance(cell.point, neighbor.point);
                addEdge(mutableAdjacency, cell.id, { to: neighbor.id, distance: edgeDistance });
                addEdge(mutableAdjacency, neighbor.id, { to: cell.id, distance: edgeDistance });
            }
        }
    }

    const doorLinks: ContinuousNavigationDoorLink[] = [];
    for (const door of graph.doors.slice().sort((a, b) => a.id.localeCompare(b.id))) {
        const classification = classifyDoor(door);
        const repair = repairedDoorPoint(door);
        if (classification === 'exterior') {
            doorLinks.push({ doorId: door.id, classification, sourcePoint: door.point, thresholdPoint: repair.point, approachCellId: null, exitCellId: null, connectedRoomIds: [], provenance: 'exterior-authority', reason: 'Door leads to an unmodeled exterior/future/elevator destination.' });
            continue;
        }
        if (classification === 'malformed') {
            doorLinks.push({ doorId: door.id, classification, sourcePoint: door.point, thresholdPoint: repair.point, approachCellId: null, exitCellId: null, connectedRoomIds: [], provenance: 'malformed', reason: 'Door metadata is malformed.' });
            issues.push({ code: 'malformed-door-link', entityId: door.id, message: 'Door metadata cannot create a navigation link.' });
            continue;
        }
        const endpoints = chooseDoorEndpoints(door, repair.point, cells, config.maximumDoorEndpointDistance);
        if (!endpoints) {
            doorLinks.push({ doorId: door.id, classification: 'malformed', sourcePoint: door.point, thresholdPoint: repair.point, approachCellId: null, exitCellId: null, connectedRoomIds: [], provenance: repair.provenance, reason: 'No collision-clear cells were found on both sides of the doorway.' });
            issues.push({ code: 'door-endpoints-missing', entityId: door.id, message: 'Interior door has no collision-clear bidirectional endpoint pair.' });
            continue;
        }
        const [approach, exit] = endpoints;
        if (door.id === 'D46') {
            for (const [from, edges] of mutableAdjacency) {
                const fromCell = cellById.get(from);
                if (!fromCell) continue;
                for (const edge of edges) {
                    if (edge.doorId) continue;
                    const toCell = cellById.get(edge.to);
                    if (toCell && segmentCrossesDoorPortal(fromCell.point, toCell.point, approach.point, exit.point, door.apertureRadius)) {
                        removeOrdinaryEdge(mutableAdjacency, from, edge.to);
                        removeOrdinaryEdge(mutableAdjacency, edge.to, from);
                    }
                }
            }
        }
        const edgeDistance = distance(approach.point, repair.point) + distance(repair.point, exit.point);
        addEdge(mutableAdjacency, approach.id, { to: exit.id, distance: edgeDistance, doorId: door.id });
        addEdge(mutableAdjacency, exit.id, { to: approach.id, distance: edgeDistance, doorId: door.id });
        doorLinks.push({
            doorId: door.id,
            classification,
            sourcePoint: door.point,
            thresholdPoint: repair.point,
            approachCellId: approach.id,
            exitCellId: exit.id,
            connectedRoomIds: [...new Set([...approach.roomIds, ...exit.roomIds])].sort((a, b) => a.localeCompare(b)),
            provenance: repair.provenance,
            reason: repair.reason,
        });
    }
    const freezeAdjacency = () => new Map<string, readonly ContinuousNavigationEdge[]>(cells.map(cell => [
        cell.id,
        (mutableAdjacency.get(cell.id) ?? []).sort((a, b) => a.to.localeCompare(b.to) || (a.doorId ?? '').localeCompare(b.doorId ?? '')),
    ]));
    let adjacency = freezeAdjacency();
    let components = computeComponents(cells, adjacency);
    const initialInteriorComponentId = components.componentSizes.reduce((best, size, componentId, sizes) => size > sizes[best] ? componentId : best, 0);
    for (let componentId = 0; componentId < components.componentSizes.length; componentId += 1) {
        if (componentId === initialInteriorComponentId) continue;
        const componentCells = cells.filter(cell => components.componentByCellId.get(cell.id) === componentId);
        let bridge: readonly [ContinuousNavigationCell, ContinuousNavigationCell] | null = null;
        for (const cell of componentCells) {
            const column = Math.round(cell.point.x / config.spacing);
            const row = Math.round(cell.point.y / config.spacing);
            const nearby: ContinuousNavigationCell[] = [];
            for (let rowOffset = -6; rowOffset <= 6; rowOffset += 1) {
                for (let columnOffset = -6; columnOffset <= 6; columnOffset += 1) {
                    const candidate = byGridKey.get(`${column + columnOffset},${row + rowOffset}`);
                    if (candidate && components.componentByCellId.get(candidate.id) === initialInteriorComponentId) nearby.push(candidate);
                }
            }
            const target = nearby.sort((a, b) => distance(cell.point, a.point) - distance(cell.point, b.point) || a.id.localeCompare(b.id))
                .find(candidate => ordinaryTransitionAllowed(graph, cell.roomIds, candidate.roomIds)
                    && !doorLinks.some(link => {
                        if (link.doorId !== 'D46' || !link.approachCellId || !link.exitCellId) return false;
                        const door = graph.doors.find(item => item.id === link.doorId);
                        const approach = cellById.get(link.approachCellId);
                        const exit = cellById.get(link.exitCellId);
                        return Boolean(door && approach && exit && segmentCrossesDoorPortal(cell.point, candidate.point, approach.point, exit.point, door.apertureRadius));
                    })
                    && segmentValid(graph, cell.point, candidate.point, config.segmentSampleSpacing));
            if (target) { bridge = [cell, target]; break; }
        }
        if (!bridge) continue;
        const bridgeDistance = distance(bridge[0].point, bridge[1].point);
        addEdge(mutableAdjacency, bridge[0].id, { to: bridge[1].id, distance: bridgeDistance });
        addEdge(mutableAdjacency, bridge[1].id, { to: bridge[0].id, distance: bridgeDistance });
    }
    adjacency = freezeAdjacency();
    components = computeComponents(cells, adjacency);
    const interiorComponentId = components.componentSizes.reduce((best, size, componentId, sizes) => size > sizes[best] ? componentId : best, 0);
    const exteriorRoomIds = new Set(graph.doors
        .filter(door => classifyDoor(door) === 'exterior')
        .flatMap(door => door.zoneIds));
    const interiorRoomIds = new Set(graph.doors
        .filter(door => classifyDoor(door) === 'interior')
        .flatMap(door => door.zoneIds));
    const excludedComponents = components.componentSizes.map((size, componentId) => {
        if (componentId === interiorComponentId) return null;
        const roomIds = [...new Set(cells.filter(cell => components.componentByCellId.get(cell.id) === componentId).flatMap(cell => cell.roomIds))].sort((a, b) => a.localeCompare(b));
        const exteriorIsolated = roomIds.length > 0 && roomIds.every(roomId => exteriorRoomIds.has(roomId) && !interiorRoomIds.has(roomId));
        return {
            componentId,
            size,
            classification: exteriorIsolated ? 'exterior-isolated' as const : 'collision-enclosed' as const,
            roomIds,
            reason: exteriorIsolated
                ? 'Positive geometry belongs only to a room whose modeled doorway leads to nonexistent exterior/service space.'
                : 'Positive geometry is enclosed from the expected interior component by collision geometry and is excluded from authoritative walkable space.',
        };
    }).filter((item): item is NonNullable<typeof item> => item !== null);
    const sourceGeometryRevision = sourceRevision(graph, config);
    const navigationRevision = `nav-${stableHash(JSON.stringify({
        sourceGeometryRevision,
        cells: cells.map(cell => [cell.id, cell.roomIds]),
        edges: [...adjacency.entries()].map(([from, edges]) => [from, edges.map(edge => [edge.to, edge.distance, edge.doorId ?? null])]),
        doors: doorLinks.map(link => [link.doorId, link.classification, link.thresholdPoint, link.approachCellId, link.exitCellId]),
    }))}`;
    return {
        schemaVersion: FLOOR1_NAVIGATION_SCHEMA_VERSION,
        navigationRevision,
        sourceGeometryRevision,
        config,
        graph,
        cells,
        cellById,
        adjacency,
        componentByCellId: components.componentByCellId,
        componentSizes: components.componentSizes,
        interiorComponentId,
        excludedComponents,
        doorLinks,
        issues,
        buildDurationMs: now() - started,
    };
}

function projectionSideIsSafe(graph: CandidateNavigationGraph, requested: Point, accepted: Point): boolean {
    let invalidSeen = false;
    const samples = Math.max(8, Math.ceil(distance(requested, accepted) / 16));
    for (let index = 0; index <= samples; index += 1) {
        const ratio = index / samples;
        const point = { x: accepted.x + (requested.x - accepted.x) * ratio, y: accepted.y + (requested.y - accepted.y) * ratio };
        const valid = pointValid(graph, point);
        if (!valid) invalidSeen = true;
        else if (invalidSeen) return false;
    }
    return true;
}

export function projectContinuousNavigationPoint(
    field: ContinuousNavigationField,
    requestedPoint: Point,
    context: Readonly<{ requestId?: string; intendedRoomIds?: readonly string[] }> = {},
): ContinuousNavigationProjection {
    const requestId = context.requestId ?? 'projection';
    const requestedRoomIds = context.intendedRoomIds?.length ? [...context.intendedRoomIds] : roomIdsAtPoint(field.graph, requestedPoint);
    if (!bounded(requestedPoint)) return { status: 'rejected', requestId, navigationRevision: field.navigationRevision, requestedPoint, acceptedPoint: null, distance: Number.POSITIVE_INFINITY, requestedRoomIds, acceptedRoomIds: [], sameWallSide: false, exact: false, reason: 'outside-office' };
    if (continuousNavigationPointIsValid(field, requestedPoint)) return { status: 'accepted', requestId, navigationRevision: field.navigationRevision, requestedPoint, acceptedPoint: requestedPoint, distance: 0, requestedRoomIds, acceptedRoomIds: roomIdsAtPoint(field.graph, requestedPoint), sameWallSide: true, exact: true, reason: 'exact-valid' };
    const interiorCells = field.cells.filter(cell => field.componentByCellId.get(cell.id) === field.interiorComponentId);
    const requestedRoomsInInterior = requestedRoomIds.filter(roomId => interiorCells.some(cell => cell.roomIds.includes(roomId)));
    if (requestedRoomIds.length > 0 && requestedRoomsInInterior.length === 0) {
        const exterior = field.excludedComponents.some(component => component.classification === 'exterior-isolated' && component.roomIds.some(roomId => requestedRoomIds.includes(roomId)));
        return { status: 'rejected', requestId, navigationRevision: field.navigationRevision, requestedPoint, acceptedPoint: null, distance: Number.POSITIVE_INFINITY, requestedRoomIds, acceptedRoomIds: [], sameWallSide: false, exact: false, reason: exterior ? 'exterior-isolated' : 'disconnected-pocket' };
    }
    const candidates = interiorCells
        .map(cell => ({ cell, distance: distance(requestedPoint, cell.point), sameRoom: requestedRoomIds.length > 0 && cell.roomIds.some(roomId => requestedRoomIds.includes(roomId)) }))
        .filter(candidate => requestedRoomsInInterior.length === 0 || candidate.sameRoom)
        .sort((a, b) => Number(b.sameRoom) - Number(a.sameRoom) || a.distance - b.distance || a.cell.id.localeCompare(b.cell.id))
        .slice(0, 256);
    const acceptedBase = candidates.find(candidate => projectionSideIsSafe(field.graph, requestedPoint, candidate.cell.point));
    const accepted = acceptedBase ? { ...acceptedBase, sameSide: true } : null;
    if (!accepted) return { status: 'rejected', requestId, navigationRevision: field.navigationRevision, requestedPoint, acceptedPoint: null, distance: Number.POSITIVE_INFINITY, requestedRoomIds, acceptedRoomIds: [], sameWallSide: false, exact: false, reason: 'disconnected-pocket' };
    const nearDoor = field.doorLinks.find(link => distance(requestedPoint, link.thresholdPoint) <= field.config.spacing * 1.5);
    return {
        status: 'accepted', requestId, navigationRevision: field.navigationRevision, requestedPoint, acceptedPoint: accepted.cell.point, distance: accepted.distance,
        requestedRoomIds, acceptedRoomIds: accepted.cell.roomIds, sameWallSide: accepted.sameSide, exact: false,
        reason: nearDoor ? 'door-threshold' : accepted.sameSide ? 'obstacle-clearance' : 'nearest-valid',
    };
}

function visibleCellConnectors(field: ContinuousNavigationField, point: Point, roomIds: readonly string[]): ContinuousNavigationCell[] {
    return field.cells
        .filter(cell => field.componentByCellId.get(cell.id) === field.interiorComponentId)
        .filter(cell => roomIds.length === 0 || cell.roomIds.some(roomId => roomIds.includes(roomId)))
        .map(cell => ({ cell, distance: distance(point, cell.point) }))
        .filter(candidate => candidate.distance <= field.config.spacing * 4)
        .sort((a, b) => a.distance - b.distance || a.cell.id.localeCompare(b.cell.id))
        .filter(candidate => !field.doorLinks.some(link => {
            if (link.doorId !== 'D46' || !link.approachCellId || !link.exitCellId) return false;
            const door = field.graph.doors.find(item => item.id === link.doorId);
            const approach = field.cellById.get(link.approachCellId);
            const exit = field.cellById.get(link.exitCellId);
            return Boolean(door && approach && exit && segmentCrossesDoorPortal(point, candidate.cell.point, approach.point, exit.point, door.apertureRadius));
        }))
        .filter(candidate => segmentValid(field.graph, point, candidate.cell.point, field.config.segmentSampleSpacing))
        .slice(0, 12)
        .map(candidate => candidate.cell);
}

function shortestCellPath(field: ContinuousNavigationField, starts: readonly ContinuousNavigationCell[], ends: readonly ContinuousNavigationCell[]) {
    const endIds = new Set(ends.map(cell => cell.id));
    const targetPoint = ends[0]?.point;
    type QueueItem = { id: string; cost: number; estimate: number };
    const before = (a: QueueItem, b: QueueItem) => a.estimate < b.estimate
        || (a.estimate === b.estimate && (a.cost < b.cost || (a.cost === b.cost && a.id.localeCompare(b.id) < 0)));
    const queue: QueueItem[] = [];
    const push = (item: QueueItem) => {
        queue.push(item);
        let index = queue.length - 1;
        while (index > 0) {
            const parent = Math.floor((index - 1) / 2);
            if (!before(queue[index], queue[parent])) break;
            [queue[index], queue[parent]] = [queue[parent], queue[index]];
            index = parent;
        }
    };
    const pop = (): QueueItem | undefined => {
        const root = queue[0];
        const tail = queue.pop();
        if (!root || !tail || queue.length === 0) return root;
        queue[0] = tail;
        let index = 0;
        let restoring = true;
        while (restoring) {
            const left = index * 2 + 1;
            const right = left + 1;
            let smallest = index;
            if (left < queue.length && before(queue[left], queue[smallest])) smallest = left;
            if (right < queue.length && before(queue[right], queue[smallest])) smallest = right;
            if (smallest === index) restoring = false;
            else {
                [queue[index], queue[smallest]] = [queue[smallest], queue[index]];
                index = smallest;
            }
        }
        return root;
    };
    for (const cell of starts) push({ id: cell.id, cost: 0, estimate: targetPoint ? distance(cell.point, targetPoint) : 0 });
    const best = new Map(starts.map(cell => [cell.id, 0]));
    const previous = new Map<string, string>();
    let expanded = 0;
    while (queue.length > 0) {
        const current = pop()!;
        if (current.cost !== best.get(current.id)) continue;
        expanded += 1;
        if (endIds.has(current.id)) {
            const ids = [current.id];
            while (!starts.some(cell => cell.id === ids[0])) ids.unshift(previous.get(ids[0])!);
            return { ids, expanded };
        }
        for (const edge of field.adjacency.get(current.id) ?? []) {
            const cost = current.cost + edge.distance;
            if (cost >= (best.get(edge.to) ?? Number.POSITIVE_INFINITY)) continue;
            best.set(edge.to, cost);
            previous.set(edge.to, current.id);
            const point = field.cellById.get(edge.to)?.point;
            push({ id: edge.to, cost, estimate: cost + (point && targetPoint ? distance(point, targetPoint) : 0) });
        }
    }
    return null;
}

function routeLength(points: readonly Point[]): number {
    return points.slice(1).reduce((total, point, index) => total + distance(points[index], point), 0);
}

function smoothChunk(field: ContinuousNavigationField, points: readonly Point[]): Point[] {
    if (points.length <= 2) return [...points];
    const result = [points[0]];
    let anchor = 0;
    while (anchor < points.length - 1) {
        let next = points.length - 1;
        while (next > anchor + 1 && !segmentValid(field.graph, points[anchor], points[next], field.config.segmentSampleSpacing)) next -= 1;
        result.push(points[next]);
        anchor = next;
    }
    return result;
}

function edgeBetween(field: ContinuousNavigationField, from: string, to: string): ContinuousNavigationEdge | undefined {
    return field.adjacency.get(from)?.find(edge => edge.to === to);
}

function routeGeometry(field: ContinuousNavigationField, start: Point, target: Point, cellIds: readonly string[]) {
    const rawPoints = [start, ...cellIds.map(id => field.cellById.get(id)!.point), target].filter((point, index, all) => index === 0 || distance(point, all[index - 1]) > 0.001);
    const doorTransitions = cellIds.slice(1).map((id, index) => ({ edge: edgeBetween(field, cellIds[index], id), fromId: cellIds[index], toId: id })).filter(item => item.edge?.doorId);
    const points: Point[] = [];
    const doorSteps: CandidateDoorStep[] = [];
    let chunkStartIndex = 0;
    let priorPoint = start;
    for (const transition of doorTransitions) {
        const fromIndex = cellIds.indexOf(transition.fromId);
        const approach = field.cellById.get(transition.fromId)!.point;
        const exit = field.cellById.get(transition.toId)!.point;
        const chunk = smoothChunk(field, [priorPoint, ...cellIds.slice(chunkStartIndex, fromIndex + 1).map(id => field.cellById.get(id)!.point)]);
        if (points.length > 0 && chunk.length > 0 && distance(points[points.length - 1], chunk[0]) < 0.001) chunk.shift();
        points.push(...chunk);
        const link = field.doorLinks.find(item => item.doorId === transition.edge!.doorId)!;
        const thresholdDistance = routeLength([...points, link.thresholdPoint]);
        points.push(link.thresholdPoint, exit);
        doorSteps.push({
            doorId: link.doorId, permission: 'general', initialPhysicalState: 'open', requiredAction: 'none', approachPoint: approach,
            thresholdPoint: link.thresholdPoint, exitPoint: exit, approachDistance: Math.max(0, thresholdDistance - distance(approach, link.thresholdPoint)),
            thresholdDistance, exitDistance: thresholdDistance + distance(link.thresholdPoint, exit), clearanceReleaseDistance: thresholdDistance + distance(link.thresholdPoint, exit) + AGENT_FOOTPRINT_RADIUS * 2,
        });
        priorPoint = exit;
        chunkStartIndex = fromIndex + 2;
    }
    const finalChunk = smoothChunk(field, [priorPoint, ...cellIds.slice(chunkStartIndex).map(id => field.cellById.get(id)!.point), target]);
    if (points.length > 0 && finalChunk.length > 0 && distance(points[points.length - 1], finalChunk[0]) < 0.001) finalChunk.shift();
    points.push(...finalChunk);
    return { rawPoints, points, doorSteps };
}

function turnMetrics(points: readonly Point[]) {
    let turnCount = 0;
    let turnAngleSumDegrees = 0;
    for (let index = 1; index < points.length - 1; index += 1) {
        const a = { x: points[index].x - points[index - 1].x, y: points[index].y - points[index - 1].y };
        const b = { x: points[index + 1].x - points[index].x, y: points[index + 1].y - points[index].y };
        const denominator = Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y);
        if (denominator <= 0.001) continue;
        const angle = Math.acos(Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y) / denominator))) * 180 / Math.PI;
        if (angle > 1) { turnCount += 1; turnAngleSumDegrees += angle; }
    }
    return { turnCount, turnAngleSumDegrees };
}

export function planContinuousNavigationRoute(
    field: ContinuousNavigationField,
    request: Readonly<{ requestId: string; navigationRevision?: string; start: Point; destination: Point; intendedStartRoomIds?: readonly string[]; intendedDestinationRoomIds?: readonly string[] }>,
): ContinuousNavigationRoute {
    const projectionStarted = now();
    const staleRevision = request.navigationRevision && request.navigationRevision !== field.navigationRevision;
    const startRecovery = projectContinuousNavigationPoint(field, request.start, { requestId: `${request.requestId}:start`, intendedRoomIds: request.intendedStartRoomIds });
    const destinationProjection = projectContinuousNavigationPoint(field, request.destination, { requestId: `${request.requestId}:destination`, intendedRoomIds: request.intendedDestinationRoomIds });
    const projectionDurationMs = now() - projectionStarted;
    const rejected = (reason: string): ContinuousNavigationRoute => ({
        status: 'rejected', requestId: request.requestId, navigationRevision: field.navigationRevision, reason,
        requestedStart: request.start, recoveredStart: startRecovery.acceptedPoint ?? request.start, requestedDestination: request.destination,
        projectedDestination: destinationProjection.acceptedPoint ?? request.destination, startRecovery, destinationProjection,
        rawPoints: [], points: [], cellSequence: [], crossedDoorIds: [], doorSteps: [],
        metrics: { totalDistance: 0, rawDistance: 0, turnCount: 0, turnAngleSumDegrees: 0, doorCount: 0, expandedCellCount: 0, smoothingReductionPercentage: 0, projectionDurationMs, searchDurationMs: 0, smoothingDurationMs: 0 },
    });
    if (staleRevision) return rejected('Route request references a stale navigation revision.');
    if (field.issues.some(issue => ['invalid-config', 'malformed-room', 'zero-area-room', 'malformed-collider'].includes(issue.code))) return rejected('Navigation geometry validation failed closed.');
    if (!startRecovery.acceptedPoint || !destinationProjection.acceptedPoint) return rejected('Start or destination could not be projected into valid Floor 1 space.');
    const start = startRecovery.acceptedPoint;
    const target = destinationProjection.acceptedPoint;
    const directStarted = now();
    const directCrossesModeledDoor = field.doorLinks.some(link => {
        if (link.classification !== 'interior') return false;
        const crossesDistinctLinkedRooms = link.connectedRoomIds.some(roomId => startRecovery.acceptedRoomIds.includes(roomId))
            && link.connectedRoomIds.some(roomId => destinationProjection.acceptedRoomIds.includes(roomId))
            && !startRecovery.acceptedRoomIds.some(roomId => destinationProjection.acceptedRoomIds.includes(roomId));
        if (crossesDistinctLinkedRooms) return true;
        if (link.doorId !== 'D46' || !link.approachCellId || !link.exitCellId) return false;
        const door = field.graph.doors.find(candidate => candidate.id === link.doorId);
        const approach = field.cellById.get(link.approachCellId);
        const exit = field.cellById.get(link.exitCellId);
        return Boolean(door && approach && exit && segmentCrossesDoorPortal(start, target, approach.point, exit.point, door.apertureRadius));
    });
    if (!directCrossesModeledDoor && segmentValid(field.graph, start, target, field.config.segmentSampleSpacing)) {
        const directDistance = distance(start, target);
        return {
            status: 'valid', requestId: request.requestId, navigationRevision: field.navigationRevision, reason: 'Direct clearance-safe route.',
            requestedStart: request.start, recoveredStart: start, requestedDestination: request.destination, projectedDestination: target,
            startRecovery, destinationProjection, rawPoints: [start, target], points: [start, target], cellSequence: [], crossedDoorIds: [], doorSteps: [],
            metrics: { totalDistance: directDistance, rawDistance: directDistance, turnCount: 0, turnAngleSumDegrees: 0, doorCount: 0, expandedCellCount: 0, smoothingReductionPercentage: 0, projectionDurationMs, searchDurationMs: now() - directStarted, smoothingDurationMs: 0 },
        };
    }
    const starts = visibleCellConnectors(field, start, startRecovery.acceptedRoomIds);
    const ends = visibleCellConnectors(field, target, destinationProjection.acceptedRoomIds);
    if (starts.length === 0 || ends.length === 0) return rejected('No clearance-safe connector attaches an arbitrary endpoint to the navigation field.');
    const searchStarted = now();
    const search = shortestCellPath(field, starts, ends);
    const searchDurationMs = now() - searchStarted;
    if (!search) return rejected('No continuous navigation component connects the projected endpoints.');
    const smoothingStarted = now();
    const geometry = routeGeometry(field, start, target, search.ids);
    const smoothingDurationMs = now() - smoothingStarted;
    const rawDistance = routeLength(geometry.rawPoints);
    const totalDistance = routeLength(geometry.points);
    const turns = turnMetrics(geometry.points);
    const crossedDoorIds = geometry.doorSteps.map(step => step.doorId);
    return {
        status: 'valid', requestId: request.requestId, navigationRevision: field.navigationRevision, reason: crossedDoorIds.length ? `Continuous route traverses ${crossedDoorIds.join(', ')}.` : 'Continuous clearance-field route.',
        requestedStart: request.start, recoveredStart: start, requestedDestination: request.destination, projectedDestination: target,
        startRecovery, destinationProjection, rawPoints: geometry.rawPoints, points: geometry.points, cellSequence: search.ids,
        crossedDoorIds, doorSteps: geometry.doorSteps,
        metrics: { totalDistance, rawDistance, ...turns, doorCount: crossedDoorIds.length, expandedCellCount: search.expanded, smoothingReductionPercentage: rawDistance > 0 ? Math.max(0, (rawDistance - totalDistance) / rawDistance * 100) : 0, projectionDurationMs, searchDurationMs, smoothingDurationMs },
    };
}

export function validateContinuousNavigationRoute(field: ContinuousNavigationField, route: ContinuousNavigationRoute): ContinuousNavigationIssue[] {
    const issues: ContinuousNavigationIssue[] = [];
    if (route.navigationRevision !== field.navigationRevision) issues.push({ code: 'stale-route-revision', entityId: route.requestId, message: 'Route revision does not match the current navigation field.' });
    if (route.status !== 'valid') return issues;
    if (!continuousNavigationPointIsValid(field, route.recoveredStart)) issues.push({ code: 'invalid-route-start', entityId: route.requestId, message: 'Recovered route start is invalid.' });
    if (!continuousNavigationPointIsValid(field, route.projectedDestination)) issues.push({ code: 'invalid-route-destination', entityId: route.requestId, message: 'Projected route destination is invalid.' });
    for (let index = 1; index < route.points.length; index += 1) {
        const a = route.points[index - 1];
        const b = route.points[index];
        const portalSegment = route.doorSteps.some(step =>
            (distance(a, step.approachPoint) < 0.001 && distance(b, step.thresholdPoint) < 0.001)
            || (distance(a, step.thresholdPoint) < 0.001 && distance(b, step.exitPoint) < 0.001));
        if (!portalSegment && !segmentValid(field.graph, a, b, field.config.segmentSampleSpacing)) issues.push({ code: 'route-segment-invalid', entityId: route.requestId, message: `Route segment ${index} crosses invalid geometry.` });
    }
    return issues;
}
