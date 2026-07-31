/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useEffect, useRef, useState, useCallback } from 'react';
import { advanceCandidateAgents, advanceCandidateDoorRuntimes, CandidateNavigationGraph, CandidateDoorRuntime } from '../../office/floor1/navigation/candidateNavigation';
import { SpriteSurfaceRuntime } from '../../office/sprites/runtime';

export interface SimulationEvent {
    time: number;
    msg: string;
    category?: string;
}

export function useSimulationEngine(active: boolean, graph: CandidateNavigationGraph | null) {
    const [runtime] = useState(() => new SpriteSurfaceRuntime());
    const [agents, setAgents] = useState<any[]>([]);
    const [doorRuntimes, setDoorRuntimes] = useState<Record<string, CandidateDoorRuntime>>({});
    const [eventLog, setEventLog] = useState<SimulationEvent[]>([]);
    const [preview, setPreview] = useState<any | null>(null);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

    const frameRef = useRef<number | null>(null);
    const lastTimestampRef = useRef<number | null>(null);
    const agentsRef = useRef(agents);
    const doorRuntimesRef = useRef(doorRuntimes);
    const speedRef = useRef(playbackSpeed);

    useEffect(() => { agentsRef.current = agents; }, [agents]);
    useEffect(() => { doorRuntimesRef.current = doorRuntimes; }, [doorRuntimes]);
    useEffect(() => { speedRef.current = playbackSpeed; }, [playbackSpeed]);

    const addEvent = useCallback((msg: string, category = 'system') => {
        setEventLog(prev => [{ time: performance.now(), msg, category }, ...prev].slice(0, 100));
    }, []);

    // Initialize state when graph loads
    useEffect(() => {
        if (graph && agents.length === 0) {
            setAgents(graph.agents.slice(0, 2).map(fixture => ({
                fixture, point: fixture.point, status: 'idle', route: null, progress: 0, revision: 0
            })));
            setDoorRuntimes(Object.fromEntries(graph.doors.map(d => [d.id, { doorId: d.id, state: d.currentState ?? 'closed', stateElapsedMs: 0, revision: 0 }])));
        }
    }, [graph]);

    // Active tracking
    useEffect(() => {
        runtime.setActive(active && !window.document.hidden);
        const handleVisibility = () => {
            runtime.setActive(active && !window.document.hidden);
            lastTimestampRef.current = null;
        };
        window.document.addEventListener('visibilitychange', handleVisibility);
        return () => window.document.removeEventListener('visibilitychange', handleVisibility);
    }, [active, runtime]);

    useEffect(() => () => {
        runtime.dispose();
        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    }, [runtime]);

    const anyWalking = agents.some(a => a.status === 'walking' || a.status === 'waiting_for_door' || a.status === 'crossing_door');

    // Animation Loop
    useEffect(() => {
        if (!active || !anyWalking || !graph || speedRef.current === 0) {
            if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
            lastTimestampRef.current = null;
            return undefined;
        }

        const loop = (timestamp: number) => {
            const currentAgents = agentsRef.current;
            const currentDoors = doorRuntimesRef.current;

            if (lastTimestampRef.current !== null) {
                let elapsedMs = (timestamp - lastTimestampRef.current) * speedRef.current;
                if (elapsedMs > 100) elapsedMs = 100;

                if (elapsedMs > 0) {
                    const requestingDoorIds = currentAgents.filter(a => a.status === 'waiting_for_door' && a.route).map(a => {
                        const step = a.route?.doorSteps.find((s: any) => a.progress <= s.clearanceReleaseDistance);
                        return step?.doorId;
                    }).filter(Boolean) as string[];

                    const advancedDoors = advanceCandidateDoorRuntimes(currentDoors, requestingDoorIds, elapsedMs);
                    const advancedAgents = advanceCandidateAgents(currentAgents, elapsedMs, 100, advancedDoors);

                    if (advancedDoors !== currentDoors) {
                        setDoorRuntimes(advancedDoors);
                    }
                    if (advancedAgents !== currentAgents) {
                        setAgents(advancedAgents as any[]);
                    }
                }
            }
            lastTimestampRef.current = timestamp;
            frameRef.current = requestAnimationFrame(loop);
        };
        frameRef.current = requestAnimationFrame(loop);
        return () => {
            if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
            lastTimestampRef.current = null;
        };
    }, [active, anyWalking, graph]);

    return {
        runtime, agents, setAgents, doorRuntimes, setDoorRuntimes,
        eventLog, setEventLog, addEvent, preview, setPreview,
        playbackSpeed, setPlaybackSpeed
    };
}
