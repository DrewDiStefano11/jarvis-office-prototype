import type { CSSProperties, MouseEvent } from 'react';
import type { PrototypeAgent } from '../../office/floor1/navigation/prototypeRuntime';

type Props = Readonly<{
    agent: PrototypeAgent;
    selected: boolean;
    transformScale: number;
    showLabel: boolean;
    showBounds: boolean;
    visualOffsetIndex: number;
    onSelect: (agentId: string) => void;
}>;

const MINIMUM_MARKER_SCREEN_PX = 34;
const MARKER_WORLD_PX = 76;

function activityGlyph(agent: PrototypeAgent): string {
    if (agent.activityState === 'talking') return '•••';
    if (agent.activityState === 'working-at-desk') return '⌨';
    if (agent.activityState === 'walking' || agent.activityState === 'moving-to-task') return '➜';
    if (agent.activityState === 'waiting') return '…';
    return '•';
}

export function PrototypeAgentRenderer({
    agent,
    selected,
    transformScale,
    showLabel,
    showBounds,
    visualOffsetIndex,
    onSelect,
}: Props) {
    const compensation = Math.min(9, Math.max(1, MINIMUM_MARKER_SCREEN_PX / (MARKER_WORLD_PX * Math.max(0.001, transformScale))));
    const offsetAngle = (visualOffsetIndex % 8) * (Math.PI / 4);
    const offset = visualOffsetIndex === 0 ? { x: 0, y: 0 } : { x: Math.cos(offsetAngle) * 18, y: Math.sin(offsetAngle) * 18 };
    const style = {
        left: agent.point.x + offset.x,
        top: agent.point.y + offset.y,
        '--agent-compensation': compensation,
    } as CSSProperties;
    const status = agent.movementState === 'walking' ? 'walking' : agent.activityState;
    const shortName = agent.fixture.label.replace(/^Agent\s+/i, 'A');

    const select = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        onSelect(agent.fixture.id);
    };

    return (
        <button
            type="button"
            className={`prototype-agent prototype-agent--${agent.activityState} ${selected ? 'prototype-agent--selected' : ''} ${showBounds ? 'prototype-agent--debug-bounds' : ''}`}
            style={style}
            onClick={select}
            aria-label={`${agent.fixture.label}. ${status}. ${agent.fixture.roomName}.`}
            aria-pressed={selected}
            data-agent-id={agent.fixture.id}
            data-agent-state={agent.activityState}
            title={`${agent.fixture.label} · ${status}${agent.targetPoint ? ` · target ${Math.round(agent.targetPoint.x)}, ${Math.round(agent.targetPoint.y)}` : ''}`}
        >
            <span className="prototype-agent__marker" aria-hidden="true">
                <span className={`prototype-agent__direction prototype-agent__direction--${agent.direction}`}>▲</span>
                <span className="prototype-agent__body" />
                <span className="prototype-agent__activity">{activityGlyph(agent)}</span>
                <span className="prototype-agent__status" />
            </span>
            {showLabel && <span className="prototype-agent__label">{shortName}</span>}
        </button>
    );
}
