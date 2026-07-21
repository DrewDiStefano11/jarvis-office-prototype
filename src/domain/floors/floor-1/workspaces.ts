import { agentId, departmentId, roomId, workspaceId, zoneId } from '../../building/ids';
import type { AccessLevel, OccupancyState, Point2D, WorkspaceDefinition, WorkspaceType } from '../../building/types';
import { FLOOR_1_ID } from './metadata';

interface WorkspaceInput {
    readonly slug: string;
    readonly room?: string;
    readonly zone?: string;
    readonly department?: string;
    readonly type: WorkspaceType;
    readonly permanent: boolean;
    readonly shared?: boolean;
    readonly position: Point2D;
    readonly state: OccupancyState;
    readonly agent?: number;
    readonly access?: AccessLevel;
    readonly variant: string;
}

const workspace = (input: WorkspaceInput): WorkspaceDefinition => ({
    id: workspaceId(`floor-1.workspace.${input.slug}`),
    floorId: FLOOR_1_ID,
    roomId: input.room ? roomId(`floor-1.room.${input.room}`) : undefined,
    zoneId: input.zone ? zoneId(`floor-1.zone.${input.zone}`) : undefined,
    departmentId: input.department ? departmentId(`floor-1.department.${input.department}`) : undefined,
    workspaceType: input.type,
    permanentAssignmentAllowed: input.permanent,
    shared: input.shared ?? false,
    position: input.position,
    interactionPosition: { x: input.position.x, y: input.position.y + 16 },
    orientation: 'north',
    footprint: { x: input.position.x - 10, y: input.position.y - 8, width: 20, height: 16 },
    capacity: 1,
    occupancyState: input.state,
    assignedAgentId: input.agent ? agentId(`agent-${String(input.agent).padStart(3, '0')}`) : undefined,
    accessLevel: input.access ?? 'department',
    visualVariant: input.variant,
});

const privateAssignments: readonly WorkspaceInput[] = [
    { slug: 'jarvis-command-office', room: 'jarvis-command-office', department: 'executive-command', type: 'permanent', permanent: true, position: { x: 730, y: 320 }, state: 'occupied', agent: 1, access: 'highly-restricted', variant: 'assigned-executive' },
    { slug: 'operations-director-office', room: 'operations-director-office', department: 'executive-command', type: 'permanent', permanent: true, position: { x: 900, y: 320 }, state: 'occupied', agent: 2, access: 'restricted', variant: 'assigned-executive' },
    { slug: 'strategic-planning-office', room: 'strategic-planning-office', department: 'executive-command', type: 'permanent', permanent: true, position: { x: 1080, y: 320 }, state: 'occupied', agent: 3, access: 'restricted', variant: 'assigned-executive' },
    { slug: 'security-approval-office', room: 'security-approval-office', department: 'security-privacy-governance', type: 'permanent', permanent: true, position: { x: 88, y: 270 }, state: 'occupied', agent: 4, access: 'highly-restricted', variant: 'assigned-security' },
    { slug: 'cybersecurity-credentials-office', room: 'cybersecurity-credentials-office', department: 'security-privacy-governance', type: 'permanent', permanent: true, position: { x: 233, y: 270 }, state: 'occupied', agent: 5, access: 'highly-restricted', variant: 'assigned-security' },
    { slug: 'governance-autonomy-office', room: 'governance-autonomy-office', department: 'security-privacy-governance', type: 'permanent', permanent: true, position: { x: 378, y: 270 }, state: 'occupied', agent: 6, access: 'highly-restricted', variant: 'assigned-security' },
    { slug: 'independent-audit-office', room: 'independent-audit-office', department: 'security-privacy-governance', type: 'permanent', permanent: true, position: { x: 523, y: 270 }, state: 'occupied', agent: 7, access: 'highly-restricted', variant: 'assigned-audit' },
    { slug: 'incident-failure-manager-office', room: 'incident-failure-manager-office', department: 'reliability-system-operations', type: 'permanent', permanent: true, position: { x: 1532, y: 360 }, state: 'occupied', agent: 8, access: 'restricted', variant: 'assigned-operations' },
    { slug: 'backup-continuity-manager-office', room: 'backup-continuity-manager-office', department: 'reliability-system-operations', type: 'permanent', permanent: true, position: { x: 1690, y: 360 }, state: 'occupied', agent: 9, access: 'restricted', variant: 'assigned-operations' },
    { slug: 'project-release-manager-office', room: 'project-release-manager-office', department: 'project-product-release', type: 'permanent', permanent: true, position: { x: 690, y: 765 }, state: 'occupied', agent: 20, variant: 'assigned-project' },
    { slug: 'knowledge-search-manager-office', room: 'knowledge-search-manager-office', department: 'data-memory-knowledge', type: 'permanent', permanent: true, position: { x: 1502, y: 525 }, state: 'occupied', agent: 21, variant: 'assigned-knowledge' },
    { slug: 'memory-data-quality-office', room: 'memory-data-quality-office', department: 'data-memory-knowledge', type: 'permanent', permanent: true, position: { x: 1680, y: 525 }, state: 'occupied', agent: 22, variant: 'assigned-knowledge' },
];

const engineeringInputs: readonly WorkspaceInput[] = [
    ['agent-factory', 'agent-platform-models', 12, 90, 525],
    ['model-compute', 'agent-platform-models', 13, 240, 525],
    ['software-development', 'software-platform-engineering', 14, 390, 525],
    ['platform-data', 'software-platform-engineering', 15, 540, 525],
    ['plugin-connector', 'plugins-integrations-automation', 16, 90, 645],
    ['automation-builder', 'plugins-integrations-automation', 17, 240, 645],
    ['github-review', 'software-platform-engineering', 18, 390, 645],
    ['devops-deployment', 'software-platform-engineering', 19, 540, 645],
].map(([slug, department, agent, x, y]) => ({
    slug: `engineering-${slug}`, zone: `engineering-${slug}`, department, type: 'permanent', permanent: true,
    position: { x, y }, state: 'occupied', agent, variant: 'assigned-engineering',
})) as readonly WorkspaceInput[];

const operationsInputs: readonly WorkspaceInput[] = [
    { slug: 'operations-pod-a-01', zone: 'operations-pod-a', department: 'reliability-system-operations', type: 'operational', permanent: true, position: { x: 1235, y: 95 }, state: 'occupied', agent: 10, access: 'restricted', variant: 'assigned-operations-console' },
    { slug: 'operations-pod-a-02', zone: 'operations-pod-a', department: 'reliability-system-operations', type: 'operational', permanent: true, position: { x: 1285, y: 95 }, state: 'occupied', agent: 11, access: 'restricted', variant: 'assigned-operations-console' },
    { slug: 'operations-pod-a-03', zone: 'operations-pod-a', department: 'reliability-system-operations', type: 'operational', permanent: false, shared: true, position: { x: 1235, y: 180 }, state: 'standby', access: 'restricted', variant: 'surge-console' },
    { slug: 'operations-pod-a-04', zone: 'operations-pod-a', department: 'reliability-system-operations', type: 'operational', permanent: false, shared: true, position: { x: 1285, y: 180 }, state: 'standby', access: 'restricted', variant: 'surge-console' },
    { slug: 'operations-pod-b-01-vacant', zone: 'operations-pod-b', department: 'reliability-system-operations', type: 'operational', permanent: true, position: { x: 1365, y: 95 }, state: 'vacant', access: 'restricted', variant: 'vacant-operations-console' },
    { slug: 'operations-pod-b-02', zone: 'operations-pod-b', department: 'reliability-system-operations', type: 'operational', permanent: false, shared: true, position: { x: 1415, y: 95 }, state: 'standby', access: 'restricted', variant: 'surge-console' },
    { slug: 'operations-pod-b-03', zone: 'operations-pod-b', department: 'reliability-system-operations', type: 'operational', permanent: false, shared: true, position: { x: 1365, y: 180 }, state: 'standby', access: 'restricted', variant: 'surge-console' },
    { slug: 'operations-pod-b-04', zone: 'operations-pod-b', department: 'reliability-system-operations', type: 'operational', permanent: false, shared: true, position: { x: 1415, y: 180 }, state: 'standby', access: 'restricted', variant: 'surge-console' },
    { slug: 'operations-pod-c-01-vacant', zone: 'operations-pod-c', department: 'reliability-system-operations', type: 'operational', permanent: true, position: { x: 1495, y: 95 }, state: 'vacant', access: 'restricted', variant: 'vacant-operations-console' },
    { slug: 'operations-pod-c-02', zone: 'operations-pod-c', department: 'reliability-system-operations', type: 'operational', permanent: false, shared: true, position: { x: 1545, y: 95 }, state: 'standby', access: 'restricted', variant: 'surge-console' },
    { slug: 'operations-pod-c-03', zone: 'operations-pod-c', department: 'reliability-system-operations', type: 'operational', permanent: false, shared: true, position: { x: 1495, y: 180 }, state: 'standby', access: 'restricted', variant: 'surge-console' },
    { slug: 'operations-pod-c-04', zone: 'operations-pod-c', department: 'reliability-system-operations', type: 'operational', permanent: false, shared: true, position: { x: 1545, y: 180 }, state: 'standby', access: 'restricted', variant: 'surge-console' },
];

const nexusInputs: readonly WorkspaceInput[] = [
    { slug: 'nexus-console-01', zone: 'central-nexus', type: 'operational', permanent: false, shared: true, position: { x: 790, y: 505 }, state: 'occupied', variant: 'nexus-console' },
    { slug: 'nexus-console-02', zone: 'central-nexus', type: 'operational', permanent: false, shared: true, position: { x: 880, y: 470 }, state: 'occupied', variant: 'nexus-console' },
    { slug: 'nexus-console-03', zone: 'central-nexus', type: 'operational', permanent: false, shared: true, position: { x: 970, y: 505 }, state: 'occupied', variant: 'nexus-console' },
    { slug: 'nexus-console-04', zone: 'central-nexus', type: 'operational', permanent: false, shared: true, position: { x: 880, y: 585 }, state: 'standby', variant: 'nexus-console' },
];

const otherInputs: readonly WorkspaceInput[] = [
    { slug: 'quality-lead', zone: 'quality-lab', department: 'quality-testing-verification', type: 'permanent', permanent: true, position: { x: 1160, y: 760 }, state: 'occupied', agent: 23, variant: 'assigned-quality' },
    { slug: 'quality-evaluation', zone: 'quality-lab', department: 'quality-testing-verification', type: 'permanent', permanent: true, position: { x: 1250, y: 760 }, state: 'occupied', agent: 24, variant: 'assigned-quality' },
    { slug: 'project-vacant-01', zone: 'project-coordination', department: 'project-product-release', type: 'permanent', permanent: true, position: { x: 800, y: 770 }, state: 'vacant', variant: 'vacant-permanent' },
    { slug: 'project-vacant-02', zone: 'project-coordination', department: 'project-product-release', type: 'permanent', permanent: true, position: { x: 845, y: 770 }, state: 'vacant', variant: 'vacant-permanent' },
    ...Array.from({ length: 8 }, (_, index): WorkspaceInput => ({
        slug: `temporary-desk-${String(index + 1).padStart(2, '0')}`, zone: 'temporary-launch', type: 'temporary', permanent: false,
        position: { x: 55 + (index % 4) * 100, y: 855 + Math.floor(index / 4) * 42 }, state: index < 2 ? 'occupied' : 'vacant', access: 'general', variant: 'temporary-amber',
    })),
    ...['new-agent', 'plugin', 'model', 'automation'].map((slug, index): WorkspaceInput => ({
        slug: `sandbox-${slug}`, room: `sandbox-cell-${slug}`, department: 'quality-testing-verification', type: 'sandbox', permanent: false,
        position: { x: 1456 + index * 92, y: 770 }, state: 'occupied', access: 'escorted-containment', variant: `sandbox-${slug}`,
    })),
];

export const floor1Workspaces: readonly WorkspaceDefinition[] = [
    ...privateAssignments,
    ...engineeringInputs,
    ...operationsInputs,
    ...nexusInputs,
    ...otherInputs,
].map(workspace);
