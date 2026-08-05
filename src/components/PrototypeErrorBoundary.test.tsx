// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PrototypeErrorBoundary } from './PrototypeErrorBoundary';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

it('renders a visible development recovery panel when a prototype surface throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const Broken = () => { throw new Error('viewport construction failed'); };
    render(<PrototypeErrorBoundary surface="Agent simulation"><Broken /></PrototypeErrorBoundary>);
    expect(screen.getByRole('alert').textContent).toContain('Agent simulation could not render');
    expect(screen.getByRole('alert').textContent).toContain('viewport construction failed');
    expect(screen.getByRole('button', { name: 'Retry surface' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reload application' })).toBeTruthy();
});
