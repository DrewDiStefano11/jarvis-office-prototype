import { describe, it, expect } from 'vitest';
import {
    startNextTask,
    advanceTask,
    pauseTask,
    resumeTask,
    blockTask,
    clearBlocker,
    completeTask,
    resetSimulation,
    failTask,
    retryTask,
    cancelTask
} from '../domain/task';
import { INITIAL_AGENTS, INITIAL_TASKS } from '../domain/seed';
import { handleMovementCompleted } from '../domain/state';

describe('Task Simulation Domain Logic', () => {
    it('starts a queued task and updates agent status', () => {
        const result = startNextTask('jarvis', INITIAL_AGENTS, INITIAL_TASKS);

        expect(result.success).toBe(true);
        if (!result.success) return;

        const jarvis = result.newAgents.find(a => a.id === 'jarvis')!;
        const task = result.newTasks.find(t => t.assignedAgentId === 'jarvis')!;

        expect(jarvis.currentStatus).toBe('working');
        expect(jarvis.currentTaskId).toBe(task.id);
        expect(task.status).toBe('active');
        expect(task.progress).toBe(0);
        expect(task.currentStepIndex).toBe(0);
    });

    it('prevents starting a task when none are queued', () => {
        // First start and complete a task to empty the queue
        const res = startNextTask('jarvis', INITIAL_AGENTS, INITIAL_TASKS);
        if (!res.success) throw new Error('Start failed');
        const compRes = completeTask('jarvis', res.newAgents, res.newTasks);
        if (!compRes.success) throw new Error('Complete failed');

        // Try starting again
        const failRes = startNextTask('jarvis', compRes.newAgents, compRes.newTasks);
        expect(failRes.success).toBe(false);
        if (!failRes.success) {
            expect(failRes.error).toContain('No queued tasks');
        }
    });

    it('advances progress deterministically based on steps', () => {
        const startRes = startNextTask('jarvis', INITIAL_AGENTS, INITIAL_TASKS);
        if (!startRes.success) throw new Error('Start failed');

        const advRes = advanceTask('jarvis', startRes.newAgents, startRes.newTasks);
        if (!advRes.success) throw new Error('Advance failed');

        let task = advRes.newTasks.find(t => t.id === 'task_jarvis_1')!;
        expect(task.currentStepIndex).toBe(1);
        expect(task.progress).toBe(50); // 1 / 2 steps * 100

        // Advance again to complete
        const advRes2 = advanceTask('jarvis', advRes.newAgents, advRes.newTasks);
        if (!advRes2.success) throw new Error('Advance 2 failed');

        task = advRes2.newTasks.find(t => t.id === 'task_jarvis_1')!;
        expect(task.currentStepIndex).toBe(1); // The step index shouldn't matter now that it's completed, but the function completes the task
        expect(task.progress).toBe(100);
        expect(task.status).toBe('completed');
    });

    it('pauses and resumes a task', () => {
        const startRes = startNextTask('jarvis', INITIAL_AGENTS, INITIAL_TASKS);
        if (!startRes.success) throw new Error('Start failed');

        const pauseRes = pauseTask('jarvis', startRes.newAgents, startRes.newTasks);
        if (!pauseRes.success) throw new Error('Pause failed');

        let jarvis = pauseRes.newAgents.find(a => a.id === 'jarvis')!;
        let task = pauseRes.newTasks.find(t => t.id === 'task_jarvis_1')!;

        expect(jarvis.currentStatus).toBe('paused');
        expect(task.status).toBe('paused');

        // Resume
        const resumeRes = resumeTask('jarvis', pauseRes.newAgents, pauseRes.newTasks);
        if (!resumeRes.success) throw new Error('Resume failed');

        jarvis = resumeRes.newAgents.find(a => a.id === 'jarvis')!;
        task = resumeRes.newTasks.find(t => t.id === 'task_jarvis_1')!;

        expect(jarvis.currentStatus).toBe('working');
        expect(task.status).toBe('active');
    });

    it('blocks and clears blockers from a task', () => {
        const startRes = startNextTask('jarvis', INITIAL_AGENTS, INITIAL_TASKS);
        if (!startRes.success) throw new Error('Start failed');

        const blockRes = blockTask('jarvis', 'Network Error', startRes.newAgents, startRes.newTasks);
        if (!blockRes.success) throw new Error('Block failed');

        let jarvis = blockRes.newAgents.find(a => a.id === 'jarvis')!;
        let task = blockRes.newTasks.find(t => t.id === 'task_jarvis_1')!;

        expect(jarvis.currentStatus).toBe('error');
        expect(jarvis.currentBlocker).toBe('Network Error');
        expect(task.status).toBe('blocked');
        expect(task.blocker).toBe('Network Error');

        // Clear blocker
        const clearRes = clearBlocker('jarvis', blockRes.newAgents, blockRes.newTasks);
        if (!clearRes.success) throw new Error('Clear failed');

        jarvis = clearRes.newAgents.find(a => a.id === 'jarvis')!;
        task = clearRes.newTasks.find(t => t.id === 'task_jarvis_1')!;

        expect(jarvis.currentStatus).toBe('working');
        expect(jarvis.currentBlocker).toBeNull();
        expect(task.status).toBe('active');
        expect(task.blocker).toBeNull();
    });

    it('completes a task explicitly', () => {
        const startRes = startNextTask('jarvis', INITIAL_AGENTS, INITIAL_TASKS);
        if (!startRes.success) throw new Error('Start failed');

        const compRes = completeTask('jarvis', startRes.newAgents, startRes.newTasks);
        if (!compRes.success) throw new Error('Complete failed');

        const jarvis = compRes.newAgents.find(a => a.id === 'jarvis')!;
        const task = compRes.newTasks.find(t => t.id === 'task_jarvis_1')!;

        expect(jarvis.currentStatus).toBe('idle');
        expect(jarvis.currentTaskId).toBeNull();

        expect(task.status).toBe('completed');
        expect(task.progress).toBe(100);
    });

    it('fails and retries a task', () => {
        const startRes = startNextTask('jarvis', INITIAL_AGENTS, INITIAL_TASKS);
        if (!startRes.success) throw new Error('Start failed');

        const failRes = failTask('jarvis', 'Fatal error', startRes.newAgents, startRes.newTasks);
        if (!failRes.success) throw new Error('Fail failed');

        let jarvis = failRes.newAgents.find(a => a.id === 'jarvis')!;
        let task = failRes.newTasks.find(t => t.id === 'task_jarvis_1')!;
        expect(jarvis.currentStatus).toBe('error');
        expect(task.status).toBe('failed');
        expect(task.blocker).toBe('Fatal error');

        const retryRes = retryTask('jarvis', failRes.newAgents, failRes.newTasks);
        if (!retryRes.success) throw new Error('Retry failed');

        jarvis = retryRes.newAgents.find(a => a.id === 'jarvis')!;
        task = retryRes.newTasks.find(t => t.id === 'task_jarvis_1')!;
        expect(jarvis.currentStatus).toBe('idle');
        expect(jarvis.currentTaskId).toBeNull();
        expect(task.status).toBe('queued');
        expect(task.progress).toBe(0);
        expect(task.currentStepIndex).toBe(0);
        expect(task.blocker).toBeNull();
    });

    it('cancels a task', () => {
        const startRes = startNextTask('jarvis', INITIAL_AGENTS, INITIAL_TASKS);
        if (!startRes.success) throw new Error('Start failed');

        const cancelRes = cancelTask('task_jarvis_1', startRes.newAgents, startRes.newTasks);
        if (!cancelRes.success) throw new Error('Cancel failed');

        const jarvis = cancelRes.newAgents.find(a => a.id === 'jarvis')!;
        const task = cancelRes.newTasks.find(t => t.id === 'task_jarvis_1')!;

        expect(jarvis.currentStatus).toBe('idle');
        expect(jarvis.currentTaskId).toBeNull();
        expect(task.status).toBe('cancelled');
    });

    it('validates invalid destination rejections', () => {
        // We modify INITIAL_TASKS in an isolated way for the test to point to an invalid dest
        const testTasks = [...INITIAL_TASKS];
        testTasks[0] = { ...testTasks[0], steps: [{ id: 'test_step', description: 'test', destinationId: 'agent_builder_lab' }] };

        const startRes = startNextTask('jarvis', INITIAL_AGENTS, testTasks);
        if (!startRes.success) throw new Error('Start failed');

        const advRes = advanceTask('jarvis', startRes.newAgents, startRes.newTasks);
        expect(advRes.success).toBe(false);
        if (!advRes.success) {
            expect(advRes.error).toContain('Invalid destination');
        }
    });

    it('prevents multiple active tasks for one agent', () => {
        const startRes = startNextTask('jarvis', INITIAL_AGENTS, INITIAL_TASKS);
        if (!startRes.success) throw new Error('Start failed');

        // Force a second queued task into the queue for Jarvis
        const testTasks = [...startRes.newTasks];
        testTasks.push({ ...testTasks[0], id: 'task_jarvis_duplicate', status: 'queued' });

        const startRes2 = startNextTask('jarvis', startRes.newAgents, testTasks);
        expect(startRes2.success).toBe(false);
        if (!startRes2.success) {
            expect(startRes2.error).toContain('Agent already has an active task');
        }
    });

    it('rejects invalid lifecycle transitions', () => {
        // Cannot advance a queued task
        const advanceRes = advanceTask('jarvis', INITIAL_AGENTS, INITIAL_TASKS);
        expect(advanceRes.success).toBe(false);

        // Cannot pause a queued task
        const pauseRes = pauseTask('jarvis', INITIAL_AGENTS, INITIAL_TASKS);
        expect(pauseRes.success).toBe(false);

        // Cannot resume an active task
        const startRes = startNextTask('jarvis', INITIAL_AGENTS, INITIAL_TASKS);
        if (!startRes.success) throw new Error('Start failed');
        const resumeRes = resumeTask('jarvis', startRes.newAgents, startRes.newTasks);
        expect(resumeRes.success).toBe(false);
    });

    it('stale movement completion should not overwrite active task status', () => {
        // Start task for Jarvis
        const res = startNextTask('jarvis', INITIAL_AGENTS, INITIAL_TASKS);
        if (!res.success) throw new Error('Start failed');
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
        const startRes = startNextTask('jarvis', INITIAL_AGENTS, INITIAL_TASKS);
        if (!startRes.success) throw new Error('Start failed');
        const advRes = advanceTask('jarvis', startRes.newAgents, startRes.newTasks);
        if (!advRes.success) throw new Error('Advance failed');

        // Mutate agent position to simulate movement
        advRes.newAgents = advRes.newAgents.map(a => a.id === 'jarvis' ? { ...a, currentLocation: 'meeting_room' } : a);

        const resetRes = resetSimulation(advRes.newAgents);

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
        const res = startNextTask('jarvis', INITIAL_AGENTS, INITIAL_TASKS);
        if (!res.success) throw new Error('Start failed');

        const atlas = res.newAgents.find(a => a.id === 'atlas')!;
        const atlasTask = res.newTasks.find(t => t.assignedAgentId === 'atlas')!;

        expect(atlas.currentStatus).toBe('idle');
        expect(atlasTask.status).toBe('queued');
    });
});
