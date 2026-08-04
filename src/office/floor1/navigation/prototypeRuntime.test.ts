import { describe, expect, it } from 'vitest';
import rooms from '../../data/floor1/provisional/rooms.json';
import positions from '../../data/floor1/provisional/positions.json';
import doors from '../../data/floor1/provisional/doors.json';
import computers from '../../data/floor1/provisional/computers.json';
import interactiveObjects from '../../data/floor1/provisional/interactive-objects.json';
import walls from '../../data/floor1/provisional/walls.json';
import objects from '../../data/floor1/provisional/objects.json';
import walkPaths from '../../data/floor1/provisional/walk-paths.json';
import { buildCandidateSandboxGraph } from './candidateNavigation';
import { advancePrototypeAgents, createPrototypeAgents, distributedPrototypeSpawnNodes, planPrototypeRouteToPoint, prototypeDoorTraversalCoverage, prototypeOpenDoorRuntimes, prototypeOpenGraph, startPrototypeRoute } from './prototypeRuntime';

const registration = {
    sourceWidth: 8192, sourceHeight: 5460, markupWidth: 8192, markupHeight: 5460, scale: 1, offsetX: 0, offsetY: 0,
    rotationDegrees: 0, status: 'unverified', approvalStatus: 'candidate_reviewed', storedCoordinateSpace: 'registered_candidate_source', productionApproved: false,
    provenance: { generator: 'test', generatedArtifact: 'test', sourceEvidence: ['test'] },
    registrationLandmarks: [
        { id: 'nw', markup: { x: 0, y: 0 }, source: { x: 0, y: 0 }, residualErrorPixels: 0 },
        { id: 'ne', markup: { x: 8192, y: 0 }, source: { x: 8192, y: 0 }, residualErrorPixels: 0 },
        { id: 'sw', markup: { x: 0, y: 5460 }, source: { x: 0, y: 5460 }, residualErrorPixels: 0 },
        { id: 'se', markup: { x: 8192, y: 5460 }, source: { x: 8192, y: 5460 }, residualErrorPixels: 0 },
    ], maximumResidualErrorPixels: 0,
} as const;

const sourceDocuments = { rooms, positions, doors, computers, interactiveObjects, walls, objects, walkPaths };
const strictGraph = buildCandidateSandboxGraph(sourceDocuments, registration);
const graph = prototypeOpenGraph(strictGraph);

describe('prototype runtime', () => {
    it('creates deterministic agents on distinct valid walk nodes', () => {
        const agents = createPrototypeAgents(graph, 25, 'debug');
        const nodeIds = new Set(graph.walkNodes.map(node => node.id));
        expect(agents).toHaveLength(25);
        expect(agents.map(agent => agent.fixture.label).slice(0, 3)).toEqual(['Agent 01', 'Agent 02', 'Agent 03']);
        expect(new Set(agents.map(agent => agent.currentNodeId)).size).toBe(25);
        expect(agents.every(agent => nodeIds.has(agent.currentNodeId))).toBe(true);
        expect(distributedPrototypeSpawnNodes(graph, 25)).toHaveLength(25);
    });

    it('forces all candidate doors open and unlocked without mutating source graph', () => {
        const before = JSON.stringify(strictGraph.doors);
        const runtimes = prototypeOpenDoorRuntimes(graph);
        expect(graph.doors).toHaveLength(47);
        expect(graph.doors.every(door => door.currentState === 'open' && door.permission === 'general' && !door.manualReviewRequired)).toBe(true);
        expect(Object.values(runtimes).every(runtime => runtime.state === 'open')).toBe(true);
        expect(prototypeDoorTraversalCoverage(graph)).toEqual(graph.doors.map(door => door.id).sort());
        expect(JSON.stringify(strictGraph.doors)).toBe(before);
    });

    it('snaps an arbitrary nearby point to a reachable graph node and returns a graph route', () => {
        const agent = createPrototypeAgents(graph, 1, 'debug')[0];
        const routeGraph = { ...graph, agents: [agent.fixture] };
        let plan = null;
        for (const node of graph.walkNodes) {
            if (Math.hypot(node.point.x - agent.point.x, node.point.y - agent.point.y) <= 180) continue;
            const candidate = planPrototypeRouteToPoint(routeGraph, agent, { x: node.point.x + 8, y: node.point.y + 6 });
            if (candidate && candidate.route.length > 1) { plan = candidate; break; }
        }
        expect(plan?.route.status).toBe('valid');
        expect(plan?.route.points.length).toBeGreaterThan(1);
        expect(plan?.snappedNodeId).toBeTruthy();
    });

    it('advances a started route while preserving its exact position when paused', () => {
        const agent = createPrototypeAgents(graph, 1, 'debug')[0];
        const routeGraph = { ...graph, agents: [agent.fixture] };
        let plan = null;
        for (const node of graph.walkNodes) {
            if (Math.hypot(node.point.x - agent.point.x, node.point.y - agent.point.y) <= 180) continue;
            plan = planPrototypeRouteToPoint(routeGraph, agent, node.point);
            if (plan?.route.length && plan.route.length > 1) break;
        }
        expect(plan).not.toBeNull();
        if (!plan) return;
        const started = startPrototypeRoute(agent, plan);
        const doorsOpen = prototypeOpenDoorRuntimes(graph);
        const paused = advancePrototypeAgents([started], 500, 180, true, doorsOpen)[0];
        const moving = advancePrototypeAgents([started], 500, 180, false, doorsOpen)[0];
        expect(paused.point).toEqual(started.point);
        expect(moving.progress).toBeGreaterThan(started.progress);
        expect(moving.point).not.toEqual(started.point);
    });

    it('plans a runtime route that traverses multiple prototype-open door thresholds', () => {
        const agent = createPrototypeAgents(graph, 1, 'debug')[0];
        const routeGraph = { ...graph, agents: [agent.fixture] };
        let plan = null;
        let maximumDoorCount = 0;
        for (const node of graph.walkNodes.slice().sort((a, b) => Math.hypot(b.point.x - agent.point.x, b.point.y - agent.point.y) - Math.hypot(a.point.x - agent.point.x, a.point.y - agent.point.y))) {
            const candidate = planPrototypeRouteToPoint(routeGraph, agent, node.point);
            maximumDoorCount = Math.max(maximumDoorCount, candidate?.route.crossedDoorIds.length ?? 0);
            if ((candidate?.route.crossedDoorIds.length ?? 0) < 2) continue;
            plan = candidate;
            break;
        }
        expect(maximumDoorCount).toBeGreaterThanOrEqual(2);
        expect(plan?.route.status).toBe('valid');
        expect(plan?.route.crossedDoorIds.length).toBeGreaterThanOrEqual(2);
        expect(plan?.route.doorSteps.every(step => step.requiredAction === 'none')).toBe(true);
    });
});
