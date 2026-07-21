import { accessThresholdId, doorId, roomId, wallId, zoneId } from '../../building/ids';
import type { SpaceId } from '../../building/ids';
import type { AccessLevel, AccessThresholdDefinition, DoorDefinition, RoomDefinition, WallDefinition } from '../../building/types';
import { FLOOR_1_ID } from './metadata';
import { floor1Rooms } from './spaces';

const roomSlug = (room: RoomDefinition) => room.id.replace('floor-1.room.', '');

export const floor1Walls: readonly WallDefinition[] = floor1Rooms.flatMap((room) => {
    const slug = roomSlug(room);
    const { x, y, width, height } = room.bounds;
    const material = room.roomType === 'sandbox-cell' || room.id.includes('transfer-corridor') ? 'glass' : room.roomType === 'construction' ? 'construction-barrier' : 'solid';
    return [
        { id: wallId(`floor-1.wall.${slug}-north`), floorId: FLOOR_1_ID, from: { x, y }, to: { x: x + width, y }, height: 36, thickness: 6, material, cutaway: false, visualVariant: `${material}-north` },
        { id: wallId(`floor-1.wall.${slug}-west`), floorId: FLOOR_1_ID, from: { x, y }, to: { x, y: y + height }, height: 36, thickness: 6, material, cutaway: false, visualVariant: `${material}-west` },
        { id: wallId(`floor-1.wall.${slug}-east`), floorId: FLOOR_1_ID, from: { x: x + width, y }, to: { x: x + width, y: y + height }, height: 24, thickness: 5, material, cutaway: true, visualVariant: `${material}-east-cutaway` },
        { id: wallId(`floor-1.wall.${slug}-south`), floorId: FLOOR_1_ID, from: { x, y: y + height }, to: { x: x + width, y: y + height }, height: 18, thickness: 5, material, cutaway: true, visualVariant: `${material}-south-cutaway` },
    ] satisfies readonly WallDefinition[];
});

interface DoorPlacement {
    readonly slug: string;
    readonly target: SpaceId;
    readonly access?: AccessLevel;
    readonly side?: 'south' | 'east' | 'west';
    readonly locked?: boolean;
    readonly escort?: boolean;
    readonly suffix?: string;
}

const z = (slug: string) => zoneId(`floor-1.zone.${slug}`);
const r = (slug: string) => roomId(`floor-1.room.${slug}`);

const placements: readonly DoorPlacement[] = [
    { slug: 'future-west-wing', target: z('security-outer'), access: 'restricted', locked: true },
    { slug: 'security-review-room', target: z('security-outer'), access: 'highly-restricted', locked: true },
    { slug: 'approval-review-center', target: z('security-outer'), access: 'restricted', locked: true },
    { slug: 'executive-boardroom', target: z('north-core'), access: 'restricted' },
    { slug: 'executive-boardroom', target: z('central-nexus'), access: 'restricted', side: 'east', suffix: 'east' },
    { slug: 'strategy-architecture-room', target: z('north-core'), access: 'restricted' },
    { slug: 'future-east-wing', target: z('operations-pod-c'), access: 'restricted', locked: true },
    { slug: 'security-approval-office', target: z('security-controlled-corridor'), access: 'highly-restricted', locked: true },
    { slug: 'cybersecurity-credentials-office', target: z('security-controlled-corridor'), access: 'highly-restricted', locked: true },
    { slug: 'governance-autonomy-office', target: z('security-controlled-corridor'), access: 'highly-restricted', locked: true },
    { slug: 'independent-audit-office', target: z('security-controlled-corridor'), access: 'highly-restricted', locked: true },
    { slug: 'security-vault', target: z('security-controlled-corridor'), access: 'highly-restricted', locked: true },
    { slug: 'evidence-storage', target: r('independent-audit-office'), access: 'highly-restricted', locked: true },
    { slug: 'emergency-credentials', target: r('security-vault'), access: 'highly-restricted', locked: true },
    { slug: 'jarvis-command-office', target: z('central-nexus'), access: 'highly-restricted', locked: true },
    { slug: 'operations-director-office', target: z('central-nexus'), access: 'restricted' },
    { slug: 'strategic-planning-office', target: z('central-nexus'), access: 'restricted' },
    { slug: 'service-elevator-vestibule', target: z('north-core'), access: 'highly-restricted', locked: true },
    { slug: 'incident-command-room', target: z('operations-pod-a'), access: 'restricted' },
    { slug: 'incident-failure-manager-office', target: z('operations-pod-b'), access: 'restricted' },
    { slug: 'backup-continuity-manager-office', target: z('operations-pod-c'), access: 'restricted' },
    { slug: 'knowledge-library', target: z('knowledge-department'), access: 'general' },
    { slug: 'knowledge-search-manager-office', target: z('knowledge-department'), access: 'department' },
    { slug: 'memory-data-quality-office', target: z('knowledge-department'), access: 'department' },
    { slug: 'decision-archive', target: z('knowledge-department'), access: 'highly-restricted', locked: true },
    { slug: 'project-release-manager-office', target: z('project-coordination'), access: 'department' },
    { slug: 'agent-release-review-room', target: z('project-coordination'), access: 'department', suffix: 'project' },
    { slug: 'agent-release-review-room', target: z('quality-lab'), access: 'restricted', locked: true, side: 'east', suffix: 'quality' },
    { slug: 'focus-room-1', target: z('temporary-route') },
    { slug: 'focus-room-2', target: z('temporary-route') },
    { slug: 'focus-room-3', target: z('temporary-route') },
    { slug: 'focus-room-4', target: z('temporary-route') },
    { slug: 'break-room', target: z('public-vestibule') },
    { slug: 'restrooms', target: z('public-vestibule') },
    { slug: 'utility-closet', target: z('public-vestibule'), access: 'restricted', locked: true },
    { slug: 'electrical-it-room', target: z('public-vestibule'), access: 'restricted', locked: true },
    { slug: 'sandbox-transfer-corridor', target: z('secure-evaluation-route'), access: 'escorted-containment', locked: true, escort: true, suffix: 'intake' },
    { slug: 'sandbox-transfer-corridor', target: r('containment-vestibule'), access: 'escorted-containment', locked: true, escort: true, side: 'east', suffix: 'containment' },
    { slug: 'containment-vestibule', target: z('quality-lab'), access: 'escorted-containment', locked: true, escort: true, side: 'west', suffix: 'quality-control' },
    { slug: 'sandbox-cell-new-agent', target: r('containment-vestibule'), access: 'escorted-containment', locked: true, escort: true },
    { slug: 'sandbox-cell-plugin', target: r('containment-vestibule'), access: 'escorted-containment', locked: true, escort: true },
    { slug: 'sandbox-cell-model', target: r('containment-vestibule'), access: 'escorted-containment', locked: true, escort: true },
    { slug: 'sandbox-cell-automation', target: r('containment-vestibule'), access: 'escorted-containment', locked: true, escort: true },
    { slug: 'laboratory-control', target: r('containment-vestibule'), access: 'restricted', locked: true },
];

const findRoom = (slug: string) => {
    const value = floor1Rooms.find((room) => room.id === r(slug));
    if (!value) throw new Error(`Missing room for door: ${slug}`);
    return value;
};

export const floor1Doors: readonly DoorDefinition[] = placements.map((placement) => {
    const source = findRoom(placement.slug);
    const side = placement.side ?? 'south';
    const position = side === 'east'
        ? { x: source.bounds.x + source.bounds.width, y: source.bounds.y + source.bounds.height / 2 }
        : side === 'west'
            ? { x: source.bounds.x, y: source.bounds.y + source.bounds.height / 2 }
            : { x: source.bounds.x + source.bounds.width / 2, y: source.bounds.y + source.bounds.height };
    const accessLevel = placement.access ?? source.accessLevel;
    return {
        id: doorId(`floor-1.door.${placement.slug}-entry${placement.suffix ? `-${placement.suffix}` : ''}`),
        floorId: FLOOR_1_ID,
        connectedSpaceIds: [source.id, placement.target],
        position,
        orientation: side,
        width: source.roomType === 'conference' ? 34 : 24,
        accessLevel,
        locked: placement.locked ?? false,
        badgeRequired: accessLevel !== 'general',
        escortRequired: placement.escort ?? false,
        visualVariant: `door-${accessLevel}`,
    };
});

export const floor1AccessThresholds: readonly AccessThresholdDefinition[] = [
    ...floor1Doors.map((door) => ({
        id: accessThresholdId(door.id.replace('floor-1.door.', 'floor-1.access.')),
        floorId: FLOOR_1_ID,
        doorId: door.id,
        position: door.position,
        orientation: door.orientation,
        width: door.width,
        accessLevel: door.accessLevel,
        visualVariant: `threshold-${door.accessLevel}`,
    })),
    ...Array.from({ length: 4 }, (_, index) => ({
        id: accessThresholdId(`floor-1.access.checkpoint-gate-${index + 1}`),
        floorId: FLOOR_1_ID,
        position: { x: 886 + index * 28, y: 885 },
        orientation: 'north' as const,
        width: 22,
        accessLevel: 'general' as const,
        visualVariant: index === 0 || index === 3 ? 'checkpoint-red' : 'checkpoint-green',
        metadata: { identityCheck: true, permissionCheck: true, autonomyCheck: true, workspaceAssignmentCheck: true, auditCheck: true, escortCheck: true },
    })),
];
