/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { ReactNode } from 'react';
import { OfficeOverlayDocument, OfficeLayer, ViewTransform, Point } from '../../office/types';
import { EntityInspector } from './EntityInspector';
import { OfficeViewport } from './OfficeViewport';
import './office-engine.css';

interface OfficeEngineCoreProps {
    active: boolean;
    document: OfficeOverlayDocument | null;
    loadError: string | null;
    statusLabel: string;
    dataSource: string;
    debugToggle?: ReactNode;
    selectedId: string | null;
    hoveredId: string | null;
    transform: ViewTransform;
    focusRequest: number;
    visibleLayers: ReadonlySet<OfficeLayer>;
    onSelectId: (id: string | null) => void;
    onHoverId: (id: string | null) => void;
    onPointerOfficePoint: (point: Point | null) => void;
    onTransformChange: (transform: ViewTransform) => void;
    onFocusRequest: () => void;
    children?: ReactNode;
}

export function OfficeEngineCore({
    active,
    document,
    loadError,
    statusLabel,
    dataSource,
    debugToggle,
    selectedId,
    hoveredId,
    focusRequest,
    visibleLayers,
    onSelectId,
    onHoverId,
    onPointerOfficePoint,
    onTransformChange,
    onFocusRequest,
    children
}: OfficeEngineCoreProps) {
    const inspected = document?.entities.find(e => e.id === hoveredId) ?? document?.entities.find(e => e.id === selectedId) ?? null;

    return (
        <main className="office-engine">
            <header className="engine-header">
                <div>
                    <p className="eyebrow">Jarvis office prototype</p>
                    <h1>Interactive office engine</h1>
                </div>
                <div className="header-actions">
                    <span className={`sample-badge ${dataSource === 'candidate-review' ? 'sample-badge--candidate' : ''}`}>
                        {statusLabel}
                    </span>
                    {debugToggle}
                </div>
            </header>
            <section className="engine-workspace">
                {loadError && (
                    <p className="asset-status asset-status--error" role="alert">
                        {loadError}
                    </p>
                )}

                <OfficeViewport
                    active={active}
                    document={document as any}
                    debug={false}
                    reviewMode={dataSource === 'candidate-review'}
                    selectedId={selectedId}
                    hoveredId={hoveredId}
                    visibleLayers={visibleLayers}
                    onSelect={onSelectId}
                    onHover={onHoverId}
                    onPointerOfficePoint={onPointerOfficePoint}
                    onTransformChange={onTransformChange}
                    focusRequest={focusRequest}
                />

                {children}

                {/* Provide the normal side panel if there's no debug overlay covering it entirely. */}
                {!children && (
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
