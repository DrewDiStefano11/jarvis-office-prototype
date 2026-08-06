import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'artifacts', 'debug', 'floor1-reachability');
const BASELINE_SHA = '14ccd4f937c2b0b67d24627e86776ca9373d3af1';
const SAMPLE_SPACING = 192;
const REPLAY_ARGUMENT = process.argv.find(argument => argument === '--replay' || argument.startsWith('--replay='));
const REQUESTED_REPLAY_ID = REPLAY_ARGUMENT?.includes('=') ? REPLAY_ARGUMENT.split('=', 2)[1] : REPLAY_ARGUMENT ? 'representative-01' : null;

function pointKey(point) {
    return `${point.x.toFixed(3)},${point.y.toFixed(3)}`;
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function projectPointToSegment(point, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const denominator = dx * dx + dy * dy;
    const ratio = denominator === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / denominator));
    return { x: a.x + dx * ratio, y: a.y + dy * ratio };
}

async function json(relativePath) {
    return JSON.parse(await readFile(path.join(ROOT, relativePath), 'utf8'));
}

function buildSparseComponents(graph, segmentClear) {
    const adjacency = new Map();
    const points = new Map();
    const add = (key, point) => {
        points.set(key, point);
        if (!adjacency.has(key)) adjacency.set(key, []);
    };
    for (const node of graph.walkNodes) add(pointKey(node.point), node.point);
    for (const segment of graph.walkSegments) {
        const a = pointKey(segment.a);
        const b = pointKey(segment.b);
        add(a, segment.a);
        add(b, segment.b);
        if (!segmentClear(graph, segment.a, segment.b)) continue;
        adjacency.get(a).push(b);
        adjacency.get(b).push(a);
    }
    const componentByKey = new Map();
    const componentSizes = [];
    for (const key of [...points.keys()].sort()) {
        if (componentByKey.has(key)) continue;
        const id = componentSizes.length;
        const queue = [key];
        componentByKey.set(key, id);
        for (let cursor = 0; cursor < queue.length; cursor += 1) {
            for (const next of adjacency.get(queue[cursor]) ?? []) {
                if (componentByKey.has(next)) continue;
                componentByKey.set(next, id);
                queue.push(next);
            }
        }
        componentSizes.push(queue.length);
    }
    return { points, adjacency, componentByKey, componentSizes };
}

function nearestSparseSupport(graph, components, point) {
    let best = null;
    for (const node of graph.walkNodes) {
        const candidate = {
            distance: distance(point, node.point),
            point: node.point,
            componentId: components.componentByKey.get(pointKey(node.point)) ?? null,
            sourceId: node.id,
            kind: 'node',
        };
        if (!best || candidate.distance < best.distance || (candidate.distance === best.distance && candidate.sourceId.localeCompare(best.sourceId) < 0)) best = candidate;
    }
    for (const segment of graph.walkSegments) {
        const projected = projectPointToSegment(point, segment.a, segment.b);
        const candidate = {
            distance: distance(point, projected),
            point: projected,
            componentId: components.componentByKey.get(pointKey(segment.a)) ?? components.componentByKey.get(pointKey(segment.b)) ?? null,
            sourceId: segment.id,
            kind: 'segment',
        };
        if (!best || candidate.distance < best.distance || (candidate.distance === best.distance && candidate.sourceId.localeCompare(best.sourceId) < 0)) best = candidate;
    }
    return best;
}

function nearestSparseNode(graph, components, point) {
    return graph.walkNodes
        .map(node => ({
            distance: distance(point, node.point),
            point: node.point,
            componentId: components.componentByKey.get(pointKey(node.point)) ?? null,
            sourceId: node.id,
            kind: 'node',
        }))
        .sort((a, b) => a.distance - b.distance || a.sourceId.localeCompare(b.sourceId))[0] ?? null;
}

function roomForPoint(graph, point, pointInPolygon) {
    return graph.rooms.filter(room => pointInPolygon(point, room.polygon)).sort((a, b) => a.id.localeCompare(b.id));
}

function markdown(report) {
    const roomRows = report.roomCoverage.map(room => `| ${room.roomId} | ${room.validSamples} | ${room.withinSnapEnvelope} | ${room.outsideSnapEnvelope} | ${room.maximumSupportDistance.toFixed(1)} |`).join('\n');
    return `# Floor 1 Sparse Navigation Baseline\n\n` +
        `Starting SHA: \`${report.startingSha}\`\n\n` +
        `This is a deterministic pre-change audit of PR #27's sparse walk-node/segment authority. It is not a production-approval artifact.\n\n` +
        `- Sample spacing: ${report.sampleStrategy.spacing} source pixels\n` +
        `- Clearance-valid interior samples: ${report.samples.valid}\n` +
        `- Samples farther than the 620 px snap envelope: ${report.samples.outsideSnapEnvelope}\n` +
        `- Sparse walk components: ${report.sparseComponents.count}\n` +
        `- Largest sparse component: ${report.sparseComponents.largestSize} points\n` +
        `- Portal endpoints: ${report.doors.provisionalValid}/${report.doors.total} provisional-valid\n` +
        `- Unsupported portal IDs: ${report.doors.unsupportedIds.join(', ') || 'none'}\n` +
        `- D46: ${report.d46.status}; ${report.d46.reason}\n\n` +
        `## Room coverage\n\n| Room | Valid samples | Within 620 px | Outside 620 px | Max support distance |\n|---|---:|---:|---:|---:|\n${roomRows}\n\n` +
        `## Representative failures\n\n${report.failures.slice(0, 30).map(item => `- ${item.id}: (${item.point.x}, ${item.point.y}) in ${item.roomIds.join(', ')} — ${item.reason}; nearest ${item.nearestSupport.kind} ${item.nearestSupport.sourceId} at ${item.nearestSupport.distance.toFixed(1)} px.`).join('\n')}\n`;
}

function certificationMarkdown(report) {
    const exclusions = report.excludedComponents.map(component => `| ${component.componentId} | ${component.classification} | ${component.size} | ${component.roomIds.join(', ') || 'none'} | ${component.reason} |`).join('\n');
    const routes = report.representativeRoutes.map(route => `| ${route.id} | ${route.status} | ${route.forwardDistance.toFixed(1)} | ${route.reverseDistance.toFixed(1)} | ${route.forwardMetrics.turns} | ${route.forwardMetrics.smoothingReductionPercentage.toFixed(1)}% | ${route.forwardMetrics.expandedCells} | ${route.crossedDoorIds.join(', ') || 'none'} |`).join('\n');
    return `# Floor 1 Continuous Reachability Certification\n\n` +
        `Candidate registration remains unverified; this certifies navigation behavior only.\n\n` +
        `- Navigation revision: \`${report.navigationRevision}\`\n` +
        `- Source geometry revision: \`${report.sourceGeometryRevision}\`\n` +
        `- Adaptive samples: ${report.totalSamples.toLocaleString()}\n` +
        `- Clearance-valid authoritative samples: ${report.validSamples.toLocaleString()}\n` +
        `- Expected-component samples: ${report.expectedComponentSamples.toLocaleString()}\n` +
        `- Coverage: ${report.validCoveragePercentage.toFixed(3)}%\n` +
        `- Interior cells: ${report.interiorComponentCellCount.toLocaleString()}\n` +
        `- Reversible interior doors: ${report.reversibleInteriorDoors}\n` +
        `- Non-reversible interior doors: ${report.nonReversibleInteriorDoorIds.join(', ') || 'none'}\n\n` +
        `## Explicit exclusions\n\n| Component | Classification | Cells | Rooms | Evidence |\n|---:|---|---:|---|---|\n${exclusions}\n\n` +
        `## Representative reversible routes\n\n| Case | Status | Forward px | Reverse px | Turns | Smoothed | Expanded cells | Doors |\n|---|---|---:|---:|---:|---:|---:|---|\n${routes}\n`;
}

async function main() {
    const vite = await createServer({
        appType: 'custom',
        configFile: false,
        logLevel: 'error',
        optimizeDeps: { noDiscovery: true },
        server: { middlewareMode: true },
    });
    try {
        const candidate = await vite.ssrLoadModule('/src/office/floor1/navigation/candidateNavigation.ts');
        const prototype = await vite.ssrLoadModule('/src/office/floor1/navigation/prototypeRuntime.ts');
        const continuous = await vite.ssrLoadModule('/src/office/floor1/navigation/continuousNavigation.ts');
        const reachability = await vite.ssrLoadModule('/src/office/floor1/navigation/reachability.ts');
        const registrationModule = await vite.ssrLoadModule('/src/office/floor1/candidateRegistration.ts');
        const documents = {
            rooms: await json('src/office/data/floor1/provisional/rooms.json'),
            positions: await json('src/office/data/floor1/provisional/positions.json'),
            doors: await json('src/office/data/floor1/provisional/doors.json'),
            computers: await json('src/office/data/floor1/provisional/computers.json'),
            interactiveObjects: await json('src/office/data/floor1/provisional/interactive-objects.json'),
            walls: await json('src/office/data/floor1/provisional/walls.json'),
            objects: await json('src/office/data/floor1/provisional/objects.json'),
            walkPaths: await json('src/office/data/floor1/provisional/walk-paths.json'),
        };
        const sourceGraph = candidate.buildCandidateSandboxGraph(documents, registrationModule.FLOOR1_CANDIDATE_REGISTRATION);
        const graph = prototype.prototypeOpenGraph(sourceGraph);
        const continuousField = continuous.buildContinuousNavigationField(graph);
        const certification = reachability.certifyContinuousNavigation(continuousField, 96);
        const { samples: _omittedSamples, ...compactCertification } = certification;
        const components = buildSparseComponents(graph, candidate.candidateSegmentHasStaticClearance);
        const portalAudit = prototype.auditPrototypePortalEndpoints(graph);
        const validSamples = [];
        const roomCounts = new Map(graph.rooms.map(room => [room.id, { roomId: room.id, roomName: room.name, validSamples: 0, withinSnapEnvelope: 0, outsideSnapEnvelope: 0, maximumSupportDistance: 0 }]));
        for (let y = SAMPLE_SPACING / 2; y < 5460; y += SAMPLE_SPACING) {
            for (let x = SAMPLE_SPACING / 2; x < 8192; x += SAMPLE_SPACING) {
                const point = { x, y };
                const rooms = roomForPoint(graph, point, candidate.pointInPolygon);
                if (rooms.length === 0 || !candidate.candidatePointHasStaticClearance(graph, point)) continue;
                const nearestSupport = nearestSparseSupport(graph, components, point);
                const nearestNode = nearestSparseNode(graph, components, point);
                if (!nearestSupport || !nearestNode) continue;
                validSamples.push({ point, roomIds: rooms.map(room => room.id), nearestSupport, nearestNode });
                for (const room of rooms) {
                    const summary = roomCounts.get(room.id);
                    summary.validSamples += 1;
                    summary.maximumSupportDistance = Math.max(summary.maximumSupportDistance, nearestSupport.distance);
                    if (nearestNode.distance <= prototype.PROTOTYPE_CLICK_SNAP_LIMIT) summary.withinSnapEnvelope += 1;
                    else summary.outsideSnapEnvelope += 1;
                }
            }
        }
        const probeAgent = prototype.createPrototypeAgents(graph, 1, 'debug')[0];
        const routeProbes = validSamples.map(sample => ({ sample, result: prototype.selectSparsePrototypeRouteToPoint(graph, probeAgent, sample.point) }));
        const continuousRouteProbes = validSamples.map((sample, index) => ({
            sample,
            result: continuous.planContinuousNavigationRoute(continuousField, {
                requestId: `coarse-${String(index + 1).padStart(4, '0')}`,
                navigationRevision: continuousField.navigationRevision,
                start: probeAgent.point,
                destination: sample.point,
            }),
        }));
        const routeOutcomeCounts = Object.fromEntries([...new Set(routeProbes.map(probe => probe.result.status === 'accepted' ? 'accepted' : probe.result.reason))]
            .sort().map(key => [key, routeProbes.filter(probe => (probe.result.status === 'accepted' ? 'accepted' : probe.result.reason) === key).length]));
        const failures = routeProbes
            .filter(probe => probe.sample.nearestNode.distance > prototype.PROTOTYPE_CLICK_SNAP_LIMIT || probe.result.status !== 'accepted')
            .sort((a, b) => b.sample.nearestNode.distance - a.sample.nearestNode.distance || a.sample.point.y - b.sample.point.y || a.sample.point.x - b.sample.point.x)
            .map(({ sample, result }, index) => ({
                id: `baseline-snap-${String(index + 1).padStart(4, '0')}`,
                point: sample.point,
                roomIds: sample.roomIds,
                reason: sample.nearestNode.distance > prototype.PROTOTYPE_CLICK_SNAP_LIMIT
                    ? `No sparse navigation node within ${prototype.PROTOTYPE_CLICK_SNAP_LIMIT}px`
                    : result.status === 'accepted' ? 'Accepted' : `${result.reason}: ${result.message}`,
                nearestSupport: sample.nearestNode,
            }));
        const d46 = portalAudit.find(item => item.doorId === 'D46');
        const componentSizes = [...components.componentSizes].sort((a, b) => b - a);
        const componentSizeHistogram = Object.fromEntries([...new Set(componentSizes)].sort((a, b) => a - b)
            .map(size => [String(size), componentSizes.filter(candidate => candidate === size).length]));
        const report = {
            schemaVersion: 1,
            mode: 'pr27-sparse-baseline',
            startingSha: BASELINE_SHA,
            navigationRevision: 'pr27-sparse-unrevisioned',
            sourceGeometryRevision: registrationModule.FLOOR1_CANDIDATE_REGISTRATION.provenance?.generatedArtifact ?? 'unknown',
            mapBounds: { width: 8192, height: 5460 },
            footprint: { radius: candidate.AGENT_FOOTPRINT_RADIUS },
            sampleStrategy: { kind: 'uniform-baseline-grid', spacing: SAMPLE_SPACING, note: 'Final certification will replace this coarse baseline with adaptive boundary, corner, door, anchor, and narrow-passage sampling.' },
            graph: { walkNodes: graph.walkNodes.length, walkSegments: graph.walkSegments.length, colliders: graph.colliders.length, rooms: graph.rooms.length },
            sparseComponents: { count: componentSizes.length, largestSize: componentSizes[0] ?? 0, sizeHistogram: componentSizeHistogram },
            samples: {
                valid: validSamples.length,
                withinSnapEnvelope: validSamples.filter(sample => sample.nearestNode.distance <= prototype.PROTOTYPE_CLICK_SNAP_LIMIT).length,
                outsideSnapEnvelope: validSamples.filter(sample => sample.nearestNode.distance > prototype.PROTOTYPE_CLICK_SNAP_LIMIT).length,
                maximumSupportDistance: Math.max(0, ...validSamples.map(sample => sample.nearestSupport.distance)),
                maximumNodeDistance: Math.max(0, ...validSamples.map(sample => sample.nearestNode.distance)),
                routeOutcomes: routeOutcomeCounts,
            },
            roomCoverage: [...roomCounts.values()].filter(room => room.validSamples > 0).sort((a, b) => a.roomId.localeCompare(b.roomId)),
            doors: {
                total: portalAudit.length,
                provisionalValid: portalAudit.filter(item => item.status === 'provisional-valid').length,
                unsupportedIds: portalAudit.filter(item => item.status !== 'provisional-valid').map(item => item.doorId),
            },
            d46: d46 ?? { doorId: 'D46', status: 'missing', reason: 'D46 is absent from the portal audit.', approachPoint: null, exitPoint: null },
            continuous: {
                navigationRevision: continuousField.navigationRevision,
                sourceGeometryRevision: continuousField.sourceGeometryRevision,
                cells: continuousField.cells.length,
                components: continuousField.componentSizes.length,
                componentSizes: [...continuousField.componentSizes].sort((a, b) => b - a),
                componentDetails: continuousField.componentSizes.map((size, componentId) => ({
                    componentId,
                    size,
                    roomIds: [...new Set(continuousField.cells.filter(cell => continuousField.componentByCellId.get(cell.id) === componentId).flatMap(cell => cell.roomIds))].sort(),
                })).sort((a, b) => b.size - a.size || a.componentId - b.componentId),
                doorClassifications: Object.fromEntries(['interior', 'exterior', 'malformed'].map(classification => [classification, continuousField.doorLinks.filter(link => link.classification === classification).length])),
                doorLinks: continuousField.doorLinks,
                routeOutcomes: Object.fromEntries([...new Set(continuousRouteProbes.map(probe => probe.result.status === 'valid' ? 'valid' : probe.result.reason))].sort().map(key => [key, continuousRouteProbes.filter(probe => (probe.result.status === 'valid' ? 'valid' : probe.result.reason) === key).length])),
                routeFailures: continuousRouteProbes.filter(probe => probe.result.status !== 'valid').map(probe => ({
                    point: probe.sample.point,
                    roomIds: probe.sample.roomIds,
                    reason: probe.result.reason,
                    projectedPoint: probe.result.projectedDestination,
                    acceptedRoomIds: probe.result.destinationProjection.acceptedRoomIds,
                })),
                issues: continuousField.issues,
            },
            failures: failures.slice(0, 100),
            omittedFailureCount: Math.max(0, failures.length - 100),
        };
        await mkdir(OUTPUT_DIR, { recursive: true });
        await writeFile(path.join(OUTPUT_DIR, 'baseline-reachability-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
        await writeFile(path.join(OUTPUT_DIR, 'baseline-reachability-summary.md'), markdown(report), 'utf8');
        await writeFile(path.join(OUTPUT_DIR, 'reachability-report.json'), `${JSON.stringify(compactCertification, null, 2)}\n`, 'utf8');
        await writeFile(path.join(OUTPUT_DIR, 'reachability-summary.md'), certificationMarkdown(certification), 'utf8');
        await writeFile(path.join(OUTPUT_DIR, 'replay-cases.json'), `${JSON.stringify({ schemaVersion: 1, navigationRevision: certification.navigationRevision, cases: certification.representativeRoutes }, null, 2)}\n`, 'utf8');
        const replay = REQUESTED_REPLAY_ID ? certification.representativeRoutes.find(route => route.id === REQUESTED_REPLAY_ID) : null;
        const failed = certification.validCoveragePercentage !== 100
            || certification.nonReversibleInteriorDoorIds.length > 0
            || certification.representativeRoutes.some(route => route.status !== 'valid')
            || Boolean(REQUESTED_REPLAY_ID && !replay);
        process.stdout.write(`${JSON.stringify({ output: path.relative(ROOT, OUTPUT_DIR), baseline: { validSamples: report.samples.valid, acceptedRoutes: report.samples.routeOutcomes.accepted ?? 0, components: report.sparseComponents.count, unsupportedDoors: report.doors.unsupportedIds }, continuous: { revision: certification.navigationRevision, buildMs: Number(continuousField.buildDurationMs.toFixed(2)), samples: certification.totalSamples, validSamples: certification.validSamples, coverage: certification.validCoveragePercentage, interiorCells: certification.interiorComponentCellCount, rawComponents: certification.rawComponentCount, reversibleInteriorDoors: certification.reversibleInteriorDoors, nonReversibleInteriorDoorIds: certification.nonReversibleInteriorDoorIds, representativeRoutes: certification.representativeRoutes.length, excludedComponents: certification.excludedComponents.length }, replay })}\n`);
        if (failed) process.exitCode = 1;
    } finally {
        await vite.close();
    }
}

await main();
