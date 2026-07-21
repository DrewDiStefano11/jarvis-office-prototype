import { agentId, occupantId, roomId, workspaceId, zoneId } from '../../building/ids';
import type { OccupantActivity, OccupantCategory, Orientation, Point2D, SceneOccupantDefinition } from '../../building/types';
import { permanentAgents } from '../../agents/permanentAgents';
import { createOccupantAppearance } from '../../agents/appearance';
import { FLOOR_1_ID } from './metadata';

interface OccupantInput {
    readonly slug: string;
    readonly room?: string;
    readonly zone?: string;
    readonly agent?: number;
    readonly workspace?: string;
    readonly category: OccupantCategory;
    readonly activity: OccupantActivity;
    readonly position: Point2D;
    readonly orientation?: Orientation;
    readonly variant: string;
    readonly label?: string;
}

const occupant = (input: OccupantInput): SceneOccupantDefinition => {
    const definition = {
    id: occupantId(`floor-1.occupant.${input.slug}`), floorId: FLOOR_1_ID,
    roomId: input.room ? roomId(`floor-1.room.${input.room}`) : undefined,
    zoneId: input.zone ? zoneId(`floor-1.zone.${input.zone}`) : undefined,
    agentId: input.agent ? agentId(`agent-${String(input.agent).padStart(3, '0')}`) : undefined,
    workspaceId: input.workspace ? workspaceId(`floor-1.workspace.${input.workspace}`) : undefined,
    category: input.category, activity: input.activity, position: input.position,
    orientation: input.orientation ?? 'north', visualVariant: input.variant, label: input.label,
    } as const;
    return { ...definition, appearance: createOccupantAppearance(definition) };
};

const permanentPlacement: readonly OccupantInput[] = [
    { slug: 'agent-001', room: 'jarvis-command-office', agent: 1, workspace: 'jarvis-command-office', category: 'permanent', activity: 'working', position: { x: 730, y: 333 }, orientation: 'south', variant: 'agent-command', label: 'Jarvis' },
    ...Array.from({ length: 6 }, (_, index): OccupantInput => ({ slug: `agent-${String(index + 2).padStart(3, '0')}`, room: 'executive-boardroom', agent: index + 2, category: 'permanent', activity: 'seated-meeting', position: { x: 680 + index * 28, y: index % 2 ? 155 : 95 }, orientation: (['south', 'north', 'east', 'west'] as const)[index % 4], variant: index < 2 ? 'agent-executive' : 'agent-security' })),
    { slug: 'agent-008', room: 'incident-command-room', agent: 8, category: 'permanent', activity: 'seated-meeting', position: { x: 1285, y: 385 }, orientation: 'east', variant: 'agent-operations' },
    { slug: 'agent-009', room: 'incident-command-room', agent: 9, category: 'permanent', activity: 'seated-meeting', position: { x: 1355, y: 385 }, orientation: 'west', variant: 'agent-operations' },
    { slug: 'agent-010', zone: 'operations-pod-a', agent: 10, workspace: 'operations-pod-a-01', category: 'permanent', activity: 'working', position: { x: 1235, y: 120 }, orientation: 'east', variant: 'agent-operations' },
    { slug: 'agent-011', zone: 'operations-pod-a', agent: 11, workspace: 'operations-pod-a-02', category: 'permanent', activity: 'working', position: { x: 1285, y: 120 }, orientation: 'west', variant: 'agent-operations' },
    ...Array.from({ length: 3 }, (_, index): OccupantInput => ({ slug: `agent-${String(index + 12).padStart(3, '0')}`, room: 'strategy-architecture-room', agent: index + 12, category: 'permanent', activity: 'seated-meeting', position: { x: 1005 + index * 45, y: 155 }, orientation: (['east', 'north', 'west'] as const)[index], variant: 'agent-engineer-violet' })),
    ...Array.from({ length: 3 }, (_, index): OccupantInput => ({ slug: `agent-${String(index + 15).padStart(3, '0')}`, zone: 'central-nexus', agent: index + 15, category: 'permanent', activity: 'working', position: [{ x: 790, y: 530 }, { x: 880, y: 495 }, { x: 970, y: 530 }][index], orientation: (['east', 'south', 'west'] as const)[index], variant: 'agent-engineer-blue' })),
    { slug: 'agent-018', zone: 'central-nexus', agent: 18, category: 'permanent', activity: 'briefing', position: { x: 825, y: 600 }, orientation: 'north', variant: 'agent-engineer-blue' },
    { slug: 'agent-019', zone: 'engineering-devops-deployment', agent: 19, workspace: 'engineering-devops-deployment', category: 'permanent', activity: 'working', position: { x: 540, y: 660 }, orientation: 'east', variant: 'agent-engineer-plum' },
    { slug: 'agent-020', room: 'agent-release-review-room', agent: 20, category: 'permanent', activity: 'seated-meeting', position: { x: 950, y: 785 }, orientation: 'east', variant: 'agent-project' },
    { slug: 'agent-021', room: 'knowledge-search-manager-office', agent: 21, workspace: 'knowledge-search-manager-office', category: 'permanent', activity: 'working', position: { x: 1502, y: 538 }, orientation: 'south', variant: 'agent-knowledge' },
    { slug: 'agent-022', room: 'memory-data-quality-office', agent: 22, workspace: 'memory-data-quality-office', category: 'permanent', activity: 'working', position: { x: 1680, y: 538 }, orientation: 'west', variant: 'agent-knowledge' },
    { slug: 'agent-023', room: 'agent-release-review-room', agent: 23, category: 'permanent', activity: 'seated-meeting', position: { x: 1010, y: 785 }, orientation: 'west', variant: 'agent-quality' },
    { slug: 'agent-024', zone: 'quality-lab', agent: 24, workspace: 'quality-evaluation', category: 'permanent', activity: 'working', position: { x: 1250, y: 775 }, orientation: 'north', variant: 'agent-quality' },
];

const transientPlacement: readonly OccupantInput[] = [
    { slug: 'temporary-001', zone: 'temporary-launch', workspace: 'temporary-desk-01', category: 'temporary', activity: 'working', position: { x: 55, y: 875 }, variant: 'agent-temporary-yellow' },
    { slug: 'temporary-002', zone: 'temporary-launch', workspace: 'temporary-desk-02', category: 'temporary', activity: 'working', position: { x: 155, y: 875 }, variant: 'agent-temporary-yellow' },
    { slug: 'temporary-003', room: 'incident-command-room', category: 'temporary', activity: 'seated-meeting', position: { x: 1295, y: 335 }, variant: 'agent-temporary-yellow' },
    { slug: 'temporary-004', room: 'incident-command-room', category: 'temporary', activity: 'seated-meeting', position: { x: 1365, y: 335 }, variant: 'agent-temporary-yellow' },
    { slug: 'temporary-005', zone: 'central-nexus', category: 'temporary', activity: 'briefing', position: { x: 935, y: 610 }, variant: 'agent-temporary-yellow' },
    { slug: 'temporary-006', zone: 'reception-navigation', category: 'temporary', activity: 'reception', position: { x: 620, y: 900 }, variant: 'agent-temporary-yellow' },
    ...['new-agent', 'plugin', 'model', 'automation'].map((slug, index): OccupantInput => ({ slug: `sandbox-${slug}`, room: `sandbox-cell-${slug}`, workspace: `sandbox-${slug}`, category: 'sandbox', activity: 'contained', position: { x: 1456 + index * 92, y: 785 }, orientation: (['south', 'east', 'north', 'west'] as const)[index], variant: `agent-sandbox-${slug}` })),
    { slug: 'visitor-001', room: 'security-review-room', category: 'visitor', activity: 'seated-meeting', position: { x: 280, y: 135 }, variant: 'agent-visitor-green' },
    { slug: 'visitor-002', room: 'security-review-room', category: 'visitor', activity: 'seated-meeting', position: { x: 330, y: 135 }, variant: 'agent-visitor-green' },
    { slug: 'escort-001', room: 'sandbox-transfer-corridor', category: 'escort', activity: 'escorting', position: { x: 1140, y: 885 }, variant: 'agent-escort-red' },
    { slug: 'waiting-001', room: 'approval-review-center', category: 'waiting', activity: 'waiting', position: { x: 490, y: 135 }, variant: 'agent-waiting-neutral' },
];

export const floor1Population: readonly SceneOccupantDefinition[] = [...permanentPlacement, ...transientPlacement].map(occupant);

if (permanentPlacement.length !== permanentAgents.length) {
    throw new Error(`Permanent population mismatch: ${permanentPlacement.length} placements for ${permanentAgents.length} agents`);
}
