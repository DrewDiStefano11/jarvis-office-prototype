import type {
    AccessThresholdId,
    AgentId,
    ArchitecturalObjectId,
    BuildingId,
    DepartmentId,
    DoorId,
    FloorId,
    FurnitureId,
    OccupantId,
    RoomId,
    SpaceId,
    WallId,
    WorkspaceId,
    ZoneId,
} from './ids';

export type AccessLevel = 'general' | 'department' | 'restricted' | 'highly-restricted' | 'escorted-containment';
export type Orientation = 'north' | 'east' | 'south' | 'west';
export type FloorStatus = 'operational' | 'under-construction';
export type PrimitiveValue = string | number | boolean;
export type EntityMetadata = Readonly<Record<string, PrimitiveValue>>;

export interface Point2D {
    readonly x: number;
    readonly y: number;
}

export interface Size2D {
    readonly width: number;
    readonly height: number;
}

export interface Bounds extends Point2D, Size2D {}

export type Footprint = Bounds;

export interface SpaceAssignment {
    readonly roomId?: RoomId;
    readonly zoneId?: ZoneId;
}

export interface VisualMetadata {
    readonly label: string;
    readonly shortLabel?: string;
    readonly palette: string;
    readonly floorPattern?: 'wood' | 'tile' | 'carpet' | 'metal' | 'glass';
    readonly visualVariant: string;
    readonly icon?: string;
    readonly labelVisibility?: 'always' | 'detail' | 'hidden';
}

export interface BuildingDefinition {
    readonly id: BuildingId;
    readonly name: string;
    readonly floors: readonly FloorDefinition[];
}

export interface FloorDefinition {
    readonly id: FloorId;
    readonly buildingId: BuildingId;
    readonly name: string;
    readonly level: number;
    readonly status: FloorStatus;
    readonly world: Size2D;
    readonly visual: VisualMetadata;
    readonly departments: readonly DepartmentDefinition[];
    readonly rooms: readonly RoomDefinition[];
    readonly zones: readonly ZoneDefinition[];
    readonly walls: readonly WallDefinition[];
    readonly doors: readonly DoorDefinition[];
    readonly accessThresholds: readonly AccessThresholdDefinition[];
    readonly furniture: readonly FurnitureDefinition[];
    readonly workspaces: readonly WorkspaceDefinition[];
    readonly architecturalObjects: readonly ArchitecturalObjectDefinition[];
    readonly occupants: readonly SceneOccupantDefinition[];
    readonly permanentAgents: readonly PermanentAgentDefinition[];
}

export interface DepartmentDefinition {
    readonly id: DepartmentId;
    readonly floorId: FloorId;
    readonly number: number;
    readonly name: string;
    readonly accessLevel: AccessLevel;
    readonly visual: VisualMetadata;
    readonly labelPosition: Point2D;
    readonly metadata?: EntityMetadata;
}

export type RoomType =
    | 'private-office'
    | 'conference'
    | 'focus'
    | 'support'
    | 'restricted'
    | 'sandbox-cell'
    | 'vestibule'
    | 'circulation'
    | 'construction';

export interface RoomDefinition {
    readonly id: RoomId;
    readonly floorId: FloorId;
    readonly departmentId?: DepartmentId;
    readonly name: string;
    readonly roomType: RoomType;
    readonly accessLevel: AccessLevel;
    readonly bounds: Bounds;
    readonly capacity: number;
    readonly visual: VisualMetadata;
    readonly metadata?: EntityMetadata;
}

export type ZoneType = 'open-workspace' | 'nexus' | 'reception' | 'checkpoint' | 'lobby' | 'corridor' | 'exterior';

export interface ZoneDefinition {
    readonly id: ZoneId;
    readonly floorId: FloorId;
    readonly departmentId?: DepartmentId;
    readonly name: string;
    readonly zoneType: ZoneType;
    readonly accessLevel: AccessLevel;
    readonly bounds: Bounds;
    readonly capacity: number;
    readonly visual: VisualMetadata;
    readonly metadata?: EntityMetadata;
}

export interface WallDefinition {
    readonly id: WallId;
    readonly floorId: FloorId;
    readonly from: Point2D;
    readonly to: Point2D;
    readonly height: number;
    readonly thickness: number;
    readonly material: 'solid' | 'glass' | 'construction-barrier';
    readonly cutaway: boolean;
    readonly visualVariant: string;
}

export interface DoorDefinition {
    readonly id: DoorId;
    readonly floorId: FloorId;
    readonly connectedSpaceIds: readonly [SpaceId, SpaceId];
    readonly position: Point2D;
    readonly orientation: Orientation;
    readonly width: number;
    readonly accessLevel: AccessLevel;
    readonly locked: boolean;
    readonly badgeRequired: boolean;
    readonly escortRequired: boolean;
    readonly visualVariant: string;
}

export interface AccessThresholdDefinition {
    readonly id: AccessThresholdId;
    readonly floorId: FloorId;
    readonly doorId?: DoorId;
    readonly position: Point2D;
    readonly orientation: Orientation;
    readonly width: number;
    readonly accessLevel: AccessLevel;
    readonly visualVariant: string;
    readonly metadata?: EntityMetadata;
}

export type FurnitureType =
    | 'desk'
    | 'chair'
    | 'monitor'
    | 'conference-table'
    | 'operations-console'
    | 'nexus-console'
    | 'shelf'
    | 'plant'
    | 'display'
    | 'security-terminal'
    | 'checkpoint-gate'
    | 'glass-barrier'
    | 'credenza'
    | 'whiteboard'
    | 'cabinet'
    | 'support-equipment';

export interface FurnitureDefinition extends SpaceAssignment {
    readonly id: FurnitureId;
    readonly floorId: FloorId;
    readonly furnitureType: FurnitureType;
    readonly position: Point2D;
    readonly orientation: Orientation;
    readonly footprint: Footprint;
    readonly blockedFootprint: Footprint;
    readonly blocksMovement: boolean;
    readonly interactable: boolean;
    readonly accessLevel: AccessLevel;
    readonly visualVariant: string;
    readonly metadata?: EntityMetadata;
}

export type WorkspaceType = 'permanent' | 'operational' | 'shared-surge' | 'temporary' | 'sandbox';
export type OccupancyState = 'occupied' | 'vacant' | 'standby';

export interface WorkspaceDefinition extends SpaceAssignment {
    readonly id: WorkspaceId;
    readonly floorId: FloorId;
    readonly departmentId?: DepartmentId;
    readonly workspaceType: WorkspaceType;
    readonly permanentAssignmentAllowed: boolean;
    readonly shared: boolean;
    readonly position: Point2D;
    readonly interactionPosition: Point2D;
    readonly orientation: Orientation;
    readonly footprint: Footprint;
    readonly capacity: number;
    readonly occupancyState: OccupancyState;
    readonly assignedAgentId?: AgentId;
    readonly accessLevel: AccessLevel;
    readonly visualVariant: string;
    readonly metadata?: EntityMetadata;
}

export type ArchitecturalObjectType =
    | 'elevator'
    | 'service-elevator'
    | 'stairs'
    | 'emergency-exit'
    | 'expansion-seal'
    | 'hologram'
    | 'clock'
    | 'camera'
    | 'badge-reader'
    | 'construction-material';

export interface ArchitecturalObjectDefinition extends SpaceAssignment {
    readonly id: ArchitecturalObjectId;
    readonly floorId: FloorId;
    readonly architecturalType: ArchitecturalObjectType;
    readonly position: Point2D;
    readonly orientation: Orientation;
    readonly footprint: Footprint;
    readonly accessLevel: AccessLevel;
    readonly visualVariant: string;
    readonly metadata?: EntityMetadata;
}

export type OccupantCategory = 'permanent' | 'temporary' | 'sandbox' | 'visitor' | 'escort' | 'waiting';
export type OccupantActivity = 'working' | 'seated-meeting' | 'briefing' | 'waiting' | 'escorting' | 'contained' | 'reception';

export interface SceneOccupantDefinition extends SpaceAssignment {
    readonly id: OccupantId;
    readonly floorId: FloorId;
    readonly agentId?: AgentId;
    readonly workspaceId?: WorkspaceId;
    readonly category: OccupantCategory;
    readonly activity: OccupantActivity;
    readonly position: Point2D;
    readonly orientation: Orientation;
    readonly visualVariant: string;
    readonly label?: string;
}

export interface PermanentAgentDefinition {
    readonly id: AgentId;
    readonly displayName: string;
    readonly role: string;
    readonly departmentId: DepartmentId;
    readonly accessLevel: AccessLevel;
    readonly visualVariant: string;
}
