import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { resolvePublicAssetPath } from '../../office/assets';
import { getAssetSet } from '../../office/sprites/manifest';
import { SpriteAnimation } from '../../office/sprites/manifestTypes';
import {
    frameIndexAtElapsed,
    frameRectangle,
    reducedMotionFrame,
} from '../../office/sprites/playback';
import { validateSpriteManifest } from '../../office/sprites/manifestValidation';
import { SPRITE_MANIFEST } from '../../office/sprites/manifest';
import './sprite-sheet-renderer.css';

export type SpriteRenderState = 'loading' | 'ready' | 'missing' | 'invalid';

export type SpriteSheetRendererProps = Readonly<{
    animation: SpriteAnimation;
    /** Display multiplier applied on top of the manifest world scale. */
    displayScale?: number;
    /** Fixes the frame instead of animating; enables manual frame mode. */
    manualFrameIndex?: number;
    paused?: boolean;
    /** Overrides the OS reduced-motion preference, mainly for the review lab. */
    forceReducedMotion?: boolean;
    /** Stops the timer when the element scrolls out of view. */
    pauseWhenOffscreen?: boolean;
    /** Multiplies frame durations; 2 plays at half speed. */
    speedMultiplier?: number;
    opacity?: number;
    glow?: string;
    zIndex?: number;
    className?: string;
    label?: string;
    /** Applies the subtle vertical bob, kept separate from frame selection. */
    floatTransform?: boolean;
    onStateChange?: (state: SpriteRenderState) => void;
}>;

function usePrefersReducedMotion(override?: boolean): boolean {
    const [prefers, setPrefers] = useState(false);
    useEffect(() => {
        if (override !== undefined) return;
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefers(query.matches);
        const onChange = (event: MediaQueryListEvent) => setPrefers(event.matches);
        query.addEventListener('change', onChange);
        return () => query.removeEventListener('change', onChange);
    }, [override]);
    return override ?? prefers;
}

/** True while the tab is hidden, so playback can pause without drifting. */
function useDocumentHidden(): boolean {
    const [hidden, setHidden] = useState(
        () => typeof document !== 'undefined' && document.visibilityState === 'hidden',
    );
    useEffect(() => {
        if (typeof document === 'undefined') return;
        const onChange = () => setHidden(document.visibilityState === 'hidden');
        document.addEventListener('visibilitychange', onChange);
        return () => document.removeEventListener('visibilitychange', onChange);
    }, []);
    return hidden;
}

function useOffscreen(
    ref: React.RefObject<HTMLDivElement | null>,
    enabled: boolean,
): boolean {
    const [offscreen, setOffscreen] = useState(false);
    useEffect(() => {
        if (!enabled) {
            setOffscreen(false);
            return;
        }
        const element = ref.current;
        if (!element || typeof IntersectionObserver === 'undefined') return;
        const observer = new IntersectionObserver(entries => {
            for (const entry of entries) setOffscreen(!entry.isIntersecting);
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, [ref, enabled]);
    return offscreen;
}

export function SpriteSheetRenderer({
    animation,
    displayScale = 1,
    manualFrameIndex,
    paused = false,
    forceReducedMotion,
    pauseWhenOffscreen = false,
    speedMultiplier = 1,
    opacity,
    glow,
    zIndex,
    className,
    label,
    floatTransform = false,
    onStateChange,
}: SpriteSheetRendererProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [state, setState] = useState<SpriteRenderState>('loading');
    const [elapsedMs, setElapsedMs] = useState(0);

    const reducedMotion = usePrefersReducedMotion(forceReducedMotion);
    const documentHidden = useDocumentHidden();
    const offscreen = useOffscreen(containerRef, pauseWhenOffscreen);

    const assetSet = getAssetSet(animation.assetSetId);

    // Manifest problems must fail closed rather than render a guessed frame.
    const validation = useMemo(() => validateSpriteManifest({
        ...SPRITE_MANIFEST,
        animations: [animation],
        assetSets: assetSet ? [assetSet] : [],
    }), [animation, assetSet]);

    const src = assetSet ? resolvePublicAssetPath(assetSet.publicPath) : '';

    // Load the sheet and confirm its real pixel dimensions match the manifest.
    useEffect(() => {
        if (!assetSet || !validation.valid) {
            setState('invalid');
            return;
        }
        if (typeof Image === 'undefined') return;
        let cancelled = false;
        setState('loading');
        const image = new Image();
        image.onload = () => {
            if (cancelled) return;
            const matches = image.naturalWidth === assetSet.sourceDimensions.width
                && image.naturalHeight === assetSet.sourceDimensions.height;
            setState(matches ? 'ready' : 'invalid');
        };
        image.onerror = () => {
            if (!cancelled) setState('missing');
        };
        image.src = src;
        return () => {
            cancelled = true;
            image.onload = null;
            image.onerror = null;
        };
    }, [assetSet, src, validation.valid]);

    useEffect(() => {
        onStateChange?.(state);
    }, [state, onStateChange]);

    const animating = state === 'ready'
        && manualFrameIndex === undefined
        && !paused
        && !reducedMotion
        && !documentHidden
        && !offscreen;

    // Elapsed-time clock: the frame is a pure function of accumulated time, so
    // the result never depends on refresh rate or on frames missed while hidden.
    useEffect(() => {
        if (!animating) return;
        if (typeof requestAnimationFrame === 'undefined') return;
        let raf = 0;
        let last = performance.now();
        const tick = (now: number) => {
            const delta = now - last;
            last = now;
            const rate = speedMultiplier > 0 ? speedMultiplier : 1;
            setElapsedMs(previous => previous + delta / rate);
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [animating, speedMultiplier]);

    const frameIndex = useMemo(() => {
        if (manualFrameIndex !== undefined) return manualFrameIndex;
        if (reducedMotion) return reducedMotionFrame(animation);
        return frameIndexAtElapsed(animation, elapsedMs);
    }, [animation, elapsedMs, manualFrameIndex, reducedMotion]);

    const rect = frameRectangle(animation, frameIndex);

    if (!assetSet || !validation.valid || state === 'invalid' || !rect) {
        return (
            <div
                ref={containerRef}
                className={`sprite-sheet-renderer sprite-sheet-renderer--fallback ${className ?? ''}`}
                role="img"
                aria-label={`${label ?? animation.id} unavailable`}
                data-sprite-state="invalid"
            />
        );
    }
    if (state === 'missing') {
        return (
            <div
                ref={containerRef}
                className={`sprite-sheet-renderer sprite-sheet-renderer--fallback ${className ?? ''}`}
                role="img"
                aria-label={`${label ?? animation.id} asset missing`}
                data-sprite-state="missing"
            />
        );
    }

    const scale = animation.worldScale * displayScale;
    const style: CSSProperties = {
        width: `${rect.width * scale}px`,
        height: `${rect.height * scale}px`,
        backgroundImage: `url("${src}")`,
        backgroundPosition: `${-rect.x * scale}px ${-rect.y * scale}px`,
        backgroundSize: `${assetSet.sourceDimensions.width * scale}px ${assetSet.sourceDimensions.height * scale}px`,
        backgroundRepeat: 'no-repeat',
        imageRendering: animation.pixelArt ? 'pixelated' : 'auto',
        opacity: opacity ?? animation.opacity,
        mixBlendMode: animation.blendMode === 'normal' ? undefined : animation.blendMode,
        zIndex,
        filter: glow ? `drop-shadow(0 0 ${Math.round(6 * scale)}px ${glow})` : undefined,
    };

    return (
        <div
            ref={containerRef}
            className={[
                'sprite-sheet-renderer',
                floatTransform && animating ? 'sprite-sheet-renderer--float' : '',
                className ?? '',
            ].filter(Boolean).join(' ')}
            style={style}
            role="img"
            aria-label={label ?? animation.id}
            data-sprite-state={state === 'ready' ? 'ready' : state}
            data-frame-index={frameIndex}
        />
    );
}

export default SpriteSheetRenderer;
