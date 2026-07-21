import { describe, expect, it } from 'vitest';
import { createOccupantAppearance } from '../domain/agents/appearance';
import { placementErrors, validateAppearance } from '../domain/agents/appearanceValidation';
import { floor1Definition } from '../domain/floors/floor-1';
import { OCCUPANT_HOVER_SIZE, OCCUPANT_SELECTION_SIZE, occupantTextureKey, shouldAnimateAppearance } from '../rendering/occupantSpriteModel';

describe('deterministic Floor 1 occupant appearances', () => {
    it('attaches a valid deterministic appearance to every occupant', () => {
        floor1Definition.occupants.forEach((occupant) => {
            expect(validateAppearance(occupant.appearance, occupant)).toEqual([]);
            expect(createOccupantAppearance(occupant)).toEqual(occupant.appearance);
            expect(occupantTextureKey(createOccupantAppearance(occupant))).toBe(occupantTextureKey(occupant.appearance));
        });
    });

    it('meets the authored variation floor without random generation', () => {
        const appearances = floor1Definition.occupants.map((occupant) => occupant.appearance);
        expect(new Set(appearances.map((appearance) => appearance.id)).size).toBe(38);
        expect(new Set(appearances.map((appearance) => appearance.bodySilhouette)).size).toBeGreaterThanOrEqual(3);
        expect(new Set(appearances.map((appearance) => appearance.heightVariant)).size).toBeGreaterThanOrEqual(3);
        expect(new Set(appearances.map((appearance) => appearance.hairStyle)).size).toBeGreaterThanOrEqual(10);
        expect(new Set(appearances.map((appearance) => appearance.skinTone)).size).toBeGreaterThanOrEqual(6);
        expect(new Set(appearances.map((appearance) => appearance.clothing)).size).toBeGreaterThanOrEqual(10);
        expect(new Set(appearances.map((appearance) => occupantTextureKey(appearance))).size).toBeGreaterThanOrEqual(30);
    });

    it('preserves exact categories and permanent identity', () => {
        const occupants = floor1Definition.occupants;
        expect(occupants).toHaveLength(38);
        expect(occupants.filter((occupant) => occupant.category === 'permanent')).toHaveLength(24);
        expect(occupants.filter((occupant) => occupant.category === 'temporary')).toHaveLength(6);
        expect(occupants.filter((occupant) => occupant.category === 'sandbox')).toHaveLength(4);
        expect(occupants.filter((occupant) => ['visitor', 'escort', 'waiting'].includes(occupant.category))).toHaveLength(4);
        expect(new Set(occupants.filter((occupant) => occupant.category === 'permanent').map((occupant) => occupant.agentId)).size).toBe(24);
    });

    it('keeps every occupant inside its assigned room or zone', () => {
        expect(placementErrors(floor1Definition)).toEqual([]);
    });

    it('keeps vacant permanent and Operations workspaces unoccupied', () => {
        const occupiedWorkspaceIds = new Set(floor1Definition.occupants.map((occupant) => occupant.workspaceId).filter(Boolean));
        const vacancies = floor1Definition.workspaces.filter((workspace) => workspace.occupancyState === 'vacant');
        vacancies.forEach((workspace) => expect(occupiedWorkspaceIds.has(workspace.id)).toBe(false));
        const permanentVacancies = vacancies.filter((workspace) => workspace.permanentAssignmentAllowed);
        expect(permanentVacancies).toHaveLength(4);
        expect(permanentVacancies.filter((workspace) => workspace.id.includes('project'))).toHaveLength(2);
        expect(permanentVacancies.filter((workspace) => workspace.id.includes('operations-pod-b'))).toHaveLength(1);
        expect(permanentVacancies.filter((workspace) => workspace.id.includes('operations-pod-c'))).toHaveLength(1);
    });

    it('places exactly one distinct occupant in every Sandbox cell', () => {
        const sandbox = floor1Definition.occupants.filter((occupant) => occupant.category === 'sandbox');
        expect(new Set(sandbox.map((occupant) => occupant.roomId)).size).toBe(4);
        expect(new Set(sandbox.map((occupant) => occupant.appearance.pose)).size).toBe(4);
        expect(new Set(sandbox.map((occupant) => occupantTextureKey(occupant.appearance))).size).toBe(4);
    });

    it('uses enlarged stable interaction bounds and disables idle motion in reduced/off modes', () => {
        expect(OCCUPANT_HOVER_SIZE.width).toBeGreaterThanOrEqual(30);
        expect(OCCUPANT_SELECTION_SIZE.height).toBeGreaterThanOrEqual(16);
        const animated = floor1Definition.occupants.filter((occupant) => shouldAnimateAppearance(occupant.appearance, 'on'));
        expect(animated.length).toBeGreaterThan(0);
        expect(animated.length).toBeLessThan(10);
        floor1Definition.occupants.forEach((occupant) => {
            expect(shouldAnimateAppearance(occupant.appearance, 'reduced')).toBe(false);
            expect(shouldAnimateAppearance(occupant.appearance, 'off')).toBe(false);
        });
    });
});
