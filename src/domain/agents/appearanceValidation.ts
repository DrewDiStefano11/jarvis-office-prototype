import type { Bounds, CharacterAppearanceDefinition, CharacterPose, FloorDefinition, SceneOccupantDefinition } from '../building/types';

const poseValues: readonly CharacterPose[] = [
    'standing-idle', 'standing-conversation', 'standing-briefing', 'standing-presentation', 'standing-security-monitoring',
    'standing-waiting', 'standing-research', 'seated-desk-work', 'seated-console-work', 'seated-meeting', 'seated-waiting',
    'seated-reading', 'sandbox-observation',
];

export const isSeatedPose = (pose: CharacterPose): boolean => pose.startsWith('seated-');

export function validateAppearance(appearance: CharacterAppearanceDefinition, occupant: SceneOccupantDefinition): readonly string[] {
    const errors: string[] = [];
    if (appearance.occupantId !== occupant.id) errors.push('appearance occupant ID does not match');
    if (!Number.isInteger(appearance.stableSeed) || appearance.stableSeed < 0) errors.push('stable seed is invalid');
    if (!poseValues.includes(appearance.pose)) errors.push('pose is invalid');
    if (isSeatedPose(appearance.pose) && appearance.seatType === 'none') errors.push('seated pose requires a seat');
    if (!isSeatedPose(appearance.pose) && appearance.seatType !== 'none') errors.push('standing pose cannot use a seat');
    return errors;
}

export const pointInside = (point: { readonly x: number; readonly y: number }, bounds: Bounds): boolean =>
    point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height;

export function placementErrors(floor: FloorDefinition): readonly string[] {
    const errors: string[] = [];
    const ids = new Set<string>();
    floor.occupants.forEach((occupant) => {
        if (ids.has(occupant.id)) errors.push(`${occupant.id}: duplicate occupant ID`);
        ids.add(occupant.id);
        const space = occupant.roomId
            ? floor.rooms.find((room) => room.id === occupant.roomId)
            : floor.zones.find((zone) => zone.id === occupant.zoneId);
        if (!space) errors.push(`${occupant.id}: assigned space is missing`);
        else if (!pointInside(occupant.position, space.bounds)) errors.push(`${occupant.id}: outside assigned space`);
        const workspace = occupant.workspaceId ? floor.workspaces.find((item) => item.id === occupant.workspaceId) : undefined;
        if (occupant.workspaceId && !workspace) errors.push(`${occupant.id}: assigned workspace is missing`);
        if (occupant.category === 'permanent' && workspace && workspace.assignedAgentId !== occupant.agentId) errors.push(`${occupant.id}: permanent workspace association is invalid`);
        const nearDoor = floor.doors.some((door) => {
            const dx = door.position.x - occupant.position.x;
            const dy = door.position.y - occupant.position.y;
            return dx * dx + dy * dy < 12 * 12;
        });
        if (nearDoor) errors.push(`${occupant.id}: obstructs a doorway clearance`);
        const blockedFurniture = floor.furniture.find((item) =>
            pointInside(occupant.position, item.blockedFootprint)
            && occupant.workspaceId === undefined
            && !isSeatedPose(occupant.appearance.pose)
            && occupant.activity !== 'reception'
            && item.furnitureType !== 'chair',
        );
        if (blockedFurniture) errors.push(`${occupant.id}: intersects ${blockedFurniture.id}`);
        validateAppearance(occupant.appearance, occupant).forEach((error) => errors.push(`${occupant.id}: ${error}`));
    });
    floor.occupants.forEach((occupant, index) => {
        floor.occupants.slice(index + 1).forEach((other) => {
            const dx = other.position.x - occupant.position.x;
            const dy = other.position.y - occupant.position.y;
            if (dx * dx + dy * dy < 12 * 12) errors.push(`${occupant.id}: overlaps ${other.id}`);
        });
    });
    return errors;
}
