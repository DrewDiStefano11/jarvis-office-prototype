import { describe, expect, it } from 'vitest';
import { NON_PRODUCTION_OVERLAY } from '../sampleOverlay';
import { validateOverlayDocument } from '../validation';

function cloneDocument(): Record<string, unknown> {
    return structuredClone(NON_PRODUCTION_OVERLAY) as unknown as Record<string, unknown>;
}

describe('office overlay schema', () => {
    it('accepts the complete non-production fixture', () => {
        expect(validateOverlayDocument(NON_PRODUCTION_OVERLAY)).toMatchObject({ valid: true });
        expect(new Set(NON_PRODUCTION_OVERLAY.entities.map(entity => entity.type)).size).toBe(12);
    });

    it('rejects unsupported schema versions', () => {
        const document = cloneDocument();
        document.schemaVersion = 2;
        expect(validateOverlayDocument(document)).toMatchObject({ valid: false });
    });

    it('rejects non-canonical source dimensions', () => {
        const document = cloneDocument();
        document.source = { width: 1024, height: 768 };
        const result = validateOverlayDocument(document);
        expect(result.valid).toBe(false);
        if (!result.valid) expect(result.errors.some(error => error.includes('canonical'))).toBe(true);
    });

    it('rejects duplicate IDs and broken references', () => {
        const document = cloneDocument();
        const entities = document.entities as Record<string, unknown>[];
        entities[1].id = entities[0].id;
        entities[2].parentId = 'missing.entity';
        const result = validateOverlayDocument(document);
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.errors.some(error => error.includes('Duplicate entity ID'))).toBe(true);
            expect(result.errors.some(error => error.includes('unknown entity'))).toBe(true);
        }
    });

    it('rejects malformed and out-of-bounds geometry', () => {
        const document = cloneDocument();
        const entities = document.entities as Record<string, unknown>[];
        entities[0].geometry = { kind: 'polygon', points: [{ x: -1, y: 0 }, { x: 1, y: 1 }] };
        const result = validateOverlayDocument(document);
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.errors.some(error => error.includes('at least 3'))).toBe(true);
            expect(result.errors.some(error => error.includes('outside'))).toBe(true);
        }
    });

    it('rejects zero-area rectangles, NaN, and infinity', () => {
        const document = cloneDocument();
        const entities = document.entities as Record<string, unknown>[];
        entities[3].geometry = { kind: 'rectangle', rect: { x: 1, y: 1, width: 0, height: Number.POSITIVE_INFINITY } };
        const result = validateOverlayDocument(document);
        expect(result.valid).toBe(false);
    });

    it('rejects invalid access, seat-priority, and animation values', () => {
        const document = cloneDocument();
        const entities = document.entities as Record<string, unknown>[];
        entities[3].accessState = 'purple';
        entities[4].seatPriority = 'green';
        const sprite = entities[9].sprite as Record<string, unknown>;
        const animation = sprite.animation as Record<string, unknown>;
        animation.frameSequence = [99];
        const result = validateOverlayDocument(document);
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.errors.some(error => error.includes('accessState'))).toBe(true);
            expect(result.errors.some(error => error.includes('seatPriority'))).toBe(true);
            expect(result.errors.some(error => error.includes('frameSequence'))).toBe(true);
        }
    });

    it('rejects duplicate, disconnected, and zero-length path data', () => {
        const document = cloneDocument();
        const nodes = document.pathNodes as Record<string, unknown>[];
        nodes[1].id = nodes[0].id;
        nodes[2].connectedNodeIds = ['missing.node'];
        const entities = document.entities as Record<string, unknown>[];
        entities[1].geometry = { kind: 'polyline', points: [{ x: 1, y: 1 }, { x: 1, y: 1 }], width: 20 };
        const path = entities[1].path as Record<string, unknown>;
        path.nodeIds = ['missing.node'];
        const result = validateOverlayDocument(document);
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.errors.some(error => error.includes('Duplicate path node'))).toBe(true);
            expect(result.errors.some(error => error.includes('unknown node'))).toBe(true);
            expect(result.errors.some(error => error.includes('zero-length'))).toBe(true);
        }
    });
});
