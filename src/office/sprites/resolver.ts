import {
    ResolvedSpriteClip,
    SpriteAssetManifest,
    SpriteDirection,
    SpriteManifest,
    SpriteState,
} from './types';

function findClip(asset: SpriteAssetManifest, state: SpriteState, direction: SpriteDirection) {
    return asset.clips.find(clip => clip.state === state && clip.direction === direction)
        ?? asset.clips.find(clip => clip.state === state && clip.direction === 'none');
}

export function resolveSpriteClip(
    manifest: SpriteManifest,
    assetId: string,
    requestedState: SpriteState,
    requestedDirection: SpriteDirection,
    reducedMotion = false,
): ResolvedSpriteClip | null {
    const asset = manifest.assets.find(item => item.id === assetId);
    if (!asset || asset.availability !== 'available') return null;
    const fallbackChain: SpriteState[] = [];
    const visited = new Set<SpriteState>();
    let state: SpriteState | null = requestedState;
    while (state !== null && !visited.has(state)) {
        visited.add(state);
        fallbackChain.push(state);
        const clip = findClip(asset, state, requestedDirection);
        if (clip) {
            return {
                asset,
                clip,
                requestedState,
                requestedDirection,
                resolvedState: state,
                resolvedDirection: clip.direction,
                fallbackChain,
                staticFrame: reducedMotion ? clip.reducedMotionFallbackFrame : null,
            };
        }
        state = manifest.fallbackGraph[state];
    }
    return null;
}

export function frameAtElapsedTime(
    resolved: ResolvedSpriteClip,
    elapsedMs: number,
    speed = 1,
): number {
    if (resolved.staticFrame !== null) return resolved.staticFrame;
    const { clip } = resolved;
    if (clip.frames.length === 1) return clip.frames[0];
    const sequence = clip.yoyo && clip.frames.length > 2
        ? [...clip.frames, ...clip.frames.slice(1, -1).reverse()]
        : clip.frames;
    const frameDuration = 1000 / (clip.framesPerSecond * Math.max(0.1, speed));
    const playbackDuration = sequence.length * frameDuration;
    const cycleDuration = playbackDuration + clip.repeatDelayMs;
    if (!clip.loop && elapsedMs >= playbackDuration) return sequence[sequence.length - 1];
    const cycleElapsed = clip.loop ? elapsedMs % cycleDuration : elapsedMs;
    if (cycleElapsed >= playbackDuration) return sequence[sequence.length - 1];
    return sequence[Math.floor(cycleElapsed / frameDuration) % sequence.length];
}

export function framePosition(asset: SpriteAssetManifest, frame: number) {
    return {
        column: frame % asset.columns,
        row: Math.floor(frame / asset.columns),
        x: -(frame % asset.columns) * asset.frameWidth,
        y: -Math.floor(frame / asset.columns) * asset.frameHeight,
    };
}
