import {
    accessThresholdId,
    agentId,
    architecturalObjectId,
    departmentId,
    doorId,
    furnitureId,
    occupantId,
    roomId,
    wallId,
    workspaceId,
    zoneId,
} from '../../building/ids';
import type {
    AccessThresholdDefinition,
    ArchitecturalObjectDefinition,
    DoorDefinition,
    FurnitureDefinition,
    RoomDefinition,
    SceneOccupantDefinition,
    WallDefinition,
    WorkspaceDefinition,
    ZoneDefinition,
} from '../../building/types';
import { FLOOR_1_ID } from './metadata';

const commandOfficeId = roomId('floor-1.room.jarvis-command-office');
const nexusId = zoneId('floor-1.zone.central-nexus');
const controlledLobbyId = zoneId('floor-1.zone.controlled-internal-lobby');
const commandDepartmentId = departmentId('floor-1.department.executive-command');
const commandDoorId = doorId('floor-1.door.jarvis-command-entry');

export const floor1FoundationRooms: readonly RoomDefinition[] = [{
    id: commandOfficeId,
    floorId: FLOOR_1_ID,
    departmentId: commandDepartmentId,
    name: 'Jarvis Command Office',
    roomType: 'private-office',
    accessLevel: 'highly-restricted',
    bounds: { x: 760, y: 180, width: 220, height: 160 },
    capacity: 1,
    visual: { label: 'Jarvis Command Office', shortLabel: 'Jarvis Command', palette: 'warm-executive', floorPattern: 'wood', visualVariant: 'private-office-executive' },
}];

export const floor1FoundationZones: readonly ZoneDefinition[] = [
    {
        id: nexusId,
        floorId: FLOOR_1_ID,
        name: 'Central Nexus',
        zoneType: 'nexus',
        accessLevel: 'department',
        bounds: { x: 610, y: 370, width: 572, height: 300 },
        capacity: 12,
        visual: { label: 'Central Nexus', palette: 'nexus-cyan', floorPattern: 'metal', visualVariant: 'central-nexus' },
    },
    {
        id: controlledLobbyId,
        floorId: FLOOR_1_ID,
        name: 'Controlled Internal Lobby',
        zoneType: 'lobby',
        accessLevel: 'general',
        bounds: { x: 710, y: 790, width: 372, height: 150 },
        capacity: 20,
        visual: { label: 'Controlled Internal Lobby', palette: 'warm-lobby', floorPattern: 'tile', visualVariant: 'controlled-lobby' },
    },
];

export const floor1FoundationWalls: readonly WallDefinition[] = [
    { id: wallId('floor-1.wall.jarvis-command-north'), floorId: FLOOR_1_ID, from: { x: 760, y: 180 }, to: { x: 980, y: 180 }, height: 42, thickness: 8, material: 'solid', cutaway: false, visualVariant: 'executive-wall' },
    { id: wallId('floor-1.wall.jarvis-command-west'), floorId: FLOOR_1_ID, from: { x: 760, y: 180 }, to: { x: 760, y: 340 }, height: 42, thickness: 8, material: 'solid', cutaway: true, visualVariant: 'executive-wall-cutaway' },
];

export const floor1FoundationDoors: readonly DoorDefinition[] = [{
    id: commandDoorId,
    floorId: FLOOR_1_ID,
    connectedSpaceIds: [commandOfficeId, nexusId],
    position: { x: 870, y: 340 },
    orientation: 'south',
    width: 42,
    accessLevel: 'highly-restricted',
    locked: true,
    badgeRequired: true,
    escortRequired: false,
    visualVariant: 'secure-executive-door',
}];

export const floor1FoundationThresholds: readonly AccessThresholdDefinition[] = [{
    id: accessThresholdId('floor-1.access.jarvis-command-entry'),
    floorId: FLOOR_1_ID,
    doorId: commandDoorId,
    position: { x: 870, y: 346 },
    orientation: 'south',
    width: 48,
    accessLevel: 'highly-restricted',
    visualVariant: 'reader-red',
}];

export const floor1FoundationFurniture: readonly FurnitureDefinition[] = [{
    id: furnitureId('floor-1.furniture.jarvis-command-desk'),
    floorId: FLOOR_1_ID,
    roomId: commandOfficeId,
    furnitureType: 'desk',
    position: { x: 850, y: 242 },
    orientation: 'south',
    footprint: { x: 812, y: 226, width: 76, height: 32 },
    blockedFootprint: { x: 808, y: 222, width: 84, height: 40 },
    blocksMovement: true,
    interactable: true,
    accessLevel: 'highly-restricted',
    visualVariant: 'desk-executive-pixel',
}];

export const floor1FoundationWorkspaces: readonly WorkspaceDefinition[] = [{
    id: workspaceId('floor-1.workspace.jarvis-command-office'),
    floorId: FLOOR_1_ID,
    roomId: commandOfficeId,
    departmentId: commandDepartmentId,
    workspaceType: 'permanent',
    position: { x: 850, y: 258 },
    interactionPosition: { x: 850, y: 286 },
    orientation: 'north',
    footprint: { x: 836, y: 250, width: 28, height: 24 },
    capacity: 1,
    occupancyState: 'occupied',
    assignedAgentId: agentId('agent-001'),
    accessLevel: 'highly-restricted',
    visualVariant: 'workspace-assigned-executive',
}];

export const floor1FoundationArchitecture: readonly ArchitecturalObjectDefinition[] = [{
    id: architecturalObjectId('floor-1.architecture.nexus-hologram'),
    floorId: FLOOR_1_ID,
    zoneId: nexusId,
    architecturalType: 'hologram',
    position: { x: 896, y: 520 },
    orientation: 'south',
    footprint: { x: 864, y: 488, width: 64, height: 64 },
    accessLevel: 'department',
    visualVariant: 'jarvis-hologram',
}];

export const floor1FoundationOccupants: readonly SceneOccupantDefinition[] = [{
    id: occupantId('floor-1.occupant.agent-001'),
    floorId: FLOOR_1_ID,
    roomId: commandOfficeId,
    agentId: agentId('agent-001'),
    workspaceId: workspaceId('floor-1.workspace.jarvis-command-office'),
    category: 'permanent',
    activity: 'working',
    position: { x: 850, y: 276 },
    orientation: 'north',
    visualVariant: 'agent-command',
    label: 'Jarvis',
}];
