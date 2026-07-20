import { Agent, AgentStatus, Task, TaskStatus } from '../types';
import { INITIAL_AGENTS, INITIAL_TASKS } from './seed';

export function startNextTask(agentId: string, agents: Agent[], tasks: Task[]): { newAgents: Agent[], newTasks: Task[], error?: string } {
    const queuedTask = tasks.find(t => t.assignedAgentId === agentId && t.status === 'queued');
    if (!queuedTask) {
        return { newAgents: agents, newTasks: tasks, error: 'No queued tasks found for this agent.' };
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

    return { newAgents, newTasks };
}

export function advanceTask(agentId: string, agents: Agent[], tasks: Task[]): { newAgents: Agent[], newTasks: Task[], error?: string } {
    const agent = agents.find(a => a.id === agentId);
    if (!agent || !agent.currentTaskId) {
        return { newAgents: agents, newTasks: tasks, error: 'Agent has no active task.' };
    }

    const task = tasks.find(t => t.id === agent.currentTaskId);
    if (!task || task.status !== 'active') {
        return { newAgents: agents, newTasks: tasks, error: 'Task is not active.' };
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

    return { newAgents: agents, newTasks };
}

export function pauseTask(agentId: string, agents: Agent[], tasks: Task[]): { newAgents: Agent[], newTasks: Task[], error?: string } {
    const agent = agents.find(a => a.id === agentId);
    if (!agent || !agent.currentTaskId) {
        return { newAgents: agents, newTasks: tasks, error: 'Agent has no active task.' };
    }

    const task = tasks.find(t => t.id === agent.currentTaskId);
    if (!task || task.status !== 'active') {
        return { newAgents: agents, newTasks: tasks, error: 'Only active tasks can be paused.' };
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

    return { newAgents, newTasks };
}

export function resumeTask(agentId: string, agents: Agent[], tasks: Task[]): { newAgents: Agent[], newTasks: Task[], error?: string } {
    const agent = agents.find(a => a.id === agentId);
    if (!agent || !agent.currentTaskId) {
        return { newAgents: agents, newTasks: tasks, error: 'Agent has no paused task.' };
    }

    const task = tasks.find(t => t.id === agent.currentTaskId);
    if (!task || task.status !== 'paused') {
        return { newAgents: agents, newTasks: tasks, error: 'Task is not paused.' };
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

    return { newAgents, newTasks };
}

export function blockTask(agentId: string, reason: string, agents: Agent[], tasks: Task[]): { newAgents: Agent[], newTasks: Task[], error?: string } {
    const agent = agents.find(a => a.id === agentId);
    if (!agent || !agent.currentTaskId) {
        return { newAgents: agents, newTasks: tasks, error: 'Agent has no active task.' };
    }

    const task = tasks.find(t => t.id === agent.currentTaskId);
    if (!task || (task.status !== 'active' && task.status !== 'paused')) {
        return { newAgents: agents, newTasks: tasks, error: 'Task must be active or paused to block.' };
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

    return { newAgents, newTasks };
}

export function clearBlocker(agentId: string, agents: Agent[], tasks: Task[]): { newAgents: Agent[], newTasks: Task[], error?: string } {
    const agent = agents.find(a => a.id === agentId);
    if (!agent || !agent.currentTaskId) {
        return { newAgents: agents, newTasks: tasks, error: 'Agent has no task.' };
    }

    const task = tasks.find(t => t.id === agent.currentTaskId);
    if (!task || task.status !== 'blocked') {
        return { newAgents: agents, newTasks: tasks, error: 'Task is not blocked.' };
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

    return { newAgents, newTasks };
}

export function completeTask(agentId: string, agents: Agent[], tasks: Task[]): { newAgents: Agent[], newTasks: Task[], error?: string } {
    const agent = agents.find(a => a.id === agentId);
    if (!agent || !agent.currentTaskId) {
        return { newAgents: agents, newTasks: tasks, error: 'Agent has no task.' };
    }

    const task = tasks.find(t => t.id === agent.currentTaskId);
    if (!task || (task.status !== 'active' && task.status !== 'paused' && task.status !== 'blocked')) {
        return { newAgents: agents, newTasks: tasks, error: 'Cannot complete a queued or already completed task.' };
    }

    const newTasks = tasks.map(t => {
        if (t.id === task.id) {
            return {
                ...t,
                status: 'completed' as TaskStatus,
                progress: 100,
                completedAt: Date.now(),
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

    return { newAgents, newTasks };
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
