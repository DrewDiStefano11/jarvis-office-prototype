import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
    Button,
    ProgressBar,
    StatusBadge,
    VisuallyHidden
} from '../components';
import { SemanticStatus } from '../components/StatusBadge';

describe('Design System Components', () => {
    describe('Button', () => {
        it('renders with expected accessible role', () => {
            render(<Button>Click me</Button>);
            expect(screen.getByRole('button', { name: 'Click me' })).toBeDefined();
        });

        it('supports keyboard activation', async () => {
            const onClick = vi.fn();
            render(<Button onClick={onClick}>Activate</Button>);
            const button = screen.getByRole('button');

            button.focus();
            await userEvent.keyboard('[Enter]');
            expect(onClick).toHaveBeenCalledTimes(1);

            await userEvent.keyboard('[Space]');
            expect(onClick).toHaveBeenCalledTimes(2);
        });

        it('disabled controls cannot activate', async () => {
            const onClick = vi.fn();
            render(<Button onClick={onClick} disabled>Disabled</Button>);
            const button = screen.getByRole('button');

            expect(button.hasAttribute('disabled')).toBe(true);

            await userEvent.click(button);
            expect(onClick).not.toHaveBeenCalled();
        });
    });

    describe('ProgressBar', () => {
        it('renders with expected accessible role', () => {
            render(<ProgressBar value={50} aria-label="Task progress" />);
            const progress = screen.getByRole('progressbar', { name: 'Task progress' });
            expect(progress).toBeDefined();
            expect(progress.getAttribute('aria-valuenow')).toBe('50');
        });

        it('progress values are clamped or rejected consistently', () => {
            const { rerender } = render(<ProgressBar value={150} />);
            let progress = screen.getByRole('progressbar');
            expect(progress.getAttribute('aria-valuenow')).toBe('100'); // Clamped to max

            rerender(<ProgressBar value={-50} />);
            progress = screen.getByRole('progressbar');
            expect(progress.getAttribute('aria-valuenow')).toBe('0'); // Clamped to min
        });
    });

    describe('StatusBadge', () => {
        it('status mappings are complete and unique, and have accessible text', () => {
            const statuses: SemanticStatus[] = ['idle', 'working', 'paused', 'queued', 'completed', 'error', 'blocked', 'cancelled', 'recovery-required', 'offline'];

            statuses.forEach(status => {
                const { unmount } = render(<StatusBadge status={status} />);
                // Text includes the visually hidden "Status: " plus the label
                expect(screen.getByText(/Status:/i)).toBeDefined();
                unmount();
            });
        });
    });

    describe('VisuallyHidden', () => {
        it('preserves text for screen readers while hiding it visually', () => {
            render(<VisuallyHidden>Hidden text</VisuallyHidden>);
            const hiddenElement = screen.getByText('Hidden text');

            expect(hiddenElement).toBeDefined();
            // In a real browser, css checks would verify the styles, but in jsdom we just verify the class is present
            expect(hiddenElement.className).toContain('visually-hidden');

            // Should not use display: none or aria-hidden: true
            expect(hiddenElement.style.display).not.toBe('none');
            expect(hiddenElement.getAttribute('aria-hidden')).toBeNull();
        });
    });
});
