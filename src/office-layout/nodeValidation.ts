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
            const fd = fs.openSync(fullPath, 'r');
            const buffer = Buffer.alloc(24);
            const bytesRead = fs.readSync(fd, buffer, 0, 24, 0);
            fs.closeSync(fd);

            if (bytesRead < 24) {
                 // The prompt specifies "File shorter than PNG signature fails" and it emits INVALID_PNG_SIGNATURE.
                 // However, we should also check if it's less than 24, which includes IHDR.
                 // A valid signature but missing IHDR fails. So let's be careful.
                 if (bytesRead < 8 || buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') {
                     addIssue('INVALID_PNG_SIGNATURE', `Invalid PNG signature in file: ${entry.filePath}`, entry.id, entry.filePath);
                     return;
                 }
                 // If we have a signature but not enough for IHDR:
                 addIssue('PNG_IHDR_MISSING', `Missing or truncated IHDR chunk in PNG: ${entry.filePath}`, entry.id, entry.filePath);
                 return;
            }

            // Verify PNG Signature
            // 89 50 4E 47 0D 0A 1A 0A
            if (buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') {
                addIssue('INVALID_PNG_SIGNATURE', `Invalid PNG signature in file: ${entry.filePath}`, entry.id, entry.filePath);
                return;
            }

            // Validate IHDR chunk length is exactly 13
            const ihdrLength = buffer.readUInt32BE(8);
            if (ihdrLength !== 13) {
                addIssue('PNG_IHDR_INVALID', `IHDR chunk length must be exactly 13: ${entry.filePath}`, entry.id, entry.filePath);
                return;
            }

            // Read Chunk Type (4 bytes)
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
