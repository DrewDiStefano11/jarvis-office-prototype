import type { FloorDefinition } from '../../building/types';
import { permanentAgents } from '../../agents/permanentAgents';
import { floor1ArchitecturalObjects } from './architecture';
import { floor1Departments } from './departments';
import { floor1Furniture } from './furniture';
import { FLOOR_1_ID, FLOOR_1_WORLD, JARVIS_HQ_ID } from './metadata';
import { floor1Population } from './population';
import { floor1Rooms, floor1Zones } from './spaces';
import { floor1AccessThresholds, floor1Doors, floor1Walls } from './wallsDoors';
import { floor1Workspaces } from './workspaces';

export const floor1Definition: FloorDefinition = {
    id: FLOOR_1_ID,
    buildingId: JARVIS_HQ_ID,
    name: 'Jarvis HQ — Floor 1',
    level: 1,
    status: 'operational',
    world: FLOOR_1_WORLD,
    visual: { label: 'Jarvis HQ Floor 1', palette: 'warm-office', floorPattern: 'wood', visualVariant: 'floor-1-warm-pixel' },
    departments: floor1Departments,
    rooms: floor1Rooms,
    zones: floor1Zones,
    walls: floor1Walls,
    doors: floor1Doors,
    accessThresholds: floor1AccessThresholds,
    furniture: floor1Furniture,
    workspaces: floor1Workspaces,
    architecturalObjects: floor1ArchitecturalObjects,
    occupants: floor1Population,
    permanentAgents,
};
