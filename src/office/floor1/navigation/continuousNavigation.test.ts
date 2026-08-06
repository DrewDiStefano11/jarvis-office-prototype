import { describe, expect, it } from 'vitest';
import rooms from '../../data/floor1/provisional/rooms.json';
import positions from '../../data/floor1/provisional/positions.json';
import doors from '../../data/floor1/provisional/doors.json';
import computers from '../../data/floor1/provisional/computers.json';
import interactiveObjects from '../../data/floor1/provisional/interactive-objects.json';
import walls from '../../data/floor1/provisional/walls.json';
import objects from '../../data/floor1/provisional/objects.json';
import walkPaths from '../../data/floor1/provisional/walk-paths.json';
import { buildCandidateNavigationGraph } from './candidateNavigation';
import {
    BoundedNavigationCache,
    buildContinuousNavigationField,
    planContinuousNavigationRoute,
    projectContinuousNavigationPoint,
    validateContinuousNavigationRoute,
} from './continuousNavigation';
import { certifyContinuousNavigation } from './reachability';

const TEST_REGISTRATION = {
    sourceWidth: 8192,
    sourceHeight: 5460,
    markupWidth: 8192,
    markupHeight: 5460,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    rotationDegrees: 0,
    status: 'unverified',
    approvalStatus: 'candidate_reviewed',
    storedCoordinateSpace: 'registered_candidate_source',
    productionApproved: false,
    provenance: { generator: 'test', generatedArtifact: 'test', sourceEvidence: ['test'] },
    registrationLandmarks: [
        { id: 'nw', markup: { x: 0, y: 0 }, source: { x: 0, y: 0 }, residualErrorPixels: 0 },
        { id: 'ne', markup: { x: 8192, y: 0 }, source: { x: 8192, y: 0 }, residualErrorPixels: 0 },
        { id: 'sw', markup: { x: 0, y: 5460 }, source: { x: 0, y: 5460 }, residualErrorPixels: 0 },
        { id: 'se', markup: { x: 8192, y: 5460 }, source: { x: 8192, y: 5460 }, residualErrorPixels: 0 },
    ],
    maximumResidualErrorPixels: 0,
} as const;

const graph = buildCandidateNavigationGraph(
    { rooms, positions, doors, computers, interactiveObjects, walls, objects, walkPaths },
    { registration: TEST_REGISTRATION },
);
const field = buildContinuousNavigationField(graph);

describe('continuous Floor 1 navigation field', () => {
    it('builds deterministically from candidate source geometry', () => {
        const rebuilt = buildContinuousNavigationField(graph);
        expect(field.cells.length).toBeGreaterThan(1_000);
        expect(field.navigationRevision).toBe(rebuilt.navigationRevision);
        expect(field.componentSizes).toEqual(rebuilt.componentSizes);
        expect(field.doorLinks).toEqual(rebuilt.doorLinks);
    });

    it('bounds revision-keyed planner caches with deterministic LRU eviction', () => {
        const cache = new BoundedNavigationCache<number>(3);
        cache.set(`${field.navigationRevision}:a`, 1);
        cache.set(`${field.navigationRevision}:b`, 2);
        cache.set(`${field.navigationRevision}:c`, 3);
        expect(cache.get(`${field.navigationRevision}:a`)).toBe(1);
        cache.set(`${field.navigationRevision}:d`, 4);
        expect(cache.size).toBe(3);
        expect(cache.get(`${field.navigationRevision}:b`)).toBeUndefined();
        expect(cache.get(`${field.navigationRevision}:a`)).toBe(1);
        cache.clear();
        expect(cache.size).toBe(0);
    });

    it('repairs the visually misplaced D46 threshold without approving registration', () => {
        const d46 = field.doorLinks.find(link => link.doorId === 'D46');
        expect(d46).toMatchObject({
            classification: 'interior',
            thresholdPoint: { x: 7510, y: 2708 },
            provenance: 'image-guided-d46-repair',
        });
        expect(d46?.approachCellId).not.toBeNull();
        expect(d46?.exitCellId).not.toBeNull();
        expect(TEST_REGISTRATION.status).toBe('unverified');
        expect(TEST_REGISTRATION.productionApproved).toBe(false);
    });

    it('creates symmetric explicit edges for every supported interior door', () => {
        const supported = field.doorLinks.filter(link => link.classification === 'interior');
        expect(supported.length).toBeGreaterThan(0);
        for (const link of supported) {
            const forward = field.adjacency.get(link.approachCellId!)?.find(edge => edge.to === link.exitCellId && edge.doorId === link.doorId);
            const reverse = field.adjacency.get(link.exitCellId!)?.find(edge => edge.to === link.approachCellId && edge.doorId === link.doorId);
            expect(forward, `${link.doorId} forward`).toBeDefined();
            expect(reverse, `${link.doorId} reverse`).toBeDefined();
        }
    });

    it('traverses the repaired D46 aperture and keeps its explicit link reversible', () => {
        const d46 = field.doorLinks.find(link => link.doorId === 'D46')!;
        const approach = field.cellById.get(d46.approachCellId!)!.point;
        const exit = field.cellById.get(d46.exitCellId!)!.point;
        const forward = planContinuousNavigationRoute(field, { requestId: 'd46-forward', navigationRevision: field.navigationRevision, start: approach, destination: exit });
        const reverse = planContinuousNavigationRoute(field, { requestId: 'd46-reverse', navigationRevision: field.navigationRevision, start: exit, destination: approach });
        expect(forward.status).toBe('valid');
        expect(reverse.status).toBe('valid');
        expect(forward.crossedDoorIds).toContain('D46');
        expect(reverse.crossedDoorIds, JSON.stringify({ reason: reverse.reason, cells: reverse.cellSequence, start: reverse.recoveredStart, target: reverse.projectedDestination })).toContain('D46');
        expect(validateContinuousNavigationRoute(field, forward)).toEqual([]);
        expect(validateContinuousNavigationRoute(field, reverse)).toEqual([]);
    });

    it('rejects modeled exterior-isolated rooms and safely projects a disconnected lattice pocket', () => {
        expect(projectContinuousNavigationPoint(field, { x: 1_632, y: 4_704 }, { requestId: 'rm5-exterior' })).toMatchObject({
            status: 'rejected', reason: 'exterior-isolated', acceptedPoint: null,
        });
        expect(projectContinuousNavigationPoint(field, { x: 7_968, y: 2_976 }, { requestId: 'focus-d-pocket' })).toMatchObject({
            status: 'accepted', reason: 'exact-valid', sameWallSide: true,
        });
    });

    it('rejects stale route revisions before search', () => {
        const route = planContinuousNavigationRoute(field, {
            requestId: 'stale-route', navigationRevision: 'nav-stale', start: field.cells[0].point, destination: field.cells[1].point,
        });
        expect(route).toMatchObject({ status: 'rejected', reason: 'Route request references a stale navigation revision.' });
    });

    it('keeps every runtime spawn and available semantic destination attached to the interior field', () => {
        for (const agent of graph.agents) {
            expect(projectContinuousNavigationPoint(field, agent.point, { requestId: `spawn:${agent.id}`, intendedRoomIds: agent.roomIds }), agent.id).toMatchObject({ status: 'accepted' });
        }
        const deliberateExteriorDestinations: string[] = [];
        for (const destination of graph.destinations.filter(item => item.availability !== 'unavailable')) {
            const projection = projectContinuousNavigationPoint(field, destination.point, { requestId: `destination:${destination.id}`, intendedRoomIds: destination.roomIds });
            if (projection.status === 'rejected' && projection.reason === 'exterior-isolated') deliberateExteriorDestinations.push(destination.id);
            else expect(projection, destination.id).toMatchObject({ status: 'accepted' });
        }
        expect(deliberateExteriorDestinations).toEqual(['room:ROOM_RM5', 'room:ROOM_RM8']);
    });

    it('projects invalid points deterministically and routes arbitrary endpoints in one component', () => {
        const criticalIssues = field.issues.filter(issue => ['invalid-config', 'malformed-room', 'zero-area-room', 'malformed-collider'].includes(issue.code));
        expect(criticalIssues, JSON.stringify(criticalIssues)).toEqual([]);
        const requested = { x: graph.agents[0].point.x + 19, y: graph.agents[0].point.y + 11 };
        const first = projectContinuousNavigationPoint(field, requested, { requestId: 'projection-a' });
        const second = projectContinuousNavigationPoint(field, requested, { requestId: 'projection-b' });
        expect(first.acceptedPoint).toEqual(second.acceptedPoint);
        expect(first.navigationRevision).toBe(field.navigationRevision);

        const componentId = field.componentByCellId.get(field.cells[0].id);
        const sameComponent = field.cells.filter(cell => field.componentByCellId.get(cell.id) === componentId);
        const route = planContinuousNavigationRoute(field, {
            requestId: 'route-arbitrary',
            navigationRevision: field.navigationRevision,
            start: sameComponent[0].point,
            destination: sameComponent[sameComponent.length - 1].point,
        });
        expect(route.status, route.reason).toBe('valid');
        expect(route.navigationRevision).toBe(field.navigationRevision);
        expect(validateContinuousNavigationRoute(field, route)).toEqual([]);
    });

    it('certifies adaptive non-node samples in one expected interior component', () => {
        const certification = certifyContinuousNavigation(field, 192);
        expect(certification.validSamples).toBeGreaterThan(1_000);
        expect(certification.validCoveragePercentage).toBe(100);
        expect(certification.nonReversibleInteriorDoorIds).toEqual([]);
        expect(certification.representativeRoutes.every(route => route.forwardValid && route.reverseValid)).toBe(true);
        expect(certification.sampleKindCounts['room-boundary']).toBeGreaterThan(0);
        expect(certification.sampleKindCounts['collider-corner']).toBeGreaterThan(0);
        expect(certification.sampleKindCounts['door-aperture']).toBeGreaterThan(0);
        expect(certification.sampleKindCounts['narrow-offset']).toBeGreaterThan(0);
        expect(certification.excludedComponents.some(component => component.classification === 'exterior-isolated' && component.roomIds.includes('ROOM_RM5'))).toBe(true);
        expect(certification.excludedComponents.some(component => component.classification === 'exterior-isolated' && component.roomIds.includes('ROOM_RM8'))).toBe(true);
    }, 30_000);
});
