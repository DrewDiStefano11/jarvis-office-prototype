import { Agent, AgentStatus } from '../types';

export function handleMovementCommand(
    agentId: string,
    locationId: string,
    currentCommandCounter: number,
    agents: Agent[],
    activeCommands: Record<string, number>
) {
    const cmdId = currentCommandCounter + 1;
    activeCommands[agentId] = cmdId;

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
        newActiveCommands: activeCommands
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
            return {
                ...a,
                currentStatus: 'idle' as AgentStatus,
                currentLocation: locationId,
                targetLocation: null,
                statusMessage: 'Arrived'
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
