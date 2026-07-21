import type { FloorDefinition, Point2D } from './types';

export type InspectableEntityType = 'department' | 'room' | 'zone' | 'occupant' | 'workspace' | 'architecture' | 'door';

export interface InspectionRow {
    readonly label: string;
    readonly value: string;
}

export interface InspectionDetails {
    readonly id: string;
    readonly entityType: InspectableEntityType;
    readonly title: string;
    readonly subtitle: string;
    readonly position: Point2D;
    readonly rows: readonly InspectionRow[];
}

const titleCase = (value: string) => value.replace(/-/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase());
const lastSegment = (value: string) => value.split('.').slice(-1)[0];
const spaceName = (floor: FloorDefinition, roomId?: string, zoneId?: string) =>
    floor.rooms.find((room) => room.id === roomId)?.name ?? floor.zones.find((zone) => zone.id === zoneId)?.name ?? 'Unassigned';
const departmentName = (floor: FloorDefinition, departmentId?: string) =>
    floor.departments.find((department) => department.id === departmentId)?.name ?? 'Shared Facility';

export function inspectEntity(
    floor: FloorDefinition,
    entityType: InspectableEntityType,
    id: string,
): InspectionDetails | undefined {
    if (entityType === 'department') {
        const entity = floor.departments.find((item) => item.id === id);
        if (!entity) return undefined;
        const rooms = floor.rooms.filter((room) => room.departmentId === entity.id);
        const workspaces = floor.workspaces.filter((workspace) => workspace.departmentId === entity.id);
        const occupants = floor.occupants.filter((occupant) => rooms.some((room) => room.id === occupant.roomId) || floor.zones.some((zone) => zone.departmentId === entity.id && zone.id === occupant.zoneId));
        return {
            id, entityType, title: `${entity.number}. ${entity.name}`, subtitle: 'Department', position: entity.labelPosition,
            rows: [
                { label: 'Access', value: titleCase(entity.accessLevel) },
                { label: 'Rooms', value: String(rooms.length) },
                { label: 'Permanent Workspaces', value: String(workspaces.filter((workspace) => workspace.permanentAssignmentAllowed).length) },
                { label: 'Occupied / Vacant', value: `${workspaces.filter((workspace) => workspace.occupancyState === 'occupied').length} / ${workspaces.filter((workspace) => workspace.occupancyState === 'vacant').length}` },
                { label: 'Visible Population', value: String(occupants.length) },
            ],
        };
    }

    if (entityType === 'room' || entityType === 'zone') {
        const room = entityType === 'room' ? floor.rooms.find((item) => item.id === id) : undefined;
        const zone = entityType === 'zone' ? floor.zones.find((item) => item.id === id) : undefined;
        const entity = room ?? zone;
        if (!entity) return undefined;
        const workspaces = floor.workspaces.filter((workspace) => workspace.roomId === entity.id || workspace.zoneId === entity.id);
        const occupants = floor.occupants.filter((occupant) => occupant.roomId === entity.id || occupant.zoneId === entity.id);
        return {
            id, entityType, title: entity.name, subtitle: titleCase(room?.roomType ?? zone?.zoneType ?? entityType),
            position: { x: entity.bounds.x + entity.bounds.width / 2, y: entity.bounds.y + entity.bounds.height / 2 },
            rows: [
                { label: 'Department', value: departmentName(floor, entity.departmentId) },
                { label: 'Access', value: titleCase(entity.accessLevel) },
                { label: 'Capacity', value: String(entity.capacity) },
                { label: 'Visible Occupants', value: String(occupants.length) },
                { label: 'Workspaces', value: String(workspaces.length) },
                { label: 'Entrances', value: String(floor.doors.filter((door) => door.connectedSpaceIds.includes(entity.id)).length) },
            ],
        };
    }

    if (entityType === 'occupant') {
        const entity = floor.occupants.find((item) => item.id === id);
        if (!entity) return undefined;
        const agent = floor.permanentAgents.find((item) => item.id === entity.agentId);
        return {
            id, entityType,
            title: agent?.displayName ?? entity.label ?? titleCase(entity.category),
            subtitle: agent?.role ?? `${titleCase(entity.category)} Occupant`,
            position: entity.position,
            rows: [
                { label: 'Category', value: titleCase(entity.category) },
                { label: 'Department', value: departmentName(floor, agent?.departmentId) },
                { label: 'Location', value: spaceName(floor, entity.roomId, entity.zoneId) },
                { label: 'Static Pose', value: titleCase(entity.activity) },
                { label: 'Sprite Pose', value: titleCase(entity.appearance.pose) },
                { label: 'Facing', value: titleCase(entity.appearance.facing) },
                { label: 'Appearance', value: entity.appearance.id },
                { label: 'Accessory', value: titleCase(entity.appearance.accessory) },
                { label: 'Workspace', value: entity.workspaceId ? lastSegment(entity.workspaceId) : 'Activity Position' },
                { label: 'Access', value: titleCase(agent?.accessLevel ?? (entity.category === 'sandbox' ? 'escorted-containment' : 'general')) },
            ],
        };
    }

    if (entityType === 'workspace') {
        const entity = floor.workspaces.find((item) => item.id === id);
        if (!entity) return undefined;
        const agent = floor.permanentAgents.find((item) => item.id === entity.assignedAgentId);
        return {
            id, entityType, title: lastSegment(entity.id), subtitle: `${titleCase(entity.workspaceType)} Workspace`, position: entity.position,
            rows: [
                { label: 'State', value: titleCase(entity.occupancyState) },
                { label: 'Assigned Agent', value: agent?.displayName ?? 'None' },
                { label: 'Department', value: departmentName(floor, entity.departmentId) },
                { label: 'Location', value: spaceName(floor, entity.roomId, entity.zoneId) },
                { label: 'Access', value: titleCase(entity.accessLevel) },
            ],
        };
    }

    if (entityType === 'architecture') {
        const entity = floor.architecturalObjects.find((item) => item.id === id);
        if (!entity) return undefined;
        return {
            id, entityType, title: titleCase(entity.architecturalType), subtitle: 'Architectural Object', position: entity.position,
            rows: [
                { label: 'Location', value: spaceName(floor, entity.roomId, entity.zoneId) },
                { label: 'Access', value: titleCase(entity.accessLevel) },
                { label: 'Visual State', value: titleCase(entity.visualVariant) },
            ],
        };
    }

    const entity = floor.doors.find((item) => item.id === id);
    if (!entity) return undefined;
    return {
        id, entityType, title: titleCase(entity.visualVariant), subtitle: 'Controlled Entrance', position: entity.position,
        rows: [
            { label: 'Access', value: titleCase(entity.accessLevel) },
            { label: 'Locked', value: entity.locked ? 'Yes' : 'No' },
            { label: 'Badge Required', value: entity.badgeRequired ? 'Yes' : 'No' },
            { label: 'Escort Required', value: entity.escortRequired ? 'Yes' : 'No' },
        ],
    };
}
