import { describe, it, expect } from 'vitest';
import {
    startNextTask,
    advanceTask,
    pauseTask,
    resumeTask,
    blockTask,
    clearBlocker,
    completeTask,
    resetSimulation
} from '../domain/task';
import { INITIAL_AGENTS, INITIAL_TASKS } from '../domain/seed';
import { handleMovementCompleted } from '../domain/state';

describe('Task Simulation Domain Logic', () => {
    it('starts a queued task and updates agent status', () => {
        const { newAgents, newTasks, error } = startNextTask('jarvis', INITIAL_AGENTS, INITIAL_TASKS);

        expect(error).toBeUndefined();

        const jarvis = newAgents.find(a => a.id === 'jarvis')!;
        const task = newTasks.find(t => t.assignedAgentId === 'jarvis')!;

        expect(jarvis.currentStatus).toBe('working');
        expect(jarvis.currentTaskId).toBe(task.id);
        expect(task.status).toBe('active');
        expect(task.progress).toBe(0);
        expect(task.currentStepIndex).toBe(0);
    });

    it('prevents starting a task when none are queued', () => {
        // First start and complete a task to empty the queue
        let res = startNextTask('jarvis', INITIAL_AGENTS, INITIAL_TASKS);
        res = completeTask('jarvis', res.newAgents, res.newTasks);

        // Try starting again
        const { error } = startNextTask('jarvis', res.newAgents, res.newTasks);
        expect(error).toBeDefined();
        expect(error).toContain('No queued tasks');
    });

    it('advances progress deterministically based on steps', () => {
        let res = startNextTask('jarvis', INITIAL_AGENTS, INITIAL_TASKS);

        res = advanceTask('jarvis', res.newAgents, res.newTasks);

        let task = res.newTasks.find(t => t.id === 'task_jarvis_1')!;
        expect(task.currentStepIndex).toBe(1);
        expect(task.progress).toBe(50); // 1 / 2 steps * 100

        // Advance again to complete
        res = advanceTask('jarvis', res.newAgents, res.newTasks);
        task = res.newTasks.find(t => t.id === 'task_jarvis_1')!;
        expect(task.currentStepIndex).toBe(1); // The step index shouldn't matter now that it's completed, but the function completes the task
        expect(task.progress).toBe(100);
        expect(task.status).toBe('completed');
    });

    it('pauses and resumes a task', () => {
        let res = startNextTask('jarvis', INITIAL_AGENTS, INITIAL_TASKS);

        res = pauseTask('jarvis', res.newAgents, res.newTasks);

        let jarvis = res.newAgents.find(a => a.id === 'jarvis')!;
        let task = res.newTasks.find(t => t.id === 'task_jarvis_1')!;

        expect(jarvis.currentStatus).toBe('paused');
        expect(task.status).toBe('paused');

        // Resume
        res = resumeTask('jarvis', res.newAgents, res.newTasks);

        jarvis = res.newAgents.find(a => a.id === 'jarvis')!;
        task = res.newTasks.find(t => t.id === 'task_jarvis_1')!;

        expect(jarvis.currentStatus).toBe('working');
        expect(task.status).toBe('active');
    });

    it('blocks and clears blockers from a task', () => {
        let res = startNextTask('jarvis', INITIAL_AGENTS, INITIAL_TASKS);

        res = blockTask('jarvis', 'Network Error', res.newAgents, res.newTasks);

        let jarvis = res.newAgents.find(a => a.id === 'jarvis')!;
        let task = res.newTasks.find(t => t.id === 'task_jarvis_1')!;

        expect(jarvis.currentStatus).toBe('error');
        expect(jarvis.currentBlocker).toBe('Network Error');
        expect(task.status).toBe('blocked');
        expect(task.blocker).toBe('Network Error');

        // Clear blocker
        res = clearBlocker('jarvis', res.newAgents, res.newTasks);

        jarvis = res.newAgents.find(a => a.id === 'jarvis')!;
        task = res.newTasks.find(t => t.id === 'task_jarvis_1')!;

        expect(jarvis.currentStatus).toBe('working');
        expect(jarvis.currentBlocker).toBeNull();
        expect(task.status).toBe('active');
        expect(task.blocker).toBeNull();
    });

    it('completes a task explicitly', () => {
        let res = startNextTask('jarvis', INITIAL_AGENTS, INITIAL_TASKS);

        res = completeTask('jarvis', res.newAgents, res.newTasks);

        const jarvis = res.newAgents.find(a => a.id === 'jarvis')!;
        const task = res.newTasks.find(t => t.id === 'task_jarvis_1')!;

        expect(jarvis.currentStatus).toBe('idle');
        expect(jarvis.currentTaskId).toBeNull();

        expect(task.status).toBe('completed');
        expect(task.progress).toBe(100);
        expect(task.completedAt).toBeDefined();
    });

    it('rejects invalid lifecycle transitions', () => {
        // Cannot advance a queued task
        const advanceRes = advanceTask('jarvis', INITIAL_AGENTS, INITIAL_TASKS);
        expect(advanceRes.error).toBeDefined();

        // Cannot pause a queued task
        const pauseRes = pauseTask('jarvis', INITIAL_AGENTS, INITIAL_TASKS);
        expect(pauseRes.error).toBeDefined();

        // Cannot resume an active task
        const res = startNextTask('jarvis', INITIAL_AGENTS, INITIAL_TASKS);
        const resumeRes = resumeTask('jarvis', res.newAgents, res.newTasks);
        expect(resumeRes.error).toBeDefined();
    });

    it('stale movement completion should not overwrite active task status', () => {
        // Start task for Jarvis
        const res = startNextTask('jarvis', INITIAL_AGENTS, INITIAL_TASKS);
        let agents = res.newAgents;

        // Simulate a stale movement command completing for Jarvis
        const activeCommands = { jarvis: 1 }; // Command 1 is "active"

        // This is a test of `handleMovementCompleted` directly, so we need to import it
        // Or we can just mock the scenario inline if we are testing domain logic loosely.
        // Let's assume the handleMovementCompleted logic from state.ts.
        // We will assert that the new logic preserves the 'working' status.

        agents = handleMovementCompleted('jarvis', 'meeting_room', 1, agents, activeCommands);

        const jarvis = agents.find(a => a.id === 'jarvis')!;
        expect(jarvis.currentStatus).toBe('working');
        expect(jarvis.statusMessage).not.toBe('Arrived');
    });

    it('resets simulation cleanly to seed state', () => {
        let res = startNextTask('jarvis', INITIAL_AGENTS, INITIAL_TASKS);
        res = advanceTask('jarvis', res.newAgents, res.newTasks);

        // Mutate agent position to simulate movement
        res.newAgents = res.newAgents.map(a => a.id === 'jarvis' ? { ...a, currentLocation: 'meeting_room' } : a);

        const resetRes = resetSimulation(res.newAgents);

        const jarvis = resetRes.newAgents.find(a => a.id === 'jarvis')!;
        const task = resetRes.newTasks.find(t => t.id === 'task_jarvis_1')!;

        // Assert deep reset
        expect(jarvis.currentStatus).toBe('idle');
        expect(jarvis.currentLocation).toBe('jarvis_desk'); // Original seed state

        expect(task.status).toBe('queued');
        expect(task.progress).toBe(0);
        expect(task.currentStepIndex).toBe(0);
    });

    it('ensures input-state immutability', () => {
        const initialAgentsCopy = JSON.parse(JSON.stringify(INITIAL_AGENTS));
        const initialTasksCopy = JSON.parse(JSON.stringify(INITIAL_TASKS));

        startNextTask('jarvis', INITIAL_AGENTS, INITIAL_TASKS);

        expect(INITIAL_AGENTS).toEqual(initialAgentsCopy);
        expect(INITIAL_TASKS).toEqual(initialTasksCopy);
    });

    it('ensures one agents task changes do not alter another agent', () => {
        const { newAgents, newTasks } = startNextTask('jarvis', INITIAL_AGENTS, INITIAL_TASKS);

        const atlas = newAgents.find(a => a.id === 'atlas')!;
        const atlasTask = newTasks.find(t => t.assignedAgentId === 'atlas')!;

        expect(atlas.currentStatus).toBe('idle');
        expect(atlasTask.status).toBe('queued');
    });
});
