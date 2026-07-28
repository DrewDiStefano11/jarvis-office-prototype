import { describe, expect, it } from 'vitest';
import { resolvePublicAssetPath } from '../assets';

describe('office public asset URLs', () => {
    it.each([
        ['domain root', '/', 'assets/office/background.png', '/assets/office/background.png'],
        ['relative build', './', 'assets/office/background.png', './assets/office/background.png'],
        ['nested deployment', '/jarvis-office-prototype/', 'assets/office/background.png', '/jarvis-office-prototype/assets/office/background.png'],
        ['nested deployment without trailing slash', '/jarvis-office-prototype', 'assets/office/background.png', '/jarvis-office-prototype/assets/office/background.png'],
        ['normalized boundary separators', '/jarvis-office-prototype//', '//assets/office/background.png', '/jarvis-office-prototype/assets/office/background.png'],
    ])('resolves an asset for a %s', (_label, baseUrl, path, expected) => {
        expect(resolvePublicAssetPath(path, baseUrl)).toBe(expected);
    });

    it('applies the same resolution to background and hologram public paths', () => {
        const baseUrl = '/nested/';
        expect(resolvePublicAssetPath('assets/office/office-8192x5460.png', baseUrl))
            .toBe('/nested/assets/office/office-8192x5460.png');
        expect(resolvePublicAssetPath('assets/office/sprites/central-blue-tube-hologram.png', baseUrl))
            .toBe('/nested/assets/office/sprites/central-blue-tube-hologram.png');
    });
});
