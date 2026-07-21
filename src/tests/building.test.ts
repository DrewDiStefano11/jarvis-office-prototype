import { describe, it, expect, beforeEach } from 'vitest';
import { globalBuildingRegistry } from '../domain/building/registry';
import { createFloorId } from '../types/ids';

describe('Building Registry', () => {
    beforeEach(() => {
        globalBuildingRegistry.clear();
    });

    it('can register and retrieve a mock floor', () => {
        const floorId = createFloorId('floor-2-mock');
        globalBuildingRegistry.registerFloor({
            id: floorId,
            name: 'Mock Floor',
            status: 'Under Construction',
            departments: [],
            rooms: [],
            workspaces: [],
            doors: [],
            routes: [],
            destinations: [],
            furniture: []
        });

        const retrieved = globalBuildingRegistry.getFloor(floorId);
        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(floorId);
    });
});
