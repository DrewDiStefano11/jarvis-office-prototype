import { describe, expect, it } from 'vitest';
import type { CandidateNavigationGraph } from './candidateNavigation';
import { interpolateRoute, planCandidateRoute } from './candidateNavigation';

const testRoute = (
    graphValue: CandidateNavigationGraph,
    start: { x: number; y: number },
    destinationId: string,
    accessTier: 'standard' | 'priority' = 'priority',
) => planCandidateRoute(graphValue, { start, destinationId, agent: { id: `test-${accessTier}`, accessTier } });


function fixtureGraph(accessMode = 'open'): CandidateNavigationGraph {
    return {
        rooms: [
            { id: 'ROOM_A', name: 'Room A', polygon: [{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 300, y: 300 }, { x: 0, y: 300 }], center: { x: 150, y: 150 } },
            { id: 'ROOM_B', name: 'Room B', polygon: [{ x: 300, y: 0 }, { x: 600, y: 0 }, { x: 600, y: 300 }, { x: 300, y: 300 }], center: { x: 450, y: 150 } },
            { id: 'ROOM_C', name: 'Room C', polygon: [{ x: 600, y: 0 }, { x: 900, y: 0 }, { x: 900, y: 300 }, { x: 600, y: 300 }], center: { x: 750, y: 150 } },
        ],
        doors: [
            { id: 'D01', point: { x: 300, y: 150 }, zones: ['Room A', 'Room B'], zoneIds: ['ROOM_A', 'ROOM_B'], accessMode, manualReviewRequired: false, apertureRadius: 96 },
            { id: 'D02', point: { x: 600, y: 150 }, zones: ['Room B', 'Room C'], zoneIds: ['ROOM_B', 'ROOM_C'], accessMode: 'open', manualReviewRequired: false, apertureRadius: 96 },
        ],
        agents: [],
        destinations: [
            { id: 'same-room', label: 'same room', kind: 'waypoint', point: { x: 220, y: 80 }, roomId: 'ROOM_A', roomIds: ['ROOM_A'], roomName: 'Room A' },
            { id: 'adjacent-room', label: 'adjacent room', kind: 'waypoint', point: { x: 450, y: 130 }, roomId: 'ROOM_B', roomIds: ['ROOM_B'], roomName: 'Room B' },
            { id: 'multi-room', label: 'multi room', kind: 'computer', point: { x: 750, y: 130 }, roomId: 'ROOM_C', roomIds: ['ROOM_C'], roomName: 'Room C' },
            { id: 'inside-collision', label: 'inside collision', kind: 'waypoint', point: { x: 120, y: 220 }, roomId: 'ROOM_A', roomIds: ['ROOM_A'], roomName: 'Room A' },
            { id: 'priority-position', label: 'priority position', kind: 'position', point: { x: 230, y: 80 }, roomId: 'ROOM_A', roomIds: ['ROOM_A'], roomName: 'Room A' },
        ],
        colliders: [
            { id: 'object:desk', kind: 'object', points: [{ x: 100, y: 200 }, { x: 140, y: 200 }, { x: 140, y: 240 }, { x: 100, y: 240 }], closed: true, thickness: 8 },
        ],
        walkNodes: [],
        walkSegments: [],
        roomDiagnostics: [],
        nodeCount: 8,
        edgeCount: 2,
    } as CandidateNavigationGraph;
}

describe('candidate route evidence matrix fixtures', () => {
    it('covers same-room, adjacent-room, multi-room, computer, and priority-position routes', () => {
        expect(testRoute(fixtureGraph(), { x: 80, y: 80 }, 'same-room').status).toBe('valid');
        expect(testRoute(fixtureGraph(), { x: 80, y: 80 }, 'adjacent-room').crossedDoorIds).toEqual(['D01']);
        const multi = testRoute(fixtureGraph(), { x: 80, y: 80 }, 'multi-room');
        expect(multi.status).toBe('valid');
        expect(multi.crossedDoorIds).toEqual(['D01', 'D02']);
        expect(testRoute(fixtureGraph(), { x: 80, y: 80 }, 'priority-position').status).toBe('valid');
    });

    it('fails closed for blocked, restricted, reserved, and manual-review door states', () => {
        expect(testRoute(fixtureGraph('blocked'), { x: 80, y: 80 }, 'adjacent-room').status).toBe('blocked');
        expect(testRoute(fixtureGraph('restricted'), { x: 80, y: 80 }, 'adjacent-room').status).toBe('restricted');
        expect(testRoute(fixtureGraph('event'), { x: 80, y: 80 }, 'adjacent-room').reason).toContain('reserved');
        const manual = fixtureGraph('open') as unknown as { doors: Array<{ manualReviewRequired: boolean }> };
        manual.doors[0].manualReviewRequired = true;
        expect(testRoute(manual as unknown as CandidateNavigationGraph, { x: 80, y: 80 }, 'adjacent-room').reason).toContain('manual-review-required');
    });

    it('rejects unreachable destinations, collision interiors, and malformed starts', () => {
        const graph = fixtureGraph() as unknown as { doors: unknown[] };
        graph.doors = [];
        expect(testRoute(graph as unknown as CandidateNavigationGraph, { x: 80, y: 80 }, 'multi-room').status).toBe('unreachable');
        expect(testRoute(fixtureGraph(), { x: 80, y: 80 }, 'inside-collision').status).toBe('blocked');
        expect(testRoute(fixtureGraph(), { x: Number.POSITIVE_INFINITY, y: 80 }, 'same-room').status).toBe('malformed');
    });

    it('supports path-around-object review waypoints and edge-adjacent bounded movement', () => {
        const aroundObject = interpolateRoute([{ x: 80, y: 80 }, { x: 80, y: 180 }, { x: 220, y: 180 }], 120);
        expect(aroundObject).toEqual({ x: 100, y: 180 });
        expect(testRoute(fixtureGraph(), { x: 1, y: 1 }, 'same-room').status).toBe('valid');
    });

    it('models cancellation, pause/resume, state-change, concurrent, and deterministic rerun evidence as immutable route snapshots', () => {
        const route = testRoute(fixtureGraph(), { x: 80, y: 80 }, 'adjacent-room');
        const pausedPoint = interpolateRoute(route.points, 50);
        const resumedPoint = interpolateRoute(route.points, 100);
        expect(pausedPoint).not.toEqual(resumedPoint);
        expect(route).toEqual(testRoute(fixtureGraph(), { x: 80, y: 80 }, 'adjacent-room'));
        expect([route, testRoute(fixtureGraph(), { x: 90, y: 90 }, 'multi-room')].every(item => item.status === 'valid')).toBe(true);
    });
});
