import { describe, expect, it } from 'vitest';
import { NON_PRODUCTION_OVERLAY } from '../sampleOverlay';
import { compareEntities, LAYER_ORDER, pickTopEntity } from '../layers';
import { focusEntityTransform, panTransform, reconcileSelection, toggleLayerVisibility } from '../interaction';

describe('layer and interaction behavior', () => {
    it('uses an explicit deterministic layer order', () => {
        const sorted = [...NON_PRODUCTION_OVERLAY.entities].sort(compareEntities);
        const indexes = sorted.map(entity => LAYER_ORDER.indexOf(entity.sourceLayer));
        expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
    });

    it('resolves overlap by layer, z-index, type, then stable ID', () => {
        const room = NON_PRODUCTION_OVERLAY.entities.find(entity => entity.type === 'room')!;
        const door = NON_PRODUCTION_OVERLAY.entities.find(entity => entity.type === 'door')!;
        expect(pickTopEntity([door, room])?.id).toBe(door.id);
    });

    it('preserves selection across layer changes and clears removed or disabled selection', () => {
        const selected = NON_PRODUCTION_OVERLAY.entities[0].id;
        expect(reconcileSelection(selected, NON_PRODUCTION_OVERLAY.entities)).toBe(selected);
        expect(reconcileSelection('missing', NON_PRODUCTION_OVERLAY.entities)).toBeNull();
        expect(reconcileSelection(selected, NON_PRODUCTION_OVERLAY.entities.map(entity =>
            entity.id === selected ? { ...entity, enabled: false } : entity))).toBeNull();
        expect(toggleLayerVisibility(new Set(['rooms']), 'rooms').has('rooms')).toBe(false);
    });

    it('pans with bounds and focuses an entity at the viewport center', () => {
        const entity = NON_PRODUCTION_OVERLAY.entities[4];
        const viewport = { width: 1200, height: 800 };
        const focused = focusEntityTransform(entity, { scale: 0.1, x: 0, y: 0 }, viewport, 8);
        expect(focused.scale).toBeGreaterThanOrEqual(0.1);
        const panned = panTransform(focused, -1_000_000, 0, viewport, 8192, 5460);
        expect(panned.x).toBeGreaterThan(-1_000_000);
    });

    it('keeps a large overlay dataset sortable without changing the input', () => {
        const large = Array.from({ length: 1200 }, (_, index) => ({
            ...NON_PRODUCTION_OVERLAY.entities[index % NON_PRODUCTION_OVERLAY.entities.length],
            id: `perf.entity-${index}`,
            zIndex: index % 5,
        }));
        const originalFirst = large[0];
        const sorted = [...large].sort(compareEntities);
        expect(sorted).toHaveLength(1200);
        expect(large[0]).toBe(originalFirst);
    });
});
