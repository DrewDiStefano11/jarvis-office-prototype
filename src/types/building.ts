import { FloorId, DepartmentId, RoomId, WorkspaceId, DestinationId, DoorId } from './ids';

export type AccessLevel = 'general' | 'department' | 'restricted' | 'highly-restricted' | 'escorted-containment';

export interface Point2D {
    x: number;
    y: number;
}

export interface Bounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface Polygon {
    vertices: Point2D[];
}

export type WorkspaceType =
    | 'private-office'
    | 'permanent-desk'
    | 'operational-console'
    | 'surge-console'
    | 'temporary-desk'
    | 'focus-room-position'
    | 'conference-seat'
    | 'sandbox-slot'
    | 'visitor-position'
    | 'standing-briefing-position';

export interface WorkspaceDefinition {
    id: WorkspaceId;
    floorId: FloorId;
    roomId: RoomId;
    departmentId?: DepartmentId;
    workspaceType: WorkspaceType;
    operationalPurpose?: string;
    permanentAssignmentAllowed: boolean;
    sharedOrSurge?: boolean;
    position: Point2D;
    orientation: 'up' | 'down' | 'left' | 'right';
    capacity: number;
    assignable: boolean;
    assignedAgentId?: string; // We'll link to AgentId later
    occupancyState: 'vacant' | 'occupied' | 'offline';
    accessLevel: AccessLevel;
    interactionDestinationId?: DestinationId;
    visualVariant: string;
    metadata?: Record<string, any>;
}

export type RoomType = 'private-office' | 'conference' | 'focus' | 'support' | 'open-area' | 'restricted' | 'sandbox' | 'vestibule' | 'circulation' | 'construction';

export interface RoomDefinition {
    id: RoomId;
    floorId: FloorId;
    departmentId?: DepartmentId;
    name: string;
    roomType: RoomType;
    accessLevel: AccessLevel;
    bounds: Bounds;
    capacity: number;
    occupants: string[];
    specialRestrictions?: string[];
}

export interface DepartmentDefinition {
    id: DepartmentId;
    floorId: FloorId;
    name: string;
    number?: number;
    accessLevel: AccessLevel;
    roomIds: RoomId[];
}

export interface DoorDefinition {
    id: DoorId;
    floorId: FloorId;
    roomId: RoomId;
    accessLevel: AccessLevel;
    position: Point2D;
    width: number;
    orientation: 'horizontal' | 'vertical';
    isLocked: boolean;
    badgeRequired: boolean;
}

export interface FloorDefinition {
    id: FloorId;
    name: string;
    status: 'Operational' | 'Under Construction';
    departments: DepartmentDefinition[];
    rooms: RoomDefinition[];
    workspaces: WorkspaceDefinition[];
    doors: DoorDefinition[];
    routes: any[]; // To be expanded in route phase
    destinations: any[];
    furniture: any[]; // Placeholder for blockable/decor items
}

export interface BuildingDefinition {
    id: string;
    floors: Record<string, FloorDefinition>;
}
