import { Agent, AgentStatus, Task, TaskStatus, DomainResult, StartTaskValue, SimulationTransition, MovementOperation } from '../types';
import { INITIAL_AGENTS, INITIAL_TASKS } from './seed';
import { createMovementOperation, invalidateMovementOperation } from './state';

export function startNextTask(
    agentId: string,
    agents: readonly Agent[],
    tasks: readonly Task[],
    movementOperations: Readonly<Record<string, MovementOperation>>,
    commandCounter: number,
    simulationGeneration: number
): DomainResult<StartTaskValue> {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) {
        return { ok: false, code: "AGENT_NOT_FOUND", message: 'Agent not found.' };
    }

    if (agent.currentStatus !== 'idle') {
        return { ok: false, code: "AGENT_NOT_IDLE", message: 'Agent must be idle to start a task.' };
    }

    if (agent.currentTaskId) {
        return { ok: false, code: "AGENT_BUSY", message: 'Agent already has an active task.' };
    }

    // Ensure they don't have another task in a non-terminal state assigned to them
    const hasAnotherActiveTask = tasks.some(t => t.assignedAgentId === agentId && ['active', 'paused', 'blocked', 'failed'].includes(t.status));
    if (hasAnotherActiveTask) {
        return { ok: false, code: "AGENT_BUSY", message: 'Agent already owns another non-queued task.' };
    }

    // Find the next queued task for this agent deterministically (first one found)
    const nextTask = tasks.find(t => t.assignedAgentId === agentId && t.status === 'queued');

    if (!nextTask) {
        return { ok: false, code: "NO_ELIGIBLE_TASK", message: 'No queued task found for this agent.' };
    }

    const newTasks = tasks.map(t => {
        if (t.id === nextTask.id) {
            return {
                ...t,
                status: 'active' as TaskStatus
            };
        }
        return t;
    });

    let newMovementOperations = movementOperations;
    let newCommandCounter = commandCounter;
    let movementCommand = undefined;

    const stepZero = nextTask.steps[0];
    if (stepZero && stepZero.destinationId) {
        const res = createMovementOperation(agentId, nextTask.id, stepZero.destinationId, commandCounter, simulationGeneration, movementOperations);
        newMovementOperations = res.movementOperations;
        newCommandCounter = res.commandCounter;
        movementCommand = res.operation;
    }

    const newAgents = agents.map(a => {
        if (a.id === agentId) {
            return {
                ...a,
                currentStatus: 'working' as AgentStatus,
                currentTaskId: nextTask.id,
                statusMessage: `Working: ${nextTask.title}`
            };
        }
        return a;
    });

    return {
        ok: true,
        value: {
            agents: newAgents,
            tasks: newTasks,
            startedTaskId: nextTask.id,
            movementOperations: newMovementOperations,
            commandCounter: newCommandCounter,
            simulationGeneration,
            movementCommand
        }
    };
}

export function advanceTask(
    agentId: string,
    agents: readonly Agent[],
    tasks: readonly Task[],
    movementOperations: Readonly<Record<string, MovementOperation>>,
    commandCounter: number,
    simulationGeneration: number
): DomainResult<SimulationTransition> {
    const agent = agents.find(a => a.id === agentId);
    if (!agent || !agent.currentTaskId) {
        return { ok: false, code: 'TASK_NOT_FOUND', message: 'Agent has no active task.' };
    }

    const task = tasks.find(t => t.id === agent.currentTaskId);
    if (!task || task.status !== 'active') {
        return { ok: false, code: 'INVALID_TRANSITION', message: 'Task must be active to advance.' };
    }

    const currentStep = task.steps[task.currentStepIndex];
    if (currentStep && currentStep.destinationId) {
        if (agent.currentLocation !== currentStep.destinationId) {
            return { ok: false, code: 'DESTINATION_UNAVAILABLE', message: 'Agent has not reached the destination for this step.' };
        }
    }

    const nextStepIndex = task.currentStepIndex + 1;

    if (nextStepIndex >= task.steps.length) {
        return completeTask(agentId, agents, tasks, movementOperations, commandCounter, simulationGeneration);
    }

    const progress = Math.floor((nextStepIndex / task.steps.length) * 100);

    const newTasks = tasks.map(t => {
        if (t.id === task.id) {
            return {
                ...t,
                currentStepIndex: nextStepIndex,
                progress
            };
        }
        return t;
    });

    let newMovementOperations = movementOperations;
    let newCommandCounter = commandCounter;
    let movementCommand = undefined;

    const nextStep = newTasks.find(t => t.id === task.id)!.steps[nextStepIndex];
    if (nextStep && nextStep.destinationId) {
        const res = createMovementOperation(agentId, task.id, nextStep.destinationId, commandCounter, simulationGeneration, movementOperations);
        newMovementOperations = res.movementOperations;
        newCommandCounter = res.commandCounter;
        movementCommand = res.operation;
    }

    if (!movementCommand) {
        newMovementOperations = invalidateMovementOperation(agentId, newMovementOperations);
    }

    return {
        ok: true,
        value: {
            agents,
            tasks: newTasks,
            movementOperations: newMovementOperations,
            commandCounter: newCommandCounter,
            simulationGeneration,
            movementCommand
        }
    };
}

export function pauseTask(
    agentId: string,
    agents: readonly Agent[],
    tasks: readonly Task[],
    movementOperations: Readonly<Record<string, MovementOperation>>,
    commandCounter: number,
    simulationGeneration: number
): DomainResult<SimulationTransition> {
    const agent = agents.find(a => a.id === agentId);
    if (!agent || !agent.currentTaskId) {
        return { ok: false, code: 'TASK_NOT_FOUND', message: 'Agent has no active task.' };
    }

    const task = tasks.find(t => t.id === agent.currentTaskId);
    if (!task || task.status !== 'active') {
        return { ok: false, code: 'INVALID_TRANSITION', message: 'Only active tasks can be paused.' };
    }

    const newTasks = tasks.map(t => {
        if (t.id === task.id) {
            return {
                ...t,
                status: 'paused' as TaskStatus
            };
        }
        return t;
    });

    const newAgents = agents.map(a => {
        if (a.id === agentId) {
            return {
                ...a,
                currentStatus: 'paused' as AgentStatus,
                statusMessage: `Paused: ${task.title}`
            };
        }
        return a;
    });

    const newMovementOperations = invalidateMovementOperation(agentId, movementOperations);

    return {
        ok: true,
        value: {
            agents: newAgents,
            tasks: newTasks,
            movementOperations: newMovementOperations,
            commandCounter,
            simulationGeneration
        }
    };
}

export function resumeTask(
    agentId: string,
    agents: readonly Agent[],
    tasks: readonly Task[],
    movementOperations: Readonly<Record<string, MovementOperation>>,
    commandCounter: number,
    simulationGeneration: number
): DomainResult<SimulationTransition> {
    const agent = agents.find(a => a.id === agentId);
    if (!agent || !agent.currentTaskId) {
        return { ok: false, code: 'TASK_NOT_FOUND', message: 'Agent has no paused task.' };
    }

    const task = tasks.find(t => t.id === agent.currentTaskId);
    if (!task || task.status !== 'paused') {
        return { ok: false, code: 'INVALID_TRANSITION', message: 'Task is not paused.' };
    }

    const newTasks = tasks.map(t => {
        if (t.id === task.id) {
            return {
                ...t,
                status: 'active' as TaskStatus
            };
        }
        return t;
    });

    const newAgents = agents.map(a => {
        if (a.id === agentId) {
            return {
                ...a,
                currentStatus: 'working' as AgentStatus,
                statusMessage: `Working: ${task.title}`
            };
        }
        return a;
    });

    let newMovementOperations = movementOperations;
    let newCommandCounter = commandCounter;
    let movementCommand = undefined;

    const currentStep = task.steps[task.currentStepIndex];
    if (currentStep && currentStep.destinationId && agent.currentLocation !== currentStep.destinationId) {
        const res = createMovementOperation(agentId, task.id, currentStep.destinationId, commandCounter, simulationGeneration, movementOperations);
        newMovementOperations = res.movementOperations;
        newCommandCounter = res.commandCounter;
        movementCommand = res.operation;
    }

    return {
        ok: true,
        value: {
            agents: newAgents,
            tasks: newTasks,
            movementOperations: newMovementOperations,
            commandCounter: newCommandCounter,
            simulationGeneration,
            movementCommand
        }
    };
}

export function blockTask(
    agentId: string,
    reason: string,
    agents: readonly Agent[],
    tasks: readonly Task[],
    movementOperations: Readonly<Record<string, MovementOperation>>,
    commandCounter: number,
    simulationGeneration: number
): DomainResult<SimulationTransition> {
    if (!reason || reason.trim() === '') {
        return { ok: false, code: 'BLOCK_REASON_REQUIRED', message: 'Block reason required.' };
    }

    const validReason = reason.trim();

    const agent = agents.find(a => a.id === agentId);
    if (!agent || !agent.currentTaskId) {
        return { ok: false, code: 'TASK_NOT_FOUND', message: 'Agent has no active task.' };
    }

    const task = tasks.find(t => t.id === agent.currentTaskId);
    if (!task || (task.status !== 'active' && task.status !== 'paused')) {
        return { ok: false, code: 'INVALID_TRANSITION', message: 'Task must be active or paused to block.' };
    }

    const newTasks = tasks.map(t => {
        if (t.id === task.id) {
            return {
                ...t,
                status: 'blocked' as TaskStatus,
                blocker: validReason
            };
        }
        return t;
    });

    const newAgents = agents.map(a => {
        if (a.id === agentId) {
            return {
                ...a,
                currentStatus: 'error' as AgentStatus,
                statusMessage: `Blocked: ${validReason}`,
                currentBlocker: validReason
            };
        }
        return a;
    });

    const newMovementOperations = invalidateMovementOperation(agentId, movementOperations);

    return {
        ok: true,
        value: {
            agents: newAgents,
            tasks: newTasks,
            movementOperations: newMovementOperations,
            commandCounter,
            simulationGeneration
        }
    };
}

export function clearBlocker(
    agentId: string,
    agents: readonly Agent[],
    tasks: readonly Task[],
    movementOperations: Readonly<Record<string, MovementOperation>>,
    commandCounter: number,
    simulationGeneration: number
): DomainResult<SimulationTransition> {
    const agent = agents.find(a => a.id === agentId);
    if (!agent || !agent.currentTaskId) {
        return { ok: false, code: 'TASK_NOT_FOUND', message: 'Agent has no task.' };
    }

    const task = tasks.find(t => t.id === agent.currentTaskId);
    if (!task || task.status !== 'blocked') {
        return { ok: false, code: 'INVALID_TRANSITION', message: 'Task is not blocked.' };
    }

    const newTasks = tasks.map(t => {
        if (t.id === task.id) {
            return {
                ...t,
                status: 'active' as TaskStatus,
                blocker: null
            };
        }
        return t;
    });

    const newAgents = agents.map(a => {
        if (a.id === agentId) {
            return {
                ...a,
                currentStatus: 'working' as AgentStatus,
                statusMessage: `Working: ${task.title}`,
                currentBlocker: null
            };
        }
        return a;
    });

    let newMovementOperations = movementOperations;
    let newCommandCounter = commandCounter;
    let movementCommand = undefined;

    const currentStep = task.steps[task.currentStepIndex];
    if (currentStep && currentStep.destinationId && agent.currentLocation !== currentStep.destinationId) {
        const res = createMovementOperation(agentId, task.id, currentStep.destinationId, commandCounter, simulationGeneration, movementOperations);
        newMovementOperations = res.movementOperations;
        newCommandCounter = res.commandCounter;
        movementCommand = res.operation;
    }

    return {
        ok: true,
        value: {
            agents: newAgents,
            tasks: newTasks,
            movementOperations: newMovementOperations,
            commandCounter: newCommandCounter,
            simulationGeneration,
            movementCommand
        }
    };
}

export function completeTask(
    agentId: string,
    agents: readonly Agent[],
    tasks: readonly Task[],
    movementOperations: Readonly<Record<string, MovementOperation>>,
    commandCounter: number,
    simulationGeneration: number
): DomainResult<SimulationTransition> {
    const agent = agents.find(a => a.id === agentId);
    if (!agent || !agent.currentTaskId) {
        return { ok: false, code: 'TASK_NOT_FOUND', message: 'Agent has no task.' };
    }

    const task = tasks.find(t => t.id === agent.currentTaskId);
    if (!task || task.status !== 'active') {
        return { ok: false, code: 'INVALID_TRANSITION', message: 'Only an active task can be completed.' };
    }

    const newTasks = tasks.map(t => {
        if (t.id === task.id) {
            return {
                ...t,
                status: 'completed' as TaskStatus,
                progress: 100,
                blocker: null
            };
        }
        return t;
    });

    const newAgents = agents.map(a => {
        if (a.id === agentId) {
            return {
                ...a,
                currentStatus: 'idle' as AgentStatus,
                statusMessage: 'Task completed',
                currentTaskId: null,
                currentBlocker: null
            };
        }
        return a;
    });

    const newMovementOperations = invalidateMovementOperation(agentId, movementOperations);

    return {
        ok: true,
        value: {
            agents: newAgents,
            tasks: newTasks,
            movementOperations: newMovementOperations,
            commandCounter,
            simulationGeneration
        }
    };
}

export function failTask(
    agentId: string,
    reason: string,
    agents: readonly Agent[],
    tasks: readonly Task[],
    movementOperations: Readonly<Record<string, MovementOperation>>,
    commandCounter: number,
    simulationGeneration: number
): DomainResult<SimulationTransition> {
    if (!reason || reason.trim() === '') {
        return { ok: false, code: 'FAILURE_REASON_REQUIRED', message: 'Failure reason required.' };
    }

    const validReason = reason.trim();

    const agent = agents.find(a => a.id === agentId);
    if (!agent || !agent.currentTaskId) {
        return { ok: false, code: 'TASK_NOT_FOUND', message: 'Agent has no task.' };
    }

    const task = tasks.find(t => t.id === agent.currentTaskId);
    if (!task || (task.status !== 'active' && task.status !== 'paused' && task.status !== 'blocked')) {
        return { ok: false, code: 'INVALID_TRANSITION', message: 'Task must be active, paused, or blocked to fail.' };
    }

    const newTasks = tasks.map(t => {
        if (t.id === task.id) {
            return {
                ...t,
                status: 'failed' as TaskStatus,
                blocker: validReason
            };
        }
        return t;
    });

    const newAgents = agents.map(a => {
        if (a.id === agentId) {
            return {
                ...a,
                currentStatus: 'error' as AgentStatus,
                statusMessage: `Failed: ${validReason}`,
                currentBlocker: validReason
            };
        }
        return a;
    });

    const newMovementOperations = invalidateMovementOperation(agentId, movementOperations);

    return {
        ok: true,
        value: {
            agents: newAgents,
            tasks: newTasks,
            movementOperations: newMovementOperations,
            commandCounter,
            simulationGeneration
        }
    };
}

export function retryTask(
    agentId: string,
    agents: readonly Agent[],
    tasks: readonly Task[],
    movementOperations: Readonly<Record<string, MovementOperation>>,
    commandCounter: number,
    simulationGeneration: number
): DomainResult<SimulationTransition> {
    const agent = agents.find(a => a.id === agentId);
    if (!agent || !agent.currentTaskId) {
        return { ok: false, code: 'TASK_NOT_FOUND', message: 'Agent has no task.' };
    }

    const task = tasks.find(t => t.id === agent.currentTaskId);
    if (!task || task.status !== 'failed') {
        return { ok: false, code: 'INVALID_TRANSITION', message: 'Task is not failed.' };
    }

    const newTasks = tasks.map(t => {
        if (t.id === task.id) {
            return {
                ...t,
                status: 'queued' as TaskStatus,
                blocker: null,
                progress: 0,
                currentStepIndex: 0
            };
        }
        return t;
    });

    const newAgents = agents.map(a => {
        if (a.id === agentId) {
            return {
                ...a,
                currentStatus: 'idle' as AgentStatus,
                statusMessage: 'Ready for retry',
                currentTaskId: null,
                currentBlocker: null
            };
        }
        return a;
    });

    const newMovementOperations = invalidateMovementOperation(agentId, movementOperations);

    return {
        ok: true,
        value: {
            agents: newAgents,
            tasks: newTasks,
            movementOperations: newMovementOperations,
            commandCounter,
            simulationGeneration
        }
    };
}

export function cancelTask(
    taskId: string,
    agents: readonly Agent[],
    tasks: readonly Task[],
    movementOperations: Readonly<Record<string, MovementOperation>>,
    commandCounter: number,
    simulationGeneration: number
): DomainResult<SimulationTransition> {
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
        return { ok: false, code: 'TASK_NOT_FOUND', message: 'Task not found.' };
    }

    if (task.status === 'completed' || task.status === 'cancelled') {
        return { ok: false, code: 'INVALID_TRANSITION', message: 'Cannot cancel a completed or already cancelled task.' };
    }

    const newTasks = tasks.map(t => {
        if (t.id === taskId) {
            return {
                ...t,
                status: 'cancelled' as TaskStatus,
                blocker: null
            };
        }
        return t;
    });

    let newMovementOperations = movementOperations;
    const newAgents = agents.map(a => {
        if (a.id === task.assignedAgentId && a.currentTaskId === taskId) {
            newMovementOperations = invalidateMovementOperation(a.id, newMovementOperations);
            return {
                ...a,
                currentStatus: 'idle' as AgentStatus,
                statusMessage: 'Task cancelled',
                currentTaskId: null,
                currentBlocker: null
            };
        }
        return a;
    });

    return {
        ok: true,
        value: {
            agents: newAgents,
            tasks: newTasks,
            movementOperations: newMovementOperations,
            commandCounter,
            simulationGeneration
        }
    };
}

export function resetSimulation(agents: readonly Agent[]): SimulationTransition {
    const newAgents = agents.map(agent => {
        const seedAgent = INITIAL_AGENTS.find(a => a.id === agent.id);
        if (seedAgent) {
            return JSON.parse(JSON.stringify(seedAgent));
        }
        return agent;
    });

    const finalAgents = newAgents.filter(a => INITIAL_AGENTS.some(seed => seed.id === a.id));
    const newTasks = JSON.parse(JSON.stringify(INITIAL_TASKS));

    return {
        agents: finalAgents,
        tasks: newTasks,
        movementOperations: {},
        commandCounter: 0,
        simulationGeneration: 0
    };
}
