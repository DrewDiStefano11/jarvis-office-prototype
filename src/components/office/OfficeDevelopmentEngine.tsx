/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSimulationEngine } from './useSimulationEngine';
import { OfficeDebugToolbar } from './OfficeDebugToolbar';
import { OfficeOverlayDocument, Point, ViewTransform } from '../../office/types';
import { buildCandidateSandboxGraph } from '../../office/floor1/navigation/candidateNavigation';
import { FLOOR1_CANDIDATE_REGISTRATION } from '../../office/floor1/candidateRegistration';
import roomsJson from '../../office/data/floor1/provisional/rooms.json';
import positionsJson from '../../office/data/floor1/provisional/positions.json';
import doorsJson from '../../office/data/floor1/provisional/doors.json';
import computersJson from '../../office/data/floor1/provisional/computers.json';
import interactiveObjectsJson from '../../office/data/floor1/provisional/interactive-objects.json';
import wallsJson from '../../office/data/floor1/provisional/walls.json';
import walkPathsJson from '../../office/data/floor1/provisional/walk-paths.json';
import doorLightsJson from '../../office/data/floor1/provisional/door-lights.json';
import { SpritePlayer } from './SpritePlayer';
import { AGENT_SPRITE_MANIFEST } from '../../office/sprites/manifest';

interface Props {
    active: boolean;
    document: OfficeOverlayDocument;
    transform: ViewTransform;
    selectedId: string | null;
    onSelectId: (id: string | null) => void;
    pointer: Point | null;
    visibleLayers: Set<string>;
    setVisibleLayers: (layers: Set<string>) => void;
}

export function OfficeDevelopmentEngine({ active, transform, selectedId, onSelectId, pointer, visibleLayers, setVisibleLayers }: Props) {
    const graph = useMemo(() => {
        try {
            return buildCandidateSandboxGraph({
                rooms: roomsJson, positions: positionsJson, doors: doorsJson, doorLights: doorLightsJson,
                computers: computersJson, interactiveObjects: interactiveObjectsJson, walls: wallsJson, walkPaths: walkPathsJson, objects: []
            } as any, FLOOR1_CANDIDATE_REGISTRATION);
        } catch { return null; }
    }, []);

    const sim = useSimulationEngine(active, graph as any);

    const [opacity, setOpacity] = useState(1.0);
    const [placementModeActive, setPlacementModeActive] = useState(false);

    // Placement logic
    useEffect(() => {
        if (!placementModeActive || !graph || !pointer) return;
        let nearest = graph?.walkNodes?.[0] || null;
        let minDist = Infinity;
        for (const n of graph?.walkNodes || []) {
            const d = Math.hypot(n.point.x - pointer.x, n.point.y - pointer.y);
            if (d < minDist) { minDist = d; nearest = n; }
        }

        if (nearest && minDist < 200) {
            if (sim.agents.length >= 25) {
                sim.addEvent('Capacity reached', 'error');
                return;
            }
            const newAgent = {
                fixture: { id: `test-${Date.now()}`, label: `Agent ${sim.agents.length+1}`, spriteAssetId: 'c_agent_1' },
                point: nearest.point, status: 'idle', route: null, progress: 0, revision: 0
            };
            sim.setAgents([...sim.agents, newAgent as any]);
            onSelectId(newAgent.fixture.id);
            sim.addEvent(`Placed agent at ${Math.round(nearest.point.x)}, ${Math.round(nearest.point.y)}`);
            setPlacementModeActive(false);
        } else {
            sim.addEvent('Invalid placement: Too far from walk paths', 'error');
        }
    }, [pointer]); // Trigger placement when pointer changes while mode is active

    const [portal, setPortal] = useState<HTMLElement | null>(null);
    useEffect(() => setPortal(window.document.querySelector<HTMLElement>('.office-viewport')), []);

    const overlaySvg = (
        <svg
            className="office-debug-overlays"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: '0 0' }}
            aria-hidden="true"
        >
            {graph && visibleLayers.has('colliders') && graph.colliders.map((c: any) => (
                <polygon key={c.id} points={c.points.map((p: any) => `${p.x},${p.y}`).join(' ')} stroke="red" strokeWidth={c.thickness || 2} fill="none" opacity={opacity} />
            ))}
            {graph && visibleLayers.has('graph-nodes') && graph.walkNodes.map((n: any) => (
                <circle key={n.id} cx={n.point.x} cy={n.point.y} r="14" fill="rgba(0, 0, 255, 0.5)" opacity={opacity} />
            ))}
            {graph && visibleLayers.has('doors') && graph.doors.map((d: any) => (
                <circle key={d.id} cx={d.point.x} cy={d.point.y} r="24" fill="rgba(255, 165, 0, 0.5)" opacity={opacity} />
            ))}
            {visibleLayers.has('destination-markers') && graph?.destinations.map((d: any) => (
                <rect key={d.id} x={d.point.x - 10} y={d.point.y - 10} width={20} height={20} fill="magenta" opacity={opacity} />
            ))}
            {visibleLayers.has('candidate-route') && sim.preview?.result?.status === 'valid' && (
                <polyline points={sim.preview.result.points.map((p: any) => `${p.x},${p.y}`).join(' ')} stroke="blue" strokeWidth="4" fill="none" opacity={opacity} />
            )}
            <g className="floor1-candidate-agent-layer" style={{ pointerEvents: 'auto' }}>
                {sim.agents.map((agent: any) => (
                    <g key={agent.fixture.id} style={{ cursor: 'pointer' }} onClick={() => onSelectId(agent.fixture.id)} transform={`translate(${agent.point.x}, ${agent.point.y})`}>
                        {selectedId === agent.fixture.id && <circle r="45" fill="rgba(0,0,255,0.3)" />}
                        <foreignObject x="-30" y="-80" width="60" height="120" style={{ pointerEvents: 'none' }}>
                            <SpritePlayer
                                manifest={AGENT_SPRITE_MANIFEST}
                                runtime={sim.runtime as any}
                                assetId={agent.fixture.spriteAssetId}
                                state={['walking', 'waiting_for_door', 'crossing_door'].includes(agent.status) ? 'walking' : agent.status === 'blocked' ? 'offline' : 'idle'}
                                reducedMotion={false}
                                scale={0.52}
                            />
                        </foreignObject>
                        {visibleLayers.has('agent-labels') && (
                            <text y="-90" textAnchor="middle" fill="black" fontSize="32" fontWeight="bold" opacity={opacity}>{agent.fixture.label}</text>
                        )}
                    </g>
                ))}
            </g>
        </svg>
    );

    return (
        <>
            {portal && createPortal(overlaySvg, portal)}
            <OfficeDebugToolbar
                active={active} graph={graph}
                agents={sim.agents} setAgents={sim.setAgents}
                eventLog={sim.eventLog} addEvent={sim.addEvent}
                doorRuntimes={sim.doorRuntimes} setDoorRuntimes={sim.setDoorRuntimes}
                preview={sim.preview} setPreview={sim.setPreview}
                playbackSpeed={sim.playbackSpeed} setPlaybackSpeed={sim.setPlaybackSpeed}
                visibleLayers={visibleLayers} setVisibleLayers={setVisibleLayers}
                opacity={opacity} setOpacity={setOpacity}
                selectedId={selectedId} onSelectId={onSelectId}
                placementModeActive={placementModeActive} onPlacementModeToggle={setPlacementModeActive}
            />
        </>
    );
}
