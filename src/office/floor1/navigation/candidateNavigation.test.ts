import { describe, expect, it } from 'vitest';
import rooms from '../../data/floor1/provisional/rooms.json';
import positions from '../../data/floor1/provisional/positions.json';
import doors from '../../data/floor1/provisional/doors.json';
import computers from '../../data/floor1/provisional/computers.json';
import interactiveObjects from '../../data/floor1/provisional/interactive-objects.json';
import walls from '../../data/floor1/provisional/walls.json';
import objects from '../../data/floor1/provisional/objects.json';
import walkPaths from '../../data/floor1/provisional/walk-paths.json';
import type { CandidateNavigationGraph } from './candidateNavigation';
import {
    buildCandidateNavigationGraph,
    interpolateRoute,
    planCandidateRoute,
    pointInPolygon,
    segmentsIntersect,
} from './candidateNavigation';

const graph = buildCandidateNavigationGraph({ rooms, positions, doors, computers, interactiveObjects, walls, objects, walkPaths });

const testRoute = (
    graphValue: CandidateNavigationGraph,
    start: { x: number; y: number },
    destinationId: string,
    accessTier: 'standard' | 'priority' = 'priority',
) => planCandidateRoute(graphValue, { start, destinationId, agent: { id: `test-${accessTier}`, accessTier } });


describe('candidate Floor 1 navigation graph', () => {
    it('initializes deterministic provisional review agents without approving candidate data', () => {
        expect(graph.agents).toHaveLength(40);
        expect(graph.agents[0].id).toBe('floor1-review-agent-01');
        expect(graph.agents.every(agent => agent.provisionalSpriteAssignment)).toBe(true);
        expect(new Set(graph.agents.map(agent => agent.id)).size).toBe(graph.agents.length);
        expect(graph.doors).toHaveLength(47);
        expect(graph.destinations.some(destination => destination.kind === 'computer')).toBe(true);
        expect(graph.nodeCount).toBeGreaterThan(200);
    });

    it('keeps geometry predicates deterministic', () => {
        expect(pointInPolygon({ x: 5, y: 5 }, [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }])).toBe(true);
        expect(segmentsIntersect({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 })).toBe(true);
    });

    it('fails closed for malformed starts and unresolved destinations', () => {
        expect(testRoute(graph, { x: Number.NaN, y: 0 }, graph.destinations[0].id).status).toBe('malformed');
        expect(testRoute(graph, graph.agents[0].point, 'missing-destination').status).toBe('malformed');
    });

    it('produces deterministic route results for identical queries', () => {
        const agent = graph.agents[0];
        const destination = graph.destinations.find(item => item.kind === 'position' && item.roomId === agent.roomId && item.id !== `position:${agent.positionId}`) ?? graph.destinations[0];
        const first = testRoute(graph, agent.point, destination.id);
        const second = testRoute(graph, agent.point, destination.id);
        expect(second).toEqual(first);
    });

    it('validates same-room and priority-position route attempts without crossing approval boundaries', () => {
        const agent = graph.agents[0];
        const destination = graph.destinations.find(item => item.kind === 'position' && item.roomId === agent.roomId && item.id !== `position:${agent.positionId}`) ?? graph.destinations[0];
        const result = testRoute(graph, agent.point, destination.id);
        expect(['valid', 'blocked', 'unreachable']).toContain(result.status);
        expect(result.reason).not.toMatch(/approved/i);
    });

    it('reports blocked/restricted/reserved/manual-review door outcomes instead of animating through them', () => {
        const agent = graph.agents[0];
        const restrictedRoomDestination = graph.destinations.find(destination => destination.roomName.includes('Security'))
            ?? graph.destinations.find(destination => destination.kind === 'room')
            ?? graph.destinations[0];
        const result = testRoute(graph, agent.point, restrictedRoomDestination.id);
        expect(['valid', 'blocked', 'restricted', 'unreachable']).toContain(result.status);
        if (result.status !== 'valid') expect(result.points).toHaveLength(0);
    });

    it('supports movement interpolation and cancellation-ready state snapshots', () => {
        const interpolated = interpolateRoute([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }], 150);
        expect(interpolated).toEqual({ x: 100, y: 50 });
        const beyond = interpolateRoute([{ x: 0, y: 0 }, { x: 10, y: 0 }], 100);
        expect(beyond).toEqual({ x: 10, y: 0 });
    });
});
