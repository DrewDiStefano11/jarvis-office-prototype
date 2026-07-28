/**
 * Shape of the generated source-asset inventory.
 *
 * Kept separate from `inventory.ts` so the runtime validator can depend on the
 * types without importing the JSON artifact (which would create a cycle).
 */

export type SpriteAssetClassification =
    | 'central_nexus_hologram'
    | 'agent_sprite_sheet'
    | 'agent_reference'
    | 'role_reference'
    | 'individual_character'
    | 'animation_reference'
    | 'unknown';

export type SpriteAssetReadiness =
    | 'production_ready'
    | 'conditionally_usable'
    | 'reference_only'
    | 'invalid';

export const SPRITE_ASSET_CLASSIFICATIONS: readonly SpriteAssetClassification[] = [
    'central_nexus_hologram',
    'agent_sprite_sheet',
    'agent_reference',
    'role_reference',
    'individual_character',
    'animation_reference',
    'unknown',
];

export const SPRITE_ASSET_READINESS_VALUES: readonly SpriteAssetReadiness[] = [
    'production_ready',
    'conditionally_usable',
    'reference_only',
    'invalid',
];

export type InventoryBounds = Readonly<{
    x: number;
    y: number;
    width: number;
    height: number;
}>;

export type InventoryFrameRectangle = Readonly<{
    index: number;
    row: number;
    column: number;
    x: number;
    y: number;
    width: number;
    height: number;
}>;

export type NexusGridMeasurement = Readonly<{
    detectedColumns: number;
    detectedRows: number;
    totalCells: number;
    columnBands: readonly (readonly number[])[];
    rowBands: readonly (readonly number[])[];
    frameRectangles: readonly InventoryFrameRectangle[];
    uniformCells: boolean;
    distinctCellWidths: readonly number[];
    distinctCellHeights: readonly number[];
    blankCells: readonly number[];
}>;

export type AgentGridMeasurement = Readonly<{
    assumedCellSize: Readonly<{ width: number; height: number }>;
    columns: number;
    rows: number;
    totalCells: number;
    widthDivisible: boolean;
    heightDivisible: boolean;
    detectedColumnBands: number;
    detectedRowBands: number;
    blankCells: number;
    horizontalSpillCells: number;
    equalCellExtractionValid: boolean;
}>;

export type SourceAssetRecord = Readonly<{
    path: string;
    fileSizeBytes: number;
    sha256: string;
    width: number;
    height: number;
    bitDepth: number;
    colorType: number;
    channels: number;
    chunkTypes: readonly string[];
    hasAlphaChannel: boolean;
    transparencyUsed: boolean;
    minAlpha: number;
    maxAlpha: number;
    fullyTransparentPixels: number;
    partiallyTransparentPixels: number;
    uniformOpaqueBackground: boolean;
    backgroundColor: string | null;
    classification: SpriteAssetClassification;
    readiness: SpriteAssetReadiness;
    ambiguous: boolean;
    nexusGrid: NexusGridMeasurement | null;
    agentGrid: AgentGridMeasurement | null;
    warnings: readonly string[];
}>;

export type SourceAssetInventory = Readonly<{
    schemaVersion: number;
    generator: string;
    inkAlphaThreshold: number;
    totalAssets: number;
    duplicateGroups: readonly Readonly<{ sha256: string; paths: readonly string[] }>[];
    assets: readonly SourceAssetRecord[];
}>;

