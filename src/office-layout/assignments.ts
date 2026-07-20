import { WorkspaceAssignment } from './types';

// The stable IDs matching the exact runtime permanent agents in the domain
export const AGENT_JARVIS_ID = 'jarvis';
export const AGENT_ATLAS_ID = 'atlas';
export const AGENT_SCOUT_ID = 'scout';
export const AGENT_ARCHIVE_ID = 'archive';
export const AGENT_SENTINEL_ID = 'sentinel';

export const PERMANENT_AGENT_IDS = [
    AGENT_JARVIS_ID,
    AGENT_ATLAS_ID,
    AGENT_SCOUT_ID,
    AGENT_ARCHIVE_ID,
    AGENT_SENTINEL_ID
] as const;

export const workspaceAssignments: readonly WorkspaceAssignment[] = [
    {
        agentId: AGENT_JARVIS_ID,
        workstationId: 'jarvis_desk',
        spawnPointId: 'spawn-jarvis',
        primaryDestinationId: 'dest-main-center',
        secondaryDestinationIds: ['dest-meeting-table', 'dest-entrance-lobby'],
        spriteId: 'sprite-agent-jarvis'
    },
    {
        agentId: AGENT_ATLAS_ID,
        workstationId: 'atlas_desk',
        spawnPointId: 'spawn-atlas',
        primaryDestinationId: 'dest-collab-board',
        secondaryDestinationIds: ['dest-main-center'],
        spriteId: 'sprite-agent-atlas'
    },
    {
        agentId: AGENT_SCOUT_ID,
        workstationId: 'scout_desk',
        spawnPointId: 'spawn-scout',
        primaryDestinationId: 'dest-break-room',
        secondaryDestinationIds: ['dest-main-center'],
        spriteId: 'sprite-agent-scout'
    },
    {
        agentId: AGENT_ARCHIVE_ID,
        workstationId: 'archive_desk',
        spawnPointId: 'spawn-archive',
        primaryDestinationId: 'dest-meeting-table',
        secondaryDestinationIds: ['dest-collab-board'],
        spriteId: 'sprite-agent-archive'
    },
    {
        agentId: AGENT_SENTINEL_ID,
        workstationId: 'sentinel_desk',
        spawnPointId: 'spawn-sentinel',
        primaryDestinationId: 'dest-entrance-lobby',
        secondaryDestinationIds: ['dest-main-center'],
        spriteId: 'sprite-agent-sentinel'
    }
];
