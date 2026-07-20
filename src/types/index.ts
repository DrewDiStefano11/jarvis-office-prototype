export type Department =
    | 'Executive'
    | 'Research and Knowledge'
    | 'Personal Operations'
    | 'Governance and Security'
    | 'Meeting Room'
    | 'Shared Project Area'
    | 'Audit and Notification'
    | 'Agent Builder Laboratory';

export type AgentStatus = 'idle' | 'moving' | 'working' | 'meeting' | 'reviewing' | 'error' | 'paused';

export interface Agent {
    id: string;
    name: string;
    role: string;
    department: Department;
    managerId: string | null;
    currentStatus: AgentStatus;
    previousStatus: AgentStatus;
    currentTaskId: string | null;
    statusMessage: string;
    progress: number;
    currentLocation: string;
    targetLocation: string | null;
    homeDesk: string;
    spriteKey: string;
    movementSpeed: number;
    queueCount: number;
    currentBlocker: string | null;
    isTemporary: boolean;
    // Visual info for prototyping
    visuals: {
        color: number;
        shape: 'rectangle' | 'circle' | 'triangle' | 'star';
        initial: string;
    };
}

export type LocationType = 'desk' | 'terminal' | 'storage' | 'station' | 'table' | 'delivery' | 'lab';

export interface OfficeLocation {
    id: string;
    displayName: string;
    x: number;
    y: number;
    type: LocationType;
    department: Department;
    canOccupy: boolean;
    approachNodeId?: string; // Links to a waypoint node
}

export interface WaypointNode {
    id: string;
    x: number;
    y: number;
    connections: string[]; // IDs of connected nodes
}

export type TaskStatus = 'queued' | 'active' | 'paused' | 'completed' | 'blocked';
export type TaskPriority = 'low' | 'normal' | 'high';

export interface TaskStep {
    id: string;
    description: string;
    destinationId?: string; // Optional location ID to move the agent to
}

export interface Task {
    id: string;
    title: string;
    description: string;
    assignedAgentId: string;
    status: TaskStatus;
    priority: TaskPriority;
    progress: number; // 0 - 100
    currentStepIndex: number;
    steps: TaskStep[];
    blocker: string | null;
    createdAt: number;
    completedAt: number | null;
}
