import { describe, it, expect } from 'vitest';
import { floor1Workspaces } from '../domain/floors/floor-1/workspaces';
import { validateFloor1Workspaces } from '../domain/validation/workspaceValidator';

describe('Workspace Validator', () => {
    it('validates Floor 1 workspace counts exactly according to specifications', () => {
        const validation = validateFloor1Workspaces(floor1Workspaces);
        expect(validation.errors).toEqual([]);
        expect(validation.isValid).toBe(true);
    });
});
