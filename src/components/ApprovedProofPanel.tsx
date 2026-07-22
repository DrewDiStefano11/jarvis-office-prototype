import type { ApprovedProofPreferences, ApprovedProofSelection } from '../approved-proof/types';

export type ApprovedProofCardMode = 'expanded' | 'compact' | 'collapsed';
interface Props {
    readonly cardMode: ApprovedProofCardMode;
    readonly zoom: number;
    readonly preferences: ApprovedProofPreferences;
    readonly selection?: ApprovedProofSelection;
    readonly runtime: { readonly objectCount: number; readonly textureCount: number; readonly roomCount: number; readonly characterCount: number };
    readonly onCardModeChange: (mode: ApprovedProofCardMode) => void;
    readonly onCameraCommand: (command: 'fit' | 'reset' | 'zoom-in' | 'zoom-out') => void;
    readonly onPreferencesChange: (preferences: ApprovedProofPreferences) => void;
    readonly onClearSelection: () => void;
    readonly onPresentation: () => void;
}

const nextLabels = (value: ApprovedProofPreferences['labels']): ApprovedProofPreferences['labels'] => value === 'auto' ? 'minimal' : value === 'minimal' ? 'on' : 'auto';
const nextEffects = (value: ApprovedProofPreferences['effects']): ApprovedProofPreferences['effects'] => value === 'on' ? 'reduced' : value === 'reduced' ? 'off' : 'on';

export function ApprovedProofPanel(props: Props) {
    const { cardMode, zoom, preferences, selection, runtime, onCardModeChange, onCameraCommand, onPreferencesChange, onClearSelection, onPresentation } = props;
    if (cardMode === 'collapsed') return <aside className="visual-lab-panel approved-proof-panel is-collapsed"><button type="button" onClick={() => onCardModeChange('expanded')}>Open Floor 1 Proof</button></aside>;
    const toggle = (key: 'showMovement' | 'showDoors' | 'showFurnitureBounds') => onPreferencesChange({ ...preferences, [key]: !preferences[key] });
    return <aside className={`visual-lab-panel approved-proof-panel is-${cardMode}`} aria-label="Approved Floor 1 proof controls">
        <header className="visual-lab-header"><div><span className="visual-lab-kicker">APPROVED DIRECTION · ISOLATED BUILD</span><h1>FLOOR 1 PROOF · 25%</h1></div><span className="visual-lab-state approved-proof-state">USER REVIEW GATE</span></header>
        <p className="visual-lab-intro">Representative architecture cluster only. Normal Floor 1 remains unchanged until you approve replication.</p>
        <div className="visual-lab-card-modes" aria-label="Status card display"><button onClick={() => onCardModeChange('expanded')}>Expanded</button><button onClick={() => onCardModeChange('compact')}>Compact</button><button onClick={() => onCardModeChange('collapsed')}>Collapse</button></div>
        <section className="visual-lab-section visual-lab-metadata"><h2>Completed proof cluster</h2><p>Central Nexus, executive office, engineering, release review, focus room, reception checkpoint, and one isolated Sandbox cell.</p><dl><dt>Rooms</dt><dd>{runtime.roomCount}</dd><dt>Permanent occupants</dt><dd>{runtime.characterCount}</dd><dt>Source characters</dt><dd>112×128</dd><dt>Furniture source</dt><dd>160×160</dd><dt>Projection</dt><dd>2:1 isometric</dd><dt>Gate</dt><dd>Awaiting approval</dd></dl></section>
        {selection && <section className="visual-lab-section visual-lab-inspector"><div className="visual-lab-section-heading"><h2>Inspector</h2><button type="button" onClick={onClearSelection}>Clear</button></div><strong>{selection.title}</strong><span>{selection.subtitle}</span></section>}
        <section className="visual-lab-section"><h2>View · {Math.round(zoom * 100)}%</h2><div className="visual-lab-control-grid"><button onClick={() => onCameraCommand('zoom-out')}>− Zoom</button><button onClick={() => onCameraCommand('zoom-in')}>+ Zoom</button><button onClick={() => onCameraCommand('fit')}>Fit Floor</button><button onClick={() => onCameraCommand('reset')}>Reset View</button></div></section>
        <section className="visual-lab-section visual-lab-layers"><h2>Layers and effects</h2><button onClick={() => onPreferencesChange({ ...preferences, labels: nextLabels(preferences.labels) })}>Labels: {preferences.labels}</button><button onClick={() => onPreferencesChange({ ...preferences, effects: nextEffects(preferences.effects) })}>Effects: {preferences.effects}</button><button aria-pressed={preferences.showMovement} onClick={() => toggle('showMovement')}>Movement routes: {preferences.showMovement ? 'on' : 'off'}</button><button aria-pressed={preferences.showDoors} onClick={() => toggle('showDoors')}>Door clearance: {preferences.showDoors ? 'on' : 'off'}</button><button aria-pressed={preferences.showFurnitureBounds} onClick={() => toggle('showFurnitureBounds')}>Furniture bounds: {preferences.showFurnitureBounds ? 'on' : 'off'}</button></section>
        <section className="visual-lab-section visual-lab-runtime"><h2>Runtime</h2><dl><dt>Objects</dt><dd>{runtime.objectCount}</dd><dt>Cached textures</dt><dd>{runtime.textureCount}</dd></dl></section>
        <button type="button" className="visual-lab-presentation" onClick={onPresentation}>Presentation Mode</button>
    </aside>;
}
