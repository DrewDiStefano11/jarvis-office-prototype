import * as fs from 'fs';
import * as path from 'path';
import { AssetManifest, OfficeValidationResult, OfficeValidationIssue, OfficeValidationCode } from './types';

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

        // Resolving against publicRoot guarantees absolute path
        const fullPath = path.resolve(publicRoot, entry.filePath);

        // Security check: Must not escape public root
        if (!fullPath.startsWith(publicRoot)) {
            addIssue('INVALID_ASSET_PATH', `Asset path escapes public root: ${entry.filePath}`, entry.id, entry.filePath);
            return;
        }

        if (!fs.existsSync(fullPath)) {
            addIssue('ASSET_FILE_MISSING', `Missing asset file: ${entry.filePath}`, entry.id, entry.filePath);
            return;
        }

        try {
            const fd = fs.openSync(fullPath, 'r');
            const buffer = Buffer.alloc(24);
            const bytesRead = fs.readSync(fd, buffer, 0, 24, 0);
            fs.closeSync(fd);

            if (bytesRead < 24) {
                 addIssue('INVALID_PNG_SIGNATURE', `File is too small to be a PNG: ${entry.filePath}`, entry.id, entry.filePath);
                 return;
            }

            // Verify PNG Signature
            // 89 50 4E 47 0D 0A 1A 0A
            if (buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') {
                addIssue('INVALID_PNG_SIGNATURE', `Invalid PNG signature in file: ${entry.filePath}`, entry.id, entry.filePath);
                return;
            }

            // Read IHDR length (4 bytes) and Chunk Type (4 bytes)
            const ihdrType = buffer.toString('ascii', 12, 16);
            if (ihdrType !== 'IHDR') {
                addIssue('PNG_IHDR_MISSING', `Missing IHDR chunk in PNG: ${entry.filePath}`, entry.id, entry.filePath);
                return;
            }

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
