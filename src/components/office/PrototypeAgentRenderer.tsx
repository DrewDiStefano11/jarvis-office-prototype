import type { CSSProperties, PointerEvent } from 'react';
import { AGENT_SPRITE_MANIFEST } from '../../office/sprites/manifest';
import type { SpriteSurfaceRuntime } from '../../office/sprites/runtime';
import {
    prototypeSpriteDirection,
    prototypeSpriteState,
    type PrototypeAgent,
} from '../../office/floor1/navigation/prototypeRuntime';
import { SpritePlayer } from './SpritePlayer';

type Props = Readonly<{
    agent: PrototypeAgent;
    runtime: SpriteSurfaceRuntime;
    elapsedMs: number;
    selected: boolean;
    transformScale: number;
    reducedMotion: boolean;
    paused: boolean;
    showLabel: boolean;
    showBounds: boolean;
    dragging: boolean;
    onSelect: (agentId: string) => void;
    onPointerDown?: (event: PointerEvent<HTMLButtonElement>, agentId: string) => void;
    onPointerMove?: (event: PointerEvent<HTMLButtonElement>, agentId: string) => void;
    onPointerUp?: (event: PointerEvent<HTMLButtonElement>, agentId: string) => void;
    onPointerCancel?: (event: PointerEvent<HTMLButtonElement>, agentId: string) => void;
    onFrameChange?: (agentId: string, frame: number) => void;
    onAvailabilityChange?: (agentId: string, available: boolean, reason: string | null) => void;
}>;

export function PrototypeAgentRenderer({
    agent,
    runtime,
    elapsedMs,
    selected,
    transformScale,
    reducedMotion,
    paused,
    showLabel,
    showBounds,
    dragging,
    onSelect,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onFrameChange,
    onAvailabilityChange,
}: Props) {
    const style = {
        left: agent.point.x,
        top: agent.point.y,
        '--agent-ui-compensation': Math.min(3, Math.max(0.7, 1 / Math.max(0.001, transformScale))),
    } as CSSProperties;
    const spriteState = prototypeSpriteState(agent);
    const spriteDirection = prototypeSpriteDirection(agent);
    const status = agent.movementState === 'walking' ? 'walking' : agent.activityState;
    const shortName = agent.fixture.label.replace(/^Agent\s+/i, 'A');
    const taskElapsed = Math.max(0, elapsedMs - agent.task.startedAtMs);
    const spriteElapsed = agent.movementState === 'walking' || agent.movementState === 'waiting'
        ? agent.walkCycleElapsedMs
        : taskElapsed;

    const pointer = (handler: Props['onPointerDown'] | Props['onPointerMove'] | Props['onPointerUp'] | Props['onPointerCancel']) =>
        (event: PointerEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            handler?.(event, agent.fixture.id);
        };

    return (
        <button
            type="button"
            className={`prototype-agent prototype-agent--${agent.activityState} prototype-agent--facing-${agent.direction} ${selected ? 'prototype-agent--selected' : ''} ${showBounds ? 'prototype-agent--debug-bounds' : ''} ${dragging ? 'prototype-agent--dragging' : ''}`}
            style={style}
            onClick={event => {
                event.stopPropagation();
                onSelect(agent.fixture.id);
            }}
            onPointerDown={pointer(onPointerDown)}
            onPointerMove={pointer(onPointerMove)}
            onPointerUp={pointer(onPointerUp)}
            onPointerCancel={pointer(onPointerCancel)}
            aria-label={`${agent.fixture.label}. ${status}. ${agent.fixture.roomName}.`}
            aria-pressed={selected}
            data-agent-id={agent.fixture.id}
            data-agent-state={agent.activityState}
            data-movement-state={agent.movementState}
            data-sprite-state={spriteState}
            data-sprite-direction={spriteDirection}
            data-velocity={`${agent.velocity.x.toFixed(2)},${agent.velocity.y.toFixed(2)}`}
            data-footprint-radius="34"
            data-static-collision={agent.staticCollisionStatus}
            data-blocked-by={agent.blockedByAgentId ?? ''}
            data-task-kind={agent.task.kind}
            data-task-phase={'phase' in agent.task ? agent.task.phase : ''}
            title={`${agent.fixture.label} · ${spriteState} · ${agent.fixture.spriteAssetId}`}
        >
            <span className="prototype-agent__selection-ring" aria-hidden="true" />
            <span className={`prototype-agent__facing-indicator prototype-agent__facing-indicator--${agent.direction}`} aria-hidden="true">▲</span>
            <span className="prototype-agent__sprite-wrap" aria-hidden="true">
                <SpritePlayer
                    manifest={AGENT_SPRITE_MANIFEST}
                    runtime={runtime}
                    assetId={agent.fixture.spriteAssetId}
                    state={spriteState}
                    direction={spriteDirection}
                    reducedMotion={reducedMotion}
                    paused={paused}
                    speed={1}
                    externalElapsedMs={spriteElapsed}
                    onFrameChange={frame => onFrameChange?.(agent.fixture.id, frame)}
                    onAvailabilityChange={(available, reason) => onAvailabilityChange?.(agent.fixture.id, available, reason)}
                    className="prototype-agent__sprite"
                />
            </span>
            <span className={`prototype-agent__activity-dot prototype-agent__activity-dot--${agent.activityState}`} aria-hidden="true" />
            {showLabel && <span className="prototype-agent__label">{shortName}</span>}
        </button>
    );
}
