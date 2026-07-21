import { roomId, zoneId } from '../../building/ids';
import type { FloorDefinition } from '../../building/types';
import { floor1AccessFlow } from './circulation';

export interface Floor1ValidationResult {
    readonly valid: boolean;
    readonly errors: readonly string[];
}

export function validateFloor1Requirements(floor: FloorDefinition): Floor1ValidationResult {
    const errors: string[] = [];
    const expectCount = (label: string, actual: number, expected: number) => {
        if (actual !== expected) errors.push(`${label}: expected ${expected}, found ${actual}`);
    };

    expectCount('Numbered departments', floor.departments.length, 9);
    expectCount('Private offices', floor.rooms.filter((room) => room.roomType === 'private-office').length, 12);
    expectCount('Conference rooms', floor.rooms.filter((room) => room.roomType === 'conference').length, 5);
    expectCount('Focus rooms', floor.rooms.filter((room) => room.roomType === 'focus').length, 4);
    expectCount('Sandbox cells', floor.rooms.filter((room) => room.roomType === 'sandbox-cell').length, 4);
    expectCount('Sealed expansion connections', floor.rooms.filter((room) => room.roomType === 'construction').length, 2);

    const permanent = floor.workspaces.filter((workspace) => workspace.permanentAssignmentAllowed);
    expectCount('Permanent workspaces', permanent.length, 28);
    expectCount('Occupied permanent workspaces', permanent.filter((workspace) => workspace.occupancyState === 'occupied').length, 24);
    expectCount('Vacant permanent workspaces', permanent.filter((workspace) => workspace.occupancyState === 'vacant').length, 4);
    expectCount('Operational consoles', floor.workspaces.filter((workspace) => workspace.workspaceType === 'operational').length, 16);
    expectCount('Temporary desks', floor.workspaces.filter((workspace) => workspace.workspaceType === 'temporary').length, 8);
    expectCount('Sandbox positions', floor.workspaces.filter((workspace) => workspace.workspaceType === 'sandbox').length, 4);

    const vacantIds = permanent.filter((workspace) => workspace.occupancyState === 'vacant').map((workspace) => workspace.id).sort();
    const expectedVacancies = [
        'floor-1.workspace.operations-pod-b-01-vacant',
        'floor-1.workspace.operations-pod-c-01-vacant',
        'floor-1.workspace.project-vacant-01',
        'floor-1.workspace.project-vacant-02',
    ];
    if (JSON.stringify(vacantIds) !== JSON.stringify(expectedVacancies)) errors.push(`Incorrect permanent vacancies: ${vacantIds.join(', ')}`);

    const projectManagerRoom = roomId('floor-1.room.project-release-manager-office');
    const projectZone = zoneId('floor-1.zone.project-coordination');
    floor.workspaces.filter((workspace) => workspace.id.includes('project-vacant')).forEach((workspace) => {
        if (workspace.zoneId !== projectZone || workspace.roomId === projectManagerRoom) errors.push(`${workspace.id} must be in open Project Coordination`);
    });

    const vestibule = roomId('floor-1.room.containment-vestibule');
    floor.rooms.filter((room) => room.roomType === 'sandbox-cell').forEach((cell) => {
        const doors = floor.doors.filter((door) => door.connectedSpaceIds.includes(cell.id));
        if (doors.length !== 1 || !doors[0].connectedSpaceIds.includes(vestibule)) errors.push(`${cell.id} must have one door opening only to the containment vestibule`);
    });

    const preCheckpoint = new Set<string>([zoneId('floor-1.zone.public-vestibule'), zoneId('floor-1.zone.reception-navigation'), zoneId('floor-1.zone.intake-stations')]);
    const postCheckpoint = new Set<string>([zoneId('floor-1.zone.controlled-internal-lobby'), zoneId('floor-1.zone.temporary-route'), zoneId('floor-1.zone.production-route'), zoneId('floor-1.zone.secure-evaluation-route')]);
    const bypass = floor1AccessFlow.find((connection) => preCheckpoint.has(connection.from) && postCheckpoint.has(connection.to) && !connection.checkpoint);
    if (bypass) errors.push(`Checkpoint bypass modeled from ${bypass.from} to ${bypass.to}`);
    expectCount('Checkpoint gates', floor.furniture.filter((item) => item.furnitureType === 'checkpoint-gate' && item.zoneId === zoneId('floor-1.zone.secure-checkpoint')).length, 5);

    const permanentOccupants = floor.occupants.filter((occupant) => occupant.category === 'permanent');
    expectCount('Permanent occupants', permanentOccupants.length, 24);
    expectCount('Unique permanent occupant agents', new Set(permanentOccupants.map((occupant) => occupant.agentId)).size, 24);
    expectCount('Temporary occupants', floor.occupants.filter((occupant) => occupant.category === 'temporary').length, 6);
    expectCount('Sandbox occupants', floor.occupants.filter((occupant) => occupant.category === 'sandbox').length, 4);
    if (floor.occupants.length < 36 || floor.occupants.length > 42) errors.push(`Visible population must be 36–42, found ${floor.occupants.length}`);

    expectCount('Operations Pod A consoles', floor.workspaces.filter((workspace) => workspace.id.includes('operations-pod-a')).length, 4);
    expectCount('Operations Pod B consoles', floor.workspaces.filter((workspace) => workspace.id.includes('operations-pod-b')).length, 4);
    expectCount('Operations Pod C consoles', floor.workspaces.filter((workspace) => workspace.id.includes('operations-pod-c')).length, 4);
    expectCount('Nexus consoles', floor.workspaces.filter((workspace) => workspace.id.includes('nexus-console')).length, 4);

    const expansionSeals = floor.architecturalObjects.filter((object) => object.architecturalType === 'expansion-seal');
    expectCount('Expansion seals', expansionSeals.length, 2);
    if (expansionSeals.some((object) => object.accessLevel !== 'restricted')) errors.push('Expansion seals must be restricted');

    return { valid: errors.length === 0, errors };
}
