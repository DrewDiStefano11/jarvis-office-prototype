import { describe, it, expect, beforeEach } from 'vitest';
import { Agent, Task, MovementOperation } from '../types';
import { startNextTask, advanceTask, blockTask, clearBlocker, resetSimulation, failTask, retryTask } from '../domain/task';
import { INITIAL_AGENTS, INITIAL_TASKS } from '../domain/seed';
import { createMovementOperation, applyMovementCompletion } from '../domain/state';

describe('Deterministic Task Lifecycle', () => {
    let agents: readonly Agent[];
    let tasks: readonly Task[];
    let ops: Record<string, MovementOperation>;

    beforeEach(() => {
        agents = JSON.parse(JSON.stringify(INITIAL_AGENTS));
        tasks = JSON.parse(JSON.stringify(INITIAL_TASKS));
        ops = {};
    });

    it('should successfully start a queued task and assign it to the agent', () => {
        const result = startNextTask('jarvis', agents, tasks, ops, 0, 0);

        expect(result.ok).toBe(true);
        if (result.ok) {
            const newAgents = result.value.agents;
            const newTasks = result.value.tasks;

            const agent = newAgents.find((a: Agent) => a.id === 'jarvis');
            expect(agent?.currentStatus).toBe('working');
            expect(agent?.currentTaskId).toBeTruthy();

            const task = newTasks.find((t: Task) => t.id === agent?.currentTaskId);
            expect(task?.status).toBe('active');

            expect(result.value.startedTaskId).toBe(task?.id);
        }
    });

    it('should reject starting a task if agent already working', () => {
        let result = startNextTask('jarvis', agents, tasks, ops, 0, 0);
        if (result.ok) {
             result = startNextTask('jarvis', result.value.agents, result.value.tasks, ops, 0, 0);
             expect(result.ok).toBe(false);
             if (!result.ok) {
                 expect(result.code).toBe('AGENT_NOT_IDLE');
             }
        }
    });

    it('should successfully advance a task step and eventually complete', () => {
        const result = startNextTask('jarvis', agents, tasks, ops, 0, 0);

        if (result.ok) {
            const taskId = result.value.startedTaskId;
            const agentsWithLoc = result.value.agents.map((a: Agent) => a.id === 'jarvis' ? { ...a, currentLocation: result.value.tasks.find((t: Task) => t.id === taskId)?.steps[0]?.destinationId || '' } : a);

            const advanceRes = advanceTask('jarvis', agentsWithLoc, result.value.tasks, ops, 0, 0);
            expect(advanceRes.ok).toBe(true);
            if (advanceRes.ok) {
                const newTasks = advanceRes.value.tasks;
                const task = newTasks.find((t: Task) => t.id === taskId);
                expect(task?.currentStepIndex).toBe(1);
            }
        }
    });

    it('should block and clear block correctly', () => {
        const res1 = startNextTask('jarvis', agents, tasks, ops, 0, 0);
        if (res1.ok) {
            const res2 = blockTask('jarvis', 'Network issue', res1.value.agents, res1.value.tasks, ops, 0, 0);
            expect(res2.ok).toBe(true);

            if (res2.ok) {
                const task = res2.value.tasks.find((t: Task) => t.id === res1.value.startedTaskId);
                expect(task?.status).toBe('blocked');
                expect(task?.blocker).toBe('Network issue');

                const res3 = clearBlocker('jarvis', res2.value.agents, res2.value.tasks, ops, 0, 0);
                expect(res3.ok).toBe(true);
                if (res3.ok) {
                    const unblocked = res3.value.tasks.find((t: Task) => t.id === res1.value.startedTaskId);
                    expect(unblocked?.status).toBe('active');
                }
            }
        }
    });

    it('should fail and retry task correctly', () => {
        const res1 = startNextTask('jarvis', agents, tasks, ops, 0, 0);
        if (res1.ok) {
            const res2 = failTask('jarvis', 'Critical error', res1.value.agents, res1.value.tasks, ops, 0, 0);
            expect(res2.ok).toBe(true);

            if (res2.ok) {
                 const task = res2.value.tasks.find((t: Task) => t.id === res1.value.startedTaskId);
                 expect(task?.status).toBe('failed');

                 const res3 = retryTask('jarvis', res2.value.agents, res2.value.tasks, ops, 0, 0);
                 expect(res3.ok).toBe(true);
                 if (res3.ok) {
                     const retried = res3.value.tasks.find((t: Task) => t.id === res1.value.startedTaskId);
                     expect(retried?.status).toBe('queued');

                     const agent = res3.value.agents.find((a: Agent) => a.id === 'jarvis');
                     expect(agent?.currentTaskId).toBeNull();
                 }
            }
        }
    });

    it('should reset simulation cleanly to seed states', () => {
        const res1 = startNextTask('jarvis', agents, tasks, ops, 0, 0);
        if (res1.ok) {
            const resetRes = resetSimulation(res1.value.agents);

            const jarvis = resetRes.agents.find((a: Agent) => a.id === 'jarvis');
            expect(jarvis?.currentTaskId).toBeNull();
            expect(jarvis?.currentStatus).toBe('idle');
        }
    });

    it('should invalidate movement command correctly on stale operations', () => {
         const op = createMovementOperation('jarvis', 'task_1', 'loc_1', 0, 0, {});

         const res = applyMovementCompletion('jarvis', 'loc_1', 1, 0, 'task_1', agents, tasks, op.movementOperations);
         expect(res.ok).toBe(false);
         if (!res.ok) {
             expect(res.code).toBe('STALE_OPERATION');
         }
    });
});
