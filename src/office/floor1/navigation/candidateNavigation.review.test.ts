import { describe, expect, it } from 'vitest';
import rooms from '../../data/floor1/provisional/rooms.json';
import positions from '../../data/floor1/provisional/positions.json';
import doors from '../../data/floor1/provisional/doors.json';
import computers from '../../data/floor1/provisional/computers.json';
import interactiveObjects from '../../data/floor1/provisional/interactive-objects.json';
import walls from '../../data/floor1/provisional/walls.json';
import objects from '../../data/floor1/provisional/objects.json';
import walkPaths from '../../data/floor1/provisional/walk-paths.json';
import { buildCandidateNavigationGraph, CandidateNavigationGraph, planCandidateRoute, validateCandidateRouteSegments } from './candidateNavigation';

const graph = buildCandidateNavigationGraph({ rooms, positions, doors, computers, interactiveObjects, walls, objects, walkPaths });

describe('Codex review collision and access regressions', () => {
    it('rejects the real agent-04 routes to computers 022 through 025 instead of bypassing object collisions', () => {
        const agent = graph.agents.find(item => item.id === 'floor1-review-agent-04');
        expect(agent?.positionId).toBe('POSITION_118');
        for (const computerNumber of ['022', '023', '024', '025']) {
            const destination = graph.destinations.find(item => item.label === `Computer ${computerNumber}`);
            expect(destination?.id).toBe(`computer:computers-${computerNumber}`);
            const route = planCandidateRoute(graph, agent!.point, destination!.id);
            expect(route.status).toBe('blocked');
            expect(route.failureCategory).toBe('collision');
            expect(route.reason).toContain('object collision');
            expect(route.points).toHaveLength(0);
        }
    });

    it('preserves and detects object colliders 053 and 054 from real data', () => {
        for (const recordId of ['objects-053', 'objects-054']) {
            const collider = graph.colliders.find(item => item.id === `object:${recordId}:path:01`);
            expect(collider).toBeTruthy();
            const route = validateCandidateRouteSegments(graph, [collider!.points[0], collider!.points[Math.floor(collider!.points.length / 2)]], []);
            expect(route?.status).toBe('blocked');
            expect(route?.reason).toContain(`object:${recordId}:path:01`);
        }
    });

    it('preserves later ink paths with deterministic IDs', () => {
        expect(graph.colliders.some(item => item.id === 'object:objects-003:path:02')).toBe(true);
        expect(graph.colliders.some(item => item.id.endsWith(':path:02'))).toBe(true);
        expect(graph.colliders.filter(item => item.id.includes(':path:')).length).toBeGreaterThan(120);
    });
});

function alternateGraph(firstDoorMode: string): CandidateNavigationGraph {
    return {
        rooms: [
            { id: 'A', name: 'A', polygon: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }], center: { x: 50, y: 50 } },
            { id: 'B', name: 'B', polygon: [{ x: 100, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 100 }, { x: 100, y: 100 }], center: { x: 150, y: 50 } },
            { id: 'C', name: 'C', polygon: [{ x: 0, y: 100 }, { x: 200, y: 100 }, { x: 200, y: 200 }, { x: 0, y: 200 }], center: { x: 100, y: 150 } },
        ],
        doors: [
            { id: 'D01', point: { x: 100, y: 50 }, zones: ['A', 'B'], zoneIds: ['A', 'B'], accessMode: firstDoorMode, manualReviewRequired: false, apertureRadius: 80 },
            { id: 'D02', point: { x: 50, y: 100 }, zones: ['A', 'C'], zoneIds: ['A', 'C'], accessMode: 'open', manualReviewRequired: false, apertureRadius: 80 },
            { id: 'D03', point: { x: 150, y: 100 }, zones: ['C', 'B'], zoneIds: ['C', 'B'], accessMode: 'open', manualReviewRequired: false, apertureRadius: 80 },
        ],
        agents: [],
        destinations: [{ id: 'target', label: 'target', kind: 'waypoint', point: { x: 160, y: 40 }, roomId: 'B', roomIds: ['B'], roomName: 'B' }],
        colliders: [],
        walkNodes: [],
        walkSegments: [],
        roomDiagnostics: [],
        nodeCount: 6,
        edgeCount: 3,
    };
}

describe('door access is applied during search', () => {
    it('finds a longer allowed alternate around a blocked shortest door', () => {
        const route = planCandidateRoute(alternateGraph('blocked'), { x: 40, y: 40 }, 'target');
        expect(route.status).toBe('valid');
        expect(route.crossedDoorIds).toEqual(['D02', 'D03']);
        expect(route.nodeSequence).toEqual(['point:start', 'A', 'door:D02', 'door:D03', 'B', 'destination:target']);
        expect(route.expandedNodeCount).toBeLessThanOrEqual(3);
    });

    it('finds an alternate around a restricted deterministic first door and is stable', () => {
        const first = planCandidateRoute(alternateGraph('restricted'), { x: 40, y: 40 }, 'target');
        expect(first.status).toBe('valid');
        expect(first.crossedDoorIds).toEqual(['D02', 'D03']);
        expect(planCandidateRoute(alternateGraph('restricted'), { x: 40, y: 40 }, 'target')).toEqual(first);
    });

    it('reports blocked when all possible routes are non-traversable', () => {
        const blocked = alternateGraph('blocked') as unknown as { doors: Array<{ accessMode: string }> };
        blocked.doors[1].accessMode = 'blocked';
        blocked.doors[2].accessMode = 'restricted';
        const route = planCandidateRoute(blocked as unknown as CandidateNavigationGraph, { x: 40, y: 40 }, 'target');
        expect(route.status).toBe('blocked');
        expect(route.failureCategory).toBe('blocked');
    });
});
import { advanceCandidateAgents } from './candidateNavigation';

describe('movement timing and frame lifecycle helpers', () => {
    const route = { status: 'valid' as const, reason: 'ok', points: [{ x: 0, y: 0 }, { x: 420, y: 0 }], crossedDoorIds: [], nodeSequence: [], cost: 420, length: 420, expandedNodeCount: 1 };
    const agent = { status: 'walking', route, progress: 0, point: { x: 0, y: 0 } };

    it('returns the same array when every agent is idle or delta is zero', () => {
        const idle = [{ ...agent, status: 'idle' }];
        expect(advanceCandidateAgents(idle, 16, 420)).toBe(idle);
        expect(advanceCandidateAgents([agent], 0, 420)).toBeInstanceOf(Array);
    });

    it('uses elapsed time for normal and reduced-motion callers independent of refresh rate', () => {
        const sixtyHz = Array.from({ length: 60 }).reduce<readonly typeof agent[]>((agents) => advanceCandidateAgents(agents, 1000 / 60, 420) as readonly typeof agent[], [agent]);
        const oneTwentyHz = Array.from({ length: 120 }).reduce<readonly typeof agent[]>((agents) => advanceCandidateAgents(agents, 1000 / 120, 420) as readonly typeof agent[], [agent]);
        expect(sixtyHz[0].progress).toBeCloseTo(oneTwentyHz[0].progress, 0);
        expect(sixtyHz[0].progress).toBeLessThanOrEqual(420);
    });

    it('clamps long stalled frames and lets one paused agent coexist with a walking one', () => {
        const paused = { ...agent, status: 'paused', progress: 10, point: { x: 10, y: 0 } };
        const next = advanceCandidateAgents([paused, agent], 10_000, 420);
        expect(next[0]).toBe(paused);
        expect(next[1].progress).toBeCloseTo(42);
    });
});

describe('fresh Codex review geometry regressions', () => {
    it('preserves real open ink paths as strokes instead of artificial filled polygons', () => {
        const object = graph.colliders.find(item => item.id === 'object:objects-053:path:01');
        expect(object).toBeTruthy();
        expect(object?.closed).toBe(false);
    });

    it('rejects routes that leave positive walk-path geometry', () => {
        const sparse = alternateGraph('blocked') as unknown as { walkSegments: Array<{ id: string; a: { x: number; y: number }; b: { x: number; y: number }; pathId: string }> };
        sparse.walkSegments = [{ id: 'walk:far', a: { x: 0, y: 500 }, b: { x: 100, y: 500 }, pathId: 'far' }];
        const route = planCandidateRoute(sparse as unknown as CandidateNavigationGraph, { x: 40, y: 40 }, 'target');
        expect(route.status).toBe('blocked');
        expect(route.failureCategory).toBe('route_leaves_walkable_geometry');
    });

    it('uses actual wall contact points for doorway aperture validation', () => {
        const graphWithWall = alternateGraph('open') as unknown as { colliders: Array<{ id: string; kind: 'wall'; points: Array<{ x: number; y: number }>; closed: boolean; thickness: number }> };
        graphWithWall.colliders = [{ id: 'wall:long-edge', kind: 'wall', points: [{ x: 100, y: 0 }, { x: 100, y: 300 }], closed: false, thickness: 8 }];
        const valid = planCandidateRoute(graphWithWall as unknown as CandidateNavigationGraph, { x: 40, y: 40 }, 'target');
        expect(valid.status).toBe('valid');
        const besideDoor = validateCandidateRouteSegments(graphWithWall as unknown as CandidateNavigationGraph, [{ x: 40, y: 220 }, { x: 160, y: 220 }], ['D01']);
        expect(besideDoor?.status).toBe('blocked');
        expect(besideDoor?.failureCategory).toBe('collision');
    });
});

describe('current merge-blocker regressions', () => {
    function walkSupportGraph(): CandidateNavigationGraph {
        return {
            rooms: [{ id: 'ROOM', name: 'Room', polygon: [{ x: 0, y: 0 }, { x: 500, y: 0 }, { x: 500, y: 500 }, { x: 0, y: 500 }], center: { x: 250, y: 250 } }],
            doors: [],
            agents: [],
            destinations: [{ id: 'target', label: 'target', kind: 'waypoint', point: { x: 260, y: 100 }, roomId: 'ROOM', roomIds: ['ROOM'], roomName: 'Room' }],
            colliders: [],
            walkNodes: [],
            walkSegments: [{ id: 'walk-main', a: { x: 80, y: 100 }, b: { x: 320, y: 100 }, pathId: 'walk-main' }],
            roomDiagnostics: [],
            nodeCount: 1,
            edgeCount: 1,
        };
    }

    it('rejects unsupported two-point same-room routes instead of treating them as connector-only', () => {
        const unsupported = validateCandidateRouteSegments(walkSupportGraph(), [{ x: 20, y: 400 }, { x: 300, y: 400 }], []);
        expect(unsupported?.status).toBe('blocked');
        expect(unsupported?.failureCategory).toBe('start_connector_unsupported');
    });

    it('rejects unsupported start and destination connectors with exact categories', () => {
        const graph = walkSupportGraph();
        const startFailure = validateCandidateRouteSegments(graph, [{ x: 800, y: 400 }, { x: 220, y: 100 }, { x: 260, y: 100 }], []);
        expect(startFailure?.failureCategory).toBe('start_connector_unsupported');
        const destinationFailure = validateCandidateRouteSegments(graph, [{ x: 90, y: 100 }, { x: 220, y: 100 }, { x: 800, y: 400 }], []);
        expect(destinationFailure?.failureCategory).toBe('destination_connector_unsupported');
    });

    it('allows a bounded endpoint ingress into positive walk support and is deterministic', () => {
        const graph = walkSupportGraph();
        const first = validateCandidateRouteSegments(graph, [{ x: 20, y: 100 }, { x: 220, y: 100 }, { x: 260, y: 100 }], []);
        expect(first).toBeNull();
        expect(validateCandidateRouteSegments(graph, [{ x: 20, y: 100 }, { x: 220, y: 100 }, { x: 260, y: 100 }], [])).toEqual(first);
    });

    it('blocks connector collider conflicts before positive-walk support decisions', () => {
        const graph = walkSupportGraph() as unknown as { colliders: CandidateNavigationGraph['colliders'] };
        graph.colliders = [{ id: 'object:connector-blocker', kind: 'object', points: [{ x: 40, y: 80 }, { x: 60, y: 80 }, { x: 60, y: 120 }, { x: 40, y: 120 }], closed: true, thickness: 8 }];
        const route = validateCandidateRouteSegments(graph as unknown as CandidateNavigationGraph, [{ x: 20, y: 100 }, { x: 220, y: 100 }], []);
        expect(route?.failureCategory).toBe('collision');
        expect(route?.reason).toContain('object:connector-blocker');
    });

    it('preserves POSITION_117 overlapping Central Nexus and Main Connecting Walkway membership', () => {
        const agent = graph.agents.find(item => item.positionId === 'POSITION_117');
        expect(agent?.roomIds).toEqual(['ROOM_CENTRAL_NEXUS', 'ROOM_MAIN_CONNECTING_WALKWAY']);
        const destination = graph.destinations.find(item => item.id === 'position:POSITION_034');
        const route = planCandidateRoute(graph, agent!.point, destination!.id);
        expect(route.status).toBe('valid');
        expect(route.crossedDoorIds).not.toContain('D38');
        expect(planCandidateRoute(graph, agent!.point, destination!.id)).toEqual(route);
    });

    it('uses overlapping membership to choose an allowed edge instead of a restricted edge', () => {
        const overlapGraph: CandidateNavigationGraph = {
            rooms: [
                { id: 'RESTRICTED', name: 'Restricted', polygon: [{ x: 0, y: 0 }, { x: 220, y: 0 }, { x: 220, y: 220 }, { x: 0, y: 220 }], center: { x: 110, y: 110 } },
                { id: 'WALKWAY', name: 'Walkway', polygon: [{ x: 0, y: 0 }, { x: 220, y: 0 }, { x: 220, y: 220 }, { x: 0, y: 220 }], center: { x: 110, y: 110 } },
                { id: 'TARGET', name: 'Target', polygon: [{ x: 220, y: 0 }, { x: 420, y: 0 }, { x: 420, y: 220 }, { x: 220, y: 220 }], center: { x: 320, y: 110 } },
            ],
            doors: [
                { id: 'D38', point: { x: 220, y: 60 }, zones: ['Restricted', 'Target'], zoneIds: ['RESTRICTED', 'TARGET'], accessMode: 'restricted', manualReviewRequired: false, apertureRadius: 80 },
                { id: 'D10', point: { x: 220, y: 160 }, zones: ['Walkway', 'Target'], zoneIds: ['WALKWAY', 'TARGET'], accessMode: 'open', manualReviewRequired: false, apertureRadius: 80 },
            ],
            agents: [],
            destinations: [{ id: 'target', label: 'target', kind: 'waypoint', point: { x: 320, y: 160 }, roomId: 'TARGET', roomIds: ['TARGET'], roomName: 'Target' }],
            colliders: [],
            walkNodes: [],
            walkSegments: [],
            roomDiagnostics: [],
            nodeCount: 3,
            edgeCount: 2,
        };
        const route = planCandidateRoute(overlapGraph, { x: 100, y: 100 }, 'target');
        expect(route.status).toBe('valid');
        expect(route.crossedDoorIds).toEqual(['D10']);
        expect(route.crossedDoorIds).not.toContain('D38');
    });

    it('inflates object and wall collisions by the candidate agent footprint', () => {
        const objectGraph = walkSupportGraph() as unknown as { colliders: CandidateNavigationGraph['colliders'] };
        objectGraph.colliders = [{ id: 'object:near-miss', kind: 'object', points: [{ x: 150, y: 138 }, { x: 170, y: 138 }], closed: false, thickness: 8 }];
        const objectRoute = validateCandidateRouteSegments(objectGraph as unknown as CandidateNavigationGraph, [{ x: 80, y: 100 }, { x: 260, y: 100 }], []);
        expect(objectRoute?.status).toBe('blocked');
        expect(objectRoute?.reason).toContain('object:near-miss');

        const wallGraph = walkSupportGraph() as unknown as { colliders: CandidateNavigationGraph['colliders'] };
        wallGraph.colliders = [{ id: 'wall:near-miss', kind: 'wall', points: [{ x: 150, y: 138 }, { x: 170, y: 138 }], closed: false, thickness: 8 }];
        const wallRoute = validateCandidateRouteSegments(wallGraph as unknown as CandidateNavigationGraph, [{ x: 80, y: 100 }, { x: 260, y: 100 }], []);
        expect(wallRoute?.status).toBe('blocked');
        expect(wallRoute?.reason).toContain('wall:near-miss');
    });

    it('rejects start and destination points whose footprint overlaps a collider', () => {
        const base = walkSupportGraph() as unknown as { colliders: CandidateNavigationGraph['colliders'] };
        base.colliders = [{ id: 'object:start-footprint', kind: 'object', points: [{ x: 30, y: 128 }, { x: 70, y: 128 }], closed: false, thickness: 8 }];
        expect(planCandidateRoute(base as unknown as CandidateNavigationGraph, { x: 50, y: 100 }, 'target').reason).toContain('footprint overlaps');
        const destinationGraph = walkSupportGraph() as unknown as { colliders: CandidateNavigationGraph['colliders'] };
        destinationGraph.colliders = [{ id: 'object:destination-footprint', kind: 'object', points: [{ x: 260, y: 128 }, { x: 300, y: 128 }], closed: false, thickness: 8 }];
        expect(planCandidateRoute(destinationGraph as unknown as CandidateNavigationGraph, { x: 80, y: 100 }, 'target').reason).toContain('footprint overlaps');
    });

    it('requires doorway usable aperture after subtracting footprint clearance', () => {
        const narrow = alternateGraph('open') as unknown as { doors: Array<{ apertureRadius: number }> };
        narrow.doors.forEach(door => { door.apertureRadius = 30; });
        const route = planCandidateRoute(narrow as unknown as CandidateNavigationGraph, { x: 40, y: 40 }, 'target');
        expect(route.status).toBe('blocked');
        expect(route.failureCategory).toBe('collision');
    });
});
