import { ChangeEvent, PointerEvent, useMemo, useRef, useState, WheelEvent } from 'react';
import { buildApprovedExport, buildCandidateExport, RESIDUAL_THRESHOLDS } from '../../office/floor1/approval';
import { alignActualFloor1Images, AlignmentSuggestion } from '../../office/floor1/imageAlignment';
import {
    assessDistributedCoverage, fitUniformRegistration, landmarkResiduals,
    RegistrationLandmark, UniformRegistration,
} from '../../office/floor1/registration';
import './floor1-visual-lab.css';

const INITIAL: UniformRegistration = { scale: 4 / 3, offsetX: 0, offsetY: -2 / 3 };
const EMBEDDED_BACKGROUND = '/artifacts/production-floor1/embedded-backgrounds/9513850ce99814aee3b10bd1c64670e10b72e9ebd03b66960bff420e14558dea.jpg';
const LAYERS = ['rooms', 'walk-paths', 'walls', 'objects', 'doors', 'door-lights', 'computers', 'positions', 'interactive-objects'] as const;
const PREVIEW_NAME: Record<(typeof LAYERS)[number], string> = { positions: 'chairs-standing-desks', rooms: 'rooms', 'walk-paths': 'walk-paths', walls: 'walls', objects: 'objects', doors: 'doors', 'door-lights': 'door-lights', computers: 'computers', 'interactive-objects': 'interactive-objects' };

type Props = Readonly<{ mode: 'registration' | 'provisional' }>;
type ReviewStatus = 'pending' | 'approved';

function downloadJson(name: string, value: unknown): void {
    const anchor = document.createElement('a');
    const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
}

export function Floor1VisualLab({ mode }: Props) {
    const [registration, setRegistration] = useState<UniformRegistration>(INITIAL);
    const [landmarks, setLandmarks] = useState<RegistrationLandmark[]>([]);
    const [activeLandmark, setActiveLandmark] = useState<string | null>(null);
    const [capture, setCapture] = useState<'embedded' | 'production'>('embedded');
    const [opacity, setOpacity] = useState(0.65);
    const [blendMode, setBlendMode] = useState<React.CSSProperties['mixBlendMode']>('normal');
    const [layers, setLayers] = useState(new Set<string>(LAYERS));
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
    const [importError, setImportError] = useState<string | null>(null);
    const [alignmentError, setAlignmentError] = useState<string | null>(null);
    const [alignment, setAlignment] = useState<AlignmentSuggestion | null>(null);
    const [aligning, setAligning] = useState(false);
    const [reviewerId, setReviewerId] = useState('');
    const [reviewStatuses, setReviewStatuses] = useState<Record<'geometry' | 'colliders' | 'navigation', ReviewStatus>>({ geometry: 'pending', colliders: 'pending', navigation: 'pending' });
    const [navigation, setNavigation] = useState<{ cells: unknown[]; routeTests: { id: string; passed: boolean }[] }>({ cells: [], routeTests: [] });
    const fit = useMemo(() => {
        try { return fitUniformRegistration(landmarks); } catch { return null; }
    }, [landmarks]);
    const residuals = useMemo(() => fit ? landmarkResiduals(landmarks, fit) : [], [fit, landmarks]);
    const coverage = useMemo(() => assessDistributedCoverage(landmarks), [landmarks]);
    const candidateExport = useMemo(() => buildCandidateExport(landmarks, fit, registration), [landmarks, fit, registration]);
    const objectiveApprovalPassed = Boolean(fit && coverage.passed
        && fit.maximumResidual <= RESIDUAL_THRESHOLDS.maximum
        && fit.meanResidual <= RESIDUAL_THRESHOLDS.mean
        && fit.rmsResidual <= RESIDUAL_THRESHOLDS.rms
        && Object.values(reviewStatuses).every(value => value === 'approved')
        && navigation.cells.length > 0 && navigation.routeTests.length >= 10 && navigation.routeTests.every(test => test.passed)
        && reviewerId.trim());

    const updateLandmark = (id: string, update: Partial<RegistrationLandmark>) => {
        setLandmarks(values => values.map(value => value.id === id ? { ...value, ...update } : value));
    };
    const updateCoordinate = (id: string, space: 'embedded' | 'production', axis: 'x' | 'y', value: number) => {
        setLandmarks(values => values.map(item => item.id === id ? { ...item, [space]: { ...item[space], [axis]: value } } : item));
    };
    const addLandmark = () => {
        const index = landmarks.length + 1;
        const id = `landmark-${index}`;
        setLandmarks(values => [...values, { id, label: `Landmark ${index}`, embedded: { x: 0, y: 0 }, production: { x: 0, y: 0 }, enabled: true }]);
        setActiveLandmark(id);
    };
    const capturePoint = (space: 'embedded' | 'production', x: number, y: number) => {
        let id = activeLandmark;
        if (!id) {
            id = `landmark-${landmarks.length + 1}`;
            setLandmarks(values => [...values, { id: id!, label: `Landmark ${values.length + 1}`, embedded: { x: 0, y: 0 }, production: { x: 0, y: 0 }, enabled: true, [space]: { x, y } }]);
            setActiveLandmark(id);
        } else {
            updateCoordinate(id, space, 'x', x);
            updateCoordinate(id, space, 'y', y);
        }
        setCapture(space === 'embedded' ? 'production' : 'embedded');
    };
    const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const value = JSON.parse(await file.text()) as Record<string, unknown>;
            const importedLandmarks = value.landmarks;
            if (!Array.isArray(importedLandmarks) || importedLandmarks.some(item => !item || typeof item !== 'object')) throw new Error('Import must contain a landmarks array.');
            setLandmarks(importedLandmarks.map(item => {
                const landmark = item as RegistrationLandmark;
                if (!landmark.id || !landmark.label || !landmark.embedded || !landmark.production) throw new Error('Every landmark requires ID, label, embedded coordinates, and production coordinates.');
                return { id: String(landmark.id), label: String(landmark.label), embedded: { x: Number(landmark.embedded.x), y: Number(landmark.embedded.y) }, production: { x: Number(landmark.production.x), y: Number(landmark.production.y) }, enabled: Boolean(landmark.enabled) };
            }));
            const transform = (value.transform ?? value) as Partial<UniformRegistration>;
            if ([transform.scale, transform.offsetX, transform.offsetY].every(Number.isFinite)) setRegistration({ scale: Number(transform.scale), offsetX: Number(transform.offsetX), offsetY: Number(transform.offsetY) });
            if (value.navigation && typeof value.navigation === 'object') setNavigation(value.navigation as typeof navigation);
            setImportError(null);
        } catch (error) {
            setImportError(error instanceof Error ? error.message : 'Unable to import registration JSON.');
        } finally {
            event.target.value = '';
        }
    };
    const runAlignment = async () => {
        setAligning(true); setAlignmentError(null);
        try { setAlignment(await alignActualFloor1Images(registration)); }
        catch (error) { setAlignmentError(error instanceof Error ? error.message : 'Alignment assistance failed.'); }
        finally { setAligning(false); }
    };
    const exportApproval = async () => {
        try {
            const reviews = {
                geometry: { status: reviewStatuses.geometry, unresolvedCount: reviewStatuses.geometry === 'approved' ? 0 : 1 },
                colliders: { status: reviewStatuses.colliders, unresolvedCount: reviewStatuses.colliders === 'approved' ? 0 : 1 },
                navigation: { status: reviewStatuses.navigation, unresolvedCount: reviewStatuses.navigation === 'approved' ? 0 : 1 },
            };
            const approved = await buildApprovedExport(candidateExport, reviewerId, reviews, navigation);
            downloadJson('floor1-registration-approved.json', approved);
            setImportError(null);
        } catch (error) { setImportError(error instanceof Error ? error.message : 'Approval export failed.'); }
    };
    const wheel = (event: WheelEvent<HTMLDivElement>) => {
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        const next = Math.min(8, Math.max(0.25, zoom * Math.exp(-event.deltaY * 0.001)));
        setPan(value => ({ x: point.x - (point.x - value.x) * next / zoom, y: point.y - (point.y - value.y) * next / zoom }));
        setZoom(next);
    };
    const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
        event.currentTarget.setPointerCapture(event.pointerId);
    };
    const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
        if (!drag.current) return;
        setPan({ x: drag.current.panX + event.clientX - drag.current.x, y: drag.current.panY + event.clientY - drag.current.y });
    };
    const pointerUp = () => { drag.current = null; };

    return (
        <main className="floor1-lab" data-mode={mode}>
            <header>
                <div><p>Development-only Floor 1 review laboratory</p><h1>{mode === 'registration' ? 'Registration alignment mode' : 'Provisional geometry mode'}</h1><strong>CANDIDATE — NOT PRODUCTION APPROVED</strong></div>
                <a href="/">Return to normal office</a>
            </header>
            <section className="floor1-lab__workspace">
                <div className="floor1-lab__visuals">
                    <section><h2>Embedded source — click to set {capture === 'embedded' ? 'next point' : 'after selecting embedded capture'}</h2>
                        <div className={`floor1-lab__source ${capture === 'embedded' ? 'is-capturing' : ''}`} onClick={event => {
                            if (capture !== 'embedded') return;
                            const rect = event.currentTarget.getBoundingClientRect();
                            capturePoint('embedded', (event.clientX - rect.left) / rect.width * 6144, (event.clientY - rect.top) / rect.height * 4096);
                        }}>
                            <img src={EMBEDDED_BACKGROUND} alt="Extracted embedded Floor 1 source" />
                            <svg viewBox="0 0 6144 4096" aria-label="Embedded landmarks">{landmarks.filter(item => item.enabled).map(item => <circle key={item.id} cx={item.embedded.x} cy={item.embedded.y} r="28" />)}</svg>
                        </div>
                    </section>
                    <section><h2>Production image and candidate layers — zoom {zoom.toFixed(2)}×</h2>
                        <div className={`floor1-lab__viewport ${capture === 'production' ? 'is-capturing' : ''}`} onWheel={wheel} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
                            <svg viewBox="0 0 8192 5460" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }} onClick={event => {
                                if (capture !== 'production' || drag.current) return;
                                const rect = event.currentTarget.getBoundingClientRect();
                                capturePoint('production', (event.clientX - rect.left) / rect.width * 8192, (event.clientY - rect.top) / rect.height * 5460);
                            }}>
                                <image href="/assets/office/office-8192x5460.png" width="8192" height="5460" />
                                {LAYERS.filter(layer => layers.has(layer)).map(layer => <image key={layer} data-testid={`layer-${layer}`} className="floor1-lab__layer" href={`/artifacts/production-floor1/vector-previews/${PREVIEW_NAME[layer]}.svg`} x={registration.offsetX} y={registration.offsetY} width={6144 * registration.scale} height={4096 * registration.scale} opacity={opacity} style={{ mixBlendMode: blendMode }} />)}
                                {landmarks.filter(item => item.enabled).map(item => <circle key={item.id} className="floor1-lab__landmark" cx={item.production.x} cy={item.production.y} r="36" />)}
                            </svg>
                        </div>
                    </section>
                </div>
                <aside>
                    <h2>Uniform registration</h2>
                    {(['scale', 'offsetX', 'offsetY'] as const).map(field => <label key={field}>{field}<input aria-label={field} type="number" step="any" value={registration[field]} onChange={event => setRegistration(value => ({ ...value, [field]: Number(event.target.value) }))} /></label>)}
                    <div className="floor1-lab__actions"><button type="button" onClick={() => setRegistration(INITIAL)}>Reset candidate</button><button type="button" disabled={!fit} onClick={() => fit && setRegistration({ scale: fit.scale, offsetX: fit.offsetX, offsetY: fit.offsetY })}>Apply fitted registration</button></div>
                    <label>Layer opacity<input aria-label="Layer opacity" type="range" min="0" max="1" step=".01" value={opacity} onChange={event => setOpacity(Number(event.target.value))} /></label>
                    <label>Blend mode<select aria-label="Blend mode" value={blendMode} onChange={event => setBlendMode(event.target.value as React.CSSProperties['mixBlendMode'])}><option>normal</option><option>multiply</option><option>difference</option><option>screen</option></select></label>
                    <fieldset><legend>Candidate geometry layers</legend>{LAYERS.map(layer => <label key={layer}><input aria-label={`Show ${layer}`} type="checkbox" checked={layers.has(layer)} onChange={() => setLayers(previous => { const next = new Set(previous); if (next.has(layer)) next.delete(layer); else next.add(layer); return next; })} />{layer}</label>)}</fieldset>
                    <h2>Real-image alignment suggestion</h2>
                    <button type="button" disabled={aligning} onClick={runAlignment}>{aligning ? 'Analyzing images…' : 'Analyze actual images'}</button>
                    {alignment && <div data-testid="alignment-suggestion"><strong>Suggestion — human verification required</strong><p>Scale {alignment.scale.toFixed(9)}, X {alignment.offsetX.toFixed(2)}, Y {alignment.offsetY.toFixed(2)}</p><p>Score {alignment.scoreBefore.toFixed(5)} → {alignment.scoreAfter.toFixed(5)}; overlap {(alignment.overlap * 100).toFixed(1)}%</p>
                        <dl>
                            <dt>Production source</dt><dd>{alignment.productionDimensions.width} × {alignment.productionDimensions.height}; <code>{alignment.productionHash}</code></dd>
                            <dt>Embedded source</dt><dd>{alignment.embeddedDimensions.width} × {alignment.embeddedDimensions.height}; <code>{alignment.embeddedHash}</code></dd>
                            <dt>Sampling</dt><dd>{alignment.parameters.productionSampleWidth} px production, {alignment.parameters.embeddedSampleWidth} px embedded, ±{alignment.parameters.searchRange} sample-pixel translation search</dd>
                        </dl>
                        <div className="floor1-lab__actions"><button type="button" onClick={() => setRegistration({ scale: alignment.scale, offsetX: alignment.offsetX, offsetY: alignment.offsetY })}>Apply suggestion as candidate</button><button type="button" onClick={() => downloadJson('floor1-alignment-assistance.json', { schemaVersion: 1, status: 'candidate-assistance-only', approved: false, ...alignment })}>Export alignment evidence</button></div>
                    </div>}
                    {alignmentError && <p role="alert">{alignmentError}</p>}
                    <h2>Landmarks ({landmarks.filter(value => value.enabled).length})</h2>
                    <div className="floor1-lab__actions"><button type="button" onClick={addLandmark}>Add landmark</button><button type="button" onClick={() => downloadJson('floor1-registration-candidate.json', candidateExport)}>Export fitted candidate</button></div>
                    <label>Capture next coordinate<select aria-label="Capture target" value={capture} onChange={event => setCapture(event.target.value as typeof capture)}><option value="embedded">Embedded source</option><option value="production">Production image</option></select></label>
                    <div className="floor1-lab__landmarks">{landmarks.map(landmark => {
                        const residual = residuals.find(value => value.id === landmark.id);
                        return <fieldset key={landmark.id} className={activeLandmark === landmark.id ? 'is-active' : ''} onFocus={() => setActiveLandmark(landmark.id)}><legend>{landmark.label}</legend>
                            <label>ID<input aria-label={`${landmark.id} ID`} value={landmark.id} onChange={event => updateLandmark(landmark.id, { id: event.target.value })} /></label>
                            <label>Label<input aria-label={`${landmark.id} label`} value={landmark.label} onChange={event => updateLandmark(landmark.id, { label: event.target.value })} /></label>
                            {(['embedded', 'production'] as const).flatMap(space => (['x', 'y'] as const).map(axis => <label key={`${space}-${axis}`}>{space} {axis.toUpperCase()}<input aria-label={`${landmark.id} ${space} ${axis}`} type="number" value={landmark[space][axis]} onChange={event => updateCoordinate(landmark.id, space, axis, Number(event.target.value))} /></label>))}
                            <label><input aria-label={`${landmark.id} enabled`} type="checkbox" checked={landmark.enabled} onChange={event => updateLandmark(landmark.id, { enabled: event.target.checked })} />Enabled</label>
                            <p>Residual: {residual ? `Δx ${residual.x.toFixed(2)}, Δy ${residual.y.toFixed(2)}, ${residual.distance.toFixed(2)} px` : 'not fitted'}</p>
                            <button type="button" onClick={() => { setLandmarks(values => values.filter(value => value.id !== landmark.id)); if (activeLandmark === landmark.id) setActiveLandmark(null); }}>Delete</button>
                        </fieldset>;
                    })}</div>
                    <p data-testid="fit-summary">Fit: {fit ? `count ${fit.count}; scale ${fit.scale.toFixed(9)}; max ${fit.maximumResidual.toFixed(2)} px; mean ${fit.meanResidual.toFixed(2)} px; RMS ${fit.rmsResidual.toFixed(2)} px` : 'Add at least two distinct enabled landmarks.'}</p>
                    <p data-testid="coverage-status">Coverage: {coverage.passed ? 'passes' : `missing ${coverage.missing.join(', ')}`}. Quadrants: {coverage.quadrants.join(', ') || 'none'}; spans {coverage.xSpan.toFixed(0)} × {coverage.ySpan.toFixed(0)}.</p>
                    <label>Import candidate/review JSON<input aria-label="Import registration JSON" type="file" accept="application/json" onChange={importJson} /></label>
                    {importError && <p role="alert">{importError}</p>}
                    <h2>Approval lifecycle</h2>
                    <ol><li>Candidate registration</li><li>Human-reviewed registration</li><li>Approved checksummed artifact</li><li>Protected production promotion</li><li>Verified runtime loading</li></ol>
                    <label>Reviewer ID<input aria-label="Reviewer ID" value={reviewerId} onChange={event => setReviewerId(event.target.value)} /></label>
                    {(Object.keys(reviewStatuses) as (keyof typeof reviewStatuses)[]).map(key => <label key={key}>{key} review<select aria-label={`${key} review`} value={reviewStatuses[key]} onChange={event => setReviewStatuses(value => ({ ...value, [key]: event.target.value as ReviewStatus }))}><option>pending</option><option>approved</option></select></label>)}
                    <button type="button" disabled={!objectiveApprovalPassed} onClick={exportApproval}>Deliberately export approved artifact</button>
                    <p>Approval export is enabled only after distributed landmarks, residual thresholds, reviewer identity, all geometry reviews, populated navigation, and ten passing routes are present. Imported `approved` flags and checksums are ignored.</p>
                </aside>
            </section>
        </main>
    );
}
