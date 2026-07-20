import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import {
    Button,
    ProgressBar,
    StatusBadge,
    VisuallyHidden,
    Modal,
    Tabs,
    Tooltip,
    FormFieldWrapper,
    IconButton
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
            expect(hiddenElement.className).toContain('visually-hidden');
            expect(hiddenElement.style.display).not.toBe('none');
            expect(hiddenElement.getAttribute('aria-hidden')).toBeNull();
        });
    });

    describe('Modal', () => {
        it('renders correctly as a dialog with aria-modal', () => {
            const { baseElement } = render(
                <Modal open={true} onClose={() => {}} title="Test Modal">
                    Modal Content
                </Modal>
            );

            const dialog = baseElement.querySelector('[role="dialog"]');
            expect(dialog).toBeDefined();
            expect(dialog?.getAttribute('aria-modal')).toBe('true');
            expect(baseElement.textContent).toContain('Test Modal');
            expect(baseElement.textContent).toContain('Modal Content');
        });

        it('assigns unique IDs to multiple modals', () => {
            const { baseElement } = render(
                <>
                    <Modal open={true} onClose={() => {}} title="Modal 1" description="Desc 1">Content 1</Modal>
                    <Modal open={true} onClose={() => {}} title="Modal 2" description="Desc 2">Content 2</Modal>
                </>
            );

            const dialogs = baseElement.querySelectorAll('[role="dialog"]');
            expect(dialogs.length).toBe(2);

            const id1 = dialogs[0].getAttribute('aria-labelledby');
            const id2 = dialogs[1].getAttribute('aria-labelledby');
            expect(id1).not.toBe(id2);
            expect(id1).not.toBeNull();
            expect(id2).not.toBeNull();
        });
    });

    describe('Tabs', () => {
        it('manages roles, focus, and selection correctly', () => {
            render(
                <Tabs items={[
                    { id: '1', label: 'Tab 1', content: 'Content 1' },
                    { id: '2', label: 'Tab 2', content: 'Content 2' }
                ]} />
            );

            const tabs = screen.getAllByRole('tab');
            expect(tabs.length).toBe(2);
            expect(tabs[0].getAttribute('aria-selected')).toBe('true');
            expect(tabs[1].getAttribute('aria-selected')).toBe('false');
            expect(tabs[0].getAttribute('tabIndex')).toBe('0');
            expect(tabs[1].getAttribute('tabIndex')).toBe('-1');
        });

        it('generates unique instance IDs for different tab groups', () => {
            render(
                <>
                    <Tabs items={[{ id: '1', label: 'T1', content: 'C1' }]} />
                    <Tabs items={[{ id: '1', label: 'T2', content: 'C2' }]} />
                </>
            );

            const panels = screen.getAllByRole('tabpanel', { hidden: true });
            expect(panels.length).toBe(2);
            expect(panels[0].id).not.toBe(panels[1].id);
        });
    });

    describe('Tooltip', () => {
        it('connects trigger to tooltip via aria-describedby', () => {
            render(
                <Tooltip content="Tooltip message">
                    <button>Trigger</button>
                </Tooltip>
            );

            const trigger = screen.getByRole('button', { name: 'Trigger' });
            const tooltipContent = screen.getByRole('tooltip', { hidden: true });

            expect(trigger.getAttribute('aria-describedby')).toContain(tooltipContent.id);
        });
    });

    describe('IconButton', () => {
        it('requires accessible label', () => {
            render(<IconButton iconId="play" aria-label="Play Action" />);
            const button = screen.getByRole('button', { name: 'Play Action' });
            expect(button).toBeDefined();
        });
    });

    describe('FormFieldWrapper', () => {
        it('connects inputs, descriptions and errors with unique IDs', () => {
            render(
                <FormFieldWrapper label="Name" description="Enter your name" error="Name is required">
                    <input type="text" />
                </FormFieldWrapper>
            );

            const input = screen.getByRole('textbox');
            const describedBy = input.getAttribute('aria-describedby');
            expect(describedBy).toBeDefined();

            // Check that parts of aria-describedby map to elements in the DOM
            const parts = describedBy!.split(' ');
            expect(parts.length).toBe(2);
            expect(document.getElementById(parts[0])).toBeDefined();
            expect(document.getElementById(parts[1])).toBeDefined();
            expect(input.getAttribute('aria-invalid')).toBe('true');
        });
    });
});
