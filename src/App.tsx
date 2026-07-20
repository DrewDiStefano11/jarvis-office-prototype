import { useRef, useState, useEffect } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import { ControlPanel } from './components/ControlPanel';
import { INITIAL_AGENTS } from './domain/seed';
import { Agent } from './types';
import { EventBus } from './game/EventBus';
import { validateMovementCommand } from './domain/navigation';
import { handleMovementCommand, handleMovementCompleted, handleResetAll as handleResetAllDomain } from './domain/state';

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

        const handleMovementCompletedEvent = (data: { agentId: string, locationId: string, commandId: number }) => {
            setAgents(prev => handleMovementCompleted(data.agentId, data.locationId, data.commandId, prev, activeCommands.current));
        };

        EventBus.on('agent-selected', handleAgentSelected);
        EventBus.on('movement-completed', handleMovementCompletedEvent);

        return () => {
            EventBus.removeListener('agent-selected', handleAgentSelected);
            EventBus.removeListener('movement-completed', handleMovementCompletedEvent);
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

        setAgents(prev => {
            const result = handleMovementCommand(agentId, locationId, commandIdCounter.current, prev, activeCommands.current);
            commandIdCounter.current = result.nextCommandId;
            activeCommands.current = result.newActiveCommands;

            EventBus.emit('react-move-agent', { agentId, locationId, commandId: result.nextCommandId });
            return result.newAgents;
        });
    };

    const handleResetAll = () => {
        setErrorMsg(null);

        setAgents(prev => {
            const result = handleResetAllDomain(prev);
            activeCommands.current = result.newActiveCommands;
            return result.newAgents;
        });

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

            <div className="office-canvas-pane" style={{
                flex: '3',
                minWidth: '300px',
                height: '100%',
                position: 'relative'
            }}>
                <PhaserGame ref={phaserRef} />
            </div>

            <div className="office-control-pane" style={{
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
                    .office-canvas-pane {
                        height: 50vh !important;
                        flex: none !important;
                    }
                    .office-control-pane {
                        max-width: none !important;
                        width: 100% !important;
                        border-left: none !important;
                        border-top: 1px solid #333;
                    }
                }
                body, html { margin: 0; padding: 0; overflow-x: hidden; }
            `}</style>
        </div>
    );
}

export default App;
