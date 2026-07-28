import { ChangeEvent, useMemo, useState } from 'react';
import { fitUniformRegistration, RegistrationLandmark } from '../../office/floor1/registration';
import './floor1-visual-lab.css';

const INITIAL = { scale: 4 / 3, offsetX: 0, offsetY: -2 / 3 };
const LAYERS = ['rooms', 'walk-paths', 'walls', 'objects', 'doors', 'door-lights', 'computers', 'positions', 'interactive-objects'] as const;

type Props = Readonly<{ mode: 'registration' | 'provisional' }>;

export function Floor1VisualLab({ mode }: Props) {
    const [registration, setRegistration] = useState(INITIAL);
    const [landmarks, setLandmarks] = useState<RegistrationLandmark[]>([]);
    const [opacity, setOpacity] = useState(0.65);
    const [blendMode, setBlendMode] = useState('normal');
    const [layers, setLayers] = useState(new Set<string>(LAYERS));
    const fit = useMemo(() => {
        try { return fitUniformRegistration(landmarks); } catch { return null; }
    }, [landmarks]);

    const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const value = JSON.parse(await file.text()) as { landmarks?: RegistrationLandmark[]; scale?: number; offsetX?: number; offsetY?: number };
        setLandmarks(value.landmarks ?? []);
        if ([value.scale, value.offsetX, value.offsetY].every(Number.isFinite)) setRegistration({ scale: value.scale!, offsetX: value.offsetX!, offsetY: value.offsetY! });
    };
    const exportJson = () => {
        const payload = { ...registration, status: 'candidate-unverified', approved: false, landmarks, residuals: fit };
        const anchor = document.createElement('a');
        anchor.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
        anchor.download = 'floor1-registration-candidate.json';
        anchor.click();
        URL.revokeObjectURL(anchor.href);
    };
    const addLandmark = () => {
        const index = landmarks.length + 1;
        setLandmarks(values => [...values, { id: `landmark-${index}`, label: `Landmark ${index}`, embedded: { x: 0, y: 0 }, production: { x: 0, y: 0 }, enabled: true }]);
    };

    return (
        <main className="floor1-lab">
            <header>
                <div><p>Development-only Floor 1 {mode} laboratory</p><h1>CANDIDATE — NOT PRODUCTION APPROVED</h1></div>
                <a href="/">Return to normal office</a>
            </header>
            <section className="floor1-lab__workspace">
                <div className="floor1-lab__canvas" style={{ '--layer-opacity': opacity, '--blend-mode': blendMode } as React.CSSProperties}>
                    <img src="/assets/office/office-8192x5460.png" alt="Clean production Floor 1 office" />
                    <div className="floor1-lab__candidate">Candidate transform: {registration.scale.toFixed(9)}×, {registration.offsetX.toFixed(3)}, {registration.offsetY.toFixed(3)}<br />Selected review layers: {[...layers].join(', ') || 'none'}</div>
                </div>
                <aside>
                    <h2>Uniform registration</h2>
                    {(['scale', 'offsetX', 'offsetY'] as const).map(field => <label key={field}>{field}<input type="number" step="any" value={registration[field]} onChange={event => setRegistration(value => ({ ...value, [field]: Number(event.target.value) }))} /></label>)}
                    <button type="button" onClick={() => setRegistration(INITIAL)}>Reset candidate</button>
                    <label>Layer opacity<input type="range" min="0" max="1" step=".01" value={opacity} onChange={event => setOpacity(Number(event.target.value))} /></label>
                    <label>Blend mode<select value={blendMode} onChange={event => setBlendMode(event.target.value)}><option>normal</option><option>multiply</option><option>difference</option><option>screen</option></select></label>
                    <fieldset><legend>Review layers</legend>{LAYERS.map(layer => <label key={layer}><input type="checkbox" checked={layers.has(layer)} onChange={() => setLayers(previous => { const next = new Set(previous); if (next.has(layer)) next.delete(layer); else next.add(layer); return next; })} />{layer}</label>)}</fieldset>
                    <h2>Landmarks ({landmarks.filter(value => value.enabled).length})</h2>
                    <button type="button" onClick={addLandmark}>Add landmark</button>
                    <button type="button" onClick={exportJson}>Export JSON</button>
                    <label>Import JSON<input type="file" accept="application/json" onChange={importJson} /></label>
                    <p>Fit: {fit ? `${fit.scale.toFixed(9)}; max ${fit.maximumResidual.toFixed(2)} px; mean ${fit.meanResidual.toFixed(2)} px; RMS ${fit.rmsResidual.toFixed(2)} px` : 'Add at least two measured landmarks.'}</p>
                    <p>Approval requires 8+ distributed enabled landmarks, finite residual evidence, valid source checksums, thresholds, and explicit human review. Imported approval flags are ignored.</p>
                </aside>
            </section>
        </main>
    );
}

