import { useEffect, useRef, useState } from 'react';
import { IRefPhaserGame, PhaserGame } from '../PhaserGame';
import { INITIAL_AGENTS } from '../domain/seed';
import { validateMovementCommand } from '../domain/navigation';
import {
    handleMovementCommand,
    handleMovementCompleted,
    handleResetAll as handleResetAllDomain,
} from '../domain/state';
import { EventBus } from '../game/EventBus';
import { Agent } from '../types';
import { ControlPanel } from './ControlPanel';

export function LegacyAgentSimulation() {
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const commandIdCounter = useRef(0);
    const activeCommands = useRef<Record<string, number>>({});

    useEffect(() => {
        const handleAgentSelected = (agentId: string) => setSelectedAgentId(agentId);
        const handleMovementCompletedEvent = (data: { agentId: string; locationId: string; commandId: number }) => {
            setAgents(previous =>
                handleMovementCompleted(data.agentId, data.locationId, data.commandId, previous, activeCommands.current));
        };
        EventBus.on('agent-selected', handleAgentSelected);
        EventBus.on('movement-completed', handleMovementCompletedEvent);
        return () => {
            EventBus.removeListener('agent-selected', handleAgentSelected);
            EventBus.removeListener('movement-completed', handleMovementCompletedEvent);
        };
    }, []);

    const selectedAgent = agents.find(agent => agent.id === selectedAgentId) ?? null;

    const selectAgent = (agentId: string) => {
        setSelectedAgentId(agentId);
        EventBus.emit('react-select-agent', agentId);
    };

    const sendToLocation = (agentId: string, locationId: string) => {
        setErrorMsg(null);
        const validation = validateMovementCommand(agentId, locationId);
        if (!validation.valid) {
            setErrorMsg(validation.error ?? 'Invalid command');
            return;
        }
        setAgents(previous => {
            const result = handleMovementCommand(
                agentId,
                locationId,
                commandIdCounter.current,
                previous,
                activeCommands.current,
            );
            commandIdCounter.current = result.nextCommandId;
            activeCommands.current = result.newActiveCommands;
            EventBus.emit('react-move-agent', { agentId, locationId, commandId: result.nextCommandId });
            return result.newAgents;
        });
    };

    const resetAll = () => {
        setErrorMsg(null);
        setAgents(previous => {
            const result = handleResetAllDomain(previous);
            activeCommands.current = result.newActiveCommands;
            return result.newAgents;
        });
        EventBus.emit('react-reset-all');
    };

    return (
        <section className="legacy-simulation" aria-label="Legacy agent simulation">
            <div className="legacy-simulation__canvas">
                <PhaserGame ref={phaserRef} />
            </div>
            <div className="legacy-simulation__controls">
                <ControlPanel
                    selectedAgent={selectedAgent}
                    agents={agents}
                    onSelectAgent={selectAgent}
                    onSendToLocation={sendToLocation}
                    onResetAll={resetAll}
                    errorMsg={errorMsg}
                />
            </div>
        </section>
    );
}
