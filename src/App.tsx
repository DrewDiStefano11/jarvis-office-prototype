import { useState } from 'react';
import { LegacyAgentSimulation } from './components/LegacyAgentSimulation';
import { OfficeEngine } from './components/office/OfficeEngine';
import './app.css';

type ApplicationView = 'office-engine' | 'agent-simulation';

function App() {
    const [view, setView] = useState<ApplicationView>('office-engine');
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
