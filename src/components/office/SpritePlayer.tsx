import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { resolvePublicAssetPath } from '../../office/assets';
import { frameAtElapsedTime, framePosition, resolveSpriteClip } from '../../office/sprites/resolver';
import { SpriteSurfaceRuntime } from '../../office/sprites/runtime';
import { SpriteDirection, SpriteManifest, SpriteState } from '../../office/sprites/types';

type Props = Readonly<{
    manifest: SpriteManifest;
    runtime: SpriteSurfaceRuntime;
    assetId: string;
    state: SpriteState;
    direction?: SpriteDirection;
    reducedMotion?: boolean;
    paused?: boolean;
    speed?: number;
    scale?: number;
    manualFrame?: number | null;
    nearestNeighbor?: boolean;
    onFrameChange?: (frame: number) => void;
    className?: string;
}>;

export function SpritePlayer({
    manifest,
    runtime,
    assetId,
    state,
    direction = 'none',
    reducedMotion = false,
    paused = false,
    speed = 1,
    scale = 1,
    manualFrame = null,
    nearestNeighbor = true,
    onFrameChange,
    className = '',
}: Props) {
    const frameRef = useRef<HTMLDivElement>(null);
    const lastFrameRef = useRef<number | null>(null);
    const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
    const resolved = useMemo(
        () => resolveSpriteClip(manifest, assetId, state, direction, reducedMotion),
        [assetId, direction, manifest, reducedMotion, state],
    );
    const asset = resolved?.asset;
    const url = asset ? resolvePublicAssetPath(asset.generatedAssetUrl) : '';

    useEffect(() => {
        let cancelled = false;
        setLoadState('loading');
        if (!asset) {
            setLoadState('error');
            return;
        }
        runtime.textures.load(url).then(image => {
            if (cancelled) return;
            setLoadState(
                image.naturalWidth === asset.frameWidth * asset.columns
                && image.naturalHeight === asset.frameHeight * asset.rows
                    ? 'ready'
                    : 'error',
            );
        }).catch(() => {
            if (!cancelled) setLoadState('error');
        });
        return () => { cancelled = true; };
    }, [asset, runtime.textures, url]);

    useEffect(() => {
        if (!resolved || loadState === 'error') return;
        const update = (frame: number) => {
            if (lastFrameRef.current === frame) return;
            lastFrameRef.current = frame;
            const position = framePosition(resolved.asset, frame);
            if (frameRef.current) {
                frameRef.current.style.backgroundPosition = `${position.x * scale}px ${position.y * scale}px`;
            }
            onFrameChange?.(frame);
        };
        if (manualFrame !== null) {
            update(Math.max(0, Math.min(resolved.asset.frameCount - 1, manualFrame)));
            return;
        }
        if (paused || reducedMotion) {
            update(resolved.staticFrame ?? resolved.clip.staticFallbackFrame);
            return;
        }
        update(resolved.clip.frames[0]);
        return runtime.clock.subscribe(elapsed => update(frameAtElapsedTime(resolved, elapsed, speed)));
    }, [loadState, manualFrame, onFrameChange, paused, reducedMotion, resolved, runtime.clock, scale, speed]);

    if (!resolved || loadState === 'error') {
        return (
            <div className={`sprite-player sprite-player--missing ${className}`} role="img" aria-label={`Sprite ${assetId} unavailable`}>
                <span aria-hidden="true">?</span>
            </div>
        );
    }

    const style: CSSProperties = {
        width: resolved.asset.frameWidth * scale,
        height: resolved.asset.frameHeight * scale,
        transform: `translate(${-resolved.asset.anchor.x * 100}%, ${-resolved.asset.anchor.y * 100}%)`,
    };
    const frameStyle: CSSProperties = {
        width: '100%',
        height: '100%',
        backgroundImage: `url("${url}")`,
        backgroundSize: `${resolved.asset.frameWidth * resolved.asset.columns * scale}px ${resolved.asset.frameHeight * resolved.asset.rows * scale}px`,
        imageRendering: nearestNeighbor ? 'pixelated' : 'auto',
        visibility: loadState === 'ready' ? 'visible' : 'hidden',
    };

    return (
        <div
            className={`sprite-player ${className}`}
            style={style}
            role="img"
            aria-label={`${assetId}, requested ${state}, rendering ${resolved.resolvedState}`}
            data-state={resolved.resolvedState}
            data-fallback-chain={resolved.fallbackChain.join(' > ')}
        >
            <div ref={frameRef} className="sprite-player__frame" style={frameStyle} />
            {loadState === 'loading' && <span className="sprite-player__loading" aria-hidden="true">…</span>}
        </div>
    );
}
