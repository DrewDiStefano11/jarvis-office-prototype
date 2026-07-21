import { AgentId, FloorId, RoomId, WorkspaceId, DestinationId, DepartmentId } from './ids';
import { AccessLevel } from './building';

export type AgentVisualState = 'idle' | 'working' | 'walking' | 'waiting-for-approval' | 'in-meeting' | 'testing-in-sandbox' | 'paused' | 'error-alert';

export interface AgentRosterEntry {
    id: AgentId;
    placeholderName: string;
    placeholderRole: string;
    departmentId?: DepartmentId;
    assignedWorkspaceId?: WorkspaceId;
    homeFloorId: FloorId;
    currentFloorId: FloorId;
    currentRoomId?: RoomId;
    currentDestinationId?: DestinationId;
    accessPermissions: AccessLevel;
    visualState: AgentVisualState;
    placeholderTask?: string;
    spriteVariant: string;
    isPermanent: boolean;
    isActive: boolean;
    metadata?: Record<string, any>;
}
