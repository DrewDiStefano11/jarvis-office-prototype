import { Agent, AgentStatus, Task, TaskStatus, TaskTransitionResult } from '../types';
import { INITIAL_AGENTS, INITIAL_TASKS } from './seed';
import { getLocationById } from './navigation';

export function startNextTask(agentId: string, agents: Agent[], tasks: Task[]): TaskTransitionResult {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) {
        return { success: false, error: 'Unknown agent.' };
    }

    if (agent.currentTaskId) {
        return { success: false, error: 'Agent already has an active task.' };
    }

    if (agent.currentStatus !== 'idle' && agent.currentStatus !== 'moving') {
        return { success: false, error: 'Agent must be idle or moving to start a task.' };
    }

    // Stable seed order (first queued task for the agent)
    const queuedTask = tasks.find(t => t.assignedAgentId === agentId && t.status === 'queued');
    if (!queuedTask) {
        return { success: false, error: 'No queued tasks found for this agent.' };
    }

    const newTasks = tasks.map(t => {
        if (t.id === queuedTask.id) {
            return {
                ...t,
                status: 'active' as TaskStatus,
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
                currentStatus: 'working' as AgentStatus,
                currentTaskId: queuedTask.id,
                statusMessage: `Working: ${queuedTask.title}`
            };
        }
        return a;
    });

    return { success: true, newAgents, newTasks };
}

export function advanceTask(agentId: string, agents: Agent[], tasks: Task[]): TaskTransitionResult {
    const agent = agents.find(a => a.id === agentId);
    if (!agent || !agent.currentTaskId) {
        return { success: false, error: 'Agent has no active task.' };
    }

    const task = tasks.find(t => t.id === agent.currentTaskId);
    if (!task || task.status !== 'active') {
        return { success: false, error: 'Task is not active.' };
    }

    const currentStep = task.steps[task.currentStepIndex];
    if (currentStep && currentStep.destinationId) {
        const dest = getLocationById(currentStep.destinationId);
        if (!dest || !dest.canOccupy) {
            return { success: false, error: `Invalid destination: ${currentStep.destinationId}` };
        }
    }

    const nextStepIndex = task.currentStepIndex + 1;

    // Check if task is completing on this advance
    if (nextStepIndex >= task.steps.length) {
        return completeTask(agentId, agents, tasks);
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

    return { success: true, newAgents: agents, newTasks };
}

export function pauseTask(agentId: string, agents: Agent[], tasks: Task[]): TaskTransitionResult {
    const agent = agents.find(a => a.id === agentId);
    if (!agent || !agent.currentTaskId) {
        return { success: false, error: 'Agent has no active task.' };
    }

    const task = tasks.find(t => t.id === agent.currentTaskId);
    if (!task || task.status !== 'active') {
        return { success: false, error: 'Only active tasks can be paused.' };
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

    return { success: true, newAgents, newTasks };
}

export function resumeTask(agentId: string, agents: Agent[], tasks: Task[]): TaskTransitionResult {
    const agent = agents.find(a => a.id === agentId);
    if (!agent || !agent.currentTaskId) {
        return { success: false, error: 'Agent has no paused task.' };
    }

    const task = tasks.find(t => t.id === agent.currentTaskId);
    if (!task || task.status !== 'paused') {
        return { success: false, error: 'Task is not paused.' };
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

    return { success: true, newAgents, newTasks };
}

export function blockTask(agentId: string, reason: string, agents: Agent[], tasks: Task[]): TaskTransitionResult {
    const agent = agents.find(a => a.id === agentId);
    if (!agent || !agent.currentTaskId) {
        return { success: false, error: 'Agent has no active task.' };
    }

    const task = tasks.find(t => t.id === agent.currentTaskId);
    if (!task || (task.status !== 'active' && task.status !== 'paused')) {
        return { success: false, error: 'Task must be active or paused to block.' };
    }

    const newTasks = tasks.map(t => {
        if (t.id === task.id) {
            return {
                ...t,
                status: 'blocked' as TaskStatus,
                blocker: reason
            };
        }
        return t;
    });

    const newAgents = agents.map(a => {
        if (a.id === agentId) {
            return {
                ...a,
                currentStatus: 'error' as AgentStatus,
                statusMessage: `Blocked: ${reason}`,
                currentBlocker: reason
            };
        }
        return a;
    });

    return { success: true, newAgents, newTasks };
}

export function clearBlocker(agentId: string, agents: Agent[], tasks: Task[]): TaskTransitionResult {
    const agent = agents.find(a => a.id === agentId);
    if (!agent || !agent.currentTaskId) {
        return { success: false, error: 'Agent has no task.' };
    }

    const task = tasks.find(t => t.id === agent.currentTaskId);
    if (!task || task.status !== 'blocked') {
        return { success: false, error: 'Task is not blocked.' };
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

    return { success: true, newAgents, newTasks };
}

export function completeTask(agentId: string, agents: Agent[], tasks: Task[]): TaskTransitionResult {
    const agent = agents.find(a => a.id === agentId);
    if (!agent || !agent.currentTaskId) {
        return { success: false, error: 'Agent has no task.' };
    }

    const task = tasks.find(t => t.id === agent.currentTaskId);
    if (!task || task.status !== 'active') {
        return { success: false, error: 'Only an active task can be completed.' };
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

    return { success: true, newAgents, newTasks };
}

export function failTask(agentId: string, reason: string, agents: Agent[], tasks: Task[]): TaskTransitionResult {
    const agent = agents.find(a => a.id === agentId);
    if (!agent || !agent.currentTaskId) {
        return { success: false, error: 'Agent has no task.' };
    }

    const task = tasks.find(t => t.id === agent.currentTaskId);
    if (!task || (task.status !== 'active' && task.status !== 'paused' && task.status !== 'blocked')) {
        return { success: false, error: 'Task must be active, paused, or blocked to fail.' };
    }

    const newTasks = tasks.map(t => {
        if (t.id === task.id) {
            return {
                ...t,
                status: 'failed' as TaskStatus,
                blocker: reason
            };
        }
        return t;
    });

    const newAgents = agents.map(a => {
        if (a.id === agentId) {
            return {
                ...a,
                currentStatus: 'error' as AgentStatus,
                statusMessage: `Failed: ${reason}`,
                currentBlocker: reason
            };
        }
        return a;
    });

    return { success: true, newAgents, newTasks };
}

export function retryTask(agentId: string, agents: Agent[], tasks: Task[]): TaskTransitionResult {
    const agent = agents.find(a => a.id === agentId);
    if (!agent || !agent.currentTaskId) {
        return { success: false, error: 'Agent has no task.' };
    }

    const task = tasks.find(t => t.id === agent.currentTaskId);
    if (!task || task.status !== 'failed') {
        return { success: false, error: 'Task is not failed.' };
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

    return { success: true, newAgents, newTasks };
}

export function cancelTask(taskId: string, agents: Agent[], tasks: Task[]): TaskTransitionResult {
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
        return { success: false, error: 'Task not found.' };
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

    const newAgents = agents.map(a => {
        if (a.id === task.assignedAgentId && a.currentTaskId === taskId) {
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

    return { success: true, newAgents, newTasks };
}

export function resetSimulation(agents: Agent[]): { newAgents: Agent[], newTasks: Task[] } {
    // We deep clone INITIAL_AGENTS to restore deterministic seed state
    // but preserve the 'id's.
    const newAgents = agents.map(agent => {
        const seedAgent = INITIAL_AGENTS.find(a => a.id === agent.id);
        if (seedAgent) {
            return { ...seedAgent };
        }
        return agent;
    });

    // Deep clone INITIAL_TASKS to restore deterministic seed state
    const newTasks = INITIAL_TASKS.map(task => ({ ...task, steps: [...task.steps] }));

    return { newAgents, newTasks };
}
