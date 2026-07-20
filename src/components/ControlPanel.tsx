import React, { useState } from 'react';
import { Agent, Task } from '../types';
import { OFFICE_LOCATIONS } from '../domain/seed';

interface ControlPanelProps {
    selectedAgent: Agent | null;
    agents: Agent[];
    tasks: Task[];
    onSelectAgent: (agentId: string) => void;
    onSendToLocation: (agentId: string, locationId: string) => void;
    onResetAll: () => void;
    onStartNextTask: (agentId: string) => void;
    onAdvanceTask: (agentId: string) => void;
    onPauseTask: (agentId: string) => void;
    onResumeTask: (agentId: string) => void;
    onBlockTask: (agentId: string) => void;
    onClearBlocker: (agentId: string) => void;
    onCompleteTask: (agentId: string) => void;
    errorMsg: string | null;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
    selectedAgent,
    agents,
    tasks,
    onSelectAgent,
    onSendToLocation,
    onResetAll,
    onStartNextTask,
    onAdvanceTask,
    onPauseTask,
    onResumeTask,
    onBlockTask,
    onClearBlocker,
    onCompleteTask,
    errorMsg
}) => {
    const occupiableLocations = OFFICE_LOCATIONS.filter(loc => loc.canOccupy);
    const [selectedDestination, setSelectedDestination] = useState<string>('');

    // Find task information for the selected agent
    const activeTask = selectedAgent?.currentTaskId ? tasks.find(t => t.id === selectedAgent.currentTaskId) : null;
    const queuedCount = selectedAgent ? tasks.filter(t => t.assignedAgentId === selectedAgent.id && t.status === 'queued').length : 0;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            padding: '20px',
            backgroundColor: '#1e2124',
            color: '#e0e0e0',
            height: '100%',
            boxSizing: 'border-box',
            fontFamily: 'sans-serif',
            overflowY: 'auto'
        }}>
            <div>
                <h2 style={{ margin: '0 0 5px 0', fontSize: '1.5rem', color: '#fff' }}>Jarvis Agent Ecosystem</h2>
                <div style={{ fontSize: '0.8rem', color: '#ffb300', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Simulation Prototype
                </div>
            </div>

            {errorMsg && (
                <div style={{ backgroundColor: '#f44336', color: '#fff', padding: '10px', borderRadius: '4px', fontSize: '0.9rem' }}>
                    {errorMsg}
                </div>
            )}

            {/* Developer Controls */}
            <div style={{
                backgroundColor: '#282b30',
                padding: '15px',
                borderRadius: '8px',
                border: '1px solid #424549'
            }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#fff' }}>Controls</h3>

                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="agent-select" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Select Agent:</label>
                    <select
                        id="agent-select"
                        value={selectedAgent?.id || ''}
                        onChange={(e) => onSelectAgent(e.target.value)}
                        className="accessible-select"
                        style={{ width: '100%', padding: '8px', backgroundColor: '#36393e', color: '#fff', border: '1px solid #424549', borderRadius: '4px' }}
                    >
                        <option value="" disabled>-- Select an Agent --</option>
                        {agents.map(a => (
                            <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                        ))}
                    </select>
                </div>

                {selectedAgent && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                        <button
                            onClick={() => onSendToLocation(selectedAgent.id, selectedAgent.homeDesk)}
                            className="accessible-button"
                            style={buttonStyle}
                        >
                            Send to Home Desk
                        </button>
                        <button
                            onClick={() => onSendToLocation(selectedAgent.id, 'meeting_room')}
                            className="accessible-button"
                            style={buttonStyle}
                        >
                            Send to Meeting Room
                        </button>
                        <button
                            onClick={() => onSendToLocation(selectedAgent.id, 'project_table')}
                            className="accessible-button"
                            style={buttonStyle}
                        >
                            Send to Project Table
                        </button>

                        <div style={{ marginTop: '5px' }}>
                            <label htmlFor="specific-location-select" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Send to specific location:</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <select
                                    id="specific-location-select"
                                    value={selectedDestination}
                                    onChange={(e) => setSelectedDestination(e.target.value)}
                                    className="accessible-select"
                                    style={{ flex: 1, padding: '8px', backgroundColor: '#36393e', color: '#fff', border: '1px solid #424549', borderRadius: '4px' }}
                                >
                                    <option value="" disabled>-- Location --</option>
                                    {occupiableLocations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.displayName}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => {
                                        if (selectedDestination) {
                                            onSendToLocation(selectedAgent.id, selectedDestination);
                                        }
                                    }}
                                    className="accessible-button"
                                    style={{ ...buttonStyle, flex: '0 0 auto', padding: '8px 15px' }}
                                >
                                    Go
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ borderTop: '1px solid #424549', margin: '15px 0' }}></div>

                <button
                    onClick={onResetAll}
                    className="accessible-button"
                    style={{ ...buttonStyle, backgroundColor: '#d32f2f', color: '#fff', border: 'none' }}
                >
                    Reset All Positions
                </button>
            </div>

            {/* Information Panel */}
            <div style={{
                backgroundColor: '#282b30',
                padding: '15px',
                borderRadius: '8px',
                border: '1px solid #424549',
                flex: 1
            }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#fff' }}>Agent Information</h3>

                {selectedAgent ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.95rem' }}>
                        <InfoRow label="Name" value={selectedAgent.name} />
                        <InfoRow label="Role" value={selectedAgent.role} />
                        <InfoRow label="Department" value={selectedAgent.department} />
                        <InfoRow label="Manager" value={agents.find(a => a.id === selectedAgent.managerId)?.name || 'None'} />
                        <InfoRow label="Status" value={selectedAgent.currentStatus} valueColor={getStatusColor(selectedAgent.currentStatus)} />
                        <InfoRow label="Message" value={selectedAgent.statusMessage} />
                        <InfoRow label="Current Loc" value={OFFICE_LOCATIONS.find(l => l.id === selectedAgent.currentLocation)?.displayName || selectedAgent.currentLocation} />
                        <InfoRow label="Target Loc" value={selectedAgent.targetLocation ? (OFFICE_LOCATIONS.find(l => l.id === selectedAgent.targetLocation)?.displayName || selectedAgent.targetLocation) : 'None'} />
                        <InfoRow label="Type" value={selectedAgent.isTemporary ? 'Temporary' : 'Permanent'} />
                    </div>
                ) : (
                    <div style={{ color: '#888', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                        No agent selected
                    </div>
                )}
            </div>

            {/* Task Information & Simulation Panel */}
            {selectedAgent && (
                <div style={{
                    backgroundColor: '#282b30',
                    padding: '15px',
                    borderRadius: '8px',
                    border: '1px solid #424549',
                    flex: 1
                }}>
                    <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#fff' }}>Task Simulation</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.95rem', marginBottom: '15px' }}>
                        {activeTask ? (
                            <>
                                <InfoRow label="Current Task" value={activeTask.title} valueColor="#ffa726" />
                                <div style={{ color: '#ccc', fontSize: '0.85rem', marginBottom: '5px' }}>{activeTask.description}</div>
                                <InfoRow label="Status" value={activeTask.status} valueColor={getTaskStatusColor(activeTask.status)} />
                                <InfoRow label="Step" value={`${activeTask.currentStepIndex + 1} / ${activeTask.steps.length}`} />
                                <InfoRow label="Progress" value={`${activeTask.progress}%`} />
                                <InfoRow label="Priority" value={activeTask.priority} />
                                <InfoRow label="Blocker" value={activeTask.blocker || 'None'} valueColor={activeTask.blocker ? '#ef5350' : '#fff'} />
                            </>
                        ) : (
                            <div style={{ color: '#aeea00', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>
                                Agent is idle.
                            </div>
                        )}
                        <InfoRow label="Queued Tasks" value={queuedCount.toString()} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {!activeTask && (
                            <button
                                onClick={() => onStartNextTask(selectedAgent.id)}
                                disabled={queuedCount === 0}
                                className="accessible-button"
                                style={{ ...buttonStyle, opacity: queuedCount === 0 ? 0.5 : 1 }}
                            >
                                Start Next Task
                            </button>
                        )}

                        {activeTask && activeTask.status === 'active' && (
                            <>
                                <button onClick={() => onAdvanceTask(selectedAgent.id)} className="accessible-button" style={buttonStyle}>Advance Task</button>
                                <button onClick={() => onPauseTask(selectedAgent.id)} className="accessible-button" style={buttonStyle}>Pause Task</button>
                                <button onClick={() => onBlockTask(selectedAgent.id)} className="accessible-button" style={{ ...buttonStyle, backgroundColor: '#d32f2f', border: 'none' }}>Mark Blocked</button>
                                <button onClick={() => onCompleteTask(selectedAgent.id)} className="accessible-button" style={{ ...buttonStyle, backgroundColor: '#388e3c', border: 'none' }}>Complete Task</button>
                            </>
                        )}

                        {activeTask && activeTask.status === 'paused' && (
                            <>
                                <button onClick={() => onResumeTask(selectedAgent.id)} className="accessible-button" style={buttonStyle}>Resume Task</button>
                                <button onClick={() => onBlockTask(selectedAgent.id)} className="accessible-button" style={{ ...buttonStyle, backgroundColor: '#d32f2f', border: 'none' }}>Mark Blocked</button>
                            </>
                        )}

                        {activeTask && activeTask.status === 'blocked' && (
                            <>
                                <button onClick={() => onClearBlocker(selectedAgent.id)} className="accessible-button" style={buttonStyle}>Clear Blocker</button>
                            </>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                .accessible-button:focus-visible, .accessible-select:focus-visible {
                    outline: 2px solid #64b5f6 !important;
                    outline-offset: 2px;
                }
                .accessible-button, .accessible-select {
                    outline: none;
                }
            `}</style>
        </div>
    );
};

const InfoRow = ({ label, value, valueColor = '#fff' }: { label: string, value: string, valueColor?: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #36393e', paddingBottom: '4px' }}>
        <span style={{ color: '#aaa' }}>{label}:</span>
        <span style={{ color: valueColor, fontWeight: '500', textAlign: 'right' }}>{value}</span>
    </div>
);

function getStatusColor(status: string) {
    switch (status) {
        case 'idle': return '#aeea00';
        case 'moving': return '#29b6f6';
        case 'working': return '#ffa726';
        case 'error': return '#ef5350';
        case 'paused': return '#9e9e9e';
        default: return '#fff';
    }
}

function getTaskStatusColor(status: string) {
    switch (status) {
        case 'queued': return '#fff';
        case 'active': return '#ffa726';
        case 'paused': return '#9e9e9e';
        case 'completed': return '#aeea00';
        case 'blocked': return '#ef5350';
        default: return '#fff';
    }
}

const buttonStyle: React.CSSProperties = {
    padding: '10px 15px',
    backgroundColor: '#424549',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'background-color 0.2s',
};
