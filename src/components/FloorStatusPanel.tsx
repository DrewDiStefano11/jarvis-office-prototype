import type { FloorDefinition } from '../domain/building/types';
import { createFloorSummary } from '../domain/building/floorSummary';
import { createRenderPlan } from '../rendering/renderPlan';
import type { CameraCommand } from '../game/scenes/OfficeScene';
import type { InspectionDetails } from '../domain/building/inspection';
import type { EffectsMode, LabelMode, ViewPreferences } from '../rendering/viewState';
import { Fragment } from 'react';

export type PanelMode = 'expanded' | 'compact' | 'collapsed';
interface FloorStatusPanelProps {
    readonly floor: FloorDefinition;
    readonly mode: PanelMode;
    readonly zoom: number;
    readonly viewName: string;
    readonly preferences: ViewPreferences;
    readonly selection?: InspectionDetails;
    readonly onModeChange: (mode: PanelMode) => void;
    readonly onCameraCommand: (command: CameraCommand) => void;
    readonly onPreferenceChange: (preferences: ViewPreferences) => void;
    readonly onClearSelection: () => void;
    readonly onNavigate: (entityId: string) => void;
    readonly onPresentation: () => void;
}

const cycleEffects = (mode: EffectsMode): EffectsMode => mode === 'on' ? 'reduced' : mode === 'reduced' ? 'off' : 'on';
const cycleLabels = (mode: LabelMode): LabelMode => mode === 'auto' ? 'minimal' : mode === 'minimal' ? 'on' : 'auto';

export function FloorStatusPanel({
    floor,
    mode,
    zoom,
    viewName,
    preferences,
    selection,
    onModeChange,
    onCameraCommand,
    onPreferenceChange,
    onClearSelection,
    onNavigate,
    onPresentation,
}: FloorStatusPanelProps) {
    const totals = createFloorSummary(floor);
    const renderCommandCount = createRenderPlan(floor).length;

    if (mode === 'collapsed') {
        return (
            <aside className="floor-status-panel is-collapsed" aria-label={`${floor.name} status`} data-render-command-count={renderCommandCount}>
                <button className="collapsed-tab" type="button" onClick={() => onModeChange('compact')} aria-label="Expand Jarvis HQ status panel">
                    <span className="status-light" aria-hidden="true" /> JARVIS HQ <span aria-hidden="true">+</span>
                </button>
            </aside>
        );
    }

    return (
        <aside className={`floor-status-panel is-${mode}`} aria-label={`${floor.name} status`} data-render-command-count={renderCommandCount}>
            <header className="status-header">
                <div>
                    <div className="status-title">JARVIS HQ</div>
                    <div className="status-subtitle">FLOOR 1 · FOUNDING COMMAND</div>
                </div>
                <span className="status-online" aria-label="Floor 1 operational">ONLINE</span>
            </header>

            <div className="view-readout">
                <span>{viewName}</span><span>{Math.round(zoom * 100)}%</span>
            </div>

            <section className="status-section primary-status" aria-label="Core capacity">
                <dl className="status-grid">
                    <dt>Permanent</dt><dd>{totals.permanentAgents} / {totals.permanentCapacity}</dd>
                    <dt>Vacancies</dt><dd>{totals.vacancies}</dd>
                    <dt>Temporary</dt><dd>{totals.temporaryActive} / {totals.temporaryDesks}</dd>
                    <dt>Sandbox</dt><dd>{totals.sandboxOccupancy} / {totals.sandboxCells}</dd>
                    <dt>Floor 1</dt><dd className="operational">Operational</dd>
                    <dt>Floor 2</dt><dd className="construction">Construction</dd>
                </dl>
            </section>

            {mode === 'expanded' && (
                <>
                    <section className="status-section" aria-label="Current population">
                        <h2>Population</h2>
                        <dl className="status-grid status-grid-small">
                            <dt>Visible Occupants</dt><dd>{totals.visibleOccupants}</dd>
                            <dt>Permanent On Floor</dt><dd>{totals.permanentAgents}</dd>
                            <dt>Visitors / Escorts</dt><dd>{totals.transientOccupants}</dd>
                        </dl>
                    </section>
                    <section className="status-section" aria-label="Operations and facility totals">
                        <h2>Operations · Facility</h2>
                        <dl className="status-grid status-grid-small">
                            <dt>Consoles / Pods</dt><dd>{totals.operationalConsoles} / {totals.operationsPods}</dd>
                            <dt>Shared Surge</dt><dd>{totals.sharedSurgeConsoles}</dd>
                            <dt>Departments</dt><dd>{totals.departments}</dd>
                            <dt>Private / Conference</dt><dd>{totals.privateOffices} / {totals.conferenceRooms}</dd>
                            <dt>Focus / Expansion</dt><dd>{totals.focusRooms} / {totals.expansionConnections}</dd>
                        </dl>
                    </section>
                </>
            )}

            {selection && (
                <section className="status-section inspector" aria-label="Selected object details">
                    <div className="section-heading"><h2>Inspector</h2><button type="button" onClick={onClearSelection} aria-label="Clear selection">Clear</button></div>
                    <strong>{selection.title}</strong>
                    <span className="inspector-subtitle">{selection.subtitle}</span>
                    <dl className="status-grid status-grid-small">
                        {selection.rows.map((row) => <Fragment key={`${selection.id}-${row.label}`}><dt>{row.label}</dt><dd>{row.value}</dd></Fragment>)}
                    </dl>
                </section>
            )}

            <section className="status-section" aria-label="Camera controls">
                <h2>View Controls</h2>
                <div className="control-grid">
                    <button type="button" onClick={() => onCameraCommand('zoom-out')} aria-label="Zoom out">− Zoom</button>
                    <button type="button" onClick={() => onCameraCommand('zoom-in')} aria-label="Zoom in">+ Zoom</button>
                    <button type="button" onClick={() => onCameraCommand('fit')} aria-label="Fit complete floor">Fit Floor</button>
                    <button type="button" onClick={() => onCameraCommand('reset')} aria-label="Reset floor view">Reset View</button>
                </div>
            </section>

            {mode === 'expanded' && (
                <section className="status-section" aria-label="View layers">
                    <h2>View Layers</h2>
                    <div className="layer-controls">
                        <button type="button" onClick={() => onPreferenceChange({ ...preferences, labels: cycleLabels(preferences.labels) })}>Labels: {preferences.labels}</button>
                        <button type="button" onClick={() => onPreferenceChange({ ...preferences, effects: cycleEffects(preferences.effects) })}>Effects: {preferences.effects}</button>
                        <button type="button" aria-pressed={preferences.occupants} onClick={() => onPreferenceChange({ ...preferences, occupants: !preferences.occupants })}>Occupants: {preferences.occupants ? 'On' : 'Off'}</button>
                        <button type="button" aria-pressed={preferences.workspaceStates} onClick={() => onPreferenceChange({ ...preferences, workspaceStates: !preferences.workspaceStates })}>Workspace States: {preferences.workspaceStates ? 'On' : 'Off'}</button>
                        <button type="button" aria-pressed={preferences.accessIndicators} onClick={() => onPreferenceChange({ ...preferences, accessIndicators: !preferences.accessIndicators })}>Access Cues: {preferences.accessIndicators ? 'On' : 'Reduced'}</button>
                        <button type="button" aria-pressed={preferences.roomHighlights} onClick={() => onPreferenceChange({ ...preferences, roomHighlights: !preferences.roomHighlights })}>Highlights: {preferences.roomHighlights ? 'On' : 'Off'}</button>
                    </div>
                </section>
            )}

            {mode === 'expanded' && (
                <section className="status-section" aria-label="Department navigation">
                    <h2>Navigate</h2>
                    <div className="navigation-grid">
                        <button type="button" onClick={() => onNavigate('floor-1.zone.central-nexus')}>Nexus</button>
                        {floor.departments.map((department) => (
                            <button type="button" key={department.id} onClick={() => onNavigate(department.id)}>{department.number}. {department.name.split(' ')[0]}</button>
                        ))}
                    </div>
                </section>
            )}

            <div className="access-key" aria-label="Access levels">
                <span><i className="key-general" />G · General</span>
                <span><i className="key-department" />D · Department</span>
                <span><i className="key-restricted" />R · Restricted</span>
                <span><i className="key-high" />H · Highly Restricted</span>
                <span><i className="key-containment" />C · Escorted</span>
            </div>

            <footer className="panel-mode-controls">
                <button type="button" onClick={onPresentation}>Present</button>
                {mode === 'expanded' && <button type="button" onClick={() => onModeChange('compact')}>Compact</button>}
                {mode === 'compact' && <button type="button" onClick={() => onModeChange('expanded')}>Expand</button>}
                <button type="button" onClick={() => onModeChange('collapsed')}>Collapse</button>
            </footer>
        </aside>
    );
}
