import { departmentId, roomId, zoneId } from '../../building/ids';
import type { AccessLevel, Bounds, RoomDefinition, RoomType, ZoneDefinition, ZoneType } from '../../building/types';
import { FLOOR_1_ID } from './metadata';

const room = (
    slug: string,
    name: string,
    roomType: RoomType,
    accessLevel: AccessLevel,
    bounds: Bounds,
    capacity: number,
    departmentSlug?: string,
    palette = 'warm-room',
): RoomDefinition => ({
    id: roomId(`floor-1.room.${slug}`), floorId: FLOOR_1_ID,
    departmentId: departmentSlug ? departmentId(`floor-1.department.${departmentSlug}`) : undefined,
    name, roomType, accessLevel, bounds, capacity,
    visual: { label: name, shortLabel: name.replace(' Office', '').replace(' Room', '').replace(' Connection', ''), palette, floorPattern: roomType === 'private-office' || roomType === 'conference' ? 'wood' : 'tile', visualVariant: `room-${slug}`, labelVisibility: 'always' },
});

const zone = (
    slug: string,
    name: string,
    zoneType: ZoneType,
    accessLevel: AccessLevel,
    bounds: Bounds,
    capacity: number,
    departmentSlug?: string,
    palette = 'warm-zone',
): ZoneDefinition => ({
    id: zoneId(`floor-1.zone.${slug}`), floorId: FLOOR_1_ID,
    departmentId: departmentSlug ? departmentId(`floor-1.department.${departmentSlug}`) : undefined,
    name, zoneType, accessLevel, bounds, capacity,
    visual: { label: name, shortLabel: name.replace('Engineering ', '').replace(' Route', ''), palette, floorPattern: zoneType === 'nexus' ? 'metal' : 'wood', visualVariant: `zone-${slug}`, labelVisibility: zoneType === 'corridor' ? 'hidden' : 'always' },
});

export const floor1Rooms: readonly RoomDefinition[] = [
    room('future-west-wing', 'Future West Wing Connection', 'construction', 'restricted', { x: 20, y: 35, width: 180, height: 145 }, 0, undefined, 'construction'),
    room('security-review-room', 'Security Review Room', 'conference', 'highly-restricted', { x: 220, y: 35, width: 170, height: 145 }, 6, 'security-privacy-governance', 'security-red'),
    room('approval-review-center', 'Approval Review Center', 'restricted', 'restricted', { x: 405, y: 35, width: 175, height: 145 }, 8, 'security-privacy-governance', 'security-amber'),
    room('executive-boardroom', 'Executive Boardroom', 'conference', 'restricted', { x: 600, y: 35, width: 300, height: 180 }, 20, 'executive-command', 'executive-gold'),
    room('strategy-architecture-room', 'Strategy and Architecture Room', 'conference', 'restricted', { x: 920, y: 35, width: 260, height: 180 }, 8, 'executive-command', 'executive-gold'),
    room('future-east-wing', 'Future East Wing Connection', 'construction', 'restricted', { x: 1605, y: 35, width: 165, height: 145 }, 0, undefined, 'construction'),

    room('security-approval-office', 'Security and Approval Office', 'private-office', 'highly-restricted', { x: 20, y: 200, width: 135, height: 135 }, 1, 'security-privacy-governance', 'security-red'),
    room('cybersecurity-credentials-office', 'Cybersecurity and Credentials Office', 'private-office', 'highly-restricted', { x: 165, y: 200, width: 135, height: 135 }, 1, 'security-privacy-governance', 'security-red'),
    room('governance-autonomy-office', 'Governance and Autonomy Office', 'private-office', 'highly-restricted', { x: 310, y: 200, width: 135, height: 135 }, 1, 'security-privacy-governance', 'security-red'),
    room('independent-audit-office', 'Independent Audit Office', 'private-office', 'highly-restricted', { x: 455, y: 200, width: 135, height: 135 }, 1, 'security-privacy-governance', 'security-red'),
    room('security-vault', 'Security Vault', 'restricted', 'highly-restricted', { x: 20, y: 350, width: 280, height: 95 }, 3, 'security-privacy-governance', 'security-deep'),
    room('evidence-storage', 'Evidence Storage', 'restricted', 'highly-restricted', { x: 310, y: 350, width: 135, height: 95 }, 2, 'security-privacy-governance', 'security-deep'),
    room('emergency-credentials', 'Emergency Credentials', 'restricted', 'highly-restricted', { x: 455, y: 350, width: 135, height: 95 }, 2, 'security-privacy-governance', 'security-deep'),

    room('jarvis-command-office', 'Jarvis Command Office', 'private-office', 'highly-restricted', { x: 650, y: 255, width: 160, height: 135 }, 1, 'executive-command', 'executive-gold'),
    room('operations-director-office', 'Operations Director Office', 'private-office', 'restricted', { x: 820, y: 255, width: 160, height: 135 }, 1, 'executive-command', 'executive-gold'),
    room('strategic-planning-office', 'Strategic Planning and Architecture Office', 'private-office', 'restricted', { x: 990, y: 255, width: 180, height: 135 }, 1, 'executive-command', 'executive-gold'),
    room('service-elevator-vestibule', 'Restricted Service Elevator Vestibule', 'vestibule', 'highly-restricted', { x: 1060, y: 220, width: 110, height: 30 }, 3, undefined, 'core-restricted'),
    room('incident-command-room', 'Incident Command Room', 'conference', 'restricted', { x: 1200, y: 280, width: 245, height: 165 }, 12, 'reliability-system-operations', 'operations-blue'),
    room('incident-failure-manager-office', 'Incident and Failure Manager Office', 'private-office', 'restricted', { x: 1460, y: 280, width: 145, height: 165 }, 1, 'reliability-system-operations', 'operations-blue'),
    room('backup-continuity-manager-office', 'Backup, Migration, and Continuity Manager Office', 'private-office', 'restricted', { x: 1615, y: 280, width: 155, height: 165 }, 1, 'reliability-system-operations', 'operations-blue'),

    room('knowledge-library', 'Knowledge Library', 'restricted', 'general', { x: 1160, y: 470, width: 250, height: 170 }, 12, 'data-memory-knowledge', 'knowledge-green'),
    room('knowledge-search-manager-office', 'Knowledge and Search Manager Office', 'private-office', 'department', { x: 1420, y: 470, width: 165, height: 105 }, 1, 'data-memory-knowledge', 'knowledge-green'),
    room('memory-data-quality-office', 'Memory, Context, and Data Quality Office', 'private-office', 'department', { x: 1595, y: 470, width: 175, height: 105 }, 1, 'data-memory-knowledge', 'knowledge-green'),
    room('decision-archive', 'Decision Archive', 'restricted', 'highly-restricted', { x: 1420, y: 585, width: 350, height: 90 }, 3, 'data-memory-knowledge', 'archive-dark'),

    room('project-release-manager-office', 'Project, Product, and Release Manager Office', 'private-office', 'department', { x: 600, y: 700, width: 180, height: 125 }, 1, 'project-product-release', 'project-navy'),
    room('agent-release-review-room', 'Agent and Release Review Room', 'conference', 'restricted', { x: 880, y: 700, width: 200, height: 125 }, 6, 'project-product-release', 'project-quality'),

    room('focus-room-1', 'Focus Room 1', 'focus', 'general', { x: 20, y: 725, width: 105, height: 95 }, 3, undefined, 'focus-green'),
    room('focus-room-2', 'Focus Room 2', 'focus', 'general', { x: 135, y: 725, width: 105, height: 95 }, 3, undefined, 'focus-green'),
    room('focus-room-3', 'Focus Room 3 — Modular', 'focus', 'general', { x: 250, y: 725, width: 105, height: 95 }, 3, undefined, 'focus-green'),
    room('focus-room-4', 'Focus Room 4 — Modular', 'focus', 'general', { x: 365, y: 725, width: 105, height: 95 }, 3, undefined, 'focus-green'),
    room('break-room', 'Break Room', 'support', 'general', { x: 20, y: 930, width: 145, height: 80 }, 10, undefined, 'support-warm'),
    room('restrooms', 'Restrooms', 'support', 'general', { x: 175, y: 930, width: 95, height: 80 }, 6, undefined, 'support-neutral'),
    room('utility-closet', 'Utility Closet', 'support', 'restricted', { x: 280, y: 930, width: 85, height: 80 }, 2, undefined, 'support-neutral'),
    room('electrical-it-room', 'Electrical / IT Room', 'support', 'restricted', { x: 375, y: 930, width: 95, height: 80 }, 3, undefined, 'support-neutral'),

    room('sandbox-transfer-corridor', 'Sandbox Transfer Corridor', 'circulation', 'escorted-containment', { x: 1010, y: 850, width: 270, height: 65 }, 6, 'quality-testing-verification', 'containment-purple'),
    room('containment-vestibule', 'Containment Vestibule', 'vestibule', 'escorted-containment', { x: 1285, y: 760, width: 120, height: 155 }, 6, 'quality-testing-verification', 'containment-orange'),
    room('sandbox-cell-new-agent', 'Sandbox Cell 1 — New Agent', 'sandbox-cell', 'escorted-containment', { x: 1415, y: 700, width: 82, height: 115 }, 1, 'quality-testing-verification', 'containment-green'),
    room('sandbox-cell-plugin', 'Sandbox Cell 2 — Plugin', 'sandbox-cell', 'escorted-containment', { x: 1507, y: 700, width: 82, height: 115 }, 1, 'quality-testing-verification', 'containment-cyan'),
    room('sandbox-cell-model', 'Sandbox Cell 3 — Model', 'sandbox-cell', 'escorted-containment', { x: 1599, y: 700, width: 82, height: 115 }, 1, 'quality-testing-verification', 'containment-purple'),
    room('sandbox-cell-automation', 'Sandbox Cell 4 — Automation', 'sandbox-cell', 'escorted-containment', { x: 1691, y: 700, width: 79, height: 115 }, 1, 'quality-testing-verification', 'containment-orange'),
    room('laboratory-control', 'Laboratory Control', 'restricted', 'restricted', { x: 1415, y: 825, width: 355, height: 90 }, 4, 'quality-testing-verification', 'quality-purple'),
];

export const floor1Zones: readonly ZoneDefinition[] = [
    zone('security-outer', 'Security Outer Review', 'open-workspace', 'restricted', { x: 220, y: 185, width: 360, height: 20 }, 6, 'security-privacy-governance', 'security-amber'),
    zone('security-controlled-corridor', 'Security Controlled Corridor', 'corridor', 'highly-restricted', { x: 20, y: 335, width: 570, height: 15 }, 8, 'security-privacy-governance', 'security-red'),
    zone('operations-pod-a', 'Pod A — System Health', 'open-workspace', 'restricted', { x: 1200, y: 35, width: 120, height: 220 }, 4, 'reliability-system-operations', 'operations-blue'),
    zone('operations-pod-b', 'Pod B — Connectivity', 'open-workspace', 'restricted', { x: 1330, y: 35, width: 120, height: 220 }, 4, 'reliability-system-operations', 'operations-blue'),
    zone('operations-pod-c', 'Pod C — Reliability', 'open-workspace', 'restricted', { x: 1460, y: 35, width: 120, height: 220 }, 4, 'reliability-system-operations', 'operations-blue'),
    zone('north-core', 'Elevators and Main Stair', 'corridor', 'general', { x: 650, y: 220, width: 520, height: 30 }, 20, undefined, 'core-neutral'),
    zone('central-nexus', 'Central Nexus', 'nexus', 'department', { x: 630, y: 410, width: 510, height: 260 }, 14, undefined, 'nexus-cyan'),
    zone('engineering-agent-factory', 'Agent Factory', 'open-workspace', 'department', { x: 20, y: 470, width: 140, height: 110 }, 4, 'agent-platform-models', 'engineering-violet'),
    zone('engineering-model-compute', 'Model and Compute', 'open-workspace', 'department', { x: 170, y: 470, width: 140, height: 110 }, 4, 'agent-platform-models', 'engineering-violet'),
    zone('engineering-software-development', 'Software Development', 'open-workspace', 'department', { x: 320, y: 470, width: 140, height: 110 }, 4, 'software-platform-engineering', 'engineering-blue'),
    zone('engineering-platform-data', 'Platform and Data', 'open-workspace', 'department', { x: 470, y: 470, width: 140, height: 110 }, 4, 'software-platform-engineering', 'engineering-blue'),
    zone('engineering-plugin-connector', 'Plugin and Connector', 'open-workspace', 'department', { x: 20, y: 590, width: 140, height: 110 }, 4, 'plugins-integrations-automation', 'engineering-plum'),
    zone('engineering-automation-builder', 'Automation Builder', 'open-workspace', 'department', { x: 170, y: 590, width: 140, height: 110 }, 4, 'plugins-integrations-automation', 'engineering-plum'),
    zone('engineering-github-review', 'GitHub and Code Review', 'open-workspace', 'department', { x: 320, y: 590, width: 140, height: 110 }, 4, 'software-platform-engineering', 'engineering-blue'),
    zone('engineering-devops-deployment', 'DevOps and Deployment', 'open-workspace', 'department', { x: 470, y: 590, width: 140, height: 110 }, 4, 'software-platform-engineering', 'engineering-blue'),
    zone('engineering-collaboration', 'Engineering Collaboration', 'open-workspace', 'department', { x: 225, y: 550, width: 180, height: 90 }, 10, 'software-platform-engineering', 'engineering-warm'),
    zone('project-coordination', 'Project Coordination', 'open-workspace', 'department', { x: 600, y: 690, width: 470, height: 145 }, 16, 'project-product-release', 'project-navy'),
    zone('knowledge-department', 'Data, Memory and Knowledge Center', 'corridor', 'department', { x: 1160, y: 440, width: 610, height: 45 }, 12, 'data-memory-knowledge', 'knowledge-green'),
    zone('quality-lab', 'Quality and Testing', 'open-workspace', 'department', { x: 1100, y: 690, width: 305, height: 150 }, 10, 'quality-testing-verification', 'quality-purple'),
    zone('temporary-launch', 'Temporary Launch', 'open-workspace', 'general', { x: 20, y: 830, width: 450, height: 90 }, 12, undefined, 'temporary-amber'),
    zone('public-vestibule', 'Public Vestibule', 'exterior', 'general', { x: 490, y: 930, width: 570, height: 80 }, 30, undefined, 'reception-warm'),
    zone('reception-navigation', 'Reception and Navigation', 'reception', 'general', { x: 500, y: 850, width: 190, height: 75 }, 12, undefined, 'reception-warm'),
    zone('intake-stations', 'Agent Intake', 'reception', 'general', { x: 700, y: 850, width: 160, height: 75 }, 10, undefined, 'reception-warm'),
    zone('secure-checkpoint', 'Secure Checkpoint', 'checkpoint', 'general', { x: 870, y: 850, width: 130, height: 75 }, 10, undefined, 'checkpoint-green'),
    zone('controlled-internal-lobby', 'Controlled Internal Lobby', 'lobby', 'general', { x: 490, y: 830, width: 570, height: 15 }, 24, undefined, 'lobby-warm'),
    zone('temporary-route', 'Temporary Route', 'corridor', 'general', { x: 470, y: 805, width: 130, height: 20 }, 8, undefined, 'route-yellow'),
    zone('production-route', 'Production Route', 'corridor', 'department', { x: 760, y: 825, width: 25, height: 30 }, 8, undefined, 'route-green'),
    zone('secure-evaluation-route', 'Secure Evaluation Route', 'corridor', 'escorted-containment', { x: 990, y: 825, width: 30, height: 30 }, 8, undefined, 'route-purple'),
];
