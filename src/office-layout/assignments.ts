import { WorkspaceAssignment } from './types';

export const PERMANENT_AGENT_IDS = [
    'jarvis',
    'atlas',
    'scout',
    'archive',
    'sentinel',
] as const;

export const workspaceAssignments: readonly WorkspaceAssignment[] = [
    {
        agentId: 'jarvis',
        workstationId: 'jarvis_desk',
        spawnPointId: 'spawn-jarvis',
        primaryDestinationId: 'dest-main-center',
        secondaryDestinationIds: ['dest-meeting-table', 'dest-entrance-lobby'],
        spriteId: 'sprite-agent-jarvis'
    },
    {
        agentId: 'atlas',
        workstationId: 'atlas_desk',
        spawnPointId: 'spawn-atlas',
        primaryDestinationId: 'dest-collab-board',
        secondaryDestinationIds: ['dest-main-center'],
        spriteId: 'sprite-agent-atlas'
    },
    {
        agentId: 'scout',
        workstationId: 'scout_desk',
        spawnPointId: 'spawn-scout',
        primaryDestinationId: 'dest-break-room',
        secondaryDestinationIds: ['dest-main-center'],
        spriteId: 'sprite-agent-scout'
    },
    {
        agentId: 'archive',
        workstationId: 'archive_desk',
        spawnPointId: 'spawn-archive',
        primaryDestinationId: 'dest-meeting-table',
        secondaryDestinationIds: ['dest-collab-board'],
        spriteId: 'sprite-agent-archive'
    },
    {
        agentId: 'sentinel',
        workstationId: 'sentinel_desk',
        spawnPointId: 'spawn-sentinel',
        primaryDestinationId: 'dest-entrance-lobby',
        secondaryDestinationIds: ['dest-main-center'],
        spriteId: 'sprite-agent-sentinel'
    }
];
