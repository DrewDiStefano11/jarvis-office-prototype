import { describe, it, expect } from 'vitest';
import { handleMovementCommand, handleMovementCompleted, handleResetAll } from '../domain/state';
import { INITIAL_AGENTS } from '../domain/seed';

describe('Movement & Reset State Logic', () => {
    it('should supersede an older movement command with a newer one', () => {
        let agents = [...INITIAL_AGENTS];
        let activeCommands: Record<string, number> = {};
        let cmdCounter = 0;

        // Command 1
        const res1 = handleMovementCommand('jarvis', 'meeting_room', cmdCounter, agents, activeCommands);
        agents = res1.newAgents;
        activeCommands = res1.newActiveCommands;
        cmdCounter = res1.nextCommandId;

        expect(activeCommands['jarvis']).toBe(1);
        expect(agents.find(a => a.id === 'jarvis')?.targetLocation).toBe('meeting_room');

        // Command 2 (Supersedes 1)
        const res2 = handleMovementCommand('jarvis', 'project_table', cmdCounter, agents, activeCommands);
        agents = res2.newAgents;
        activeCommands = res2.newActiveCommands;
        cmdCounter = res2.nextCommandId;

        expect(activeCommands['jarvis']).toBe(2);
        expect(agents.find(a => a.id === 'jarvis')?.targetLocation).toBe('project_table');
    });

    it('should ignore stale movement completion callbacks', () => {
        let agents = [...INITIAL_AGENTS];
        const activeCommands: Record<string, number> = { 'jarvis': 2 };

        // Agent is currently moving to project_table (cmd 2)
        agents = agents.map(a => a.id === 'jarvis' ? { ...a, currentStatus: 'moving' as const, targetLocation: 'project_table' } : a);

        // Stale completion arrives for cmd 1
        agents = handleMovementCompleted('jarvis', 'meeting_room', 1, agents, activeCommands);

        // State should not have changed to meeting_room
        const jarvis = agents.find(a => a.id === 'jarvis');
        expect(jarvis?.currentStatus).toBe('moving');
        expect(jarvis?.targetLocation).toBe('project_table');
        expect(jarvis?.currentLocation).not.toBe('meeting_room');
    });

    it('should invalidate active commands and reset state on resetAll', () => {
        let agents = [...INITIAL_AGENTS];
        let activeCommands: Record<string, number> = {};

        // Setup some active movement
        const res1 = handleMovementCommand('jarvis', 'meeting_room', 0, agents, activeCommands);
        agents = res1.newAgents;
        activeCommands = res1.newActiveCommands;

        // Call reset
        const resetRes = handleResetAll(agents);
        agents = resetRes.newAgents;
        activeCommands = resetRes.newActiveCommands;

        expect(Object.keys(activeCommands).length).toBe(0);

        const jarvis = agents.find(a => a.id === 'jarvis');
        expect(jarvis?.currentStatus).toBe('idle');
        expect(jarvis?.currentLocation).toBe('jarvis_desk');
        expect(jarvis?.targetLocation).toBeNull();
    });

    it('should accept valid movement completion', () => {
        let agents = [...INITIAL_AGENTS];
        const activeCommands: Record<string, number> = { 'jarvis': 1 };

        agents = handleMovementCompleted('jarvis', 'meeting_room', 1, agents, activeCommands);

        const jarvis = agents.find(a => a.id === 'jarvis');
        expect(jarvis?.currentStatus).toBe('idle');
        expect(jarvis?.currentLocation).toBe('meeting_room');
    });
});
