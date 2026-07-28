import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
    SOURCE_ASSET_INVENTORY,
    SPRITE_ASSET_CLASSIFICATIONS,
    SPRITE_ASSET_READINESS_VALUES,
    assetsByClassification,
    getSourceAsset,
    isProductionUsable,
    NEXUS_TUBE_SOURCE_PATH,
} from '../sprites/inventory';
import productionMap from '../sprites/production-asset-map.json';

const EXPECTED_SOURCE_COUNT = 18;

describe('source asset inventory', () => {
    it('inventories all 18 known source files', () => {
        expect(SOURCE_ASSET_INVENTORY.assets).toHaveLength(EXPECTED_SOURCE_COUNT);
        expect(SOURCE_ASSET_INVENTORY.totalAssets).toBe(EXPECTED_SOURCE_COUNT);
    });

    it('uses stable lexicographic ordering', () => {
        const paths = SOURCE_ASSET_INVENTORY.assets.map(a => a.path);
        expect(paths).toEqual([...paths].sort());
    });

    it('has unique paths', () => {
        const paths = SOURCE_ASSET_INVENTORY.assets.map(a => a.path);
        expect(new Set(paths).size).toBe(paths.length);
    });

    it('records checksums that match the committed files', () => {
        for (const asset of SOURCE_ASSET_INVENTORY.assets) {
            expect(asset.sha256).toMatch(/^[0-9a-f]{64}$/);
            const hash = createHash('sha256').update(readFileSync(asset.path)).digest('hex');
            expect(hash, asset.path).toBe(asset.sha256);
        }
    });

    it('records positive measured dimensions and plausible PNG metadata', () => {
        for (const asset of SOURCE_ASSET_INVENTORY.assets) {
            expect(asset.width, asset.path).toBeGreaterThan(0);
            expect(asset.height, asset.path).toBeGreaterThan(0);
            expect(asset.bitDepth).toBe(8);
            expect([0, 2, 3, 4, 6]).toContain(asset.colorType);
            expect(asset.fileSizeBytes).toBeGreaterThan(0);
        }
    });

    it('uses only valid classification and readiness values', () => {
        for (const asset of SOURCE_ASSET_INVENTORY.assets) {
            expect(SPRITE_ASSET_CLASSIFICATIONS).toContain(asset.classification);
            expect(SPRITE_ASSET_READINESS_VALUES).toContain(asset.readiness);
        }
    });

    it('never marks an asset production-ready without measured structural metadata', () => {
        for (const asset of SOURCE_ASSET_INVENTORY.assets) {
            if (asset.readiness !== 'production_ready') continue;
            expect(asset.hasAlphaChannel, asset.path).toBe(true);
            expect(asset.ambiguous, asset.path).toBe(false);
            // A production-ready sheet must have a measured grid backing it.
            const hasGrid = asset.nexusGrid !== null || asset.agentGrid !== null;
            expect(hasGrid, asset.path).toBe(true);
            if (asset.agentGrid) {
                expect(asset.agentGrid.equalCellExtractionValid, asset.path).toBe(true);
            }
        }
    });

    it('marks ambiguous assets as reference-only and excludes them from production', () => {
        for (const asset of SOURCE_ASSET_INVENTORY.assets) {
            if (!asset.ambiguous) continue;
            expect(asset.readiness, asset.path).toBe('reference_only');
            expect(isProductionUsable(asset), asset.path).toBe(false);
        }
    });

    it('measures the Nexus tube sheet as a non-uniform 10x9 grid', () => {
        const nexus = getSourceAsset(NEXUS_TUBE_SOURCE_PATH);
        expect(nexus).toBeDefined();
        expect(nexus?.width).toBe(1254);
        expect(nexus?.height).toBe(1254);
        expect(nexus?.hasAlphaChannel).toBe(true);
        const grid = nexus?.nexusGrid;
        expect(grid).toBeTruthy();
        expect(grid?.detectedColumns).toBe(10);
        expect(grid?.detectedRows).toBe(9);
        expect(grid?.totalCells).toBe(90);
        // Explicitly not a uniform grid; this is why rectangles are required.
        expect(grid?.uniformCells).toBe(false);
        expect(grid?.frameRectangles).toHaveLength(90);
    });

    it('treats the job sheet as reference-only because it has no alpha channel', () => {
        const jobs = getSourceAsset('Sprite Jobs.png');
        expect(jobs?.colorType).toBe(2);
        expect(jobs?.hasAlphaChannel).toBe(false);
        expect(jobs?.readiness).toBe('reference_only');
        expect(jobs?.classification).toBe('role_reference');
    });

    it('reports no exact duplicates among the source files', () => {
        expect(SOURCE_ASSET_INVENTORY.duplicateGroups).toEqual([]);
    });

    it('classifies the d85660f4 group into measured sheets and ambiguous references', () => {
        const group = SOURCE_ASSET_INVENTORY.assets.filter(a => a.path.startsWith('d85660f4'));
        expect(group).toHaveLength(15);
        for (const asset of group) {
            expect(asset.width).toBe(1086);
            expect(asset.height).toBe(1448);
            expect(asset.agentGrid).toBeTruthy();
        }
        expect(assetsByClassification('agent_sprite_sheet').length).toBeGreaterThan(0);
    });

    it('maps every source asset to an existing verified public copy', () => {
        const mappings = (productionMap as { mappings: { source: string; destination: string; sha256: string }[] }).mappings;
        expect(mappings).toHaveLength(EXPECTED_SOURCE_COUNT);
        for (const mapping of mappings) {
            const file = `public/${mapping.destination}`;
            expect(existsSync(file), file).toBe(true);
            const hash = createHash('sha256').update(readFileSync(file)).digest('hex');
            // Byte-for-byte copy: no re-encoding, resizing or background removal.
            expect(hash, mapping.destination).toBe(mapping.sha256);
        }
    });

    it('copies the Central Nexus asset to an isolated candidate path', () => {
        const nexus = getSourceAsset(NEXUS_TUBE_SOURCE_PATH);
        const target = 'public/assets/office/sprites/holograms/candidates/central-nexus-pose-grid.png';
        expect(existsSync(target)).toBe(true);
        const hash = createHash('sha256').update(readFileSync(target)).digest('hex');
        expect(hash).toBe(nexus?.sha256);
    });

    it('leaves the legacy office runtime hologram path absent', () => {
        // The office sample overlay declares this asset as a uniform
        // 128x192 / 8-frame / 8-column sheet. Populating it with the
        // 1254x1254 non-uniform pose grid would change runtime loading and
        // defeat the intentional missing-asset fallback.
        expect(existsSync('public/assets/office/sprites/central-blue-tube-hologram.png'))
            .toBe(false);
    });

    it('never maps any asset onto the legacy runtime path', () => {
        const mappings = (productionMap as { mappings: { destination: string; productionAsset: boolean }[] }).mappings;
        for (const mapping of mappings) {
            expect(mapping.destination)
                .not.toBe('assets/office/sprites/central-blue-tube-hologram.png');
            // Nothing in this pipeline is production-approved yet.
            expect(mapping.productionAsset).toBe(false);
        }
    });
});
