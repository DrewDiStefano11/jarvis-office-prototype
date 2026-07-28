import { describe, expect, it } from 'vitest';
import { OFFICE_ASSETS } from '../assets';
import { NON_PRODUCTION_OVERLAY } from '../sampleOverlay';
import { isSupportedCssColor, validateOverlayDocument } from '../validation';

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

    it('rejects non-object structured fields before rendering can dereference them', () => {
        for (const [entityIndex, field] of [[9, 'sprite'], [1, 'path'], [3, 'door'], [0, 'accessPolicy']] as const) {
            const document = cloneDocument();
            const entities = document.entities as Record<string, unknown>[];
            entities[entityIndex][field] = 'malformed';
            const result = validateOverlayDocument(document);
            expect(result.valid, `${field} should be rejected`).toBe(false);
            if (!result.valid) expect(result.errors.some(error => error.includes(`${field} must be an object`))).toBe(true);
        }
    });

    it('requires and fully validates sprite definitions for sprite anchors', () => {
        const invalidValues: readonly [string, unknown][] = [
            ['assetId', ''],
            ['scale', 0],
            ['opacity', 1.5],
            ['blendMode', 'overlay'],
            ['pointerEvents', 'yes'],
        ];
        for (const [field, invalidValue] of invalidValues) {
            const document = cloneDocument();
            const entities = document.entities as Record<string, unknown>[];
            const sprite = entities[9].sprite as Record<string, unknown>;
            sprite[field] = invalidValue;
            expect(validateOverlayDocument(document).valid, field).toBe(false);
        }
        const missing = cloneDocument();
        delete (missing.entities as Record<string, unknown>[])[9].sprite;
        expect(validateOverlayDocument(missing).valid).toBe(false);
    });

    it('accepts a registered sprite-sheet asset ID', () => {
        const document = cloneDocument();
        const entities = document.entities as Record<string, unknown>[];
        const sprite = entities[9].sprite as Record<string, unknown>;
        sprite.assetId = OFFICE_ASSETS.hologram.id;
        expect(validateOverlayDocument(document)).toMatchObject({ valid: true });
    });

    it.each([
        '#fff',
        '#ffff',
        '#ffffff',
        '#ffffffff',
        '#AbC',
        '#aBcD',
        '#AbCdEf',
        '#aBcDeF12',
    ])('accepts a supported hexadecimal glow color: %s', glow => {
        const document = cloneDocument();
        const entities = document.entities as Record<string, unknown>[];
        const sprite = entities[9].sprite as Record<string, unknown>;
        sprite.glow = glow;

        expect(isSupportedCssColor(glow)).toBe(true);
        expect(validateOverlayDocument(document)).toMatchObject({ valid: true });
    });

    it.each([
        'notacolor',
        '#12',
        '#12345',
        '#1234567',
        '#ggg',
        '#12345z',
        '',
        '   ',
        'rgb(255, 255, 255)',
        '##fff',
        'fff',
    ])('rejects an unsupported glow color: %j', glow => {
        const document = cloneDocument();
        const entities = document.entities as Record<string, unknown>[];
        const sprite = entities[9].sprite as Record<string, unknown>;
        sprite.glow = glow;

        expect(isSupportedCssColor(glow)).toBe(false);
        const result = validateOverlayDocument(document);
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.errors).toContain('entities[9].sprite.glow is not a supported color.');
        }
    });

    it.each([
        ['unknown sprite ID', 'missing-hologram'],
        ['background asset ID', OFFICE_ASSETS.background.id],
    ])('rejects an unregistered or non-sprite asset ID: %s', (_label, invalidId) => {
        const document = cloneDocument();
        const entities = document.entities as Record<string, unknown>[];
        const sprite = entities[9].sprite as Record<string, unknown>;
        sprite.assetId = invalidId;
        const result = validateOverlayDocument(document);
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.errors).toContain(
                `entities[9].sprite.assetId "${invalidId}" is not a registered sprite-sheet asset.`,
            );
        }
    });

    it('rejects malformed arrays and metadata values', () => {
        const document = cloneDocument();
        const entities = document.entities as Record<string, unknown>[];
        (entities[0].accessPolicy as Record<string, unknown>).memberIds = ['valid', 7];
        (entities[3].door as Record<string, unknown>).linkedRoomIds = 'sample.room.central';
        (entities[1].path as Record<string, unknown>).linkedDoorIds = [false];
        entities[0].metadata = { nested: { unsafe: true }, infinite: Number.POSITIVE_INFINITY };
        const result = validateOverlayDocument(document);
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.errors.some(error => error.includes('memberIds'))).toBe(true);
            expect(result.errors.some(error => error.includes('linkedRoomIds'))).toBe(true);
            expect(result.errors.some(error => error.includes('linkedDoorIds'))).toBe(true);
            expect(result.errors.some(error => error.includes('metadata'))).toBe(true);
        }
    });

    it('rejects degenerate polygons and entity type/layer mismatches', () => {
        const document = cloneDocument();
        const entities = document.entities as Record<string, unknown>[];
        entities[0].geometry = {
            kind: 'polygon',
            points: [{ x: 100, y: 100 }, { x: 200, y: 200 }, { x: 300, y: 300 }],
        };
        entities[5].sourceLayer = 'rooms';
        const result = validateOverlayDocument(document);
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.errors.some(error => error.includes('nonzero polygon area'))).toBe(true);
            expect(result.errors.some(error => error.includes('does not match entity type'))).toBe(true);
        }
    });

    it('validates room and door reference target types', () => {
        const document = cloneDocument();
        const entities = document.entities as Record<string, unknown>[];
        (entities[3].door as Record<string, unknown>).linkedRoomIds = ['sample.computer.one'];
        (entities[1].path as Record<string, unknown>).linkedDoorIds = ['sample.room.central'];
        const result = validateOverlayDocument(document);
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.errors.some(error => error.includes('must reference a room'))).toBe(true);
            expect(result.errors.some(error => error.includes('must reference a door'))).toBe(true);
        }
    });
});
