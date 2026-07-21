import { floorId } from './ids';
import { BuildingRegistry } from './registry';
import type { BuildingDefinition, FloorDefinition } from './types';
import { floor1Definition } from '../floors/floor-1';
import { JARVIS_HQ_ID } from '../floors/floor-1/metadata';

export const DEFAULT_ACTIVE_FLOOR_ID = floorId('floor-1');

export function createApplicationFloorRegistry(
    definition: Omit<BuildingDefinition, 'floors'>,
    floors: readonly FloorDefinition[],
): BuildingRegistry {
    const registry = new BuildingRegistry(definition);
    floors.forEach((floor) => registry.registerFloor(floor));
    return registry;
}

export const applicationFloorRegistry = createApplicationFloorRegistry(
    { id: JARVIS_HQ_ID, name: 'Jarvis HQ' },
    [floor1Definition],
);

export function getApplicationFloor(id = DEFAULT_ACTIVE_FLOOR_ID): FloorDefinition {
    const floor = applicationFloorRegistry.getFloor(id);
    if (!floor) throw new Error(`Unknown active floor: ${id}`);
    return floor;
}
