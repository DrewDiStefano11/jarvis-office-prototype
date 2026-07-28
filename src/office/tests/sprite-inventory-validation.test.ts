import { describe, expect, it } from 'vitest';
import rawInventory from '../sprites/source-asset-inventory.json';
import {
    InventoryValidationError,
    assertSourceAssetInventory,
    parseSourceAssetInventory,
} from '../sprites/inventoryValidation';
import { SOURCE_ASSET_INVENTORY } from '../sprites/inventory';

/**
 * Small hand-built fixture. Tests mutate clones of this rather than the
 * committed production JSON, so a malformed case can never leak into the
 * generated artifact.
 */
function validAsset(overrides: Record<string, unknown> = {}) {
    return {
        path: 'fixture.png',
        fileSizeBytes: 1234,
        sha256: 'a'.repeat(64),
        width: 100,
        height: 200,
        bitDepth: 8,
        colorType: 6,
        channels: 4,
        chunkTypes: ['IHDR', 'IDAT', 'IEND'],
        hasAlphaChannel: true,
        transparencyUsed: true,
        minAlpha: 0,
        maxAlpha: 255,
        fullyTransparentPixels: 10,
        partiallyTransparentPixels: 5,
        uniformOpaqueBackground: false,
        backgroundColor: null,
        classification: 'agent_sprite_sheet',
        readiness: 'production_ready',
        ambiguous: false,
        nexusGrid: null,
        agentGrid: null,
        warnings: [],
        ...overrides,
    };
}

function validInventory(assets: unknown[] = [validAsset()]) {
    return {
        schemaVersion: 1,
        generator: 'fixture',
        inkAlphaThreshold: 128,
        totalAssets: assets.length,
        duplicateGroups: [],
        assets,
    };
}

function codesOf(value: unknown): string[] {
    const result = parseSourceAssetInventory(value);
    return result.ok ? [] : result.issues.map(i => i.code);
}

function issuesOf(value: unknown) {
    const result = parseSourceAssetInventory(value);
    return result.ok ? [] : result.issues;
}

describe('inventory runtime validation', () => {
    it('accepts the actual generated inventory', () => {
        const result = parseSourceAssetInventory(rawInventory);
        expect(result.ok).toBe(true);
        expect(() => assertSourceAssetInventory(rawInventory)).not.toThrow();
    });

    it('does not alter the valid generated inventory', () => {
        // The exported value must be the same data, unchanged.
        expect(SOURCE_ASSET_INVENTORY.totalAssets).toBe(18);
        expect(SOURCE_ASSET_INVENTORY.assets).toHaveLength(18);
        expect(JSON.stringify(SOURCE_ASSET_INVENTORY)).toBe(JSON.stringify(rawInventory));
    });

    it('accepts the minimal valid fixture', () => {
        expect(parseSourceAssetInventory(validInventory()).ok).toBe(true);
    });

    it('rejects a non-object top-level value', () => {
        for (const value of [null, undefined, 42, 'x', [], true]) {
            expect(codesOf(value), String(value)).toContain('INVENTORY_NOT_OBJECT');
        }
    });

    it('rejects a missing asset collection', () => {
        const doc = validInventory();
        delete (doc as Record<string, unknown>).assets;
        expect(codesOf(doc)).toContain('INVENTORY_FIELD_MISSING');
    });

    it('rejects a non-array asset collection', () => {
        expect(codesOf({ ...validInventory(), assets: {} }))
            .toContain('INVENTORY_ASSETS_NOT_ARRAY');
    });

    it('rejects an empty asset collection', () => {
        expect(codesOf({ ...validInventory([]), totalAssets: 0 }))
            .toContain('INVENTORY_ASSETS_EMPTY');
    });

    it('rejects an unsupported classification', () => {
        expect(codesOf(validInventory([validAsset({ classification: 'sentient_robot' })])))
            .toContain('ASSET_CLASSIFICATION_UNSUPPORTED');
    });

    it('rejects an unsupported readiness value', () => {
        expect(codesOf(validInventory([validAsset({ readiness: 'totally_fine' })])))
            .toContain('ASSET_READINESS_UNSUPPORTED');
    });

    it('rejects zero, negative, fractional and non-numeric dimensions', () => {
        for (const width of [0, -5, 12.5, '100', null, NaN]) {
            expect(codesOf(validInventory([validAsset({ width })])), String(width))
                .toContain('ASSET_DIMENSION_INVALID');
        }
        for (const height of [0, -1, 3.3, undefined]) {
            expect(codesOf(validInventory([validAsset({ height })])), String(height))
                .toContain('ASSET_DIMENSION_INVALID');
        }
    });

    it('rejects invalid PNG metadata', () => {
        expect(codesOf(validInventory([validAsset({ colorType: 7 })])))
            .toContain('ASSET_PNG_METADATA_INVALID');
        expect(codesOf(validInventory([validAsset({ bitDepth: 0 })])))
            .toContain('ASSET_PNG_METADATA_INVALID');
        expect(codesOf(validInventory([validAsset({ channels: -1 })])))
            .toContain('ASSET_PNG_METADATA_INVALID');
    });

    it('rejects a malformed sha256 digest', () => {
        expect(codesOf(validInventory([validAsset({ sha256: 'nope' })])))
            .toContain('ASSET_SHA256_INVALID');
    });

    it('rejects duplicate asset paths', () => {
        const doc = validInventory([validAsset(), validAsset()]);
        expect(codesOf(doc)).toContain('ASSET_PATH_DUPLICATE');
    });

    it('rejects a totalAssets count that disagrees with the array', () => {
        expect(codesOf({ ...validInventory(), totalAssets: 99 }))
            .toContain('ASSET_COUNT_MISMATCH');
    });

    it('rejects invalid agent grid dimensions', () => {
        const grid = {
            assumedCellSize: { width: 0, height: 181 },
            columns: 6, rows: 8, totalCells: 48,
            widthDivisible: true, heightDivisible: true,
            detectedColumnBands: 6, detectedRowBands: 8,
            blankCells: 0, horizontalSpillCells: 0,
            equalCellExtractionValid: true,
        };
        expect(codesOf(validInventory([validAsset({ agentGrid: grid })])))
            .toContain('GRID_DIMENSION_INVALID');
    });

    it('rejects inconsistent agent grid cell accounting', () => {
        const grid = {
            assumedCellSize: { width: 181, height: 181 },
            columns: 6, rows: 8, totalCells: 47, // 6*8 = 48
            widthDivisible: true, heightDivisible: true,
            detectedColumnBands: 6, detectedRowBands: 8,
            blankCells: 0, horizontalSpillCells: 0,
            equalCellExtractionValid: true,
        };
        expect(codesOf(validInventory([validAsset({ agentGrid: grid })])))
            .toContain('GRID_CELL_ACCOUNTING');
    });

    it('rejects inconsistent nexus grid cell accounting', () => {
        const grid = {
            detectedColumns: 10, detectedRows: 9, totalCells: 100, // 10*9 = 90
            columnBands: [[0, 10]], rowBands: [[0, 10]],
            frameRectangles: [],
            uniformCells: false,
            distinctCellWidths: [88], distinctCellHeights: [123],
            blankCells: [],
        };
        expect(codesOf(validInventory([validAsset({ nexusGrid: grid })])))
            .toContain('GRID_CELL_ACCOUNTING');
    });

    function nexusWith(rects: unknown[]) {
        return validAsset({
            width: 100,
            height: 100,
            nexusGrid: {
                detectedColumns: 2, detectedRows: 1, totalCells: 2,
                columnBands: [[0, 10]], rowBands: [[0, 10]],
                frameRectangles: rects,
                uniformCells: true,
                distinctCellWidths: [10], distinctCellHeights: [10],
                blankCells: [],
            },
        });
    }

    it('rejects a malformed rectangle entry', () => {
        expect(codesOf(validInventory([nexusWith(['not-an-object'])])))
            .toContain('RECT_NOT_OBJECT');
    });

    it('rejects negative and fractional rectangle indexes', () => {
        const base = { row: 0, column: 0, x: 0, y: 0, width: 10, height: 10 };
        expect(codesOf(validInventory([nexusWith([{ ...base, index: -1 }])])))
            .toContain('RECT_INDEX_INVALID');
        expect(codesOf(validInventory([nexusWith([{ ...base, index: 1.5 }])])))
            .toContain('RECT_INDEX_INVALID');
        expect(codesOf(validInventory([nexusWith([{ ...base, index: 'a' }])])))
            .toContain('RECT_INDEX_INVALID');
    });

    it('rejects duplicate rectangle indexes', () => {
        const rect = { index: 0, row: 0, column: 0, x: 0, y: 0, width: 10, height: 10 };
        expect(codesOf(validInventory([nexusWith([rect, { ...rect }])])))
            .toContain('RECT_INDEX_DUPLICATE');
    });

    it('rejects rectangles with invalid origin or size', () => {
        const base = { index: 0, row: 0, column: 0, width: 10, height: 10 };
        expect(codesOf(validInventory([nexusWith([{ ...base, x: -1, y: 0 }])])))
            .toContain('RECT_ORIGIN_INVALID');
        expect(codesOf(validInventory([nexusWith([{ index: 0, row: 0, column: 0, x: 0, y: 0, width: 0, height: 10 }])])))
            .toContain('RECT_SIZE_INVALID');
    });

    it('rejects rectangles outside the declared image bounds', () => {
        const rect = { index: 0, row: 0, column: 0, x: 95, y: 0, width: 20, height: 10 };
        expect(codesOf(validInventory([nexusWith([rect])])))
            .toContain('RECT_OUT_OF_BOUNDS');
    });

    it('rejects malformed duplicate groups', () => {
        expect(codesOf({ ...validInventory(), duplicateGroups: [{ sha256: 1, paths: 'x' }] }))
            .toContain('DUPLICATE_GROUP_INVALID');
    });

    it('reports a stable field path and error code', () => {
        const issues = issuesOf(validInventory([validAsset({ width: -1 })]));
        const dimension = issues.find(i => i.code === 'ASSET_DIMENSION_INVALID');
        expect(dimension).toBeDefined();
        expect(dimension!.path).toBe('inventory.assets[0].width/height');
        expect(dimension!.message).toMatch(/positive integer/);
    });

    it('throws a typed, bounded error that does not dump the document', () => {
        const doc = validInventory([validAsset({ width: 0, height: 0, colorType: 9 })]);
        expect(() => assertSourceAssetInventory(doc)).toThrow(InventoryValidationError);
        try {
            assertSourceAssetInventory(doc);
        } catch (error) {
            const err = error as InventoryValidationError;
            expect(err.name).toBe('InventoryValidationError');
            expect(err.issues.length).toBeGreaterThan(0);
            // Diagnostics only: no raw document or binary payload echoed.
            expect(err.message).not.toContain('sha256":');
            expect(err.message).not.toContain('chunkTypes');
            expect(err.message.length).toBeLessThan(2000);
        }
    });

    it('bounds the number of reported issues', () => {
        const many = Array.from({ length: 400 }, (_, i) =>
            validAsset({ path: `f${i}.png`, width: 0 }));
        const issues = issuesOf(validInventory(many));
        expect(issues.length).toBeLessThanOrEqual(100);
    });

    it('prevents manifest.ts from consuming unvalidated malformed data', async () => {
        // The manifest reads geometry straight out of the inventory, so the
        // guarantee it relies on is that a bad artifact never gets that far.
        expect(() => assertSourceAssetInventory({ assets: [{ path: 'x' }] }))
            .toThrow(InventoryValidationError);
        const manifest = await import('../sprites/manifest');
        expect(manifest.SPRITE_MANIFEST.assetSets.length).toBeGreaterThan(0);
    });
});
