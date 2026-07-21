import { WorkspaceDefinition } from '../../../types/building';
import { createWorkspaceId, createFloorId, createRoomId } from '../../../types/ids';

const FLOOR_1_ID = createFloorId('floor-1');
const p = (x: number, y: number) => ({ x, y });

export const floor1Workspaces: WorkspaceDefinition[] = [
    // --- PRIVATE OFFICES (12 Permanent, Occupied) ---
    {
        id: createWorkspaceId('floor-1.workspace.exec.jarvis'), floorId: FLOOR_1_ID, roomId: createRoomId('floor-1.room.jarvis-command'),
        workspaceType: 'private-office', permanentAssignmentAllowed: true, assignable: true, occupancyState: 'occupied',
        capacity: 1, position: p(765, 400), orientation: 'down', accessLevel: 'highly-restricted', visualVariant: 'exec-desk'
    },
    {
        id: createWorkspaceId('floor-1.workspace.exec.operations-dir'), floorId: FLOOR_1_ID, roomId: createRoomId('floor-1.room.operations-director'),
        workspaceType: 'private-office', permanentAssignmentAllowed: true, assignable: true, occupancyState: 'occupied',
        capacity: 1, position: p(895, 400), orientation: 'down', accessLevel: 'highly-restricted', visualVariant: 'exec-desk'
    },
    {
        id: createWorkspaceId('floor-1.workspace.exec.strategic'), floorId: FLOOR_1_ID, roomId: createRoomId('floor-1.room.strategic-planning'),
        workspaceType: 'private-office', permanentAssignmentAllowed: true, assignable: true, occupancyState: 'occupied',
        capacity: 1, position: p(1025, 400), orientation: 'down', accessLevel: 'highly-restricted', visualVariant: 'exec-desk'
    },
    {
        id: createWorkspaceId('floor-1.workspace.sec.approval'), floorId: FLOOR_1_ID, roomId: createRoomId('floor-1.room.security-approval'),
        workspaceType: 'private-office', permanentAssignmentAllowed: true, assignable: true, occupancyState: 'occupied',
        capacity: 1, position: p(175, 150), orientation: 'down', accessLevel: 'highly-restricted', visualVariant: 'sec-desk'
    },
    {
        id: createWorkspaceId('floor-1.workspace.sec.cyber'), floorId: FLOOR_1_ID, roomId: createRoomId('floor-1.room.cybersecurity-credentials'),
        workspaceType: 'private-office', permanentAssignmentAllowed: true, assignable: true, occupancyState: 'occupied',
        capacity: 1, position: p(175, 250), orientation: 'down', accessLevel: 'highly-restricted', visualVariant: 'sec-desk'
    },
    {
        id: createWorkspaceId('floor-1.workspace.sec.gov'), floorId: FLOOR_1_ID, roomId: createRoomId('floor-1.room.governance-autonomy'),
        workspaceType: 'private-office', permanentAssignmentAllowed: true, assignable: true, occupancyState: 'occupied',
        capacity: 1, position: p(325, 150), orientation: 'down', accessLevel: 'highly-restricted', visualVariant: 'sec-desk'
    },
    {
        id: createWorkspaceId('floor-1.workspace.sec.audit'), floorId: FLOOR_1_ID, roomId: createRoomId('floor-1.room.independent-audit'),
        workspaceType: 'private-office', permanentAssignmentAllowed: true, assignable: true, occupancyState: 'occupied',
        capacity: 1, position: p(325, 250), orientation: 'down', accessLevel: 'highly-restricted', visualVariant: 'sec-desk'
    },
    {
        id: createWorkspaceId('floor-1.workspace.ops.incident'), floorId: FLOOR_1_ID, roomId: createRoomId('floor-1.room.incident-failure-manager'),
        workspaceType: 'private-office', permanentAssignmentAllowed: true, assignable: true, occupancyState: 'occupied',
        capacity: 1, position: p(1425, 150), orientation: 'down', accessLevel: 'restricted', visualVariant: 'ops-desk'
    },
    {
        id: createWorkspaceId('floor-1.workspace.ops.backup'), floorId: FLOOR_1_ID, roomId: createRoomId('floor-1.room.backup-migration-manager'),
        workspaceType: 'private-office', permanentAssignmentAllowed: true, assignable: true, occupancyState: 'occupied',
        capacity: 1, position: p(1575, 150), orientation: 'down', accessLevel: 'restricted', visualVariant: 'ops-desk'
    },
    {
        id: createWorkspaceId('floor-1.workspace.proj.manager'), floorId: FLOOR_1_ID, roomId: createRoomId('floor-1.room.project-release-manager'),
        workspaceType: 'private-office', permanentAssignmentAllowed: true, assignable: true, occupancyState: 'occupied',
        capacity: 1, position: p(750, 700), orientation: 'down', accessLevel: 'department', visualVariant: 'proj-desk'
    },
    {
        id: createWorkspaceId('floor-1.workspace.data.knowledge'), floorId: FLOOR_1_ID, roomId: createRoomId('floor-1.room.knowledge-search-manager'),
        workspaceType: 'private-office', permanentAssignmentAllowed: true, assignable: true, occupancyState: 'occupied',
        capacity: 1, position: p(1175, 550), orientation: 'down', accessLevel: 'department', visualVariant: 'data-desk'
    },
    {
        id: createWorkspaceId('floor-1.workspace.data.memory'), floorId: FLOOR_1_ID, roomId: createRoomId('floor-1.room.memory-context-manager'),
        workspaceType: 'private-office', permanentAssignmentAllowed: true, assignable: true, occupancyState: 'occupied',
        capacity: 1, position: p(1325, 550), orientation: 'down', accessLevel: 'department', visualVariant: 'data-desk'
    },

    // --- ENGINEERING BAY (8 Permanent Desks, Occupied) ---
    ...Array.from({ length: 8 }).map((_, i) => ({
        id: createWorkspaceId(`floor-1.workspace.eng.desk-${i + 1}`), floorId: FLOOR_1_ID, roomId: createRoomId('floor-1.room.engineering-bay'),
        workspaceType: 'permanent-desk' as const, permanentAssignmentAllowed: true, assignable: true, occupancyState: 'occupied' as const,
        capacity: 1, position: p(350 + (i * 35), 625), orientation: 'up' as const, accessLevel: 'department' as const, visualVariant: 'eng-desk'
    })),

    // --- QUALITY (2 Permanent Desks, Occupied) ---
    {
        id: createWorkspaceId('floor-1.workspace.quality.lead'), floorId: FLOOR_1_ID, roomId: createRoomId('floor-1.room.quality-testing'),
        workspaceType: 'permanent-desk', permanentAssignmentAllowed: true, assignable: true, occupancyState: 'occupied',
        capacity: 1, position: p(1000, 800), orientation: 'left', accessLevel: 'department', visualVariant: 'qual-desk'
    },
    {
        id: createWorkspaceId('floor-1.workspace.quality.eval'), floorId: FLOOR_1_ID, roomId: createRoomId('floor-1.room.quality-testing'),
        workspaceType: 'permanent-desk', permanentAssignmentAllowed: true, assignable: true, occupancyState: 'occupied',
        capacity: 1, position: p(1050, 800), orientation: 'left', accessLevel: 'department', visualVariant: 'qual-desk'
    },

    // --- OPERATIONS PODS (12 Operational Consoles Total) ---
    // 2 Occupied Permanent
    {
        id: createWorkspaceId('floor-1.workspace.ops.pod-a-1'), floorId: FLOOR_1_ID, roomId: createRoomId('floor-1.room.operations-bay'),
        workspaceType: 'operational-console', permanentAssignmentAllowed: true, assignable: true, occupancyState: 'occupied',
        capacity: 1, position: p(1400, 250), orientation: 'right', accessLevel: 'restricted', visualVariant: 'ops-console'
    },
    {
        id: createWorkspaceId('floor-1.workspace.ops.pod-a-2'), floorId: FLOOR_1_ID, roomId: createRoomId('floor-1.room.operations-bay'),
        workspaceType: 'operational-console', permanentAssignmentAllowed: true, assignable: true, occupancyState: 'occupied',
        capacity: 1, position: p(1400, 300), orientation: 'right', accessLevel: 'restricted', visualVariant: 'ops-console'
    },
    // 2 Vacant Permanent
    {
        id: createWorkspaceId('floor-1.workspace.ops.pod-b-vacant'), floorId: FLOOR_1_ID, roomId: createRoomId('floor-1.room.operations-bay'),
        workspaceType: 'operational-console', permanentAssignmentAllowed: true, assignable: true, occupancyState: 'vacant',
        capacity: 1, position: p(1500, 250), orientation: 'right', accessLevel: 'restricted', visualVariant: 'ops-console-vacant'
    },
    {
        id: createWorkspaceId('floor-1.workspace.ops.pod-c-vacant'), floorId: FLOOR_1_ID, roomId: createRoomId('floor-1.room.operations-bay'),
        workspaceType: 'operational-console', permanentAssignmentAllowed: true, assignable: true, occupancyState: 'vacant',
        capacity: 1, position: p(1600, 250), orientation: 'right', accessLevel: 'restricted', visualVariant: 'ops-console-vacant'
    },
    // 8 Shared Surge Consoles (Not Permanent)
    ...Array.from({ length: 8 }).map((_, i) => ({
        id: createWorkspaceId(`floor-1.workspace.ops.surge-${i + 1}`), floorId: FLOOR_1_ID, roomId: createRoomId('floor-1.room.operations-bay'),
        workspaceType: 'operational-console' as const, permanentAssignmentAllowed: false, assignable: false, occupancyState: 'offline' as const,
        sharedOrSurge: true,
        capacity: 1, position: p(1450 + (i * 20), 380), orientation: 'right' as const, accessLevel: 'restricted' as const, visualVariant: 'ops-console-surge'
    })),

    // --- PROJECT COORDINATION (2 Vacant Permanent Desks) ---
    {
        id: createWorkspaceId('floor-1.workspace.proj.vacant-1'), floorId: FLOOR_1_ID, roomId: createRoomId('floor-1.room.project-release-manager'),
        workspaceType: 'permanent-desk', permanentAssignmentAllowed: true, assignable: true, occupancyState: 'vacant',
        capacity: 1, position: p(800, 700), orientation: 'up', accessLevel: 'department', visualVariant: 'proj-desk-vacant'
    },
    {
        id: createWorkspaceId('floor-1.workspace.proj.vacant-2'), floorId: FLOOR_1_ID, roomId: createRoomId('floor-1.room.project-release-manager'),
        workspaceType: 'permanent-desk', permanentAssignmentAllowed: true, assignable: true, occupancyState: 'vacant',
        capacity: 1, position: p(850, 700), orientation: 'up', accessLevel: 'department', visualVariant: 'proj-desk-vacant'
    },

    // --- CENTRAL NEXUS (4 Shared Consoles) ---
    ...Array.from({ length: 4 }).map((_, i) => ({
        id: createWorkspaceId(`floor-1.workspace.nexus.console-${i + 1}`), floorId: FLOOR_1_ID, roomId: createRoomId('floor-1.room.central-nexus'),
        workspaceType: 'operational-console' as const, permanentAssignmentAllowed: false, assignable: false, occupancyState: 'offline' as const,
        sharedOrSurge: true,
        capacity: 1, position: p(780 + (i * 60), 550), orientation: 'up' as const, accessLevel: 'department' as const, visualVariant: 'nexus-console'
    })),

    // --- TEMPORARY LAUNCH BAY (8 Temporary Desks) ---
    ...Array.from({ length: 8 }).map((_, i) => ({
        id: createWorkspaceId(`floor-1.workspace.temp.desk-${i + 1}`), floorId: FLOOR_1_ID, roomId: createRoomId('floor-1.room.temporary-launch-bay'),
        workspaceType: 'temporary-desk' as const, permanentAssignmentAllowed: false, assignable: true, occupancyState: 'occupied' as const,
        capacity: 1, position: p(350 + (i * 30), 800), orientation: 'down' as const, accessLevel: 'general' as const, visualVariant: 'temp-desk'
    })),

    // --- SANDBOX CELLS (4 Slots) ---
    ...Array.from({ length: 4 }).map((_, i) => ({
        id: createWorkspaceId(`floor-1.workspace.sandbox.slot-${i + 1}`), floorId: FLOOR_1_ID, roomId: createRoomId(`floor-1.room.sandbox-cell-${i + 1}`),
        workspaceType: 'sandbox-slot' as const, permanentAssignmentAllowed: false, assignable: true, occupancyState: 'occupied' as const,
        capacity: 1, position: p(1181 + (i * 62), 900), orientation: 'down' as const, accessLevel: 'escorted-containment' as const, visualVariant: 'sandbox-slot'
    })),
];
