export type Brand<Value, Name extends string> = Value & { readonly __brand: Name };

export type BuildingId = Brand<string, 'BuildingId'>;
export type FloorId = Brand<string, 'FloorId'>;
export type DepartmentId = Brand<string, 'DepartmentId'>;
export type RoomId = Brand<string, 'RoomId'>;
export type ZoneId = Brand<string, 'ZoneId'>;
export type WallId = Brand<string, 'WallId'>;
export type DoorId = Brand<string, 'DoorId'>;
export type AccessThresholdId = Brand<string, 'AccessThresholdId'>;
export type WorkspaceId = Brand<string, 'WorkspaceId'>;
export type FurnitureId = Brand<string, 'FurnitureId'>;
export type ArchitecturalObjectId = Brand<string, 'ArchitecturalObjectId'>;
export type OccupantId = Brand<string, 'OccupantId'>;
export type AgentId = Brand<string, 'AgentId'>;

const branded = <Identifier extends string>(value: string) => value as Identifier;

export const buildingId = (value: string) => branded<BuildingId>(value);
export const floorId = (value: string) => branded<FloorId>(value);
export const departmentId = (value: string) => branded<DepartmentId>(value);
export const roomId = (value: string) => branded<RoomId>(value);
export const zoneId = (value: string) => branded<ZoneId>(value);
export const wallId = (value: string) => branded<WallId>(value);
export const doorId = (value: string) => branded<DoorId>(value);
export const accessThresholdId = (value: string) => branded<AccessThresholdId>(value);
export const workspaceId = (value: string) => branded<WorkspaceId>(value);
export const furnitureId = (value: string) => branded<FurnitureId>(value);
export const architecturalObjectId = (value: string) => branded<ArchitecturalObjectId>(value);
export const occupantId = (value: string) => branded<OccupantId>(value);
export const agentId = (value: string) => branded<AgentId>(value);

export type SpaceId = RoomId | ZoneId;
