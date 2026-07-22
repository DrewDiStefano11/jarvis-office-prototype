export const HIGH_RESOLUTION_VISUAL_LAB_QUERY = 'high-resolution-checkpoint';
export const APPROVED_FLOOR_PROOF_QUERY = 'approved-floor-proof';

export function isHighResolutionVisualLab(search: string): boolean {
    return new URLSearchParams(search).get('visualLab') === HIGH_RESOLUTION_VISUAL_LAB_QUERY;
}

export function isApprovedFloorProof(search: string): boolean {
    return new URLSearchParams(search).get('visualLab') === APPROVED_FLOOR_PROOF_QUERY;
}
