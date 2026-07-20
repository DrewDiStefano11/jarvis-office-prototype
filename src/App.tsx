import { useRef, useState, useEffect } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import { ControlPanel } from './components/ControlPanel';
import { INITIAL_AGENTS } from './domain/seed';
import { Agent } from './types';
import { EventBus } from './game/EventBus';

function App() {
    const phaserRef = useRef<IRefPhaserGame | null>(null);

    // React state for agents
    const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

    // Listen to events from Phaser
    useEffect(() => {
        // When an agent is clicked in Phaser, update selection in React
        EventBus.on('agent-selected', (agentId: string) => {
            setSelectedAgentId(agentId);
        });

        // When an agent's state updates in Phaser (e.g. movement, status change)
        EventBus.on('agent-updated', (updatedAgent: Agent) => {
            setAgents(prev => prev.map(a => a.id === updatedAgent.id ? updatedAgent : a));
        });

        return () => {
            EventBus.removeListener('agent-selected');
            EventBus.removeListener('agent-updated');
        };
    }, []);

    const selectedAgent = agents.find(a => a.id === selectedAgentId) || null;

    const handleSelectAgent = (agentId: string) => {
        setSelectedAgentId(agentId);
        // Tell Phaser to select this agent visually
        EventBus.emit('react-select-agent', agentId);
    };

    const handleSendToLocation = (agentId: string, locationId: string) => {
        // Tell Phaser to initiate movement
        EventBus.emit('react-move-agent', { agentId, locationId });

        // Optimistically update React state (optional, Phaser will emit agent-updated anyway)
        setAgents(prev => prev.map(a => {
            if (a.id === agentId) {
                return { ...a, currentStatus: 'moving', targetLocation: locationId, statusMessage: `Moving to ${locationId}` };
            }
            return a;
        }));
    };

    const handleResetAll = () => {
        EventBus.emit('react-reset-all');
        setSelectedAgentId(null);
        // Phaser will handle resetting the logical state and emit updates
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

            {/* Left side: Phaser Game (75% width on desktop) */}
            <div style={{
                flex: '3',
                minWidth: '300px',
                height: '100%',
                position: 'relative'
            }}>
                <PhaserGame ref={phaserRef} />
            </div>

            {/* Right side: React Controls (25% width on desktop) */}
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
                />
            </div>

            {/* Media query handling for mobile layout could be added via standard CSS if needed,
                but flex-wrap or standard react responsive patterns would apply here.
                For simplicity, using inline styles with fixed flex values. */}
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
