import crypto from 'node:crypto';

export const APPROVAL_SCHEMA_VERSION = 2;
export const REQUIRED_ROUTE_TESTS = [
    'entrance-to-central-nexus',
    'entrance-to-three-departments',
    'major-obstacle-avoidance',
    'allowed-threshold',
    'closed-threshold-rejected',
    'unauthorized-threshold-rejected',
    'door-state-recalculation',
    'inside-walkable-geometry',
    'wall-collision-rejected',
    'object-collision-rejected',
];

function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    }
    return value;
}

export function approvalChecksum(artifact) {
    const { checksum: _checksum, ...payload } = artifact;
    return crypto.createHash('sha256').update(JSON.stringify(canonical(payload))).digest('hex');
}

export function withApprovalChecksum(artifact) {
    return { ...artifact, checksum: approvalChecksum(artifact) };
}

function reject(condition, message) {
    if (condition) throw new Error(`Production promotion refused: ${message}`);
}

export function validateApprovalArtifact(artifact, context) {
    reject(!artifact || typeof artifact !== 'object', 'approval artifact is malformed.');
    reject(artifact.schemaVersion !== APPROVAL_SCHEMA_VERSION, 'approval schema version is invalid.');
    reject(artifact.status !== 'approved' || artifact.approved !== true, 'explicit approval is missing.');
    reject(!artifact.reviewer?.id || !artifact.reviewer?.approvedAt || !Number.isFinite(Date.parse(artifact.reviewer.approvedAt)), 'reviewer identity or approval timestamp is invalid.');
    reject(artifact.checksum !== approvalChecksum(artifact), 'approval checksum is stale or invalid.');
    const landmarks = artifact.landmarks?.filter(landmark => landmark.enabled) ?? [];
    reject(landmarks.length < 8, 'at least eight enabled landmarks are required.');
    reject(artifact.coverage?.passed !== true || artifact.coverage?.quadrants?.length !== 4, 'distributed image-wide landmark coverage is required.');
    reject(!Number.isFinite(artifact.transform?.scale) || artifact.transform.scale <= 0 || 'scaleX' in artifact.transform || 'scaleY' in artifact.transform, 'registration must use one positive uniform scale.');
    const residuals = artifact.residuals;
    reject(!residuals || ![residuals.maximum, residuals.mean, residuals.rms].every(Number.isFinite), 'finite residual evidence is required.');
    reject(!residuals.thresholds || ![residuals.thresholds.maximum, residuals.thresholds.mean, residuals.thresholds.rms].every(Number.isFinite), 'residual thresholds are required.');
    reject(residuals.maximum > residuals.thresholds.maximum || residuals.mean > residuals.thresholds.mean || residuals.rms > residuals.thresholds.rms, 'residual thresholds are not satisfied.');
    reject(landmarks.some(landmark => !landmark.residual || ![landmark.residual.x, landmark.residual.y, landmark.residual.distance].every(Number.isFinite)), 'per-landmark residuals are incomplete.');
    reject(JSON.stringify(canonical(artifact.source?.pdfHashes)) !== JSON.stringify(canonical(context.source.pdfHashes)), 'source PDF hashes do not match.');
    reject(artifact.source?.productionImageHash !== context.source.productionImageHash, 'clean production image hash does not match.');
    reject(artifact.source?.embeddedImageHash !== context.source.embeddedImageHash, 'embedded background hash does not match.');
    reject(context.reconciliation.unresolvedCriticalCount !== 0 || context.reconciliation.discardedCount !== 0, 'parser reconciliation contains unresolved or discarded records.');
    reject(context.classification.complete !== true, 'classified source set is incomplete.');
    const expectedDoors = Array.from({ length: 47 }, (_, index) => `D${String(index + 1).padStart(2, '0')}`);
    reject(JSON.stringify(context.classification.doorIds) !== JSON.stringify(expectedDoors), 'door IDs must be the exact ordered set D01-D47.');
    reject(artifact.reviews?.geometry?.status !== 'approved' || artifact.reviews.geometry.unresolvedCount !== 0, 'geometry review is incomplete.');
    reject(artifact.reviews?.colliders?.status !== 'approved' || artifact.reviews.colliders.unresolvedCount !== 0, 'collider review is incomplete.');
    reject(artifact.reviews?.navigation?.status !== 'approved' || artifact.reviews.navigation.unresolvedCount !== 0, 'navigation review is incomplete.');
    reject(!artifact.navigation?.cells?.length, 'reviewed navigation geometry is not populated.');
    const routeTests = new Map((artifact.navigation?.routeTests ?? []).map(test => [test.id, test.passed]));
    reject(REQUIRED_ROUTE_TESTS.some(id => routeTests.get(id) !== true), 'required route tests are incomplete or failing.');
    return { artifact, enabledLandmarks: landmarks, checksum: artifact.checksum };
}
