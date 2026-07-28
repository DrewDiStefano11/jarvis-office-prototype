import { AnimationDefinition } from './types';

export function buildPlaybackSequence(animation: AnimationDefinition): readonly number[] {
    const forward = [...animation.frameSequence];
    if (!animation.pingPong || forward.length < 3) return forward;
    return [...forward, ...forward.slice(1, -1).reverse()];
}

export function nextPlaybackIndex(
    currentIndex: number,
    sequenceLength: number,
    loop: boolean,
): number {
    if (sequenceLength <= 0) return 0;
    const next = currentIndex + 1;
    if (next < sequenceLength) return next;
    return loop ? 0 : sequenceLength - 1;
}
