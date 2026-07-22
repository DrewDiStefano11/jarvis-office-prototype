import { Game, Scene } from "phaser";
import { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import StartGame from './game/main';
import { EventBus } from './game/EventBus';
import type { FloorDefinition } from './domain/building/types';
import type { SceneMode } from './game/main';

export interface IRefPhaserGame
{
    game: Game | null;
    scene: Scene | null;
}

interface IProps
{
    floor: FloorDefinition;
    mode?: SceneMode;
    currentActiveScene?: (scene_instance: Scene) => void
}

export const PhaserGame = forwardRef<IRefPhaserGame, IProps>(function PhaserGame({ floor, mode = 'floor', currentActiveScene }, ref)
{
    const game = useRef<Game | null>(null!);

    useLayoutEffect(() =>
    {
        if (game.current === null)
        {

            game.current = StartGame("game-container", floor, mode);

            if (typeof ref === 'function')
            {
                ref({ game: game.current, scene: null });
            } else if (ref)
            {
                ref.current = { game: game.current, scene: null };
            }

        }

        return () =>
        {
            if (game.current)
            {
                game.current.destroy(true);
                if (game.current !== null)
                {
                    game.current = null;
                }
            }
        }
    }, [floor, mode, ref]);

    useEffect(() =>
    {
        const handleSceneReady = (scene_instance: Scene) =>
        {
            if (currentActiveScene && typeof currentActiveScene === 'function')
            {
                currentActiveScene(scene_instance);
            }

            if (typeof ref === 'function')
            {
                ref({ game: game.current, scene: scene_instance });
            } else if (ref)
            {
                ref.current = { game: game.current, scene: scene_instance };
            }
        };

        EventBus.on('current-scene-ready', handleSceneReady);
        return () =>
        {
            EventBus.removeListener('current-scene-ready', handleSceneReady);
        }
    }, [currentActiveScene, ref]);

    return (
        <div id="game-container"></div>
    );

});
