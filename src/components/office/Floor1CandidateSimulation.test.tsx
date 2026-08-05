// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import type { OfficeLayer } from '../../office/types';
import { Floor1CandidateSimulation } from './Floor1CandidateSimulation';

vi.setConfig({ testTimeout: 30_000 });

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
        expect(agents.every(agent => Number(agent.style.zIndex) === 1_000 + Math.round(Number.parseFloat(agent.style.top)))).toBe(true);
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

    it('renders resolved repository sprites rather than normal circle markers', async () => {
        const { container } = render(<Floor1CandidateSimulation active reducedMotion presentation="simulation" registration={TEST_REGISTRATION} />);
        await screen.findByLabelText('Agent simulation controls');
        fireEvent.click(screen.getByRole('button', { name: 'Add 5' }));
        expect(container.querySelectorAll('.prototype-agent .sprite-player')).toHaveLength(5);
        expect(container.querySelectorAll('.prototype-agent__marker')).toHaveLength(0);
        expect(container.querySelectorAll('.prototype-agent .sprite-player--missing')).toHaveLength(0);
        expect(container.querySelector('[data-agent-id="prototype-agent-01"]')?.getAttribute('data-sprite-state')).toBe('idle');
        for (const agent of container.querySelectorAll('.prototype-agent')) {
            expect(agent.querySelectorAll('[data-primary-sprite-visual="true"]')).toHaveLength(1);
        }
    });

    it('never assigns quarantined sprite sheets even when valid variants must be reused', async () => {
        const { container } = render(<Floor1CandidateSimulation active={false} reducedMotion presentation="simulation" registration={TEST_REGISTRATION} />);
        await screen.findByLabelText('Agent simulation controls');
        const addTen = screen.getByRole('button', { name: 'Add 10' });
        fireEvent.click(addTen); fireEvent.click(addTen); fireEvent.click(screen.getByRole('button', { name: 'Add 5' }));
        const titles = [...container.querySelectorAll<HTMLElement>('.prototype-agent')].map(agent => agent.title);
        expect(titles).toHaveLength(25);
        expect(titles.every(title => !/agent-sheet-(05|12|13|16)/.test(title))).toBe(true);
        expect(container.querySelectorAll('[data-primary-sprite-visual="true"]')).toHaveLength(25);
    });

    it('uses the authoritative transform for a panned and zoomed click', async () => {
        const transform = { x: 100, y: 50, scale: 0.5 };
        const { container } = render(<Floor1CandidateSimulation active={false} reducedMotion presentation="simulation" registration={TEST_REGISTRATION} transform={transform} />);
        await screen.findByLabelText('Agent simulation controls');
        fireEvent.click(screen.getByRole('button', { name: 'Add agent' }));
        const root = container.querySelector<HTMLElement>('.floor1-candidate-simulation')!;
        vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({ x: 100, y: 50, left: 100, top: 50, right: 4196, bottom: 2780, width: 4096, height: 2730, toJSON: () => ({}) });
        fireEvent.click(root, { clientX: 2_200, clientY: 1_400 });
        await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Walking now'));
        expect(container.querySelector('.floor1-candidate-destination .snapped')).toBeTruthy();
    });

    it('keeps the sprite body at a constant world size without inverse zoom compensation', async () => {
        const { container, rerender } = render(<Floor1CandidateSimulation active={false} reducedMotion presentation="simulation" registration={TEST_REGISTRATION} transform={{ x: 0, y: 0, scale: 0.1 }} />);
        await screen.findByLabelText('Agent simulation controls');
        fireEvent.click(screen.getByRole('button', { name: 'Add agent' }));
        const before = container.querySelector<HTMLElement>('.prototype-agent')!;
        expect(before.style.width).toBe('');
        expect(before.style.getPropertyValue('--agent-compensation')).toBe('');
        expect(before.querySelector<HTMLElement>('.prototype-agent__sprite-wrap')?.className).toContain('prototype-agent__sprite-wrap');
        rerender(<Floor1CandidateSimulation active={false} reducedMotion presentation="simulation" registration={TEST_REGISTRATION} transform={{ x: 0, y: 0, scale: 1.5 }} />);
        const after = container.querySelector<HTMLElement>('.prototype-agent')!;
        expect(after.style.left).toBe(before.style.left);
        expect(after.style.top).toBe(before.style.top);
        expect(after.style.getPropertyValue('--agent-compensation')).toBe('');
    });

    it('exposes velocity, footprint, and direction as truthful agent diagnostics', async () => {
        const { container } = render(<Floor1CandidateSimulation active={false} reducedMotion presentation="simulation" registration={TEST_REGISTRATION} />);
        await screen.findByLabelText('Agent simulation controls');
        fireEvent.click(screen.getByRole('button', { name: 'Add agent' }));
        const agent = container.querySelector<HTMLElement>('.prototype-agent')!;
        expect(agent.dataset.velocity).toMatch(/^-?\d+\.\d{2},-?\d+\.\d{2}$/);
        expect(agent.dataset.footprintRadius).toBe('34');
        expect(['north', 'south', 'east', 'west']).toContain(agent.dataset.spriteDirection);
    });

    it('opens a compact card with identity, task, location, movement, and collapsed diagnostics', async () => {
        render(<Floor1CandidateSimulation active reducedMotion presentation="simulation" registration={TEST_REGISTRATION} viewport={{ width: 1200, height: 800 }} transform={{ x: 0, y: 0, scale: 0.1 }} />);
        await screen.findByLabelText('Agent simulation controls');
        fireEvent.click(screen.getByRole('button', { name: 'Add agent' }));
        const card = screen.getByLabelText('Agent 01 details');
        expect(card.textContent).toContain('Current task');
        expect(card.textContent).toContain('Location');
        expect(card.textContent).toContain('Movement');
        expect(card.querySelector('details')?.hasAttribute('open')).toBe(false);
        expect((card as HTMLElement).style.width).toBe('326px');
    });

    it('treats a pointer press below the drag threshold as one agent click', async () => {
        const { container } = render(<Floor1CandidateSimulation active={false} reducedMotion presentation="simulation" registration={TEST_REGISTRATION} viewport={{ width: 1200, height: 800 }} transform={{ x: 0, y: 0, scale: 0.1 }} />);
        await screen.findByLabelText('Agent simulation controls');
        fireEvent.click(screen.getByRole('button', { name: 'Add agent' }));
        fireEvent.click(screen.getByRole('button', { name: 'Close agent card' }));
        const agent = container.querySelector<HTMLElement>('[data-agent-id="prototype-agent-01"]')!;
        Object.defineProperties(agent, {
            setPointerCapture: { configurable: true, value: vi.fn() },
            hasPointerCapture: { configurable: true, value: vi.fn(() => true) },
            releasePointerCapture: { configurable: true, value: vi.fn() },
        });
        fireEvent.pointerDown(agent, { pointerId: 2, button: 0, clientX: 410, clientY: 270 });
        fireEvent.pointerMove(agent, { pointerId: 2, clientX: 412, clientY: 272 });
        fireEvent.pointerUp(agent, { pointerId: 2, clientX: 412, clientY: 272 });
        fireEvent.click(agent);
        expect(screen.getByLabelText('Agent 01 details')).toBeTruthy();
        expect(container.querySelector('.floor1-candidate-drag-feedback')).toBeNull();
    });

    it('switches cards between agents and closes the card before clearing selection on Escape', async () => {
        render(<Floor1CandidateSimulation active reducedMotion presentation="simulation" registration={TEST_REGISTRATION} viewport={{ width: 1200, height: 800 }} transform={{ x: 0, y: 0, scale: 0.1 }} />);
        await screen.findByLabelText('Agent simulation controls');
        fireEvent.click(screen.getByRole('button', { name: 'Add 5' }));
        fireEvent.click(screen.getByLabelText(/Agent 02\. idle\./));
        expect(screen.getByLabelText('Agent 02 details')).toBeTruthy();
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(screen.queryByLabelText('Agent 02 details')).toBeNull();
        expect(screen.getByLabelText(/Agent 02\. idle\./).getAttribute('aria-pressed')).toBe('true');
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(screen.getByLabelText(/Agent 02\. idle\./).getAttribute('aria-pressed')).toBe('false');
    });

    it('uses card Walk somewhere mode and a valid map click creates a real route', async () => {
        const { container } = render(<Floor1CandidateSimulation active reducedMotion presentation="simulation" registration={TEST_REGISTRATION} viewport={{ width: 1200, height: 800 }} transform={{ x: 0, y: 0, scale: 0.1 }} />);
        await screen.findByLabelText('Agent simulation controls');
        fireEvent.click(screen.getByRole('button', { name: 'Add agent' }));
        fireEvent.click(screen.getByRole('button', { name: 'Walk somewhere' }));
        expect(screen.getByText(/Click a reachable destination/)).toBeTruthy();
        expect(screen.queryByLabelText('Agent 01 details')).toBeNull();
        const root = container.querySelector<HTMLElement>('.floor1-candidate-simulation')!;
        vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 819.2, bottom: 546, width: 819.2, height: 546, toJSON: () => ({}) });
        fireEvent.click(root, { clientX: 420, clientY: 270 });
        await waitFor(() => expect(container.querySelector('.floor1-candidate-route')).toBeTruthy());
        expect(screen.getByLabelText('Agent 01 details').textContent).toContain('Walking to assigned point');
    });

    it('assigns work, wander, idle, and stop tasks without changing the sprite assignment', async () => {
        const { container } = render(<Floor1CandidateSimulation active reducedMotion presentation="simulation" registration={TEST_REGISTRATION} viewport={{ width: 1200, height: 800 }} transform={{ x: 0, y: 0, scale: 0.1 }} />);
        await screen.findByLabelText('Agent simulation controls');
        fireEvent.click(screen.getByRole('button', { name: 'Add agent' }));
        const agent = container.querySelector<HTMLElement>('[data-agent-id="prototype-agent-01"]')!;
        const sprite = agent.querySelector('[aria-label^="agent-sheet-01"]');
        fireEvent.click(screen.getByRole('button', { name: 'Work at desk' }));
        expect(screen.getByRole('status').textContent).toContain('heading to');
        expect(agent.getAttribute('data-sprite-state')).toBe('walking');
        fireEvent.click(screen.getByRole('button', { name: 'Wander' }));
        expect(screen.getByRole('status').textContent).toContain('wandering');
        fireEvent.click(screen.getByRole('button', { name: 'Idle here' }));
        expect(agent.getAttribute('data-sprite-state')).toBe('idle');
        fireEvent.click(screen.getByRole('button', { name: 'Stop current task' }));
        expect(screen.getByRole('status').textContent).toContain('stopped');
        expect(agent.querySelector('[aria-label^="agent-sheet-01"]')).toBe(sprite);
    });

    it('fails a talk command clearly when the partner has no safe transition', async () => {
        render(<Floor1CandidateSimulation active reducedMotion presentation="simulation" registration={TEST_REGISTRATION} viewport={{ width: 1200, height: 800 }} transform={{ x: 0, y: 0, scale: 0.1 }} />);
        await screen.findByLabelText('Agent simulation controls');
        fireEvent.click(screen.getByRole('button', { name: 'Add 5' }));
        fireEvent.click(screen.getByRole('button', { name: 'Talk to agent' }));
        expect(screen.getByText(/Choose a conversation partner/)).toBeTruthy();
        fireEvent.click(screen.getByLabelText(/Agent 02\. idle\./));
        expect(screen.getByRole('status').textContent).toBe('No reachable conversation approach near Agent 02.');
        expect(screen.getByLabelText(/Agent 01\. idle\./)).toBeTruthy();
    });

    it('requires concise confirmation before card removal', async () => {
        const { container } = render(<Floor1CandidateSimulation active reducedMotion presentation="simulation" registration={TEST_REGISTRATION} viewport={{ width: 1200, height: 800 }} transform={{ x: 0, y: 0, scale: 0.1 }} />);
        await screen.findByLabelText('Agent simulation controls');
        fireEvent.click(screen.getByRole('button', { name: 'Add agent' }));
        fireEvent.click(screen.getByRole('button', { name: 'Remove from agent card' }));
        expect(container.querySelectorAll('.prototype-agent')).toHaveLength(1);
        expect(screen.getByText('Remove this agent?')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
        expect(container.querySelectorAll('.prototype-agent')).toHaveLength(0);
        expect(screen.queryByLabelText('Agent 01 details')).toBeNull();
    });

    it('uses a drag threshold, shows snap feedback, and commits a valid graph node', async () => {
        const { container } = render(<Floor1CandidateSimulation active reducedMotion presentation="simulation" registration={TEST_REGISTRATION} viewport={{ width: 8192, height: 5460 }} transform={{ x: 0, y: 0, scale: 1 }} />);
        await screen.findByLabelText('Agent simulation controls');
        fireEvent.click(screen.getByRole('button', { name: 'Add agent' }));
        const agent = container.querySelector<HTMLElement>('[data-agent-id="prototype-agent-01"]')!;
        const startX = Number.parseFloat(agent.style.left); const startY = Number.parseFloat(agent.style.top);
        Object.defineProperties(agent, {
            setPointerCapture: { configurable: true, value: vi.fn() },
            hasPointerCapture: { configurable: true, value: vi.fn(() => true) },
            releasePointerCapture: { configurable: true, value: vi.fn() },
        });
        fireEvent.pointerDown(agent, { pointerId: 9, button: 0, clientX: startX, clientY: startY });
        fireEvent.pointerMove(agent, { pointerId: 9, clientX: startX + 2, clientY: startY + 2 });
        expect(container.querySelector('.floor1-candidate-drag-feedback')).toBeNull();
        fireEvent.pointerMove(agent, { pointerId: 9, clientX: startX + 120, clientY: startY + 80 });
        expect(container.querySelector('.floor1-candidate-drag-feedback')).toBeTruthy();
        fireEvent.pointerUp(agent, { pointerId: 9, clientX: startX + 120, clientY: startY + 80 });
        expect(screen.getByRole('status').textContent).toContain('repositioned');
        expect(agent.getAttribute('data-agent-state')).toBe('idle');
    });

    it('reverts invalid and canceled drags to the original point', async () => {
        const { container } = render(<Floor1CandidateSimulation active reducedMotion presentation="simulation" registration={TEST_REGISTRATION} viewport={{ width: 8192, height: 5460 }} transform={{ x: 0, y: 0, scale: 1 }} />);
        await screen.findByLabelText('Agent simulation controls');
        fireEvent.click(screen.getByRole('button', { name: 'Add agent' }));
        const agent = container.querySelector<HTMLElement>('[data-agent-id="prototype-agent-01"]')!;
        const original = `${agent.style.left},${agent.style.top}`;
        Object.defineProperties(agent, {
            setPointerCapture: { configurable: true, value: vi.fn() },
            hasPointerCapture: { configurable: true, value: vi.fn(() => true) },
            releasePointerCapture: { configurable: true, value: vi.fn() },
        });
        fireEvent.pointerDown(agent, { pointerId: 4, button: 0, clientX: 4100, clientY: 2700 });
        fireEvent.pointerMove(agent, { pointerId: 4, clientX: -1000, clientY: -1000 });
        fireEvent.pointerUp(agent, { pointerId: 4, clientX: -1000, clientY: -1000 });
        await waitFor(() => expect(`${agent.style.left},${agent.style.top}`).toBe(original));
        expect(screen.getByRole('status').textContent).toContain('Invalid drop reverted');
        fireEvent.pointerDown(agent, { pointerId: 5, button: 0, clientX: 4100, clientY: 2700 });
        fireEvent.pointerMove(agent, { pointerId: 5, clientX: 4300, clientY: 2800 });
        fireEvent.keyDown(window, { key: 'Escape' });
        await waitFor(() => expect(`${agent.style.left},${agent.style.top}`).toBe(original));
        expect(container.querySelector('.floor1-candidate-drag-feedback')).toBeNull();
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

    it('opens a read-only ambient card and disables direct dragging', async () => {
        const { container } = render(<Floor1CandidateSimulation active={false} reducedMotion registration={TEST_REGISTRATION} presentation="inspection" viewport={{ width: 1200, height: 800 }} transform={{ x: 0, y: 0, scale: 0.1 }} />);
        await screen.findByLabelText('Office Engine simulation controls');
        const second = screen.getByLabelText(/Agent 02\./);
        fireEvent.click(second);
        expect(screen.getByLabelText('Agent 02 details').textContent).toContain('ambient and read-only');
        const before = `${(second as HTMLElement).style.left},${(second as HTMLElement).style.top}`;
        fireEvent.pointerDown(second, { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
        fireEvent.pointerMove(second, { pointerId: 1, clientX: 300, clientY: 300 });
        fireEvent.pointerUp(second, { pointerId: 1, clientX: 300, clientY: 300 });
        expect(`${(second as HTMLElement).style.left},${(second as HTMLElement).style.top}`).toBe(before);
        expect(container.querySelector('.floor1-candidate-drag-feedback')).toBeNull();
    });
});
