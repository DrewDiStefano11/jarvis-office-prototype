import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = 'http://127.0.0.1:8080/';
const endpoint = process.env.JARVIS_QA_CDP_ENDPOINT ?? 'http://127.0.0.1:9222';
const timedRunMs = Number(process.env.JARVIS_QA_TIMED_RUN_MS ?? 600_000);
const maximumDragAttempts = Number(process.env.JARVIS_QA_MAX_DRAG_ATTEMPTS ?? 80);
const outputDir = path.resolve('artifacts/debug/pr27-terminal-browser-qa');
await mkdir(outputDir, { recursive: true });

const target = await fetch(`${endpoint}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' }).then(async response => {
    if (!response.ok) throw new Error(`Unable to create CDP target: ${response.status} ${await response.text()}`);
    return response.json();
});
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
});

let commandId = 0;
const pending = new Map();
const browserEvents = [];
socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
        const handler = pending.get(message.id);
        if (!handler) return;
        pending.delete(message.id);
        if (message.error) handler.reject(new Error(`${message.error.code}: ${message.error.message}`));
        else handler.resolve(message.result);
        return;
    }
    if (['Runtime.consoleAPICalled', 'Runtime.exceptionThrown', 'Log.entryAdded', 'Network.loadingFailed'].includes(message.method)) {
        browserEvents.push({ at: new Date().toISOString(), method: message.method, params: message.params });
    }
});

function send(method, params = {}) {
    const id = ++commandId;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
async function evaluate(expression, awaitPromise = true) {
    const result = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ?? 'Browser evaluation failed');
    return result.result.value;
}
const call = (fn, ...args) => evaluate(`(${fn})(${args.map(argument => JSON.stringify(argument)).join(',')})`);
async function waitFor(expression, timeoutMs = 45_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (await evaluate(expression)) return;
        await sleep(100);
    }
    throw new Error(`Timed out waiting for ${expression}`);
}
async function screenshot(name) {
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
    await writeFile(path.join(outputDir, `${name}.png`), Buffer.from(shot.data, 'base64'));
}
async function navigate(url) {
    await send('Page.navigate', { url });
    await waitFor(`document.readyState === 'complete'`);
    await waitFor(`Boolean(document.querySelector('.office-viewport'))`);
    await sleep(1_500);
}
async function clickText(text) {
    const point = await call(label => {
        const element = [...document.querySelectorAll('button')].find(button => button.textContent?.trim() === label);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }, text);
    if (!point) throw new Error(`Button not found: ${text}`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', buttons: 1, clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', buttons: 0, clickCount: 1 });
}
async function setInput(ariaLabel, value) {
    return call((label, nextValue) => {
        const input = document.querySelector(`input[aria-label="${label}"]`);
        if (!input) return null;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(input, String(nextValue));
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return input.value;
    }, ariaLabel, value);
}
async function agentSnapshot() {
    return call(() => [...document.querySelectorAll('.prototype-agent')].map(agent => {
        const rect = agent.getBoundingClientRect();
        const frame = agent.querySelector('.sprite-player__frame');
        const player = agent.querySelector('.sprite-player');
        const label = agent.querySelector('.prototype-agent__label');
        return {
            id: agent.dataset.agentId,
            x: Number.parseFloat(agent.style.left), y: Number.parseFloat(agent.style.top),
            screenX: rect.left + rect.width / 2, screenY: rect.top + rect.height / 2,
            activity: agent.dataset.agentState, movement: agent.dataset.movementState,
            sprite: agent.dataset.spriteState, resolvedSprite: player?.dataset.state,
            direction: agent.dataset.spriteDirection, revision: Number(agent.dataset.agentRevision),
            progress: Number(agent.dataset.routeProgress), portalDoor: agent.dataset.portalDoor,
            portalPhase: agent.dataset.portalPhase, taskKind: agent.dataset.taskKind, taskPhase: agent.dataset.taskPhase,
            framePosition: frame ? getComputedStyle(frame).backgroundPosition : null,
            frameImage: frame ? getComputedStyle(frame).backgroundImage : null,
            labelOpacity: label ? getComputedStyle(label).opacity : null,
            labelVisibility: label ? getComputedStyle(label).visibility : null,
        };
    }));
}
async function dragAgent(agentId, worldTarget) {
    await call(() => {
        window.__jarvisQaPointerEvents = [];
        if (window.__jarvisQaPointerCaptureInstalled) return;
        window.__jarvisQaPointerCaptureInstalled = true;
        for (const type of ['pointerdown', 'pointermove', 'pointerup', 'gotpointercapture', 'lostpointercapture']) {
            document.addEventListener(type, event => {
                window.__jarvisQaPointerEvents.push({ type, pointerId: event.pointerId, x: event.clientX, y: event.clientY,
                    target: event.target?.className ?? event.target?.tagName, buttons: event.buttons });
            }, true);
        }
    });
    const geometry = await call((id, targetPoint) => {
        const agent = document.querySelector(`.prototype-agent[data-agent-id="${id}"]`);
        const surface = document.querySelector('.office-surface');
        if (!agent || !surface) return null;
        const agentRect = agent.getBoundingClientRect();
        const surfaceRect = surface.getBoundingClientRect();
        const scale = surfaceRect.width / 8192;
        return {
            start: { x: agentRect.left + agentRect.width / 2, y: agentRect.top + agentRect.height / 2 },
            end: { x: surfaceRect.left + targetPoint.x * scale, y: surfaceRect.top + targetPoint.y * scale },
            origin: { x: Number.parseFloat(agent.style.left), y: Number.parseFloat(agent.style.top) },
        };
    }, agentId, worldTarget);
    if (!geometry) throw new Error(`Unable to locate ${agentId}`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...geometry.start, button: 'left', buttons: 1, clickCount: 1 });
    for (let step = 1; step <= 5; step += 1) {
        await send('Input.dispatchMouseEvent', {
            type: 'mouseMoved', x: geometry.start.x + (geometry.end.x - geometry.start.x) * step / 5,
            y: geometry.start.y + (geometry.end.y - geometry.start.y) * step / 5, button: 'left', buttons: 1,
        });
        await sleep(35);
    }
    const during = (await agentSnapshot()).find(agent => agent.id === agentId);
    const dragUiDuring = await call(id => {
        const agent = document.querySelector(`.prototype-agent[data-agent-id="${id}"]`);
        return { preview: Boolean(document.querySelector('.floor1-candidate-drag-feedback')),
            draggingClass: agent?.classList.contains('prototype-agent--dragging'),
            hasPointerCapture: agent?.hasPointerCapture(1),
            statuses: [...document.querySelectorAll('[role="status"]')].map(element => element.textContent?.trim()).filter(Boolean),
            events: window.__jarvisQaPointerEvents };
    }, agentId);
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...geometry.end, button: 'left', buttons: 0, clickCount: 1 });
    await sleep(150);
    const after = (await agentSnapshot()).find(agent => agent.id === agentId);
    const dragUiAfter = await call(() => ({ preview: Boolean(document.querySelector('.floor1-candidate-drag-feedback')),
        statuses: [...document.querySelectorAll('[role="status"]')].map(element => element.textContent?.trim()).filter(Boolean),
        events: window.__jarvisQaPointerEvents }));
    return { geometry, during, after, dragUiDuring, dragUiAfter };
}
async function waitForRoute(agentId, timeoutMs, portalShots) {
    const deadline = Date.now() + timeoutMs;
    const phases = [];
    const doors = new Set();
    let sawWalking = false;
    let last = null;
    while (Date.now() < deadline) {
        last = (await agentSnapshot()).find(agent => agent.id === agentId);
        if (!last) break;
        if (last.movement === 'walking' || last.movement === 'waiting') sawWalking = true;
        if (last.portalPhase) {
            phases.push({ at: Date.now(), door: last.portalDoor, phase: last.portalPhase, x: last.x, y: last.y });
            doors.add(last.portalDoor);
            if (portalShots.count < 3) {
                await screenshot(`portal-${String(++portalShots.count).padStart(2, '0')}-${last.portalDoor}-${last.portalPhase}`);
            }
        }
        if (sawWalking && !['walking', 'waiting'].includes(last.movement) && !last.portalPhase) break;
        await sleep(50);
    }
    return { sawWalking, last, phases, doors: [...doors] };
}

async function discoverRouteCases(limit = 25) {
    return evaluate(`Promise.all([
        import('/src/office/floor1/navigation/candidateNavigation.ts'),
        import('/src/office/floor1/navigation/prototypeRuntime.ts'),
        import('/src/office/floor1/candidateRegistration.ts'),
        import('/src/office/data/floor1/provisional/rooms.json'),
        import('/src/office/data/floor1/provisional/positions.json'),
        import('/src/office/data/floor1/provisional/doors.json'),
        import('/src/office/data/floor1/provisional/computers.json'),
        import('/src/office/data/floor1/provisional/interactive-objects.json'),
        import('/src/office/data/floor1/provisional/walls.json'),
        import('/src/office/data/floor1/provisional/objects.json'),
        import('/src/office/data/floor1/provisional/walk-paths.json'),
    ]).then(([candidate, prototype, registration, rooms, positions, doors, computers, interactiveObjects, walls, objects, walkPaths]) => {
        const graph = prototype.prototypeOpenGraph(candidate.buildCandidateSandboxGraph({
            rooms: rooms.default, positions: positions.default, doors: doors.default, computers: computers.default,
            interactiveObjects: interactiveObjects.default, walls: walls.default, objects: objects.default, walkPaths: walkPaths.default,
        }, registration.FLOOR1_CANDIDATE_REGISTRATION));
        const agents = prototype.createPrototypeAgents(graph, ${limit}, 'debug');
        const fixtures = agents.map(agent => agent.point);
        const portalEndpoints = prototype.auditPrototypePortalEndpoints(graph).filter(item => item.status === 'provisional-valid');
        const cross = [];
        const local = [];
        for (const agent of agents) {
            let crossCase = null;
            let localCase = null;
            const room = prototype.prototypeRoomAtPoint(graph, agent.point);
            const connectedDoors = graph.doors.filter(door => door.zoneIds.includes(room.id));
            for (const door of connectedDoors) {
                const endpoints = portalEndpoints.find(item => item.doorId === door.id);
                if (!endpoints) continue;
                const roomSide = door.zoneIds.indexOf(room.id);
                const target = roomSide === 0 ? endpoints.exitPoint : endpoints.approachPoint;
                if (!target || fixtures.some(point => Math.hypot(target.x - point.x, target.y - point.y) < 110)) continue;
                const selection = prototype.selectPrototypeRouteToPoint(graph, agent, target);
                if (selection.status !== 'accepted') continue;
                crossCase = { agentId: agent.fixture.id, origin: agent.point, target: selection.plan.snappedPoint,
                    crossedDoorIds: selection.plan.route.crossedDoorIds, length: selection.plan.route.length };
                if (crossCase.crossedDoorIds.length > 0) break;
                crossCase = null;
            }
            if (!crossCase) {
                for (let seed = 0; seed < 12; seed += 1) {
                    const assigned = prototype.assignPrototypeWander(graph, agent, seed, 0);
                    if (!assigned?.targetPoint || !assigned.route || assigned.route.crossedDoorIds.length > 0) continue;
                    if (fixtures.some(point => Math.hypot(assigned.targetPoint.x - point.x, assigned.targetPoint.y - point.y) < 110)) continue;
                    localCase = { agentId: agent.fixture.id, origin: agent.point, target: assigned.targetPoint,
                        crossedDoorIds: assigned.route.crossedDoorIds, length: assigned.route.length };
                    break;
                }
            }
            if (crossCase) cross.push(crossCase);
            else if (localCase) local.push(localCase);
        }
        return { cases: [...cross, ...local], crossCount: cross.length, localCount: local.length,
            supportedDoors: prototype.auditPrototypePortalEndpoints(graph).filter(item => item.status === 'provisional-valid').map(item => item.doorId),
            unsupportedDoors: prototype.auditPrototypePortalEndpoints(graph).filter(item => item.status !== 'provisional-valid').map(item => item.doorId) };
    })`);
}

async function timedMotionRun(label, durationMs) {
    process.stdout.write(`[qa] ${label} timed run started for ${durationMs}ms\n`);
    const heartbeat = setInterval(() => process.stdout.write(`[qa] ${label} still running ${new Date().toISOString()}\n`), 30_000);
    try {
        return await call(duration => new Promise(resolve => {
            let started = null;
            let previousAt = null;
            let maxSampleGapMs = 0;
            let movingNoChangeMs = 0;
            let maximumMovingNoChangeMs = 0;
            let staleRollbackCount = 0;
            let backwardsCount = 0;
            let sidewaysCount = 0;
            let movingSamples = 0;
            let positionChanges = 0;
            let frameChanges = 0;
            let renderedSamples = 0;
            const gaps = [];
            const longTasks = [];
            const observer = typeof PerformanceObserver === 'undefined' ? null : new PerformanceObserver(entries => {
                for (const entry of entries.getEntries()) longTasks.push({ startTime: entry.startTime, duration: entry.duration });
            });
            try { observer?.observe({ type: 'longtask', buffered: true }); } catch { /* Long Task API is optional. */ }
            const previous = new Map();
            const states = new Set();
            const resolvedStates = new Set();
            const portalPhases = new Set();
            const portalDoors = new Set();
            const activityCounts = {};
            const timer = setInterval(() => {
                const now = performance.now();
                if (started === null) started = now;
                const gap = previousAt === null ? 0 : now - previousAt;
                previousAt = now;
                maxSampleGapMs = Math.max(maxSampleGapMs, gap);
                let moving = 0;
                let changed = 0;
                for (const agent of document.querySelectorAll('.prototype-agent')) {
                    const x = Number.parseFloat(agent.style.left);
                    const y = Number.parseFloat(agent.style.top);
                    const movement = agent.dataset.movementState;
                    const direction = agent.dataset.spriteDirection;
                    const [velocityX, velocityY] = (agent.dataset.velocity ?? '0,0').split(',').map(Number);
                    const revision = Number(agent.dataset.agentRevision);
                    const progress = Number(agent.dataset.routeProgress);
                    const frame = agent.querySelector('.sprite-player__frame');
                    const player = agent.querySelector('.sprite-player');
                    const framePosition = frame?.style.backgroundPosition ?? '';
                    const prior = previous.get(agent.dataset.agentId);
                    states.add(agent.dataset.spriteState);
                    if (player?.dataset.state) resolvedStates.add(player.dataset.state);
                    if (agent.dataset.portalPhase) portalPhases.add(agent.dataset.portalPhase);
                    if (agent.dataset.portalDoor) portalDoors.add(agent.dataset.portalDoor);
                    activityCounts[agent.dataset.agentState] = (activityCounts[agent.dataset.agentState] ?? 0) + 1;
                    if (['walking', 'waiting'].includes(movement)) moving += 1;
                    if (prior) {
                        const dx = x - prior.x;
                        const dy = y - prior.y;
                        const distance = Math.hypot(dx, dy);
                        if (distance > 0.05) { changed += 1; positionChanges += 1; }
                        if (framePosition !== prior.framePosition) frameChanges += 1;
                        if (movement === 'walking' && distance > 0.2) {
                            movingSamples += 1;
                            const forward = direction === 'east' ? velocityX : direction === 'west' ? -velocityX : direction === 'south' ? velocityY : -velocityY;
                            const side = direction === 'east' || direction === 'west' ? Math.abs(velocityY) : Math.abs(velocityX);
                            if (forward < -0.1) backwardsCount += 1;
                            if (side > Math.max(1, Math.abs(forward) * 1.5)) sidewaysCount += 1;
                        }
                        if (revision === prior.revision && movement === 'walking' && progress + 2 < prior.progress) staleRollbackCount += 1;
                    }
                    previous.set(agent.dataset.agentId, { x, y, revision, progress, framePosition });
                }
                if (moving > 0 && changed === 0) movingNoChangeMs += gap; else movingNoChangeMs = 0;
                maximumMovingNoChangeMs = Math.max(maximumMovingNoChangeMs, movingNoChangeMs);
                renderedSamples += 1;
                if (gap > 250) gaps.push({ atMs: now - started, gapMs: gap, moving, changed });
                if (now - started >= duration) {
                    clearInterval(timer);
                    observer?.disconnect();
                    resolve({ durationMs: now - started, sampleCount: renderedSamples, averageSampleGapMs: renderedSamples > 1 ? (now - started) / (renderedSamples - 1) : 0, maxSampleGapMs, maximumMovingNoChangeMs, staleRollbackCount,
                        backwardsCount, sidewaysCount, movingSamples, positionChanges, frameChanges, renderedSamples,
                        states: [...states], resolvedStates: [...resolvedStates], portalPhases: [...portalPhases], portalDoors: [...portalDoors], activityCounts, gaps, longTasks });
                }
            }, 100);
        }), durationMs);
    } finally {
        clearInterval(heartbeat);
    }
}

await Promise.all([send('Page.enable'), send('Runtime.enable'), send('Log.enable'), send('Network.enable'), send('Performance.enable')]);
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Network.clearBrowserCache');
await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });

const report = { startedAt: new Date().toISOString(), timedRunMs, normal: {}, candidate: {}, controls: {}, drags: {}, timed: {} };
await navigate(`${baseUrl}?qaNonce=${Date.now()}`);
report.normal = { href: await evaluate('location.href'), title: await evaluate('document.title'), text: (await evaluate('document.body.innerText')).slice(0, 1200) };
await screenshot('normal-route');

await navigate(`${baseUrl}?floor1Review=candidate&qaNonce=${Date.now()}`);
await waitFor(`Boolean(document.querySelector('.floor1-candidate-simulation'))`);
const sourcePath = path.resolve('src/components/office/Floor1CandidateSimulation.tsx');
const diskSource = await readFile(sourcePath, 'utf8');
const rawSourceUrl = `/src/components/office/Floor1CandidateSimulation.tsx?raw&qa=${Date.now()}`;
const servedSource = await evaluate(`import(${JSON.stringify(rawSourceUrl)}).then(module => module.default)`);
const digest = value => createHash('sha256').update(value).digest('hex');
report.candidate.sourceVerification = {
    diskSha256: digest(diskSource), servedSha256: servedSource ? digest(servedSource) : null,
    exactMatch: servedSource === diskSource, devClientPresent: await evaluate(`[...document.scripts].some(script => script.src.includes('/@vite/client'))`),
    continuousNavigationTokensPresent: servedSource.includes('continuousPrototypeNavigationField') && servedSource.includes('Navigation probes'),
};
await screenshot('candidate-initial');

const initialAgents = await agentSnapshot();
const targetPoints = initialAgents.map(agent => ({ x: agent.x, y: agent.y }));
report.candidate.initial = { agentCount: initialAgents.length, states: [...new Set(initialAgents.map(agent => agent.sprite))], agents: initialAgents };

await clickText('Pause');
const paused = await agentSnapshot();
await setInput('Office Engine agent count', 30);
await sleep(300);
const thirty = await agentSnapshot();
await setInput('Office Engine agent count', 10);
await sleep(300);
const ten = await agentSnapshot();
await setInput('Office Engine agent count', 1);
await sleep(200);
const one = await agentSnapshot();
await setInput('Office Engine agent count', 50);
await sleep(500);
const fifty = await agentSnapshot();
const samePoint = (left, right) => left?.id === right?.id && Math.hypot(left.x - right.x, left.y - right.y) < 0.01;
report.controls.countSlider = {
    limits: await call(() => { const input = document.querySelector('input[aria-label="Office Engine agent count"]'); return { min: input.min, max: input.max, value: input.value }; }),
    counts: [paused.length, thirty.length, ten.length, one.length, fifty.length],
    retained20At30: paused.every((agent, index) => samePoint(agent, thirty[index])),
    retained10AfterDecrease: ten.every((agent, index) => samePoint(agent, thirty[index])),
    retainedFirstAt50: samePoint(one[0], fifty[0]),
};

const hoverAgent = fifty.find(agent => agent.screenX > 0 && agent.screenX < 1920 && agent.screenY > 0 && agent.screenY < 1080);
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5, buttons: 0 });
await sleep(100);
const labelBefore = (await agentSnapshot()).find(agent => agent.id === hoverAgent.id);
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: hoverAgent.screenX, y: hoverAgent.screenY, buttons: 0 });
await sleep(150);
const labelHover = (await agentSnapshot()).find(agent => agent.id === hoverAgent.id);
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: hoverAgent.screenX, y: hoverAgent.screenY, button: 'left', buttons: 1, clickCount: 1 });
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: hoverAgent.screenX, y: hoverAgent.screenY, button: 'left', buttons: 0, clickCount: 1 });
await sleep(150);
const labelSelected = (await agentSnapshot()).find(agent => agent.id === hoverAgent.id);
report.controls.labels = { before: labelBefore, hover: labelHover, selected: labelSelected };

const matrixBefore = await call(() => getComputedStyle(document.querySelector('.office-surface')).transform);
await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 960, y: 600, deltaX: 0, deltaY: -600 });
await sleep(250);
const matrixZoom = await call(() => getComputedStyle(document.querySelector('.office-surface')).transform);
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 1800, y: 900, button: 'left', buttons: 1, clickCount: 1 });
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1650, y: 820, button: 'left', buttons: 1 });
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 1650, y: 820, button: 'left', buttons: 0, clickCount: 1 });
await sleep(250);
const matrixPan = await call(() => getComputedStyle(document.querySelector('.office-surface')).transform);
report.controls.panZoom = { before: matrixBefore, afterZoom: matrixZoom, afterPan: matrixPan, zoomChanged: matrixBefore !== matrixZoom, panChanged: matrixZoom !== matrixPan };
await clickText('Fit office');
await setInput('Simulation speed', 2);
await clickText('Resume');
report.timed.ambient50 = await timedMotionRun('ambient-50', timedRunMs);
await screenshot('ambient-50-after-timed-run');

await clickText('Agent simulation');
await waitFor(`Boolean(document.querySelector('[aria-label="Agent simulation controls"]'))`);
await setInput('Agent count', 25);
await setInput('Global speed', 3);
await clickText('Fit office');
await sleep(500);

const dragAgentId = 'prototype-agent-21';
const original = (await agentSnapshot()).find(agent => agent.id === dragAgentId);
if (!original) throw new Error(`${dragAgentId} was not created for focused D01 QA`);
const invalid = await dragAgent(original.id, { x: -1200, y: -1200 });
await sleep(250);
const afterInvalid = (await agentSnapshot()).find(agent => agent.id === dragAgentId);
report.drags.invalid = { original, during: invalid.during, after: afterInvalid, preservedDuringDrag: samePoint(original, invalid.during), preservedAfterRelease: samePoint(original, afterInvalid) };

const dragResults = [];
const portalShots = { count: 0 };
const routeDiscovery = await discoverRouteCases(25);
report.drags.routeDiscovery = routeDiscovery;
let successful = 0;
let crossRoom = 0;
let transitions = 0;
let attempts = 0;
const successfulTargets = [];
while ((successful < 20 || crossRoom < 10 || transitions < 10) && attempts < maximumDragAttempts) {
    attempts += 1;
    const routeCase = routeDiscovery.cases[(attempts - 1) % routeDiscovery.cases.length];
    const current = (await agentSnapshot()).find(agent => agent.id === routeCase.agentId);
    if (!current) throw new Error(`${routeCase.agentId} disappeared during drag QA`);
    const candidates = [...targetPoints].sort((a, b) => Math.hypot(b.x - current.x, b.y - current.y) - Math.hypot(a.x - current.x, a.y - current.y));
    const destination = attempts <= routeDiscovery.cases.length
        ? routeCase.target
        : successfulTargets.length > 1 && attempts % 3 === 0
            ? successfulTargets[attempts % successfulTargets.length]
            : candidates[(attempts - 1) % Math.min(12, candidates.length)];
    const drag = await dragAgent(current.id, destination);
    const started = drag.after?.movement === 'walking' || drag.after?.movement === 'waiting';
    const route = started ? await waitForRoute(current.id, 90_000, portalShots) : { sawWalking: false, last: drag.after, phases: [], doors: [] };
    const success = route.sawWalking && route.last && !['walking', 'waiting', 'blocked'].includes(route.last.movement);
    if (success) {
        successful += 1;
        successfulTargets.push(destination);
        if (route.doors.length > 0) crossRoom += 1;
        transitions += route.phases.filter((phase, index, all) => index === 0 || phase.phase !== all[index - 1].phase || phase.door !== all[index - 1].door).length > 0 ? 1 : 0;
    }
    dragResults.push({ attempt: attempts, destination, origin: drag.geometry.origin, geometry: drag.geometry, during: drag.during, afterRelease: drag.after,
        dragUiDuring: drag.dragUiDuring, dragUiAfter: drag.dragUiAfter,
        originalPreservedDuringDrag: Math.hypot(drag.during.x - drag.geometry.origin.x, drag.during.y - drag.geometry.origin.y) < 0.01,
        success, portalDoors: route.doors, portalPhases: route.phases, final: route.last });
    process.stdout.write(`[qa] drag ${attempts}: success=${success} totals=${successful}/20 cross=${crossRoom}/10 portals=${transitions}/10\n`);
}
report.drags.summary = { attempts, successful, crossRoom, transitions };
report.drags.results = dragResults;
await call(() => {
    const checkbox = [...document.querySelectorAll('input[type="checkbox"]')]
        .find(input => input.parentElement?.textContent?.includes('Automatic movement'));
    if (!(checkbox instanceof HTMLInputElement)) throw new Error('Automatic movement checkbox not found');
    if (!checkbox.checked) checkbox.click();
    return checkbox.checked;
});
report.timed.debug = await timedMotionRun('agent-simulation', timedRunMs);
await screenshot('agent-simulation-after-timed-run');

report.candidate.finalAgents = await agentSnapshot();
report.candidate.navigationDiagnostics = await call(() => Object.fromEntries([...document.querySelectorAll('dt')]
    .map(term => [term.textContent?.trim(), term.nextElementSibling?.textContent?.trim()])));
report.browserEvents = browserEvents;
report.consoleErrors = browserEvents.filter(event => event.method === 'Runtime.exceptionThrown'
    || event.method === 'Network.loadingFailed'
    || event.params?.entry?.level === 'error'
    || event.params?.type === 'error');
report.finishedAt = new Date().toISOString();
const acceptanceFailures = [];
const requireQa = (condition, message) => { if (!condition) acceptanceFailures.push(message); };
requireQa(report.candidate.sourceVerification.exactMatch, 'Served candidate source does not match the worktree source.');
requireQa(report.candidate.sourceVerification.continuousNavigationTokensPresent, 'Served candidate source is missing continuous-navigation integration tokens.');
requireQa(JSON.stringify(report.controls.countSlider.counts) === JSON.stringify([20, 30, 10, 1, 50]), 'Agent-count controls regressed.');
requireQa(report.controls.panZoom.zoomChanged && report.controls.panZoom.panChanged, 'Pan/zoom controls did not update the world transform.');
requireQa(report.drags.summary.successful >= 20 && report.drags.summary.crossRoom >= 10 && report.drags.summary.transitions >= 10, 'Representative drag-route quota was not met.');
for (const [label, timed] of Object.entries(report.timed)) {
    requireQa(timed.sampleCount >= Math.floor(timedRunMs / 125), `${label} sample coverage is too sparse.`);
    requireQa(timed.maxSampleGapMs < 1_000, `${label} had a repeated/global pause of at least one second.`);
    requireQa(timed.maximumMovingNoChangeMs < 2_000, `${label} had a sustained moving-agent freeze.`);
    requireQa(timed.staleRollbackCount === 0, `${label} committed a stale route rollback.`);
    requireQa(timed.backwardsCount === 0, `${label} showed backward walking.`);
    requireQa(timed.sidewaysCount === 0, `${label} showed sideways gliding.`);
}
requireQa(report.consoleErrors.length === 0, 'Browser console, runtime, or network errors were captured.');
report.acceptance = { passed: acceptanceFailures.length === 0, failures: acceptanceFailures };
await writeFile(path.join(outputDir, 'qa-report.json'), JSON.stringify(report, null, 2));
process.stdout.write(`${JSON.stringify({ sourceVerification: report.candidate.sourceVerification, controls: report.controls,
    dragSummary: report.drags.summary, timed: report.timed, navigationDiagnostics: report.candidate.navigationDiagnostics,
    consoleErrors: report.consoleErrors.length, acceptance: report.acceptance }, null, 2)}\n`);
socket.close();
if (acceptanceFailures.length > 0) process.exitCode = 1;
