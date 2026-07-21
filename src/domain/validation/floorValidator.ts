import { FloorDefinition } from '../../types/building';

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export function validateFloor1(floor: FloorDefinition): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Rule: Exactly 9 numbered departments
    const numberedDepartments = floor.departments.filter(d => d.number !== undefined);
    if (numberedDepartments.length !== 9) {
        errors.push(`Floor 1 must have exactly 9 numbered departments, found ${numberedDepartments.length}.`);
    }

    // Rule: Exactly 12 private offices
    const privateOffices = floor.rooms.filter(r => r.roomType === 'private-office');
    if (privateOffices.length !== 12) {
        errors.push(`Floor 1 must have exactly 12 private offices, found ${privateOffices.length}.`);
    }

    // Rule: Exactly 5 conference rooms
    const conferenceRooms = floor.rooms.filter(r => r.roomType === 'conference');
    if (conferenceRooms.length !== 5) {
        errors.push(`Floor 1 must have exactly 5 conference rooms, found ${conferenceRooms.length}.`);
    }

    // Verify uniqueness of conference rooms
    const boardroomCount = conferenceRooms.filter(r => r.name.includes('Boardroom')).length;
    if (boardroomCount !== 1) errors.push(`Expected exactly 1 Executive Boardroom, found ${boardroomCount}.`);
    const strategyCount = conferenceRooms.filter(r => r.name.includes('Strategy')).length;
    if (strategyCount !== 1) errors.push(`Expected exactly 1 Strategy and Architecture Room, found ${strategyCount}.`);
    const incidentRoomCount = conferenceRooms.filter(r => r.name.includes('Incident')).length;
    if (incidentRoomCount !== 1) errors.push(`Expected exactly 1 Incident Command Room, found ${incidentRoomCount}.`);

    // Rule: Exactly 4 focus rooms
    const focusRooms = floor.rooms.filter(r => r.roomType === 'focus');
    if (focusRooms.length !== 4) {
        errors.push(`Floor 1 must have exactly 4 focus rooms, found ${focusRooms.length}.`);
    }

    // Rule: Exactly 2 construction connections
    const constructionRooms = floor.rooms.filter(r => r.roomType === 'construction');
    if (constructionRooms.length !== 2) {
        errors.push(`Floor 1 must have exactly 2 construction rooms, found ${constructionRooms.length}.`);
    }

    // Check Sandbox cells
    const sandboxCells = floor.rooms.filter(r => r.roomType === 'sandbox');
    if (sandboxCells.length !== 4) {
        errors.push(`Floor 1 must have exactly 4 sandbox cells, found ${sandboxCells.length}.`);
    }

    // Geometry bounds verification: Workspaces must be inside their assigned rooms
    floor.workspaces.forEach(ws => {
        const room = floor.rooms.find(r => r.id === ws.roomId);
        if (!room) {
            errors.push(`Workspace ${ws.id} is assigned to non-existent room ${ws.roomId}`);
            return;
        }

        // Ensure point is inside AABB
        if (ws.position.x < room.bounds.x || ws.position.x > room.bounds.x + room.bounds.width ||
            ws.position.y < room.bounds.y || ws.position.y > room.bounds.y + room.bounds.height) {
            errors.push(`Geometry violation: Workspace ${ws.id} is physically placed outside its assigned room boundary (${room.name}). wsPos: ${ws.position.x},${ws.position.y}. roomBounds: ${room.bounds.x},${room.bounds.y} w:${room.bounds.width} h:${room.bounds.height}`);
        }
    });

    // Check IDs are unique across rooms and departments
    const idSet = new Set<string>();
    floor.departments.forEach(d => {
        if (idSet.has(d.id)) errors.push(`Duplicate ID found: ${d.id}`);
        idSet.add(d.id);
    });
    floor.rooms.forEach(r => {
        if (idSet.has(r.id)) errors.push(`Duplicate ID found: ${r.id}`);
        idSet.add(r.id);
    });

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}
