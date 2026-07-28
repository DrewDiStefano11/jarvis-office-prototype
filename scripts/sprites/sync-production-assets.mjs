/**
 * Copies verified source PNGs into the public sprite directories.
 *
 * Copies are byte-for-byte: no resizing, re-encoding, cropping or background
 * removal. Each copy's SHA-256 is re-read from disk and compared against the
 * source, and the resulting mapping table is written for documentation.
 *
 * Usage: node scripts/sprites/sync-production-assets.mjs
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const INVENTORY = join(REPO_ROOT, 'src', 'office', 'sprites', 'source-asset-inventory.json');

const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');

/**
 * The legacy office-registry path. This script must NEVER write here: the
 * sample overlay declares that asset ID as a uniform 128x192 / 8-frame /
 * 8-column sheet, so dropping the 1254x1254 non-uniform pose grid there would
 * change runtime loading and defeat the intentional missing-asset fallback.
 */
const FORBIDDEN_LEGACY_PATH = 'assets/office/sprites/central-blue-tube-hologram.png';

/**
 * Destination for each source file. Reference-only material goes to
 * `references/` so it can never be mistaken for a production sprite.
 */
function destinationFor(record) {
    if (record.classification === 'central_nexus_hologram') {
        // Isolated candidate location, NOT the registered runtime path.
        return 'assets/office/sprites/holograms/candidates/central-nexus-pose-grid.png';
    }
    if (record.classification === 'role_reference') {
        return `assets/office/sprites/references/${record.path}`;
    }
    const safe = record.path.replace(/[()]/g, '').replace(/\s+/g, '-');
    if (record.classification === 'agent_sprite_sheet') {
        return `assets/office/sprites/agents/${safe}`;
    }
    return `assets/office/sprites/references/${safe}`;
}

function main() {
    const inventory = JSON.parse(readFileSync(INVENTORY, 'utf8'));
    const mappings = [];

    for (const record of inventory.assets) {
        const destination = destinationFor(record);
        if (destination === FORBIDDEN_LEGACY_PATH) {
            throw new Error(`Refusing to populate the legacy runtime path: ${destination}`);
        }
        const sourceAbs = join(REPO_ROOT, record.path);
        const destAbs = join(REPO_ROOT, 'public', destination);
        mkdirSync(dirname(destAbs), { recursive: true });
        copyFileSync(sourceAbs, destAbs);

        const copiedHash = sha256(readFileSync(destAbs));
        if (copiedHash !== record.sha256) {
            throw new Error(`Copy verification failed for ${record.path}: ${copiedHash} != ${record.sha256}`);
        }
        mappings.push({
            source: record.path,
            destination,
            sha256: record.sha256,
            width: record.width,
            height: record.height,
            classification: record.classification,
            readiness: record.readiness,
            // No asset in this pipeline is production-approved yet; the Nexus
            // grid is a candidate pending human review.
            productionAsset: false,
            approvalStatus: record.classification === 'central_nexus_hologram'
                ? 'candidate-unverified'
                : 'reference-only',
        });
    }

    mappings.sort((a, b) => a.source.localeCompare(b.source));
    // Fail loudly if the legacy runtime path ever appears on disk.
    const legacyAbs = join(REPO_ROOT, 'public', FORBIDDEN_LEGACY_PATH);
    if (existsSync(legacyAbs)) {
        throw new Error(`Legacy runtime hologram path must remain absent: ${FORBIDDEN_LEGACY_PATH}`);
    }

    const outPath = join(REPO_ROOT, 'src', 'office', 'sprites', 'production-asset-map.json');
    writeFileSync(outPath, `${JSON.stringify({
        schemaVersion: 1,
        legacyRuntimePathIntentionallyAbsent: FORBIDDEN_LEGACY_PATH,
        mappings,
    }, null, 4)}\n`);
    process.stdout.write(`Copied and verified ${mappings.length} asset(s).\n`);
}

main();
