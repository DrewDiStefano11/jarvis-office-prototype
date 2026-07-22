import { EXPANSIVE_LAB_PROFILES } from '../visual-lab/profiles';
import type { VisualLabMode, VisualLabParticleMode, VisualLabPreferences, VisualLabSelection } from '../visual-lab/types';

export type VisualLabCardMode = 'expanded' | 'compact' | 'collapsed';

interface HighResolutionLabPanelProps {
    readonly mode: VisualLabMode;
    readonly cardMode: VisualLabCardMode;
    readonly zoom: number;
    readonly preferences: VisualLabPreferences;
    readonly selection?: VisualLabSelection;
    readonly objectCount: number;
    readonly textureCount: number;
    readonly animationCount: number;
    readonly onModeChange: (mode: VisualLabMode) => void;
    readonly onCardModeChange: (mode: VisualLabCardMode) => void;
    readonly onCameraCommand: (command: 'fit' | 'reset' | 'zoom-in' | 'zoom-out') => void;
    readonly onPreferencesChange: (preferences: VisualLabPreferences) => void;
    readonly onClearSelection: () => void;
    readonly onPresentation: () => void;
}
const nextLabels = (value: VisualLabPreferences['labels']): VisualLabPreferences['labels'] => value === 'auto' ? 'minimal' : value === 'minimal' ? 'on' : 'auto';
const nextEffects = (value: VisualLabPreferences['effects']): VisualLabPreferences['effects'] => value === 'on' ? 'reduced' : value === 'reduced' ? 'off' : 'on';
const nextParticles = (value: VisualLabParticleMode): VisualLabParticleMode => value === 'on' ? 'reduced' : value === 'reduced' ? 'off' : 'on';

export function HighResolutionLabPanel(props: HighResolutionLabPanelProps) {
    const { mode, cardMode, zoom, preferences, selection, objectCount, textureCount, animationCount, onModeChange, onCardModeChange, onCameraCommand, onPreferencesChange, onClearSelection, onPresentation } = props;
    const profile = EXPANSIVE_LAB_PROFILES.find((candidate) => candidate.id === mode);
    if (cardMode === 'collapsed') return <aside className="visual-lab-panel is-collapsed"><button type="button" onClick={() => onCardModeChange('expanded')}>Open C / D / E Lab</button></aside>;
    const toggle = <K extends keyof VisualLabPreferences>(key: K) => onPreferencesChange({ ...preferences, [key]: !preferences[key] });
    return (
        <aside className={`visual-lab-panel is-${cardMode}`} aria-label="High-resolution visual checkpoint controls">
            <header className="visual-lab-header"><div><span className="visual-lab-kicker">INTERNAL VISUAL LAB</span><h1>EXPANSIVE QUALITY CHECKPOINT</h1></div><span className="visual-lab-state">UNAPPROVED</span></header>
            <p className="visual-lab-intro">Representative suite only. Production Floor 1 remains unchanged.</p>
            <div className="visual-lab-card-modes" aria-label="Status card display"><button onClick={() => onCardModeChange('expanded')}>Expanded</button><button onClick={() => onCardModeChange('compact')}>Compact</button><button onClick={() => onCardModeChange('collapsed')}>Collapse</button></div>

            <section className="visual-lab-section"><h2>Candidate</h2><div className="candidate-grid">
                <button type="button" className={mode === 'comparison' ? 'is-active' : ''} onClick={() => onModeChange('comparison')}>C / D / E</button>
                {EXPANSIVE_LAB_PROFILES.map((candidate) => <button type="button" key={candidate.id} className={mode === candidate.id ? 'is-active' : ''} onClick={() => onModeChange(candidate.id)}>{candidate.shortName}</button>)}
            </div></section>

            <section className="visual-lab-section visual-lab-metadata" aria-label="Candidate metadata"><h2>{profile ? profile.title : 'Matched three-way comparison'}</h2>
                {profile ? <><p>{profile.description}</p><dl>
                    <dt>Suite geometry</dt><dd>{profile.dimensions.suiteWidth}×{profile.dimensions.suiteDepth}</dd><dt>Usable area</dt><dd>+{profile.dimensions.usableAreaIncrease}%</dd>
                    <dt>Character source</dt><dd>{profile.assets.standing.width}×{profile.assets.standing.height}</dd><dt>Furniture source</dt><dd>{profile.assets.furniture}×{profile.assets.furniture}</dd>
                    <dt>Main / secondary</dt><dd>{profile.dimensions.mainCorridorWidth} / {profile.dimensions.secondaryCorridorWidth}</dd><dt>Secure corridor</dt><dd>{profile.dimensions.secureCorridorWidth}</dd>
                    <dt>Materials / themes</dt><dd>{profile.materialProfileCount} / {profile.departmentThemeCount}</dd><dt>Particles / lighting</dt><dd>{profile.particleProfileCount} / {profile.lightingProfileCount}</dd>
                    <dt>Migration / risk</dt><dd>{profile.migrationEffort} / {profile.performanceRisk}</dd>
                </dl></> : <p>Same projection and functional suite, shown at each candidate's actual geometry and source resolution.</p>}
            </section>

            {selection && <section className="visual-lab-section visual-lab-inspector" aria-label="Visual lab inspector"><div className="visual-lab-section-heading"><h2>Inspector</h2><button type="button" onClick={onClearSelection}>Clear</button></div><strong>{selection.title}</strong><span>{selection.subtitle}</span></section>}

            <section className="visual-lab-section"><h2>View · {Math.round(zoom * 100)}%</h2><div className="visual-lab-control-grid"><button onClick={() => onCameraCommand('zoom-out')}>− Zoom</button><button onClick={() => onCameraCommand('zoom-in')}>+ Zoom</button><button onClick={() => onCameraCommand('fit')}>Fit Floor</button><button onClick={() => onCameraCommand('reset')}>Reset View</button></div></section>

            <section className="visual-lab-section visual-lab-layers"><h2>Layers and effects</h2>
                <button onClick={() => onPreferencesChange({ ...preferences, labels: nextLabels(preferences.labels) })}>Labels: {preferences.labels}</button><button onClick={() => onPreferencesChange({ ...preferences, effects: nextEffects(preferences.effects) })}>Effects: {preferences.effects}</button><button onClick={() => onPreferencesChange({ ...preferences, particles: nextParticles(preferences.particles) })}>Particles: {preferences.particles}</button>
                <button aria-pressed={preferences.lighting} onClick={() => toggle('lighting')}>Lighting: {preferences.lighting ? 'on' : 'off'}</button><button aria-pressed={preferences.showDimensions} onClick={() => toggle('showDimensions')}>Dimensions: {preferences.showDimensions ? 'on' : 'off'}</button><button aria-pressed={preferences.showMovementClearance} onClick={() => toggle('showMovementClearance')}>Movement clearance: {preferences.showMovementClearance ? 'on' : 'off'}</button><button aria-pressed={preferences.showCirculationRoutes} onClick={() => toggle('showCirculationRoutes')}>Circulation route: {preferences.showCirculationRoutes ? 'on' : 'off'}</button><button aria-pressed={preferences.showFurnitureBounds} onClick={() => toggle('showFurnitureBounds')}>Furniture bounds: {preferences.showFurnitureBounds ? 'on' : 'off'}</button><button aria-pressed={preferences.showInteractionBounds} onClick={() => toggle('showInteractionBounds')}>Interaction bounds: {preferences.showInteractionBounds ? 'on' : 'off'}</button><button aria-pressed={preferences.showAnchors} onClick={() => toggle('showAnchors')}>Anchors: {preferences.showAnchors ? 'on' : 'off'}</button><button aria-pressed={preferences.showBounds} onClick={() => toggle('showBounds')}>Room bounds: {preferences.showBounds ? 'on' : 'off'}</button>
            </section>

            <section className="visual-lab-section visual-lab-runtime"><h2>Runtime</h2><dl><dt>Objects</dt><dd>{objectCount}</dd><dt>Cached textures</dt><dd>{textureCount}</dd><dt>Active tweens</dt><dd>{animationCount}</dd></dl></section>
            <button type="button" className="visual-lab-presentation" onClick={onPresentation}>Presentation Mode</button>
        </aside>
    );
}
