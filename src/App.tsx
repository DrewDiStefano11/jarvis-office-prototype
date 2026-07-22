import { useEffect, useMemo, useRef, useState } from 'react';
import { FloorStatusPanel, type PanelMode } from './components/FloorStatusPanel';
import { getApplicationFloor } from './domain/building/applicationFloors';
import type { CameraCommand } from './game/scenes/OfficeScene';
import { EventBus } from './game/EventBus';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import type { InspectionDetails } from './domain/building/inspection';
import { DEFAULT_VIEW_PREFERENCES, type ViewPreferences } from './rendering/viewState';
import { HighResolutionLabPanel, type VisualLabCardMode } from './components/HighResolutionLabPanel';
import { DEFAULT_VISUAL_LAB_PREFERENCES } from './visual-lab/profiles';
import type { VisualLabMode, VisualLabPreferences, VisualLabSelection } from './visual-lab/types';
import { isHighResolutionVisualLab } from './visual-lab/route';
import { isApprovedFloorProof } from './visual-lab/route';
import { ApprovedProofPanel, type ApprovedProofCardMode } from './components/ApprovedProofPanel';
import { DEFAULT_APPROVED_PROOF_PREFERENCES } from './approved-proof/data';
import type { ApprovedProofPreferences, ApprovedProofSelection } from './approved-proof/types';

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

function FloorApplication() {
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

interface VisualLabRuntimeSummary {
    readonly objectCount: number;
    readonly generatedTextureCount: number;
    readonly activeAnimationCount: number;
}

function HighResolutionLabApplication() {
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const floor = useMemo(() => getApplicationFloor(), []);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string>();
    const [mode, setMode] = useState<VisualLabMode>('comparison');
    const [preferences, setPreferences] = useState<VisualLabPreferences>({ ...DEFAULT_VISUAL_LAB_PREFERENCES });
    const [cameraState, setCameraState] = useState({ zoom: 1, view: 'Fit', scrollX: 0, scrollY: 0 });
    const [selection, setSelection] = useState<VisualLabSelection>();
    const [hover, setHover] = useState<(VisualLabSelection & { readonly x: number; readonly y: number })>();
    const [presentation, setPresentation] = useState(false);
    const [cardMode, setCardMode] = useState<VisualLabCardMode>('expanded');
    const [runtime, setRuntime] = useState<VisualLabRuntimeSummary>({ objectCount: 0, generatedTextureCount: 0, activeAnimationCount: 0 });

    useEffect(() => {
        const onRendered = (summary: VisualLabRuntimeSummary) => { setReady(true); setRuntime(summary); };
        const onError = (message: string) => { setError(message); setReady(false); };
        const onCamera = (state: { zoom: number; view: string; scrollX: number; scrollY: number }) => setCameraState(state);
        const onSelection = (details?: VisualLabSelection) => setSelection(details);
        const onHover = (details?: VisualLabSelection & { readonly x: number; readonly y: number }) => setHover(details);
        EventBus.on('visual-lab-rendered', onRendered);
        EventBus.on('visual-lab-error', onError);
        EventBus.on('visual-lab-camera-state', onCamera);
        EventBus.on('visual-lab-selection', onSelection);
        EventBus.on('visual-lab-hover', onHover);
        return () => {
            EventBus.off('visual-lab-rendered', onRendered);
            EventBus.off('visual-lab-error', onError);
            EventBus.off('visual-lab-camera-state', onCamera);
            EventBus.off('visual-lab-selection', onSelection);
            EventBus.off('visual-lab-hover', onHover);
        };
    }, []);

    useEffect(() => {
        if (!ready) return;
        EventBus.emit('visual-lab-candidate', mode);
    }, [mode, ready]);

    useEffect(() => {
        if (!ready) return;
        EventBus.emit('visual-lab-preferences', preferences);
    }, [preferences, ready]);

    useEffect(() => {
        if (!ready) return;
        const left = cardMode === 'collapsed' ? 132 : cardMode === 'compact' ? 270 : 326;
        EventBus.emit('visual-lab-safe-area', presentation ? { top: 18, right: 18, bottom: 18, left: 18 } : { top: 18, right: 18, bottom: 18, left });
    }, [cardMode, presentation, ready]);

    const cameraCommand = (command: 'fit' | 'reset' | 'zoom-in' | 'zoom-out') => EventBus.emit('visual-lab-camera-command', command);
    const clearSelection = () => EventBus.emit('visual-lab-clear-selection');

    return (
        <main id="app-root" className="visual-lab-root">
            <section className="office-canvas-pane" aria-label="Interactive high-resolution Jarvis HQ visual laboratory">
                <PhaserGame ref={phaserRef} floor={floor} mode="high-resolution-lab" />
                {!ready && !error && <div className="loading-screen" role="status"><div className="loading-title">JARVIS HQ</div><div>INITIALIZING HIGH-RESOLUTION VISUAL LAB</div><div className="loading-track"><span /></div></div>}
                {error && <div className="error-screen" role="alert"><div className="loading-title">VISUAL LAB FAILED</div><p>{error}</p><button type="button" onClick={() => window.location.reload()}>Retry</button></div>}
                {ready && !presentation && <HighResolutionLabPanel
                    mode={mode}
                    cardMode={cardMode}
                    zoom={cameraState.zoom}
                    preferences={preferences}
                    selection={selection}
                    objectCount={runtime.objectCount}
                    textureCount={runtime.generatedTextureCount}
                    animationCount={runtime.activeAnimationCount}
                    onModeChange={setMode}
                    onCardModeChange={setCardMode}
                    onCameraCommand={cameraCommand}
                    onPreferencesChange={setPreferences}
                    onClearSelection={clearSelection}
                    onPresentation={() => setPresentation(true)}
                />}
                {ready && hover && !presentation && <div className="pixel-tooltip visual-lab-tooltip" style={{ left: hover.x + 16, top: hover.y + 14 }} role="tooltip"><strong>{hover.title}</strong><span>{hover.subtitle}</span></div>}
                {!presentation && <><a className="visual-lab-return" href="/">Return to Floor 1</a><div className="camera-help">DRAG TO PAN · WHEEL TO POINTER-ZOOM · F TO FIT · 0 TO RESET</div></>}
                {presentation && <button className="presentation-exit" type="button" onClick={() => setPresentation(false)}>Exit Presentation</button>}
                <p className="screen-reader-summary">High-resolution visual checkpoint comparing Candidate C, Candidate D, and Candidate E. This laboratory does not modify production Floor 1 data.</p>
            </section>
        </main>
    );
}

interface ApprovedProofRuntime { readonly objectCount: number; readonly textureCount: number; readonly roomCount: number; readonly characterCount: number }
function ApprovedFloorProofApplication() {
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const floor = useMemo(() => getApplicationFloor(), []);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string>();
    const [preferences, setPreferences] = useState<ApprovedProofPreferences>({ ...DEFAULT_APPROVED_PROOF_PREFERENCES });
    const [cameraState, setCameraState] = useState({ zoom: 1, view: 'Fit Floor', scrollX: 0, scrollY: 0 });
    const [selection, setSelection] = useState<ApprovedProofSelection>();
    const [hover, setHover] = useState<(ApprovedProofSelection & { readonly x: number; readonly y: number })>();
    const [presentation, setPresentation] = useState(false);
    const [cardMode, setCardMode] = useState<ApprovedProofCardMode>('expanded');
    const [runtime, setRuntime] = useState<ApprovedProofRuntime>({ objectCount: 0, textureCount: 0, roomCount: 0, characterCount: 0 });

    useEffect(() => {
        const onRendered = (summary: ApprovedProofRuntime) => { setReady(true); setRuntime(summary); };
        const onError = (message: string) => { setError(message); setReady(false); };
        const onCamera = (state: typeof cameraState) => setCameraState(state);
        const onSelection = (details?: ApprovedProofSelection) => setSelection(details);
        const onHover = (details?: ApprovedProofSelection & { readonly x: number; readonly y: number }) => setHover(details);
        EventBus.on('approved-proof-rendered', onRendered); EventBus.on('approved-proof-error', onError); EventBus.on('approved-proof-camera-state', onCamera); EventBus.on('approved-proof-selection', onSelection); EventBus.on('approved-proof-hover', onHover);
        return () => { EventBus.off('approved-proof-rendered', onRendered); EventBus.off('approved-proof-error', onError); EventBus.off('approved-proof-camera-state', onCamera); EventBus.off('approved-proof-selection', onSelection); EventBus.off('approved-proof-hover', onHover); };
    }, []);
    useEffect(() => { if (ready) EventBus.emit('approved-proof-preferences', preferences); }, [preferences, ready]);
    useEffect(() => { if (!ready) return; const left = presentation ? 18 : cardMode === 'collapsed' ? 132 : cardMode === 'compact' ? 270 : 326; EventBus.emit('approved-proof-safe-area', { top: 18, right: 18, bottom: 18, left }); }, [cardMode, presentation, ready]);
    const cameraCommand = (command: 'fit' | 'reset' | 'zoom-in' | 'zoom-out') => EventBus.emit('approved-proof-camera-command', command);
    return <main id="app-root" className="visual-lab-root approved-proof-root"><section className="office-canvas-pane" aria-label="Interactive approved Floor 1 architecture proof">
        <PhaserGame ref={phaserRef} floor={floor} mode="approved-proof" />
        {!ready && !error && <div className="loading-screen" role="status"><div className="loading-title">JARVIS HQ</div><div>INITIALIZING APPROVED FLOOR 1 PROOF</div><div className="loading-track"><span /></div></div>}
        {error && <div className="error-screen" role="alert"><div className="loading-title">FLOOR PROOF FAILED</div><p>{error}</p><button type="button" onClick={() => window.location.reload()}>Retry</button></div>}
        {ready && !presentation && <ApprovedProofPanel cardMode={cardMode} zoom={cameraState.zoom} preferences={preferences} selection={selection} runtime={runtime} onCardModeChange={setCardMode} onCameraCommand={cameraCommand} onPreferencesChange={setPreferences} onClearSelection={() => EventBus.emit('approved-proof-clear-selection')} onPresentation={() => setPresentation(true)} />}
        {ready && hover && !presentation && <div className="pixel-tooltip visual-lab-tooltip" style={{ left: hover.x + 16, top: hover.y + 14 }} role="tooltip"><strong>{hover.title}</strong><span>{hover.subtitle}</span></div>}
        {!presentation && <><a className="visual-lab-return" href="/">Return to current Floor 1</a><div className="camera-help">DRAG TO PAN · WHEEL TO POINTER-ZOOM · F TO FIT · 0 TO RESET</div></>}
        {presentation && <button className="presentation-exit" type="button" onClick={() => setPresentation(false)}>Exit Presentation</button>}
        <p className="screen-reader-summary">Isolated twenty-five percent Floor 1 proof. Eight rooms and ten representative permanent occupants. Awaiting user approval before replication.</p>
    </section></main>;
}

function App() {
    if (isApprovedFloorProof(window.location.search)) return <ApprovedFloorProofApplication />;
    const visualLab = isHighResolutionVisualLab(window.location.search);
    return visualLab ? <HighResolutionLabApplication /> : <FloorApplication />;
}

export default App;
