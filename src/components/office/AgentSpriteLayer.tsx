import { useEffect, useState } from 'react';
import { SPRITE_DEMO_AGENTS, SpriteDemoAgent } from '../../domain/seed';
import { AGENT_SPRITE_MANIFEST } from '../../office/sprites/manifest';
import { SpriteSurfaceRuntime } from '../../office/sprites/runtime';
import { SpritePlayer } from './SpritePlayer';
import './agent-sprite-layer.css';

type Props = Readonly<{
    active: boolean;
    selectedId: string | null;
    reducedMotion: boolean;
    onSelect: (agent: SpriteDemoAgent) => void;
}>;

export function AgentSpriteLayer({ active, selectedId, reducedMotion, onSelect }: Props) {
    const [runtime] = useState(() => new SpriteSurfaceRuntime());

    useEffect(() => {
        runtime.setActive(active && !document.hidden);
        const handleVisibility = () => runtime.setActive(active && !document.hidden);
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [active, runtime]);

    useEffect(() => () => runtime.dispose(), [runtime]);

    return (
        <div className="agent-sprite-layer" aria-label="Agent sprite demonstration">
            {SPRITE_DEMO_AGENTS.map(agent => (
                <button
                    key={agent.id}
                    type="button"
                    className={`demo-agent ${selectedId === agent.id ? 'demo-agent--selected' : ''}`}
                    style={{ left: agent.position.x, top: agent.position.y }}
                    onClick={event => {
                        event.stopPropagation();
                        onSelect(agent);
                    }}
                    aria-label={`${agent.displayName}, ${agent.state}. Demonstration position, not a production assignment.`}
                    aria-pressed={selectedId === agent.id}
                >
                    <SpritePlayer
                        manifest={AGENT_SPRITE_MANIFEST}
                        runtime={runtime}
                        assetId={agent.assetId}
                        state={agent.state}
                        reducedMotion={reducedMotion}
                        scale={agent.scale}
                    />
                    <span className="demo-agent__label">{agent.displayName} · {agent.state}</span>
                </button>
            ))}
        </div>
    );
}
