export type EntityId = string;
export type RoomId = string;
export type WorkstationId = string;
export type SpawnPointId = string;
export type DestinationId = string;
export type FurnitureId = string;
export type SpriteId = string;
export type AgentId = string;

export interface Point {
    readonly x: number;
    readonly y: number;
}

export interface Size {
    readonly width: number;
    readonly height: number;
}

export interface Bounds {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

export interface WalkableArea {
    readonly id: EntityId;
    readonly bounds: Bounds;
}

export interface BlockedArea {
    readonly id: EntityId;
    readonly bounds: Bounds;
}

export interface Room {
    readonly id: RoomId;
    readonly label: string;
    readonly bounds: Bounds;
}

export interface Doorway {
    readonly id: EntityId;
    readonly bounds: Bounds;
    readonly connectsRooms: readonly [RoomId, RoomId];
}

export interface Workstation {
    readonly id: WorkstationId;
    readonly roomId: RoomId;
    readonly position: Point;
    readonly label: string;
}

export interface SpawnPoint {
    readonly id: SpawnPointId;
    readonly roomId: RoomId;
    readonly position: Point;
}

export interface Destination {
    readonly id: DestinationId;
    readonly roomId: RoomId;
    readonly position: Point;
    readonly label: string;
}

export interface Furniture {
    readonly id: FurnitureId;
    readonly roomId: RoomId;
    readonly spriteId: SpriteId;
    readonly position: Point;
    readonly size: Size;
    readonly blockedArea: Bounds;
}

export interface OfficeLayout {
    readonly rooms: readonly Room[];
    readonly doorways: readonly Doorway[];
    readonly walkableAreas: readonly WalkableArea[];
    readonly blockedAreas: readonly BlockedArea[];
    readonly workstations: readonly Workstation[];
    readonly spawnPoints: readonly SpawnPoint[];
    readonly destinations: readonly Destination[];
    readonly furniture: readonly Furniture[];
}

export interface WorkspaceAssignment {
    readonly agentId: AgentId;
    readonly workstationId: WorkstationId;
    readonly spawnPointId: SpawnPointId;
    readonly primaryDestinationId: DestinationId;
    readonly secondaryDestinationIds: readonly DestinationId[];
    readonly spriteId: SpriteId;
}

export type SpriteCategory = 'agent' | 'furniture' | 'decoration' | 'door' | 'indicator' | 'effect' | 'tile' | 'computer' | 'chair';

export interface AnimationDefinition {
    readonly name: string;
    readonly frameRange: readonly [number, number];
    readonly frameRate: number;
    readonly repeat: number;
}

export interface AssetManifestEntry {
    readonly id: SpriteId;
    readonly filePath: string;
    readonly category: SpriteCategory;
    readonly frameWidth: number;
    readonly frameHeight: number;
    readonly scale: number;
    readonly defaultFacingDirection: 'up' | 'down' | 'left' | 'right';
    readonly isPlaceholder: boolean;
    readonly animations: readonly AnimationDefinition[];
}

export interface AssetManifest {
    readonly entries: readonly AssetManifestEntry[];
}

export type OfficeValidationSeverity = "error" | "warning";

export type OfficeValidationCode =
  | "EMPTY_ID"
  | "DUPLICATE_ROOM_ID"
  | "DUPLICATE_FURNITURE_ID"
  | "DUPLICATE_WORKSTATION_ID"
  | "DUPLICATE_SPAWN_ID"
  | "DUPLICATE_DESTINATION_ID"
  | "DUPLICATE_DOORWAY_ID"
  | "DUPLICATE_WALKABLE_AREA_ID"
  | "DUPLICATE_BLOCKED_AREA_ID"
  | "INVALID_DIMENSIONS"
  | "NONFINITE_COORDINATE"
  | "UNKNOWN_ROOM_REFERENCE"
  | "OUTSIDE_ROOM_BOUNDS"
  | "BLOCKED_GEOMETRY_CONFLICT"
  | "INVALID_DOORWAY"
  | "DUPLICATE_ASSIGNMENT"
  | "MISSING_PERMANENT_AGENT_ASSIGNMENT"
  | "UNKNOWN_AGENT_ID"
  | "UNKNOWN_WORKSPACE_ID"
  | "UNKNOWN_SPAWN_ID"
  | "UNKNOWN_SPRITE_ID"
  | "UNKNOWN_DESTINATION_ID"
  | "DUPLICATE_SECONDARY_DESTINATION"
  | "PRIMARY_DESTINATION_REPEATED"
  | "WORKSTATION_CONFLICT"
  | "DUPLICATE_ASSET_ID"
  | "UNSUPPORTED_ASSET_CATEGORY"
  | "INVALID_ASSET_PATH"
  | "INVALID_ASSET_DIMENSIONS"
  | "INVALID_ASSET_SCALE"
  | "DUPLICATE_ANIMATION_ID"
  | "INVALID_ANIMATION_RANGE"
  | "INVALID_ANIMATION_FRAME_RATE"
  | "INVALID_ANIMATION_REPEAT"
  | "STATIC_ASSET_HAS_ANIMATION"
  | "ASSET_FILE_MISSING"
  | "INVALID_PNG_SIGNATURE"
  | "PNG_IHDR_MISSING"
  | "PNG_WIDTH_MISMATCH"
  | "PNG_HEIGHT_MISMATCH"
  | "MISSING_REQUIRED_ASSET";

export interface OfficeValidationIssue {
  readonly code: OfficeValidationCode;
  readonly severity: OfficeValidationSeverity;
  readonly message: string;
  readonly entityType?: string;
  readonly entityId?: string;
  readonly field?: string;
  readonly path?: string;
}

export interface OfficeValidationResult {
  readonly isValid: boolean;
  readonly issues: readonly OfficeValidationIssue[];
}
