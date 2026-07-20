/**
 * Stable IDs and types for the Office Layout and Sprite Asset Foundation.
 * All properties are readonly to ensure immutability in the domain.
 */

export type EntityId = string;
export type RoomId = string;
export type WorkstationId = string;
export type SpawnPointId = string;
export type DestinationId = string;
export type FurnitureId = string;
export type SpriteId = string;
export type AgentId = string; // Stable ID mapping to existing domain agents

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

export type SpriteCategory = 'agent' | 'furniture' | 'decoration' | 'door' | 'indicator' | 'effect' | 'tile';

export interface AnimationDefinition {
    readonly name: string;
    readonly frameRange: readonly [number, number];
    readonly frameRate: number;
    readonly repeat: number; // e.g. -1 for infinite loop
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
