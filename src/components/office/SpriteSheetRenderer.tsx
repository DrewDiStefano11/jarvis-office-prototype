import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { resolvePublicAssetPath } from '../../office/assets';
import { getAssetSet } from '../../office/sprites/manifest';
import { SpriteAnimation } from '../../office/sprites/manifestTypes';
import {
    frameIndexAtElapsed,
    frameRectangle,
    reducedMotionFrame,
} from '../../office/sprites/playback';
import {
    buildAnimationDependencyClosure,
    validateSpriteManifest,
} from '../../office/sprites/manifestValidation';
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

    /**
     * Validate the animation together with its fallback dependency closure.
     *
     * Validating the entry in isolation would report FALLBACK_ANIMATION_MISSING
     * for any animation whose fallback lives elsewhere in the manifest, so
     * fallback checking stays on but sees the animations it needs.
     */
    const validation = useMemo(() => {
        const closure = buildAnimationDependencyClosure(
            { ...SPRITE_MANIFEST, animations: [animation, ...SPRITE_MANIFEST.animations.filter(a => a.id !== animation.id)] },
            animation.id,
        );
        const assetSets = assetSet
            && !closure.assetSets.some(a => a.id === assetSet.id)
            ? [...closure.assetSets, assetSet]
            : closure.assetSets;
        return validateSpriteManifest({ ...closure, assetSets });
    }, [animation, assetSet]);

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

    // Stable logical frame box: identical outer size for every frame, so
    // variable-width ink rectangles cannot shift the sprite between frames.
    const boxWidth = animation.frameWidth * scale;
    const boxHeight = animation.frameHeight * scale;

    /*
     * Alignment of the trimmed source rectangle inside the logical box.
     * For measured ink bounds we centre horizontally and sit content on the
     * box floor, matching the bottom-centre anchor. Untrimmed sheets already
     * fill the box, so no offset is applied.
     */
    const trimmed = animation.trimBehavior === 'trimmed-ink-bounds';
    const offsetX = trimmed ? Math.round((animation.frameWidth - rect.width) / 2) : 0;
    const offsetY = trimmed ? animation.frameHeight - rect.height : 0;

    /*
     * Layers are kept separate so each concern can change independently:
     *   outer  -> anchor translation (world attachment point)
     *   float  -> optional vertical bob (never overwrites the anchor)
     *   box    -> stable logical frame box
     *   inner  -> trimmed frame content at its offset
     */
    const anchorStyle: CSSProperties = {
        position: 'relative',
        display: 'block',
        width: `${boxWidth}px`,
        height: `${boxHeight}px`,
        transform: `translate(${-animation.anchor.x * boxWidth}px, ${-animation.anchor.y * boxHeight}px)`,
        opacity: opacity ?? animation.opacity,
        mixBlendMode: animation.blendMode === 'normal' ? undefined : animation.blendMode,
        zIndex,
        pointerEvents: 'none',
    };

    const contentStyle: CSSProperties = {
        position: 'absolute',
        left: `${offsetX * scale}px`,
        top: `${offsetY * scale}px`,
        width: `${rect.width * scale}px`,
        height: `${rect.height * scale}px`,
        backgroundImage: `url("${src}")`,
        backgroundPosition: `${-rect.x * scale}px ${-rect.y * scale}px`,
        backgroundSize: `${assetSet.sourceDimensions.width * scale}px ${assetSet.sourceDimensions.height * scale}px`,
        backgroundRepeat: 'no-repeat',
        imageRendering: animation.pixelArt ? 'pixelated' : 'auto',
        filter: glow ? `drop-shadow(0 0 ${Math.round(6 * scale)}px ${glow})` : undefined,
    };

    return (
        <div
            ref={containerRef}
            className={['sprite-sheet-renderer', className ?? ''].filter(Boolean).join(' ')}
            style={anchorStyle}
            role="img"
            aria-label={label ?? animation.id}
            data-sprite-state={state === 'ready' ? 'ready' : state}
            data-frame-index={frameIndex}
            data-box-width={boxWidth}
            data-box-height={boxHeight}
        >
            <div
                className={[
                    'sprite-sheet-renderer__float',
                    floatTransform && animating ? 'sprite-sheet-renderer--float' : '',
                ].filter(Boolean).join(' ')}
            >
                <div className="sprite-sheet-renderer__frame" style={contentStyle} />
            </div>
        </div>
    );
}

export default SpriteSheetRenderer;
