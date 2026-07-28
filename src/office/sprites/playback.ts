import { buildPlaybackSequence, nextPlaybackIndex } from '../animation';
import { AnimationDefinition } from '../types';
import { SpriteAnimation, SpriteFrameRect } from './manifestTypes';

/**
 * Elapsed-time sprite playback.
 *
 * Frame selection is a pure function of elapsed milliseconds, so playback is
 * identical on any refresh rate and a hidden tab can be resumed by rebasing the
 * elapsed clock instead of replaying skipped frames.
 */

/**
 * Adapts a manifest animation to the legacy `AnimationDefinition` shape so the
 * existing helpers in `src/office/animation.ts` stay the single source of truth
 * for sequence construction.
 */
export function toAnimationDefinition(animation: SpriteAnimation): AnimationDefinition {
    return {
        frameWidth: animation.frameWidth,
        frameHeight: animation.frameHeight,
        frameCount: animation.totalCellCount,
        columns: animation.columns,
        frameSequence: animation.frameOrder,
        frameDurationMs: animation.defaultFrameDurationMs,
        loop: animation.loopMode === 'loop' || animation.loopMode === 'ping-pong',
        pingPong: animation.loopMode === 'ping-pong',
        idle: false,
    };
}

/**
 * One resolved step of playback.
 *
 * `sourcePosition` is the index into `frameOrder` that this step came from,
 * which is what lets durations stay keyed by position rather than by frame ID.
 * That distinction matters whenever a frame index repeats within one order.
 */
export type ResolvedPlaybackStep = Readonly<{
    frameIndex: number;
    durationMs: number;
    sourcePosition: number;
}>;

/** Positions into `frameOrder`, after direction and ping-pong expansion. */
function resolveSourcePositions(animation: SpriteAnimation): readonly number[] {
    const order = animation.frameOrder;
    if (order.length === 0) return [];

    const forward = animation.playbackDirection === 'reverse'
        ? order.map((_, i) => order.length - 1 - i)
        : order.map((_, i) => i);

    // Expand *positions* (not frame IDs) through the existing shared helper so
    // the ping-pong contract stays defined in one place, while durations remain
    // addressable per position even when a frame index repeats.
    return buildPlaybackSequence({
        ...toAnimationDefinition(animation),
        frameSequence: forward,
    });
}

/** Full ordered playback, with each step carrying its own duration. */
export function resolvePlaybackSteps(animation: SpriteAnimation): readonly ResolvedPlaybackStep[] {
    const durations = animation.frameDurationsMs;
    return resolveSourcePositions(animation).map(sourcePosition => {
        const authored = durations[sourcePosition];
        return {
            frameIndex: animation.frameOrder[sourcePosition],
            durationMs: typeof authored === 'number' && authored > 0
                ? authored
                : animation.defaultFrameDurationMs,
            sourcePosition,
        };
    });
}

/** Expands the manifest frame order into the concrete played sequence. */
export function resolvePlaybackSequence(animation: SpriteAnimation): readonly number[] {
    return resolvePlaybackSteps(animation).map(step => step.frameIndex);
}

/** Duration for each entry of the resolved sequence, in milliseconds. */
export function resolveFrameDurations(animation: SpriteAnimation): readonly number[] {
    return resolvePlaybackSteps(animation).map(step => step.durationMs);
}

export function totalCycleDurationMs(animation: SpriteAnimation): number {
    return resolveFrameDurations(animation).reduce((sum, d) => sum + d, 0);
}

/**
 * Resolves the sequence position for an elapsed time.
 * Returns an index into the resolved playback sequence.
 */
export function sequencePositionAtElapsed(
    animation: SpriteAnimation,
    elapsedMs: number,
): number {
    const durations = resolveFrameDurations(animation);
    if (durations.length === 0) return 0;
    const total = durations.reduce((sum, d) => sum + d, 0);
    if (total <= 0) return 0;

    const clampedElapsed = Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0;

    const looping = animation.loopMode === 'loop' || animation.loopMode === 'ping-pong';
    let time: number;
    if (looping) {
        time = clampedElapsed % total;
    } else if (clampedElapsed >= total) {
        // 'once' and 'hold' both stop; holdBehavior decides which frame shows.
        return animation.holdBehavior === 'first-frame' ? 0 : durations.length - 1;
    } else {
        time = clampedElapsed;
    }

    let accumulated = 0;
    for (let i = 0; i < durations.length; i++) {
        accumulated += durations[i];
        if (time < accumulated) return i;
    }
    return durations.length - 1;
}

/** Resolves the zero-based sheet frame index for an elapsed time. */
export function frameIndexAtElapsed(animation: SpriteAnimation, elapsedMs: number): number {
    const sequence = resolvePlaybackSequence(animation);
    if (sequence.length === 0) return 0;
    return sequence[sequencePositionAtElapsed(animation, elapsedMs)];
}

/** Advances one step through the resolved sequence, honouring the loop mode. */
export function advanceSequencePosition(animation: SpriteAnimation, position: number): number {
    const sequence = resolvePlaybackSequence(animation);
    const looping = animation.loopMode === 'loop' || animation.loopMode === 'ping-pong';
    return nextPlaybackIndex(position, sequence.length, looping);
}

/**
 * Rectangle for a frame index. Uses explicit rectangles when present and falls
 * back to the uniform grid otherwise.
 */
export function frameRectangle(
    animation: SpriteAnimation,
    frameIndex: number,
): SpriteFrameRect | undefined {
    if (animation.frameRectangles) {
        return animation.frameRectangles.find(r => r.index === frameIndex);
    }
    if (frameIndex < 0 || frameIndex >= animation.totalCellCount) return undefined;
    const column = frameIndex % animation.columns;
    const row = Math.floor(frameIndex / animation.columns);
    return {
        index: frameIndex,
        row,
        column,
        x: column * animation.frameWidth,
        y: row * animation.frameHeight,
        width: animation.frameWidth,
        height: animation.frameHeight,
    };
}

/** The frame to display when the user prefers reduced motion. */
export function reducedMotionFrame(animation: SpriteAnimation): number {
    return animation.reducedMotionFrameIndex;
}
