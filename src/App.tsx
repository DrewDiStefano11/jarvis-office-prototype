import { lazy, Suspense, useState } from 'react';
import { LegacyAgentSimulation } from './components/LegacyAgentSimulation';
import { OfficeEngine } from './components/office/OfficeEngine';
import { Floor1VisualLab } from './components/office/Floor1VisualLab';
import { isAgentSpriteVisualLabRequested } from './office/sprites/routes';
import './app.css';

type ApplicationView = 'office-engine' | 'agent-simulation';

const AgentSpriteVisualLab = import.meta.env.DEV
    ? lazy(() => import('./components/office/AgentSpriteVisualLab').then(module => ({ default: module.AgentSpriteVisualLab })))
    : null;

function App() {
    const [view, setView] = useState<ApplicationView>('office-engine');
    const visualLab = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('visualLab') : null;
    if (AgentSpriteVisualLab && isAgentSpriteVisualLabRequested(window.location.search)) {
        return (
            <Suspense fallback={<main><p role="status">Loading sprite laboratory…</p></main>}>
                <AgentSpriteVisualLab />
            </Suspense>
        );
    }
    if (visualLab === 'floor1-registration') return <Floor1VisualLab mode="registration" />;
    if (visualLab === 'floor1-provisional') return <Floor1VisualLab mode="provisional" />;
    return (
        <div className="application-shell">
            <nav className="view-switcher" aria-label="Prototype view">
                <button
                    type="button"
                    aria-pressed={view === 'office-engine'}
                    onClick={() => setView('office-engine')}
                >
                    Office engine
                </button>
                <button
                    type="button"
                    aria-pressed={view === 'agent-simulation'}
                    onClick={() => setView('agent-simulation')}
                >
                    Agent simulation
                </button>
            </nav>
            <div className="application-view">
                <div
                    className="application-view__panel"
                    hidden={view !== 'office-engine'}
                    aria-hidden={view !== 'office-engine'}
                    inert={view !== 'office-engine'}
                >
                    <OfficeEngine active={view === 'office-engine'} />
                </div>
                <div
                    className="application-view__panel"
                    hidden={view !== 'agent-simulation'}
                    aria-hidden={view !== 'agent-simulation'}
                    inert={view !== 'agent-simulation'}
                >
                    <LegacyAgentSimulation active={view === 'agent-simulation'} />
                </div>
            </div>
        </div>
    );
}

export default App;
