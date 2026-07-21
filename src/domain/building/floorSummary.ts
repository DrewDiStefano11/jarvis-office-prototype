import type { FloorDefinition } from './types';

export interface FloorSummary {
    readonly permanentAgents: number;
    readonly permanentCapacity: number;
    readonly vacancies: number;
    readonly temporaryDesks: number;
    readonly temporaryActive: number;
    readonly sandboxCells: number;
    readonly sandboxOccupancy: number;
    readonly visibleOccupants: number;
    readonly transientOccupants: number;
    readonly operationalConsoles: number;
    readonly operationsPods: number;
    readonly sharedSurgeConsoles: number;
    readonly vacantPermanentConsoles: number;
    readonly departments: number;
    readonly privateOffices: number;
    readonly conferenceRooms: number;
    readonly focusRooms: number;
    readonly expansionConnections: number;
}

export function createFloorSummary(floor: FloorDefinition): FloorSummary {
    const permanent = floor.workspaces.filter((workspace) => workspace.permanentAssignmentAllowed);
    const operationsWorkspaces = floor.workspaces.filter((workspace) => workspace.id.includes('operations-pod-'));

    return {
        permanentAgents: floor.permanentAgents.length,
        permanentCapacity: permanent.length,
        vacancies: permanent.filter((workspace) => workspace.occupancyState === 'vacant').length,
        temporaryDesks: floor.workspaces.filter((workspace) => workspace.workspaceType === 'temporary').length,
        temporaryActive: floor.occupants.filter((occupant) => occupant.category === 'temporary').length,
        sandboxCells: floor.rooms.filter((room) => room.roomType === 'sandbox-cell').length,
        sandboxOccupancy: floor.occupants.filter((occupant) => occupant.category === 'sandbox').length,
        visibleOccupants: floor.occupants.length,
        transientOccupants: floor.occupants.filter((occupant) => ['visitor', 'escort', 'waiting'].includes(occupant.category)).length,
        operationalConsoles: floor.workspaces.filter((workspace) => workspace.workspaceType === 'operational').length,
        operationsPods: new Set(operationsWorkspaces.map((workspace) => workspace.zoneId)).size,
        sharedSurgeConsoles: operationsWorkspaces.filter((workspace) => workspace.shared && workspace.occupancyState === 'standby').length,
        vacantPermanentConsoles: operationsWorkspaces.filter((workspace) => workspace.occupancyState === 'vacant').length,
        departments: floor.departments.length,
        privateOffices: floor.rooms.filter((room) => room.roomType === 'private-office').length,
        conferenceRooms: floor.rooms.filter((room) => room.roomType === 'conference').length,
        focusRooms: floor.rooms.filter((room) => room.roomType === 'focus').length,
        expansionConnections: floor.rooms.filter((room) => room.roomType === 'construction').length,
    };
}
