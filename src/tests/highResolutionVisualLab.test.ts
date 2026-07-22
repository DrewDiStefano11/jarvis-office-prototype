import { describe, expect, it } from 'vitest';
import { floor1Definition } from '../domain/floors/floor-1';
import { VISUAL_LAB_PROFILES } from '../visual-lab/profiles';
import { isHighResolutionVisualLab } from '../visual-lab/route';
import { labCharacterTextureKey, labFurnitureTextureKey } from '../visual-lab/textureKeys';
import { validateVisualLabProfiles } from '../visual-lab/validation';

describe('high-resolution visual laboratory', () => {
    it('keeps the normal application route as the default', () => {
        expect(isHighResolutionVisualLab('')).toBe(false);
        expect(isHighResolutionVisualLab('?visualLab=other')).toBe(false);
        expect(isHighResolutionVisualLab('?visualLab=high-resolution-checkpoint')).toBe(true);
    });

    it('defines four unique, valid, deliberately different profiles', () => {
        const validation = validateVisualLabProfiles(VISUAL_LAB_PROFILES);
        expect(validation).toEqual({ valid: true, errors: [] });
        expect(new Set(VISUAL_LAB_PROFILES.map((profile) => profile.id)).size).toBe(4);
        expect(VISUAL_LAB_PROFILES.map((profile) => profile.assets.standing.width)).toEqual([24, 32, 48, 64]);
        expect(VISUAL_LAB_PROFILES.map((profile) => profile.assets.furniture)).toEqual([32, 48, 64, 80]);
        expect(VISUAL_LAB_PROFILES.map((profile) => profile.dimensions.usableAreaIncrease)).toEqual([0, 25.3, 44.8, 70]);
    });

    it('uses stable, profile-scoped texture keys', () => {
        const candidate = VISUAL_LAB_PROFILES[2];
        expect(labCharacterTextureKey(candidate, 'operations', 'front-right')).toBe(labCharacterTextureKey(candidate, 'operations', 'front-right'));
        expect(labFurnitureTextureKey(candidate, 'console', 'operations')).toBe(labFurnitureTextureKey(candidate, 'console', 'operations'));
        expect(labCharacterTextureKey(candidate, 'operations', 'front-right')).not.toBe(labCharacterTextureKey(VISUAL_LAB_PROFILES[3], 'operations', 'front-right'));
    });

    it('does not mutate permanent Floor 1 counts or assignments', () => {
        expect(floor1Definition.occupants).toHaveLength(38);
        expect(floor1Definition.workspaces).toHaveLength(52);
        expect(floor1Definition.rooms).toHaveLength(41);
        expect(floor1Definition.zones).toHaveLength(28);
        expect(floor1Definition.occupants.filter((occupant) => occupant.category === 'permanent')).toHaveLength(24);
    });
});
