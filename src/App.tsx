import { useRef, useState, useEffect } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import { ControlPanel } from './components/ControlPanel';
import { INITIAL_AGENTS } from './domain/seed';
import { Agent } from './types';
import { EventBus } from './game/EventBus';
import { validateMovementCommand } from './domain/navigation';
import { handleMovementCommand, handleMovementCompleted, handleResetAll as handleResetAllDomain } from './domain/state';
import { RoomInspector } from './components/RoomInspector';
import { MapEditorPanel } from './components/MapEditorPanel';
import './styles/floor-map.css';

type ViewMode = 'Floor 1 Usable Map' | 'Geometry Editor' | 'Legacy Procedural Prototype';

function App() {
    const phaserRef = useRef<IRefPhaserGame | null>(null);

    // View Switching
    const [viewMode, setViewMode] = useState<ViewMode>('Floor 1 Usable Map');

    // Legacy State
    const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const selectedAgent = agents.find(a => a.id === selectedAgentId) || null;

    const commandIdCounter = useRef(0);
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

    // Scene switching logic
    useEffect(() => {
        if (!phaserRef.current || !phaserRef.current.game) return;
        const game = phaserRef.current.game;

        const scenes = ['OfficeScene', 'FloorOneScene', 'MapEditorScene'];
        scenes.forEach(s => {
            if (game.scene.isActive(s) || game.scene.isSleeping(s) || game.scene.isPaused(s)) {
                game.scene.stop(s);
            }
        });

        if (viewMode === 'Legacy Procedural Prototype') {
            game.scene.start('OfficeScene');
        } else if (viewMode === 'Floor 1 Usable Map') {
            game.scene.start('FloorOneScene');
        } else if (viewMode === 'Geometry Editor') {
            game.scene.start('MapEditorScene');
        }

    }, [viewMode, phaserRef.current?.game]);

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
                <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.7)', padding: '5px', borderRadius: '4px' }}>
                    <select
                        value={viewMode}
                        onChange={(e) => setViewMode(e.target.value as ViewMode)}
                        style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '5px' }}
                    >
                        <option value="Floor 1 Usable Map">Floor 1 Usable Map</option>
                        <option value="Geometry Editor">Geometry Editor</option>
                        <option value="Legacy Procedural Prototype">Legacy Procedural Prototype</option>
                    </select>
                </div>
                <PhaserGame ref={phaserRef} />
            </div>

            <div className="office-control-pane" style={{
                flex: '1',
                minWidth: '300px',
                maxWidth: '400px',
                height: '100%',
                borderLeft: '1px solid #333',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#1a1a1a',
                color: '#eee',
                overflowY: 'auto'
            }}>
                {viewMode === 'Legacy Procedural Prototype' && (
                    <ControlPanel
                        selectedAgent={selectedAgent}
                        agents={agents}
                        onSelectAgent={handleSelectAgent}
                        onSendToLocation={handleSendToLocation}
                        onResetAll={handleResetAll}
                        errorMsg={errorMsg}
                    />
                )}
                {viewMode === 'Floor 1 Usable Map' && (
                    <div style={{ padding: '20px' }}>
                        <h2>Floor 1 Map Controls</h2>
                        <div className="map-control-group">
                            <button className="map-btn" onClick={() => EventBus.emit('react-toggle-debug', true)}>Show Debug Geometry</button>
                            <button className="map-btn" onClick={() => EventBus.emit('react-toggle-debug', false)}>Hide Debug Geometry</button>
                            <br/><br/>
                            <button className="map-btn" onClick={() => EventBus.emit('react-toggle-masks', true)}>Show Foreground Masks</button>
                            <button className="map-btn" onClick={() => EventBus.emit('react-toggle-masks', false)}>Hide Foreground Masks</button>
                            <br/><br/>
                            <button className="map-btn" onClick={() => EventBus.emit('react-reset-character')}>Reset Character</button>
                        </div>
                        <RoomInspector />
                    </div>
                )}
                {viewMode === 'Geometry Editor' && (
                    <div style={{ padding: '20px' }}>
                        <h2>Geometry Editor</h2>
                        <MapEditorPanel />
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
