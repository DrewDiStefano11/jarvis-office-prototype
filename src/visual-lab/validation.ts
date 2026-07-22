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
        if (profile.dimensions.mainCorridorWidth < profile.dimensions.doorClearance) errors.push(`${profile.id} main corridor is narrower than its door clearance`);
        if (profile.dimensions.secondaryCorridorWidth <= 0 || profile.dimensions.secureCorridorWidth <= 0 || profile.dimensions.movementClearanceArea <= 0) errors.push(`${profile.id} has invalid movement geometry`);
        if (profile.materialProfileCount <= 0 || profile.departmentThemeCount <= 0 || profile.lightingProfileCount <= 0) errors.push(`${profile.id} has incomplete visual-system profiles`);
        if (profile.particleProfileCount < 0) errors.push(`${profile.id} has invalid particle profiles`);
    });
    const c = profiles.find((profile) => profile.id === 'candidate-c');
    const d = profiles.find((profile) => profile.id === 'candidate-d');
    const e = profiles.find((profile) => profile.id === 'candidate-e');
    if (c && d && d.dimensions.usableAreaIncrease < c.dimensions.usableAreaIncrease + 25) errors.push('candidate-d does not materially exceed Candidate C area');
    if (c && e && e.dimensions.usableAreaIncrease < c.dimensions.usableAreaIncrease + 60) errors.push('candidate-e does not materially exceed Candidate C area');
    if (d && e && e.assets.furniture <= d.assets.furniture) errors.push('candidate-e furniture is not larger than Candidate D');
    return { valid: errors.length === 0, errors };
}
