import { OFFICE_SOURCE_HEIGHT, OFFICE_SOURCE_WIDTH } from '../../constants';
import type { Point } from '../../types';
import { candidatePointHasStaticClearance } from './candidateNavigation';
import {
    continuousNavigationPointIsValid,
    planContinuousNavigationRoute,
    validateContinuousNavigationRoute,
    type ContinuousNavigationField,
} from './continuousNavigation';

export type ReachabilitySampleKind = 'uniform' | 'room-boundary' | 'collider-corner' | 'door-aperture' | 'anchor' | 'narrow-offset';

export type ReachabilitySample = Readonly<{
    id: string;
    kind: ReachabilitySampleKind;
    point: Point;
    valid: boolean;
    componentId: number | null;
    roomIds: readonly string[];
    exclusionReason: 'outside-source' | 'collision' | 'outside-positive-space' | 'exterior-isolated' | 'collision-enclosed' | null;
}>;

export type ReachabilityCertification = Readonly<{
    schemaVersion: 1;
    navigationRevision: string;
    sourceGeometryRevision: string;
    generatedAt: 'deterministic';
    sampleSpacing: number;
    totalSamples: number;
    validSamples: number;
    expectedComponentSamples: number;
    validCoveragePercentage: number;
    excludedSamples: number;
    exclusionCounts: Readonly<Record<string, number>>;
    sampleKindCounts: Readonly<Record<ReachabilitySampleKind, number>>;
    interiorComponentId: number;
    interiorComponentCellCount: number;
    rawComponentCount: number;
    excludedComponents: ContinuousNavigationField['excludedComponents'];
    reversibleInteriorDoors: number;
    nonReversibleInteriorDoorIds: readonly string[];
    representativeRoutes: readonly Readonly<{
        id: string;
        status: 'valid' | 'rejected';
        forwardValid: boolean;
        reverseValid: boolean;
        start: Point;
        destination: Point;
        crossedDoorIds: readonly string[];
        forwardDistance: number;
        reverseDistance: number;
        forwardMetrics: Readonly<{ turns: number; expandedCells: number; smoothingReductionPercentage: number }>;
        reverseMetrics: Readonly<{ turns: number; expandedCells: number; smoothingReductionPercentage: number }>;
    }>[];
    samples: readonly ReachabilitySample[];
}>;

function key(point: Point): string {
    return `${point.x.toFixed(3)},${point.y.toFixed(3)}`;
}

function bounded(point: Point): boolean {
    return Number.isFinite(point.x) && Number.isFinite(point.y)
        && point.x >= 0 && point.y >= 0 && point.x <= OFFICE_SOURCE_WIDTH && point.y <= OFFICE_SOURCE_HEIGHT;
}

function addSample(target: Map<string, { point: Point; kinds: Set<ReachabilitySampleKind> }>, point: Point, kind: ReachabilitySampleKind): void {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
    const sampleKey = key(point);
    const existing = target.get(sampleKey);
    if (existing) existing.kinds.add(kind);
    else target.set(sampleKey, { point, kinds: new Set([kind]) });
}

function nearestCell(field: ContinuousNavigationField, point: Point): { distance: number; componentId: number; roomIds: readonly string[] } | null {
    let best: { distance: number; componentId: number; roomIds: readonly string[] } | null = null;
    const centerColumn = Math.round(point.x / field.config.spacing);
    const centerRow = Math.round(point.y / field.config.spacing);
    const nearby = [];
    for (let rowOffset = -3; rowOffset <= 3; rowOffset += 1) {
        for (let columnOffset = -3; columnOffset <= 3; columnOffset += 1) {
            const column = centerColumn + columnOffset;
            const row = centerRow + rowOffset;
            const id = `cell:${String(column).padStart(3, '0')}:${String(row).padStart(3, '0')}`;
            const cell = field.cellById.get(id);
            if (cell) nearby.push(cell);
        }
    }
    for (const cell of nearby.length > 0 ? nearby : field.cells) {
        const componentId = field.componentByCellId.get(cell.id);
        if (componentId === undefined) continue;
        const candidateDistance = Math.hypot(cell.point.x - point.x, cell.point.y - point.y);
        if (!best || candidateDistance < best.distance) best = { distance: candidateDistance, componentId, roomIds: cell.roomIds };
    }
    return best;
}

function sampleKind(kinds: ReadonlySet<ReachabilitySampleKind>): ReachabilitySampleKind {
    const priority: readonly ReachabilitySampleKind[] = ['door-aperture', 'anchor', 'collider-corner', 'room-boundary', 'narrow-offset', 'uniform'];
    return priority.find(kind => kinds.has(kind)) ?? 'uniform';
}

function exclusion(field: ContinuousNavigationField, point: Point, componentId: number | null): ReachabilitySample['exclusionReason'] {
    if (!bounded(point)) return 'outside-source';
    if (!candidatePointHasStaticClearance(field.graph, point)) return 'collision';
    const excluded = field.excludedComponents.find(component => component.componentId === componentId);
    if (excluded) return excluded.classification;
    return 'outside-positive-space';
}

export function generateAdaptiveReachabilitySamples(field: ContinuousNavigationField, spacing = 96): readonly ReachabilitySample[] {
    const candidates = new Map<string, { point: Point; kinds: Set<ReachabilitySampleKind> }>();
    for (let y = spacing / 2; y < OFFICE_SOURCE_HEIGHT; y += spacing) {
        for (let x = spacing / 2; x < OFFICE_SOURCE_WIDTH; x += spacing) addSample(candidates, { x, y }, 'uniform');
    }
    const boundaryOffset = Math.max(12, field.config.footprintRadius + 6);
    for (const room of field.graph.rooms) {
        for (const point of room.polygon) {
            for (const [dx, dy] of [[0, 0], [boundaryOffset, 0], [-boundaryOffset, 0], [0, boundaryOffset], [0, -boundaryOffset]] as const) {
                addSample(candidates, { x: point.x + dx, y: point.y + dy }, 'room-boundary');
            }
        }
    }
    for (const collider of field.graph.colliders) {
        const offset = collider.thickness / 2 + field.config.footprintRadius + 4;
        for (const point of collider.points) {
            for (const [dx, dy] of [[offset, 0], [-offset, 0], [0, offset], [0, -offset]] as const) {
                addSample(candidates, { x: point.x + dx, y: point.y + dy }, 'collider-corner');
            }
        }
    }
    for (const link of field.doorLinks) {
        addSample(candidates, link.thresholdPoint, 'door-aperture');
        const approach = link.approachCellId ? field.cellById.get(link.approachCellId) : null;
        const exit = link.exitCellId ? field.cellById.get(link.exitCellId) : null;
        if (approach) addSample(candidates, approach.point, 'door-aperture');
        if (exit) addSample(candidates, exit.point, 'door-aperture');
    }
    for (const destination of field.graph.destinations) addSample(candidates, destination.point, 'anchor');
    for (const agent of field.graph.agents) addSample(candidates, agent.point, 'anchor');
    for (const cell of field.cells.filter(cell => field.componentByCellId.get(cell.id) === field.interiorComponentId)) {
        addSample(candidates, { x: cell.point.x + spacing / 3, y: cell.point.y + spacing / 3 }, 'narrow-offset');
    }
    return [...candidates.values()].sort((a, b) => a.point.y - b.point.y || a.point.x - b.point.x).map((candidate, index) => {
        const valid = continuousNavigationPointIsValid(field, candidate.point);
        const nearest = nearestCell(field, candidate.point);
        const componentId = nearest?.componentId ?? null;
        return {
            id: `sample-${String(index + 1).padStart(6, '0')}`,
            kind: sampleKind(candidate.kinds),
            point: candidate.point,
            valid,
            componentId: valid ? field.interiorComponentId : componentId,
            roomIds: nearest && nearest.distance <= field.config.spacing * 2 ? nearest.roomIds : [],
            exclusionReason: valid ? null : exclusion(field, candidate.point, componentId),
        };
    });
}

export function certifyContinuousNavigation(field: ContinuousNavigationField, spacing = 96): ReachabilityCertification {
    const samples = generateAdaptiveReachabilitySamples(field, spacing);
    const validSamples = samples.filter(sample => sample.valid);
    const representative = validSamples.filter((_sample, index) => index % Math.max(1, Math.floor(validSamples.length / 16)) === 0).slice(0, 16);
    const representativeRoutes = representative.map((start, index) => {
        const destination = representative[(index * 7 + 5) % representative.length] ?? start;
        const forward = planContinuousNavigationRoute(field, { requestId: `proof-${index + 1}-forward`, navigationRevision: field.navigationRevision, start: start.point, destination: destination.point });
        const reverse = planContinuousNavigationRoute(field, { requestId: `proof-${index + 1}-reverse`, navigationRevision: field.navigationRevision, start: destination.point, destination: start.point });
        const forwardValid = forward.status === 'valid' && validateContinuousNavigationRoute(field, forward).length === 0;
        const reverseValid = reverse.status === 'valid' && validateContinuousNavigationRoute(field, reverse).length === 0;
        return {
            id: `representative-${String(index + 1).padStart(2, '0')}`,
            status: forwardValid && reverseValid ? 'valid' as const : 'rejected' as const,
            forwardValid,
            reverseValid,
            start: start.point,
            destination: destination.point,
            crossedDoorIds: forward.crossedDoorIds,
            forwardDistance: forward.metrics.totalDistance,
            reverseDistance: reverse.metrics.totalDistance,
            forwardMetrics: { turns: forward.metrics.turnCount, expandedCells: forward.metrics.expandedCellCount, smoothingReductionPercentage: forward.metrics.smoothingReductionPercentage },
            reverseMetrics: { turns: reverse.metrics.turnCount, expandedCells: reverse.metrics.expandedCellCount, smoothingReductionPercentage: reverse.metrics.smoothingReductionPercentage },
        };
    });
    const nonReversibleInteriorDoorIds = field.doorLinks.filter(link => {
        if (link.classification !== 'interior' || !link.approachCellId || !link.exitCellId) return false;
        const forward = field.adjacency.get(link.approachCellId)?.some(edge => edge.to === link.exitCellId && edge.doorId === link.doorId);
        const reverse = field.adjacency.get(link.exitCellId)?.some(edge => edge.to === link.approachCellId && edge.doorId === link.doorId);
        return !forward || !reverse;
    }).map(link => link.doorId);
    const exclusionCounts: Record<string, number> = {};
    const sampleKindCounts = { uniform: 0, 'room-boundary': 0, 'collider-corner': 0, 'door-aperture': 0, anchor: 0, 'narrow-offset': 0 } satisfies Record<ReachabilitySampleKind, number>;
    for (const sample of samples) {
        sampleKindCounts[sample.kind] += 1;
        if (sample.exclusionReason) exclusionCounts[sample.exclusionReason] = (exclusionCounts[sample.exclusionReason] ?? 0) + 1;
    }
    const expectedComponentSamples = validSamples.filter(sample => sample.componentId === field.interiorComponentId).length;
    return {
        schemaVersion: 1,
        navigationRevision: field.navigationRevision,
        sourceGeometryRevision: field.sourceGeometryRevision,
        generatedAt: 'deterministic',
        sampleSpacing: spacing,
        totalSamples: samples.length,
        validSamples: validSamples.length,
        expectedComponentSamples,
        validCoveragePercentage: validSamples.length > 0 ? expectedComponentSamples / validSamples.length * 100 : 0,
        excludedSamples: samples.length - validSamples.length,
        exclusionCounts,
        sampleKindCounts,
        interiorComponentId: field.interiorComponentId,
        interiorComponentCellCount: field.componentSizes[field.interiorComponentId] ?? 0,
        rawComponentCount: field.componentSizes.length,
        excludedComponents: field.excludedComponents,
        reversibleInteriorDoors: field.doorLinks.filter(link => link.classification === 'interior').length - nonReversibleInteriorDoorIds.length,
        nonReversibleInteriorDoorIds,
        representativeRoutes,
        samples,
    };
}
