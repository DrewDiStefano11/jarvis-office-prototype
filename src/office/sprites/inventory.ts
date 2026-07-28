import inventoryJson from './source-asset-inventory.json';
import { assertSourceAssetInventory } from './inventoryValidation';
import {
    SourceAssetInventory,
    SourceAssetRecord,
    SpriteAssetClassification,
    SpriteAssetReadiness,
} from './inventoryTypes';

/**
 * Typed access to the generated source-asset inventory.
 *
 * The JSON is produced by `scripts/sprites/analyze-source-assets.mjs` from
 * measured pixel data. It is external generated input, so it is parsed and
 * validated at runtime rather than cast (AGENTS.md §32). A malformed or drifted
 * artifact fails here with a precise field path and stable error code, instead
 * of surfacing later as an opaque `undefined` access inside `manifest.ts`.
 */

export * from './inventoryTypes';
export {
    InventoryValidationError,
    parseSourceAssetInventory,
    assertSourceAssetInventory,
} from './inventoryValidation';
export type { InventoryErrorCode, InventoryIssue, InventoryParseResult } from './inventoryValidation';

export const SOURCE_ASSET_INVENTORY: SourceAssetInventory =
    assertSourceAssetInventory(inventoryJson as unknown);

export const NEXUS_TUBE_SOURCE_PATH = 'Nexus Tube Sprite.png';

export function getSourceAsset(path: string): SourceAssetRecord | undefined {
    return SOURCE_ASSET_INVENTORY.assets.find(asset => asset.path === path);
}

export function assetsByClassification(
    classification: SpriteAssetClassification,
): readonly SourceAssetRecord[] {
    return SOURCE_ASSET_INVENTORY.assets.filter(asset => asset.classification === classification);
}

export function assetsByReadiness(
    readiness: SpriteAssetReadiness,
): readonly SourceAssetRecord[] {
    return SOURCE_ASSET_INVENTORY.assets.filter(asset => asset.readiness === readiness);
}

/**
 * Measurement-side production eligibility.
 *
 * A generated measurement can never by itself grant production approval, so
 * `conditionally_usable` is deliberately excluded: it means "measured, but a
 * human still has to decide". Only `production_ready` qualifies here, and even
 * then the manifest must additionally carry an explicit authored approval
 * (`approvalStatus: 'production-approved'`) before anything reaches runtime.
 */
export function isProductionUsable(asset: SourceAssetRecord): boolean {
    return asset.readiness === 'production_ready'
        && !asset.ambiguous
        && asset.hasAlphaChannel
        && asset.transparencyUsed;
}

/** True when a human decision is still outstanding for this asset. */
export function requiresHumanReview(asset: SourceAssetRecord): boolean {
    return asset.readiness === 'conditionally_usable' || asset.ambiguous;
}
