import type { VisualLabFacing, VisualLabFurnitureType, VisualLabProfile, VisualLabRole } from './types';

const safe = (value: string): string => value.replace(/[^a-z0-9-]/gi, '-').toLowerCase();

export function labCharacterTextureKey(profile: VisualLabProfile, role: VisualLabRole, facing: VisualLabFacing): string {
    return safe(`visual-lab-${profile.id}-character-${role}-${facing}`);
}

export function labFurnitureTextureKey(profile: VisualLabProfile, type: VisualLabFurnitureType, paletteKey: string): string {
    return safe(`visual-lab-${profile.id}-furniture-${type}-${paletteKey}`);
}

