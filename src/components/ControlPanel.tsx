import React, { useEffect, useState } from 'react';
import { floor1PlaceholderRoster } from '../domain/agents/placeholderRoster';
import { floor1RouteNodes } from '../domain/floors/floor-1/routes';
import { globalBuildingRegistry } from '../domain/building/registry';
import { createFloorId } from '../types/ids';
import { EventBus } from '../game/EventBus';

interface ControlPanelProps {
    selectedAgentId: string | null;
    onSelectAgent: (id: string) => void;
    onSendToLocation: (agentId: string, locationId: string) => void;
    errorMsg: string | null;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ selectedAgentId, onSelectAgent, onSendToLocation, errorMsg }) => {
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const selectedAgent = floor1PlaceholderRoster.find(a => a.id === selectedAgentId);

    useEffect(() => {
        const handleRoomSelection = (roomId: string) => setSelectedRoomId(roomId);
        EventBus.on('room-selected', handleRoomSelection);
        return () => { EventBus.removeListener('room-selected', handleRoomSelection); };
    }, []);

    const floorData = globalBuildingRegistry.getFloor(createFloorId('floor-1'));
    const selectedRoom = floorData?.rooms.find(r => r.id === selectedRoomId);

    return (
        <div style={{ padding: '20px', color: '#eee', fontFamily: 'sans-serif', height: '100%', overflowY: 'auto' }}>
            <h2>Control Panel</h2>

            {/* AGENT SELECTION */}
            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px' }}>Select Agent:</label>
                <select
                    value={selectedAgentId || ''}
                    onChange={e => onSelectAgent(e.target.value)}
                    style={{ width: '100%', padding: '8px', background: '#333', color: '#fff', border: '1px solid #555' }}
                >
                    <option value="">-- None Selected --</option>
                    {floor1PlaceholderRoster.map(a => (
                        <option key={a.id} value={a.id}>{a.placeholderName} ({a.placeholderRole})</option>
                    ))}
                </select>
            </div>

            {selectedAgent && (
                <div style={{ background: '#222', padding: '15px', borderRadius: '4px', marginBottom: '20px', border: '1px solid #444' }}>
                    <h3 style={{ marginTop: 0 }}>Agent Details</h3>
                    <p><strong>Name:</strong> {selectedAgent.placeholderName}</p>
                    <p><strong>Role:</strong> {selectedAgent.placeholderRole}</p>
                    <p><strong>Dept:</strong> {selectedAgent.departmentId?.split('.').pop()}</p>
                    <p><strong>Workspace:</strong> {selectedAgent.assignedWorkspaceId?.split('.').pop()}</p>
                    <p><strong>Access:</strong> {selectedAgent.accessPermissions}</p>
                    <p><strong>State:</strong> {selectedAgent.visualState}</p>
                </div>
            )}

            {/* ROOM SELECTION (NEW) */}
            {selectedRoom && (
                <div style={{ background: '#2a2222', padding: '15px', borderRadius: '4px', marginBottom: '20px', border: '1px solid #544' }}>
                    <h3 style={{ marginTop: 0, color: '#fca' }}>Room Details</h3>
                    <p><strong>Name:</strong> {selectedRoom.name}</p>
                    <p><strong>Type:</strong> {selectedRoom.roomType}</p>
                    <p><strong>Dept:</strong> {selectedRoom.departmentId?.split('.').pop() || 'None'}</p>
                    <p><strong>Access Required:</strong> {selectedRoom.accessLevel}</p>
                    <p><strong>Capacity:</strong> {selectedRoom.capacity}</p>
                </div>
            )}

            {errorMsg && <div style={{ color: '#ff6b6b', marginBottom: '15px', padding: '10px', background: 'rgba(255,0,0,0.1)', border: '1px solid #ff6b6b' }}>{errorMsg}</div>}

            {selectedAgent && (
                <div>
                    <h3 style={{ marginBottom: '10px' }}>Dispatch (Route Testing)</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {floor1RouteNodes.filter(n => n.nodeType === 'destination').map(dest => (
                            <button
                                key={dest.id}
                                onClick={() => onSendToLocation(selectedAgent.id, dest.id)}
                                style={{
                                    padding: '10px',
                                    background: '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    textAlign: 'left'
                                }}
                            >
                                Route to: {dest.id.split('.').pop()}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
