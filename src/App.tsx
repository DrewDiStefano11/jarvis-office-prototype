import { useEffect, useMemo, useRef, useState } from 'react';
import { FloorStatusPanel, type PanelMode } from './components/FloorStatusPanel';
import { getApplicationFloor } from './domain/building/applicationFloors';
import type { CameraCommand } from './game/scenes/OfficeScene';
import { EventBus } from './game/EventBus';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import type { InspectionDetails } from './domain/building/inspection';
import { DEFAULT_VIEW_PREFERENCES, type ViewPreferences } from './rendering/viewState';

const defaultPreferences: ViewPreferences = {
    ...DEFAULT_VIEW_PREFERENCES,
    effects: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'on',
};

function loadSessionValue<T>(key: string, fallback: T): T {
    try {
        const value = sessionStorage.getItem(key);
        return value ? JSON.parse(value) as T : fallback;
    } catch {
        return fallback;
    }
}

function App() {
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const floor = useMemo(() => getApplicationFloor(), []);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string>();
    const [panelMode, setPanelMode] = useState<PanelMode>(() => loadSessionValue('jarvis-panel-mode', window.innerHeight < 820 ? 'compact' : 'expanded'));
    const [preferences, setPreferences] = useState<ViewPreferences>(() => loadSessionValue('jarvis-view-preferences', defaultPreferences));
    const [cameraState, setCameraState] = useState({ zoom: 1, view: 'Overview', scrollX: 0, scrollY: 0 });
    const [selection, setSelection] = useState<InspectionDetails>();
    const [hover, setHover] = useState<{ details: InspectionDetails; x: number; y: number }>();
    const [presentation, setPresentation] = useState(false);

    useEffect(() => {
        const onRendered = () => {
            setReady(true);
            const saved = loadSessionValue<{ zoom: number; scrollX: number; scrollY: number } | undefined>('jarvis-camera-state', undefined);
            if (saved) window.setTimeout(() => EventBus.emit('floor-camera-restore', saved), 0);
        };
        const onError = (message: string) => { setError(message); setReady(false); };
        const onCamera = (state: { zoom: number; view: string; scrollX: number; scrollY: number }) => setCameraState(state);
        const onSelection = (details?: InspectionDetails) => setSelection(details);
        const onHover = (payload?: { details: InspectionDetails; x: number; y: number }) => setHover(payload);
        const onPresentationExit = () => setPresentation(false);
        const onViewReset = () => sessionStorage.removeItem('jarvis-camera-state');
        EventBus.on('floor-rendered', onRendered);
        EventBus.on('floor-render-error', onError);
        EventBus.on('floor-camera-state', onCamera);
        EventBus.on('floor-selection', onSelection);
        EventBus.on('floor-hover', onHover);
        EventBus.on('floor-presentation-exit', onPresentationExit);
        EventBus.on('floor-view-reset', onViewReset);
        return () => {
            EventBus.off('floor-rendered', onRendered);
            EventBus.off('floor-render-error', onError);
            EventBus.off('floor-camera-state', onCamera);
            EventBus.off('floor-selection', onSelection);
            EventBus.off('floor-hover', onHover);
            EventBus.off('floor-presentation-exit', onPresentationExit);
            EventBus.off('floor-view-reset', onViewReset);
        };
    }, []);

    useEffect(() => {
        sessionStorage.setItem('jarvis-panel-mode', JSON.stringify(panelMode));
        const left = presentation ? 18 : panelMode === 'expanded' ? 308 : panelMode === 'compact' ? 250 : 72;
        EventBus.emit('floor-ui-safe-area', { top: 18, right: 18, bottom: 18, left });
        if (ready && presentation) window.setTimeout(() => EventBus.emit('floor-camera-command', 'fit'), 0);
    }, [panelMode, presentation, ready]);

    useEffect(() => {
        sessionStorage.setItem('jarvis-view-preferences', JSON.stringify(preferences));
        EventBus.emit('floor-view-preferences', preferences);
    }, [preferences, ready]);

    useEffect(() => {
        if (!ready) return;
        sessionStorage.setItem('jarvis-camera-state', JSON.stringify({ zoom: cameraState.zoom, scrollX: cameraState.scrollX, scrollY: cameraState.scrollY }));
    }, [cameraState, ready]);

    const sendCameraCommand = (command: CameraCommand) => EventBus.emit('floor-camera-command', command);
    const clearSelection = () => EventBus.emit('floor-selection-command', undefined);
    const navigate = (entityId: string) => EventBus.emit('floor-camera-center', entityId);
    const enterPresentation = () => setPresentation(true);

    return (
        <main id="app-root">
            <section className="office-canvas-pane" aria-label={`Interactive isometric map of ${floor.name}`}>
                <PhaserGame ref={phaserRef} floor={floor} />
                {!ready && !error && (
                    <div className="loading-screen" role="status" aria-live="polite">
                        <div className="loading-title">JARVIS HQ</div>
                        <div>INITIALIZING FLOOR 1</div>
                        <div className="loading-track"><span /></div>
                    </div>
                )}
                {error && (
                    <div className="error-screen" role="alert">
                        <div className="loading-title">FLOOR INITIALIZATION FAILED</div>
                        <p>{error}</p>
                        <button type="button" onClick={() => window.location.reload()}>Retry</button>
                    </div>
                )}
                {ready && !presentation && (
                    <FloorStatusPanel
                        floor={floor}
                        mode={panelMode}
                        zoom={cameraState.zoom}
                        viewName={cameraState.view}
                        preferences={preferences}
                        selection={selection}
                        onModeChange={setPanelMode}
                        onCameraCommand={sendCameraCommand}
                        onPreferenceChange={setPreferences}
                        onClearSelection={clearSelection}
                        onNavigate={navigate}
                        onPresentation={enterPresentation}
                    />
                )}
                {ready && hover && (
                    <div className="pixel-tooltip" style={{ left: hover.x + 16, top: hover.y + 14 }} role="tooltip">
                        <strong>{hover.details.title}</strong><span>{hover.details.subtitle}</span>
                    </div>
                )}
                {!presentation && <div className="camera-help" aria-hidden="true">DRAG TO PAN · WHEEL TO ZOOM · F TO FIT · 0 TO RESET</div>}
                {presentation && <button className="presentation-exit" type="button" onClick={() => setPresentation(false)}>Exit Presentation</button>}
                <p className="screen-reader-summary">
                    {floor.name}. Twenty-four permanent agents, four vacancies, eight temporary desks, four sandbox cells, and thirty-eight visible occupants.
                </p>
            </section>
        </main>
    );
}

export default App;
