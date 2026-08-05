// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const presentations: string[] = [];

vi.mock('./components/office/OfficeEngine', () => ({
    OfficeEngine: ({ presentation }: { presentation: string }) => {
        presentations.push(presentation);
        return <section aria-label="shared office runtime" data-presentation={presentation}>{presentation}</section>;
    },
}));

afterEach(() => {
    cleanup();
    presentations.length = 0;
    window.history.replaceState({}, '', '/');
});

describe('application view lifecycle', () => {
    it('uses one shared office runtime for inspection and simulation presentations', () => {
        render(<App />);
        const runtime = screen.getByLabelText('shared office runtime');
        expect(runtime.getAttribute('data-presentation')).toBe('inspection');
        fireEvent.click(screen.getByRole('button', { name: 'Agent simulation' }));
        expect(screen.getByLabelText('shared office runtime').getAttribute('data-presentation')).toBe('simulation');
        fireEvent.click(screen.getByRole('button', { name: 'Office engine' }));
        expect(screen.getByLabelText('shared office runtime').getAttribute('data-presentation')).toBe('inspection');
    });

    it('keeps exactly one simulation surface mounted while switching views', () => {
        const { container } = render(<App />);
        for (let index = 0; index < 3; index += 1) {
            fireEvent.click(screen.getByRole('button', { name: 'Agent simulation' }));
            fireEvent.click(screen.getByRole('button', { name: 'Office engine' }));
        }
        expect(container.querySelectorAll('[aria-label="shared office runtime"]')).toHaveLength(1);
        expect(container.querySelector('canvas')).toBeNull();
    });

    it('exposes pressed state for the active debugger purpose', () => {
        render(<App />);
        const office = screen.getByRole('button', { name: 'Office engine' });
        const simulation = screen.getByRole('button', { name: 'Agent simulation' });
        expect(office.getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(simulation);
        expect(office.getAttribute('aria-pressed')).toBe('false');
        expect(simulation.getAttribute('aria-pressed')).toBe('true');
    });
});
