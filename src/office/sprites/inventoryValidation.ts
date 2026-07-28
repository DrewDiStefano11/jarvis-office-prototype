import {
    SPRITE_ASSET_CLASSIFICATIONS,
    SPRITE_ASSET_READINESS_VALUES,
    SourceAssetInventory,
    SpriteAssetClassification,
    SpriteAssetReadiness,
} from './inventoryTypes';

/**
 * Dependency-free runtime parser for the generated source-asset inventory.
 *
 * The inventory is external JSON produced by a script, so per AGENTS.md §32 it
 * must be validated before being cast. Without this, a malformed or drifted
 * artifact would surface as an opaque `undefined` access during `manifest.ts`
 * module initialization instead of a clear, actionable error.
 *
 * Errors carry a stable code and a field path, and never echo the whole
 * document or any binary payload.
 */

export type InventoryIssue = Readonly<{
    code: InventoryErrorCode;
    path: string;
    message: string;
}>;

/** Stable, greppable codes. Keep values fixed; add new ones rather than renaming. */
export type InventoryErrorCode =
    | 'INVENTORY_NOT_OBJECT'
    | 'INVENTORY_FIELD_MISSING'
    | 'INVENTORY_FIELD_TYPE'
    | 'INVENTORY_ASSETS_NOT_ARRAY'
    | 'INVENTORY_ASSETS_EMPTY'
    | 'ASSET_NOT_OBJECT'
    | 'ASSET_FIELD_MISSING'
    | 'ASSET_FIELD_TYPE'
    | 'ASSET_PATH_DUPLICATE'
    | 'ASSET_SHA256_INVALID'
    | 'ASSET_DIMENSION_INVALID'
    | 'ASSET_PNG_METADATA_INVALID'
    | 'ASSET_CLASSIFICATION_UNSUPPORTED'
    | 'ASSET_READINESS_UNSUPPORTED'
    | 'ASSET_COUNT_MISMATCH'
    | 'GRID_FIELD_TYPE'
    | 'GRID_DIMENSION_INVALID'
    | 'GRID_CELL_ACCOUNTING'
    | 'RECT_NOT_OBJECT'
    | 'RECT_INDEX_INVALID'
    | 'RECT_ORIGIN_INVALID'
    | 'RECT_SIZE_INVALID'
    | 'RECT_OUT_OF_BOUNDS'
    | 'RECT_INDEX_DUPLICATE'
    | 'DUPLICATE_GROUP_INVALID';

/** Thrown when the generated inventory cannot be trusted. */
export class InventoryValidationError extends Error {
    readonly issues: readonly InventoryIssue[];

    constructor(issues: readonly InventoryIssue[]) {
        // Bound the message so a large malformed artifact cannot flood output.
        const shown = issues.slice(0, 10);
        const summary = shown.map(i => `  [${i.code}] ${i.path}: ${i.message}`).join('\n');
        const overflow = issues.length > shown.length
            ? `\n  ...and ${issues.length - shown.length} more issue(s).`
            : '';
        super(`Invalid source-asset inventory (${issues.length} issue(s)):\n${summary}${overflow}`);
        this.name = 'InventoryValidationError';
        this.issues = issues;
    }
}

export type InventoryParseResult =
    | Readonly<{ ok: true; inventory: SourceAssetInventory }>
    | Readonly<{ ok: false; issues: readonly InventoryIssue[] }>;

const MAX_ISSUES = 100;

class Collector {
    readonly issues: InventoryIssue[] = [];

    add(code: InventoryErrorCode, path: string, message: string): void {
        if (this.issues.length < MAX_ISSUES) this.issues.push({ code, path, message });
    }

    get failed(): boolean {
        return this.issues.length > 0;
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveInt(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isNonNegativeInt(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every(v => typeof v === 'string');
}

function isNumberArray(value: unknown): value is number[] {
    return Array.isArray(value) && value.every(v => typeof v === 'number');
}

/** Reads a required field of a given primitive type. */
function requireField(
    source: Record<string, unknown>,
    key: string,
    path: string,
    predicate: (v: unknown) => boolean,
    expected: string,
    collector: Collector,
): boolean {
    if (!(key in source)) {
        collector.add('ASSET_FIELD_MISSING', `${path}.${key}`, `Missing required field (expected ${expected}).`);
        return false;
    }
    if (!predicate(source[key])) {
        collector.add('ASSET_FIELD_TYPE', `${path}.${key}`, `Expected ${expected}.`);
        return false;
    }
    return true;
}

function validateFrameRectangles(
    value: unknown,
    path: string,
    imageWidth: number,
    imageHeight: number,
    collector: Collector,
): void {
    if (!Array.isArray(value)) {
        collector.add('GRID_FIELD_TYPE', path, 'Expected an array of frame rectangles.');
        return;
    }
    const seen = new Set<number>();
    for (let i = 0; i < value.length; i++) {
        const rectPath = `${path}[${i}]`;
        const rect = value[i];
        if (!isRecord(rect)) {
            collector.add('RECT_NOT_OBJECT', rectPath, 'Expected an object.');
            continue;
        }
        if (!Number.isInteger(rect.index) || (rect.index as number) < 0) {
            collector.add('RECT_INDEX_INVALID', `${rectPath}.index`,
                'Expected a non-negative integer index.');
            continue;
        }
        const index = rect.index as number;
        if (seen.has(index)) {
            collector.add('RECT_INDEX_DUPLICATE', `${rectPath}.index`,
                `Duplicate rectangle index ${index}.`);
        }
        seen.add(index);

        if (!isNonNegativeInt(rect.row) || !isNonNegativeInt(rect.column)) {
            collector.add('RECT_INDEX_INVALID', `${rectPath}.row/column`,
                'Expected non-negative integer row and column.');
        }
        if (!isNonNegativeInt(rect.x) || !isNonNegativeInt(rect.y)) {
            collector.add('RECT_ORIGIN_INVALID', `${rectPath}.x/y`,
                'Expected non-negative integer origin.');
            continue;
        }
        if (!isPositiveInt(rect.width) || !isPositiveInt(rect.height)) {
            collector.add('RECT_SIZE_INVALID', `${rectPath}.width/height`,
                'Expected positive integer width and height.');
            continue;
        }
        const x = rect.x as number;
        const y = rect.y as number;
        const w = rect.width as number;
        const h = rect.height as number;
        if (x + w > imageWidth || y + h > imageHeight) {
            collector.add('RECT_OUT_OF_BOUNDS', rectPath,
                `Rectangle (${x},${y},${w}x${h}) extends past the ${imageWidth}x${imageHeight} image.`);
        }
    }
}

function validateNexusGrid(
    value: unknown,
    path: string,
    imageWidth: number,
    imageHeight: number,
    collector: Collector,
): void {
    if (!isRecord(value)) {
        collector.add('GRID_FIELD_TYPE', path, 'Expected an object or null.');
        return;
    }
    if (!isPositiveInt(value.detectedColumns) || !isPositiveInt(value.detectedRows)) {
        collector.add('GRID_DIMENSION_INVALID', `${path}.detectedColumns/detectedRows`,
            'Expected positive integer row and column counts.');
    }
    if (!isPositiveInt(value.totalCells)) {
        collector.add('GRID_DIMENSION_INVALID', `${path}.totalCells`,
            'Expected a positive integer cell count.');
    }
    // rows x columns must equal the declared cell count.
    if (isPositiveInt(value.detectedColumns) && isPositiveInt(value.detectedRows)
        && isPositiveInt(value.totalCells)) {
        const expected = (value.detectedColumns as number) * (value.detectedRows as number);
        if (expected !== value.totalCells) {
            collector.add('GRID_CELL_ACCOUNTING', `${path}.totalCells`,
                `Expected rows x columns (${expected}) but found ${value.totalCells}.`);
        }
    }
    if (typeof value.uniformCells !== 'boolean') {
        collector.add('GRID_FIELD_TYPE', `${path}.uniformCells`, 'Expected a boolean.');
    }
    if (!isNumberArray(value.distinctCellWidths) || !isNumberArray(value.distinctCellHeights)) {
        collector.add('GRID_FIELD_TYPE', `${path}.distinctCellWidths/Heights`,
            'Expected arrays of numbers.');
    }
    if (!isNumberArray(value.blankCells)) {
        collector.add('GRID_FIELD_TYPE', `${path}.blankCells`, 'Expected an array of numbers.');
    }
    for (const key of ['columnBands', 'rowBands'] as const) {
        const bands = value[key];
        if (!Array.isArray(bands) || !bands.every(b => isNumberArray(b))) {
            collector.add('GRID_FIELD_TYPE', `${path}.${key}`,
                'Expected an array of numeric band pairs.');
        }
    }
    validateFrameRectangles(value.frameRectangles, `${path}.frameRectangles`,
        imageWidth, imageHeight, collector);
}

function validateAgentGrid(value: unknown, path: string, collector: Collector): void {
    if (!isRecord(value)) {
        collector.add('GRID_FIELD_TYPE', path, 'Expected an object or null.');
        return;
    }
    const size = value.assumedCellSize;
    if (!isRecord(size) || !isPositiveInt(size.width) || !isPositiveInt(size.height)) {
        collector.add('GRID_DIMENSION_INVALID', `${path}.assumedCellSize`,
            'Expected positive integer cell width and height.');
    }
    if (!isPositiveInt(value.columns) || !isPositiveInt(value.rows)) {
        collector.add('GRID_DIMENSION_INVALID', `${path}.rows/columns`,
            'Expected positive integer row and column counts.');
    }
    if (!isPositiveInt(value.totalCells)) {
        collector.add('GRID_DIMENSION_INVALID', `${path}.totalCells`,
            'Expected a positive integer cell count.');
    }
    if (isPositiveInt(value.columns) && isPositiveInt(value.rows) && isPositiveInt(value.totalCells)) {
        const expected = (value.columns as number) * (value.rows as number);
        if (expected !== value.totalCells) {
            collector.add('GRID_CELL_ACCOUNTING', `${path}.totalCells`,
                `Expected rows x columns (${expected}) but found ${value.totalCells}.`);
        }
    }
    for (const key of ['widthDivisible', 'heightDivisible', 'equalCellExtractionValid'] as const) {
        if (typeof value[key] !== 'boolean') {
            collector.add('GRID_FIELD_TYPE', `${path}.${key}`, 'Expected a boolean.');
        }
    }
    for (const key of ['detectedColumnBands', 'detectedRowBands', 'blankCells', 'horizontalSpillCells'] as const) {
        if (!isNonNegativeInt(value[key])) {
            collector.add('GRID_DIMENSION_INVALID', `${path}.${key}`,
                'Expected a non-negative integer.');
        }
    }
}

function validateAsset(value: unknown, path: string, collector: Collector): void {
    if (!isRecord(value)) {
        collector.add('ASSET_NOT_OBJECT', path, 'Expected an object.');
        return;
    }

    requireField(value, 'path', path, v => typeof v === 'string' && v.length > 0, 'a non-empty string', collector);
    requireField(value, 'fileSizeBytes', path, isPositiveInt, 'a positive integer', collector);

    if (requireField(value, 'sha256', path, v => typeof v === 'string', 'a string', collector)
        && !/^[0-9a-f]{64}$/.test(value.sha256 as string)) {
        collector.add('ASSET_SHA256_INVALID', `${path}.sha256`,
            'Expected a 64-character lowercase hex digest.');
    }

    // Dimensions gate the rectangle bounds checks below.
    const hasWidth = isPositiveInt(value.width);
    const hasHeight = isPositiveInt(value.height);
    if (!hasWidth || !hasHeight) {
        collector.add('ASSET_DIMENSION_INVALID', `${path}.width/height`,
            'Expected positive integer image dimensions.');
    }

    if (!isPositiveInt(value.bitDepth)) {
        collector.add('ASSET_PNG_METADATA_INVALID', `${path}.bitDepth`,
            'Expected a positive integer bit depth.');
    }
    if (!isNonNegativeInt(value.colorType) || ![0, 2, 3, 4, 6].includes(value.colorType as number)) {
        collector.add('ASSET_PNG_METADATA_INVALID', `${path}.colorType`,
            'Expected a PNG colour type of 0, 2, 3, 4 or 6.');
    }
    if (!isPositiveInt(value.channels)) {
        collector.add('ASSET_PNG_METADATA_INVALID', `${path}.channels`,
            'Expected a positive integer channel count.');
    }
    if (!isStringArray(value.chunkTypes)) {
        collector.add('ASSET_FIELD_TYPE', `${path}.chunkTypes`, 'Expected an array of strings.');
    }

    for (const key of ['hasAlphaChannel', 'transparencyUsed', 'uniformOpaqueBackground', 'ambiguous'] as const) {
        if (typeof value[key] !== 'boolean') {
            collector.add('ASSET_FIELD_TYPE', `${path}.${key}`, 'Expected a boolean.');
        }
    }
    for (const key of ['minAlpha', 'maxAlpha', 'fullyTransparentPixels', 'partiallyTransparentPixels'] as const) {
        if (!isNonNegativeInt(value[key])) {
            collector.add('ASSET_FIELD_TYPE', `${path}.${key}`, 'Expected a non-negative integer.');
        }
    }
    if (value.backgroundColor !== null && typeof value.backgroundColor !== 'string') {
        collector.add('ASSET_FIELD_TYPE', `${path}.backgroundColor`, 'Expected a string or null.');
    }
    if (!isStringArray(value.warnings)) {
        collector.add('ASSET_FIELD_TYPE', `${path}.warnings`, 'Expected an array of strings.');
    }

    if (!SPRITE_ASSET_CLASSIFICATIONS.includes(value.classification as SpriteAssetClassification)) {
        collector.add('ASSET_CLASSIFICATION_UNSUPPORTED', `${path}.classification`,
            `Expected one of: ${SPRITE_ASSET_CLASSIFICATIONS.join(', ')}.`);
    }
    if (!SPRITE_ASSET_READINESS_VALUES.includes(value.readiness as SpriteAssetReadiness)) {
        collector.add('ASSET_READINESS_UNSUPPORTED', `${path}.readiness`,
            `Expected one of: ${SPRITE_ASSET_READINESS_VALUES.join(', ')}.`);
    }

    if (value.nexusGrid !== null) {
        validateNexusGrid(value.nexusGrid, `${path}.nexusGrid`,
            hasWidth ? (value.width as number) : 0,
            hasHeight ? (value.height as number) : 0,
            collector);
    }
    if (value.agentGrid !== null) {
        validateAgentGrid(value.agentGrid, `${path}.agentGrid`, collector);
    }
}

/** Non-throwing parse. Returns either the typed inventory or the issues found. */
export function parseSourceAssetInventory(value: unknown): InventoryParseResult {
    const collector = new Collector();
    const path = 'inventory';

    if (!isRecord(value)) {
        collector.add('INVENTORY_NOT_OBJECT', path, 'Expected a JSON object.');
        return { ok: false, issues: collector.issues };
    }

    if (!isPositiveInt(value.schemaVersion)) {
        collector.add('INVENTORY_FIELD_TYPE', `${path}.schemaVersion`,
            'Expected a positive integer schema version.');
    }
    if (typeof value.generator !== 'string' || value.generator.length === 0) {
        collector.add('INVENTORY_FIELD_TYPE', `${path}.generator`, 'Expected a non-empty string.');
    }
    if (!isNonNegativeInt(value.inkAlphaThreshold)) {
        collector.add('INVENTORY_FIELD_TYPE', `${path}.inkAlphaThreshold`,
            'Expected a non-negative integer.');
    }
    if (!isNonNegativeInt(value.totalAssets)) {
        collector.add('INVENTORY_FIELD_TYPE', `${path}.totalAssets`,
            'Expected a non-negative integer.');
    }

    if (!('assets' in value)) {
        collector.add('INVENTORY_FIELD_MISSING', `${path}.assets`, 'Missing required asset collection.');
        return { ok: false, issues: collector.issues };
    }
    if (!Array.isArray(value.assets)) {
        collector.add('INVENTORY_ASSETS_NOT_ARRAY', `${path}.assets`, 'Expected an array.');
        return { ok: false, issues: collector.issues };
    }
    if (value.assets.length === 0) {
        collector.add('INVENTORY_ASSETS_EMPTY', `${path}.assets`, 'Expected at least one asset.');
    }

    const seenPaths = new Set<string>();
    value.assets.forEach((asset, i) => {
        const assetPath = `${path}.assets[${i}]`;
        validateAsset(asset, assetPath, collector);
        if (isRecord(asset) && typeof asset.path === 'string') {
            // Asset path doubles as the identifier used by every lookup helper.
            if (seenPaths.has(asset.path)) {
                collector.add('ASSET_PATH_DUPLICATE', `${assetPath}.path`,
                    'Duplicate asset path; paths must be unique.');
            }
            seenPaths.add(asset.path);
        }
    });

    if (isNonNegativeInt(value.totalAssets) && value.totalAssets !== value.assets.length) {
        collector.add('ASSET_COUNT_MISMATCH', `${path}.totalAssets`,
            `Declared ${value.totalAssets} but found ${value.assets.length} asset(s).`);
    }

    if (!Array.isArray(value.duplicateGroups)) {
        collector.add('INVENTORY_FIELD_TYPE', `${path}.duplicateGroups`, 'Expected an array.');
    } else {
        value.duplicateGroups.forEach((group, i) => {
            const groupPath = `${path}.duplicateGroups[${i}]`;
            if (!isRecord(group) || typeof group.sha256 !== 'string' || !isStringArray(group.paths)) {
                collector.add('DUPLICATE_GROUP_INVALID', groupPath,
                    'Expected { sha256: string, paths: string[] }.');
            }
        });
    }

    if (collector.failed) return { ok: false, issues: collector.issues };
    return { ok: true, inventory: value as unknown as SourceAssetInventory };
}

/** Throwing variant used at module load, so bad data fails fast and clearly. */
export function assertSourceAssetInventory(value: unknown): SourceAssetInventory {
    const result = parseSourceAssetInventory(value);
    if (!result.ok) throw new InventoryValidationError(result.issues);
    return result.inventory;
}
