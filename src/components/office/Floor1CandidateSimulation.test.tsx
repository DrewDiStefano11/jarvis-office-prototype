// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Floor1CandidateSimulation } from './Floor1CandidateSimulation';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('Floor1CandidateSimulation preview identity and destination controls', () => {
    it('portals navigation controls to the viewport outside the transformed world surface', async () => {
        const { container } = render(<div className="office-viewport"><div className="office-surface"><Floor1CandidateSimulation active reducedMotion={false} /></div></div>);
        const controls = await screen.findByLabelText('Candidate navigation review controls');
        expect(controls.parentElement).toBe(container.querySelector('.office-viewport'));
    });

    it('does not schedule movement frames while every candidate agent is idle', async () => {
        const request = vi.spyOn(window, 'requestAnimationFrame');
        render(<Floor1CandidateSimulation active reducedMotion={false} />);
        await waitFor(() => expect(screen.getByLabelText('Agent')).toBeTruthy());
        expect(request).not.toHaveBeenCalled();
    });

    it('exposes all destination categories through accessible controls', async () => {
        render(<Floor1CandidateSimulation active reducedMotion={false} />);
        const category = await screen.findByLabelText('Destination category');
        for (const label of ['Rooms', 'Computers', 'Interactive objects', 'Standard positions', 'Priority positions']) {
            fireEvent.change(category, { target: { value: label === 'Standard positions' ? 'standard-position' : label === 'Priority positions' ? 'priority-position' : label === 'Interactive objects' ? 'interactive-object' : label.toLowerCase().split(' ')[0] } });
            expect(screen.getByLabelText('Destination')).toBeTruthy();
        }
    });

    it('invalidates a preview when agent or destination changes and after cancellation', async () => {
        render(<Floor1CandidateSimulation active reducedMotion={false} />);
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
