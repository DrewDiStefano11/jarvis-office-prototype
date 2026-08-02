/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useState, useEffect, lazy, Suspense } from 'react';
import { loadVerifiedProductionOverlay } from '../../office/floor1/runtime';
import { loadFloor1CandidateOverlay } from '../../office/floor1/candidateReview';
import { OfficeOverlayDocument, Point, ViewTransform } from '../../office/types';
import { OfficeEngineCore } from './OfficeEngineCore';

const OfficeDevelopmentEngine = import.meta.env.DEV
    ? lazy(() => import('./OfficeDevelopmentEngine').then(m => ({ default: m.OfficeDevelopmentEngine })))
    : null;

interface OfficeEngineProps {
    active: boolean;
    candidateLoader?: () => Promise<OfficeOverlayDocument>;
}

export function OfficeEngine({ active, candidateLoader }: OfficeEngineProps) {
    const [document, setDocument] = useState<OfficeOverlayDocument | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [dataSource, setDataSource] = useState<'approved-production' | 'candidate-review' | 'sample-fallback'>('sample-fallback');
    const [debug, setDebug] = useState(false);

    // Viewport state
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [transform, setTransform] = useState<ViewTransform>({ x: 0, y: 0, scale: 1 });
    const [pointer, setPointer] = useState<Point | null>(null);
    const [focusRequest, setFocusRequest] = useState(0);

    // Passed to children
    const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set());

    useEffect(() => {
        let cancelled = false;
        const url = new URL(window.location.href);
        const reviewRequested = url.searchParams.get('floor1Review') === 'candidate';

        if (reviewRequested || debug) {
            const loadCandidate = candidateLoader ?? loadFloor1CandidateOverlay;
            loadCandidate().then(candidate => {
                if (cancelled) return;
                setDocument(candidate);
                setDataSource('candidate-review');
            }).catch(error => {
                if (cancelled) return;
                setLoadError(error instanceof Error ? error.message : 'Floor 1 candidate data failed validation.');
            });
            return () => { cancelled = true; };
        }

        loadVerifiedProductionOverlay().then(production => {
            if (cancelled || !production) return;
            setDocument(production);
            setDataSource('approved-production');
        }).catch(error => {
            if (cancelled) return;
            setLoadError(error instanceof Error ? error.message : 'Approved Floor 1 data failed validation.');
        });

        return () => { cancelled = true; };
    }, [candidateLoader, debug]);

    const statusLabel = dataSource === 'approved-production'
        ? 'Approved production Floor 1'
        : dataSource === 'candidate-review'
            ? 'Candidate review / Debug'
            : 'Sample fallback — not production Floor 1';

    const debugToggle = import.meta.env.DEV ? (
        <label className="debug-toggle">
            <input type="checkbox" checked={debug} onChange={e => {
                setDebug(e.target.checked);
                if (!e.target.checked) setVisibleLayers(new Set());
            }} />
            {debug ? 'Disable debug mode' : 'Enable debug mode'}
        </label>
    ) : null;

    return (
        <OfficeEngineCore
            active={active}
            document={document}
            loadError={loadError}
            statusLabel={statusLabel}
            dataSource={dataSource}
            debugToggle={debugToggle}
            selectedId={selectedId}
            hoveredId={hoveredId}
            transform={transform}
            focusRequest={focusRequest}
            visibleLayers={visibleLayers as any}
            onSelectId={setSelectedId}
            onHoverId={setHoveredId}
            onPointerOfficePoint={setPointer}
            onTransformChange={setTransform}
            onFocusRequest={() => setFocusRequest(v => v + 1)}
        >
            {debug && OfficeDevelopmentEngine && (
                <Suspense fallback={null}>
                    <OfficeDevelopmentEngine
                        active={active}
                        document={document as any}
                        transform={transform}
                        selectedId={selectedId}
                        onSelectId={setSelectedId}
                        pointer={pointer}
                        visibleLayers={visibleLayers}
                        setVisibleLayers={setVisibleLayers}
                    />
                </Suspense>
            )}
        </OfficeEngineCore>
    );
}
