import type { Bounds, FloorDefinition, Point2D, SpaceAssignment } from './types';

export interface ValidationResult {
    readonly valid: boolean;
    readonly errors: readonly string[];
}

const insideWorld = (point: Point2D, floor: FloorDefinition) =>
    point.x >= 0 && point.y >= 0 && point.x <= floor.world.width && point.y <= floor.world.height;

const boundsInsideWorld = (bounds: Bounds, floor: FloorDefinition) =>
    bounds.width > 0 && bounds.height > 0 && insideWorld(bounds, floor) &&
    bounds.x + bounds.width <= floor.world.width && bounds.y + bounds.height <= floor.world.height;

const boundsContain = (parent: Bounds, child: Bounds) =>
    child.x >= parent.x && child.y >= parent.y &&
    child.x + child.width <= parent.x + parent.width &&
    child.y + child.height <= parent.y + parent.height;

const assignedSpaceId = (assignment: SpaceAssignment): string | undefined => {
    if (assignment.roomId && assignment.zoneId) return undefined;
    return assignment.roomId ?? assignment.zoneId;
};

export function validateFloorDefinition(floor: FloorDefinition): ValidationResult {
    const errors: string[] = [];
    const allIds = [
        floor.id,
        ...floor.departments.map((entity) => entity.id),
        ...floor.rooms.map((entity) => entity.id),
        ...floor.zones.map((entity) => entity.id),
        ...floor.walls.map((entity) => entity.id),
        ...floor.doors.map((entity) => entity.id),
        ...floor.accessThresholds.map((entity) => entity.id),
        ...floor.furniture.map((entity) => entity.id),
        ...floor.workspaces.map((entity) => entity.id),
        ...floor.architecturalObjects.map((entity) => entity.id),
        ...floor.occupants.map((entity) => entity.id),
        ...floor.permanentAgents.map((entity) => entity.id),
    ];
    const seen = new Set<string>();
    allIds.forEach((id) => {
        if (seen.has(id)) errors.push(`Duplicate ID: ${id}`);
        seen.add(id);
    });

    const requiredCollections = [
        ['departments', floor.departments],
        ['rooms', floor.rooms],
        ['zones', floor.zones],
        ['walls', floor.walls],
        ['doors', floor.doors],
        ['accessThresholds', floor.accessThresholds],
        ['furniture', floor.furniture],
        ['workspaces', floor.workspaces],
        ['architecturalObjects', floor.architecturalObjects],
        ['occupants', floor.occupants],
        ['permanentAgents', floor.permanentAgents],
    ] as const;
    requiredCollections.forEach(([name, values]) => {
        if (values.length === 0) errors.push(`Required collection is empty: ${name}`);
    });

    const departments = new Set<string>(floor.departments.map((entity) => entity.id));
    const spaces = new Set<string>([
        ...floor.rooms.map((entity) => entity.id),
        ...floor.zones.map((entity) => entity.id),
    ]);
    const spaceBounds = new Map<string, Bounds>([
        ...floor.rooms.map((entity) => [entity.id, entity.bounds] as const),
        ...floor.zones.map((entity) => [entity.id, entity.bounds] as const),
    ]);
    const doors = new Set(floor.doors.map((entity) => entity.id));
    const workspaces = new Set(floor.workspaces.map((entity) => entity.id));
    const agents = new Set(floor.permanentAgents.map((entity) => entity.id));

    const checkFloor = (id: string, entityFloorId: string) => {
        if (entityFloorId !== floor.id) errors.push(`${id} references a different floor: ${entityFloorId}`);
    };
    const checkDepartment = (id: string, departmentId?: string) => {
        if (departmentId && !departments.has(departmentId)) errors.push(`${id} references missing department: ${departmentId}`);
    };
    const checkAssignment = (id: string, assignment: SpaceAssignment) => {
        const spaceId = assignedSpaceId(assignment);
        if (!spaceId) errors.push(`${id} must reference exactly one room or zone`);
        else if (!spaces.has(spaceId)) errors.push(`${id} references missing space: ${spaceId}`);
    };

    floor.departments.forEach((entity) => checkFloor(entity.id, entity.floorId));
    [...floor.rooms, ...floor.zones].forEach((entity) => {
        checkFloor(entity.id, entity.floorId);
        checkDepartment(entity.id, entity.departmentId);
        if (!boundsInsideWorld(entity.bounds, floor)) errors.push(`${entity.id} has invalid or out-of-bounds geometry`);
        if (entity.capacity < 0) errors.push(`${entity.id} has negative capacity`);
    });
    floor.walls.forEach((entity) => {
        checkFloor(entity.id, entity.floorId);
        if (!insideWorld(entity.from, floor) || !insideWorld(entity.to, floor)) errors.push(`${entity.id} is outside floor bounds`);
        if (entity.height <= 0 || entity.thickness <= 0) errors.push(`${entity.id} has invalid dimensions`);
    });
    floor.doors.forEach((entity) => {
        checkFloor(entity.id, entity.floorId);
        entity.connectedSpaceIds.forEach((spaceId) => {
            if (!spaces.has(spaceId)) errors.push(`${entity.id} connects missing space: ${spaceId}`);
        });
        if (entity.connectedSpaceIds[0] === entity.connectedSpaceIds[1]) errors.push(`${entity.id} must connect two different spaces`);
        if (!insideWorld(entity.position, floor) || entity.width <= 0) errors.push(`${entity.id} has invalid geometry`);
    });
    floor.accessThresholds.forEach((entity) => {
        checkFloor(entity.id, entity.floorId);
        if (entity.doorId && !doors.has(entity.doorId)) errors.push(`${entity.id} references missing door: ${entity.doorId}`);
        if (!insideWorld(entity.position, floor) || entity.width <= 0) errors.push(`${entity.id} has invalid geometry`);
    });
    [...floor.furniture, ...floor.workspaces, ...floor.architecturalObjects].forEach((entity) => {
        checkFloor(entity.id, entity.floorId);
        checkAssignment(entity.id, entity);
        if (!insideWorld(entity.position, floor)) errors.push(`${entity.id} is outside floor bounds`);
        if (!boundsInsideWorld(entity.footprint, floor)) errors.push(`${entity.id} has invalid footprint`);
        const spaceId = assignedSpaceId(entity);
        const parentBounds = spaceId ? spaceBounds.get(spaceId) : undefined;
        if (parentBounds && !boundsContain(parentBounds, entity.footprint)) errors.push(`${entity.id} footprint is outside its assigned space`);
    });
    floor.furniture.forEach((entity) => {
        if (!boundsInsideWorld(entity.blockedFootprint, floor)) errors.push(`${entity.id} has invalid blocked footprint`);
        const spaceId = assignedSpaceId(entity);
        const parentBounds = spaceId ? spaceBounds.get(spaceId) : undefined;
        if (parentBounds && !boundsContain(parentBounds, entity.blockedFootprint)) errors.push(`${entity.id} blocked footprint is outside its assigned space`);
    });
    floor.workspaces.forEach((entity) => {
        checkDepartment(entity.id, entity.departmentId);
        if (entity.capacity <= 0) errors.push(`${entity.id} must have positive capacity`);
        if (!insideWorld(entity.interactionPosition, floor)) errors.push(`${entity.id} interaction position is outside floor bounds`);
        if (entity.assignedAgentId && !agents.has(entity.assignedAgentId)) errors.push(`${entity.id} references missing agent: ${entity.assignedAgentId}`);
    });
    floor.occupants.forEach((entity) => {
        checkFloor(entity.id, entity.floorId);
        checkAssignment(entity.id, entity);
        if (!insideWorld(entity.position, floor)) errors.push(`${entity.id} is outside floor bounds`);
        if (entity.workspaceId && !workspaces.has(entity.workspaceId)) errors.push(`${entity.id} references missing workspace: ${entity.workspaceId}`);
        if (entity.agentId && !agents.has(entity.agentId)) errors.push(`${entity.id} references missing agent: ${entity.agentId}`);
    });
    floor.permanentAgents.forEach((entity) => checkDepartment(entity.id, entity.departmentId));

    return { valid: errors.length === 0, errors };
}
