import type { VisualLabProfile } from './types';

export interface VisualLabValidationResult {
    readonly valid: boolean;
    readonly errors: readonly string[];
}

export function validateVisualLabProfiles(profiles: readonly VisualLabProfile[]): VisualLabValidationResult {
    const errors: string[] = [];
    const ids = new Set<string>();
    profiles.forEach((profile) => {
        if (ids.has(profile.id)) errors.push(`Duplicate visual profile ID: ${profile.id}`);
        ids.add(profile.id);
        if (profile.dimensions.suiteWidth <= 0 || profile.dimensions.suiteDepth <= 0) errors.push(`${profile.id} has invalid suite geometry`);
        if (profile.assets.standing.width <= 0 || profile.assets.standing.height <= 0) errors.push(`${profile.id} has invalid standing source dimensions`);
        if (profile.assets.seated.width <= 0 || profile.assets.seated.height <= 0) errors.push(`${profile.id} has invalid seated source dimensions`);
        if (profile.assets.furniture <= 0 || profile.assets.architecture <= 0) errors.push(`${profile.id} has invalid object source dimensions`);
        if (profile.assets.renderScale <= 0) errors.push(`${profile.id} has invalid render scale`);
        if (profile.dimensions.aisleWidth < profile.dimensions.doorClearance) errors.push(`${profile.id} aisle is narrower than its door clearance`);
    });
    return { valid: errors.length === 0, errors };
}

