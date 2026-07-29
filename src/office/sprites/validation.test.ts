import { describe, expect, it } from 'vitest';
import rawManifest from '../../../public/assets/office/sprites/generated/manifest.json';
import { assertValidSpriteManifest, validateSpriteManifest } from './validation';

function cloneManifest(): Record<string, unknown> {
    return structuredClone(rawManifest) as Record<string, unknown>;
}

function assets(value: Record<string, unknown>): Record<string, unknown>[] {
    return value.assets as Record<string, unknown>[];
}

function clips(asset: Record<string, unknown>): Record<string, unknown>[] {
    return asset.clips as Record<string, unknown>[];
}

describe('sprite manifest validation', () => {
    it('accepts the generated manifest in production mode', () => {
        expect(assertValidSpriteManifest(rawManifest, { productionMode: true }).assets).toHaveLength(16);
    });

    it.each([
        ['duplicate asset IDs', (value: Record<string, unknown>) => { assets(value)[1].id = assets(value)[0].id; }],
        ['duplicate clip IDs', (value: Record<string, unknown>) => { clips(assets(value)[0])[1].id = clips(assets(value)[0])[0].id; }],
        ['invalid frame index', (value: Record<string, unknown>) => { clips(assets(value)[0])[0].frames = [99]; }],
        ['invalid frame dimensions', (value: Record<string, unknown>) => { assets(value)[0].frameWidth = 0; }],
        ['invalid anchor', (value: Record<string, unknown>) => { assets(value)[0].anchor = { x: -1, y: 2 }; }],
        ['invalid FPS', (value: Record<string, unknown>) => { clips(assets(value)[0])[0].framesPerSecond = 0; }],
        ['empty clip', (value: Record<string, unknown>) => { clips(assets(value)[0])[0].frames = []; }],
        ['unsupported direction', (value: Record<string, unknown>) => { clips(assets(value)[0])[0].direction = 'north'; }],
        ['fallback cycle', (value: Record<string, unknown>) => { (value.fallbackGraph as Record<string, unknown>).idle = 'walking'; }],
        ['blocked asset in production mode', (value: Record<string, unknown>) => { assets(value)[0].approval = 'provisional'; }],
        ['missing pixel-art declaration', (value: Record<string, unknown>) => { delete assets(value)[0].pixelArt; }],
        ['invalid classification', (value: Record<string, unknown>) => { assets(value)[0].classification = 'vehicle'; }],
        ['invalid profile compatibility', (value: Record<string, unknown>) => { assets(value)[0].agentProfileCompatibility = ['jarvis', 1]; }],
        ['invalid available blocking reason', (value: Record<string, unknown>) => { assets(value)[0].blockingReason = 'not null'; }],
        ['missing generator identity', (value: Record<string, unknown>) => { delete value.generatedBy; }],
        ['missing blocked source reference', (value: Record<string, unknown>) => {
            delete (value.blockedAssets as Record<string, unknown>[])[0].sourceAssetReference;
        }],
        ['unsupported horizontal flip declaration', (value: Record<string, unknown>) => {
            assets(value)[0].horizontalFlipDirections = ['west'];
        }],
        ['fallback chain without a compatible terminal clip', (value: Record<string, unknown>) => {
            assets(value)[0].clips = clips(assets(value)[0]).filter(clip => clip.state !== 'offline');
        }],
    ])('rejects %s', (_name, mutate) => {
        const value = cloneManifest();
        mutate(value);
        expect(validateSpriteManifest(value, { productionMode: true })).not.toHaveLength(0);
    });

    it('rejects source and generated checksum drift or missing files', () => {
        const manifest = assertValidSpriteManifest(rawManifest);
        const first = manifest.assets[0];
        expect(validateSpriteManifest(rawManifest, {
            sourceChecksums: { [first.id]: '0'.repeat(64) },
            generatedChecksums: { [first.id]: '1'.repeat(64) },
            availableGeneratedUrls: new Set(),
        }).map(item => item.message)).toEqual(expect.arrayContaining([
            'Source checksum mismatch.',
            'Generated checksum mismatch.',
            'Generated file is missing.',
        ]));
    });
});
