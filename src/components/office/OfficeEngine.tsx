import { useEffect, useMemo, useState } from 'react';
import { loadVerifiedProductionOverlay } from '../../office/floor1/runtime';
import {
    FLOOR1_CANDIDATE_LAYERS,
    loadFloor1CandidateOverlay,
} from '../../office/floor1/candidateReview';
import { NON_PRODUCTION_OVERLAY } from '../../office/sampleOverlay';
import { OfficeLayer, OfficeOverlayDocument, Point, ViewTransform } from '../../office/types';
import { OfficeEngineCore } from './OfficeEngineCore';

const CANDIDATE_LOAD_TIMEOUT_MS = 10_000;

type OfficeLoadState =
    | Readonly<{ status: 'loading'; stage: string }>
    | Readonly<{ status: 'loaded'; document: OfficeOverlayDocument; dataSource: 'approved-production' | 'candidate-review' | 'sample-fallback' }>
    | Readonly<{ status: 'error'; stage: string; message: string }>;

interface OfficeEngineProps {
    active: boolean;
    candidateLoader?: () => Promise<OfficeOverlayDocument>;
}

function candidateModeRequested(): boolean {
    return import.meta.env.DEV && new URLSearchParams(window.location.search).get('floor1Review') === 'candidate';
}

function messageFrom(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error(message)), timeoutMs);
        promise.then(
            value => { window.clearTimeout(timeout); resolve(value); },
            error => { window.clearTimeout(timeout); reject(error); },
        );
    });
}

export function OfficeEngine({ active, candidateLoader }: OfficeEngineProps) {
    const candidateRequested = candidateModeRequested();
    const [loadState, setLoadState] = useState<OfficeLoadState>({ status: 'loading', stage: candidateRequested ? 'candidate-data' : 'production-data' });
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [, setTransform] = useState<ViewTransform>({ x: 0, y: 0, scale: 1 });
    const [, setPointer] = useState<Point | null>(null);
    const [focusRequest, setFocusRequest] = useState(0);
    const visibleLayers = useMemo<ReadonlySet<OfficeLayer>>(
        () => candidateRequested ? new Set(FLOOR1_CANDIDATE_LAYERS) : new Set<OfficeLayer>(),
        [candidateRequested],
    );

    useEffect(() => {
        let stale = false;
        setLoadState({ status: 'loading', stage: candidateRequested ? 'candidate-data' : 'production-data' });

        if (candidateRequested) {
            const loader = candidateLoader ?? loadFloor1CandidateOverlay;
            withTimeout(loader(), CANDIDATE_LOAD_TIMEOUT_MS, 'Candidate data loading timed out after 10 seconds.')
                .then(document => {
                    if (!stale) setLoadState({ status: 'loaded', document, dataSource: 'candidate-review' });
                })
                .catch(error => {
                    if (stale) return;
                    const message = messageFrom(error, 'Floor 1 candidate data failed validation.');
                    console.error('[Floor 1 candidate][candidate-data]', error);
                    setLoadState({ status: 'error', stage: 'candidate-data', message });
                });
        } else {
            loadVerifiedProductionOverlay()
                .then(document => {
                    if (stale) return;
                    setLoadState(document
                        ? { status: 'loaded', document, dataSource: 'approved-production' }
                        : { status: 'loaded', document: NON_PRODUCTION_OVERLAY, dataSource: 'sample-fallback' });
                })
                .catch(error => {
                    if (stale) return;
                    const message = messageFrom(error, 'Approved Floor 1 data failed validation.');
                    console.error('[Office engine][production-data]', error);
                    setLoadState({ status: 'error', stage: 'production-data', message });
                });
        }

        return () => { stale = true; };
    }, [candidateLoader, candidateRequested]);

    const dataSource = loadState.status === 'loaded' ? loadState.dataSource : candidateRequested ? 'candidate-review' : 'sample-fallback';
    const statusLabel = dataSource === 'approved-production'
        ? 'Approved production Floor 1'
        : dataSource === 'candidate-review'
            ? 'Candidate sandbox — unverified / not production approved'
            : 'Sample fallback — not production Floor 1';

    return (
        <OfficeEngineCore
            active={active}
            loadState={loadState}
            statusLabel={statusLabel}
            dataSource={dataSource}
            selectedId={selectedId}
            hoveredId={hoveredId}
            focusRequest={focusRequest}
            visibleLayers={visibleLayers}
            onSelectId={setSelectedId}
            onHoverId={setHoveredId}
            onPointerOfficePoint={setPointer}
            onTransformChange={setTransform}
            onFocusRequest={() => setFocusRequest(value => value + 1)}
        />
    );
}
