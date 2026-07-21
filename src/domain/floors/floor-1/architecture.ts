import { architecturalObjectId, roomId, zoneId } from '../../building/ids';
import type { AccessLevel, ArchitecturalObjectDefinition, ArchitecturalObjectType, Point2D, Size2D } from '../../building/types';
import { FLOOR_1_ID } from './metadata';

interface ArchitectureInput {
    readonly slug: string;
    readonly room?: string;
    readonly zone?: string;
    readonly type: ArchitecturalObjectType;
    readonly position: Point2D;
    readonly size: Size2D;
    readonly access?: AccessLevel;
    readonly variant?: string;
}

const object = (input: ArchitectureInput): ArchitecturalObjectDefinition => ({
    id: architecturalObjectId(`floor-1.architecture.${input.slug}`), floorId: FLOOR_1_ID,
    roomId: input.room ? roomId(`floor-1.room.${input.room}`) : undefined,
    zoneId: input.zone ? zoneId(`floor-1.zone.${input.zone}`) : undefined,
    architecturalType: input.type, position: input.position, orientation: 'north',
    footprint: { x: input.position.x - input.size.width / 2, y: input.position.y - input.size.height / 2, ...input.size },
    accessLevel: input.access ?? 'general', visualVariant: input.variant ?? `${input.type}-pixel`,
});

const inputs: readonly ArchitectureInput[] = [
    { slug: 'passenger-elevator-a', zone: 'north-core', type: 'elevator', position: { x: 820, y: 235 }, size: { width: 54, height: 24 }, variant: 'elevator-passenger-blue' },
    { slug: 'passenger-elevator-b', zone: 'north-core', type: 'elevator', position: { x: 885, y: 235 }, size: { width: 54, height: 24 }, variant: 'elevator-passenger-blue' },
    { slug: 'main-stair', zone: 'north-core', type: 'stairs', position: { x: 720, y: 235 }, size: { width: 70, height: 24 }, variant: 'stairs-main-pixel' },
    { slug: 'service-elevator', room: 'service-elevator-vestibule', type: 'service-elevator', position: { x: 1105, y: 235 }, size: { width: 46, height: 20 }, access: 'highly-restricted', variant: 'service-elevator-red' },
    { slug: 'service-elevator-reader', room: 'service-elevator-vestibule', type: 'badge-reader', position: { x: 1077, y: 235 }, size: { width: 14, height: 14 }, access: 'highly-restricted', variant: 'reader-red' },
    { slug: 'service-elevator-camera', room: 'service-elevator-vestibule', type: 'camera', position: { x: 1145, y: 232 }, size: { width: 16, height: 14 }, access: 'highly-restricted', variant: 'camera-audit' },
    { slug: 'remote-emergency-stair', zone: 'temporary-launch', type: 'emergency-exit', position: { x: 445, y: 880 }, size: { width: 38, height: 54 }, variant: 'stairs-emergency-green' },
    { slug: 'west-expansion-seal', room: 'future-west-wing', type: 'expansion-seal', position: { x: 110, y: 110 }, size: { width: 120, height: 60 }, access: 'restricted', variant: 'expansion-seal-west' },
    { slug: 'east-expansion-seal', room: 'future-east-wing', type: 'expansion-seal', position: { x: 1685, y: 110 }, size: { width: 105, height: 60 }, access: 'restricted', variant: 'expansion-seal-east' },
    { slug: 'west-construction-material', room: 'future-west-wing', type: 'construction-material', position: { x: 70, y: 155 }, size: { width: 45, height: 25 }, access: 'restricted' },
    { slug: 'east-construction-material', room: 'future-east-wing', type: 'construction-material', position: { x: 1645, y: 155 }, size: { width: 45, height: 25 }, access: 'restricted' },
    { slug: 'jarvis-nexus-hologram', zone: 'central-nexus', type: 'hologram', position: { x: 880, y: 535 }, size: { width: 72, height: 72 }, access: 'department', variant: 'jarvis-hologram-cyan' },
    { slug: 'boardroom-clock', room: 'executive-boardroom', type: 'clock', position: { x: 630, y: 70 }, size: { width: 24, height: 24 }, access: 'restricted' },
    { slug: 'security-review-camera', room: 'security-review-room', type: 'camera', position: { x: 365, y: 60 }, size: { width: 18, height: 16 }, access: 'highly-restricted' },
    { slug: 'independent-audit-camera', room: 'independent-audit-office', type: 'camera', position: { x: 570, y: 220 }, size: { width: 18, height: 16 }, access: 'highly-restricted' },
    { slug: 'decision-archive-reader', room: 'decision-archive', type: 'badge-reader', position: { x: 1440, y: 635 }, size: { width: 16, height: 16 }, access: 'highly-restricted', variant: 'reader-red' },
    { slug: 'transfer-camera-intake', room: 'sandbox-transfer-corridor', type: 'camera', position: { x: 1040, y: 870 }, size: { width: 18, height: 16 }, access: 'escorted-containment' },
    { slug: 'transfer-camera-containment', room: 'sandbox-transfer-corridor', type: 'camera', position: { x: 1240, y: 890 }, size: { width: 18, height: 16 }, access: 'escorted-containment' },
    { slug: 'containment-reader', room: 'containment-vestibule', type: 'badge-reader', position: { x: 1320, y: 780 }, size: { width: 16, height: 16 }, access: 'escorted-containment', variant: 'reader-purple' },
    ...['new-agent', 'plugin', 'model', 'automation'].map((slug, index): ArchitectureInput => ({
        slug: `sandbox-${slug}-camera`, room: `sandbox-cell-${slug}`, type: 'camera', position: { x: 1440 + index * 92, y: 720 }, size: { width: 14, height: 14 }, access: 'escorted-containment', variant: 'camera-containment',
    })),
];

export const floor1ArchitecturalObjects: readonly ArchitecturalObjectDefinition[] = inputs.map(object);
