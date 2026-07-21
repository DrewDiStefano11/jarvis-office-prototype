import React, { useState } from 'react';
import {
    Button,
    IconButton,
    Badge,
    StatusBadge,
    Card,
    Panel,
    ProgressBar,
    Tooltip,
    Modal,
    Tabs,
    EmptyState,
    InlineAlert,
    LoadingState,
    FormFieldWrapper,
    SemanticStatus
} from '../components';

const statuses: SemanticStatus[] = ['idle', 'working', 'paused', 'queued', 'completed', 'error', 'blocked', 'cancelled', 'recovery-required', 'offline'];

export const ShowcaseApp: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [progress, setProgress] = useState(50);

    return (
        <div style={{ padding: 'var(--spacing-8)', fontFamily: 'var(--font-family-base)', color: 'var(--color-text-primary)' }}>
            <h1 style={{ marginBottom: 'var(--spacing-8)' }}>UI Design System Showcase</h1>

            <section style={{ marginBottom: 'var(--spacing-8)' }}>
                <h2>Buttons</h2>
                <div style={{ display: 'flex', gap: 'var(--spacing-4)', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Button variant="primary">Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="primary" disabled>Disabled</Button>
                    <Button variant="primary" size="sm">Small</Button>
                    <Button variant="primary" size="lg">Large</Button>
                    <IconButton iconId="play" aria-label="Play" />
                    <IconButton iconId="pause" aria-label="Pause" disabled />
                </div>
            </section>

            <section style={{ marginBottom: 'var(--spacing-8)' }}>
                <h2>Badges & Statuses</h2>
                <div style={{ display: 'flex', gap: 'var(--spacing-4)', flexWrap: 'wrap' }}>
                    <Badge>Default Badge</Badge>
                    {statuses.map(s => <StatusBadge key={s} status={s} />)}
                </div>
            </section>

            <section style={{ marginBottom: 'var(--spacing-8)' }}>
                <h2>Cards & Panels</h2>
                <div style={{ display: 'grid', gap: 'var(--spacing-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                    <Card>
                        <h3 style={{ marginTop: 0 }}>Card Component</h3>
                        <p>Used for primary elevated content.</p>
                    </Card>
                    <Panel>
                        <h3 style={{ marginTop: 0 }}>Panel Component</h3>
                        <p>Used for secondary flat grouped content.</p>
                    </Panel>
                </div>
            </section>

            <section style={{ marginBottom: 'var(--spacing-8)' }}>
                <h2>Progress Bar</h2>
                <div style={{ maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                    <ProgressBar value={progress} />
                    <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                        <Button size="sm" onClick={() => setProgress(p => Math.max(0, p - 10))}>Decrease</Button>
                        <Button size="sm" onClick={() => setProgress(p => Math.min(100, p + 10))}>Increase</Button>
                    </div>
                </div>
            </section>

            <section style={{ marginBottom: 'var(--spacing-8)' }}>
                <h2>Interactive Primitives</h2>
                <div style={{ display: 'flex', gap: 'var(--spacing-6)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div>
                        <Tooltip content="I am a helpful tooltip">
                            <Button>Hover me</Button>
                        </Tooltip>
                    </div>
                    <div>
                        <Button onClick={() => setIsModalOpen(true)}>Open Modal</Button>
                        <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Example Modal">
                            <p>This is a modal. Press ESC or the close button to dismiss.</p>
                            <Button onClick={() => setIsModalOpen(false)}>Confirm</Button>
                        </Modal>
                    </div>
                </div>
            </section>

            <section style={{ marginBottom: 'var(--spacing-8)' }}>
                <h2>Tabs</h2>
                <div style={{ maxWidth: '600px', marginBottom: 'var(--spacing-4)' }}>
                    <Tabs
                        aria-label="Example tabs 1"
                        items={[
                            { id: 'tab1', label: 'Details', content: <p>Details content here.</p> },
                            { id: 'tab2', label: 'Settings', content: <p>Settings content here.</p> },
                            { id: 'tab3', label: 'Logs', content: <p>Logs content here.</p> }
                        ]}
                    />
                </div>
                <div style={{ maxWidth: '600px' }}>
                    <Tabs
                        aria-label="Example tabs 2"
                        items={[
                            { id: 'tabA', label: 'Overview', content: <p>Overview content.</p> },
                            { id: 'tabB', label: 'Metrics', content: <p>Metrics content.</p> }
                        ]}
                    />
                </div>
            </section>

            <section style={{ marginBottom: 'var(--spacing-8)' }}>
                <h2>Feedback & States</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)', maxWidth: '600px' }}>
                    <InlineAlert variant="info" title="Information" message="This is an informational message." />
                    <InlineAlert variant="success" message="Operation completed successfully." />
                    <InlineAlert variant="warning" title="Warning" message="Please review your settings." />
                    <InlineAlert variant="error" title="Error" message="An error occurred while saving." />

                    <div style={{ border: '1px dashed var(--color-border-subtle)', padding: 'var(--spacing-4)' }}>
                        <EmptyState
                            iconId="agent"
                            title="No Agents Found"
                            description="There are currently no active agents in this department."
                            action={<Button>Hire Agent</Button>}
                        />
                    </div>

                    <div style={{ border: '1px dashed var(--color-border-subtle)', padding: 'var(--spacing-4)' }}>
                        <LoadingState message="Connecting to office..." />
                    </div>
                </div>
            </section>

            <section style={{ marginBottom: 'var(--spacing-8)' }}>
                <h2>Forms</h2>
                <div style={{ maxWidth: '400px' }}>
                    <FormFieldWrapper
                        id="input-demo"
                        label="Agent Name"
                        description="Enter the display name for the agent."
                    >
                        <input id="input-demo" type="text" defaultValue="Jarvis" style={{ padding: 'var(--spacing-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-subtle)' }} />
                    </FormFieldWrapper>

                    <FormFieldWrapper
                        id="input-demo-error"
                        label="Department"
                        error="Department is required."
                    >
                        <input id="input-demo-error" type="text" style={{ padding: 'var(--spacing-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--status-error-border)' }} aria-invalid="true" />
                    </FormFieldWrapper>
                </div>
            </section>
        </div>
    );
};
