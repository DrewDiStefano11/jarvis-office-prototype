// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SpriteLab from '../../sprite-lab/SpriteLab';
import { SOURCE_ASSET_INVENTORY } from '../sprites/inventory';

/**
 * Smoke coverage for the isolated review lab. The lab is not part of the office
 * application, so these tests only assert that it mounts, reports validation
 * honestly, and surfaces the measured metadata.
 */

class StubImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    naturalWidth = 1254;
    naturalHeight = 1254;
    set src(_value: string) {
        queueMicrotask(() => this.onload?.());
    }
}

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('sprite lab', () => {
    it('mounts and reports separated status axes, not one green VALID', async () => {
        vi.stubGlobal('Image', StubImage as unknown as typeof Image);
        render(<SpriteLab />);
        expect(await screen.findByText(/Sprite Asset & Animation Lab/)).toBeTruthy();
        await waitFor(() => {
            expect(screen.getByTestId('axis-structure').textContent).toBe('valid');
        });
        expect(screen.getByTestId('axis-measurements').textContent).toBe('valid');
        // Structural validity must not be presented as production approval.
        expect(screen.getByTestId('axis-approval').textContent).toBe('not approved');
        expect(screen.getByTestId('axis-authorship').textContent).toBe('unverified');
        expect(screen.getByTestId('axis-review').textContent).toBe('required');
    });

    it('shows the Nexus candidate banner', () => {
        vi.stubGlobal('Image', StubImage as unknown as typeof Image);
        render(<SpriteLab />);
        expect(screen.getByTestId('nexus-status-banner').textContent)
            .toContain('CANDIDATE — HUMAN REVIEW REQUIRED');
    });

    it('lists every inventoried source asset in the selector', () => {
        vi.stubGlobal('Image', StubImage as unknown as typeof Image);
        const { container } = render(<SpriteLab />);
        const options = container.querySelectorAll('select option');
        const values = [...options].map(o => (o as HTMLOptionElement).value);
        for (const asset of SOURCE_ASSET_INVENTORY.assets) {
            expect(values).toContain(asset.path);
        }
    });

    it('renders the Central Nexus preview and the invalid-metadata fallback', async () => {
        vi.stubGlobal('Image', StubImage as unknown as typeof Image);
        render(<SpriteLab />);
        const preview = await screen.findByRole('img', { name: 'Central Nexus hologram preview' });
        await waitFor(() => expect(preview.getAttribute('data-sprite-state')).toBe('ready'));

        const invalid = screen.getByRole('img', { name: /Intentionally invalid animation unavailable/ });
        expect(invalid.getAttribute('data-sprite-state')).toBe('invalid');
    });

    it('shows measured grid cells with zero-based labels', () => {
        vi.stubGlobal('Image', StubImage as unknown as typeof Image);
        const { container } = render(<SpriteLab />);
        const cells = container.querySelectorAll('.sprite-lab__cell');
        // First asset is an agent sheet: 6 columns x 8 rows.
        expect(cells.length).toBe(48);
        expect(cells[0].querySelector('em')?.textContent).toBe('0');
    });
});

describe('sprite lab manual navigation and quarantine', () => {
    const AMBIGUOUS = [
        'd85660f4-dd62-4dbc-baa6-7ccd75361bf0 (10).png',
        'd85660f4-dd62-4dbc-baa6-7ccd75361bf0 (11).png',
        'd85660f4-dd62-4dbc-baa6-7ccd75361bf0 (12).png',
        'd85660f4-dd62-4dbc-baa6-7ccd75361bf0 (14).png',
    ];

    function selectAsset(container: HTMLElement, path: string) {
        const select = [...container.querySelectorAll('select')]
            .find(s => [...s.options].some(o => o.value === path)) as HTMLSelectElement;
        fireEvent.change(select, { target: { value: path } });
    }

    it('never presents a quarantined sheet as a valid 48-frame grid', () => {
        vi.stubGlobal('Image', StubImage as unknown as typeof Image);
        const { container } = render(<SpriteLab />);
        for (const path of AMBIGUOUS) {
            selectAsset(container, path);
            // No fabricated equal cells for an unverified layout.
            expect(container.querySelectorAll('.sprite-lab__cell').length, path).toBe(0);
            expect(screen.getByTestId('extraction-blocked').textContent, path)
                .toContain('Frame extraction unavailable pending human review');
        }
    });

    it('still shows measured cells for verified sheets', () => {
        vi.stubGlobal('Image', StubImage as unknown as typeof Image);
        const { container } = render(<SpriteLab />);
        selectAsset(container, 'd85660f4-dd62-4dbc-baa6-7ccd75361bf0.png');
        expect(container.querySelectorAll('.sprite-lab__cell').length).toBe(48);
        expect(screen.queryByTestId('extraction-blocked')).toBeNull();
    });

    it('marks the alpha-less job sheet as extraction-blocked', () => {
        vi.stubGlobal('Image', StubImage as unknown as typeof Image);
        const { container } = render(<SpriteLab />);
        selectAsset(container, 'Sprite Jobs.png');
        expect(container.querySelectorAll('.sprite-lab__cell').length).toBe(0);
        expect(screen.getByTestId('extraction-blocked')).toBeTruthy();
    });

    it('maps manual navigation through sequence position, not raw frame index', () => {
        vi.stubGlobal('Image', StubImage as unknown as typeof Image);
        render(<SpriteLab />);
        // Default idle is ping-pong: sequence 0..9 then 8..1 (length 18).
        const next = screen.getByRole('button', { name: 'Next frame' });
        for (let i = 0; i < 11; i++) fireEvent.click(next);
        const position = Number(screen.getByTestId('sequence-position').textContent);
        const sheetFrame = Number(screen.getByTestId('sheet-frame-index').textContent);
        expect(position).toBe(11);
        // Sequence is 0..9 then 8..1; position 11 mirrors back to sheet frame 7,
        // NOT 11 (which was the bug: the position was passed through as a frame).
        expect(sheetFrame).toBe(7);
        expect(sheetFrame).not.toBe(position);
    });

    it('clamps at the sequence end and never goes negative', () => {
        vi.stubGlobal('Image', StubImage as unknown as typeof Image);
        render(<SpriteLab />);
        const prev = screen.getByRole('button', { name: 'Prev frame' });
        for (let i = 0; i < 5; i++) fireEvent.click(prev);
        expect(Number(screen.getByTestId('sequence-position').textContent)).toBe(0);
        expect(Number(screen.getByTestId('sheet-frame-index').textContent))
            .toBeGreaterThanOrEqual(0);

        const next = screen.getByRole('button', { name: 'Next frame' });
        for (let i = 0; i < 50; i++) fireEvent.click(next);
        const position = Number(screen.getByTestId('sequence-position').textContent);
        expect(position).toBe(17); // ping-pong length 18, zero-based
        expect(Number(screen.getByTestId('sheet-frame-index').textContent)).toBe(1);
    });

    it('resets manual position when the loop mode changes', () => {
        vi.stubGlobal('Image', StubImage as unknown as typeof Image);
        const { container } = render(<SpriteLab />);
        const next = screen.getByRole('button', { name: 'Next frame' });
        for (let i = 0; i < 12; i++) fireEvent.click(next);
        expect(screen.getByTestId('sequence-position').textContent).toBe('12');

        const loopSelect = [...container.querySelectorAll('select')]
            .find(s => [...s.options].some(o => o.value === 'ping-pong')) as HTMLSelectElement;
        fireEvent.change(loopSelect, { target: { value: 'loop' } });
        // Shorter sequence: position must not point at an unrelated frame.
        expect(screen.getByTestId('sequence-position').textContent).toBe('auto');
    });

    it('resets manual position when the animation changes', () => {
        vi.stubGlobal('Image', StubImage as unknown as typeof Image);
        const { container } = render(<SpriteLab />);
        fireEvent.click(screen.getByRole('button', { name: 'Next frame' }));
        expect(screen.getByTestId('sequence-position').textContent).toBe('1');

        const animSelect = [...container.querySelectorAll('select')]
            .find(s => [...s.options].some(o => o.value === 'ANIM_CENTRAL_NEXUS_FLOAT')) as HTMLSelectElement;
        fireEvent.change(animSelect, { target: { value: 'ANIM_CENTRAL_NEXUS_FLOAT' } });
        expect(screen.getByTestId('sequence-position').textContent).toBe('auto');
    });
});
