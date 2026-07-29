// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentSpriteVisualLab } from './AgentSpriteVisualLab';

class LoadedImage {
    naturalWidth = 1086;
    naturalHeight = 1448;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_value: string) {
        queueMicrotask(() => this.onload?.());
    }
}

beforeEach(() => {
    vi.stubGlobal('Image', LoadedImage);
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('agent sprite visual laboratory', () => {
    it('exposes inventory, playback, frame stepping, overlays, and reduced motion', () => {
        render(<AgentSpriteVisualLab />);
        expect(screen.getByRole('heading', { name: 'Agent sprite laboratory' })).toBeTruthy();
        expect(screen.getByLabelText('Inventory summary').textContent).toContain('18');
        fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
        expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Next frame' }));
        expect(screen.getByText('Frame 1')).toBeTruthy();
        fireEvent.click(screen.getByLabelText('Reduced motion'));
        expect(screen.getByText(/static frame 0/)).toBeTruthy();
        expect(screen.getByLabelText('Anchor crosshair')).toBeTruthy();
        expect(screen.getByLabelText('Ground contact line')).toBeTruthy();
    });

    it('shows exact blocking reasons and disables unavailable animation controls', () => {
        render(<AgentSpriteVisualLab />);
        fireEvent.change(screen.getByLabelText('Asset'), { target: { value: 'nexus-tube-reference' } });
        expect(screen.getByText('Source blocked from runtime use')).toBeTruthy();
        expect(screen.getAllByText(/not evenly divisible/).length).toBeGreaterThan(0);
        expect((screen.getByLabelText('Animation state') as HTMLSelectElement).disabled).toBe(true);
        expect(screen.getByText('Not generated. The last valid runtime directory is preserved.')).toBeTruthy();
    });
});
