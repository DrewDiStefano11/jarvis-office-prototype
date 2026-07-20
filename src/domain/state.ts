import { Agent, AgentStatus } from '../types';

export function handleMovementCommand(
    agentId: string,
    locationId: string,
    currentCommandCounter: number,
    agents: Agent[],
    activeCommands: Record<string, number>
) {
    const cmdId = currentCommandCounter + 1;
    const newActiveCommands = {
        ...activeCommands,
        [agentId]: cmdId
    };

    const newAgents = agents.map(a => {
        if (a.id === agentId) {
            return {
                ...a,
                currentStatus: 'moving' as AgentStatus,
                targetLocation: locationId,
                statusMessage: `Moving to ${locationId}`
            };
        }
        return a;
    });

    return {
        nextCommandId: cmdId,
        newAgents,
        newActiveCommands
    };
}

export function handleMovementCompleted(
    agentId: string,
    locationId: string,
    commandId: number,
    agents: Agent[],
    activeCommands: Record<string, number>
) {
    // Stale completion check
    if (activeCommands[agentId] !== commandId) {
        return agents; // No state change
    }

    return agents.map(a => {
        if (a.id === agentId) {
            // Restore previous correct status instead of blindly forcing idle if they have a task state
            let nextStatus: AgentStatus = 'idle';
            let nextMessage = 'Arrived';

            if (a.currentBlocker) {
                nextStatus = 'error';
                nextMessage = `Blocked: ${a.currentBlocker}`;
            } else if (a.currentTaskId) {
                // If we don't have direct access to the Tasks array here, we can infer from currentBlocker and taskId
                // If it was working/paused, we restore a logical default. App.tsx passes tasks down eventually,
                // but for simple movement completion, let's look at the prior agent state.
                // We'll preserve working or paused.
                nextStatus = a.currentStatus === 'paused' ? 'paused' : 'working';
                nextMessage = a.statusMessage.startsWith('Moving') ? 'Working on task' : a.statusMessage;
            }

            return {
                ...a,
                currentStatus: nextStatus,
                currentLocation: locationId,
                targetLocation: null,
                statusMessage: nextMessage
            };
        }
        return a;
    });
}

export function handleResetAll(agents: Agent[]) {
    return {
        newAgents: agents.map(a => ({
            ...a,
            currentStatus: 'idle' as AgentStatus,
            currentLocation: a.homeDesk,
            targetLocation: null,
            statusMessage: 'Reset to home'
        })),
        newActiveCommands: {} as Record<string, number>
    };
}
