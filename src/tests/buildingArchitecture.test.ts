import { describe, expect, it } from 'vitest';
import {
    accessThresholdId,
    agentId,
    architecturalObjectId,
    buildingId,
    departmentId,
    doorId,
    floorId,
    furnitureId,
    occupantId,
    roomId,
    wallId,
    workspaceId,
    zoneId,
} from '../domain/building/ids';
import { BuildingRegistry } from '../domain/building/registry';
import type { FloorDefinition } from '../domain/building/types';
import { validateFloorDefinition } from '../domain/building/validation';
import { floor1Definition } from '../domain/floors/floor-1';
import { createRenderPlan } from '../rendering/renderPlan';
import { worldToIsometric } from '../rendering/isometric';

const mockBuildingId = buildingId('building.mock');
const mockFloorId = floorId('mock-floor');
const mockDepartmentId = departmentId('mock-floor.department.studio');
const mockRoomId = roomId('mock-floor.room.studio');
const mockZoneId = zoneId('mock-floor.zone.hall');
const mockDoorId = doorId('mock-floor.door.studio');
const mockAgentId = agentId('mock-agent-001');
const mockWorkspaceId = workspaceId('mock-floor.workspace.studio-01');

const mockFloor: FloorDefinition = {
    id: mockFloorId,
    buildingId: mockBuildingId,
    name: 'Mock Floor',
    level: 2,
    status: 'under-construction',
    world: { width: 320, height: 180 },
    visual: { label: 'Mock Floor', palette: 'mock', visualVariant: 'mock-floor' },
    departments: [{ id: mockDepartmentId, floorId: mockFloorId, number: 1, name: 'Studio', accessLevel: 'general', visual: { label: 'Studio', palette: 'mock', visualVariant: 'mock-department' }, labelPosition: { x: 80, y: 18 } }],
    rooms: [{ id: mockRoomId, floorId: mockFloorId, departmentId: mockDepartmentId, name: 'Studio', roomType: 'private-office', accessLevel: 'general', bounds: { x: 20, y: 20, width: 120, height: 100 }, capacity: 2, visual: { label: 'Studio', palette: 'mock', visualVariant: 'mock-room' } }],
    zones: [{ id: mockZoneId, floorId: mockFloorId, name: 'Hall', zoneType: 'corridor', accessLevel: 'general', bounds: { x: 140, y: 20, width: 160, height: 100 }, capacity: 8, visual: { label: 'Hall', palette: 'mock', visualVariant: 'mock-zone' } }],
    walls: [{ id: wallId('mock-floor.wall.north'), floorId: mockFloorId, from: { x: 20, y: 20 }, to: { x: 140, y: 20 }, height: 20, thickness: 4, material: 'solid', cutaway: false, visualVariant: 'mock-wall' }],
    doors: [{ id: mockDoorId, floorId: mockFloorId, connectedSpaceIds: [mockRoomId, mockZoneId], position: { x: 140, y: 70 }, orientation: 'east', width: 24, accessLevel: 'general', locked: false, badgeRequired: false, escortRequired: false, visualVariant: 'mock-door' }],
    accessThresholds: [{ id: accessThresholdId('mock-floor.access.studio'), floorId: mockFloorId, doorId: mockDoorId, position: { x: 142, y: 70 }, orientation: 'east', width: 24, accessLevel: 'general', visualVariant: 'mock-threshold' }],
    furniture: [{ id: furnitureId('mock-floor.furniture.desk'), floorId: mockFloorId, roomId: mockRoomId, furnitureType: 'desk', position: { x: 70, y: 60 }, orientation: 'south', footprint: { x: 50, y: 50, width: 40, height: 20 }, blockedFootprint: { x: 46, y: 46, width: 48, height: 28 }, blocksMovement: true, interactable: true, accessLevel: 'general', visualVariant: 'mock-desk' }],
    workspaces: [{ id: mockWorkspaceId, floorId: mockFloorId, roomId: mockRoomId, departmentId: mockDepartmentId, workspaceType: 'permanent', permanentAssignmentAllowed: true, shared: false, position: { x: 70, y: 76 }, interactionPosition: { x: 70, y: 90 }, orientation: 'north', footprint: { x: 62, y: 70, width: 16, height: 16 }, capacity: 1, occupancyState: 'occupied', assignedAgentId: mockAgentId, accessLevel: 'general', visualVariant: 'mock-workspace' }],
    architecturalObjects: [{ id: architecturalObjectId('mock-floor.architecture.stairs'), floorId: mockFloorId, zoneId: mockZoneId, architecturalType: 'stairs', position: { x: 220, y: 60 }, orientation: 'north', footprint: { x: 200, y: 40, width: 40, height: 40 }, accessLevel: 'general', visualVariant: 'mock-stairs' }],
    occupants: [{ id: occupantId('mock-floor.occupant.agent'), floorId: mockFloorId, roomId: mockRoomId, agentId: mockAgentId, workspaceId: mockWorkspaceId, category: 'permanent', activity: 'working', position: { x: 70, y: 84 }, orientation: 'north', visualVariant: 'mock-agent' }],
    permanentAgents: [{ id: mockAgentId, displayName: 'Mock Agent', role: 'Designer', departmentId: mockDepartmentId, accessLevel: 'general', visualVariant: 'mock-agent' }],
};

describe('building architecture', () => {
    it('validates the Floor 1 foundation and all populated core collections', () => {
        expect(validateFloorDefinition(floor1Definition)).toEqual({ valid: true, errors: [] });
        expect(floor1Definition.departments).toHaveLength(9);
        expect(floor1Definition.permanentAgents.map((agent) => agent.id)).toEqual(
            Array.from({ length: 24 }, (_, index) => `agent-${String(index + 1).padStart(3, '0')}`),
        );
    });

    it('accepts a second floor without Floor 1 IDs or renderer conditionals', () => {
        expect(validateFloorDefinition(mockFloor)).toEqual({ valid: true, errors: [] });
        const plan = createRenderPlan(mockFloor);
        expect(plan.length).toBe(9);
        expect(plan.every((command) => command.id.startsWith('mock-floor.'))).toBe(true);
        expect(new Set(plan.map((command) => command.category))).toEqual(new Set([
            'room', 'zone', 'wall', 'door', 'access-threshold', 'furniture', 'workspace', 'architecture', 'occupant',
        ]));
    });

    it('registers floors without mutable global state', () => {
        const registry = new BuildingRegistry({ id: mockBuildingId, name: 'Mock Building' });
        registry.registerFloor(mockFloor);
        expect(registry.getFloor(mockFloorId)).toBe(mockFloor);
        expect(() => registry.registerFloor(mockFloor)).toThrow(/already registered/);
    });

    it('keeps world and screen coordinates separate in one projection', () => {
        expect(worldToIsometric({ x: 10, y: 10 }, { origin: { x: 100, y: 20 }, tileWidth: 2, tileHeight: 1 })).toEqual({ x: 100, y: 30, depth: 20 });
    });

    it('reports duplicate IDs and invalid references', () => {
        const invalid: FloorDefinition = { ...mockFloor, rooms: [{ ...mockFloor.rooms[0], id: roomId(mockZoneId) }] };
        const result = validateFloorDefinition(invalid);
        expect(result.valid).toBe(false);
        expect(result.errors.some((error) => error.includes('Duplicate ID'))).toBe(true);
    });
});
