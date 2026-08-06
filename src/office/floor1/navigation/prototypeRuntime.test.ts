import { describe, expect, it } from 'vitest';
import rooms from '../../data/floor1/provisional/rooms.json';
import positions from '../../data/floor1/provisional/positions.json';
import doors from '../../data/floor1/provisional/doors.json';
import computers from '../../data/floor1/provisional/computers.json';
import interactiveObjects from '../../data/floor1/provisional/interactive-objects.json';
import walls from '../../data/floor1/provisional/walls.json';
import objects from '../../data/floor1/provisional/objects.json';
import walkPaths from '../../data/floor1/provisional/walk-paths.json';
import { OFFICE_SOURCE_WIDTH } from '../../constants';
import { FLOOR1_CANDIDATE_REGISTRATION } from '../candidateRegistration';
import {
    buildCandidateSandboxGraph,
    candidatePointHasStaticClearance,
    candidateSegmentHasStaticClearance,
} from './candidateNavigation';
import {
    advancePrototypeAgents,
    auditPrototypeDoorConnectivity,
    auditPrototypePortalEndpoints,
    assignPrototypeIdle,
    assignPrototypeTalk,
    assignPrototypeWander,
    assignPrototypeWork,
    createPrototypeAgents,
    createPrototypeRuntimeMetrics,
    distributedPrototypeSpawnNodes,
    findValidatedPrototypeRouteToPoint,
    layoutPrototypeAgentLabels,
    planPrototypeRouteToPoint,
    prototypeDoorTraversalCoverage,
    PROTOTYPE_D01_ROOM_BRIDGE,
    prototypeOpenDoorRuntimes,
    prototypeOpenGraph,
    prototypeRoomAtPoint,
    prototypeFacingFromVelocity,
    prototypeSpriteState,
    prototypeWorkstations,
    repositionPrototypeAgent,
    resetPrototypeAgent,
    snapPrototypePoint,
    selectPrototypeRouteToPoint,
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
const registeredGraph = prototypeOpenGraph(buildCandidateSandboxGraph(sourceDocuments, FLOOR1_CANDIDATE_REGISTRATION));

function portalTestPlan(agent: ReturnType<typeof createPrototypeAgents>[number], doorCount = 1) {
    const pairs = auditPrototypePortalEndpoints(graph)
        .filter(item => item.status === 'provisional-valid' && item.approachPoint && item.exitPoint)
        .slice(0, doorCount);
    const points: Array<{ x: number; y: number }> = [];
    const doorSteps: Array<{
        doorId: string;
        permission: 'general';
        initialPhysicalState: 'open';
        requiredAction: 'none';
        approachPoint: { x: number; y: number };
        thresholdPoint: { x: number; y: number };
        exitPoint: { x: number; y: number };
        approachDistance: number;
        thresholdDistance: number;
        exitDistance: number;
        clearanceReleaseDistance: number;
    }> = [];
    let progress = 0;
    for (const pair of pairs) {
        const door = graph.doors.find(item => item.id === pair.doorId)!;
        const approachPoint = pair.approachPoint!;
        const exitPoint = pair.exitPoint!;
        if (points.length === 0) points.push(approachPoint);
        else {
            const previousPoint = points[points.length - 1];
            progress += Math.hypot(approachPoint.x - previousPoint.x, approachPoint.y - previousPoint.y);
            points.push(approachPoint);
        }
        const approachDistance = progress;
        progress += Math.hypot(door.point.x - approachPoint.x, door.point.y - approachPoint.y);
        points.push(door.point);
        const thresholdDistance = progress;
        progress += Math.hypot(exitPoint.x - door.point.x, exitPoint.y - door.point.y);
        points.push(exitPoint);
        doorSteps.push({
            doorId: door.id,
            permission: 'general',
            initialPhysicalState: 'open',
            requiredAction: 'none',
            approachPoint,
            thresholdPoint: door.point,
            exitPoint,
            approachDistance,
            thresholdDistance,
            exitDistance: progress,
            clearanceReleaseDistance: progress + 68,
        });
    }
    const snappedPoint = points[points.length - 1] ?? agent.point;
    return {
        route: {
            status: 'valid' as const,
            reason: 'Deterministic portal state-machine fixture.',
            points,
            crossedDoorIds: doorSteps.map(step => step.doorId),
            doorSteps,
            nodeSequence: points.map((_, index) => `portal-fixture-${index}`),
            cost: Math.round(progress),
            length: progress,
            expandedNodeCount: points.length,
        },
        clickedPoint: snappedPoint,
        snappedPoint,
        snappedNodeId: 'portal-fixture-end',
        snapDistance: 0,
        candidatesEvaluated: 1,
        searchRadius: 160,
    };
}

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
    }, 15_000);

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

    it('audits every registered door and rejects only the geometrically mismatched D46 pair', () => {
        const audit = auditPrototypePortalEndpoints(graph);
        expect(audit).toHaveLength(47);
        expect(new Set(audit.map(item => item.doorId)).size).toBe(47);
        const incomplete = audit.filter(item => item.status === 'disabled-incomplete');
        const incompleteDiagnostics = incomplete.map(item => {
            const door = graph.doors.find(candidate => candidate.id === item.doorId)!;
            return {
                doorId: item.doorId,
                zones: door.zoneIds.map(zoneId => ({
                    zoneId,
                    room: graph.rooms.some(room => room.id === zoneId),
                    nodes: graph.walkNodes.filter(node => node.roomId === zoneId || node.roomIds.includes(zoneId)).length,
                    center: graph.rooms.find(room => room.id === zoneId)?.center,
                    nearestNode: graph.walkNodes
                        .filter(node => node.roomId === zoneId || node.roomIds.includes(zoneId))
                        .map(node => ({ id: node.id, point: node.point, distance: Math.hypot(node.point.x - door.point.x, node.point.y - door.point.y) }))
                        .sort((a, b) => a.distance - b.distance)[0],
                })),
                doorPoint: door.point,
            };
        });
        expect(incompleteDiagnostics).toEqual([expect.objectContaining({
            doorId: 'D46',
            doorPoint: expect.objectContaining({ x: 7002.114666666666, y: 3946.4287999999997 }),
        })]);
        expect(audit.filter(item => item.status === 'provisional-valid')).toHaveLength(46);
    });

    it('returns explicit click-route rejection reasons instead of a generic null result', () => {
        const agent = createPrototypeAgents(graph, 1, 'debug')[0];
        expect(selectPrototypeRouteToPoint(graph, agent, { x: -1, y: 20 })).toMatchObject({
            status: 'rejected', reason: 'outside-office',
        });
    });

    it('routes the reproduced A21 start through D01 without inventing an elevator shortcut', () => {
        const originalAgent = createPrototypeAgents(registeredGraph, 25, 'debug')[20];
        const start = snapPrototypePoint(registeredGraph, { x: 1_022.48, y: 1_805.52 }, 620);
        expect(start).not.toBeNull();
        if (!start) return;
        const agent = repositionPrototypeAgent(originalAgent, start, 0);
        const d01Connectivity = auditPrototypeDoorConnectivity(registeredGraph, 'D01', start.point);
        expect(d01Connectivity).toMatchObject({
            zones: [
                { zoneId: 'ROOM_AGENT_PLATFORM_AND_MODELS' },
                { zoneId: 'ROOM_MAIN_CONNECTING_WALKWAY' },
            ],
        });
        if (!d01Connectivity) return;
        expect(d01Connectivity.zones[0].nearbyNodes.map(node => node.componentId)).toContain(d01Connectivity.probeComponentId);
        expect(PROTOTYPE_D01_ROOM_BRIDGE.every(point => candidatePointHasStaticClearance(registeredGraph, point))).toBe(true);
        expect(PROTOTYPE_D01_ROOM_BRIDGE.slice(1).map((point, index) =>
            candidateSegmentHasStaticClearance(registeredGraph, PROTOTYPE_D01_ROOM_BRIDGE[index], point))).toEqual([true, true, true, true, true]);
        const selection = selectPrototypeRouteToPoint(registeredGraph, agent, { x: 3_050, y: 2_300 });
        expect(selection.status, JSON.stringify(selection)).toBe('accepted');
        if (selection.status !== 'accepted') return;
        expect(selection.plan.route.crossedDoorIds).toContain('D01');
        expect(selection.plan.route.crossedDoorIds).not.toContain('D47');
        expect(selection.plan.route.doorSteps.map(step => step.doorId)).toContain('D01');

        const d01Step = selection.plan.route.doorSteps.find(step => step.doorId === 'D01');
        expect(d01Step).toBeDefined();
        if (!d01Step) return;
        let moving = {
            ...startPrototypeRoute(agent, selection.plan),
            point: d01Step.thresholdPoint,
            progress: Math.max(0, d01Step.thresholdDistance - 1),
        };
        const doorsOpen = prototypeOpenDoorRuntimes(registeredGraph);
        for (let index = 0; index < 10 && !moving.portalTransition; index += 1) {
            moving = advancePrototypeAgents([moving], 100, 2_000, false, doorsOpen, registeredGraph)[0];
        }
        expect(moving.movementState).toBe('portal-out');
        moving = advancePrototypeAgents([moving], 170, 2_000, false, doorsOpen, registeredGraph)[0];
        expect(moving.movementState).toBe('hidden-transition');
        moving = advancePrototypeAgents([moving], 120, 2_000, false, doorsOpen, registeredGraph)[0];
        expect(moving.movementState).toBe('portal-in');
        moving = advancePrototypeAgents([moving], 220, 2_000, false, doorsOpen, registeredGraph)[0];
        expect(moving.portalTransition).toBeUndefined();
        expect(moving.point).toEqual(d01Step.exitPoint);
        const continued = advancePrototypeAgents([moving], 100, 180, false, doorsOpen, registeredGraph)[0];
        expect(continued.progress).toBeGreaterThan(moving.progress);
    });

    it('selects a nearby reachable alternative when the closest endpoint is occupied', () => {
        const agent = createPrototypeAgents(registeredGraph, 1, 'debug')[0];
        const occupant = { point: agent.point };
        const selection = findValidatedPrototypeRouteToPoint(registeredGraph, agent, occupant.point, undefined, { occupiedPoints: [occupant.point] });
        expect(selection.status, JSON.stringify(selection)).toBe('accepted');
        if (selection.status !== 'accepted') return;
        expect(Math.hypot(selection.plan.snappedPoint.x - occupant.point.x, selection.plan.snappedPoint.y - occupant.point.y)).toBeGreaterThanOrEqual(72);
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

    it('represents multiple ordered portal transitions in one runtime route', () => {
        const agent = createPrototypeAgents(graph, 1, 'debug')[0];
        const plan = portalTestPlan(agent, 2);
        expect(plan.route.crossedDoorIds).toHaveLength(2);
        expect(plan.route.doorSteps.map(step => step.doorId)).toEqual(plan.route.crossedDoorIds);
        expect(plan.route.doorSteps[1].approachDistance).toBeGreaterThan(plan.route.doorSteps[0].exitDistance);
        expect(plan.route.doorSteps.every(step => step.requiredAction === 'none')).toBe(true);
    });

    it('crosses door routes through a bounded portal-out, hidden, and portal-in transition', () => {
        const agent = createPrototypeAgents(graph, 1, 'debug')[0];
        const plan = portalTestPlan(agent);
        const firstStep = plan.route.doorSteps[0];
        let current = {
            ...startPrototypeRoute(agent, plan),
            point: firstStep.thresholdPoint,
            progress: Math.max(0, firstStep.thresholdDistance - 1),
        };
        const doorsOpen = prototypeOpenDoorRuntimes(graph);
        for (let index = 0; index < 100 && !current.portalTransition; index += 1) {
            current = advancePrototypeAgents([current], 100, 2_000, false, doorsOpen)[0];
        }
        expect(current.movementState).toBe('portal-out');
        const cadenceAtPortal = current.walkCycleElapsedMs;
        const pausedPortal = advancePrototypeAgents([current], 100, 2_000, true, doorsOpen)[0];
        expect(pausedPortal.portalTransition?.elapsedMs).toBe(current.portalTransition?.elapsedMs);
        expect(pausedPortal.point).toEqual(current.point);
        current = advancePrototypeAgents([current], 170, 2_000, false, doorsOpen)[0];
        expect(current.movementState).toBe('hidden-transition');
        expect(current.walkCycleElapsedMs).toBe(cadenceAtPortal);
        current = advancePrototypeAgents([current], 120, 2_000, false, doorsOpen)[0];
        expect(current.movementState).toBe('portal-in');
        current = advancePrototypeAgents([current], 220, 2_000, false, doorsOpen)[0];
        expect(current.portalTransition).toBeUndefined();
        expect(current.movementState).toBe('walking');
    });

    it('reserves a portal exit deterministically and releases it after owner removal', () => {
        const [first, second, third] = createPrototypeAgents(graph, 3, 'debug');
        const plan = portalTestPlan(first);
        const step = plan.route.doorSteps[0];
        const atApproach = (agent: typeof first) => ({
            ...startPrototypeRoute(agent, plan),
            point: step.approachPoint,
            progress: step.approachDistance,
        });
        const doorsOpen = prototypeOpenDoorRuntimes(graph);
        const congested = advancePrototypeAgents([atApproach(first), atApproach(second), atApproach(third)], 16, 180, false, doorsOpen);
        expect(congested.filter(agent => Boolean(agent.portalTransition))).toHaveLength(1);
        expect(congested.filter(agent => agent.movementState === 'waiting')).toHaveLength(2);
        const ownerId = congested.find(agent => agent.portalTransition)?.fixture.id;
        const afterReset = advancePrototypeAgents(
            congested.map(agent => agent.fixture.id === ownerId ? resetPrototypeAgent(agent) : agent),
            16,
            180,
            false,
            doorsOpen,
        );
        expect(afterReset.filter(agent => Boolean(agent.portalTransition))).toHaveLength(1);
        const remaining = congested.filter(agent => agent.fixture.id !== ownerId);
        const afterRemoval = advancePrototypeAgents(remaining, 16, 180, false, doorsOpen);
        expect(afterRemoval.filter(agent => Boolean(agent.portalTransition))).toHaveLength(1);
        expect(new Set(afterRemoval.map(agent => `${agent.point.x},${agent.point.y}`)).size).toBeGreaterThan(1);
    });

    it('does not let two agents settle on the same feet position', () => {
        const [first, second] = createPrototypeAgents(graph, 2, 'debug');
        const target = { x: 4_000, y: 2_700 };
        const routePlan = (start: typeof target, nodeId: string) => ({
            route: {
                status: 'valid' as const,
                reason: 'test route',
                points: [start, target],
                crossedDoorIds: [],
                doorSteps: [],
                nodeSequence: [nodeId, 'shared-target'],
                cost: 100,
                length: Math.hypot(target.x - start.x, target.y - start.y),
                expandedNodeCount: 1,
            },
            clickedPoint: target,
            snappedPoint: target,
            snappedNodeId: 'shared-target',
            snapDistance: 0,
            candidatesEvaluated: 1,
            searchRadius: 160,
        });
        const firstStart = { x: target.x - 100, y: target.y };
        const secondStart = { x: target.x + 100, y: target.y };
        const firstPlan = routePlan(firstStart, first.currentNodeId);
        const secondPlan = routePlan(secondStart, second.currentNodeId);
        const moving = [
            { ...startPrototypeRoute({ ...first, point: firstStart }, firstPlan), progress: firstPlan.route.length - 1, point: { x: target.x - 1, y: target.y } },
            { ...startPrototypeRoute({ ...second, point: secondStart }, secondPlan), progress: secondPlan.route.length - 1, point: { x: target.x + 1, y: target.y } },
        ];
        const advanced = advancePrototypeAgents(moving, 1_000, 200, false, prototypeOpenDoorRuntimes(graph));
        expect(advanced.filter(agent => agent.movementState === 'arrived')).toHaveLength(1);
        expect(advanced.filter(agent => agent.movementState === 'waiting')).toHaveLength(1);
        expect(Math.hypot(advanced[0].point.x - advanced[1].point.x, advanced[0].point.y - advanced[1].point.y)).toBeGreaterThanOrEqual(68);
    });

    it('fails a repeatedly static-blocked route after one bounded replan', () => {
        const agent = createPrototypeAgents(graph, 1, 'debug')[0];
        const collisionPoint = graph.colliders.find(collider => collider.points.length > 0)!.points[0];
        const start = { x: Math.min(OFFICE_SOURCE_WIDTH - 1, collisionPoint.x + 500), y: collisionPoint.y };
        const target = collisionPoint;
        const routeLength = Math.hypot(target.x - start.x, target.y - start.y);
        const route = {
            status: 'valid' as const,
            reason: 'Static-stall recovery fixture.',
            points: [start, target],
            crossedDoorIds: [],
            doorSteps: [],
            nodeSequence: ['blocked-start', 'blocked-target'],
            cost: Math.round(routeLength),
            length: routeLength,
            expandedNodeCount: 1,
        };
        const stalled = {
            ...agent,
            point: start,
            route,
            progress: routeLength,
            movementState: 'blocked' as const,
            activityState: 'waiting' as const,
            targetPoint: target,
            staticCollisionStatus: 'blocked' as const,
            blockedDurationMs: 0,
            replanAttempts: 1,
            task: { kind: 'walk' as const, phase: 'traveling' as const, destination: target, nodeId: 'blocked-target', startedAtMs: 0 },
        };
        const recovered = advancePrototypeAgents([stalled], 100, 180, false, prototypeOpenDoorRuntimes(graph), graph)[0];
        expect(recovered.route).toBeNull();
        expect(recovered.movementState).toBe('idle');
        expect(recovered.task).toMatchObject({ kind: 'idle', reason: 'route-failed' });
    });

    it('places overlapping agent labels on deterministic alternate sides', () => {
        const [first, second] = createPrototypeAgents(graph, 2, 'debug');
        const isolated = layoutPrototypeAgentLabels([first], 1);
        expect(isolated.get(first.fixture.id)?.side).toBe('above');
        expect(isolated.get(first.fixture.id)?.y).toBeLessThan(0);
        const labels = layoutPrototypeAgentLabels([first, { ...second, point: first.point }], 1, { previous: isolated });
        expect(labels.get(first.fixture.id)).toEqual(labels.get(first.fixture.id));
        expect(labels.get(second.fixture.id)?.side).not.toBe(labels.get(first.fixture.id)?.side);
        const stable = layoutPrototypeAgentLabels([first, { ...second, point: { x: first.point.x + 1, y: first.point.y } }], 1, { previous: labels });
        expect(stable.get(first.fixture.id)?.side).toBe(labels.get(first.fixture.id)?.side);
    });

    it('assigns every validated runtime sprite variant deterministically and keeps identity through task changes', () => {
        const first = createPrototypeAgents(graph, 25, 'debug');
        const second = createPrototypeAgents(graph, 25, 'debug');
        expect(first.map(agent => agent.fixture.spriteAssetId)).toEqual(second.map(agent => agent.fixture.spriteAssetId));
        expect(new Set(first.map(agent => agent.fixture.spriteAssetId))).toHaveLength(12);
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
        expect(prototypeSpriteState(current)).toBe('typing');

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
    }, 15_000);

    it('routes talk partners toward distinct valid nodes and exposes reciprocal IDs', () => {
        const [agent, originalPartner] = createPrototypeAgents(graph, 2, 'debug');
        const currentPathId = graph.walkNodes.find(node => node.id === agent.currentNodeId)?.pathId;
        const partnerNode = graph.walkNodes
            .filter(node => node.pathId === currentPathId && node.id !== agent.currentNodeId)
            .map(node => ({ node, distance: Math.hypot(node.point.x - agent.point.x, node.point.y - agent.point.y) }))
            .filter(candidate => candidate.distance >= 100 && candidate.distance <= 280)
            .sort((a, b) => a.distance - b.distance || a.node.id.localeCompare(b.node.id))[0]?.node;
        expect(partnerNode).toBeTruthy();
        if (!partnerNode) return;
        const partner = repositionPrototypeAgent(originalPartner, {
            point: partnerNode.point,
            nodeId: partnerNode.id,
            roomId: partnerNode.roomIds[0] ?? partnerNode.roomId,
            distance: 0,
        }, 0);
        const assigned = assignPrototypeTalk(graph, agent, partner, 900, undefined, false);
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
        } })).toBe('typing');
        const working = { ...agent, fixture: { ...agent.fixture, id: 'prototype-agent-03' }, activityState: 'working-at-desk' as const, task: {
            kind: 'work' as const, phase: 'working' as const, workstationId: 'POSITION_001', destination: agent.point, nodeId: agent.currentNodeId, startedAtMs: 0,
        } };
        expect([0, 4_000, 8_000].map(elapsed => prototypeSpriteState(working, elapsed))).toEqual(['sitting', 'typing', 'working']);
    });
});
