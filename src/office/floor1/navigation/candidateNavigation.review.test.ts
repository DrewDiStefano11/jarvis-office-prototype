import { describe, expect, it } from 'vitest';
import rooms from '../../data/floor1/provisional/rooms.json';
import positions from '../../data/floor1/provisional/positions.json';
import doors from '../../data/floor1/provisional/doors.json';
import computers from '../../data/floor1/provisional/computers.json';
import interactiveObjects from '../../data/floor1/provisional/interactive-objects.json';
import walls from '../../data/floor1/provisional/walls.json';
import objects from '../../data/floor1/provisional/objects.json';
import walkPaths from '../../data/floor1/provisional/walk-paths.json';
import type { MarkupRegistration } from './candidateNavigation';
import { activeCandidateDoorRequestIds,
    candidateWalkEndpointConnectors,
    INTERACTIVE_APPROACH_MAX_DISTANCE, advanceCandidateAgents, advanceCandidateDoorRuntimes, buildCandidateNavigationGraph, CandidateNavigationGraph, CANDIDATE_DOOR_OPEN_MS, computeCandidateRegistrationResiduals, planCandidateRoute, pointInPolygon, transformMarkupPoint, validateCandidateReviewRegistration, validateMarkupRegistration, validateCandidateRouteDoorClearance, validateCandidateRouteSegments } from './candidateNavigation';


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


function reviewedRegistration(overrides: Partial<MarkupRegistration> = {}): MarkupRegistration {
    const registration = { ...TEST_REGISTRATION, ...overrides } as MarkupRegistration;
    const landmarks = overrides.registrationLandmarks ?? [
        { id: 'nw', markup: { x: 0, y: 0 } },
        { id: 'ne', markup: { x: Math.min(registration.markupWidth, (registration.sourceWidth - registration.offsetX) / registration.scale), y: 0 } },
        { id: 'sw', markup: { x: 0, y: Math.min(registration.markupHeight, (registration.sourceHeight - registration.offsetY) / registration.scale) } },
        { id: 'se', markup: { x: Math.min(registration.markupWidth, (registration.sourceWidth - registration.offsetX) / registration.scale), y: Math.min(registration.markupHeight, (registration.sourceHeight - registration.offsetY) / registration.scale) } },
    ].map(landmark => ({
        ...landmark,
        source: { x: landmark.markup.x * registration.scale + registration.offsetX, y: landmark.markup.y * registration.scale + registration.offsetY },
        residualErrorPixels: 0,
    }));
    return { ...registration, registrationLandmarks: landmarks, maximumResidualErrorPixels: overrides.maximumResidualErrorPixels ?? 0 };
}

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
        expect(agent?.positionId).not.toBe('POSITION_118');
        for (const computerNumber of ['022', '023', '024', '025']) {
            const destination = graph.destinations.find(item => item.label === `Computer ${computerNumber}`);
            expect(destination?.id).toBe(`computer:computers-${computerNumber}`);
            const route = planCandidateRoute(graph, { destinationId: destination!.id, agent: { id: agent!.id, currentPoint: agent!.point, revision: 0 } });
            expect(route.status).toBe('blocked');
            expect(route.status).not.toBe('valid');
            expect(route.failureCategory).toBeTruthy();
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
            { id: 'D01', point: { x: 100, y: 50 }, zones: ['A', 'B'], zoneIds: ['A', 'B'], accessMode: firstDoorMode, manualReviewRequired: false, apertureRadius: 35 },
            { id: 'D02', point: { x: 50, y: 100 }, zones: ['A', 'C'], zoneIds: ['A', 'C'], accessMode: 'open', manualReviewRequired: false, apertureRadius: 35 },
            { id: 'D03', point: { x: 150, y: 100 }, zones: ['C', 'B'], zoneIds: ['C', 'B'], accessMode: 'open', manualReviewRequired: false, apertureRadius: 35 },
        ],
        agents: [{ id: 'fixture-priority', label: 'Fixture priority', positionId: 'P1', roomId: 'A', roomIds: ['A'], roomName: 'A', point: { x: 40, y: 40 }, accessTier: 'priority', spriteAssetId: 'agent-sheet-01', provisionalSpriteAssignment: true }],
        destinations: [{ id: 'target', label: 'target', kind: 'waypoint', point: { x: 185, y: 40 }, roomId: 'B', roomIds: ['B'], roomName: 'B' }],
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
        expect(route.nodeSequence).toEqual(['point:start', 'A', 'door:D02', 'C', 'door:D03', 'B', 'destination:target']);
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
        expect(['route_leaves_walkable_geometry', 'walk_network_disconnected']).toContain(route.failureCategory);
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
        expect(['valid', 'blocked']).toContain(route.status);
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
                { id: 'D38', point: { x: 220, y: 60 }, zones: ['Restricted', 'Target'], zoneIds: ['RESTRICTED', 'TARGET'], accessMode: 'restricted', manualReviewRequired: false, apertureRadius: 35 },
                { id: 'D10', point: { x: 220, y: 160 }, zones: ['Walkway', 'Target'], zoneIds: ['WALKWAY', 'TARGET'], accessMode: 'open', manualReviewRequired: false, apertureRadius: 35 },
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
        expect(['valid', 'blocked']).toContain(testRoute(graph, standardAgent!.point, standardDestination!.id, 'standard').status);
        expect(planCandidateRoute(graph, { destinationId: priorityDestination!.id, agent: { id: '', currentPoint: standardAgent!.point, revision: 0 } }).failureCategory).toBe('agent_context_missing');
        expect(testRoute(graph, standardAgent!.point, priorityDestination!.id, 'standard')).toEqual(denied);
    });

    it('searches a later geometrically valid allowed door chain after the first chain fails collision validation', () => {
        const graphWithBlockedDirect = alternateGraph('open') as unknown as { colliders: CandidateNavigationGraph['colliders'] };
        graphWithBlockedDirect.colliders = [{ id: 'object:first-chain-blocker', kind: 'object', points: [{ x: 86, y: 22 }, { x: 108, y: 22 }, { x: 108, y: 40 }, { x: 86, y: 40 }], closed: true, thickness: 8 }];
        const route = testRoute(graphWithBlockedDirect as unknown as CandidateNavigationGraph, { x: 40, y: 40 }, 'target');
        expect(route.status).toBe('valid');
        expect(route.crossedDoorIds).toEqual(['D02', 'D03']);
        expect(route.nodeSequence).toEqual(['point:start', 'A', 'door:D02', 'C', 'door:D03', 'B', 'destination:target']);
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

    it('recomputes candidate registration residuals from landmark coordinate pairs', () => {
        const residuals = computeCandidateRegistrationResiduals(TEST_REGISTRATION);
        expect(residuals.computedMaximumResidualPixels).toBe(0);
        expect(residuals.landmarkResiduals.map(item => item.computedResidualPixels)).toEqual([0, 0, 0, 0]);
        expect(validateCandidateReviewRegistration(TEST_REGISTRATION)).toBeNull();

        const inconsistentZero = reviewedRegistration({
            registrationLandmarks: [
                ...TEST_REGISTRATION.registrationLandmarks.slice(0, 3),
                { ...TEST_REGISTRATION.registrationLandmarks[3], source: { x: 8180, y: 5460 }, residualErrorPixels: 0 },
            ],
            maximumResidualErrorPixels: 0,
        });
        expect(computeCandidateRegistrationResiduals(inconsistentZero).computedMaximumResidualPixels).toBe(12);
        expect(validateCandidateReviewRegistration(inconsistentZero)).toContain('registration_residual_mismatch');
    });

    it('rejects stale declared residual evidence and calculated residuals above tolerance', () => {
        const staleLandmarkResidual = reviewedRegistration({
            registrationLandmarks: TEST_REGISTRATION.registrationLandmarks.map((landmark, index) => index === 0 ? { ...landmark, residualErrorPixels: 1 } : landmark),
            maximumResidualErrorPixels: 1,
        });
        expect(validateCandidateReviewRegistration(staleLandmarkResidual)).toContain('registration_residual_mismatch');

        const staleMaximum = reviewedRegistration({ maximumResidualErrorPixels: 1 });
        expect(validateCandidateReviewRegistration(staleMaximum)).toContain('registration_maximum_residual_mismatch');

        const aboveTolerance = reviewedRegistration({
            registrationLandmarks: TEST_REGISTRATION.registrationLandmarks.map((landmark, index) => index === 3 ? { ...landmark, source: { x: landmark.source.x - 9, y: landmark.source.y }, residualErrorPixels: 9 } : landmark),
            maximumResidualErrorPixels: 9,
        });
        expect(validateCandidateReviewRegistration(aboveTolerance)).toContain('registration_residual_exceeds_tolerance');
    });

    it('continues to reject invalid, clustered, duplicate, and out-of-bounds reviewed landmarks', () => {
        expect(validateCandidateReviewRegistration(reviewedRegistration({ registrationLandmarks: TEST_REGISTRATION.registrationLandmarks.slice(0, 3) }))).toContain('registration_landmarks_insufficient');
        expect(validateCandidateReviewRegistration(reviewedRegistration({ registrationLandmarks: TEST_REGISTRATION.registrationLandmarks.map(landmark => ({ ...landmark, source: { x: 100, y: 100 }, markup: { x: 100, y: 100 } })) }))).toContain('registration_landmarks_not_distributed');
        expect(validateCandidateReviewRegistration(reviewedRegistration({ registrationLandmarks: TEST_REGISTRATION.registrationLandmarks.map((landmark, index) => index === 1 ? { ...landmark, id: 'nw' } : landmark) }))).toContain('registration_landmark_invalid');
        expect(validateCandidateReviewRegistration(reviewedRegistration({ registrationLandmarks: TEST_REGISTRATION.registrationLandmarks.map((landmark, index) => index === 0 ? { ...landmark, markup: { x: -1, y: 0 } } : landmark) }))).toContain('registration_landmark_invalid');
        expect(validateCandidateReviewRegistration(reviewedRegistration({ registrationLandmarks: TEST_REGISTRATION.registrationLandmarks.map((landmark, index) => index === 0 ? { ...landmark, source: { x: Number.NaN, y: 0 } } : landmark) }))).toContain('registration_landmark_invalid');
        expect(validateCandidateReviewRegistration(reviewedRegistration({ registrationLandmarks: TEST_REGISTRATION.registrationLandmarks.map((landmark, index) => index === 0 ? { ...landmark, residualErrorPixels: -1 } : landmark) }))).toContain('registration_residual_invalid');
    });

    it('transforms rooms, agents, doors, walk nodes, colliders, computers, and interactive destinations consistently', () => {
        const registration = reviewedRegistration({ storedCoordinateSpace: 'raw_markup', scale: 1.01, offsetX: 3, offsetY: 0 });
        const transformed = buildCandidateNavigationGraph({ rooms, positions, doors, computers, interactiveObjects, walls, objects, walkPaths }, { registration });
        const baseline = buildCandidateNavigationGraph({ rooms, positions, doors, computers, interactiveObjects, walls, objects, walkPaths }, { registration: TEST_REGISTRATION });
        expect(transformed.navigationAvailable).toBe(true);
        expect(transformed.rooms[0].center.x).toBeCloseTo(baseline.rooms[0].center.x * 1.01 + 3);
        expect(transformed.agents[0].point.x).toBeCloseTo(baseline.agents[0].point.x * 1.01 + 3);
        expect(transformed.doors[0].point.y).toBeCloseTo(baseline.doors[0].point.y * 1.01);
        expect(transformed.walkNodes[0].point.x).toBeCloseTo(baseline.walkNodes[0].point.x * 1.01 + 3);
        expect(transformed.colliders[0].points[0].y).toBeCloseTo(baseline.colliders[0].points[0].y * 1.01);
        const transformedComputer = transformed.destinations.find(item => item.kind === 'computer');
        const baselineComputer = baseline.destinations.find(item => item.id === transformedComputer?.id);
        expect(transformedComputer?.markerPoint?.x).toBeCloseTo((baselineComputer?.markerPoint?.x ?? 0) * 1.01 + 3);
        const transformedInteractive = transformed.destinations.find(item => item.kind === 'interactive-object');
        const baselineInteractive = baseline.destinations.find(item => item.id === transformedInteractive?.id);
        expect(transformedInteractive?.markerPoint?.y).toBeCloseTo((baselineInteractive?.markerPoint?.y ?? 0) * 1.01);
    });
});



describe('room destination access tiers and walk connector candidate search', () => {
    function roomAccessGraph(): CandidateNavigationGraph {
        return {
            rooms: [
                { id: 'START', name: 'Start', polygon: [{ x: 0, y: 0 }, { x: 240, y: 0 }, { x: 240, y: 240 }, { x: 0, y: 240 }], center: { x: 120, y: 120 } },
                { id: 'CONF', name: 'Conference', polygon: [{ x: 240, y: 0 }, { x: 520, y: 0 }, { x: 520, y: 240 }, { x: 240, y: 240 }], center: { x: 380, y: 120 } },
                { id: 'BOARD', name: 'Boardroom', polygon: [{ x: 240, y: 240 }, { x: 520, y: 240 }, { x: 520, y: 520 }, { x: 240, y: 520 }], center: { x: 380, y: 380 } },
                { id: 'FOCUS', name: 'Focus', polygon: [{ x: 0, y: 240 }, { x: 240, y: 240 }, { x: 240, y: 520 }, { x: 0, y: 520 }], center: { x: 120, y: 380 } },
            ],
            doors: [
                { id: 'D-CONF', point: { x: 240, y: 120 }, zones: ['Start', 'Conference'], zoneIds: ['START', 'CONF'], accessMode: 'open', permission: 'general', manualReviewRequired: false, apertureRadius: 80 },
                { id: 'D-BOARD', point: { x: 240, y: 260 }, zones: ['Start', 'Boardroom'], zoneIds: ['START', 'BOARD'], accessMode: 'open', permission: 'general', manualReviewRequired: false, apertureRadius: 80 },
                { id: 'D-FOCUS', point: { x: 120, y: 240 }, zones: ['Start', 'Focus'], zoneIds: ['START', 'FOCUS'], accessMode: 'open', permission: 'general', manualReviewRequired: false, apertureRadius: 80 },
            ],
            agents: [
                { id: 'standard-agent', label: 'Standard', positionId: 'S1', roomId: 'START', roomIds: ['START'], roomName: 'Start', point: { x: 80, y: 80 }, accessTier: 'standard', spriteAssetId: 'agent-sheet-01', provisionalSpriteAssignment: true },
                { id: 'priority-agent', label: 'Priority', positionId: 'P1', roomId: 'START', roomIds: ['START'], roomName: 'Start', point: { x: 90, y: 80 }, accessTier: 'priority', spriteAssetId: 'agent-sheet-02', provisionalSpriteAssignment: true },
            ],
            destinations: [
                { id: 'room:CONF', label: 'Conference', kind: 'room', point: { x: 380, y: 120 }, roomId: 'CONF', roomIds: ['CONF'], roomName: 'Conference', roomAnchorResolution: 'position-anchor', roomAnchorSourceId: 'POSITION_PRIORITY_CONF', roomAnchorSourceTier: 'priority' },
                { id: 'room:BOARD', label: 'Boardroom', kind: 'room', point: { x: 380, y: 380 }, roomId: 'BOARD', roomIds: ['BOARD'], roomName: 'Boardroom', roomAnchorResolution: 'position-anchor', roomAnchorSourceId: 'POSITION_PRIORITY_BOARD', roomAnchorSourceTier: 'priority' },
                { id: 'room:FOCUS', label: 'Focus', kind: 'room', point: { x: 120, y: 380 }, roomId: 'FOCUS', roomIds: ['FOCUS'], roomName: 'Focus', roomAnchorResolution: 'position-anchor', roomAnchorSourceId: 'POSITION_PRIORITY_FOCUS', roomAnchorSourceTier: 'priority' },
                { id: 'position:PRIORITY', label: 'Priority seat', kind: 'position', point: { x: 380, y: 130 }, roomId: 'CONF', roomIds: ['CONF'], roomName: 'Conference', accessTier: 'priority' },
                { id: 'position:STANDARD', label: 'Standard seat', kind: 'position', point: { x: 380, y: 140 }, roomId: 'CONF', roomIds: ['CONF'], roomName: 'Conference', accessTier: 'standard' },
            ],
            colliders: [],
            walkNodes: [],
            walkSegments: [],
            roomDiagnostics: [],
            nodeCount: 11,
            edgeCount: 3,
            navigationAvailable: true,
        };
    }

    function connectorGraph(overrides: Partial<CandidateNavigationGraph> = {}): CandidateNavigationGraph {
        const base: CandidateNavigationGraph = {
            rooms: [{ id: 'ROOM', name: 'Room', polygon: [{ x: -100, y: -100 }, { x: 700, y: -100 }, { x: 700, y: 700 }, { x: -100, y: 700 }], center: { x: 300, y: 300 } }],
            doors: [],
            agents: [{ id: 'agent', label: 'Agent', positionId: 'S1', roomId: 'ROOM', roomIds: ['ROOM'], roomName: 'Room', point: { x: 90, y: 0 }, accessTier: 'standard', spriteAssetId: 'agent-sheet-01', provisionalSpriteAssignment: true }],
            destinations: [{ id: 'target', label: 'Target', kind: 'waypoint', point: { x: 560, y: 0 }, roomId: 'ROOM', roomIds: ['ROOM'], roomName: 'Room' }],
            colliders: [],
            walkNodes: [],
            walkSegments: [
                { id: 'isolated-nearest', a: { x: 100, y: 0 }, b: { x: 120, y: 0 }, pathId: 'isolated' },
                { id: 'connected-a', a: { x: 430, y: 0 }, b: { x: 480, y: 0 }, pathId: 'connected' },
                { id: 'connected-b', a: { x: 480, y: 0 }, b: { x: 500, y: 0 }, pathId: 'connected' },
            ],
            roomDiagnostics: [],
            nodeCount: 6,
            edgeCount: 3,
            navigationAvailable: true,
        };
        return { ...base, ...overrides };
    }

    it('keeps real room destinations neutral even when backed by priority position anchors', () => {
        for (const roomId of ['ROOM_EXECUTIVE_BOARDROOM', 'ROOM_CONFERENCE_1', 'ROOM_CONFERENCE_2', 'ROOM_FOCUS_A', 'ROOM_FOCUS_B', 'ROOM_FOCUS_C', 'ROOM_FOCUS_D']) {
            const destination = graph.destinations.find(item => item.id === `room:${roomId}`);
            const room = graph.rooms.find(item => item.id === roomId);
            expect(destination).toBeTruthy();
            expect(destination?.kind).toBe('room');
            expect(destination?.accessTier).toBeUndefined();
            expect(destination?.roomAnchorSourceTier).toBe('priority');
            expect(destination?.roomAnchorSourceId).toMatch(/^POSITION_/);
            expect(destination?.roomAnchorResolution).toBe('position-anchor');
            expect(pointInPolygon(destination!.point, room!.polygon)).toBe(true);
            expect(validateCandidateRouteSegments(graph, [destination!.point, destination!.point], [])).toBeNull();
        }
        expect(buildCandidateNavigationGraph({ rooms, positions, doors, computers, interactiveObjects, walls, objects, walkPaths }, { registration: TEST_REGISTRATION }).destinations.filter(item => item.kind === 'room').map(item => [item.id, item.accessTier, item.roomAnchorSourceId])).toEqual(graph.destinations.filter(item => item.kind === 'room').map(item => [item.id, item.accessTier, item.roomAnchorSourceId]));
    });

    it('allows standard agents to route to accessible room destinations without inheriting priority seat metadata', () => {
        const accessGraph = roomAccessGraph();
        for (const destinationId of ['room:CONF', 'room:BOARD', 'room:FOCUS']) {
            const destination = accessGraph.destinations.find(item => item.id === destinationId)!;
            expect(destination.accessTier).toBeUndefined();
            expect(destination.roomAnchorSourceTier).toBe('priority');
            const standardRoute = planCandidateRoute(accessGraph, { destinationId, agent: { id: 'standard-agent', currentPoint: accessGraph.agents[0].point, revision: 0 } });
            expect(standardRoute.status).toBe('valid');
            const priorityRoute = planCandidateRoute(accessGraph, { destinationId, agent: { id: 'priority-agent', currentPoint: accessGraph.agents[1].point, revision: 0 } });
            expect(priorityRoute.status).toBe('valid');
        }
        expect(planCandidateRoute(accessGraph, { destinationId: 'position:PRIORITY', agent: { id: 'standard-agent', currentPoint: accessGraph.agents[0].point, revision: 0 } }).failureCategory).toBe('destination_access_restricted');
        expect(planCandidateRoute(accessGraph, { destinationId: 'position:STANDARD', agent: { id: 'standard-agent', currentPoint: accessGraph.agents[0].point, revision: 0 } }).status).toBe('valid');
    });

    it('still uses actual door restrictions rather than room anchor metadata for room authorization', () => {
        const restricted = roomAccessGraph() as unknown as { doors: Array<{ accessMode: string; permission: 'general' | 'restricted' }> };
        restricted.doors[0].accessMode = 'restricted';
        restricted.doors[0].permission = 'restricted';
        const route = planCandidateRoute(restricted as unknown as CandidateNavigationGraph, { destinationId: 'room:CONF', agent: { id: 'standard-agent', currentPoint: { x: 80, y: 80 }, revision: 0 } });
        expect(route.status).toBe('restricted');
    });

    it('searches a farther start connector when the nearest endpoint is isolated', () => {
        const route = planCandidateRoute(connectorGraph(), { destinationId: 'target', agent: { id: 'agent', currentPoint: { x: 90, y: 0 }, revision: 0 } });
        expect(route.status).toBe('valid');
        expect(route.points).toContainEqual({ x: 430, y: 0 });
        expect(route.points).toContainEqual({ x: 500, y: 0 });
        expect(route.points).not.toEqual([{ x: 90, y: 0 }, { x: 560, y: 0 }]);
        expect(route.cost).toBeGreaterThan(0);
        expect(planCandidateRoute(connectorGraph(), { destinationId: 'target', agent: { id: 'agent', currentPoint: { x: 90, y: 0 }, revision: 0 } })).toEqual(route);
    });

    it('searches a farther destination connector when the nearest endpoint is isolated', () => {
        const testGraph = connectorGraph({
            agents: [{ id: 'agent', label: 'Agent', positionId: 'S1', roomId: 'ROOM', roomIds: ['ROOM'], roomName: 'Room', point: { x: 500, y: 0 }, accessTier: 'standard', spriteAssetId: 'agent-sheet-01', provisionalSpriteAssignment: true }],
            destinations: [{ id: 'target', label: 'Target', kind: 'waypoint', point: { x: 125, y: 0 }, roomId: 'ROOM', roomIds: ['ROOM'], roomName: 'Room' }],
        });
        const route = planCandidateRoute(testGraph, { destinationId: 'target', agent: { id: 'agent', currentPoint: { x: 500, y: 0 }, revision: 0 } });
        expect(route.status).toBe('valid');
        expect(route.points).toContainEqual({ x: 500, y: 0 });
        expect(route.points).toContainEqual({ x: 430, y: 0 });
    });

    it('rejects nearest colliding connectors and selects farther collision-free connectors', () => {
        for (const kind of ['object', 'wall'] as const) {
            const testGraph = connectorGraph({
                agents: [{ id: 'agent', label: 'Agent', positionId: 'S1', roomId: 'ROOM', roomIds: ['ROOM'], roomName: 'Room', point: { x: 0, y: 0 }, accessTier: 'standard', spriteAssetId: 'agent-sheet-01', provisionalSpriteAssignment: true }],
                destinations: [{ id: 'target', label: 'Target', kind: 'waypoint', point: { x: 0, y: 310 }, roomId: 'ROOM', roomIds: ['ROOM'], roomName: 'Room' }],
                colliders: [{ id: `${kind}:block-nearest`, kind, points: [{ x: 40, y: -20 }, { x: 60, y: -20 }, { x: 60, y: 20 }, { x: 40, y: 20 }], closed: true, thickness: 8 }],
                walkSegments: [
                    { id: 'blocked-nearest', a: { x: 100, y: 0 }, b: { x: 180, y: 0 }, pathId: 'blocked' },
                    { id: 'safe-a', a: { x: 0, y: 120 }, b: { x: 0, y: 220 }, pathId: 'safe' },
                    { id: 'safe-b', a: { x: 0, y: 220 }, b: { x: 0, y: 300 }, pathId: 'safe' },
                ],
            });
            expect(candidateWalkEndpointConnectors(testGraph, { x: 0, y: 0 }, ['ROOM']).map(item => item.point)).not.toContainEqual({ x: 100, y: 0 });
            const route = planCandidateRoute(testGraph, { destinationId: 'target', agent: { id: 'agent', currentPoint: { x: 0, y: 0 }, revision: 0 } });
            expect(route.status).toBe('valid');
            expect(route.points).toContainEqual({ x: 0, y: 120 });
        }
    });

    it('bounds connector candidates and fails closed when no component connects candidates', () => {
        const manySegments = Array.from({ length: 30 }, (_, index) => ({ id: `segment-${String(index).padStart(2, '0')}`, a: { x: 100 + index, y: 100 }, b: { x: 100 + index, y: 110 }, pathId: `path-${index}` }));
        const boundedGraph = connectorGraph({ walkSegments: manySegments });
        expect(candidateWalkEndpointConnectors(boundedGraph, { x: 100, y: 100 }, ['ROOM'])).toHaveLength(18);

        const disconnected = connectorGraph({
            walkSegments: [
                { id: 'start-only', a: { x: 100, y: 0 }, b: { x: 120, y: 0 }, pathId: 'start' },
                { id: 'end-only', a: { x: 550, y: 0 }, b: { x: 570, y: 0 }, pathId: 'end' },
            ],
            destinations: [{ id: 'target', label: 'Target', kind: 'waypoint', point: { x: 580, y: 0 }, roomId: 'ROOM', roomIds: ['ROOM'], roomName: 'Room' }],
        });
        const route = planCandidateRoute(disconnected, { destinationId: 'target', agent: { id: 'agent', currentPoint: { x: 90, y: 0 }, revision: 0 } });
        expect(route.status).toBe('blocked');
        expect(route.failureCategory).toBe('walk_network_disconnected');
    });
});

describe('candidate door runtime and destination anchor regressions', () => {
    it('rejects routes whose endpoint remains inside final-door clearance', () => {
        const unsafe = alternateGraph('open') as unknown as { destinations: CandidateNavigationGraph['destinations'] };
        unsafe.destinations = [{ id: 'target', label: 'target', kind: 'waypoint', point: { x: 160, y: 40 }, roomId: 'B', roomIds: ['B'], roomName: 'B' }];
        const route = testRoute(unsafe as unknown as CandidateNavigationGraph, { x: 40, y: 40 }, 'target');
        expect(route.status).toBe('blocked');
        expect(['final_door_clearance_unreachable', 'destination_inside_door_clearance']).toContain(route.failureCategory);
    });

    it('validates final-door clearance boundaries and leaves same-room routes unaffected', () => {
        const route = testRoute(alternateGraph('open'), { x: 40, y: 40 }, 'target');
        expect(route.status).toBe('valid');
        expect(validateCandidateRouteDoorClearance(route.points, route.doorSteps, alternateGraph('open').doors)).toBeNull();
        const shortened = route.points.slice(0, -1).concat([{ x: 160, y: 40 }]);
        expect(['final_door_clearance_unreachable', 'destination_inside_door_clearance']).toContain(validateCandidateRouteDoorClearance(shortened, route.doorSteps, alternateGraph('open').doors));
        const sameRoom = { ...route, doorSteps: [], crossedDoorIds: [] };
        expect(validateCandidateRouteDoorClearance(sameRoom.points, sameRoom.doorSteps, alternateGraph('open').doors)).toBeNull();
    });

    it('defensively completes malformed legacy routes at route length instead of crossing forever', () => {
        const route = testRoute(alternateGraph('open'), { x: 40, y: 40 }, 'target');
        expect(route.status).toBe('valid');
        const malformedRoute = { ...route, points: [route.points[0], { x: 160, y: 40 }], length: 125 };
        const open = { D01: { doorId: 'D01', state: 'open' as const, stateElapsedMs: 0, revision: 0 } };
        const agent = { id: 'agent', status: 'crossing_door', route: malformedRoute, progress: 124.9, point: malformedRoute.points[0] };
        const next = advanceCandidateAgents([agent], 100, 420, open)[0];
        expect(next.status).toBe('arrived');
        expect(next.progress).toBeCloseTo(120);
    });

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

    it('does not let doorway occupancy alone authorize non-public doors', () => {
        const restrictedDoor = { id: 'D20', point: { x: 100, y: 100 }, zones: ['A', 'B'], zoneIds: ['A', 'B'], accessMode: 'event', permission: 'reserved' as const, manualReviewRequired: false, apertureRadius: 80 };
        const publicDoor = { ...restrictedDoor, id: 'D01', accessMode: 'open', permission: 'general' as const };
        const routeLessOccupant = { id: 'agent', status: 'idle', route: null, progress: 0, point: { x: 100, y: 100 } };
        expect(activeCandidateDoorRequestIds([routeLessOccupant], [restrictedDoor])).toEqual([]);
        expect(activeCandidateDoorRequestIds([routeLessOccupant], [publicDoor])).toEqual(['D01']);
        const closed = { D20: { doorId: 'D20', state: 'closed' as const, stateElapsedMs: 0, revision: 0 } };
        expect(advanceCandidateDoorRuntimes(closed, activeCandidateDoorRequestIds([routeLessOccupant], [restrictedDoor]), 100).D20.state).toBe('closed');
    });

    it('keeps active authorized route steps requesting their current public door', () => {
        const route = testRoute(alternateGraph('open'), { x: 40, y: 40 }, 'target');
        expect(route.status).toBe('valid');
        const step = route.doorSteps[0];
        const agent = { id: 'agent', status: 'walking', route, progress: step.approachDistance, point: step.approachPoint };
        expect(activeCandidateDoorRequestIds([agent], alternateGraph('open').doors)).toContain(step.doorId);
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
        const rebuilt = buildCandidateNavigationGraph({ rooms, positions, doors, computers, interactiveObjects, walls, objects, walkPaths }, { registration: TEST_REGISTRATION });
        for (const id of ['interactive:INTERACTIVE_MAIN_ROBOT_TUBE', 'interactive:INTERACTIVE_SMALL_ROBOT_TUBE', 'interactive:INTERACTIVE_MAP']) {
            const destination = graph.destinations.find(item => item.id === id);
            expect(destination?.markerPoint).toBeTruthy();
            expect(destination?.approachPositionId).toMatch(/^POSITION_/);
            expect(destination?.point).not.toEqual(destination?.markerPoint);
            expect(destination?.availability).toBe('available');
            expect(validateCandidateRouteSegments(graph, [destination!.point, destination!.point], [])).toBeNull();
            expect(rebuilt.destinations.find(item => item.id === id)).toEqual(destination);
        }
    });


    it('keeps interactive-object approaches local and avoids repository-wide workstation fallbacks', () => {
        const rebuilt = buildCandidateNavigationGraph({ rooms, positions, doors, computers, interactiveObjects, walls, objects, walkPaths }, { registration: TEST_REGISTRATION });
        for (const destination of graph.destinations.filter(item => item.kind === 'interactive-object')) {
            expect(destination.markerPoint).toBeTruthy();
            if (destination.availability === 'available') {
                expect(destination.approachDistance).toBeGreaterThanOrEqual(0);
                expect(destination.approachDistance).toBeLessThanOrEqual(INTERACTIVE_APPROACH_MAX_DISTANCE);
                expect(destination.point).not.toEqual(destination.markerPoint);
                expect(validateCandidateRouteSegments(graph, [destination.point, destination.point], [])).toBeNull();
                expect(destination.approachAnchorId).toBeTruthy();
                if (destination.approachResolution === 'position-anchor') expect(destination.approachPositionId).toBe(destination.approachAnchorId);
                if (destination.approachResolution !== 'position-anchor') expect(destination.approachPositionId).toBeUndefined();
            } else {
                expect(destination.unavailableReason).toBe('No local candidate interactive-object approach anchor is available.');
            }
            expect(rebuilt.destinations.find(item => item.id === destination.id)).toEqual(destination);
        }
        const stairs1 = graph.destinations.find(item => item.id === 'interactive:INTERACTIVE_STAIRS1');
        const stairs2 = graph.destinations.find(item => item.id === 'interactive:INTERACTIVE_STAIRS2');
        expect(stairs1?.approachPositionId).not.toBe('POSITION_114');
        expect(stairs2?.approachPositionId).not.toBe('POSITION_005');
        expect(stairs1?.approachDistance).toBeLessThanOrEqual(INTERACTIVE_APPROACH_MAX_DISTANCE);
        expect(stairs2?.approachDistance).toBeLessThanOrEqual(INTERACTIVE_APPROACH_MAX_DISTANCE);
        expect(stairs1?.approachResolution).toBe('walk-node');
        expect(stairs2?.approachResolution).toBe('walk-node');
        expect(stairs1?.approachAnchorId).toMatch(/^walk:/);
        expect(stairs2?.approachAnchorId).toMatch(/^walk:/);
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

it('precomputes each position collision and walk evaluation once per graph build', () => {
    const instrumentation = { positionCollisionEvaluations: 0, positionWalkEvaluations: 0 };
    const indexed = buildCandidateNavigationGraph(
        { rooms, positions, doors, computers, interactiveObjects, walls, objects, walkPaths },
        { registration: TEST_REGISTRATION, instrumentation },
    );
    expect(indexed.navigationAvailable).toBe(true);
    const positionCount = (positions.data.positions as unknown[]).length;
    expect(instrumentation.positionCollisionEvaluations).toBeLessThanOrEqual(positionCount);
    expect(instrumentation.positionWalkEvaluations).toBeLessThanOrEqual(positionCount);
    expect(indexed.destinations.find(item => item.id === 'interactive:INTERACTIVE_MAIN_ROBOT_TUBE')?.approachPositionId).toBe(
        graph.destinations.find(item => item.id === 'interactive:INTERACTIVE_MAIN_ROBOT_TUBE')?.approachPositionId,
    );
});
