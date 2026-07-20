import { useRef, useState, useEffect } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import { ControlPanel } from './components/ControlPanel';
import { INITIAL_AGENTS } from './domain/seed';
import { Agent } from './types';
import { EventBus } from './game/EventBus';
import { validateMovementCommand } from './domain/navigation';

function App() {
    const phaserRef = useRef<IRefPhaserGame | null>(null);

    // React is authoritative for agent state
    const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // commandId generation to handle strict cancellation and state tracking
    const commandIdCounter = useRef(0);
    // Track active commands per agent to prevent stale state updates
    const activeCommands = useRef<{ [agentId: string]: number }>({});

    useEffect(() => {
        const handleAgentSelected = (agentId: string) => {
            setSelectedAgentId(agentId);
        };

        const handleMovementCompleted = (data: { agentId: string, locationId: string, commandId: number }) => {
            // Only update if this is the most recent command for this agent (prevents stale updates on reset/re-dispatch)
            if (activeCommands.current[data.agentId] === data.commandId) {
                setAgents(prev => prev.map(a => {
                    if (a.id === data.agentId) {
                        return {
                            ...a,
                            currentStatus: 'idle',
                            currentLocation: data.locationId,
                            targetLocation: null,
                            statusMessage: 'Arrived'
                        };
                    }
                    return a;
                }));
            }
        };

        EventBus.on('agent-selected', handleAgentSelected);
        EventBus.on('movement-completed', handleMovementCompleted);

        return () => {
            EventBus.removeListener('agent-selected', handleAgentSelected);
            EventBus.removeListener('movement-completed', handleMovementCompleted);
        };
    }, []);

    const selectedAgent = agents.find(a => a.id === selectedAgentId) || null;

    const handleSelectAgent = (agentId: string) => {
        setSelectedAgentId(agentId);
        EventBus.emit('react-select-agent', agentId);
    };

    const handleSendToLocation = (agentId: string, locationId: string) => {
        setErrorMsg(null);

        const validation = validateMovementCommand(agentId, locationId);
        if (!validation.valid) {
            setErrorMsg(validation.error || 'Invalid command');
            return;
        }

        const cmdId = ++commandIdCounter.current;
        activeCommands.current[agentId] = cmdId;

        // Authoritative update in React
        setAgents(prev => prev.map(a => {
            if (a.id === agentId) {
                return { ...a, currentStatus: 'moving', targetLocation: locationId, statusMessage: `Moving to ${locationId}` };
            }
            return a;
        }));

        EventBus.emit('react-move-agent', { agentId, locationId, commandId: cmdId });
    };

    const handleResetAll = () => {
        setErrorMsg(null);

        // Invalidate all active commands so no pending tweens complete and overwrite reset
        activeCommands.current = {};

        // Authoritative reset in React
        setAgents(prev => prev.map(a => ({
            ...a,
            currentStatus: 'idle',
            currentLocation: a.homeDesk,
            targetLocation: null,
            statusMessage: 'Reset to home'
        })));

        EventBus.emit('react-reset-all');
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'row',
            width: '100vw',
            height: '100vh',
            overflow: 'hidden',
            backgroundColor: '#111'
        }} id="app-root">

            <div style={{
                flex: '3',
                minWidth: '300px',
                height: '100%',
                position: 'relative'
            }}>
                <PhaserGame ref={phaserRef} />
            </div>

            <div style={{
                flex: '1',
                minWidth: '300px',
                maxWidth: '400px',
                height: '100%',
                borderLeft: '1px solid #333'
            }}>
                <ControlPanel
                    selectedAgent={selectedAgent}
                    agents={agents}
                    onSelectAgent={handleSelectAgent}
                    onSendToLocation={handleSendToLocation}
                    onResetAll={handleResetAll}
                    errorMsg={errorMsg}
                />
            </div>

            <style>{`
                @media (max-width: 768px) {
                    #app-root {
                        flex-direction: column !important;
                        overflow-y: auto !important;
                    }
                    #app-root > div:first-child {
                        height: 50vh !important;
                        flex: none !important;
                    }
                    #app-root > div:last-child {
                        max-width: none !important;
                        border-left: none !important;
                        border-top: 1px solid #333;
                    }
                }
                body, html { margin: 0; padding: 0; }
            `}</style>
        </div>
    );
}

export default App;
