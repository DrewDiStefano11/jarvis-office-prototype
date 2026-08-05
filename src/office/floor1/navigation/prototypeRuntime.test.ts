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
import {
    advancePrototypeAgents,
    assignPrototypeIdle,
    assignPrototypeTalk,
    assignPrototypeWander,
    assignPrototypeWork,
    createPrototypeAgents,
    createPrototypeRuntimeMetrics,
    distributedPrototypeSpawnNodes,
    planPrototypeRouteToPoint,
    prototypeDoorTraversalCoverage,
    prototypeOpenDoorRuntimes,
    prototypeOpenGraph,
    prototypeRoomAtPoint,
    prototypeFacingFromVelocity,
    prototypeSpriteState,
    prototypeWorkstations,
    repositionPrototypeAgent,
    snapPrototypePoint,
    startPrototypeRoute,
} from './prototypeRuntime';

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
    it.each([
        [{ x: 120, y: 0 }, 'east'],
        [{ x: -120, y: 0 }, 'west'],
        [{ x: 0, y: -120 }, 'north'],
        [{ x: 0, y: 120 }, 'south'],
    ] as const)('faces actual cardinal velocity %o as %s', (velocity, expected) => {
        expect(prototypeFacingFromVelocity('south', velocity)).toBe(expected);
    });

    it('retains facing for stationary noise and uses hysteresis near diagonal transitions', () => {
        expect(prototypeFacingFromVelocity('west', { x: 2, y: -3 })).toBe('west');
        expect(prototypeFacingFromVelocity('east', { x: 10, y: -11 })).toBe('east');
        expect(prototypeFacingFromVelocity('east', { x: 10, y: -14 })).toBe('north');
    });

    it('never selects the direction opposite a meaningful velocity', () => {
        const samples = [{ x: 50, y: 2 }, { x: -50, y: 2 }, { x: 2, y: 50 }, { x: 2, y: -50 }];
        for (const velocity of samples) {
            const facing = prototypeFacingFromVelocity('south', velocity);
            const vector = facing === 'east' ? { x: 1, y: 0 } : facing === 'west' ? { x: -1, y: 0 }
                : facing === 'south' ? { x: 0, y: 1 } : { x: 0, y: -1 };
            expect(vector.x * velocity.x + vector.y * velocity.y).toBeGreaterThan(0);
        }
    });

    it('caches workstation geometry and keeps explicit anchors collision clear', () => {
        const metrics = createPrototypeRuntimeMetrics();
        const first = prototypeWorkstations(graph, metrics);
        const second = prototypeWorkstations(graph, metrics);
        expect(first).toBe(second);
        expect(first.length).toBeGreaterThan(25);
        expect(metrics.graphBuilds).toBe(1);
    });

    it('does not assign an occupied workstation twice', () => {
        const [first, second] = createPrototypeAgents(graph, 2, 'debug');
        const firstWork = assignPrototypeWork(graph, first, 0);
        expect(firstWork?.workstationId).toBeTruthy();
        const occupied = new Set(firstWork?.workstationId ? [firstWork.workstationId] : []);
        const secondWork = assignPrototypeWork(graph, second, 0, occupied);
        expect(secondWork?.workstationId).toBeTruthy();
        expect(secondWork?.workstationId).not.toBe(firstWork?.workstationId);
    });

    it('advances walk cadence from distance and freezes it while paused', () => {
        const agent = createPrototypeAgents(graph, 1, 'debug')[0];
        const moving = assignPrototypeWander(graph, agent, 7, 0);
        expect(moving).not.toBeNull();
        if (!moving) return;
        const advanced = advancePrototypeAgents([moving], 250, 180, false, prototypeOpenDoorRuntimes(graph), graph)[0];
        expect(advanced.distanceTravelled).toBeGreaterThan(0);
        expect(advanced.walkCycleElapsedMs).toBeGreaterThan(0);
        const paused = advancePrototypeAgents([advanced], 250, 180, true, prototypeOpenDoorRuntimes(graph), graph)[0];
        expect(paused.walkCycleElapsedMs).toBe(advanced.walkCycleElapsedMs);
        expect(paused.point).toEqual(advanced.point);
    });
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

    it('assigns the sixteen real sprite variants deterministically and keeps identity through task changes', () => {
        const first = createPrototypeAgents(graph, 25, 'debug');
        const second = createPrototypeAgents(graph, 25, 'debug');
        expect(first.map(agent => agent.fixture.spriteAssetId)).toEqual(second.map(agent => agent.fixture.spriteAssetId));
        expect(new Set(first.map(agent => agent.fixture.spriteAssetId))).toHaveLength(16);
        const changed = assignPrototypeIdle(first[0], 1000, true);
        expect(changed.fixture).toBe(first[0].fixture);
        expect(changed.fixture.spriteAssetId).toBe('agent-sheet-01');
    });

    it('gives every agent a discriminated task and reproducible ambient roles', () => {
        const first = createPrototypeAgents(graph, 20, 'ambient');
        const second = createPrototypeAgents(graph, 20, 'ambient');
        expect(first.every(agent => typeof agent.task.kind === 'string')).toBe(true);
        expect(first.map(agent => [agent.fixture.id, agent.fixture.spriteAssetId, agent.task.kind])).toEqual(
            second.map(agent => [agent.fixture.id, agent.fixture.spriteAssetId, agent.task.kind]),
        );
        expect(first.some(agent => agent.task.kind === 'work')).toBe(true);
        expect(first.some(agent => agent.task.kind === 'talk')).toBe(true);
        expect(first.some(agent => agent.movementState === 'walking')).toBe(true);
    });

    it('routes a work task to a real workstation approach and enters working after arrival', () => {
        const agent = createPrototypeAgents(graph, 1, 'debug')[0];
        const assigned = assignPrototypeWork(graph, agent, 500);
        expect(assigned?.task.kind).toBe('work');
        expect(assigned?.workstationId).toMatch(/^(position:POSITION|computer:COMPUTER)_/);
        if (!assigned) return;
        expect(assigned.task).toMatchObject({ kind: 'work', phase: 'traveling', workstationId: assigned.workstationId });
        expect(assigned.movementState).toBe('walking');
        expect(assigned.activityState).toBe('walking');
        let current = assigned;
        for (let index = 0; index < 1_000 && ['walking', 'waiting', 'blocked'].includes(current.movementState); index += 1) {
            current = advancePrototypeAgents([current], 100, 1000, false, prototypeOpenDoorRuntimes(graph), graph)[0];
        }
        expect(current.task).toMatchObject({ kind: 'work', phase: 'working', workstationId: assigned.workstationId });
        expect(current.activityState).toBe('working-at-desk');
        expect(current.workstationId).toBe(assigned.workstationId);
        expect(current.movementState).toBe('arrived');
        expect(current.velocity).toEqual({ x: 0, y: 0 });
        expect(prototypeSpriteState(current)).toBe('working');

        const stationary = advancePrototypeAgents([current], 500, 1000, false, prototypeOpenDoorRuntimes(graph), graph)[0];
        expect(stationary.point).toEqual(current.point);
        expect(stationary.workstationId).toBe(assigned.workstationId);
        expect(stationary.task).toMatchObject({ kind: 'work', phase: 'working' });
        expect(stationary.activityState).toBe('working-at-desk');
        expect(stationary.velocity).toEqual({ x: 0, y: 0 });
    });

    it('projects an authoritative working task back to the working activity state', () => {
        const agent = createPrototypeAgents(graph, 20, 'ambient').find(candidate => candidate.task.kind === 'work');
        expect(agent?.task.kind).toBe('work');
        if (!agent || agent.task.kind !== 'work') return;
        const inconsistent = { ...agent, movementState: 'arrived' as const, activityState: 'idle' as const };
        const projected = advancePrototypeAgents([inconsistent], 100, 180, false, prototypeOpenDoorRuntimes(graph), graph)[0];
        expect(projected.task).toMatchObject({ kind: 'work', phase: 'working' });
        expect(projected.activityState).toBe('working-at-desk');
        expect(projected.velocity).toEqual({ x: 0, y: 0 });
        expect(projected.workstationId).toBe(agent.workstationId);
    });

    it('releases a working agent workstation when work is cancelled or replaced', () => {
        const agent = createPrototypeAgents(graph, 1, 'debug')[0];
        const assigned = assignPrototypeWork(graph, agent, 500);
        expect(assigned).not.toBeNull();
        if (!assigned || assigned.task.kind !== 'work') return;
        const working = {
            ...assigned,
            route: null,
            movementState: 'arrived' as const,
            activityState: 'working-at-desk' as const,
            velocity: { x: 0, y: 0 },
            task: { ...assigned.task, phase: 'working' as const },
        };

        const cancelled = assignPrototypeIdle(working, 1_500);
        expect(cancelled.task.kind).toBe('idle');
        expect(cancelled.activityState).toBe('idle');
        expect(cancelled.movementState).toBe('idle');
        expect(cancelled.workstationId).toBeUndefined();

        const replacement = assignPrototypeWander(graph, working, 7, 2_000);
        expect(replacement).not.toBeNull();
        expect(replacement?.task.kind).toBe('wander');
        expect(replacement?.activityState).toBe('walking');
        expect(replacement?.workstationId).toBeUndefined();
    });

    it('routes talk partners toward distinct valid nodes and exposes reciprocal IDs', () => {
        const [agent, partner] = createPrototypeAgents(graph, 2, 'debug');
        const assigned = assignPrototypeTalk(graph, agent, partner, 900);
        expect(assigned?.task.kind).toBe('talk');
        if (!assigned || assigned.task.kind !== 'talk') return;
        expect(assigned.task.partnerAgentId).toBe(partner.fixture.id);
        expect(assigned.task.destination).not.toEqual(partner.point);
        expect(assigned.task.nodeId).toBeTruthy();
    });

    it('creates a deterministic wander route without changing sprite identity', () => {
        const agent = createPrototypeAgents(graph, 1, 'debug')[0];
        const first = assignPrototypeWander(graph, agent, 7, 100);
        const second = assignPrototypeWander(graph, agent, 7, 100);
        expect(first?.targetPoint).toEqual(second?.targetPoint);
        expect(first?.fixture.spriteAssetId).toBe(agent.fixture.spriteAssetId);
        expect(first?.task.kind).toBe('wander');
    });

    it('stopping clears a route without moving or removing the agent', () => {
        const agent = createPrototypeAgents(graph, 1, 'debug')[0];
        const assigned = assignPrototypeWander(graph, agent, 3, 0);
        expect(assigned).not.toBeNull();
        if (!assigned) return;
        const stopped = assignPrototypeIdle(assigned, 400, true);
        expect(stopped.point).toEqual(assigned.point);
        expect(stopped.route).toBeNull();
        expect(stopped.fixture.id).toBe(agent.fixture.id);
        expect(stopped.task.kind).toBe('stopped');
    });

    it('snaps away from occupied nodes and rejects out-of-office points', () => {
        const [first, second] = createPrototypeAgents(graph, 2, 'debug');
        const snap = snapPrototypePoint(graph, first.point, 1000, new Set([first.currentNodeId, second.currentNodeId]));
        expect(snap?.nodeId).not.toBe(first.currentNodeId);
        expect(snap?.nodeId).not.toBe(second.currentNodeId);
        expect(snapPrototypePoint(graph, { x: -1, y: 20 })).toBeNull();
    });

    it('repositioning preserves identity and sprite while clearing route and task state', () => {
        const agent = createPrototypeAgents(graph, 1, 'debug')[0];
        const moving = assignPrototypeWander(graph, agent, 2, 0) ?? agent;
        const targetNode = graph.walkNodes.find(node => node.id !== moving.currentNodeId)!;
        const moved = repositionPrototypeAgent(moving, {
            point: targetNode.point, nodeId: targetNode.id, roomId: targetNode.roomId, distance: 0,
        }, 200);
        expect(moved.fixture).toBe(agent.fixture);
        expect(moved.currentNodeId).toBe(targetNode.id);
        expect(moved.route).toBeNull();
        expect(moved.task.kind).toBe('idle');
        expect(moved.fixture.spriteAssetId).toBe(agent.fixture.spriteAssetId);
    });

    it('resolves current room and maps movement to the real sprite states', () => {
        const agent = createPrototypeAgents(graph, 1, 'debug')[0];
        expect(prototypeRoomAtPoint(graph, agent.point).name).toBeTruthy();
        expect(prototypeSpriteState(agent)).toBe('idle');
        expect(prototypeSpriteState({ ...agent, movementState: 'walking' })).toBe('walking');
        expect(prototypeSpriteState({ ...agent, activityState: 'working-at-desk', task: {
            kind: 'work', phase: 'working', workstationId: 'POSITION_001', destination: agent.point, nodeId: agent.currentNodeId, startedAtMs: 0,
        } })).toBe('working');
    });
});
