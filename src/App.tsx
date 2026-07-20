import { useRef, useState, useEffect } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import { ControlPanel } from './components/ControlPanel';
import { INITIAL_AGENTS, INITIAL_TASKS } from './domain/seed';
import { Agent, Task } from './types';
import { EventBus } from './game/EventBus';
import { validateMovementCommand } from './domain/navigation';
import { handleMovementCommand, handleMovementCompleted, handleResetAll as handleResetAllDomain } from './domain/state';
import { advanceTask, blockTask, clearBlocker, completeTask, pauseTask, resetSimulation, resumeTask, startNextTask, failTask, retryTask, cancelTask } from './domain/task';

function App() {
    const phaserRef = useRef<IRefPhaserGame | null>(null);

    // React is authoritative for agent state
    const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
    const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
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

    // Sync state to Phaser whenever agents or tasks change
    useEffect(() => {
        EventBus.emit('sync-state', { agents, tasks });
    }, [agents, tasks]);

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

        // First apply movement reset (which handles positioning and command invalidation)
        const domainResult = handleResetAllDomain(agents);
        activeCommands.current = domainResult.newActiveCommands;

        // Then apply task reset completely pure of previous setAgents
        const resetResult = resetSimulation(domainResult.newAgents);

        setAgents(resetResult.newAgents);
        setTasks(resetResult.newTasks);

        EventBus.emit('react-reset-all');
    };

    // Task Controls
    const handleStartNextTask = (agentId: string) => {
        setErrorMsg(null);
        const result = startNextTask(agentId, agents, tasks);
        if (!result.success) {
            setErrorMsg(result.error);
            return;
        }

        let newAgents = result.newAgents;

        // If the step has a destination, issue a movement command immediately.
        const task = tasks.find(t => t.assignedAgentId === agentId && t.status === 'active');
        if (task) {
             const nextStepIndex = task.currentStepIndex + 1;
             const step = task.steps[nextStepIndex];
             if (step && step.destinationId) {
                  const moveResult = handleMovementCommand(agentId, step.destinationId, commandIdCounter.current, newAgents, activeCommands.current);
                  commandIdCounter.current = moveResult.nextCommandId;
                  activeCommands.current = moveResult.newActiveCommands;
                  newAgents = moveResult.newAgents;
                  EventBus.emit('react-move-agent', { agentId, locationId: step.destinationId, commandId: moveResult.nextCommandId });
             }
        }

        setAgents(newAgents);
        setTasks(result.newTasks);
    };

    const handleAdvanceTask = (agentId: string) => {
        setErrorMsg(null);
        const result = advanceTask(agentId, agents, tasks);
        if (!result.success) {
            setErrorMsg(result.error);
            return;
        }

        // Invalidate current movement command upon failing
        activeCommands.current = { ...activeCommands.current, [agentId]: commandIdCounter.current + 1 };
        commandIdCounter.current++;

        setAgents(result.newAgents);
        setTasks(result.newTasks);
    };

    const handlePauseTask = (agentId: string) => {
        setErrorMsg(null);
        const result = pauseTask(agentId, agents, tasks);
        if (!result.success) {
            setErrorMsg(result.error);
            return;
        }

        // Find assigned agent to invalidate their movement commands
        activeCommands.current = { ...activeCommands.current, [agentId]: commandIdCounter.current + 1 };
        commandIdCounter.current++;

        setAgents(result.newAgents);
        setTasks(result.newTasks);
    };

    const handleResumeTask = (agentId: string) => {
        setErrorMsg(null);
        const result = resumeTask(agentId, agents, tasks);
        if (!result.success) {
            setErrorMsg(result.error);
            return;
        }

        // Find assigned agent to invalidate their movement commands
        activeCommands.current = { ...activeCommands.current, [agentId]: commandIdCounter.current + 1 };
        commandIdCounter.current++;

        setAgents(result.newAgents);
        setTasks(result.newTasks);
    };

    const handleBlockTask = (agentId: string) => {
        setErrorMsg(null);
        const result = blockTask(agentId, "Blocked by user", agents, tasks);
        if (!result.success) {
            setErrorMsg(result.error);
            return;
        }
        setAgents(result.newAgents);
        setTasks(result.newTasks);
    };

    const handleClearBlocker = (agentId: string) => {
        setErrorMsg(null);
        const result = clearBlocker(agentId, agents, tasks);
        if (!result.success) {
            setErrorMsg(result.error);
            return;
        }
        setAgents(result.newAgents);
        setTasks(result.newTasks);
    };

    const handleCompleteTask = (agentId: string) => {
        setErrorMsg(null);
        const result = completeTask(agentId, agents, tasks);
        if (!result.success) {
            setErrorMsg(result.error);
            return;
        }
        setAgents(result.newAgents);
        setTasks(result.newTasks);
    };

    const handleFailTask = (agentId: string) => {
        setErrorMsg(null);
        const result = failTask(agentId, "Failed by user", agents, tasks);
        if (!result.success) {
            setErrorMsg(result.error);
            return;
        }
        setAgents(result.newAgents);
        setTasks(result.newTasks);
    };

    const handleRetryTask = (agentId: string) => {
        setErrorMsg(null);
        const result = retryTask(agentId, agents, tasks);
        if (!result.success) {
            setErrorMsg(result.error);
            return;
        }
        setAgents(result.newAgents);
        setTasks(result.newTasks);
    };

    const handleCancelTask = (taskId: string) => {
        setErrorMsg(null);
        const result = cancelTask(taskId, agents, tasks);
        if (!result.success) {
            setErrorMsg(result.error);
            return;
        }
        setAgents(result.newAgents);
        setTasks(result.newTasks);
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
                    tasks={tasks}
                    onSelectAgent={handleSelectAgent}
                    onSendToLocation={handleSendToLocation}
                    onResetAll={handleResetAll}
                    onStartNextTask={handleStartNextTask}
                    onAdvanceTask={handleAdvanceTask}
                    onPauseTask={handlePauseTask}
                    onResumeTask={handleResumeTask}
                    onBlockTask={handleBlockTask}
                    onClearBlocker={handleClearBlocker}
                    onCompleteTask={handleCompleteTask}
                    onFailTask={handleFailTask}
                    onRetryTask={handleRetryTask}
                    onCancelTask={handleCancelTask}
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
