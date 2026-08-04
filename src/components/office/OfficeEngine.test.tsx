// @vitest-environment happy-dom

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NON_PRODUCTION_OVERLAY } from '../../office/sampleOverlay';
import type { OfficeOverlayDocument } from '../../office/types';
import { OfficeEngine } from './OfficeEngine';

vi.mock('./OfficeViewport', () => ({
    OfficeViewport: ({ document }: { document: OfficeOverlayDocument }) => (
        <div data-testid="office-viewport-stub">{document.entities.length} entities</div>
    ),
}));

vi.mock('../../office/floor1/runtime', () => ({
    loadVerifiedProductionOverlay: vi.fn(async () => null),
}));

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((promiseResolve, promiseReject) => {
        resolve = promiseResolve;
        reject = promiseReject;
    });
    return { promise, resolve, reject };
}

describe('OfficeEngine candidate loading lifecycle', () => {
    beforeEach(() => {
        window.history.replaceState({}, '', '/?floor1Review=candidate');
    });

    afterEach(() => {
        vi.useRealTimers();
        cleanup();
        vi.restoreAllMocks();
    });

    it('shows loading and never mounts OfficeViewport before a valid document exists', () => {
        const pending = deferred<OfficeOverlayDocument>();
        render(<OfficeEngine active candidateLoader={() => pending.promise} />);
        expect(screen.getByRole('status').textContent).toContain('Loading Floor 1 candidate data');
        expect(screen.queryByTestId('office-viewport-stub')).toBeNull();
    });

    it('transitions from candidate loading to the office and automatic sandbox warning', async () => {
        const pending = deferred<OfficeOverlayDocument>();
        render(<OfficeEngine active candidateLoader={() => pending.promise} />);
        await act(async () => pending.resolve(NON_PRODUCTION_OVERLAY));
        expect(screen.getByTestId('office-viewport-stub')).toBeTruthy();
        expect(screen.getByText(/Provisional, unverified Floor 1 geometry/)).toBeTruthy();
    });

    it('transitions a rejected candidate load to a stage-specific visible error', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        render(<OfficeEngine active candidateLoader={() => Promise.reject(new Error('rooms.json malformed'))} />);
        expect(await screen.findByText(/rooms.json malformed/)).toBeTruthy();
        expect(consoleError).toHaveBeenCalled();
    });

    it('uses a bounded terminal timeout instead of loading forever', async () => {
        vi.useFakeTimers();
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const pending = deferred<OfficeOverlayDocument>();
        const view = render(<OfficeEngine active candidateLoader={() => pending.promise} />);
        await act(async () => { await vi.advanceTimersByTimeAsync(10_001); });
        expect(screen.getByText(/timed out after 10 seconds/)).toBeTruthy();
        expect(screen.queryByRole('status')).toBeNull();
        vi.useRealTimers();
        view.unmount();
    });

    it('ignores stale async completion after unmount', async () => {
        const pending = deferred<OfficeOverlayDocument>();
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const view = render(<OfficeEngine active candidateLoader={() => pending.promise} />);
        view.unmount();
        await act(async () => pending.resolve(NON_PRODUCTION_OVERLAY));
        expect(consoleError).not.toHaveBeenCalled();
    });

    it('does not duplicate candidate loads when the application view becomes inactive and active again', () => {
        const pending = deferred<OfficeOverlayDocument>();
        const loader = vi.fn(() => pending.promise);
        const view = render(<OfficeEngine active candidateLoader={loader} />);
        view.rerender(<OfficeEngine active={false} candidateLoader={loader} />);
        view.rerender(<OfficeEngine active candidateLoader={loader} />);
        expect(loader).toHaveBeenCalledTimes(1);
    });
});
