import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
    shouldRenderMissingSpriteFallback,
    spriteAssetStateAfterRuntimeLoad,
} from '../../office/animation';
import { getSpriteSheetAsset, OFFICE_ASSETS } from '../../office/assets';
import { NON_PRODUCTION_OVERLAY } from '../../office/sampleOverlay';
import { OfficeEntity, OfficeLayer } from '../../office/types';
import { OverlayRenderer } from './OverlayRenderer';

const visibleLayers = new Set<OfficeLayer>(['furniture', 'labels']);
const entities = NON_PRODUCTION_OVERLAY.entities.filter(
    (entity): entity is OfficeEntity => entity.type === 'desk' || entity.type === 'label_anchor',
);

function render(showLabels: boolean): string {
    return renderToStaticMarkup(
        <OverlayRenderer
            entities={entities}
            visibleLayers={visibleLayers}
            debug={false}
            selectedId={null}
            hoveredId={null}
            showLabels={showLabels}
            reducedMotion={true}
            onHover={() => undefined}
            onSelect={() => undefined}
        />,
    );
}

describe('production overlay rendering', () => {
    it('renders label-anchor names only above the label zoom threshold', () => {
        expect(render(true)).toContain('data-production-label="sample.label.central"');
        expect(render(true)).toContain('Sample Central Room');
        expect(render(false)).not.toContain('data-production-label');
    });

    it('renders the documented yellow priority-seat marker in production mode', () => {
        const markup = render(false);
        expect(markup).toContain('data-seat-priority="yellow"');
        expect(markup).toContain('>P</text>');
    });

    it('keeps a registered but unavailable sprite file on the visible fallback path', () => {
        expect(getSpriteSheetAsset(OFFICE_ASSETS.hologram.id)).toBe(OFFICE_ASSETS.hologram);
        const missingFileState = spriteAssetStateAfterRuntimeLoad(false);
        const invalidDimensionsState = spriteAssetStateAfterRuntimeLoad(true, false);
        expect(missingFileState).toBe('missing');
        expect(invalidDimensionsState).toBe('missing');
        expect(shouldRenderMissingSpriteFallback(missingFileState)).toBe(true);
        expect(shouldRenderMissingSpriteFallback(invalidDimensionsState)).toBe(true);
    });
});
