// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
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
    it('mounts and reports the manifest as valid', async () => {
        vi.stubGlobal('Image', StubImage as unknown as typeof Image);
        render(<SpriteLab />);
        expect(await screen.findByText(/Sprite Asset & Animation Lab/)).toBeTruthy();
        await waitFor(() => {
            const status = document.querySelector('.status');
            expect(status?.className).toContain('status--ok');
            expect(status?.textContent).toMatch(/^VALID/);
        });
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
