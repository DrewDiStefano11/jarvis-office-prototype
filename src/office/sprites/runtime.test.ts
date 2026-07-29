// @vitest-environment happy-dom

import { describe, expect, it, vi } from 'vitest';
import { AnimationClock } from './runtime';

describe('shared animation clock', () => {
    it('uses one scheduled frame for many subscribers and cleans up', () => {
        const callbacks: FrameRequestCallback[] = [];
        const request = vi.fn((callback: FrameRequestCallback) => {
            callbacks.push(callback);
            return callbacks.length;
        });
        const cancel = vi.fn();
        const clock = new AnimationClock(request, cancel);
        const first = vi.fn();
        const second = vi.fn();
        const unsubscribeFirst = clock.subscribe(first);
        const unsubscribeSecond = clock.subscribe(second);
        expect(request).toHaveBeenCalledTimes(1);
        callbacks[0](100);
        expect(first).toHaveBeenCalledWith(0);
        expect(second).toHaveBeenCalledWith(0);
        expect(request).toHaveBeenCalledTimes(2);
        unsubscribeFirst();
        unsubscribeSecond();
        expect(clock.subscriberCount).toBe(0);
        expect(cancel).toHaveBeenCalledTimes(1);
    });

    it('pauses hidden surfaces without growing frame requests', () => {
        const request = vi.fn(() => 42);
        const cancel = vi.fn();
        const clock = new AnimationClock(request, cancel);
        clock.subscribe(() => undefined);
        clock.setActive(false);
        clock.setActive(false);
        expect(cancel).toHaveBeenCalledTimes(1);
        expect(request).toHaveBeenCalledTimes(1);
    });

    it('calls browser frame methods with their required window receiver', () => {
        const request = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(7);
        const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
        const clock = new AnimationClock();
        const unsubscribe = clock.subscribe(() => undefined);
        expect(request).toHaveBeenCalledTimes(1);
        unsubscribe();
        expect(cancel).toHaveBeenCalledWith(7);
    });
});
