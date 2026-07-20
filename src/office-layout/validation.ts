import {
    OfficeLayout,
    AssetManifest,
    WorkspaceAssignment,
    Point,
    Bounds,
    RoomId
} from './types';

export interface ValidationResult {
    readonly isValid: boolean;
    readonly errors: readonly string[];
}

function pointInBounds(p: Point, b: Bounds): boolean {
    return p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height;
}

export function validateLayout(layout: OfficeLayout): ValidationResult {
    const errors: string[] = [];
    const entityIds = new Set<string>();

    const checkId = (id: string, type: string) => {
        if (entityIds.has(id)) {
            errors.push(`Duplicate ID found: ${id} (${type})`);
        } else {
            entityIds.add(id);
        }
    };

    const roomIds = new Set<RoomId>();

    layout.rooms.forEach(r => {
        checkId(r.id, 'Room');
        roomIds.add(r.id);
    });

    layout.doorways.forEach(d => {
        checkId(d.id, 'Doorway');
        if (!roomIds.has(d.connectsRooms[0]) || !roomIds.has(d.connectsRooms[1])) {
            errors.push(`Doorway ${d.id} references missing room: ${d.connectsRooms.join(', ')}`);
        }
    });

    layout.walkableAreas.forEach(w => checkId(w.id, 'WalkableArea'));
    layout.blockedAreas.forEach(b => checkId(b.id, 'BlockedArea'));

    const checkRoomRef = (roomId: string, id: string, type: string) => {
        if (!roomIds.has(roomId)) {
            errors.push(`${type} ${id} references missing room: ${roomId}`);
            return false;
        }
        return true;
    };

    layout.workstations.forEach(w => {
        checkId(w.id, 'Workstation');
        if (checkRoomRef(w.roomId, w.id, 'Workstation')) {
            const room = layout.rooms.find(r => r.id === w.roomId)!;
            if (!pointInBounds(w.position, room.bounds)) {
                errors.push(`Workstation ${w.id} is outside room ${room.id} bounds`);
            }
        }
    });

    layout.spawnPoints.forEach(s => {
        checkId(s.id, 'SpawnPoint');
        if (checkRoomRef(s.roomId, s.id, 'SpawnPoint')) {
            const room = layout.rooms.find(r => r.id === s.roomId)!;
            if (!pointInBounds(s.position, room.bounds)) {
                errors.push(`SpawnPoint ${s.id} is outside room ${room.id} bounds`);
            }
        }
    });

    layout.destinations.forEach(d => {
        checkId(d.id, 'Destination');
        if (checkRoomRef(d.roomId, d.id, 'Destination')) {
            const room = layout.rooms.find(r => r.id === d.roomId)!;
            if (!pointInBounds(d.position, room.bounds)) {
                errors.push(`Destination ${d.id} is outside room ${room.id} bounds`);
            }
        }
    });

    layout.furniture.forEach(f => {
        checkId(f.id, 'Furniture');
        checkRoomRef(f.roomId, f.id, 'Furniture');
    });

    return { isValid: errors.length === 0, errors };
}

export function validateAssetManifest(manifest: AssetManifest): ValidationResult {
    const errors: string[] = [];
    const spriteIds = new Set<string>();

    manifest.entries.forEach(e => {
        if (spriteIds.has(e.id)) {
            errors.push(`Duplicate Sprite ID found: ${e.id}`);
        } else {
            spriteIds.add(e.id);
        }

        if (e.frameWidth <= 0 || e.frameHeight <= 0) {
            errors.push(`Sprite ${e.id} has invalid dimensions (${e.frameWidth}x${e.frameHeight})`);
        }

        e.animations.forEach(anim => {
            if (anim.frameRange[0] < 0 || anim.frameRange[1] < 0) {
                errors.push(`Sprite ${e.id} has invalid animation range for '${anim.name}'`);
            }
        });
    });

    return { isValid: errors.length === 0, errors };
}

export function validateAssignments(
    assignments: readonly WorkspaceAssignment[],
    layout: OfficeLayout,
    manifest: AssetManifest
): ValidationResult {
    const errors: string[] = [];
    const agentIds = new Set<string>();

    const workstationIds = new Set(layout.workstations.map(w => w.id));
    const spawnIds = new Set(layout.spawnPoints.map(s => s.id));
    const destinationIds = new Set(layout.destinations.map(d => d.id));
    const spriteIds = new Set(manifest.entries.map(e => e.id));

    assignments.forEach(a => {
        if (agentIds.has(a.agentId)) {
            errors.push(`Duplicate Assignment for agent: ${a.agentId}`);
        } else {
            agentIds.add(a.agentId);
        }

        if (!workstationIds.has(a.workstationId)) {
            errors.push(`Agent ${a.agentId} references missing workstation: ${a.workstationId}`);
        }

        if (!spawnIds.has(a.spawnPointId)) {
            errors.push(`Agent ${a.agentId} references missing spawn point: ${a.spawnPointId}`);
        }

        if (!destinationIds.has(a.primaryDestinationId)) {
            errors.push(`Agent ${a.agentId} references missing primary destination: ${a.primaryDestinationId}`);
        }

        a.secondaryDestinationIds.forEach(destId => {
            if (!destinationIds.has(destId)) {
                errors.push(`Agent ${a.agentId} references missing secondary destination: ${destId}`);
            }
        });

        if (!spriteIds.has(a.spriteId)) {
            errors.push(`Agent ${a.agentId} references missing sprite: ${a.spriteId}`);
        }
    });

    return { isValid: errors.length === 0, errors };
}
