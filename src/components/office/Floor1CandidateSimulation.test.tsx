// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { Floor1CandidateSimulation } from './Floor1CandidateSimulation';


const TEST_REGISTRATION = {
    sourceWidth: 8192,
    sourceHeight: 5460,
    markupWidth: 6144,
    markupHeight: 4096,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    rotationDegrees: 0,
    status: 'unverified',
    approvalStatus: 'candidate_unverified',
    storedCoordinateSpace: 'registered_candidate_source',
    productionApproved: false,
    provenance: { generator: 'test', generatedArtifact: 'test', sourceEvidence: ['test'] },
    registrationLandmarks: [{ id: 'synthetic', markup: { x: 0, y: 0 }, source: { x: 0, y: 0 }, residualErrorPixels: 0 }],
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
        expect(css).toContain('width: clamp(320px, 34vw, 480px)');
        expect(css).toContain('max-width: calc(100vw - 24px)');
        expect(css).toContain('max-height: calc(100vh - 24px)');
        expect(css).toContain('overflow-y: auto');
        expect(css).toContain('@media (max-width: 900px)');
        expect(css).not.toContain('width: 1500px');
        expect(css).not.toContain('font-size: 74px');
        expect(css).not.toContain('font-size: 46px');
    });

    it('portals navigation controls to the viewport outside the transformed world surface', async () => {
        const { container } = render(<div className="office-viewport"><div className="office-surface"><Floor1CandidateSimulation active reducedMotion={false} registration={TEST_REGISTRATION} /></div></div>);
        const controls = await screen.findByLabelText('Candidate navigation review controls');
        expect(controls.parentElement).toBe(container.querySelector('.office-viewport'));
    });

    it('does not schedule movement frames while every candidate agent is idle', async () => {
        const request = vi.spyOn(window, 'requestAnimationFrame');
        render(<Floor1CandidateSimulation active reducedMotion={false} registration={TEST_REGISTRATION} />);
        await waitFor(() => expect(screen.getByLabelText('Agent')).toBeTruthy());
        expect(request).not.toHaveBeenCalled();
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
        await waitFor(() => expect(screen.getByText('Begin movement').hasAttribute('disabled')).toBe(true));
        const agentSelect = screen.getByLabelText('Agent') as HTMLSelectElement;
        fireEvent.change(agentSelect, { target: { value: 'floor1-review-agent-02' } });
        expect(screen.getByText('Begin movement').hasAttribute('disabled')).toBe(true);
        const destinationSelect = screen.getByLabelText('Destination') as HTMLSelectElement;
        fireEvent.change(destinationSelect, { target: { value: destinationSelect.options[Math.min(1, destinationSelect.options.length - 1)]?.value ?? destinationSelect.value } });
        expect(screen.getByText('Begin movement').hasAttribute('disabled')).toBe(true);
        fireEvent.click(screen.getByText('Cancel'));
        expect(screen.getByText('Begin movement').hasAttribute('disabled')).toBe(true);
        expect(screen.getByText('No route previewed.')).toBeTruthy();
    });
});
