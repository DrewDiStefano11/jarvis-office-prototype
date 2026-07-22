export const HIGH_RESOLUTION_VISUAL_LAB_QUERY = 'high-resolution-checkpoint';

export function isHighResolutionVisualLab(search: string): boolean {
    return new URLSearchParams(search).get('visualLab') === HIGH_RESOLUTION_VISUAL_LAB_QUERY;
}

