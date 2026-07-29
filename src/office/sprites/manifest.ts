import rawManifest from '../../../public/assets/office/sprites/generated/manifest.json';
import { resolvePublicAssetPath } from '../assets';
import { SpriteAssetManifest } from './types';
import { assertValidSpriteManifest } from './validation';

export const AGENT_SPRITE_MANIFEST = assertValidSpriteManifest(rawManifest, { productionMode: true });

export function spriteAssetUrl(asset: SpriteAssetManifest): string {
    return resolvePublicAssetPath(asset.generatedAssetUrl);
}
