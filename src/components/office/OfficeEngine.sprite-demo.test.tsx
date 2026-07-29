// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OfficeEngine } from './OfficeEngine';

const viewportProps = vi.hoisted(() => ({ latest: null as Record<string, unknown> | null }));

vi.mock('./OfficeViewport', () => ({
    OfficeViewport: (props: Record<string, unknown>) => {
        viewportProps.latest = props;
        return <div data-testid="viewport" />;
    },
}));

beforeEach(() => {
    viewportProps.latest = null;
    vi.stubGlobal('matchMedia', () => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    }));
});

afterEach(() => {
    cleanup();
    window.history.replaceState({}, '', '/');
    vi.unstubAllGlobals();
});

describe('office sprite demonstration mode', () => {
    it('is query-gated and passes deterministic demo agents without mutating the office document', () => {
        window.history.replaceState({}, '', '/?spriteDemo=agents');
        render(<OfficeEngine active />);
        expect(screen.getByText('Sprite demonstration — positions are not assignments')).toBeTruthy();
        expect(screen.getByLabelText('Sprite demonstration inspector')).toBeTruthy();
        expect(viewportProps.latest?.spriteDemoAgents).toHaveLength(5);
        expect((viewportProps.latest?.document as { production: boolean }).production).toBe(false);
    });

    it('leaves the normal office route unchanged without the query', () => {
        render(<OfficeEngine active />);
        expect(screen.queryByLabelText('Sprite demonstration inspector')).toBeNull();
        expect(viewportProps.latest?.spriteDemoAgents).toEqual([]);
        expect(screen.getByText('Sample fallback — not production Floor 1')).toBeTruthy();
    });
});
