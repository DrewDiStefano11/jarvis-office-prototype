import {
    OfficeLayout,
    AssetManifest,
    WorkspaceAssignment,
    Point,
    Bounds,
    SpriteCategory,
    OfficeValidationCode,
    OfficeValidationIssue,
    OfficeValidationResult
} from './types';
import { PERMANENT_AGENT_IDS } from './assignments';

// Geometric inclusion policy:
// "Inside a room" means the point is >= x and <= x + width, AND >= y and <= y + height (edges included).
function pointInBounds(p: Point, b: Bounds): boolean {
    return p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height;
}

// "Overlaps blocked geometry" means strictly inside the bounds.
// Exactly on the edge is considered outside the block.
function pointInBlocked(p: Point, b: Bounds): boolean {
    return p.x > b.x && p.x < b.x + b.width && p.y > b.y && p.y < b.y + b.height;
}

function isFinitePoint(p: Point): boolean {
    return Number.isFinite(p.x) && Number.isFinite(p.y);
}

function isFiniteBounds(b: Bounds): boolean {
    return Number.isFinite(b.x) && Number.isFinite(b.y) && Number.isFinite(b.width) && Number.isFinite(b.height);
}

function doorwayTouchesRoomBoundary(doorway: Bounds, room: Bounds): boolean {
    // Touching means the doorway edge aligns with a room edge, and overlaps along that edge
    const touchesLeft = doorway.x === room.x + room.width;
    const touchesRight = doorway.x + doorway.width === room.x;
    const touchesTop = doorway.y === room.y + room.height;
    const touchesBottom = doorway.y + doorway.height === room.y;

    // It can also span across the boundary exactly (e.g. half in one room, half in the other)
    const spansLeftEdge = doorway.x <= room.x && doorway.x + doorway.width >= room.x;
    const spansRightEdge = doorway.x <= room.x + room.width && doorway.x + doorway.width >= room.x + room.width;
    const spansTopEdge = doorway.y <= room.y && doorway.y + doorway.height >= room.y;
    const spansBottomEdge = doorway.y <= room.y + room.height && doorway.y + doorway.height >= room.y + room.height;

    const touchesHorizontal = touchesLeft || touchesRight || spansLeftEdge || spansRightEdge;
    const touchesVertical = touchesTop || touchesBottom || spansTopEdge || spansBottomEdge;

    if (!touchesHorizontal && !touchesVertical) return false;

    // Must overlap on the perpendicular axis
    const overlapHorizontal = doorway.x < room.x + room.width && doorway.x + doorway.width > room.x;
    const overlapVertical = doorway.y < room.y + room.height && doorway.y + doorway.height > room.y;

    if (touchesHorizontal && !overlapVertical) return false;
    if (touchesVertical && !overlapHorizontal) return false;

    return true;
}

export function validateLayout(layout: OfficeLayout): OfficeValidationResult {
    const issues: OfficeValidationIssue[] = [];

    const addIssue = (code: OfficeValidationCode, message: string, entityType?: string, entityId?: string) => {
        issues.push({ code, severity: 'error', message, entityType, entityId });
    };

    const idSets = {
        rooms: new Set<string>(),
        furniture: new Set<string>(),
        workstations: new Set<string>(),
        spawnPoints: new Set<string>(),
        destinations: new Set<string>(),
        doorways: new Set<string>(),
        walkableAreas: new Set<string>(),
        blockedAreas: new Set<string>(),
    };

    const checkId = (id: string, type: string, set: Set<string>, emptyCode: OfficeValidationCode, duplicateCode: OfficeValidationCode) => {
        if (!id || id.trim() === '') {
            addIssue(emptyCode, `Empty ID found in ${type}`, type);
            return false;
        }
        if (set.has(id)) {
            addIssue(duplicateCode, `Duplicate ID found: ${id}`, type, id);
            return false;
        }
        set.add(id);
        return true;
    };

    layout.rooms.forEach(r => {
        checkId(r.id, 'Room', idSets.rooms, 'EMPTY_ID', 'DUPLICATE_ROOM_ID');
        if (!isFiniteBounds(r.bounds)) {
            addIssue('NONFINITE_COORDINATE', `Room ${r.id} has non-finite coordinates`, 'Room', r.id);
        } else if (r.bounds.width <= 0 || r.bounds.height <= 0) {
            addIssue('INVALID_DIMENSIONS', `Room ${r.id} has non-positive dimensions`, 'Room', r.id);
        }
    });

    layout.walkableAreas.forEach(w => {
        checkId(w.id, 'WalkableArea', idSets.walkableAreas, 'EMPTY_ID', 'DUPLICATE_WALKABLE_AREA_ID');
        if (!isFiniteBounds(w.bounds)) {
            addIssue('NONFINITE_COORDINATE', `WalkableArea ${w.id} has non-finite coordinates`, 'WalkableArea', w.id);
        } else if (w.bounds.width <= 0 || w.bounds.height <= 0) {
            addIssue('INVALID_DIMENSIONS', `WalkableArea ${w.id} has non-positive dimensions`, 'WalkableArea', w.id);
        }
    });

    layout.blockedAreas.forEach(b => {
        checkId(b.id, 'BlockedArea', idSets.blockedAreas, 'EMPTY_ID', 'DUPLICATE_BLOCKED_AREA_ID');
        if (!isFiniteBounds(b.bounds)) {
            addIssue('NONFINITE_COORDINATE', `BlockedArea ${b.id} has non-finite coordinates`, 'BlockedArea', b.id);
        } else if (b.bounds.width <= 0 || b.bounds.height <= 0) {
            addIssue('INVALID_DIMENSIONS', `BlockedArea ${b.id} has non-positive dimensions`, 'BlockedArea', b.id);
        }
    });

    const checkRoomRef = (roomId: string, entityId: string, type: string) => {
        if (!idSets.rooms.has(roomId)) {
            addIssue('UNKNOWN_ROOM_REFERENCE', `${type} ${entityId} references unknown room: ${roomId}`, type, entityId);
            return false;
        }
        return true;
    };

    const isInsideBlocked = (p: Point) => layout.blockedAreas.some(b => pointInBlocked(p, b.bounds));

    layout.furniture.forEach(f => {
        checkId(f.id, 'Furniture', idSets.furniture, 'EMPTY_ID', 'DUPLICATE_FURNITURE_ID');
        if (!isFinitePoint(f.position)) {
            addIssue('NONFINITE_COORDINATE', `Furniture ${f.id} has non-finite position`, 'Furniture', f.id);
        }

        if (!Number.isFinite(f.size.width)) addIssue('NONFINITE_COORDINATE', `Furniture ${f.id} width is non-finite`, 'Furniture', f.id);
        if (!Number.isFinite(f.size.height)) addIssue('NONFINITE_COORDINATE', `Furniture ${f.id} height is non-finite`, 'Furniture', f.id);

        if (f.size.width <= 0 || f.size.height <= 0) {
            addIssue('INVALID_DIMENSIONS', `Furniture ${f.id} has non-positive dimensions`, 'Furniture', f.id);
        }

        if (!isFiniteBounds(f.blockedArea)) {
            addIssue('NONFINITE_COORDINATE', `Furniture ${f.id} blockedArea is non-finite`, 'Furniture', f.id);
        } else if (f.blockedArea.width <= 0 || f.blockedArea.height <= 0) {
            addIssue('INVALID_DIMENSIONS', `Furniture ${f.id} blockedArea has non-positive dimensions`, 'Furniture', f.id);
        } else {
             // Check blockedArea encapsulates footprint or overlaps footprint
             // Footprint is position to position + size
             if (f.size.width > 0 && f.size.height > 0 && isFinitePoint(f.position)) {
                 const footprint = { x: f.position.x, y: f.position.y, width: f.size.width, height: f.size.height };

                 // blockedArea must overlap the footprint
                 const overlaps = !(
                     f.blockedArea.x + f.blockedArea.width <= footprint.x ||
                     footprint.x + footprint.width <= f.blockedArea.x ||
                     f.blockedArea.y + f.blockedArea.height <= footprint.y ||
                     footprint.y + footprint.height <= f.blockedArea.y
                 );
                 if (!overlaps) {
                     addIssue('BLOCKED_GEOMETRY_CONFLICT', `Furniture ${f.id} blockedArea does not overlap its footprint`, 'Furniture', f.id);
                 }
             }
        }

        if (checkRoomRef(f.roomId, f.id, 'Furniture')) {
            const room = layout.rooms.find(r => r.id === f.roomId)!;
            if (!pointInBounds(f.position, room.bounds)) {
                addIssue('OUTSIDE_ROOM_BOUNDS', `Furniture ${f.id} outside room ${room.id}`, 'Furniture', f.id);
            }
            if (f.blockedArea && isFiniteBounds(f.blockedArea) && f.blockedArea.width > 0 && f.blockedArea.height > 0) {
                // Determine if blocked area is strictly within room bounds
                // Room boundary rules state points exactly on edge are inside. So min x must be >= room.x, max x <= room.x + room.width
                const isContained =
                    f.blockedArea.x >= room.bounds.x &&
                    f.blockedArea.x + f.blockedArea.width <= room.bounds.x + room.bounds.width &&
                    f.blockedArea.y >= room.bounds.y &&
                    f.blockedArea.y + f.blockedArea.height <= room.bounds.y + room.bounds.height;
                if (!isContained) {
                    addIssue('OUTSIDE_ROOM_BOUNDS', `Furniture ${f.id} blockedArea is outside room ${room.id} bounds`, 'Furniture', f.id);
                }
            }
        }
    });

    layout.workstations.forEach(w => {
        checkId(w.id, 'Workstation', idSets.workstations, 'EMPTY_ID', 'DUPLICATE_WORKSTATION_ID');
        if (!isFinitePoint(w.position)) {
            addIssue('NONFINITE_COORDINATE', `Workstation ${w.id} has non-finite position`, 'Workstation', w.id);
        }
        if (checkRoomRef(w.roomId, w.id, 'Workstation')) {
            const room = layout.rooms.find(r => r.id === w.roomId)!;
            if (!pointInBounds(w.position, room.bounds)) {
                addIssue('OUTSIDE_ROOM_BOUNDS', `Workstation ${w.id} outside room ${room.id}`, 'Workstation', w.id);
            }
        }
        if (isInsideBlocked(w.position)) {
            addIssue('BLOCKED_GEOMETRY_CONFLICT', `Workstation ${w.id} occupies a blocked area`, 'Workstation', w.id);
        }
    });

    layout.spawnPoints.forEach(s => {
        checkId(s.id, 'SpawnPoint', idSets.spawnPoints, 'EMPTY_ID', 'DUPLICATE_SPAWN_ID');
        if (!isFinitePoint(s.position)) {
            addIssue('NONFINITE_COORDINATE', `SpawnPoint ${s.id} has non-finite position`, 'SpawnPoint', s.id);
        }
        if (checkRoomRef(s.roomId, s.id, 'SpawnPoint')) {
            const room = layout.rooms.find(r => r.id === s.roomId)!;
            if (!pointInBounds(s.position, room.bounds)) {
                addIssue('OUTSIDE_ROOM_BOUNDS', `SpawnPoint ${s.id} outside room ${room.id}`, 'SpawnPoint', s.id);
            }
        }
        if (isInsideBlocked(s.position)) {
            addIssue('BLOCKED_GEOMETRY_CONFLICT', `SpawnPoint ${s.id} occupies a blocked area`, 'SpawnPoint', s.id);
        }
    });

    layout.destinations.forEach(d => {
        checkId(d.id, 'Destination', idSets.destinations, 'EMPTY_ID', 'DUPLICATE_DESTINATION_ID');
        if (!isFinitePoint(d.position)) {
            addIssue('NONFINITE_COORDINATE', `Destination ${d.id} has non-finite position`, 'Destination', d.id);
        }
        if (checkRoomRef(d.roomId, d.id, 'Destination')) {
            const room = layout.rooms.find(r => r.id === d.roomId)!;
            if (!pointInBounds(d.position, room.bounds)) {
                addIssue('OUTSIDE_ROOM_BOUNDS', `Destination ${d.id} outside room ${room.id}`, 'Destination', d.id);
            }
        }
        if (isInsideBlocked(d.position)) {
             addIssue('BLOCKED_GEOMETRY_CONFLICT', `Destination ${d.id} occupies a blocked area`, 'Destination', d.id);
        }
    });

    layout.doorways.forEach(d => {
        checkId(d.id, 'Doorway', idSets.doorways, 'EMPTY_ID', 'DUPLICATE_DOORWAY_ID');

        let validGeometry = true;
        if (!isFiniteBounds(d.bounds)) {
            addIssue('NONFINITE_COORDINATE', `Doorway ${d.id} has non-finite coordinates`, 'Doorway', d.id);
            validGeometry = false;
        } else if (d.bounds.width <= 0 || d.bounds.height <= 0) {
            addIssue('INVALID_DOORWAY', `Doorway ${d.id} has non-positive dimensions`, 'Doorway', d.id);
            validGeometry = false;
        }

        if (d.connectsRooms[0] === d.connectsRooms[1]) {
            addIssue('INVALID_DOORWAY', `Doorway ${d.id} connects a room to itself`, 'Doorway', d.id);
        }

        let validRooms = true;
        if (!idSets.rooms.has(d.connectsRooms[0]) || !idSets.rooms.has(d.connectsRooms[1])) {
            addIssue('UNKNOWN_ROOM_REFERENCE', `Doorway ${d.id} references missing room`, 'Doorway', d.id);
            validRooms = false;
        }

        if (validGeometry && validRooms && d.connectsRooms[0] !== d.connectsRooms[1]) {
            const room1 = layout.rooms.find(r => r.id === d.connectsRooms[0])!;
            const room2 = layout.rooms.find(r => r.id === d.connectsRooms[1])!;
            const touchesR1 = doorwayTouchesRoomBoundary(d.bounds, room1.bounds);
            const touchesR2 = doorwayTouchesRoomBoundary(d.bounds, room2.bounds);
            if (!touchesR1 || !touchesR2) {
                 addIssue('INVALID_DOORWAY', `Doorway ${d.id} does not physically touch both referenced rooms`, 'Doorway', d.id);
            }
        }
    });

    return { isValid: issues.length === 0, issues };
}

export function validateAssetManifest(manifest: AssetManifest): OfficeValidationResult {
    const issues: OfficeValidationIssue[] = [];
    const spriteIds = new Set<string>();

    const validCategories: SpriteCategory[] = ['agent', 'furniture', 'decoration', 'door', 'indicator', 'effect', 'tile', 'computer', 'chair'];

    const addIssue = (code: OfficeValidationCode, message: string, assetId?: string, path?: string) => {
        issues.push({ code, severity: 'error', message, entityId: assetId, entityType: 'Sprite', path });
    };

    manifest.entries.forEach(e => {
        if (!e.id || e.id.trim() === '') {
            addIssue('EMPTY_ID', `Empty asset ID found`);
            return;
        }

        if (spriteIds.has(e.id)) {
            addIssue('DUPLICATE_ASSET_ID', `Duplicate asset ID found: ${e.id}`, e.id);
        } else {
            spriteIds.add(e.id);
        }

        if (!Number.isFinite(e.frameWidth) || !Number.isFinite(e.frameHeight) || e.frameWidth <= 0 || e.frameHeight <= 0) {
            addIssue('INVALID_ASSET_DIMENSIONS', `Sprite ${e.id} has nonpositive dimensions`, e.id);
        }

        if (!Number.isFinite(e.scale) || e.scale <= 0) {
            addIssue('INVALID_ASSET_SCALE', `Sprite ${e.id} has nonpositive scale`, e.id);
        }

        if (!e.filePath || e.filePath.trim() === '') {
            addIssue('INVALID_ASSET_PATH', `Sprite ${e.id} has empty file path`, e.id);
        } else if (e.filePath.startsWith('public/')) {
            addIssue('INVALID_ASSET_PATH', `Sprite path must not begin with public/: ${e.filePath}`, e.id, e.filePath);
        } else if (e.filePath.startsWith('/') || e.filePath.includes('../') || e.filePath.includes('\\')) {
            addIssue('INVALID_ASSET_PATH', `Sprite path is absolute or traverses dirs: ${e.filePath}`, e.id, e.filePath);
        }

        if (!validCategories.includes(e.category)) {
            addIssue('UNSUPPORTED_ASSET_CATEGORY', `Sprite ${e.id} has unsupported category: ${e.category}`, e.id);
        }

        if (e.isPlaceholder && e.animations.length > 0) {
            addIssue('STATIC_ASSET_HAS_ANIMATION', `Sprite ${e.id} is a static placeholder but declares animations`, e.id);
        }

        const animNames = new Set<string>();
        e.animations.forEach(anim => {
            if (animNames.has(anim.name)) {
                addIssue('DUPLICATE_ANIMATION_ID', `Sprite ${e.id} duplicate animation ${anim.name}`, e.id);
            }
            animNames.add(anim.name);

            if (anim.frameRange[0] < 0 || anim.frameRange[1] < 0) {
                addIssue('INVALID_ANIMATION_RANGE', `Sprite ${e.id} has negative frames`, e.id);
            }
            if (anim.frameRange[0] > anim.frameRange[1]) {
                addIssue('INVALID_ANIMATION_RANGE', `Sprite ${e.id} start frame > end frame`, e.id);
            }
            if (!Number.isFinite(anim.frameRate) || anim.frameRate <= 0) {
                addIssue('INVALID_ANIMATION_FRAME_RATE', `Sprite ${e.id} has nonpositive frameRate`, e.id);
            }
            if (!Number.isFinite(anim.repeat)) {
                addIssue('INVALID_ANIMATION_REPEAT', `Sprite ${e.id} has invalid repeat`, e.id);
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
): OfficeValidationResult {
    const issues: OfficeValidationIssue[] = [];

    const addIssue = (code: OfficeValidationCode, message: string, entityId?: string) => {
        issues.push({ code, severity: 'error', message, entityType: 'Assignment', entityId });
    };

    const agentIds = new Set<string>();
    const workstationIds = new Set(layout.workstations.map(w => w.id));
    const spawnIds = new Set(layout.spawnPoints.map(s => s.id));
    const destinationIds = new Set(layout.destinations.map(d => d.id));
    const spriteIds = new Set(manifest.entries.map(e => e.id));

    const assignedWorkstations = new Set<string>();

    assignments.forEach(a => {
        if (!a.agentId || a.agentId.trim() === '') {
            addIssue('UNKNOWN_AGENT_ID', 'Empty agent ID');
            return;
        }

        if (agentIds.has(a.agentId)) {
            addIssue('DUPLICATE_ASSIGNMENT', `Duplicate Assignment for agent: ${a.agentId}`, a.agentId);
        } else {
            agentIds.add(a.agentId);
        }

        if (!(PERMANENT_AGENT_IDS as readonly string[]).includes(a.agentId)) {
            addIssue('UNKNOWN_AGENT_ID', `Unknown or invalid agent ID: ${a.agentId}`, a.agentId);
        }

        if (!a.workstationId || !workstationIds.has(a.workstationId)) {
            addIssue('UNKNOWN_WORKSPACE_ID', `Agent references unknown workspace: ${a.workstationId}`, a.agentId);
        } else {
            if (assignedWorkstations.has(a.workstationId)) {
                addIssue('WORKSTATION_CONFLICT', `Two agents assigned to workstation: ${a.workstationId}`, a.agentId);
            }
            assignedWorkstations.add(a.workstationId);
        }

        if (!a.spawnPointId || !spawnIds.has(a.spawnPointId)) {
            addIssue('UNKNOWN_SPAWN_ID', `Agent references unknown spawn: ${a.spawnPointId}`, a.agentId);
        }

        if (!a.primaryDestinationId || !destinationIds.has(a.primaryDestinationId)) {
            addIssue('UNKNOWN_DESTINATION_ID', `Agent references unknown primary destination: ${a.primaryDestinationId}`, a.agentId);
        }

        const secDestSet = new Set<string>();
        a.secondaryDestinationIds.forEach(destId => {
            if (destId === a.primaryDestinationId) {
                addIssue('PRIMARY_DESTINATION_REPEATED', `Primary destination repeated in secondaries: ${destId}`, a.agentId);
            }
            if (secDestSet.has(destId)) {
                addIssue('DUPLICATE_SECONDARY_DESTINATION', `Duplicate secondary destination: ${destId}`, a.agentId);
            }
            secDestSet.add(destId);

            if (!destId || !destinationIds.has(destId)) {
                addIssue('UNKNOWN_DESTINATION_ID', `Agent references unknown secondary destination: ${destId}`, a.agentId);
            }
        });

        if (!a.spriteId || !spriteIds.has(a.spriteId)) {
            addIssue('UNKNOWN_SPRITE_ID', `Agent references unknown sprite: ${a.spriteId}`, a.agentId);
        }
    });

    PERMANENT_AGENT_IDS.forEach(id => {
        if (!agentIds.has(id)) {
            addIssue('MISSING_PERMANENT_AGENT_ASSIGNMENT', `Missing assignment for permanent agent: ${id}`, id);
        }
    });

    return { isValid: issues.length === 0, issues };
}
