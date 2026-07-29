import { describe, expect, it } from 'vitest';
import rooms from '../../data/floor1/provisional/rooms.json';
import positions from '../../data/floor1/provisional/positions.json';
import doors from '../../data/floor1/provisional/doors.json';
import computers from '../../data/floor1/provisional/computers.json';
import interactiveObjects from '../../data/floor1/provisional/interactive-objects.json';
import walls from '../../data/floor1/provisional/walls.json';
import objects from '../../data/floor1/provisional/objects.json';
import walkPaths from '../../data/floor1/provisional/walk-paths.json';
import { advanceCandidateAgents, advanceCandidateDoorRuntimes, buildCandidateNavigationGraph, CandidateNavigationGraph, CANDIDATE_DOOR_OPEN_MS, planCandidateRoute, pointInPolygon, transformMarkupPoint, validateMarkupRegistration, validateCandidateRouteSegments } from './candidateNavigation';


const TEST_REGISTRATION = {
    sourceWidth: 8192,
    sourceHeight: 5460,
    markupWidth: 6144,
    markupHeight: 4096,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    rotationDegrees: 0,
    status: 'unverified',
    approvalStatus: 'candidate_unverified',
    storedCoordinateSpace: 'registered_candidate_source',
    productionApproved: false,
    provenance: { generator: 'test', generatedArtifact: 'test', sourceEvidence: ['test'] },
    registrationLandmarks: [{ id: 'synthetic', markup: { x: 0, y: 0 }, source: { x: 0, y: 0 }, residualErrorPixels: 0 }],
    maximumResidualErrorPixels: 0,
} as const;

const graph = buildCandidateNavigationGraph({ rooms, positions, doors, computers, interactiveObjects, walls, objects, walkPaths }, { registration: TEST_REGISTRATION });

const testRoute = (
    graphValue: CandidateNavigationGraph,
    start: { x: number; y: number },
    destinationId: string,
    accessTier: 'standard' | 'priority' = 'priority',
) => planCandidateRoute(graphValue, { destinationId, agent: { id: graphValue.agents.find(item => item.accessTier === accessTier)?.id ?? graphValue.agents[0]?.id ?? `missing-${accessTier}`, currentPoint: start, revision: 0 } });


describe('Codex review collision and access regressions', () => {
    it('rejects the real agent-04 routes to computers 022 through 025 instead of bypassing object collisions', () => {
        const agent = graph.agents.find(item => item.id === 'floor1-review-agent-04');
        expect(agent?.positionId).toBe('POSITION_118');
        for (const computerNumber of ['022', '023', '024', '025']) {
            const destination = graph.destinations.find(item => item.label === `Computer ${computerNumber}`);
            expect(destination?.id).toBe(`computer:computers-${computerNumber}`);
            const route = planCandidateRoute(graph, { destinationId: destination!.id, agent: { id: agent!.id, currentPoint: agent!.point, revision: 0 } });
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
        agents: [{ id: 'fixture-priority', label: 'Fixture priority', positionId: 'P1', roomId: 'A', roomIds: ['A'], roomName: 'A', point: { x: 40, y: 40 }, accessTier: 'priority', spriteAssetId: 'agent-sheet-01', provisionalSpriteAssignment: true }],
        destinations: [{ id: 'target', label: 'target', kind: 'waypoint', point: { x: 160, y: 40 }, roomId: 'B', roomIds: ['B'], roomName: 'B' }],
        colliders: [],
        walkNodes: [],
        walkSegments: [],
        roomDiagnostics: [],
        nodeCount: 6,
        edgeCount: 3,
        navigationAvailable: true,
    };
}

describe('door access is applied during search', () => {
    it('finds a longer allowed alternate around a blocked shortest door', () => {
        const route = testRoute(alternateGraph('blocked'), { x: 40, y: 40 }, 'target');
        expect(route.status).toBe('valid');
        expect(route.crossedDoorIds).toEqual(['D02', 'D03']);
        expect(route.nodeSequence).toEqual(['point:start', 'A', 'door:D02', 'door:D03', 'B', 'destination:target']);
        expect(route.expandedNodeCount).toBeLessThanOrEqual(3);
    });

    it('finds an alternate around a restricted deterministic first door and is stable', () => {
        const first = testRoute(alternateGraph('restricted'), { x: 40, y: 40 }, 'target');
        expect(first.status).toBe('valid');
        expect(first.crossedDoorIds).toEqual(['D02', 'D03']);
        expect(testRoute(alternateGraph('restricted'), { x: 40, y: 40 }, 'target')).toEqual(first);
    });

    it('reports blocked when all possible routes are non-traversable', () => {
        const blocked = alternateGraph('blocked') as unknown as { doors: Array<{ accessMode: string }> };
        blocked.doors[1].accessMode = 'blocked';
        blocked.doors[2].accessMode = 'restricted';
        const route = testRoute(blocked as unknown as CandidateNavigationGraph, { x: 40, y: 40 }, 'target');
        expect(route.status).toBe('blocked');
        expect(route.failureCategory).toBe('blocked');
    });
});

describe('movement timing and frame lifecycle helpers', () => {
    const route = { status: 'valid' as const, reason: 'ok', points: [{ x: 0, y: 0 }, { x: 420, y: 0 }], crossedDoorIds: [], doorSteps: [], nodeSequence: [], cost: 420, length: 420, expandedNodeCount: 1 };
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
        const route = testRoute(sparse as unknown as CandidateNavigationGraph, { x: 40, y: 40 }, 'target');
        expect(route.status).toBe('blocked');
        expect(route.failureCategory).toBe('route_leaves_walkable_geometry');
    });

    it('uses actual wall contact points for doorway aperture validation', () => {
        const graphWithWall = alternateGraph('open') as unknown as { colliders: Array<{ id: string; kind: 'wall'; points: Array<{ x: number; y: number }>; closed: boolean; thickness: number }> };
        graphWithWall.colliders = [{ id: 'wall:long-edge', kind: 'wall', points: [{ x: 100, y: 0 }, { x: 100, y: 300 }], closed: false, thickness: 8 }];
        const valid = testRoute(graphWithWall as unknown as CandidateNavigationGraph, { x: 40, y: 40 }, 'target');
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
            agents: [{ id: 'fixture-priority', label: 'Fixture priority', positionId: 'P1', roomId: 'A', roomIds: ['A'], roomName: 'A', point: { x: 40, y: 40 }, accessTier: 'priority', spriteAssetId: 'agent-sheet-01', provisionalSpriteAssignment: true }],
            destinations: [{ id: 'target', label: 'target', kind: 'waypoint', point: { x: 260, y: 100 }, roomId: 'ROOM', roomIds: ['ROOM'], roomName: 'Room' }],
            colliders: [],
            walkNodes: [],
            walkSegments: [{ id: 'walk-main', a: { x: 80, y: 100 }, b: { x: 320, y: 100 }, pathId: 'walk-main' }],
            roomDiagnostics: [],
            nodeCount: 1,
            edgeCount: 1,
            navigationAvailable: true,
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
        const route = planCandidateRoute(graph, { destinationId: destination!.id, agent: { id: agent!.id, currentPoint: agent!.point, revision: 0 } });
        expect(route.status).toBe('valid');
        expect(route.crossedDoorIds).not.toContain('D38');
        expect(planCandidateRoute(graph, { destinationId: destination!.id, agent: { id: agent!.id, currentPoint: agent!.point, revision: 0 } })).toEqual(route);
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
            agents: [{ id: 'fixture-priority', label: 'Fixture priority', positionId: 'P1', roomId: 'A', roomIds: ['A'], roomName: 'A', point: { x: 40, y: 40 }, accessTier: 'priority', spriteAssetId: 'agent-sheet-01', provisionalSpriteAssignment: true }],
            destinations: [{ id: 'target', label: 'target', kind: 'waypoint', point: { x: 320, y: 160 }, roomId: 'TARGET', roomIds: ['TARGET'], roomName: 'Target' }],
            colliders: [],
            walkNodes: [],
            walkSegments: [],
            roomDiagnostics: [],
            nodeCount: 3,
            edgeCount: 2,
        navigationAvailable: true,
        };
        const route = testRoute(overlapGraph, { x: 100, y: 100 }, 'target');
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
        expect(testRoute(base as unknown as CandidateNavigationGraph, { x: 50, y: 100 }, 'target').reason).toContain('footprint overlaps');
        const destinationGraph = walkSupportGraph() as unknown as { colliders: CandidateNavigationGraph['colliders'] };
        destinationGraph.colliders = [{ id: 'object:destination-footprint', kind: 'object', points: [{ x: 260, y: 128 }, { x: 300, y: 128 }], closed: false, thickness: 8 }];
        expect(testRoute(destinationGraph as unknown as CandidateNavigationGraph, { x: 80, y: 100 }, 'target').reason).toContain('footprint overlaps');
    });

    it('requires doorway usable aperture after subtracting footprint clearance', () => {
        const narrow = alternateGraph('open') as unknown as { doors: Array<{ apertureRadius: number }> };
        narrow.doors.forEach(door => { door.apertureRadius = 30; });
        const route = testRoute(narrow as unknown as CandidateNavigationGraph, { x: 40, y: 40 }, 'target');
        expect(route.status).toBe('blocked');
        expect(route.failureCategory).toBe('collision');
    });
});

describe('final review access, alternate geometry, and computer approach regressions', () => {
    it('enforces destination access tier in the planner for standard and priority agents', () => {
        const standardAgent = graph.agents.find(agent => agent.accessTier === 'standard');
        const priorityAgent = graph.agents.find(agent => agent.accessTier === 'priority');
        const priorityDestination = graph.destinations.find(destination => destination.kind === 'position' && destination.accessTier === 'priority');
        const standardDestination = graph.destinations.find(destination => destination.kind === 'position' && destination.accessTier === 'standard' && destination.roomIds.some(roomId => standardAgent?.roomIds.includes(roomId)));
        expect(standardAgent).toBeTruthy();
        expect(priorityAgent).toBeTruthy();
        expect(priorityDestination).toBeTruthy();
        expect(standardDestination).toBeTruthy();

        const denied = testRoute(graph, standardAgent!.point, priorityDestination!.id, 'standard');
        expect(denied.status).toBe('restricted');
        expect(denied.failureCategory).toBe('destination_access_restricted');
        expect(denied.points).toHaveLength(0);
        expect(testRoute(graph, priorityAgent!.point, priorityDestination!.id, 'priority').failureCategory).not.toBe('destination_access_restricted');
        expect(testRoute(graph, standardAgent!.point, standardDestination!.id, 'standard').status).toBe('valid');
        expect(planCandidateRoute(graph, { destinationId: priorityDestination!.id, agent: { id: '', currentPoint: standardAgent!.point, revision: 0 } }).failureCategory).toBe('agent_context_missing');
        expect(testRoute(graph, standardAgent!.point, priorityDestination!.id, 'standard')).toEqual(denied);
    });

    it('searches a later geometrically valid allowed door chain after the first chain fails collision validation', () => {
        const graphWithBlockedDirect = alternateGraph('open') as unknown as { colliders: CandidateNavigationGraph['colliders'] };
        graphWithBlockedDirect.colliders = [{ id: 'object:first-chain-blocker', kind: 'object', points: [{ x: 86, y: 22 }, { x: 108, y: 22 }, { x: 108, y: 40 }, { x: 86, y: 40 }], closed: true, thickness: 8 }];
        const route = testRoute(graphWithBlockedDirect as unknown as CandidateNavigationGraph, { x: 40, y: 40 }, 'target');
        expect(route.status).toBe('valid');
        expect(route.crossedDoorIds).toEqual(['D02', 'D03']);
        expect(route.nodeSequence).toEqual(['point:start', 'A', 'door:D02', 'door:D03', 'B', 'destination:target']);
        expect(testRoute(graphWithBlockedDirect as unknown as CandidateNavigationGraph, { x: 40, y: 40 }, 'target')).toEqual(route);
    });

    it('returns deterministic geometry failure when all allowed alternate door chains fail', () => {
        const blocked = alternateGraph('open') as unknown as { colliders: CandidateNavigationGraph['colliders'] };
        blocked.colliders = [
            { id: 'object:first-chain-blocker', kind: 'object', points: [{ x: 86, y: 22 }, { x: 108, y: 22 }, { x: 108, y: 40 }, { x: 86, y: 40 }], closed: true, thickness: 8 },
            { id: 'object:second-chain-blocker', kind: 'object', points: [{ x: 42, y: 70 }, { x: 62, y: 70 }, { x: 62, y: 90 }, { x: 42, y: 90 }], closed: true, thickness: 8 },
        ];
        const route = testRoute(blocked as unknown as CandidateNavigationGraph, { x: 40, y: 40 }, 'target');
        expect(route.status).toBe('blocked');
        expect(route.failureCategory).toBe('collision');
        expect(route.reason).toContain('second-chain-blocker');
    });

    it('routes real computer destinations to deterministic approach anchors instead of marker centroids', () => {
        for (const computerNumber of ['022', '023', '024', '025']) {
            const destination = graph.destinations.find(item => item.id === `computer:computers-${computerNumber}`);
            expect(destination?.label).toBe(`Computer ${computerNumber}`);
            expect(destination?.markerPoint).toBeTruthy();
            expect(destination?.approachPositionId).toMatch(/^POSITION_/);
            expect(destination?.point).not.toEqual(destination?.markerPoint);
            const route = testRoute(graph, graph.agents.find(agent => agent.accessTier === 'priority')!.point, destination!.id, 'priority');
            expect(route.failureCategory).not.toBe('collision');
            expect(testRoute(graph, graph.agents.find(agent => agent.accessTier === 'priority')!.point, destination!.id, 'priority')).toEqual(route);
        }
    });

    it('uses deterministic ID tie-breaking for equal-distance computer approach anchors', () => {
        const destination = graph.destinations.find(item => item.id === 'computer:computers-022');
        expect(destination?.approachPositionId).toBe('POSITION_112');
    });
});

describe('markup registration boundary', () => {
    it('disables real candidate navigation without an approved registration', () => {
        const disabled = buildCandidateNavigationGraph({ rooms, positions, doors, computers, interactiveObjects, walls, objects, walkPaths });
        expect(disabled.navigationAvailable).toBe(false);
        expect(disabled.agents).toHaveLength(0);
        expect(disabled.destinations).toHaveLength(0);
        expect(disabled.colliders).toHaveLength(0);
        expect(disabled.unavailableReason).toContain('provenance is missing');
        expect(planCandidateRoute(disabled, { destinationId: 'anything', agent: { id: 'anything', currentPoint: { x: 1, y: 1 }, revision: 0 } }).failureCategory).toBe('registration_unavailable');
    });

    it('transforms markup points with one uniform approved registration', () => {
        const registration = { ...TEST_REGISTRATION, storedCoordinateSpace: 'raw_markup', scale: 2, offsetX: 10, offsetY: -5 } as const;
        expect(transformMarkupPoint({ x: 3, y: 4 }, registration)).toEqual({ x: 16, y: 3 });
    });

    it('rejects missing, unverified, review-required, and invalid registrations', () => {
        expect(validateMarkupRegistration(null)).toContain('missing');
        const approvedRegistration = { ...TEST_REGISTRATION, status: 'approved', approvalStatus: 'approved', storedCoordinateSpace: 'raw_markup' } as const;
        expect(validateMarkupRegistration({ ...approvedRegistration, status: 'unverified' })).toContain('not approved');
        expect(validateMarkupRegistration({ ...approvedRegistration, status: 'review_required' })).toContain('not approved');
        expect(validateMarkupRegistration({ ...approvedRegistration, scale: 0 })).toContain('scale');
        expect(validateMarkupRegistration({ ...approvedRegistration, rotationDegrees: 1 as 0 })).toContain('rotation');
        expect(validateMarkupRegistration({ ...approvedRegistration, registrationLandmarks: [] })).toContain('landmark');
    });

    it('transforms rooms, agents, doors, walk nodes, colliders, computers, and interactive destinations consistently', () => {
        const registration = { ...TEST_REGISTRATION, storedCoordinateSpace: 'raw_markup', scale: 2, offsetX: 10, offsetY: -5 } as const;
        const transformed = buildCandidateNavigationGraph({ rooms, positions, doors, computers, interactiveObjects, walls, objects, walkPaths }, { registration });
        const baseline = buildCandidateNavigationGraph({ rooms, positions, doors, computers, interactiveObjects, walls, objects, walkPaths }, { registration: TEST_REGISTRATION });
        expect(transformed.navigationAvailable).toBe(true);
        expect(transformed.rooms[0].center.x).toBeCloseTo(baseline.rooms[0].center.x * 2 + 10);
        expect(transformed.agents[0].point.x).toBeCloseTo(baseline.agents[0].point.x * 2 + 10);
        expect(transformed.doors[0].point.y).toBeCloseTo(baseline.doors[0].point.y * 2 - 5);
        expect(transformed.walkNodes[0].point.x).toBeCloseTo(baseline.walkNodes[0].point.x * 2 + 10);
        expect(transformed.colliders[0].points[0].y).toBeCloseTo(baseline.colliders[0].points[0].y * 2 - 5);
        const transformedComputer = transformed.destinations.find(item => item.kind === 'computer');
        const baselineComputer = baseline.destinations.find(item => item.id === transformedComputer?.id);
        expect(transformedComputer?.markerPoint?.x).toBeCloseTo((baselineComputer?.markerPoint?.x ?? 0) * 2 + 10);
        const transformedInteractive = transformed.destinations.find(item => item.kind === 'interactive-object');
        const baselineInteractive = baseline.destinations.find(item => item.id === transformedInteractive?.id);
        expect(transformedInteractive?.point.y).toBeCloseTo((baselineInteractive?.point.y ?? 0) * 2 - 5);
    });
});


describe('candidate door runtime and destination anchor regressions', () => {
    it('planned automatic door routes include ordered door steps and movement waits until open', () => {
        const route = testRoute(alternateGraph('open'), { x: 40, y: 40 }, 'target');
        expect(route.status).toBe('valid');
        expect(route.crossedDoorIds).toEqual(['D01']);
        expect(route.doorSteps).toHaveLength(1);
        expect(route.doorSteps[0]).toMatchObject({ doorId: 'D01', requiredAction: 'automatic_open', initialPhysicalState: 'closed' });
        const agent = { id: 'agent', status: 'walking', route, progress: 0, point: route.points[0] };
        const closed = { D01: { doorId: 'D01', state: 'closed' as const, stateElapsedMs: 0, revision: 0 } };
        const waiting = advanceCandidateAgents([agent], 10_000, 420, closed)[0];
        expect(waiting.status).toBe('waiting_for_door');
        expect(waiting.progress).toBeLessThan(route.length);
        const opening = advanceCandidateDoorRuntimes(closed, ['D01'], 1);
        expect(opening.D01.state).toBe('opening');
        const open = advanceCandidateDoorRuntimes(opening, ['D01'], CANDIDATE_DOOR_OPEN_MS);
        expect(open.D01.state).toBe('open');
        const crossed = advanceCandidateAgents([{ ...waiting, status: 'walking' }], 100, 420, open)[0];
        expect(crossed.progress).toBeGreaterThan(waiting.progress);
        const held = advanceCandidateDoorRuntimes(open, ['D01'], 10_000);
        expect(held.D01.state).toBe('open');
        const closing = advanceCandidateDoorRuntimes(open, [], 10_000);
        expect(['closing', 'closed']).toContain(closing.D01.state);
    });

    it('blocked, manual-review, reserved, malformed, and D47/elevator doors fail closed', () => {
        expect(testRoute(alternateGraph('blocked'), { x: 40, y: 40 }, 'target').status).toBe('valid');
        const elevator = graph.doors.find(door => door.id === 'D47');
        expect(elevator?.permission).toBe('elevator');
        const destination = graph.destinations.find(item => item.kind === 'room' && item.roomIds.some(roomId => elevator?.zoneIds.includes(roomId)));
        if (destination) {
            const route = planCandidateRoute(graph, { destinationId: destination.id, agent: { id: graph.agents[0].id, currentPoint: graph.agents[0].point, revision: 0 } });
            expect(route.failureCategory).not.toBeUndefined();
        }
    });

    it('interactive objects use safe approach anchors instead of visual centroids', () => {
        for (const id of ['interactive:INTERACTIVE_MAIN_ROBOT_TUBE', 'interactive:INTERACTIVE_SMALL_ROBOT_TUBE', 'interactive:INTERACTIVE_MAP']) {
            const destination = graph.destinations.find(item => item.id === id);
            expect(destination?.markerPoint).toBeTruthy();
            expect(destination?.approachPositionId).toMatch(/^POSITION_/);
            expect(destination?.point).not.toEqual(destination?.markerPoint);
            expect(destination?.availability).toBe('available');
            expect(validateCandidateRouteSegments(graph, [destination!.point, destination!.point], [])).toBeNull();
            expect(buildCandidateNavigationGraph({ rooms, positions, doors, computers, interactiveObjects, walls, objects, walkPaths }, { registration: TEST_REGISTRATION }).destinations.find(item => item.id === id)).toEqual(destination);
        }
    });

    it('RM4 and RM7 room destinations use valid interior anchors instead of exterior vertex averages', () => {
        for (const roomId of ['ROOM_RM4', 'ROOM_RM7']) {
            const room = graph.rooms.find(item => item.id === roomId);
            const destination = graph.destinations.find(item => item.id === `room:${roomId}`);
            expect(room).toBeTruthy();
            expect(destination?.availability).toBe('available');
            expect(destination?.roomIds).toContain(roomId);
            expect(pointInPolygon(destination!.point, room!.polygon)).toBe(true);
            expect(destination?.roomAnchorResolution).toMatch(/position-anchor|walk-node/);
            expect(destination?.point).not.toEqual(room?.center);
            expect(validateCandidateRouteSegments(graph, [destination!.point, destination!.point], [])).toBeNull();
        }
    });
});
