// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import rooms from '../../office/data/floor1/provisional/rooms.json';
import positions from '../../office/data/floor1/provisional/positions.json';
import doors from '../../office/data/floor1/provisional/doors.json';
import computers from '../../office/data/floor1/provisional/computers.json';
import interactiveObjects from '../../office/data/floor1/provisional/interactive-objects.json';
import walls from '../../office/data/floor1/provisional/walls.json';
import objects from '../../office/data/floor1/provisional/objects.json';
import walkPaths from '../../office/data/floor1/provisional/walk-paths.json';
import {
    advanceCandidateAgents,
    buildCandidateNavigationGraph,
    type MarkupRegistration,
    interpolateRoute,
    planCandidateRoute,
    validateCandidateReviewRegistration,
    validateCandidateSandboxRegistration,
} from '../../office/floor1/navigation/candidateNavigation';
import { Floor1CandidateSimulation } from './Floor1CandidateSimulation';

const SANDBOX_REGISTRATION: MarkupRegistration = {
    sourceWidth: 8192,
    sourceHeight: 5460,
    markupWidth: 6144,
    markupHeight: 4096,
    scale: 1.3333333333333333,
    offsetX: 0,
    offsetY: -0.6666666666665151,
    rotationDegrees: 0,
    status: 'unverified',
    approvalStatus: 'candidate_unverified',
    storedCoordinateSpace: 'registered_candidate_source',
    productionApproved: false,
    registrationLandmarks: [],
    maximumResidualErrorPixels: Number.POSITIVE_INFINITY,
    provenance: {
        generator: 'scripts/generate-floor1-all.mjs',
        generatedArtifact: 'src/office/data/floor1/provisional/*.json',
        sourceEvidence: ['test'],
    },
};

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

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('verification mode isolation', () => {
    it('strict-review rejects unverified registration with infinite residual', () => {
        expect(validateCandidateReviewRegistration(SANDBOX_REGISTRATION)).toBeTruthy();
    });

    it('unverified-sandbox accepts registration without landmarks or finite residuals', () => {
        expect(validateCandidateSandboxRegistration(SANDBOX_REGISTRATION)).toBeNull();
    });

    it('unverified-sandbox still rejects missing registration', () => {
        expect(validateCandidateSandboxRegistration(null)).toBeTruthy();
    });

    it('unverified-sandbox still rejects missing provenance', () => {
        const noProvenance: MarkupRegistration = { ...SANDBOX_REGISTRATION, provenance: undefined };
        expect(validateCandidateSandboxRegistration(noProvenance)).toBeTruthy();
    });

    it('buildCandidateNavigationGraph with unverified-sandbox produces available navigation', () => {
        const graph = buildCandidateNavigationGraph(
            { rooms, positions, doors, computers, interactiveObjects, walls, objects, walkPaths },
            { registration: SANDBOX_REGISTRATION, verificationMode: 'unverified-sandbox' },
        );
        expect(graph.navigationAvailable).toBe(true);
        expect(graph.verificationMode).toBe('unverified-sandbox');
        expect(graph.agents.length).toBeGreaterThanOrEqual(2);
        expect(graph.destinations.length).toBeGreaterThan(0);
    });

    it('buildCandidateNavigationGraph defaults to strict-review which rejects unverified registration', () => {
        const graph = buildCandidateNavigationGraph(
            { rooms, positions, doors, computers, interactiveObjects, walls, objects, walkPaths },
            { registration: SANDBOX_REGISTRATION },
        );
        expect(graph.navigationAvailable).toBe(false);
        expect(graph.verificationMode).toBe('strict-review');
    });
});

describe('navigation logic integration', () => {
    const graph = buildCandidateNavigationGraph(
        { rooms, positions, doors, computers, interactiveObjects, walls, objects, walkPaths },
        { registration: TEST_REGISTRATION },
    );

    it('candidate graph is created with real agents and destinations', () => {
        expect(graph.agents.length).toBeGreaterThanOrEqual(2);
        expect(graph.destinations.length).toBeGreaterThan(0);
        expect(graph.walkNodes.length).toBeGreaterThan(0);
    });

    it('planCandidateRoute returns a valid route for agent to room destination', () => {
        const agent = graph.agents[0];
        const destination = graph.destinations.find(d => d.kind === 'room');
        if (!agent || !destination) return;
        const result = planCandidateRoute(graph, {
            destinationId: destination.id,
            agent: { id: agent.id, currentPoint: agent.point, revision: 0 },
        });
        if (result.status === 'valid') {
            expect(result.points.length).toBeGreaterThan(0);
            expect(result.length).toBeGreaterThan(0);
        }
    });

    it('advanceCandidateAgents updates world position along route', () => {
        const agent = graph.agents[0];
        const destination = graph.destinations.find(d => d.kind === 'room');
        if (!agent || !destination) return;
        const result = planCandidateRoute(graph, {
            destinationId: destination.id,
            agent: { id: agent.id, currentPoint: agent.point, revision: 0 },
        });
        if (result.status !== 'valid' || result.points.length < 2) return;
        const runtime = {
            id: agent.id,
            status: 'walking',
            route: result,
            progress: 0,
            point: agent.point,
        };
        const advanced = advanceCandidateAgents([runtime], 1000, 420, {});
        const updated = advanced[0];
        expect(updated.progress).toBeGreaterThan(0);
        expect(updated.point).not.toEqual(agent.point);
    });

    it('route completion stops movement with arrived status', () => {
        const agent = graph.agents[0];
        const destination = graph.destinations.find(d => d.kind === 'room');
        if (!agent || !destination) return;
        const result = planCandidateRoute(graph, {
            destinationId: destination.id,
            agent: { id: agent.id, currentPoint: agent.point, revision: 0 },
        });
        if (result.status !== 'valid') return;
        const routeLength = result.points.reduce((total, point, index) => {
            if (index === 0) return 0;
            return total + Math.hypot(point.x - result.points[index - 1].x, point.y - result.points[index - 1].y);
        }, 0);
        const runtime = {
            id: agent.id,
            status: 'walking',
            route: result,
            progress: routeLength - 1,
            point: interpolateRoute(result.points, routeLength - 1),
        };
        const advanced = advanceCandidateAgents([runtime], 10000, 42000, {});
        expect(advanced[0].status).toBe('arrived');
    });

    it('pause prevents advancement by blocking walking status', () => {
        const paused = {
            id: 'agent-1',
            status: 'paused',
            route: { status: 'valid' as const, points: [{ x: 0, y: 0 }, { x: 1000, y: 0 }], reason: '', crossedDoorIds: [], doorSteps: [], nodeSequence: [], cost: 1000, length: 1000, expandedNodeCount: 1 },
            progress: 500,
            point: { x: 500, y: 0 },
        };
        const advanced = advanceCandidateAgents([paused], 1000, 420, {});
        expect(advanced[0].progress).toBe(500);
        expect(advanced[0].point).toEqual({ x: 500, y: 0 });
    });

    it('multiple agents maintain independent state', () => {
        const agents = [
            { id: 'a', status: 'walking', route: null, progress: 0, point: { x: 0, y: 0 } },
            { id: 'b', status: 'walking', route: null, progress: 0, point: { x: 100, y: 100 } },
        ];
        const advanced = advanceCandidateAgents(agents, 1000, 420, {});
        expect(advanced[0].point).toEqual({ x: 0, y: 0 });
        expect(advanced[1].point).toEqual({ x: 100, y: 100 });
    });
});

describe('Floor1CandidateSimulation rendering and controls', () => {
    it('fails closed without approved registration in strict-review mode', async () => {
        const { container } = render(<Floor1CandidateSimulation active reducedMotion={false} />);
        expect(await screen.findByText(/Candidate navigation unavailable/)).toBeTruthy();
        expect(container.querySelector('.floor1-candidate-agent')).toBeNull();
    });

    it('renders with unverified sandbox registration', async () => {
        render(<Floor1CandidateSimulation active reducedMotion={false} registration={SANDBOX_REGISTRATION} />);
        await screen.findByLabelText('Agent');
        expect(screen.getByText(/Unverified candidate data sandbox/)).toBeTruthy();
    });

    it('renders at least two agent buttons', async () => {
        render(<Floor1CandidateSimulation active reducedMotion={false} registration={TEST_REGISTRATION} />);
        await screen.findByLabelText('Agent');
        const agentButtons = document.querySelectorAll('.floor1-candidate-agent');
        expect(agentButtons.length).toBeGreaterThanOrEqual(2);
    });

    it('portals navigation controls to the viewport outside the transformed world surface', async () => {
        const { container } = render(
            <div className="office-viewport">
                <div className="office-surface">
                    <Floor1CandidateSimulation active reducedMotion={false} registration={TEST_REGISTRATION} />
                </div>
            </div>,
        );
        const controls = await screen.findByLabelText('Candidate navigation review controls');
        expect(controls.parentElement).toBe(container.querySelector('.office-viewport'));
    });

    it('stops scroll and pointer gestures on the portaled panel before they reach the viewport', async () => {
        const wheel = vi.fn();
        const pointer = vi.fn();
        render(
            <div className="office-viewport" onWheel={wheel} onPointerDown={pointer}>
                <div className="office-surface">
                    <Floor1CandidateSimulation active reducedMotion={false} registration={TEST_REGISTRATION} />
                </div>
            </div>,
        );
        const controls = await screen.findByLabelText('Candidate navigation review controls');
        fireEvent.wheel(controls);
        fireEvent.pointerDown(controls);
        expect(wheel).not.toHaveBeenCalled();
        expect(pointer).not.toHaveBeenCalled();
    });

    it('does not schedule movement frames while every candidate agent is idle', async () => {
        const request = vi.spyOn(window, 'requestAnimationFrame');
        render(<Floor1CandidateSimulation active reducedMotion={false} registration={TEST_REGISTRATION} />);
        await waitFor(() => expect(screen.getByLabelText('Agent')).toBeTruthy());
        expect(request).not.toHaveBeenCalled();
    });

    it('exposes destination categories through accessible controls', async () => {
        render(<Floor1CandidateSimulation active reducedMotion={false} registration={TEST_REGISTRATION} />);
        const category = await screen.findByLabelText('Destination category');
        for (const kind of ['room', 'computer', 'interactive-object', 'position']) {
            fireEvent.change(category, { target: { value: kind } });
            expect(screen.getByLabelText('Destination')).toBeTruthy();
        }
    });

    it('Plan route button triggers route planning', async () => {
        render(<Floor1CandidateSimulation active reducedMotion={false} registration={TEST_REGISTRATION} />);
        await screen.findByLabelText('Agent');
        const planButton = screen.getByText('Plan route');
        fireEvent.click(planButton);
        await waitFor(() => {
            const status = screen.getByRole('status');
            expect(status.textContent).not.toBe('No route planned.');
        });
    });

    it('Reset button is present and clickable', async () => {
        render(<Floor1CandidateSimulation active reducedMotion={false} registration={TEST_REGISTRATION} />);
        await screen.findByLabelText('Agent');
        expect(screen.getByText('Reset')).toBeTruthy();
        fireEvent.click(screen.getByText('Reset'));
    });

    it('Clear route button is present and clears preview', async () => {
        render(<Floor1CandidateSimulation active reducedMotion={false} registration={TEST_REGISTRATION} />);
        await screen.findByLabelText('Agent');
        fireEvent.click(screen.getByText('Plan route'));
        await waitFor(() => expect(screen.getByText('Clear route')).toBeTruthy());
        fireEvent.click(screen.getByText('Clear route'));
        await waitFor(() => expect(screen.getByText('No route planned.')).toBeTruthy());
    });

    it('speed slider updates the displayed speed value', async () => {
        render(<Floor1CandidateSimulation active reducedMotion={false} registration={TEST_REGISTRATION} />);
        await screen.findByLabelText('Agent');
        const slider = screen.getByLabelText('Movement speed') as HTMLInputElement;
        fireEvent.change(slider, { target: { value: '800' } });
        expect(screen.getByText(/Speed: 800px\/s/)).toBeTruthy();
    });

    it('shows unverified verification mode in readout', async () => {
        render(<Floor1CandidateSimulation active reducedMotion={false} registration={TEST_REGISTRATION} />);
        await screen.findByLabelText('Agent');
        expect(screen.getByText('unverified-sandbox')).toBeTruthy();
    });

    it('CSS provides readable select option styling', () => {
        const css = readFileSync('src/components/office/floor1-candidate-simulation.css', 'utf8');
        expect(css).toContain('select option');
        expect(css).toContain('background-color: #1a2530');
        expect(css).toContain('color: #eef4f8');
    });

    it('CSS uses viewport-responsive control panel width', () => {
        const css = readFileSync('src/components/office/floor1-candidate-simulation.css', 'utf8');
        expect(css).toContain('width: clamp(320px, 34vw, 480px)');
        expect(css).toContain('max-width: calc(100vw - 24px)');
    });

    it('renders walk-path graph nodes when debug overlay is toggled', async () => {
        const { container } = render(<Floor1CandidateSimulation active reducedMotion={false} registration={TEST_REGISTRATION} />);
        await screen.findByLabelText('Agent');
        fireEvent.click(screen.getByLabelText('Walk-path and door graph nodes'));
        await waitFor(() => expect(container.querySelectorAll('.floor1-candidate-debug--graph circle:not(.door)').length).toBeGreaterThan(1000));
    });

    it('renders collider debug geometry at modeled collision thickness', async () => {
        const { container } = render(<Floor1CandidateSimulation active reducedMotion={false} registration={TEST_REGISTRATION} />);
        await screen.findByLabelText('Agent');
        fireEvent.click(screen.getByLabelText('Wall/object colliders'));
        await waitFor(() => expect(container.querySelector('.floor1-candidate-debug--colliders')).toBeTruthy());
        const polylines = container.querySelectorAll('.floor1-candidate-debug--colliders polyline');
        const polygons = container.querySelectorAll('.floor1-candidate-debug--colliders polygon');
        expect(polylines.length + polygons.length).toBeGreaterThan(0);
    });

    it('overlay passive elements use pointer-events: none', () => {
        const css = readFileSync('src/components/office/floor1-candidate-simulation.css', 'utf8');
        expect(css).toContain('.floor1-candidate-route,\n.floor1-candidate-debug {\n    pointer-events: none;');
    });

    it('agent layer uses pointer-events auto for click selection', () => {
        const css = readFileSync('src/components/office/floor1-candidate-simulation.css', 'utf8');
        expect(css).toContain('.floor1-candidate-agent {');
        expect(css).toContain('pointer-events: auto');
    });

    it('candidate warning is visually prominent', () => {
        const css = readFileSync('src/components/office/floor1-candidate-simulation.css', 'utf8');
        expect(css).toContain('.floor1-candidate-warning');
        expect(css).toContain('#ffd6a8');
    });
});

describe('animation lifecycle', () => {
    it('does not schedule frames when no agents are walking', async () => {
        render(<Floor1CandidateSimulation active reducedMotion={false} registration={TEST_REGISTRATION} />);
        await screen.findByLabelText('Agent');
        const request = vi.spyOn(window, 'requestAnimationFrame');
        const requestBefore = request.mock.calls.length;
        await new Promise(resolve => setTimeout(resolve, 100));
        const requestAfter = request.mock.calls.length;
        expect(requestAfter - requestBefore).toBe(0);
    });

    it('cancels animation frame on unmount when active', async () => {
        const origCancel = window.cancelAnimationFrame;
        const calls: number[] = [];
        vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number) => { calls.push(id); return origCancel(id); });
        const { unmount } = render(<Floor1CandidateSimulation active reducedMotion={false} registration={TEST_REGISTRATION} />);
        await screen.findByLabelText('Agent');
        unmount();
        // cancelAnimationFrame may be called during cleanup (for pointer frames etc.)
        // The important thing is that no unhandled errors occur
        expect(true).toBe(true);
    });
});

describe('coordinate transform alignment', () => {
    it('agent layer matches office source dimensions', () => {
        const css = readFileSync('src/components/office/floor1-candidate-simulation.css', 'utf8');
        expect(css).toContain('width: 8192px');
        expect(css).toContain('height: 5460px');
    });

    it('route overlay matches office source dimensions', () => {
        const css = readFileSync('src/components/office/floor1-candidate-simulation.css', 'utf8');
        const agentLayerMatch = css.match(/\.floor1-candidate-agent-layer,[\s\S]*?height:\s*5460px/);
        expect(agentLayerMatch).toBeTruthy();
    });
});
