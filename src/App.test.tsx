// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { EventBus } from './game/EventBus';

const phaserLifecycle = vi.hoisted(() => ({ creates: 0, destroys: 0, refreshes: 0 }));

vi.mock('phaser', () => {
    class EventEmitter {
        private listeners = new Map<string, Set<(...args: never[]) => void>>();
        on(event: string, listener: (...args: never[]) => void) {
            const eventListeners = this.listeners.get(event) ?? new Set();
            eventListeners.add(listener);
            this.listeners.set(event, eventListeners);
            return this;
        }
        emit(event: string, ...args: never[]) {
            this.listeners.get(event)?.forEach(listener => listener(...args));
            return true;
        }
        removeListener(event: string, listener: (...args: never[]) => void) {
            this.listeners.get(event)?.delete(listener);
            return this;
        }
        removeAllListeners(event?: string) {
            if (event) this.listeners.delete(event);
            else this.listeners.clear();
            return this;
        }
    }
    return { Events: { EventEmitter } };
});

vi.mock('./PhaserGame', async () => {
    const React = await import('react');
    return {
        PhaserGame: React.forwardRef(function MockPhaserGame(_props, ref) {
            const game = React.useMemo(() => ({
                scale: { refresh: () => { phaserLifecycle.refreshes += 1; } },
                destroy: () => { phaserLifecycle.destroys += 1; },
            }), []);

            React.useLayoutEffect(() => {
                phaserLifecycle.creates += 1;
                if (typeof ref === 'function') ref({ game, scene: null });
                else if (ref) ref.current = { game, scene: null };
                return () => game.destroy();
            }, [game, ref]);
            return <div data-testid="phaser-game" />;
        }),
    };
});

vi.mock('./components/office/OfficeEngine', () => ({
    OfficeEngine: () => <button type="button">Office action</button>,
}));

function switchTo(label: 'Office engine' | 'Agent simulation'): void {
    fireEvent.click(screen.getByRole('button', { name: label }));
}

function panelFor(text: string): HTMLElement {
    const content = screen.getByText(text);
    const panel = content.closest('.application-view__panel');
    if (!panel) throw new Error(`No view panel found for ${text}`);
    return panel as HTMLElement;
}

beforeEach(() => {
    phaserLifecycle.creates = 0;
    phaserLifecycle.destroys = 0;
    phaserLifecycle.refreshes = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
    cleanup();
    EventBus.removeAllListeners();
    vi.unstubAllGlobals();
});

describe('application view lifecycle', () => {
    it('mounts one simulation and keeps it mounted through repeated view switches', () => {
        const { unmount } = render(<App />);
        expect(phaserLifecycle.creates).toBe(1);
        expect(phaserLifecycle.destroys).toBe(0);

        switchTo('Agent simulation');
        switchTo('Office engine');
        switchTo('Agent simulation');
        switchTo('Office engine');

        expect(phaserLifecycle.creates).toBe(1);
        expect(phaserLifecycle.destroys).toBe(0);
        unmount();
        expect(phaserLifecycle.destroys).toBe(1);
    });

    it('preserves selection and active movement state while the office is visible', () => {
        render(<App />);
        switchTo('Agent simulation');
        fireEvent.change(screen.getByLabelText('Select Agent:'), { target: { value: 'jarvis' } });
        fireEvent.click(screen.getByRole('button', { name: 'Send to Meeting Room' }));
        expect(screen.getByText('moving')).toBeTruthy();
        expect(screen.getAllByText('Meeting Room')).toHaveLength(2);

        switchTo('Office engine');
        switchTo('Agent simulation');

        expect((screen.getByLabelText('Select Agent:') as HTMLSelectElement).value).toBe('jarvis');
        expect(screen.getByText('moving')).toBeTruthy();
        expect(screen.getAllByText('Meeting Room')).toHaveLength(2);
    });

    it('preserves completed positions after switching away and back', () => {
        render(<App />);
        switchTo('Agent simulation');
        fireEvent.change(screen.getByLabelText('Select Agent:'), { target: { value: 'jarvis' } });
        fireEvent.click(screen.getByRole('button', { name: 'Send to Meeting Room' }));
        act(() => EventBus.emit('movement-completed', {
            agentId: 'jarvis', locationId: 'meeting_room', commandId: 1,
        }));
        expect(screen.getByText('Arrived')).toBeTruthy();

        switchTo('Office engine');
        switchTo('Agent simulation');

        expect(screen.getByText('Arrived')).toBeTruthy();
        expect(screen.getAllByText('Meeting Room')).toHaveLength(2);
    });

    it('does not reset the command counter or active command history', () => {
        const commands: Array<{ commandId: number }> = [];
        EventBus.on('react-move-agent', (command: { commandId: number }) => commands.push(command));
        render(<App />);
        switchTo('Agent simulation');
        fireEvent.change(screen.getByLabelText('Select Agent:'), { target: { value: 'jarvis' } });
        fireEvent.click(screen.getByRole('button', { name: 'Send to Meeting Room' }));
        switchTo('Office engine');
        switchTo('Agent simulation');
        fireEvent.click(screen.getByRole('button', { name: 'Send to Project Table' }));

        expect(commands.map(command => command.commandId)).toEqual([1, 2]);
        act(() => EventBus.emit('movement-completed', {
            agentId: 'jarvis', locationId: 'meeting_room', commandId: 1,
        }));
        expect(screen.getByText('moving')).toBeTruthy();
        expect(screen.getAllByText('Project Table')).toHaveLength(2);
    });

    it('removes the inactive view from layout, interaction, focus, and the accessibility tree', () => {
        render(<App />);
        const simulationPanel = panelFor('Jarvis Agent Ecosystem');
        const officePanel = panelFor('Office action');

        expect(simulationPanel.hidden).toBe(true);
        expect(simulationPanel.getAttribute('inert')).not.toBeNull();
        expect(simulationPanel.getAttribute('aria-hidden')).toBe('true');
        expect(officePanel.hidden).toBe(false);
        expect(officePanel.hasAttribute('inert')).toBe(false);

        switchTo('Agent simulation');
        expect(officePanel.hidden).toBe(true);
        expect(officePanel.getAttribute('inert')).not.toBeNull();
        expect(officePanel.getAttribute('aria-hidden')).toBe('true');
        expect(simulationPanel.hidden).toBe(false);
        expect(simulationPanel.hasAttribute('inert')).toBe(false);
    });

    it('refreshes the existing Phaser scale manager when the simulation becomes visible', () => {
        render(<App />);
        expect(phaserLifecycle.refreshes).toBe(0);
        switchTo('Agent simulation');
        expect(phaserLifecycle.refreshes).toBe(1);
        switchTo('Office engine');
        switchTo('Agent simulation');
        expect(phaserLifecycle.refreshes).toBe(2);
        expect(phaserLifecycle.creates).toBe(1);
    });
});
