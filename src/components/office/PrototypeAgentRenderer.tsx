import type { CSSProperties, PointerEvent } from 'react';
import { AGENT_SPRITE_MANIFEST } from '../../office/sprites/manifest';
import type { SpriteSurfaceRuntime } from '../../office/sprites/runtime';
import {
    PROTOTYPE_SPRITE_WORLD_SIZE,
    PROTOTYPE_PORTAL_HIDDEN_MS,
    PROTOTYPE_PORTAL_IN_MS,
    PROTOTYPE_PORTAL_OUT_MS,
    prototypeSpriteDirection,
    prototypeSpriteState,
    type PrototypeAgent,
    type PrototypeLabelPlacement,
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
    labelPlacement?: PrototypeLabelPlacement;
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
    labelPlacement,
    onSelect,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onFrameChange,
    onAvailabilityChange,
}: Props) {
    const portalElapsed = agent.portalTransition?.elapsedMs ?? 0;
    const portalStep = agent.portalTransition?.phase === 'portal-out'
        ? Math.min(4, Math.floor(portalElapsed / PROTOTYPE_PORTAL_OUT_MS * 4))
        : agent.portalTransition?.phase === 'portal-in'
            ? Math.min(4, Math.floor((portalElapsed - PROTOTYPE_PORTAL_OUT_MS - PROTOTYPE_PORTAL_HIDDEN_MS) / PROTOTYPE_PORTAL_IN_MS * 4))
            : 0;
    const portalOpacity = agent.portalTransition?.phase === 'portal-out'
        ? 1 - portalStep / 4
        : agent.portalTransition?.phase === 'portal-in' ? portalStep / 4 : agent.portalTransition ? 0 : 1;
    const style = {
        left: agent.point.x,
        top: agent.point.y,
        zIndex: dragging ? 9000 : 1000 + Math.round(agent.point.y),
        '--agent-ui-compensation': Math.min(3, Math.max(0.7, 1 / Math.max(0.001, transformScale))),
        '--agent-label-x': `${labelPlacement?.x ?? 90.5}px`,
        '--agent-label-y': `${labelPlacement?.y ?? 206}px`,
        '--portal-effect-x': `${PROTOTYPE_SPRITE_WORLD_SIZE / 2 + (agent.portalTransition?.thresholdPoint.x ?? agent.point.x) - agent.point.x}px`,
        '--portal-effect-y': `${PROTOTYPE_SPRITE_WORLD_SIZE + (agent.portalTransition?.thresholdPoint.y ?? agent.point.y) - agent.point.y}px`,
        '--portal-sprite-opacity': reducedMotion && agent.portalTransition ? Number(agent.portalTransition.phase === 'portal-in') : portalOpacity,
        '--portal-sprite-scale': reducedMotion ? 1 : 0.72 + portalOpacity * 0.28,
        '--portal-effect-opacity': agent.portalTransition ? reducedMotion ? 0.65 : 0.45 + (portalStep % 2) * 0.4 : 0,
    } as CSSProperties;
    const spriteState = prototypeSpriteState(agent);
    const spriteDirection = prototypeSpriteDirection(agent);
    const status = agent.movementState === 'walking' ? 'walking' : agent.activityState;
    const shortName = agent.fixture.label.replace(/^Agent\s+/i, 'A');
    const taskElapsed = Math.max(0, elapsedMs - agent.task.startedAtMs);
    const spriteElapsed = agent.movementState === 'walking'
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
            className={`prototype-agent prototype-agent--${agent.activityState} prototype-agent--facing-${agent.direction} ${agent.portalTransition ? `prototype-agent--${agent.portalTransition.phase}` : ''} ${selected ? 'prototype-agent--selected' : ''} ${showBounds ? 'prototype-agent--debug-bounds' : ''} ${dragging ? 'prototype-agent--dragging' : ''}`}
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
            data-resolved-velocity={`${agent.resolvedVelocity.x.toFixed(2)},${agent.resolvedVelocity.y.toFixed(2)}`}
            data-footprint-radius="34"
            data-static-collision={agent.staticCollisionStatus}
            data-blocked-by={agent.blockedByAgentId ?? ''}
            data-task-kind={agent.task.kind}
            data-task-phase={'phase' in agent.task ? agent.task.phase : ''}
            data-portal-door={agent.portalTransition?.doorId ?? ''}
            data-portal-phase={agent.portalTransition?.phase ?? ''}
            title={`${agent.fixture.label} · ${spriteState} · ${agent.fixture.spriteAssetId}`}
        >
            <span className="prototype-agent__selection-ring" aria-hidden="true" />
            <span className={`prototype-agent__facing-indicator prototype-agent__facing-indicator--${agent.direction}`} aria-hidden="true">▲</span>
            {agent.portalTransition && <span className="prototype-agent__portal-effect" aria-hidden="true" />}
            <span className="prototype-agent__sprite-wrap" aria-hidden="true" data-primary-sprite-visual="true">
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
