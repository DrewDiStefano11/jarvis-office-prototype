import * as fs from 'fs';
import * as path from 'path';
import { AssetManifest, OfficeValidationResult, OfficeValidationIssue, OfficeValidationCode } from './types';

function resolvePathInsideRoot(
  root: string,
  relativePath: string
):
  | { readonly ok: true; readonly fullPath: string }
  | { readonly ok: false } {

    const resolvedRoot = path.resolve(root);
    const fullPath = path.resolve(resolvedRoot, relativePath);
    const relative = path.relative(resolvedRoot, fullPath);

    if (relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) {
        return { ok: false };
    }

    return { ok: true, fullPath };
}

export function validateAssetFiles(manifest: AssetManifest, publicRoot: string): OfficeValidationResult {
    const issues: OfficeValidationIssue[] = [];

    const addIssue = (code: OfficeValidationCode, message: string, assetId: string, filePath?: string) => {
        issues.push({ code, severity: 'error', message, entityType: 'AssetFile', entityId: assetId, path: filePath });
    };

    manifest.entries.forEach(entry => {
        if (!entry.filePath || entry.filePath.trim() === '') {
             // Let the base validator handle empty paths, but we skip it here
             return;
        }

        const resolveResult = resolvePathInsideRoot(publicRoot, entry.filePath);
        if (!resolveResult.ok) {
            addIssue('INVALID_ASSET_PATH', `Asset path escapes public root: ${entry.filePath}`, entry.id, entry.filePath);
            return;
        }

        const fullPath = resolveResult.fullPath;

        if (!fs.existsSync(fullPath)) {
            addIssue('ASSET_FILE_MISSING', `Missing asset file: ${entry.filePath}`, entry.id, entry.filePath);
            return;
        }

        try {
            const buffer = fs.readFileSync(fullPath);

            const PNG_SIGNATURE_BYTES = 8;
            const PNG_CHUNK_LENGTH_BYTES = 4;
            const PNG_CHUNK_TYPE_BYTES = 4;
            const PNG_IHDR_DATA_BYTES = 13;
            const PNG_CHUNK_CRC_BYTES = 4;

            const COMPLETE_IHDR_CHUNK_BYTES =
                PNG_SIGNATURE_BYTES +
                PNG_CHUNK_LENGTH_BYTES +
                PNG_CHUNK_TYPE_BYTES +
                PNG_IHDR_DATA_BYTES +
                PNG_CHUNK_CRC_BYTES; // = 33

            // Step A: PNG signature
            if (buffer.length < PNG_SIGNATURE_BYTES || buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') {
                addIssue('INVALID_PNG_SIGNATURE', `Invalid PNG signature in file: ${entry.filePath}`, entry.id, entry.filePath);
                return;
            }

            // Step B: first-chunk header
            if (buffer.length < PNG_SIGNATURE_BYTES + PNG_CHUNK_LENGTH_BYTES + PNG_CHUNK_TYPE_BYTES) {
                addIssue('PNG_IHDR_MISSING', `Missing or truncated IHDR chunk in PNG: ${entry.filePath}`, entry.id, entry.filePath);
                return;
            }

            // Step C: first chunk must be IHDR
            const ihdrType = buffer.toString('ascii', 12, 16);
            if (ihdrType !== 'IHDR') {
                addIssue('PNG_IHDR_MISSING', `Missing IHDR chunk in PNG: ${entry.filePath}`, entry.id, entry.filePath);
                return;
            }

            // Step D: IHDR declared length
            const ihdrLength = buffer.readUInt32BE(8);
            if (ihdrLength !== 13) {
                addIssue('PNG_IHDR_INVALID', `IHDR chunk length must be exactly 13: ${entry.filePath}`, entry.id, entry.filePath);
                return;
            }

            // Step E: complete IHDR data and CRC must exist
            if (buffer.length < COMPLETE_IHDR_CHUNK_BYTES) {
                addIssue('PNG_IHDR_INVALID', `IHDR chunk is truncated; expected at least 33 bytes in file: ${entry.filePath}`, entry.id, entry.filePath);
                return;
            }

            // Step F: parse dimensions
            const width = buffer.readUInt32BE(16);
            const height = buffer.readUInt32BE(20);

            if (width !== entry.frameWidth) {
                addIssue('PNG_WIDTH_MISMATCH', `PNG width ${width} does not match manifest frameWidth ${entry.frameWidth}`, entry.id, entry.filePath);
            }

            if (height !== entry.frameHeight) {
                addIssue('PNG_HEIGHT_MISMATCH', `PNG height ${height} does not match manifest frameHeight ${entry.frameHeight}`, entry.id, entry.filePath);
            }

        } catch (err: unknown) {
            addIssue('ASSET_FILE_MISSING', `Error reading asset file: ${err instanceof Error ? err.message : String(err)}`, entry.id, entry.filePath);
        }
    });

    return { isValid: issues.length === 0, issues };
}
