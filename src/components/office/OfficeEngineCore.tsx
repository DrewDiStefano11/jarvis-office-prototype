import { OfficeLayer, OfficeOverlayDocument, Point, ViewTransform } from '../../office/types';
import { EntityInspector } from './EntityInspector';
import { OfficeViewport } from './OfficeViewport';
import './office-engine.css';

type OfficeLoadState =
    | Readonly<{ status: 'loading'; stage: string }>
    | Readonly<{ status: 'loaded'; document: OfficeOverlayDocument; dataSource: string }>
    | Readonly<{ status: 'error'; stage: string; message: string }>;

interface OfficeEngineCoreProps {
    active: boolean;
    presentation: 'inspection' | 'simulation';
    loadState: OfficeLoadState;
    statusLabel: string;
    dataSource: string;
    selectedId: string | null;
    hoveredId: string | null;
    focusRequest: number;
    visibleLayers: ReadonlySet<OfficeLayer>;
    transform: ViewTransform;
    pointer: Point | null;
    onSelectId: (id: string | null) => void;
    onHoverId: (id: string | null) => void;
    onPointerOfficePoint: (point: Point | null) => void;
    onTransformChange: (transform: ViewTransform) => void;
    onToggleLayer: (layer: OfficeLayer) => void;
    onFocusRequest: () => void;
    onRetry: () => void;
}

export function OfficeEngineCore({
    active,
    presentation,
    loadState,
    statusLabel,
    dataSource,
    selectedId,
    hoveredId,
    focusRequest,
    visibleLayers,
    transform,
    pointer,
    onSelectId,
    onHoverId,
    onPointerOfficePoint,
    onTransformChange,
    onToggleLayer,
    onFocusRequest,
    onRetry,
}: OfficeEngineCoreProps) {
    const document = loadState.status === 'loaded' ? loadState.document : null;
    const inspected = document?.entities.find(entity => entity.id === hoveredId)
        ?? document?.entities.find(entity => entity.id === selectedId)
        ?? null;
    const candidateMode = dataSource === 'candidate-review';

    return (
        <main className="office-engine">
            <header className="engine-header">
                <div>
                    <p className="eyebrow">Jarvis office prototype</p>
                    <h1>{presentation === 'inspection' ? 'Interactive office engine' : 'Agent route laboratory'}</h1>
                </div>
                <div className="header-actions">
                    <span className={`sample-badge ${candidateMode ? 'sample-badge--candidate' : ''}`}>{statusLabel}</span>
                </div>
            </header>
            <section className={`engine-workspace ${candidateMode ? 'engine-workspace--candidate' : ''}`}>
                {candidateMode && (
                    <p className="candidate-trust-warning" role="alert">
                        Provisional, unverified Floor 1 geometry and routing — not production approved.
                    </p>
                )}
                {loadState.status === 'loading' && (
                    <div className="office-load-state" role="status" data-load-stage={loadState.stage}>
                        Loading Floor 1 {candidateMode ? 'candidate data' : 'office data'}…
                    </div>
                )}
                {loadState.status === 'error' && (
                    <div className="office-load-state office-load-state--error" role="alert" data-load-stage={loadState.stage}>
                        <strong>Floor 1 failed during {loadState.stage}.</strong>
                        <span>{loadState.message}</span>
                        <button type="button" onClick={onRetry}>Retry Floor 1 load</button>
                    </div>
                )}
                {document && (
                    <OfficeViewport
                        active={active}
                        presentation={presentation}
                        document={document}
                        debug={candidateMode}
                        reviewMode={candidateMode}
                        selectedId={selectedId}
                        hoveredId={hoveredId}
                        visibleLayers={visibleLayers}
                        transformTelemetry={transform}
                        pointerTelemetry={pointer}
                        onToggleLayer={onToggleLayer}
                        onSelect={onSelectId}
                        onHover={onHoverId}
                        onPointerOfficePoint={onPointerOfficePoint}
                        onTransformChange={onTransformChange}
                        focusRequest={focusRequest}
                    />
                )}
                {document && !candidateMode && (
                    <aside className="engine-sidebar">
                        <section className="engine-panel access-legend">
                            <h2>Access semantics</h2>
                            <p><i className="green" /> Green · general access</p>
                            <p><i className="blue" /> Blue · member or role restricted</p>
                            <p><i className="yellow" /> Yellow · temporarily reserved</p>
                            <p><i className="red" /> Red · blocked</p>
                            <small>For seats only: yellow means priority; red means standard.</small>
                        </section>
                        <EntityInspector entity={inspected} onFocus={onFocusRequest} />
                    </aside>
                )}
            </section>
        </main>
    );
}
