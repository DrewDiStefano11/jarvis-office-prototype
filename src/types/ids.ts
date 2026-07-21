// Branded types for strict ID typing
export type Brand<K, T> = K & { __brand: T };

export type FloorId = Brand<string, "FloorId">;
export type DepartmentId = Brand<string, "DepartmentId">;
export type RoomId = Brand<string, "RoomId">;
export type WorkspaceId = Brand<string, "WorkspaceId">;
export type FurnitureId = Brand<string, "FurnitureId">;
export type DestinationId = Brand<string, "DestinationId">;
export type DoorId = Brand<string, "DoorId">;
export type RouteNodeId = Brand<string, "RouteNodeId">;
export type AccessZoneId = Brand<string, "AccessZoneId">;
export type AgentId = Brand<string, "AgentId">;
export type SandboxCellId = Brand<string, "SandboxCellId">;

// Helper factory functions
export const createFloorId = (id: string) => id as FloorId;
export const createDepartmentId = (id: string) => id as DepartmentId;
export const createRoomId = (id: string) => id as RoomId;
export const createWorkspaceId = (id: string) => id as WorkspaceId;
export const createFurnitureId = (id: string) => id as FurnitureId;
export const createDestinationId = (id: string) => id as DestinationId;
export const createDoorId = (id: string) => id as DoorId;
export const createRouteNodeId = (id: string) => id as RouteNodeId;
export const createAccessZoneId = (id: string) => id as AccessZoneId;
export const createAgentId = (id: string) => id as AgentId;
export const createSandboxCellId = (id: string) => id as SandboxCellId;
