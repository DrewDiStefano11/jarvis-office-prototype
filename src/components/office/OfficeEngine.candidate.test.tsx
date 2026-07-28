// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    FLOOR1_CANDIDATE_CATEGORIES,
    FLOOR1_CANDIDATE_LAYER_CONTROLS,
} from '../../office/floor1/candidateReview';
import { OfficeEntity, OfficeLayer, OfficeOverlayDocument } from '../../office/types';
import { OfficeEngine } from './OfficeEngine';

type MockViewportProps = Readonly<{
    document: OfficeOverlayDocument;
    visibleLayers: ReadonlySet<OfficeLayer>;
    reviewMode?: boolean;
    onSelect: (id: string | null) => void;
}>;

vi.mock('./OfficeViewport', () => ({
    OfficeViewport: ({ document, visibleLayers, reviewMode, onSelect }: MockViewportProps) => (
        <div data-testid="office-background" data-review-mode={String(reviewMode)}>
            {document.entities
                .filter(entity => visibleLayers.has(entity.sourceLayer))
                .map(entity => (
                    <button
                        type="button"
                        key={entity.id}
                        data-entity-id={entity.id}
                        data-candidate-category={String(entity.metadata.candidateCategory)}
                        onClick={() => onSelect(entity.id)}
                    >
                        {entity.name}
                    </button>
                ))}
        </div>
    ),
}));

function candidateDocument(): OfficeOverlayDocument {
    const entities = FLOOR1_CANDIDATE_LAYER_CONTROLS.map((control, index): OfficeEntity => ({
        id: `floor1-candidate.${control.category}.test-${index}`,
        type: control.category === 'rooms' ? 'room'
            : control.category === 'walk-paths' ? 'walk_path'
                : control.category === 'walls' ? 'wall'
                    : control.category === 'doors' ? 'door'
                        : control.category === 'door-lights' ? 'access_light'
                            : control.category === 'computers' ? 'computer'
                                : control.category === 'positions' ? 'desk'
                                    : control.category === 'objects' ? 'restricted_zone'
                                        : 'interaction_zone',
        name: `${control.label} candidate`,
        geometry: { kind: 'point', point: { x: 100 + index, y: 200 + index } },
        sourceLayer: control.layer,
        enabled: true,
        interactive: true,
        allowOutOfBounds: true,
        metadata: {
            candidateCategory: control.category,
            productionApproved: false,
            reviewStatus: 'candidate-unverified',
        },
        zIndex: 0,
    }));
    return {
        schemaVersion: 1,
        source: { width: 8192, height: 5460 },
        production: false,
        entities,
        pathNodes: [],
    };
}

beforeEach(() => {
    window.history.replaceState({}, '', '/?floor1Review=candidate');
});

afterEach(() => {
    cleanup();
    window.history.replaceState({}, '', '/');
    vi.restoreAllMocks();
});

describe('normal interactive office candidate review mode', () => {
    it('loads candidate entities, all categories, and no sample entities', async () => {
        const document = candidateDocument();
        const { container } = render(<OfficeEngine active candidateLoader={async () => document} />);

        await waitFor(() => expect(container.querySelectorAll('[data-entity-id]')).toHaveLength(9));
        const status = screen.getByTestId('floor1-runtime-status');
        expect(status.textContent).toBe('Floor 1 candidate — not production approved');
        expect(status.classList.contains('sample-badge--candidate')).toBe(true);
        expect(screen.getByTestId('office-background').dataset.reviewMode).toBe('true');
        expect(new Set(
            [...container.querySelectorAll('[data-candidate-category]')]
                .map(element => element.getAttribute('data-candidate-category')),
        )).toEqual(new Set(FLOOR1_CANDIDATE_CATEGORIES));
        expect(container.querySelector('[data-entity-id^="sample."]')).toBeNull();
    });

    it('master-hides every scope layer while leaving the office background mounted', async () => {
        const { container } = render(<OfficeEngine active candidateLoader={async () => candidateDocument()} />);
        await waitFor(() => expect(container.querySelectorAll('[data-entity-id]')).toHaveLength(9));

        fireEvent.click(screen.getByRole('checkbox', { name: 'Show scope overlays' }));

        expect(container.querySelectorAll('[data-entity-id]')).toHaveLength(0);
        expect(screen.getByTestId('office-background')).toBeTruthy();
        expect((screen.getByRole('checkbox', { name: 'Rooms' }) as HTMLInputElement).checked).toBe(true);
    });

    it('per-layer controls hide only their selected candidate category', async () => {
        const { container } = render(<OfficeEngine active candidateLoader={async () => candidateDocument()} />);
        await waitFor(() => expect(container.querySelectorAll('[data-entity-id]')).toHaveLength(9));

        fireEvent.click(screen.getByRole('checkbox', { name: 'Rooms' }));

        expect(container.querySelector('[data-candidate-category="rooms"]')).toBeNull();
        expect(container.querySelector('[data-candidate-category="walls"]')).toBeTruthy();
        expect(container.querySelectorAll('[data-entity-id]')).toHaveLength(8);
    });
});
