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
import { buildCandidateNavigationGraph } from '../../office/floor1/navigation/candidateNavigation';
import { Floor1CandidateSimulation } from './Floor1CandidateSimulation';

vi.setConfig({ testTimeout: 15_000 });

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

describe('Floor1CandidateSimulation preview identity and destination controls', () => {
    it('fails closed without approved registration and renders no candidate agents', async () => {
        const { container } = render(<Floor1CandidateSimulation active reducedMotion={false} />);
        expect(await screen.findByText(/Candidate navigation unavailable/)).toBeTruthy();
        expect(container.querySelector('.floor1-candidate-agent')).toBeNull();
    });

    it('uses viewport-responsive control panel CSS rather than world-scale dimensions', () => {
        const css = readFileSync('src/components/office/floor1-candidate-simulation.css', 'utf8');
        expect(css).toContain('width: 100%');
        expect(css).toContain('height: 100%');
        expect(css).toContain('max-height: 100%');
        expect(css).toContain('overflow-y: auto');
        expect(css).toContain('@media (max-width: 900px)');
        expect(css).not.toContain('width: 1500px');
        expect(css).not.toContain('font-size: 74px');
        expect(css).not.toContain('font-size: 46px');
    });

    it('portals navigation controls to the viewport outside the transformed world surface', async () => {
        const host = document.createElement('div');
        const { container } = render(<div className="office-viewport"><div className="office-surface" /><div data-testid="candidate-host" /></div>);
        container.querySelector('[data-testid="candidate-host"]')?.replaceWith(host);
        render(<Floor1CandidateSimulation active reducedMotion={false} registration={TEST_REGISTRATION} controlHost={host} />);
        const controls = await screen.findByLabelText('Candidate navigation review controls');
        expect(controls.parentElement).toBe(host);
        expect(host.parentElement).toBe(container.querySelector('.office-viewport'));
    });


    it('stops scroll and pointer gestures on the portaled panel before they reach the viewport', async () => {
        const wheel = vi.fn();
        const pointer = vi.fn();
        const host = document.createElement('div');
        const wrapper = render(<div className="office-viewport" onWheel={wheel} onPointerDown={pointer}><div data-testid="candidate-host" /></div>);
        wrapper.container.querySelector('[data-testid="candidate-host"]')?.replaceWith(host);
        render(<Floor1CandidateSimulation active reducedMotion={false} registration={TEST_REGISTRATION} controlHost={host} />);
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

    it('renders all walk nodes in the graph review overlay instead of truncating by ID order', async () => {
        const { container } = render(<Floor1CandidateSimulation active reducedMotion={false} registration={TEST_REGISTRATION} />);
        await screen.findByLabelText('Candidate navigation review controls');
        await waitFor(() => expect(container.querySelectorAll('.floor1-candidate-debug--graph circle:not(.door)').length).toBeGreaterThan(1000));
    });


    it('renders collider debug geometry at modeled collision thickness', async () => {
        const graph = buildCandidateNavigationGraph({ rooms, positions, doors, computers, interactiveObjects, walls, objects, walkPaths }, { registration: TEST_REGISTRATION });
        const { container } = render(<Floor1CandidateSimulation active reducedMotion={false} registration={TEST_REGISTRATION} />);
        await screen.findByLabelText('Candidate navigation review controls');
        fireEvent.click(screen.getByLabelText('Modeled colliders'));
        const openCollider = graph.colliders.find(collider => !collider.closed && collider.kind === 'wall') ?? graph.colliders.find(collider => !collider.closed)!;
        const closedCollider = graph.colliders.find(collider => collider.closed && collider.kind === 'object') ?? graph.colliders.find(collider => collider.closed)!;
        const differentOpenCollider = graph.colliders.find(collider => !collider.closed && collider.thickness !== openCollider.thickness);
        await waitFor(() => expect(container.querySelector('.floor1-candidate-debug--colliders')).toBeTruthy());
        const polylines = [...container.querySelectorAll<SVGPolylineElement>('.floor1-candidate-debug--colliders polyline')];
        const polygons = [...container.querySelectorAll<SVGPolygonElement>('.floor1-candidate-debug--colliders polygon')];
        const openElement = polylines.find(element => element.getAttribute('points') === openCollider.points.map(point => `${point.x},${point.y}`).join(' '));
        const closedElement = polygons.find(element => element.getAttribute('points') === closedCollider.points.map(point => `${point.x},${point.y}`).join(' '));
        expect(openElement?.getAttribute('stroke-width')).toBe(String(openCollider.thickness));
        expect(openElement?.getAttribute('fill')).toBe('none');
        expect(openElement?.getAttribute('stroke-linecap')).toBe('round');
        expect(openElement?.getAttribute('stroke-linejoin')).toBe('round');
        expect(closedElement?.getAttribute('stroke-width')).toBe(String(closedCollider.thickness));
        expect(closedElement?.tagName.toLowerCase()).toBe('polygon');
        expect(openElement?.tagName.toLowerCase()).toBe('polyline');
        expect(openElement?.getAttribute('vector-effect')).toBeNull();
        expect(container.querySelector('.floor1-candidate-debug--colliders')?.getAttribute('aria-hidden')).toBe('true');
        if (differentOpenCollider) {
            const differentElement = polylines.find(element => element.getAttribute('points') === differentOpenCollider.points.map(point => `${point.x},${point.y}`).join(' '));
            expect(differentElement?.getAttribute('stroke-width')).toBe(String(differentOpenCollider.thickness));
            expect(differentElement?.getAttribute('stroke-width')).not.toBe(openElement?.getAttribute('stroke-width'));
        }
        const css = readFileSync('src/components/office/floor1-candidate-simulation.css', 'utf8');
        expect(css).not.toMatch(/floor1-candidate-debug--colliders[^}]*stroke-width\s*:/);
        expect(css).not.toMatch(/floor1-candidate-debug--colliders[^}]*non-scaling-stroke/);
    });

    it('exposes all destination categories through accessible controls', async () => {
        render(<Floor1CandidateSimulation active reducedMotion={false} registration={TEST_REGISTRATION} />);
        const category = await screen.findByLabelText('Destination category');
        for (const label of ['Rooms', 'Computers', 'Interactive objects', 'Standard positions', 'Priority positions']) {
            fireEvent.change(category, { target: { value: label === 'Standard positions' ? 'standard-position' : label === 'Priority positions' ? 'priority-position' : label === 'Interactive objects' ? 'interactive-object' : label.toLowerCase().split(' ')[0] } });
            expect(screen.getByLabelText('Destination')).toBeTruthy();
        }
    });

    it('invalidates a preview when agent or destination changes and after cancellation', async () => {
        render(<Floor1CandidateSimulation active reducedMotion={false} registration={TEST_REGISTRATION} />);
        const preview = await screen.findByText('Preview route');
        fireEvent.click(preview);
        await waitFor(() => expect(screen.getByText('Begin movement').hasAttribute('disabled')).toBe(false));
        expect(screen.getByLabelText(/Review agent 01\. idle\./)).toBeTruthy();
        const agentSelect = screen.getByLabelText('Agent') as HTMLSelectElement;
        fireEvent.change(agentSelect, { target: { value: 'floor1-review-agent-02' } });
        expect(screen.getByText('Begin movement').hasAttribute('disabled')).toBe(true);
        const destinationSelect = screen.getByLabelText('Destination') as HTMLSelectElement;
        fireEvent.change(destinationSelect, { target: { value: destinationSelect.options[Math.min(1, destinationSelect.options.length - 1)]?.value ?? destinationSelect.value } });
        expect(screen.getByText('Begin movement').hasAttribute('disabled')).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
        expect(screen.getByText('Begin movement').hasAttribute('disabled')).toBe(true);
        expect(screen.getByRole('status').textContent).toContain('No route previewed.');
    });

    it('starts with two visible demo agents and useful graph layers', async () => {
        const { container } = render(<Floor1CandidateSimulation active reducedMotion={false} registration={TEST_REGISTRATION} />);
        await screen.findByLabelText('Candidate navigation review controls');
        expect(container.querySelectorAll('.floor1-candidate-agent')).toHaveLength(2);
        expect(container.querySelectorAll('.floor1-candidate-agent__label')).toHaveLength(2);
        expect(container.querySelectorAll('.floor1-candidate-debug--graph line.edge').length).toBeGreaterThan(1000);
        expect(container.querySelectorAll('.floor1-candidate-debug--graph circle.node').length).toBeGreaterThan(1000);
        expect(container.querySelectorAll('.floor1-candidate-debug--graph circle.door')).toHaveLength(47);
        expect(container.querySelector('.floor1-candidate-destination')).toBeTruthy();
    });

    it('toggles graph categories and all available fixtures visibly', async () => {
        const { container } = render(<Floor1CandidateSimulation active reducedMotion={false} registration={TEST_REGISTRATION} />);
        await screen.findByLabelText('Candidate navigation review controls');
        fireEvent.click(screen.getByLabelText('Navigation nodes'));
        expect(container.querySelectorAll('.floor1-candidate-debug--graph circle.node')).toHaveLength(0);
        fireEvent.click(screen.getByLabelText(/Show all 40 available fixtures/));
        expect(container.querySelectorAll('.floor1-candidate-agent')).toHaveLength(40);
        fireEvent.click(screen.getByLabelText('Agent labels'));
        expect(container.querySelectorAll('.floor1-candidate-agent__label')).toHaveLength(0);
    });
});
