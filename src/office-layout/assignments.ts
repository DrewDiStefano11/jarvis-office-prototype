import { WorkspaceAssignment } from './types';

// The stable IDs matching the current permanent agents in the domain
export const AGENT_JARVIS_ID = 'agent-jarvis';
export const AGENT_ATLAS_ID = 'agent-atlas';
export const AGENT_SCOUT_ID = 'agent-scout';
export const AGENT_ARCHIVE_ID = 'agent-archive';
export const AGENT_SENTINEL_ID = 'agent-sentinel';

export const workspaceAssignments: readonly WorkspaceAssignment[] = [
    {
        agentId: AGENT_JARVIS_ID,
        workstationId: 'desk-executive-jarvis',
        spawnPointId: 'spawn-jarvis',
        primaryDestinationId: 'dest-main-center',
        secondaryDestinationIds: ['dest-meeting-table', 'dest-entrance-lobby'],
        spriteId: 'sprite-agent-jarvis'
    },
    {
        agentId: AGENT_ATLAS_ID,
        workstationId: 'desk-operations-atlas',
        spawnPointId: 'spawn-atlas',
        primaryDestinationId: 'dest-collab-board',
        secondaryDestinationIds: ['dest-main-center'],
        spriteId: 'sprite-agent-atlas'
    },
    {
        agentId: AGENT_SCOUT_ID,
        workstationId: 'desk-research-scout',
        spawnPointId: 'spawn-scout',
        primaryDestinationId: 'dest-break-room',
        secondaryDestinationIds: ['dest-main-center'],
        spriteId: 'sprite-agent-scout'
    },
    {
        agentId: AGENT_ARCHIVE_ID,
        workstationId: 'desk-records-archive',
        spawnPointId: 'spawn-archive',
        primaryDestinationId: 'dest-meeting-table',
        secondaryDestinationIds: ['dest-collab-board'],
        spriteId: 'sprite-agent-archive'
    },
    {
        agentId: AGENT_SENTINEL_ID,
        workstationId: 'desk-security-sentinel',
        spawnPointId: 'spawn-sentinel',
        primaryDestinationId: 'dest-entrance-lobby',
        secondaryDestinationIds: ['dest-main-center'],
        spriteId: 'sprite-agent-sentinel'
    }
];
