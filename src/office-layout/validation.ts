import {
    OfficeLayout,
    AssetManifest,
    WorkspaceAssignment,
    Point,
    Bounds,
    SpriteCategory
} from './types';
import { PERMANENT_AGENT_IDS } from './assignments';

export interface ValidationIssue {
    readonly code: string;
    readonly severity: 'error' | 'warning';
    readonly path?: string;
    readonly assetId?: string;
    readonly message: string;
}

export interface ValidationResult {
    readonly isValid: boolean;
    readonly issues: readonly ValidationIssue[];
}

function pointInBounds(p: Point, b: Bounds, allowOnEdge: boolean = true): boolean {
    if (allowOnEdge) {
        return p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height;
    }
    return p.x > b.x && p.x < b.x + b.width && p.y > b.y && p.y < b.y + b.height;
}

export function validateLayout(layout: OfficeLayout): ValidationResult {
    // Clone inputs to ensure no mutation (if layout was mutated, equality check later would fail)
    const issues: ValidationIssue[] = [];
    const entityIds = new Set<string>();

    const addIssue = (code: string, message: string, path?: string) => {
        issues.push({ code, severity: 'error', message, path });
    };

    const checkId = (id: string, type: string) => {
        if (!id || id.trim() === '') {
            addIssue('EMPTY_ID', `Empty ID found in ${type}`);
            return;
        }
        if (entityIds.has(id)) {
            addIssue('DUPLICATE_ID', `Duplicate ID found: ${id} (${type})`);
        } else {
            entityIds.add(id);
        }
    };

    const roomIds = new Set<string>();

    layout.rooms.forEach(r => {
        checkId(r.id, 'Room');
        roomIds.add(r.id);
        if (r.bounds.width <= 0 || r.bounds.height <= 0 || !Number.isFinite(r.bounds.width) || !Number.isFinite(r.bounds.height) || !Number.isFinite(r.bounds.x) || !Number.isFinite(r.bounds.y)) {
            addIssue('INVALID_DIMENSIONS', `Room ${r.id} has invalid dimensions`);
        }
        if (r.bounds.width === 0 || r.bounds.height === 0) {
             addIssue('INVALID_DIMENSIONS', `Room ${r.id} has empty dimensions`);
        }
    });

    layout.doorways.forEach(d => {
        checkId(d.id, 'Doorway');
        if (d.connectsRooms[0] === d.connectsRooms[1]) {
            addIssue('DOORWAY_SAME_ROOM', `Doorway ${d.id} connects a room to itself`);
        }
        if (!roomIds.has(d.connectsRooms[0]) || !roomIds.has(d.connectsRooms[1])) {
            addIssue('DOORWAY_UNKNOWN_ROOM', `Doorway ${d.id} references missing room`);
        }
    });

    layout.walkableAreas.forEach(w => checkId(w.id, 'WalkableArea'));
    layout.blockedAreas.forEach(b => checkId(b.id, 'BlockedArea'));

    const checkRoomRef = (roomId: string, id: string, type: string) => {
        if (!roomIds.has(roomId)) {
            addIssue(`${type.toUpperCase()}_UNKNOWN_ROOM`, `${type} ${id} references unknown room: ${roomId}`);
            return false;
        }
        return true;
    };

    const isInsideBlocked = (p: Point) => {
        return layout.blockedAreas.some(b => pointInBounds(p, b.bounds, false)); // strict inside
    };

    layout.workstations.forEach(w => {
        checkId(w.id, 'Workstation');
        if (checkRoomRef(w.roomId, w.id, 'Workstation')) {
            const room = layout.rooms.find(r => r.id === w.roomId)!;
            if (!pointInBounds(w.position, room.bounds)) {
                addIssue('WORKSTATION_OUT_OF_BOUNDS', `Workstation ${w.id} is outside room ${room.id}`);
            }
        }
        if (isInsideBlocked(w.position)) {
             addIssue('WORKSTATION_IN_BLOCKED_AREA', `Workstation ${w.id} occupies a blocked area`);
        }
    });

    layout.spawnPoints.forEach(s => {
        checkId(s.id, 'SpawnPoint');
        if (checkRoomRef(s.roomId, s.id, 'SpawnPoint')) {
            const room = layout.rooms.find(r => r.id === s.roomId)!;
            if (!pointInBounds(s.position, room.bounds)) {
                addIssue('SPAWN_OUT_OF_BOUNDS', `SpawnPoint ${s.id} is outside room ${room.id}`);
            }
        }
        if (isInsideBlocked(s.position)) {
             addIssue('SPAWN_IN_BLOCKED_AREA', `SpawnPoint ${s.id} occupies a blocked area`);
        }
    });

    layout.destinations.forEach(d => {
        checkId(d.id, 'Destination');
        if (checkRoomRef(d.roomId, d.id, 'Destination')) {
            const room = layout.rooms.find(r => r.id === d.roomId)!;
            if (!pointInBounds(d.position, room.bounds)) {
                addIssue('DESTINATION_OUT_OF_BOUNDS', `Destination ${d.id} is outside room ${room.id}`);
            }
        }
        if (isInsideBlocked(d.position)) {
             addIssue('DESTINATION_IN_BLOCKED_AREA', `Destination ${d.id} occupies a blocked area`);
        }
    });

    layout.furniture.forEach(f => {
        checkId(f.id, 'Furniture');
        if (checkRoomRef(f.roomId, f.id, 'Furniture')) {
            const room = layout.rooms.find(r => r.id === f.roomId)!;
            if (!pointInBounds(f.position, room.bounds)) {
                addIssue('FURNITURE_OUT_OF_BOUNDS', `Furniture ${f.id} position is outside room ${room.id}`);
            }
        }
    });

    return { isValid: issues.length === 0, issues };
}

export function validateAssetManifest(manifest: AssetManifest): ValidationResult {
    const issues: ValidationIssue[] = [];
    const spriteIds = new Set<string>();

    const validCategories: SpriteCategory[] = ['agent', 'furniture', 'decoration', 'door', 'indicator', 'effect', 'tile', 'computer', 'chair'];
    const seenCategories = new Set<string>();

    const addIssue = (code: string, message: string, assetId?: string) => {
        issues.push({ code, severity: 'error', message, assetId });
    };

    manifest.entries.forEach(e => {
        if (!e.id) {
            addIssue('EMPTY_ID', `Empty ID found`);
            return;
        }

        if (spriteIds.has(e.id)) {
            addIssue('DUPLICATE_ASSET_ID', `Duplicate Sprite ID found: ${e.id}`, e.id);
        } else {
            spriteIds.add(e.id);
        }

        seenCategories.add(e.category);

        if (e.frameWidth <= 0 || e.frameHeight <= 0 || !Number.isFinite(e.frameWidth)) {
            addIssue('INVALID_DIMENSIONS', `Sprite ${e.id} has nonpositive dimensions`, e.id);
        }

        if (!e.filePath || e.filePath.trim() === '') {
            addIssue('EMPTY_FILE_PATH', `Sprite ${e.id} has empty file path`, e.id);
        } else if (e.filePath.startsWith('public/')) {
            addIssue('PATH_CONTAINS_PUBLIC', `Sprite path should not begin with public/: ${e.filePath}`, e.id);
        } else if (e.filePath.startsWith('/') || e.filePath.includes('../')) {
             addIssue('INVALID_PATH', `Sprite path is absolute or traverses dirs: ${e.filePath}`, e.id);
        }

        if (!validCategories.includes(e.category)) {
            addIssue('UNSUPPORTED_CATEGORY', `Sprite ${e.id} has unsupported category: ${e.category}`, e.id);
        }

        if (e.isPlaceholder && e.animations.length > 0) {
            addIssue('STATIC_CLAIMS_ANIMATIONS', `Sprite ${e.id} is a static placeholder but claims animations`, e.id);
        }

        const animNames = new Set<string>();
        e.animations.forEach(anim => {
            if (animNames.has(anim.name)) {
                addIssue('DUPLICATE_ANIMATION_ID', `Sprite ${e.id} duplicate animation ${anim.name}`, e.id);
            }
            animNames.add(anim.name);

            if (anim.frameRange[0] < 0 || anim.frameRange[1] < 0) {
                addIssue('NEGATIVE_FRAMES', `Sprite ${e.id} has negative frames`, e.id);
            }
            if (anim.frameRange[0] > anim.frameRange[1]) {
                addIssue('ANIMATION_START_GT_END', `Sprite ${e.id} start frame > end frame`, e.id);
            }
        });
    });

    if (!spriteIds.has('sprite-chair')) addIssue('MISSING_REQUIRED_ASSET', 'Missing chair');
    if (!spriteIds.has('sprite-computer')) addIssue('MISSING_REQUIRED_ASSET', 'Missing computer');
    if (!spriteIds.has('sprite-wall-tile')) addIssue('MISSING_REQUIRED_ASSET', 'Missing wall tile');

    return { isValid: issues.length === 0, issues };
}

export function validateAssignments(
    assignments: readonly WorkspaceAssignment[],
    layout: OfficeLayout,
    manifest: AssetManifest
): ValidationResult {
    const issues: ValidationIssue[] = [];
    const agentIds = new Set<string>();

    const workstationIds = new Set(layout.workstations.map(w => w.id));
    const spawnIds = new Set(layout.spawnPoints.map(s => s.id));
    const destinationIds = new Set(layout.destinations.map(d => d.id));
    const spriteIds = new Set(manifest.entries.map(e => e.id));

    const addIssue = (code: string, message: string) => {
        issues.push({ code, severity: 'error', message });
    };

    assignments.forEach(a => {
        if (agentIds.has(a.agentId)) {
            addIssue('DUPLICATE_ASSIGNMENT', `Duplicate Assignment for agent: ${a.agentId}`);
        } else {
            agentIds.add(a.agentId);
        }

        if (!(PERMANENT_AGENT_IDS as readonly string[]).includes(a.agentId)) {
            addIssue('UNKNOWN_AGENT_ID', `Unknown or invalid agent ID: ${a.agentId}`);
        }

        if (!workstationIds.has(a.workstationId)) {
            addIssue('UNKNOWN_WORKSPACE', `Agent references missing workstation: ${a.workstationId}`);
        }

        if (!spawnIds.has(a.spawnPointId)) {
            addIssue('UNKNOWN_SPAWN', `Agent references missing spawn point: ${a.spawnPointId}`);
        }

        if (!destinationIds.has(a.primaryDestinationId)) {
            addIssue('UNKNOWN_PRIMARY_DESTINATION', `Agent references missing primary destination: ${a.primaryDestinationId}`);
        }

        const secDestSet = new Set<string>();
        a.secondaryDestinationIds.forEach(destId => {
            if (secDestSet.has(destId)) {
                addIssue('DUPLICATE_SECONDARY_DESTINATION', `Duplicate secondary destination: ${destId}`);
            }
            secDestSet.add(destId);

            if (!destinationIds.has(destId)) {
                addIssue('UNKNOWN_SECONDARY_DESTINATION', `Agent references missing secondary destination: ${destId}`);
            }
        });

        if (!spriteIds.has(a.spriteId)) {
            addIssue('UNKNOWN_SPRITE', `Agent references missing sprite: ${a.spriteId}`);
        }
    });

    PERMANENT_AGENT_IDS.forEach(id => {
        if (!agentIds.has(id)) {
            addIssue('MISSING_ASSIGNMENT', `Missing assignment for permanent agent: ${id}`);
        }
    });

    return { isValid: issues.length === 0, issues };
}
