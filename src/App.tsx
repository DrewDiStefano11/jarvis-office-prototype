import { useRef, useState, useEffect } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import { ControlPanel } from './components/ControlPanel';
import { INITIAL_AGENTS, INITIAL_TASKS } from './domain/seed';
import { Agent, Task, SimulationTransition, MovementOperation } from './types';
import { EventBus } from './game/EventBus';
import { applyMovementCompletion } from './domain/state';
import { advanceTask, blockTask, clearBlocker, completeTask, pauseTask, resetSimulation, resumeTask, startNextTask, failTask, retryTask, cancelTask } from './domain/task';

function App() {
    const phaserRef = useRef<IRefPhaserGame | null>(null);

    const [agents, setAgents] = useState<readonly Agent[]>(INITIAL_AGENTS);
    const [tasks, setTasks] = useState<readonly Task[]>(INITIAL_TASKS);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const commandIdCounter = useRef(0);
    const simulationGeneration = useRef(0);
    const movementOperations = useRef<Readonly<Record<string, MovementOperation>>>({});

    useEffect(() => {
        const handleAgentSelected = (agentId: string) => {
            setSelectedAgentId(agentId);
        };

        const handleMovementCompletedEvent = (data: { agentId: string, locationId: string, commandId: number, simulationGeneration: number, taskId: string }) => {
            setAgents(prevAgents => {
                 let nextAgents = prevAgents;
                 setTasks(prevTasks => {
                      const res = applyMovementCompletion(data.agentId, data.locationId, data.commandId, data.simulationGeneration, data.taskId, prevAgents, prevTasks, movementOperations.current);
                      if (res.ok) {
                           nextAgents = res.value.agents;
                           movementOperations.current = res.value.movementOperations;
                      }
                      return prevTasks;
                 });
                 return nextAgents;
            });
        };

        EventBus.on('agent-selected', handleAgentSelected);
        EventBus.on('movement-completed', handleMovementCompletedEvent);

        return () => {
            EventBus.removeListener('agent-selected', handleAgentSelected);
            EventBus.removeListener('movement-completed', handleMovementCompletedEvent);
        };
    }, []);

    useEffect(() => {
        EventBus.emit('sync-state', { agents, tasks });
    }, [agents, tasks]);

    const selectedAgent = agents.find(a => a.id === selectedAgentId) || null;

    const handleSelectAgent = (agentId: string) => {
        setSelectedAgentId(agentId);
        EventBus.emit('react-select-agent', agentId);
    };

    const applyTransition = (transitionResult: SimulationTransition) => {
        commandIdCounter.current = transitionResult.commandCounter;
        simulationGeneration.current = transitionResult.simulationGeneration;
        movementOperations.current = transitionResult.movementOperations;
        setAgents(transitionResult.agents);
        setTasks(transitionResult.tasks);

        if (transitionResult.movementCommand) {
            EventBus.emit('react-move-agent', {
                agentId: transitionResult.movementCommand.agentId,
                taskId: transitionResult.movementCommand.taskId,
                locationId: transitionResult.movementCommand.destinationId,
                commandId: transitionResult.movementCommand.commandId,
                simulationGeneration: transitionResult.movementCommand.simulationGeneration
            });
        }
    };

    const handleSendToLocation = () => {
        setErrorMsg("Direct movement disabled. Agents move based on their tasks.");
    };

    const handleResetAll = () => {
        setErrorMsg(null);
        const nextGen = simulationGeneration.current + 1;
        const transitionResult = resetSimulation(agents);
        const updatedTransition = { ...transitionResult, simulationGeneration: nextGen };
        applyTransition(updatedTransition);
        EventBus.emit('react-reset-all');
    };

    const handleStartNextTask = (agentId: string) => {
        setErrorMsg(null);
        const result = startNextTask(agentId, agents, tasks, movementOperations.current, commandIdCounter.current, simulationGeneration.current);
        if (!result.ok) { setErrorMsg(result.message); return; }
        applyTransition(result.value);
    };

    const handleAdvanceTask = (agentId: string) => {
        setErrorMsg(null);
        const result = advanceTask(agentId, agents, tasks, movementOperations.current, commandIdCounter.current, simulationGeneration.current);
        if (!result.ok) { setErrorMsg(result.message); return; }
        applyTransition(result.value);
    };

    const handlePauseTask = (agentId: string) => {
        setErrorMsg(null);
        const result = pauseTask(agentId, agents, tasks, movementOperations.current, commandIdCounter.current, simulationGeneration.current);
        if (!result.ok) { setErrorMsg(result.message); return; }
        applyTransition(result.value);
    };

    const handleResumeTask = (agentId: string) => {
        setErrorMsg(null);
        const result = resumeTask(agentId, agents, tasks, movementOperations.current, commandIdCounter.current, simulationGeneration.current);
        if (!result.ok) { setErrorMsg(result.message); return; }
        applyTransition(result.value);
    };

    const handleBlockTask = (agentId: string) => {
        setErrorMsg(null);
        const result = blockTask(agentId, "Blocked by user", agents, tasks, movementOperations.current, commandIdCounter.current, simulationGeneration.current);
        if (!result.ok) { setErrorMsg(result.message); return; }
        applyTransition(result.value);
    };

    const handleClearBlocker = (agentId: string) => {
        setErrorMsg(null);
        const result = clearBlocker(agentId, agents, tasks, movementOperations.current, commandIdCounter.current, simulationGeneration.current);
        if (!result.ok) { setErrorMsg(result.message); return; }
        applyTransition(result.value);
    };

    const handleCompleteTask = (agentId: string) => {
        setErrorMsg(null);
        const result = completeTask(agentId, agents, tasks, movementOperations.current, commandIdCounter.current, simulationGeneration.current);
        if (!result.ok) { setErrorMsg(result.message); return; }
        applyTransition(result.value);
    };

    const handleFailTask = (agentId: string) => {
        setErrorMsg(null);
        const result = failTask(agentId, "Failed by user", agents, tasks, movementOperations.current, commandIdCounter.current, simulationGeneration.current);
        if (!result.ok) { setErrorMsg(result.message); return; }
        applyTransition(result.value);
    };

    const handleRetryTask = (agentId: string) => {
        setErrorMsg(null);
        const result = retryTask(agentId, agents, tasks, movementOperations.current, commandIdCounter.current, simulationGeneration.current);
        if (!result.ok) { setErrorMsg(result.message); return; }
        applyTransition(result.value);
    };

    const handleCancelTask = (taskId: string) => {
        setErrorMsg(null);
        const result = cancelTask(taskId, agents, tasks, movementOperations.current, commandIdCounter.current, simulationGeneration.current);
        if (!result.ok) { setErrorMsg(result.message); return; }
        applyTransition(result.value);
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
                    agents={agents as Agent[]}
                    tasks={tasks as Task[]}
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
