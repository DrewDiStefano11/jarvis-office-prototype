// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import type { OfficeLayer } from '../../office/types';
import { Floor1CandidateSimulation } from './Floor1CandidateSimulation';

vi.setConfig({ testTimeout: 15_000 });

const TEST_REGISTRATION = {
    sourceWidth: 8192, sourceHeight: 5460, markupWidth: 8192, markupHeight: 5460,
    scale: 1, offsetX: 0, offsetY: 0, rotationDegrees: 0, status: 'unverified',
    approvalStatus: 'candidate_reviewed', storedCoordinateSpace: 'registered_candidate_source', productionApproved: false,
    provenance: { generator: 'test', generatedArtifact: 'test', sourceEvidence: ['test'] },
    registrationLandmarks: [
        { id: 'nw', markup: { x: 0, y: 0 }, source: { x: 0, y: 0 }, residualErrorPixels: 0 },
        { id: 'ne', markup: { x: 8192, y: 0 }, source: { x: 8192, y: 0 }, residualErrorPixels: 0 },
        { id: 'sw', markup: { x: 0, y: 5460 }, source: { x: 0, y: 5460 }, residualErrorPixels: 0 },
        { id: 'se', markup: { x: 8192, y: 5460 }, source: { x: 8192, y: 5460 }, residualErrorPixels: 0 },
    ],
    maximumResidualErrorPixels: 0,
} as const;

function OverlayHarness() {
    const [layers, setLayers] = useState<ReadonlySet<OfficeLayer>>(new Set<OfficeLayer>(['rooms']));
    return <>
        <img alt="test office background" />
        <output data-testid="visible-layers">{[...layers].sort().join(',')}</output>
        <Floor1CandidateSimulation active reducedMotion={false} presentation="simulation" registration={TEST_REGISTRATION} visibleLayers={layers} onSetVisibleLayers={setLayers} />
    </>;
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Agent Simulation usability', () => {
    it('fails closed without reviewed candidate registration', async () => {
        const { container } = render(<Floor1CandidateSimulation active reducedMotion={false} presentation="simulation" />);
        expect(await screen.findByText(/Candidate navigation unavailable/)).toBeTruthy();
        expect(container.querySelectorAll('.prototype-agent')).toHaveLength(0);
    });

    it('starts empty and exposes the direct add-agent workflow', async () => {
        const { container } = render(<Floor1CandidateSimulation active reducedMotion={false} presentation="simulation" registration={TEST_REGISTRATION} />);
        await screen.findByLabelText('Agent simulation controls');
        expect(container.querySelectorAll('.prototype-agent')).toHaveLength(0);
        fireEvent.click(screen.getByRole('button', { name: 'Add agent' }));
        expect(container.querySelectorAll('.prototype-agent')).toHaveLength(1);
        expect(screen.getByLabelText('Agent 01. idle. Central Nexus.').getAttribute('aria-pressed')).toBe('true');
    });

    it('adds deterministic distributed agents in bulk', async () => {
        const { container } = render(<Floor1CandidateSimulation active reducedMotion={false} presentation="simulation" registration={TEST_REGISTRATION} />);
        await screen.findByLabelText('Agent simulation controls');
        fireEvent.click(screen.getByRole('button', { name: 'Add 5' }));
        const agents = [...container.querySelectorAll<HTMLElement>('.prototype-agent')];
        expect(agents).toHaveLength(5);
        expect(agents.map(agent => agent.dataset.agentId)).toEqual(['prototype-agent-01', 'prototype-agent-02', 'prototype-agent-03', 'prototype-agent-04', 'prototype-agent-05']);
        expect(new Set(agents.map(agent => `${agent.style.left},${agent.style.top}`)).size).toBe(5);
    });

    it('enforces and announces the 25-agent limit', async () => {
        const { container } = render(<Floor1CandidateSimulation active reducedMotion={false} presentation="simulation" registration={TEST_REGISTRATION} />);
        await screen.findByLabelText('Agent simulation controls');
        const addTen = screen.getByRole('button', { name: 'Add 10' });
        fireEvent.click(addTen); fireEvent.click(addTen); fireEvent.click(addTen);
        expect(container.querySelectorAll('.prototype-agent')).toHaveLength(25);
        expect(screen.getByText('25-agent limit reached')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Add agent' }).hasAttribute('disabled')).toBe(true);
        expect(screen.getByRole('button', { name: 'Add 5' }).hasAttribute('disabled')).toBe(true);
    });

    it('removes the selected agent, clears all, and can add again', async () => {
        const { container } = render(<Floor1CandidateSimulation active reducedMotion={false} presentation="simulation" registration={TEST_REGISTRATION} />);
        await screen.findByLabelText('Agent simulation controls');
        fireEvent.click(screen.getByRole('button', { name: 'Add 5' }));
        fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
        expect(container.querySelectorAll('.prototype-agent')).toHaveLength(4);
        fireEvent.click(screen.getByRole('button', { name: 'Clear agents' }));
        expect(container.querySelectorAll('.prototype-agent')).toHaveLength(0);
        fireEvent.click(screen.getByRole('button', { name: 'Add agent' }));
        expect(screen.getByLabelText(/Agent 01\. idle\./)).toBeTruthy();
    });

    it('hides every overlay, preserves agents/background, and restores the prior selection', async () => {
        const { container } = render(<OverlayHarness />);
        await screen.findByLabelText('Agent simulation controls');
        fireEvent.click(screen.getByRole('button', { name: 'Add agent' }));
        fireEvent.click(screen.getByRole('button', { name: 'Hide all overlays' }));
        expect(screen.getByTestId('visible-layers').textContent).toBe('');
        expect(container.querySelectorAll('.prototype-agent')).toHaveLength(1);
        expect(screen.getByAltText('test office background')).toBeTruthy();
        expect(container.querySelectorAll('.prototype-agent__label')).toHaveLength(0);
        fireEvent.click(screen.getByRole('button', { name: 'Show all overlays' }));
        expect(screen.getByTestId('visible-layers').textContent).toBe('rooms');
        expect(container.querySelectorAll('.prototype-agent__label')).toHaveLength(1);
        fireEvent.click(screen.getByLabelText('Agent labels'));
        expect(container.querySelectorAll('.prototype-agent__label')).toHaveLength(0);
    });

    it('selects a clicked agent instead of commanding the current agent', async () => {
        render(<Floor1CandidateSimulation active reducedMotion={false} presentation="simulation" registration={TEST_REGISTRATION} />);
        await screen.findByLabelText('Agent simulation controls');
        fireEvent.click(screen.getByRole('button', { name: 'Add 5' }));
        const second = screen.getByLabelText(/Agent 02\. idle\./);
        fireEvent.click(second);
        expect(second.getAttribute('aria-pressed')).toBe('true');
        expect((screen.getByLabelText('Selected agent') as HTMLSelectElement).value).toBe('prototype-agent-02');
    });

    it('creates a route and begins movement immediately from a valid map click', async () => {
        const { container } = render(<Floor1CandidateSimulation active reducedMotion={false} presentation="simulation" registration={TEST_REGISTRATION} />);
        await screen.findByLabelText('Agent simulation controls');
        fireEvent.click(screen.getByRole('button', { name: 'Add agent' }));
        const root = container.querySelector<HTMLElement>('.floor1-candidate-simulation')!;
        vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 8192, bottom: 5460, width: 8192, height: 5460, toJSON: () => ({}) });
        fireEvent.click(root, { clientX: 4200, clientY: 2700 });
        await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Walking now'));
        expect(container.querySelector('.floor1-candidate-route')).toBeTruthy();
        expect(container.querySelector('.floor1-candidate-destination')).toBeTruthy();
        expect(container.querySelector('.prototype-agent')?.getAttribute('data-agent-state')).toBe('walking');
    });

    it('Escape cancels command feedback and pause/resume controls are explicit', async () => {
        render(<Floor1CandidateSimulation active reducedMotion={false} presentation="simulation" registration={TEST_REGISTRATION} />);
        await screen.findByLabelText('Agent simulation controls');
        fireEvent.click(screen.getByRole('button', { name: 'Add agent' }));
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(screen.getByRole('status').textContent).toContain('Command canceled');
        fireEvent.click(screen.getByRole('button', { name: 'Pause all' }));
        expect(screen.getByRole('button', { name: 'Resume all' })).toBeTruthy();
    });
});

describe('Office Engine ambient mode', () => {
    it('starts with twenty visible agents, varied states, minimal controls, and no overlays', async () => {
        const { container } = render(<Floor1CandidateSimulation active reducedMotion registration={TEST_REGISTRATION} presentation="inspection" />);
        await screen.findByLabelText('Office Engine simulation controls');
        expect(container.querySelectorAll('.prototype-agent')).toHaveLength(20);
        expect(container.querySelectorAll('[data-agent-state="walking"]').length).toBeGreaterThan(0);
        expect(container.querySelectorAll('[data-agent-state="working-at-desk"]').length).toBeGreaterThan(0);
        expect(container.querySelectorAll('[data-agent-state="idle"], [data-agent-state="talking"]').length).toBeGreaterThan(0);
        expect(container.querySelector('.floor1-candidate-debug')).toBeNull();
        expect(screen.queryByLabelText('Agent simulation controls')).toBeNull();
    });

    it('supports 15, 20, 25, and 30 deterministic ambient counts', async () => {
        const { container } = render(<Floor1CandidateSimulation active reducedMotion registration={TEST_REGISTRATION} presentation="inspection" />);
        await screen.findByLabelText('Office Engine simulation controls');
        for (const count of [15, 20, 25, 30]) {
            fireEvent.click(screen.getByRole('button', { name: String(count) }));
            await waitFor(() => expect(container.querySelectorAll('.prototype-agent')).toHaveLength(count));
        }
        fireEvent.click(screen.getByRole('button', { name: 'Reset simulation' }));
        expect(container.querySelectorAll('.prototype-agent')).toHaveLength(30);
    });
});
