import type { FloorDefinition } from '../../building/types';
import { permanentAgents } from '../../agents/permanentAgents';
import { floor1Departments } from './departments';
import {
    floor1FoundationArchitecture,
    floor1FoundationDoors,
    floor1FoundationFurniture,
    floor1FoundationOccupants,
    floor1FoundationRooms,
    floor1FoundationThresholds,
    floor1FoundationWalls,
    floor1FoundationWorkspaces,
    floor1FoundationZones,
} from './foundation';
import { FLOOR_1_ID, FLOOR_1_WORLD, JARVIS_HQ_ID } from './metadata';

export const floor1Definition: FloorDefinition = {
    id: FLOOR_1_ID,
    buildingId: JARVIS_HQ_ID,
    name: 'Jarvis HQ — Floor 1',
    level: 1,
    status: 'operational',
    world: FLOOR_1_WORLD,
    visual: { label: 'Jarvis HQ Floor 1', palette: 'warm-office', floorPattern: 'wood', visualVariant: 'floor-1-warm-pixel' },
    departments: floor1Departments,
    rooms: floor1FoundationRooms,
    zones: floor1FoundationZones,
    walls: floor1FoundationWalls,
    doors: floor1FoundationDoors,
    accessThresholds: floor1FoundationThresholds,
    furniture: floor1FoundationFurniture,
    workspaces: floor1FoundationWorkspaces,
    architecturalObjects: floor1FoundationArchitecture,
    occupants: floor1FoundationOccupants,
    permanentAgents,
};
