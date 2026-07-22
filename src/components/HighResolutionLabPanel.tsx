import { VISUAL_LAB_PROFILES } from '../visual-lab/profiles';
import type { VisualLabMode, VisualLabPreferences, VisualLabSelection } from '../visual-lab/types';

interface HighResolutionLabPanelProps {
    readonly mode: VisualLabMode;
    readonly zoom: number;
    readonly preferences: VisualLabPreferences;
    readonly selection?: VisualLabSelection;
    readonly objectCount: number;
    readonly textureCount: number;
    readonly animationCount: number;
    readonly onModeChange: (mode: VisualLabMode) => void;
    readonly onCameraCommand: (command: 'fit' | 'reset' | 'zoom-in' | 'zoom-out') => void;
    readonly onPreferencesChange: (preferences: VisualLabPreferences) => void;
    readonly onClearSelection: () => void;
    readonly onPresentation: () => void;
}
const nextLabels = (value: VisualLabPreferences['labels']): VisualLabPreferences['labels'] => value === 'auto' ? 'minimal' : value === 'minimal' ? 'on' : 'auto';
const nextEffects = (value: VisualLabPreferences['effects']): VisualLabPreferences['effects'] => value === 'on' ? 'reduced' : value === 'reduced' ? 'off' : 'on';

export function HighResolutionLabPanel({ mode, zoom, preferences, selection, objectCount, textureCount, animationCount, onModeChange, onCameraCommand, onPreferencesChange, onClearSelection, onPresentation }: HighResolutionLabPanelProps) {
    const profile = VISUAL_LAB_PROFILES.find((candidate) => candidate.id === mode);
    return (
        <aside className="visual-lab-panel" aria-label="High-resolution visual checkpoint controls">
            <header className="visual-lab-header">
                <div><span className="visual-lab-kicker">INTERNAL VISUAL LAB</span><h1>HIGH-RESOLUTION CHECKPOINT</h1></div>
                <span className="visual-lab-state">UNAPPROVED</span>
            </header>
            <p className="visual-lab-intro">Representative suite only. Production Floor 1 remains unchanged.</p>

            <section className="visual-lab-section">
                <h2>Candidate</h2>
                <div className="candidate-grid">
                    <button type="button" className={mode === 'comparison' ? 'is-active' : ''} onClick={() => onModeChange('comparison')}>Four-Way</button>
                    {VISUAL_LAB_PROFILES.map((candidate) => (
                        <button type="button" key={candidate.id} className={mode === candidate.id ? 'is-active' : ''} onClick={() => onModeChange(candidate.id)}>{candidate.shortName}</button>
                    ))}
                </div>
            </section>

            <section className="visual-lab-section visual-lab-metadata" aria-label="Candidate metadata">
                <h2>{profile ? profile.title : 'Matched four-way comparison'}</h2>
                {profile ? <>
                    <p>{profile.description}</p>
                    <dl>
                        <dt>Suite geometry</dt><dd>{profile.dimensions.suiteWidth}×{profile.dimensions.suiteDepth}</dd>
                        <dt>Usable area</dt><dd>{profile.id === 'baseline' ? 'Current' : `+${profile.dimensions.usableAreaIncrease}%`}</dd>
                        <dt>Character source</dt><dd>{profile.assets.standing.width}×{profile.assets.standing.height}</dd>
                        <dt>Furniture source</dt><dd>{profile.assets.furniture}×{profile.assets.furniture}</dd>
                        <dt>Aisle / clearance</dt><dd>{profile.dimensions.aisleWidth} / {profile.dimensions.workstationClearance}</dd>
                        <dt>Migration effort</dt><dd>{profile.migrationEffort}</dd>
                        <dt>Performance risk</dt><dd>{profile.performanceRisk}</dd>
                    </dl>
                </> : <p>Identical room functions and object roles at matched projection. Geometry and source resolution are intentionally not normalized.</p>}
            </section>

            {selection && <section className="visual-lab-section visual-lab-inspector" aria-label="Visual lab inspector">
                <div className="visual-lab-section-heading"><h2>Inspector</h2><button type="button" onClick={onClearSelection}>Clear</button></div>
                <strong>{selection.title}</strong><span>{selection.subtitle}</span>
            </section>}

            <section className="visual-lab-section">
                <h2>View controls · {Math.round(zoom * 100)}%</h2>
                <div className="visual-lab-control-grid">
                    <button type="button" aria-label="Zoom visual lab out" onClick={() => onCameraCommand('zoom-out')}>− Zoom</button>
                    <button type="button" aria-label="Zoom visual lab in" onClick={() => onCameraCommand('zoom-in')}>+ Zoom</button>
                    <button type="button" aria-label="Fit complete visual prototype" onClick={() => onCameraCommand('fit')}>Fit Prototype</button>
                    <button type="button" aria-label="Reset visual prototype view" onClick={() => onCameraCommand('reset')}>Reset View</button>
                </div>
            </section>

            <section className="visual-lab-section visual-lab-layers">
                <h2>Comparison layers</h2>
                <button type="button" onClick={() => onPreferencesChange({ ...preferences, labels: nextLabels(preferences.labels) })}>Labels: {preferences.labels}</button>
                <button type="button" onClick={() => onPreferencesChange({ ...preferences, effects: nextEffects(preferences.effects) })}>Effects: {preferences.effects}</button>
                <button type="button" aria-pressed={preferences.showDimensions} onClick={() => onPreferencesChange({ ...preferences, showDimensions: !preferences.showDimensions })}>Dimensions: {preferences.showDimensions ? 'on' : 'off'}</button>
                <button type="button" aria-pressed={preferences.showAnchors} onClick={() => onPreferencesChange({ ...preferences, showAnchors: !preferences.showAnchors })}>Anchors: {preferences.showAnchors ? 'on' : 'off'}</button>
                <button type="button" aria-pressed={preferences.showBounds} onClick={() => onPreferencesChange({ ...preferences, showBounds: !preferences.showBounds })}>Object bounds: {preferences.showBounds ? 'on' : 'off'}</button>
            </section>

            <section className="visual-lab-section visual-lab-runtime">
                <h2>Runtime</h2>
                <dl><dt>Objects</dt><dd>{objectCount}</dd><dt>Cached textures</dt><dd>{textureCount}</dd><dt>Active tweens</dt><dd>{animationCount}</dd></dl>
            </section>

            <button type="button" className="visual-lab-presentation" onClick={onPresentation}>Presentation Mode</button>
        </aside>
    );
}
