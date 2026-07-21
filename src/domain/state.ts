import { Agent, AgentStatus, MovementOperation, Task, DomainResult } from '../types';

export function createMovementOperation(
    agentId: string,
    taskId: string,
    destinationId: string,
    commandCounter: number,
    simulationGeneration: number,
    movementOperations: Readonly<Record<string, MovementOperation>>
) {
    const nextCommandId = commandCounter + 1;
    const operation: MovementOperation = {
        agentId,
        taskId,
        destinationId,
        commandId: nextCommandId,
        simulationGeneration
    };

    const newOperations = { ...movementOperations };
    newOperations[agentId] = operation;

    return {
        commandCounter: nextCommandId,
        movementOperations: newOperations,
        operation
    };
}

export function invalidateMovementOperation(
    agentId: string,
    movementOperations: Readonly<Record<string, MovementOperation>>
): Readonly<Record<string, MovementOperation>> {
    const newOps = { ...movementOperations };
    delete newOps[agentId];
    return newOps;
}

export function applyMovementCompletion(
    agentId: string,
    locationId: string,
    commandId: number,
    simulationGeneration: number,
    taskId: string,
    agents: readonly Agent[],
    tasks: readonly Task[],
    movementOperations: Readonly<Record<string, MovementOperation>>
): DomainResult<{ agents: readonly Agent[]; movementOperations: Readonly<Record<string, MovementOperation>> }> {

    const agent = agents.find(a => a.id === agentId);
    if (!agent) return { ok: false, code: "AGENT_NOT_FOUND", message: "Agent not found" };

    const op = movementOperations[agentId];
    if (!op) return { ok: false, code: "STALE_OPERATION", message: "No outstanding operation" };

    if (op.commandId !== commandId || op.simulationGeneration !== simulationGeneration || op.taskId !== taskId) {
        return { ok: false, code: "STALE_OPERATION", message: "Operation mismatch" };
    }

    const task = tasks.find(t => t.id === taskId);
    if (!task) return { ok: false, code: "STALE_OPERATION", message: "Task missing" };
    if (agent.currentTaskId !== taskId) return { ok: false, code: "STALE_OPERATION", message: "Task reassigned" };
    if (task.status !== 'active') return { ok: false, code: "STALE_OPERATION", message: "Task not active" };

    const step = task.steps[task.currentStepIndex];
    if (!step || step.destinationId !== locationId || step.destinationId !== op.destinationId) {
         return { ok: false, code: "STALE_OPERATION", message: "Destination mismatch" };
    }

    const newAgents = agents.map(a =>
        a.id === agentId
        ? { ...a, currentLocation: locationId, targetLocation: null, currentStatus: 'working' as AgentStatus, statusMessage: `Working: ${task.title}` }
        : a
    );

    const newOps = invalidateMovementOperation(agentId, movementOperations);

    return {
        ok: true,
        value: {
            agents: newAgents,
            movementOperations: newOps
        }
    }
}