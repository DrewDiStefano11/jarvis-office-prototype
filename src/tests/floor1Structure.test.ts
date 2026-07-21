import { describe, it, expect } from 'vitest';
import { floor1Departments } from '../domain/floors/floor-1/departments';
import { floor1Rooms } from '../domain/floors/floor-1/rooms';
import { validateFloor1 } from '../domain/validation/floorValidator';
import { createFloorId } from '../types/ids';

describe('Floor 1 Structure Validation', () => {
    it('passes architectural rules for Floor 1', () => {
        const floorDef = {
            id: createFloorId('floor-1'),
            name: 'JARVIS HQ',
            status: 'Operational' as const,
            departments: floor1Departments,
            rooms: floor1Rooms,
            workspaces: [],
            doors: [],
            routes: [],
            destinations: [],
            furniture: []
        };
        const validation = validateFloor1(floorDef);
        expect(validation.errors).toEqual([]);
        expect(validation.isValid).toBe(true);
    });
});
