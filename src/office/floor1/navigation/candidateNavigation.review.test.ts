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
            { id: 'D01', point: { x: 100, y: 50 }, zones: ['A', 'B'], zoneIds: ['A', 'B'], accessMode: firstDoorMode, manualReviewRequired: false, apertureRadius: 30 },
            { id: 'D02', point: { x: 50, y: 100 }, zones: ['A', 'C'], zoneIds: ['A', 'C'], accessMode: 'open', manualReviewRequired: false, apertureRadius: 30 },
            { id: 'D03', point: { x: 150, y: 100 }, zones: ['C', 'B'], zoneIds: ['C', 'B'], accessMode: 'open', manualReviewRequired: false, apertureRadius: 30 },
        ],
        agents: [],
        destinations: [{ id: 'target', label: 'target', kind: 'waypoint', point: { x: 160, y: 40 }, roomId: 'B', roomName: 'B' }],
        colliders: [],
        walkNodes: [],
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
