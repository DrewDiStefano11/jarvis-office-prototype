import {
    SPRITE_DIRECTIONS,
    SPRITE_STATES,
    SpriteAssetManifest,
    SpriteClip,
    SpriteDirection,
    SpriteManifest,
    SpriteManifestIntegrity,
    SpriteManifestValidationIssue,
    SpriteState,
} from './types';

const stateSet = new Set<string>(SPRITE_STATES);
const directionSet = new Set<string>(SPRITE_DIRECTIONS);
const classificationSet = new Set(['agent', 'hologram', 'effect']);
const checksumPattern = /^[a-f0-9]{64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function positiveInteger(value: unknown): value is number {
    return Number.isInteger(value) && Number(value) > 0;
}

function issue(issues: SpriteManifestValidationIssue[], path: string, message: string) {
    issues.push({ path, message });
}

function validateClip(
    value: unknown,
    path: string,
    asset: Pick<SpriteAssetManifest, 'frameCount' | 'authoredDirections'>,
    seenClipIds: Set<string>,
    issues: SpriteManifestValidationIssue[],
): value is SpriteClip {
    if (!isRecord(value)) {
        issue(issues, path, 'Clip must be an object.');
        return false;
    }
    const id = value.id;
    if (typeof id !== 'string' || id.trim() === '') issue(issues, `${path}.id`, 'Clip ID is required.');
    else if (seenClipIds.has(id)) issue(issues, `${path}.id`, `Duplicate clip ID ${id}.`);
    else seenClipIds.add(id);
    if (!stateSet.has(String(value.state))) issue(issues, `${path}.state`, 'Unsupported animation state.');
    if (!directionSet.has(String(value.direction))) issue(issues, `${path}.direction`, 'Unsupported direction.');
    else if (!asset.authoredDirections.includes(value.direction as SpriteDirection)) {
        issue(issues, `${path}.direction`, `Direction ${String(value.direction)} is not authored for this asset.`);
    }
    if (!Array.isArray(value.frames) || value.frames.length === 0) {
        issue(issues, `${path}.frames`, 'Animation clips require at least one frame.');
    } else {
        value.frames.forEach((frame, index) => {
            if (!Number.isInteger(frame) || Number(frame) < 0 || Number(frame) >= asset.frameCount) {
                issue(issues, `${path}.frames[${index}]`, 'Frame index is outside the sprite sheet.');
            }
        });
    }
    if (typeof value.framesPerSecond !== 'number' || !Number.isFinite(value.framesPerSecond) || value.framesPerSecond <= 0 || value.framesPerSecond > 30) {
        issue(issues, `${path}.framesPerSecond`, 'FPS must be greater than zero and no more than 30.');
    }
    if (!Number.isInteger(value.repeatDelayMs) || Number(value.repeatDelayMs) < 0) {
        issue(issues, `${path}.repeatDelayMs`, 'Repeat delay must be a nonnegative integer.');
    }
    for (const field of ['reducedMotionFallbackFrame', 'staticFallbackFrame'] as const) {
        const frame = value[field];
        if (!Number.isInteger(frame) || Number(frame) < 0 || Number(frame) >= asset.frameCount) {
            issue(issues, `${path}.${field}`, 'Fallback frame is outside the sprite sheet.');
        }
    }
    for (const field of ['loop', 'yoyo'] as const) {
        if (typeof value[field] !== 'boolean') issue(issues, `${path}.${field}`, 'Expected a boolean.');
    }
    return true;
}

function validateAsset(
    value: unknown,
    path: string,
    seenAssetIds: Set<string>,
    integrity: SpriteManifestIntegrity,
    issues: SpriteManifestValidationIssue[],
): value is SpriteAssetManifest {
    if (!isRecord(value)) {
        issue(issues, path, 'Asset must be an object.');
        return false;
    }
    const id = value.id;
    if (typeof id !== 'string' || id.trim() === '') issue(issues, `${path}.id`, 'Asset ID is required.');
    else if (seenAssetIds.has(id)) issue(issues, `${path}.id`, `Duplicate asset ID ${id}.`);
    else seenAssetIds.add(id);
    for (const field of ['frameWidth', 'frameHeight', 'frameCount', 'rows', 'columns'] as const) {
        if (!positiveInteger(value[field])) issue(issues, `${path}.${field}`, 'Expected a positive integer.');
    }
    if (
        positiveInteger(value.frameCount)
        && positiveInteger(value.rows)
        && positiveInteger(value.columns)
        && value.frameCount > value.rows * value.columns
    ) {
        issue(issues, `${path}.frameCount`, 'Frame count exceeds grid capacity.');
    }
    if (!isRecord(value.anchor)
        || typeof value.anchor.x !== 'number'
        || typeof value.anchor.y !== 'number'
        || !Number.isFinite(value.anchor.x)
        || !Number.isFinite(value.anchor.y)
        || value.anchor.x < 0
        || value.anchor.x > 1
        || value.anchor.y < 0
        || value.anchor.y > 1
    ) {
        issue(issues, `${path}.anchor`, 'Normalized anchor must be finite and between zero and one.');
    }
    if (typeof value.visualScale !== 'number' || !Number.isFinite(value.visualScale) || value.visualScale <= 0) {
        issue(issues, `${path}.visualScale`, 'Visual scale must be positive.');
    }
    if (typeof value.pixelArt !== 'boolean') issue(issues, `${path}.pixelArt`, 'Expected a boolean.');
    if (!classificationSet.has(String(value.classification))) {
        issue(issues, `${path}.classification`, 'Unsupported sprite classification.');
    }
    if (!Array.isArray(value.agentProfileCompatibility)) {
        issue(issues, `${path}.agentProfileCompatibility`, 'Agent profile compatibility must be an array.');
    } else {
        const seenProfiles = new Set<string>();
        value.agentProfileCompatibility.forEach((profile, index) => {
            if (typeof profile !== 'string' || profile.trim() === '') {
                issue(issues, `${path}.agentProfileCompatibility[${index}]`, 'Profile ID must be a nonempty string.');
            } else if (seenProfiles.has(profile)) {
                issue(issues, `${path}.agentProfileCompatibility[${index}]`, `Duplicate profile ID ${profile}.`);
            } else {
                seenProfiles.add(profile);
            }
        });
    }
    for (const field of ['sourceChecksum', 'generatedChecksum'] as const) {
        if (typeof value[field] !== 'string' || !checksumPattern.test(value[field])) {
            issue(issues, `${path}.${field}`, 'Expected a lowercase SHA-256 checksum.');
        }
    }
    if (!Array.isArray(value.authoredDirections) || value.authoredDirections.length === 0) {
        issue(issues, `${path}.authoredDirections`, 'At least one authored direction is required.');
    } else {
        value.authoredDirections.forEach((direction, index) => {
            if (!directionSet.has(String(direction))) issue(issues, `${path}.authoredDirections[${index}]`, 'Unsupported authored direction.');
        });
    }
    if (!Array.isArray(value.horizontalFlipDirections)) {
        issue(issues, `${path}.horizontalFlipDirections`, 'Horizontal flip directions must be explicit.');
    } else {
        if (value.horizontalFlipDirections.length > 0) {
            issue(issues, `${path}.horizontalFlipDirections`, 'Horizontal flip rendering is not supported; declare no flip directions.');
        }
        value.horizontalFlipDirections.forEach((direction, index) => {
            if (!directionSet.has(String(direction)) || direction === 'none') {
                issue(issues, `${path}.horizontalFlipDirections[${index}]`, 'Invalid horizontal flip direction.');
            }
        });
    }
    if (value.availability !== 'available' && value.availability !== 'blocked') issue(issues, `${path}.availability`, 'Invalid availability.');
    if (value.approval !== 'approved' && value.approval !== 'provisional') issue(issues, `${path}.approval`, 'Invalid approval.');
    if (value.runtimeCapability !== 'limited-cardinal-idle-walk' && value.runtimeCapability !== 'complete-office-activities') {
        issue(issues, `${path}.runtimeCapability`, 'Available assets must declare a supported reviewed runtime capability.');
    }
    if (!isRecord(value.frameIntegrity)
        || typeof value.frameIntegrity.method !== 'string'
        || !positiveInteger(value.frameIntegrity.inspectedFrameCount)
        || (value.frameIntegrity.maximumBottomAnchorDeviationPixels !== null
            && (typeof value.frameIntegrity.maximumBottomAnchorDeviationPixels !== 'number'
                || !Number.isFinite(value.frameIntegrity.maximumBottomAnchorDeviationPixels)
                || value.frameIntegrity.maximumBottomAnchorDeviationPixels < 0))) {
        issue(issues, `${path}.frameIntegrity`, 'A valid per-frame integrity audit is required.');
    }
    if (value.availability === 'available' && value.blockingReason !== null) {
        issue(issues, `${path}.blockingReason`, 'Available assets require a null blocking reason.');
    }
    if (value.availability === 'blocked' && (typeof value.blockingReason !== 'string' || value.blockingReason.trim() === '')) {
        issue(issues, `${path}.blockingReason`, 'Blocked assets require a blocking reason.');
    }
    if (integrity.productionMode && (value.approval !== 'approved' || value.availability !== 'available')) {
        issue(issues, path, 'Production mode rejects provisional or blocked assets.');
    }
    if (typeof value.sourceAssetReference !== 'string' || value.sourceAssetReference.trim() === '') issue(issues, `${path}.sourceAssetReference`, 'Source reference is required.');
    if (typeof value.generatedAssetUrl !== 'string' || value.generatedAssetUrl.trim() === '') issue(issues, `${path}.generatedAssetUrl`, 'Generated URL is required.');
    if (typeof id === 'string' && integrity.sourceChecksums?.[id] !== undefined && integrity.sourceChecksums[id] !== value.sourceChecksum) {
        issue(issues, `${path}.sourceChecksum`, 'Source checksum mismatch.');
    }
    if (typeof id === 'string' && integrity.generatedChecksums?.[id] !== undefined && integrity.generatedChecksums[id] !== value.generatedChecksum) {
        issue(issues, `${path}.generatedChecksum`, 'Generated checksum mismatch.');
    }
    if (integrity.availableGeneratedUrls && typeof value.generatedAssetUrl === 'string' && !integrity.availableGeneratedUrls.has(value.generatedAssetUrl)) {
        issue(issues, `${path}.generatedAssetUrl`, 'Generated file is missing.');
    }
    const authoredDirections = Array.isArray(value.authoredDirections)
        ? value.authoredDirections.filter((direction): direction is SpriteDirection => directionSet.has(String(direction)))
        : [];
    const seenClipIds = new Set<string>();
    if (!Array.isArray(value.clips) || value.clips.length === 0) {
        issue(issues, `${path}.clips`, 'Asset requires at least one clip.');
    } else if (positiveInteger(value.frameCount)) {
        value.clips.forEach((clip, index) => validateClip(
            clip,
            `${path}.clips[${index}]`,
            { frameCount: value.frameCount as number, authoredDirections },
            seenClipIds,
            issues,
        ));
    }
    return true;
}

function validateFallbackGraph(value: unknown, issues: SpriteManifestValidationIssue[]): value is Record<SpriteState, SpriteState | null> {
    if (!isRecord(value)) {
        issue(issues, 'fallbackGraph', 'Fallback graph must be an object.');
        return false;
    }
    for (const state of SPRITE_STATES) {
        if (!(state in value)) {
            issue(issues, `fallbackGraph.${state}`, 'Fallback state is undefined.');
            continue;
        }
        const target = value[state];
        if (target !== null && !stateSet.has(String(target))) issue(issues, `fallbackGraph.${state}`, 'Fallback target is undefined.');
        if (target === state) issue(issues, `fallbackGraph.${state}`, 'State cannot fall back to itself.');
    }
    for (const start of SPRITE_STATES) {
        const visited = new Set<SpriteState>();
        let current: SpriteState | null = start;
        while (current !== null) {
            if (visited.has(current)) {
                issue(issues, `fallbackGraph.${start}`, 'Fallback cycle detected.');
                break;
            }
            visited.add(current);
            const next: unknown = value[current];
            current = typeof next === 'string' && stateSet.has(next) ? next as SpriteState : null;
        }
    }
    return true;
}

function validateAssetFallbackCoverage(
    asset: unknown,
    path: string,
    fallbackGraph: unknown,
    issues: SpriteManifestValidationIssue[],
) {
    if (!isRecord(asset) || !Array.isArray(asset.clips) || !Array.isArray(asset.authoredDirections) || !isRecord(fallbackGraph)) {
        return;
    }
    const clips = asset.clips.filter(isRecord);
    const directions = asset.authoredDirections.filter(
        (direction): direction is SpriteDirection => directionSet.has(String(direction)),
    );
    for (const direction of directions) {
        for (const start of SPRITE_STATES) {
            const visited = new Set<SpriteState>();
            let current: SpriteState | null = start;
            let found = false;
            while (current !== null && !visited.has(current)) {
                visited.add(current);
                found = clips.some(clip => (
                    clip.state === current
                    && (clip.direction === direction || clip.direction === 'none')
                ));
                if (found) break;
                const next: unknown = fallbackGraph[current];
                current = typeof next === 'string' && stateSet.has(next) ? next as SpriteState : null;
            }
            if (!found) {
                issue(
                    issues,
                    `${path}.clips`,
                    `State ${start} with direction ${direction} has no compatible clip in its fallback chain.`,
                );
            }
        }
    }
}

export function validateSpriteManifest(
    value: unknown,
    integrity: SpriteManifestIntegrity = {},
): readonly SpriteManifestValidationIssue[] {
    const issues: SpriteManifestValidationIssue[] = [];
    if (!isRecord(value)) return [{ path: '', message: 'Manifest must be an object.' }];
    if (value.schemaVersion !== 1) issue(issues, 'schemaVersion', 'Unsupported sprite manifest version.');
    if (typeof value.generatedBy !== 'string' || value.generatedBy.trim() === '') {
        issue(issues, 'generatedBy', 'Generator identity is required.');
    }
    validateFallbackGraph(value.fallbackGraph, issues);
    const seenAssetIds = new Set<string>();
    if (!Array.isArray(value.assets)) issue(issues, 'assets', 'Assets must be an array.');
    else value.assets.forEach((asset, index) => {
        const path = `assets[${index}]`;
        validateAsset(asset, path, seenAssetIds, integrity, issues);
        validateAssetFallbackCoverage(asset, path, value.fallbackGraph, issues);
    });
    if (!Array.isArray(value.blockedAssets)) issue(issues, 'blockedAssets', 'Blocked assets must be an array.');
    else {
        value.blockedAssets.forEach((asset, index) => {
            if (!isRecord(asset)) {
                issue(issues, `blockedAssets[${index}]`, 'Blocked asset must be an object.');
                return;
            }
            if (typeof asset.id !== 'string' || asset.id.trim() === '') issue(issues, `blockedAssets[${index}].id`, 'Blocked asset ID is required.');
            else if (seenAssetIds.has(asset.id)) issue(issues, `blockedAssets[${index}].id`, `Duplicate asset ID ${asset.id}.`);
            else seenAssetIds.add(asset.id);
            if (asset.availability !== 'blocked' || asset.approval !== 'provisional' || typeof asset.blockingReason !== 'string' || asset.blockingReason.trim() === '') {
                issue(issues, `blockedAssets[${index}]`, 'Blocked assets require provisional status and a blocking reason.');
            }
            if (asset.runtimeCapability !== 'quarantined-fallback-only') {
                issue(issues, `blockedAssets[${index}].runtimeCapability`, 'Blocked assets must be quarantined from directional runtime use.');
            }
            if (typeof asset.sourceAssetReference !== 'string' || asset.sourceAssetReference.trim() === '') {
                issue(issues, `blockedAssets[${index}].sourceAssetReference`, 'Source reference is required.');
            }
        });
    }
    return issues;
}

export function assertValidSpriteManifest(
    value: unknown,
    integrity: SpriteManifestIntegrity = {},
): SpriteManifest {
    const issues = validateSpriteManifest(value, integrity);
    if (issues.length > 0) {
        throw new Error(`Invalid sprite manifest:\n${issues.map(item => `${item.path}: ${item.message}`).join('\n')}`);
    }
    return value as SpriteManifest;
}
