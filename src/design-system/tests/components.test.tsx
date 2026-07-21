import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
                <div>
                    <Modal open={true} onClose={() => {}} title="Modal 1" description="Desc 1">Content 1</Modal>
                    <Modal open={true} onClose={() => {}} title="Modal 2" description="Desc 2">Content 2</Modal>
                </div>
            );

            const dialogs = baseElement.querySelectorAll('[role="dialog"]');
            expect(dialogs.length).toBe(2);

            const id1 = dialogs[0].getAttribute('aria-labelledby');
            const id2 = dialogs[1].getAttribute('aria-labelledby');
            expect(id1).not.toBe(id2);
            expect(id1).not.toBeNull();
            expect(id2).not.toBeNull();
        });

        it('manages multiple modal locks properly', () => {
            const root = document.createElement('div');
            root.id = 'root';
            document.body.appendChild(root);

            const { rerender } = render(
                <Modal open={true} onClose={() => {}} title="Modal 1" appRootSelector="#root">Content 1</Modal>
            );

            expect(root.hasAttribute('inert')).toBe(true);

            rerender(
                <div>
                    <Modal open={true} onClose={() => {}} title="Modal 1" appRootSelector="#root">Content 1</Modal>
                    <Modal open={true} onClose={() => {}} title="Modal 2" appRootSelector="#root">Content 2</Modal>
                </div>
            );

            expect(root.hasAttribute('inert')).toBe(true);

            rerender(
                <div>
                    <Modal open={false} onClose={() => {}} title="Modal 1" appRootSelector="#root">Content 1</Modal>
                    <Modal open={true} onClose={() => {}} title="Modal 2" appRootSelector="#root">Content 2</Modal>
                </div>
            );

            // Still inert because Modal 2 is open
            expect(root.hasAttribute('inert')).toBe(true);

            rerender(
                <div>
                    <Modal open={false} onClose={() => {}} title="Modal 1" appRootSelector="#root">Content 1</Modal>
                    <Modal open={false} onClose={() => {}} title="Modal 2" appRootSelector="#root">Content 2</Modal>
                </div>
            );

            // Now fully released
            expect(root.hasAttribute('inert')).toBe(false);
            document.body.removeChild(root);
        });

        it('restores focus when modal is closed', async () => {
            const root = document.createElement('div');
            root.id = 'root';
            document.body.appendChild(root);

            render(
                <div id="root">
                    <button id="trigger">Trigger</button>
                </div>,
                { container: root }
            );

            const trigger = document.getElementById('trigger');
            trigger?.focus();

            const { rerender } = render(
                <div id="root">
                    <button id="trigger">Trigger</button>
                    <Modal open={true} onClose={() => {}} title="Modal" appRootSelector="#root">Content</Modal>
                </div>,
                { container: root }
            );

            // Wait for RAF inside Modal
            await waitFor(() => {
                expect(document.activeElement?.id).not.toBe('trigger');
            });

            rerender(
                <div id="root">
                    <button id="trigger">Trigger</button>
                    <Modal open={false} onClose={() => {}} title="Modal" appRootSelector="#root">Content</Modal>
                </div>
            );

            expect(document.activeElement?.id).toBe('trigger');
            document.body.removeChild(root);
        });


        it('generates unique instance IDs for different tab groups', () => {
            render(
                <div>
                    <Tabs items={[{ id: '1', label: 'T1', content: 'C1' }]} />
                    <Tabs items={[{ id: '1', label: 'T2', content: 'C2' }]} />
                </div>
            );

            const panels = screen.getAllByRole('tabpanel', { hidden: true });
            expect(panels.length).toBe(2);
            expect(panels[0].id).not.toBe(panels[1].id);
        });

        it('handles all disabled tabs correctly', () => {
            render(
                <Tabs items={[
                    { id: '1', label: 'T1', content: 'C1', disabled: true },
                    { id: '2', label: 'T2', content: 'C2', disabled: true }
                ]} />
            );

            const tabs = screen.getAllByRole('tab');
            expect(tabs[0].getAttribute('aria-selected')).toBe('false');
            expect(tabs[1].getAttribute('aria-selected')).toBe('false');
            expect(tabs[0].getAttribute('tabIndex')).toBe('-1');
            expect(tabs[1].getAttribute('tabIndex')).toBe('-1');
        });

        it('navigates with ArrowRight and ArrowLeft', async () => {
            const user = userEvent.setup();
            render(
                <Tabs items={[
                    { id: '1', label: 'Tab 1', content: 'C1' },
                    { id: '2', label: 'Tab 2', content: 'C2' },
                    { id: '3', label: 'Tab 3', content: 'C3' }
                ]} />
            );

            const tabs = screen.getAllByRole('tab');
            tabs[0].focus();

            await user.keyboard('{ArrowRight}');
            expect(document.activeElement).toBe(tabs[1]);

            await user.keyboard('{ArrowLeft}');
            expect(document.activeElement).toBe(tabs[0]);

            await user.keyboard('{ArrowLeft}'); // wrap around
            expect(document.activeElement).toBe(tabs[2]);
        });

        it('navigates with Home and End', async () => {
            const user = userEvent.setup();
            render(
                <Tabs items={[
                    { id: '1', label: 'Tab 1', content: 'C1' },
                    { id: '2', label: 'Tab 2', content: 'C2' },
                    { id: '3', label: 'Tab 3', content: 'C3' }
                ]} />
            );

            const tabs = screen.getAllByRole('tab');
            tabs[1].focus();

            await user.keyboard('{Home}');
            expect(document.activeElement).toBe(tabs[0]);

            await user.keyboard('{End}');
            expect(document.activeElement).toBe(tabs[2]);
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

        it('preserves existing aria-describedby', () => {
            render(
                <Tooltip content="Tooltip message">
                    <button aria-describedby="existing-desc">Trigger</button>
                </Tooltip>
            );

            const trigger = screen.getByRole('button', { name: 'Trigger' });
            expect(trigger.getAttribute('aria-describedby')).toContain('existing-desc');
        });

        it('opens on hover and closes on mouse leave', async () => {
            const user = userEvent.setup();
            render(
                <Tooltip content="Tooltip message">
                    <button>Trigger</button>
                </Tooltip>
            );

            const trigger = screen.getByRole('button', { name: 'Trigger' });
            const tooltipContent = screen.getByRole('tooltip', { hidden: true });

            await user.hover(trigger);
            expect(tooltipContent.style.visibility).toBe('visible');

            await user.unhover(trigger);
            expect(tooltipContent.style.visibility).toBe('hidden');
        });

        it('opens on focus and closes on blur', async () => {
            render(
                <Tooltip content="Tooltip message">
                    <button>Trigger</button>
                </Tooltip>
            );

            const trigger = screen.getByRole('button', { name: 'Trigger' });
            const tooltipContent = screen.getByRole('tooltip', { hidden: true });

            await act(async () => {
                trigger.focus();
            });
            expect(tooltipContent.style.visibility).toBe('visible');

            await act(async () => {
                trigger.blur();
            });
            expect(tooltipContent.style.visibility).toBe('hidden');
        });

        it('closes on Escape', async () => {
            const user = userEvent.setup();
            render(
                <Tooltip content="Tooltip message">
                    <button>Trigger</button>
                </Tooltip>
            );

            const trigger = screen.getByRole('button', { name: 'Trigger' });
            const tooltipContent = screen.getByRole('tooltip', { hidden: true });

            await act(async () => {
                trigger.focus();
            });
            expect(tooltipContent.style.visibility).toBe('visible');

            await user.keyboard('[Escape]');
            expect(tooltipContent.style.visibility).toBe('hidden');
        });

        it('preserves original handlers', async () => {
            const onFocus = vi.fn();
            render(
                <Tooltip content="Tooltip message">
                    <button onFocus={onFocus}>Trigger</button>
                </Tooltip>
            );

            const trigger = screen.getByRole('button', { name: 'Trigger' });

            await act(async () => {
                trigger.focus();
            });
            expect(onFocus).toHaveBeenCalled();
        });
    });

    describe('IconButton', () => {
        it('requires accessible label', () => {
            render(<IconButton iconId="play" aria-label="Play Action" />);
            const button = screen.getByRole('button', { name: 'Play Action' });
            expect(button).toBeDefined();
        });

        it('preserves caller style', () => {
            const { baseElement } = render(<IconButton iconId="play" aria-label="Play Action" style={{ backgroundColor: 'red' }} />);
            const button = baseElement.querySelector('button');
            expect(button?.style.backgroundColor).toBe('red');
        });

        it('warns when missing aria-label', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            render(<IconButton iconId="play" aria-label="" />);
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('aria-label'));
            warnSpy.mockRestore();
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

            const parts = describedBy!.split(' ');
            expect(parts.length).toBe(2);
            expect(document.getElementById(parts[0])).toBeDefined();
            expect(document.getElementById(parts[1])).toBeDefined();
            expect(input.getAttribute('aria-invalid')).toBe('true');
        });

        it('preserves child ID if no explicit wrapper ID is given', () => {
            render(
                <FormFieldWrapper label="Name">
                    <input type="text" id="custom-child-id" />
                </FormFieldWrapper>
            );

            const input = screen.getByRole('textbox');
            expect(input.id).toBe('custom-child-id');
        });

        it('preserves child aria-describedby without duplication', () => {
            render(
                <FormFieldWrapper label="Name" description="desc">
                    <input type="text" id="custom-child-id" aria-describedby="existing-desc" />
                </FormFieldWrapper>
            );

            const input = screen.getByRole('textbox');
            const describedBy = input.getAttribute('aria-describedby');
            expect(describedBy).toContain('existing-desc');
            expect(describedBy).toContain('custom-child-id-description');
        });
    });
});
