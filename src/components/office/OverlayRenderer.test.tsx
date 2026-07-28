import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
    shouldRenderMissingSpriteFallback,
    spriteAssetStateAfterRuntimeLoad,
} from '../../office/animation';
import { getSpriteSheetAsset, OFFICE_ASSETS } from '../../office/assets';
import { NON_PRODUCTION_OVERLAY } from '../../office/sampleOverlay';
import { OfficeEntity, OfficeLayer } from '../../office/types';
import { EntityInspector } from './EntityInspector';
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

function renderEntity(entity: OfficeEntity): string {
    return renderToStaticMarkup(
        <OverlayRenderer
            entities={[entity]}
            visibleLayers={new Set([entity.sourceLayer])}
            debug={true}
            selectedId={null}
            hoveredId={null}
            showLabels={true}
            reducedMotion={true}
            onHover={() => undefined}
            onSelect={() => undefined}
        />,
    );
}

function withoutDirectAccess(entity: OfficeEntity): Omit<OfficeEntity, 'accessState' | 'accessPolicy'> {
    const copy = { ...entity };
    delete copy.accessState;
    delete copy.accessPolicy;
    return copy;
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

describe('access-state rendering', () => {
    const light = NON_PRODUCTION_OVERLAY.entities.find(entity => entity.type === 'access_light')!;
    const door = NON_PRODUCTION_OVERLAY.entities.find(entity => entity.type === 'door')!;

    it('colors an access light from accessPolicy.state and shows the same state in the inspector', () => {
        const entity: OfficeEntity = { ...withoutDirectAccess(light), accessPolicy: { state: 'blue' } };
        expect(renderEntity(entity)).toContain('fill="#4f9cff"');
        const inspector = renderToStaticMarkup(<EntityInspector entity={entity} onFocus={() => undefined} />);
        expect(inspector).toContain('blue');
        expect(inspector).toContain('Reserved or member-restricted');
    });

    it('colors a door from door.currentState', () => {
        const entity: OfficeEntity = {
            ...withoutDirectAccess(door),
            door: { ...door.door!, currentState: 'red' },
        };
        expect(renderEntity(entity)).toContain('fill="#ff4e5f"');
    });

    it('uses explicit accessState when all three access fields exist', () => {
        const entity: OfficeEntity = {
            ...door,
            accessState: 'green',
            accessPolicy: { state: 'yellow' },
            door: { ...door.door!, currentState: 'red' },
        };
        expect(renderEntity(entity)).toContain('fill="#42d77d"');
    });

    it('falls back to the normal layer color when no access state exists', () => {
        expect(renderEntity(withoutDirectAccess(light))).toContain('fill="#ffffff"');
    });
});
