import { useRef, useState, useEffect } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import { ControlPanel } from './components/ControlPanel';
import { HUD } from './components/HUD';
import { EventBus } from './game/EventBus';

function App() {
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        const handleAgentSelected = (agentId: string) => {
            setSelectedAgentId(agentId);
        };
        const handleMovementCompletedEvent = () => {
             // In a full implementation we'd update state here.
        };

        EventBus.on('agent-selected', handleAgentSelected);
        EventBus.on('movement-completed', handleMovementCompletedEvent);

        return () => {
            EventBus.removeListener('agent-selected', handleAgentSelected);
            EventBus.removeListener('movement-completed', handleMovementCompletedEvent);
        };
    }, []);

    const handleSelectAgent = (agentId: string) => {
        setSelectedAgentId(agentId);
        EventBus.emit('react-select-agent', agentId);
    };

    const handleSendToLocation = (agentId: string, locationId: string) => {
        setErrorMsg(null);
        // We emit to Phaser which has the Route Engine demo mock currently
        EventBus.emit('react-move-agent', { agentId, locationId });
    };

    return (
        <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#111' }} id="app-root">
            <div className="office-canvas-pane" style={{ flex: '3', position: 'relative' }}>
                <HUD />
                <PhaserGame ref={phaserRef} />
            </div>

            <div className="office-control-pane" style={{ flex: '1', minWidth: '300px', borderLeft: '1px solid #333' }}>
                <ControlPanel
                    selectedAgentId={selectedAgentId}
                    onSelectAgent={handleSelectAgent}
                    onSendToLocation={handleSendToLocation}
                    errorMsg={errorMsg}
                />
            </div>
        </div>
    );
}
export default App;
