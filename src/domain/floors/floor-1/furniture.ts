import { furnitureId, roomId, zoneId } from '../../building/ids';
import type { AccessLevel, FurnitureDefinition, FurnitureType, Orientation, Point2D, Size2D } from '../../building/types';
import { FLOOR_1_ID } from './metadata';

interface FurnitureInput {
    readonly slug: string;
    readonly room?: string;
    readonly zone?: string;
    readonly type: FurnitureType;
    readonly position: Point2D;
    readonly orientation?: Orientation;
    readonly size?: Size2D;
    readonly access?: AccessLevel;
    readonly variant?: string;
    readonly interactable?: boolean;
}

const defaultSize: Record<FurnitureType, Size2D> = {
    desk: { width: 44, height: 24 }, chair: { width: 18, height: 18 }, monitor: { width: 20, height: 10 },
    'conference-table': { width: 100, height: 42 }, 'operations-console': { width: 44, height: 28 }, 'nexus-console': { width: 48, height: 28 },
    shelf: { width: 36, height: 18 }, plant: { width: 18, height: 18 }, display: { width: 40, height: 10 }, 'security-terminal': { width: 32, height: 22 },
    'checkpoint-gate': { width: 22, height: 36 }, 'glass-barrier': { width: 46, height: 8 }, credenza: { width: 48, height: 18 },
    whiteboard: { width: 44, height: 10 }, cabinet: { width: 30, height: 18 }, 'support-equipment': { width: 30, height: 24 },
};

const furniture = (input: FurnitureInput): FurnitureDefinition => {
    const size = input.size ?? defaultSize[input.type];
    const footprint = { x: input.position.x - size.width / 2, y: input.position.y - size.height / 2, width: size.width, height: size.height };
    return {
        id: furnitureId(`floor-1.furniture.${input.slug}`), floorId: FLOOR_1_ID,
        roomId: input.room ? roomId(`floor-1.room.${input.room}`) : undefined,
        zoneId: input.zone ? zoneId(`floor-1.zone.${input.zone}`) : undefined,
        furnitureType: input.type, position: input.position, orientation: input.orientation ?? 'north', footprint,
        blockedFootprint: { x: footprint.x - 2, y: footprint.y - 2, width: footprint.width + 4, height: footprint.height + 4 },
        blocksMovement: input.type !== 'monitor' && input.type !== 'display' && input.type !== 'whiteboard',
        interactable: input.interactable ?? ['desk', 'operations-console', 'nexus-console', 'security-terminal', 'checkpoint-gate'].includes(input.type),
        accessLevel: input.access ?? 'general', visualVariant: input.variant ?? `${input.type}-warm-pixel`,
    };
};

const officeLayouts = [
    ['jarvis-command-office', 730, 305, 'highly-restricted'], ['operations-director-office', 900, 305, 'restricted'], ['strategic-planning-office', 1080, 305, 'restricted'],
    ['security-approval-office', 88, 255, 'highly-restricted'], ['cybersecurity-credentials-office', 233, 255, 'highly-restricted'], ['governance-autonomy-office', 378, 255, 'highly-restricted'], ['independent-audit-office', 523, 255, 'highly-restricted'],
    ['incident-failure-manager-office', 1532, 345, 'restricted'], ['backup-continuity-manager-office', 1690, 345, 'restricted'],
    ['project-release-manager-office', 690, 750, 'department'], ['knowledge-search-manager-office', 1502, 510, 'department'], ['memory-data-quality-office', 1680, 510, 'department'],
] as const;

const officeFurniture: FurnitureInput[] = officeLayouts.flatMap(([slug, x, y, access]) => [
    { slug: `${slug}-desk`, room: slug, type: 'desk', position: { x, y }, access, variant: slug.includes('security') || slug.includes('audit') ? 'desk-secure-pixel' : 'desk-executive-pixel' },
    { slug: `${slug}-chair`, room: slug, type: 'chair', position: { x, y: y + 28 }, access, variant: 'chair-leather-pixel' },
    { slug: `${slug}-monitor`, room: slug, type: 'monitor', position: { x, y: y - 7 }, access, variant: 'monitor-active-pixel' },
    { slug: `${slug}-storage`, room: slug, type: slug.includes('audit') ? 'cabinet' : 'shelf', position: { x: x + 45, y: y - 18 }, access, variant: 'storage-personal-pixel' },
    { slug: `${slug}-plant`, room: slug, type: 'plant', position: { x: x - 45, y: y - 18 }, access, variant: 'plant-office-pixel' },
]);

interface ConferenceLayout { readonly slug: string; readonly center: Point2D; readonly chairs: number; readonly access: AccessLevel; readonly tableSize: Size2D; }
const conferenceLayouts: readonly ConferenceLayout[] = [
    { slug: 'executive-boardroom', center: { x: 750, y: 125 }, chairs: 20, access: 'restricted', tableSize: { width: 170, height: 54 } },
    { slug: 'strategy-architecture-room', center: { x: 1050, y: 125 }, chairs: 8, access: 'restricted', tableSize: { width: 130, height: 50 } },
    { slug: 'incident-command-room', center: { x: 1322, y: 360 }, chairs: 12, access: 'restricted', tableSize: { width: 130, height: 48 } },
    { slug: 'security-review-room', center: { x: 305, y: 105 }, chairs: 6, access: 'highly-restricted', tableSize: { width: 90, height: 38 } },
    { slug: 'agent-release-review-room', center: { x: 980, y: 762 }, chairs: 6, access: 'restricted', tableSize: { width: 95, height: 38 } },
];

const conferenceFurniture: FurnitureInput[] = conferenceLayouts.flatMap(({ slug, center, chairs, access, tableSize }) => {
    const topCount = Math.ceil(chairs / 2);
    const bottomCount = chairs - topCount;
    const chairInputs = [
        ...Array.from({ length: topCount }, (_, index): FurnitureInput => ({
            slug: `${slug}-chair-north-${index + 1}`, room: slug, type: 'chair', access,
            position: { x: center.x - tableSize.width / 2 + (index + 0.5) * tableSize.width / topCount, y: center.y - tableSize.height / 2 - 22 }, orientation: 'south', variant: 'chair-conference-pixel',
        })),
        ...Array.from({ length: bottomCount }, (_, index): FurnitureInput => ({
            slug: `${slug}-chair-south-${index + 1}`, room: slug, type: 'chair', access,
            position: { x: center.x - tableSize.width / 2 + (index + 0.5) * tableSize.width / Math.max(1, bottomCount), y: center.y + tableSize.height / 2 + 22 }, orientation: 'north', variant: 'chair-conference-pixel',
        })),
    ];
    return [
        { slug: `${slug}-table`, room: slug, type: 'conference-table', position: center, size: tableSize, access, variant: 'table-conference-wood-pixel' },
        ...chairInputs,
        { slug: `${slug}-display`, room: slug, type: 'display', position: { x: center.x, y: slug === 'agent-release-review-room' ? 712 : center.y - tableSize.height / 2 - 40 }, access, variant: `display-${slug}-pixel` },
        { slug: `${slug}-sideboard`, room: slug, type: slug === 'strategy-architecture-room' ? 'whiteboard' : 'credenza', position: { x: center.x + tableSize.width / 2 + 10, y: center.y }, access, variant: 'planning-prop-pixel' },
    ];
});

const operationsPositions = [
    ['operations-pod-a', 1235, 95], ['operations-pod-a', 1285, 95], ['operations-pod-a', 1235, 180], ['operations-pod-a', 1285, 180],
    ['operations-pod-b', 1365, 95], ['operations-pod-b', 1415, 95], ['operations-pod-b', 1365, 180], ['operations-pod-b', 1415, 180],
    ['operations-pod-c', 1495, 95], ['operations-pod-c', 1545, 95], ['operations-pod-c', 1495, 180], ['operations-pod-c', 1545, 180],
] as const;
const operationsFurniture: FurnitureInput[] = operationsPositions.flatMap(([zone, x, y], index) => [
    { slug: `operations-console-${String(index + 1).padStart(2, '0')}`, zone, type: 'operations-console', position: { x, y }, access: 'restricted', variant: index === 4 || index === 8 ? 'console-vacant-blue' : index < 2 ? 'console-assigned-active' : 'console-surge-standby' },
    { slug: `operations-chair-${String(index + 1).padStart(2, '0')}`, zone, type: 'chair', position: { x, y: y + 28 }, access: 'restricted', variant: 'chair-operations-pixel' },
]);

const nexusPositions = [{ x: 790, y: 505 }, { x: 880, y: 470 }, { x: 970, y: 505 }, { x: 880, y: 585 }];
const nexusFurniture: FurnitureInput[] = nexusPositions.flatMap((position, index) => [
    { slug: `nexus-console-${index + 1}`, zone: 'central-nexus', type: 'nexus-console', position, access: 'department', variant: index === 3 ? 'nexus-console-empty' : 'nexus-console-active' },
    { slug: `nexus-chair-${index + 1}`, zone: 'central-nexus', type: 'chair', position: { x: position.x, y: position.y + 26 }, access: 'department', variant: 'chair-nexus-pixel' },
]);

const engineeringLayouts = [
    ['engineering-agent-factory', 90, 510], ['engineering-model-compute', 240, 510], ['engineering-software-development', 390, 510], ['engineering-platform-data', 540, 510],
    ['engineering-plugin-connector', 90, 630], ['engineering-automation-builder', 240, 630], ['engineering-github-review', 390, 630], ['engineering-devops-deployment', 540, 630],
] as const;
const engineeringFurniture: FurnitureInput[] = engineeringLayouts.flatMap(([zone, x, y]) => [
    { slug: `${zone}-desk`, zone, type: 'desk', position: { x, y }, access: 'department', variant: 'desk-engineering-pixel' },
    { slug: `${zone}-chair`, zone, type: 'chair', position: { x, y: y + 26 }, access: 'department', variant: 'chair-engineering-pixel' },
    { slug: `${zone}-monitor`, zone, type: 'monitor', position: { x, y: y - 8 }, access: 'department', variant: `monitor-${zone}-pixel` },
    { slug: `${zone}-prop`, zone, type: zone.includes('github') || zone.includes('devops') ? 'display' : 'support-equipment', position: { x: x + 38, y: y - 20 }, access: 'department', variant: `prop-${zone}-pixel` },
]);

const temporaryFurniture: FurnitureInput[] = Array.from({ length: 8 }, (_, index): FurnitureInput[] => {
    const position = { x: 55 + (index % 4) * 100, y: 845 + Math.floor(index / 4) * 42 };
    return [
        { slug: `temporary-desk-${index + 1}`, zone: 'temporary-launch', type: 'desk', position, variant: 'desk-temporary-pixel' },
        { slug: `temporary-chair-${index + 1}`, zone: 'temporary-launch', type: 'chair', position: { x: position.x, y: position.y + 20 }, variant: 'chair-temporary-pixel' },
        { slug: `temporary-monitor-${index + 1}`, zone: 'temporary-launch', type: 'monitor', position: { x: position.x, y: position.y - 7 }, variant: 'monitor-temporary-idle' },
    ];
}).flat();

const focusFurniture: FurnitureInput[] = Array.from({ length: 4 }, (_, index): FurnitureInput[] => {
    const slug = `focus-room-${index + 1}`;
    const x = 72 + index * 115;
    return [
        { slug: `${slug}-desk`, room: slug, type: 'desk', position: { x, y: 760 }, variant: 'desk-focus-pixel' },
        { slug: `${slug}-guest-chair-1`, room: slug, type: 'chair', position: { x: x - 18, y: 792 }, variant: 'chair-focus-pixel' },
        { slug: `${slug}-guest-chair-2`, room: slug, type: 'chair', position: { x: x + 18, y: 792 }, variant: 'chair-focus-pixel' },
        { slug: `${slug}-storage`, room: slug, type: 'cabinet', position: { x: x + 32, y: 742 }, variant: 'storage-focus-pixel' },
        { slug: `${slug}-display`, room: slug, type: 'display', position: { x, y: 735 }, variant: 'display-focus-pixel' },
    ];
}).flat();

const miscFurniture: FurnitureInput[] = [
    { slug: 'nexus-daily-briefing-wall', zone: 'central-nexus', type: 'display', position: { x: 880, y: 650 }, size: { width: 150, height: 10 }, access: 'department', variant: 'display-daily-briefing-wall' },
    { slug: 'nexus-status-active-tasks', zone: 'central-nexus', type: 'display', position: { x: 690, y: 465 }, access: 'department', variant: 'display-active-tasks' },
    { slug: 'nexus-status-approvals', zone: 'central-nexus', type: 'display', position: { x: 1070, y: 465 }, access: 'department', variant: 'display-pending-approvals' },
    { slug: 'nexus-status-alerts', zone: 'central-nexus', type: 'display', position: { x: 1070, y: 620 }, access: 'department', variant: 'display-active-alerts' },
    { slug: 'approval-review-request', room: 'approval-review-center', type: 'security-terminal', position: { x: 450, y: 90 }, access: 'restricted', variant: 'approval-requester-system-risk' },
    { slug: 'approval-review-recommendation', room: 'approval-review-center', type: 'security-terminal', position: { x: 530, y: 90 }, access: 'restricted', variant: 'approval-security-quality-state' },
    { slug: 'approval-waiting-chair-1', room: 'approval-review-center', type: 'chair', position: { x: 445, y: 145 }, access: 'restricted', variant: 'chair-waiting-pixel' },
    { slug: 'approval-waiting-chair-2', room: 'approval-review-center', type: 'chair', position: { x: 490, y: 145 }, access: 'restricted', variant: 'chair-waiting-pixel' },
    { slug: 'approval-waiting-chair-3', room: 'approval-review-center', type: 'chair', position: { x: 535, y: 145 }, access: 'restricted', variant: 'chair-waiting-pixel' },
    { slug: 'security-vault-terminal', room: 'security-vault', type: 'security-terminal', position: { x: 80, y: 400 }, access: 'highly-restricted', variant: 'terminal-vault-red' },
    { slug: 'security-vault-cabinet-1', room: 'security-vault', type: 'cabinet', position: { x: 150, y: 400 }, access: 'highly-restricted', variant: 'cabinet-credentials-locked' },
    { slug: 'security-vault-cabinet-2', room: 'security-vault', type: 'cabinet', position: { x: 215, y: 400 }, access: 'highly-restricted', variant: 'cabinet-evidence-locked' },
    { slug: 'independent-audit-append-log', room: 'independent-audit-office', type: 'display', position: { x: 505, y: 220 }, access: 'highly-restricted', variant: 'display-append-only-log' },
    { slug: 'boardroom-expansion-map', room: 'executive-boardroom', type: 'display', position: { x: 850, y: 65 }, access: 'restricted', variant: 'display-expansion-map' },
    { slug: 'strategy-floor-plans', room: 'strategy-architecture-room', type: 'whiteboard', position: { x: 960, y: 70 }, access: 'restricted', variant: 'board-floor-plans' },
    { slug: 'strategy-system-hierarchy', room: 'strategy-architecture-room', type: 'whiteboard', position: { x: 1140, y: 70 }, access: 'restricted', variant: 'board-system-hierarchy' },
    { slug: 'incident-timeline', room: 'incident-command-room', type: 'display', position: { x: 1240, y: 300 }, access: 'restricted', variant: 'display-incident-timeline' },
    { slug: 'incident-topology', room: 'incident-command-room', type: 'display', position: { x: 1320, y: 300 }, access: 'restricted', variant: 'display-topology-logs' },
    { slug: 'incident-recovery', room: 'incident-command-room', type: 'display', position: { x: 1400, y: 300 }, access: 'restricted', variant: 'display-recovery-rollback' },
    { slug: 'engineering-collaboration-table', zone: 'engineering-collaboration', type: 'conference-table', position: { x: 315, y: 595 }, size: { width: 100, height: 38 }, access: 'department', variant: 'table-collaboration-pixel' },
    ...Array.from({ length: 6 }, (_, index): FurnitureInput => ({ slug: `engineering-collaboration-chair-${index + 1}`, zone: 'engineering-collaboration', type: 'chair', position: { x: 260 + index * 22, y: index % 2 ? 625 : 565 }, access: 'department', variant: 'chair-collaboration-pixel' })),
    { slug: 'project-vacant-desk-1', zone: 'project-coordination', type: 'desk', position: { x: 800, y: 755 }, access: 'department', variant: 'desk-vacant-blue' },
    { slug: 'project-vacant-desk-2', zone: 'project-coordination', type: 'desk', position: { x: 845, y: 755 }, access: 'department', variant: 'desk-vacant-blue' },
    { slug: 'project-planning-table', zone: 'project-coordination', type: 'conference-table', position: { x: 825, y: 720 }, size: { width: 90, height: 32 }, access: 'department', variant: 'table-project-planning' },
    ...['portfolio', 'roadmap', 'sprint', 'release-calendar', 'dependency-map', 'risk-register', 'acceptance-criteria'].map((name, index): FurnitureInput => ({ slug: `project-${name}`, zone: 'project-coordination', type: index % 2 ? 'whiteboard' : 'display', position: { x: 625 + index * 62, y: 710 }, access: 'department', variant: `project-board-${name}` })),
    { slug: 'knowledge-library-shelf-1', room: 'knowledge-library', type: 'shelf', position: { x: 1195, y: 510 }, variant: 'shelf-books-pixel' },
    { slug: 'knowledge-library-shelf-2', room: 'knowledge-library', type: 'shelf', position: { x: 1250, y: 510 }, variant: 'shelf-books-pixel' },
    { slug: 'knowledge-library-shelf-3', room: 'knowledge-library', type: 'shelf', position: { x: 1305, y: 510 }, variant: 'shelf-books-pixel' },
    { slug: 'knowledge-search-terminal', room: 'knowledge-library', type: 'security-terminal', position: { x: 1335, y: 585 }, variant: 'terminal-search-pixel' },
    { slug: 'decision-archive-cabinet-1', room: 'decision-archive', type: 'cabinet', position: { x: 1480, y: 625 }, access: 'highly-restricted', variant: 'cabinet-archive-locked' },
    { slug: 'decision-archive-cabinet-2', room: 'decision-archive', type: 'cabinet', position: { x: 1540, y: 625 }, access: 'highly-restricted', variant: 'cabinet-archive-locked' },
    { slug: 'decision-archive-retention-display', room: 'decision-archive', type: 'display', position: { x: 1650, y: 610 }, access: 'highly-restricted', variant: 'display-retention-pixel' },
    { slug: 'quality-lead-desk', zone: 'quality-lab', type: 'desk', position: { x: 1160, y: 745 }, access: 'department', variant: 'desk-quality-pixel' },
    { slug: 'quality-evaluation-desk', zone: 'quality-lab', type: 'desk', position: { x: 1250, y: 745 }, access: 'department', variant: 'desk-quality-pixel' },
    { slug: 'quality-defect-display', zone: 'quality-lab', type: 'display', position: { x: 1325, y: 720 }, access: 'department', variant: 'display-defects-pixel' },
    { slug: 'quality-verification-board', zone: 'quality-lab', type: 'whiteboard', position: { x: 1325, y: 790 }, access: 'department', variant: 'board-verification-pixel' },
    { slug: 'reception-desk', zone: 'reception-navigation', type: 'desk', position: { x: 590, y: 885 }, size: { width: 100, height: 28 }, variant: 'desk-reception-pixel' },
    { slug: 'intake-terminal-1', zone: 'intake-stations', type: 'security-terminal', position: { x: 735, y: 885 }, variant: 'terminal-intake-pixel' },
    { slug: 'intake-terminal-2', zone: 'intake-stations', type: 'security-terminal', position: { x: 815, y: 885 }, variant: 'terminal-intake-pixel' },
    ...Array.from({ length: 4 }, (_, index): FurnitureInput => ({ slug: `checkpoint-gate-${index + 1}`, zone: 'secure-checkpoint', type: 'checkpoint-gate', position: { x: 886 + index * 28, y: 885 }, variant: index === 0 || index === 3 ? 'gate-red-pixel' : 'gate-green-pixel' })),
    { slug: 'checkpoint-security-station', zone: 'secure-checkpoint', type: 'security-terminal', position: { x: 980, y: 900 }, variant: 'terminal-checkpoint-pixel' },
    { slug: 'checkpoint-equipment-side-gate', zone: 'secure-checkpoint', type: 'checkpoint-gate', position: { x: 985, y: 870 }, access: 'restricted', variant: 'gate-equipment-locked' },
    { slug: 'checkpoint-full-width-barrier', zone: 'secure-checkpoint', type: 'glass-barrier', position: { x: 935, y: 916 }, size: { width: 116, height: 8 }, variant: 'barrier-full-width-secure' },
    { slug: 'break-room-coffee', room: 'break-room', type: 'support-equipment', position: { x: 55, y: 965 }, variant: 'coffee-station-pixel' },
    { slug: 'break-room-vending', room: 'break-room', type: 'cabinet', position: { x: 125, y: 965 }, variant: 'vending-pixel' },
    { slug: 'break-room-chair-1', room: 'break-room', type: 'chair', position: { x: 75, y: 992 }, variant: 'chair-break-room' },
    { slug: 'break-room-chair-2', room: 'break-room', type: 'chair', position: { x: 110, y: 992 }, variant: 'chair-break-room' },
    { slug: 'restroom-fixture-1', room: 'restrooms', type: 'support-equipment', position: { x: 205, y: 970 }, variant: 'restroom-fixture-pixel' },
    { slug: 'restroom-fixture-2', room: 'restrooms', type: 'support-equipment', position: { x: 245, y: 970 }, variant: 'restroom-sink-pixel' },
    { slug: 'utility-janitorial', room: 'utility-closet', type: 'support-equipment', position: { x: 322, y: 970 }, access: 'restricted', variant: 'janitorial-pixel' },
    { slug: 'it-equipment-rack', room: 'electrical-it-room', type: 'cabinet', position: { x: 422, y: 970 }, access: 'restricted', variant: 'equipment-rack-pixel' },
    { slug: 'west-construction-progress', room: 'future-west-wing', type: 'whiteboard', position: { x: 150, y: 65 }, access: 'restricted', variant: 'construction-progress-board' },
    { slug: 'east-construction-blueprint', room: 'future-east-wing', type: 'whiteboard', position: { x: 1650, y: 65 }, access: 'restricted', variant: 'construction-blueprint-board' },
    { slug: 'sandbox-transfer-glass-1', room: 'sandbox-transfer-corridor', type: 'glass-barrier', position: { x: 1080, y: 870 }, size: { width: 80, height: 8 }, access: 'escorted-containment', variant: 'glass-containment-pixel' },
    { slug: 'sandbox-transfer-glass-2', room: 'sandbox-transfer-corridor', type: 'glass-barrier', position: { x: 1180, y: 895 }, size: { width: 80, height: 8 }, access: 'escorted-containment', variant: 'glass-containment-pixel' },
    { slug: 'containment-assignment-terminal', room: 'containment-vestibule', type: 'security-terminal', position: { x: 1345, y: 820 }, access: 'escorted-containment', variant: 'terminal-containment-pixel' },
    { slug: 'lab-network-isolation', room: 'laboratory-control', type: 'security-terminal', position: { x: 1480, y: 865 }, access: 'restricted', variant: 'terminal-network-isolation' },
    { slug: 'lab-emergency-shutdown', room: 'laboratory-control', type: 'security-terminal', position: { x: 1580, y: 865 }, access: 'highly-restricted', variant: 'terminal-emergency-red' },
    { slug: 'lab-tool-permission', room: 'laboratory-control', type: 'security-terminal', position: { x: 1680, y: 865 }, access: 'restricted', variant: 'terminal-tool-permission' },
    ...['new-agent', 'plugin', 'model', 'automation'].flatMap((slug, index): FurnitureInput[] => [
        { slug: `sandbox-${slug}-equipment`, room: `sandbox-cell-${slug}`, type: 'support-equipment', position: { x: 1456 + index * 92, y: 745 }, access: 'escorted-containment', variant: `sandbox-equipment-${slug}` },
        { slug: `sandbox-${slug}-glass`, room: `sandbox-cell-${slug}`, type: 'glass-barrier', position: { x: 1456 + index * 92, y: 795 }, size: { width: 55, height: 8 }, access: 'escorted-containment', variant: 'glass-observation-pixel' },
    ]),
    ...Array.from({ length: 12 }, (_, index): FurnitureInput => ({ slug: `ambient-plant-${index + 1}`, zone: index < 4 ? 'central-nexus' : index < 8 ? 'project-coordination' : 'knowledge-department', type: 'plant', position: { x: index < 4 ? 680 + index * 130 : index < 8 ? 620 + (index - 4) * 120 : 1180 + (index - 8) * 140, y: index < 4 ? 630 : index < 8 ? 815 : 460 }, variant: 'plant-office-pixel' })),
];

export const floor1Furniture: readonly FurnitureDefinition[] = [
    ...officeFurniture,
    ...conferenceFurniture,
    ...operationsFurniture,
    ...nexusFurniture,
    ...engineeringFurniture,
    ...temporaryFurniture,
    ...focusFurniture,
    ...miscFurniture,
].map(furniture);
