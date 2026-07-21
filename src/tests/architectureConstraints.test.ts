import { describe, it, expect } from 'vitest';
import { floor1Departments } from '../domain/floors/floor-1/departments';
import { floor1Rooms, floor1SandboxCells } from '../domain/floors/floor-1/rooms';
import { floor1Workspaces } from '../domain/floors/floor-1/workspaces';
import { floor1RouteNodes, floor1RouteEdges } from '../domain/floors/floor-1/routes';
import { floor1PlaceholderRoster } from '../domain/agents/placeholderRoster';
import { RouteEngine } from '../domain/movement/routeEngine';
import { createRouteNodeId } from '../types/ids';

describe('Strict Floor 1 Architecture Constraints', () => {

    it('forces centralized Jarvis representation (exactly one physical presence)', () => {
        const jarvises = floor1PlaceholderRoster.filter(a => a.placeholderName.toLowerCase().includes('jarvis'));
        expect(jarvises.length).toBe(1);
    });

    it('does not number reception as a department', () => {
        const reception = floor1Rooms.find(r => r.name.toLowerCase().includes('reception'));
        expect(reception).toBeDefined();
        const matchingDept = floor1Departments.find(d => d.id === reception?.departmentId);
        expect(matchingDept?.number).toBeUndefined();
    });

    it('contains exactly 4 sandbox cells that route only to the vestibule', () => {
        expect(floor1SandboxCells.length).toBe(4);
        const engine = new RouteEngine(floor1RouteNodes, floor1RouteEdges);

        const req = {
            startNodeId: createRouteNodeId('floor-1.route.secure-transfer-start'),
            endNodeId: createRouteNodeId('floor-1.route.sandbox-cell-1-entry'),
            agentAccessLevel: 'escorted-containment' as const,
            agentType: 'experimental' as const
        };
        const path = engine.findPath(req);
        expect(path).not.toBeNull();
        expect(path?.find(p => p.id === createRouteNodeId('floor-1.route.sandbox-vestibule-entry'))).toBeDefined();
    });

    it('does not contain any duplicate conference rooms', () => {
        const confRooms = floor1Rooms.filter(r => r.roomType === 'conference');
        const names = new Set(confRooms.map(r => r.name));
        expect(names.size).toBe(confRooms.length);
        expect(confRooms.length).toBe(5);
    });

    it('provides distinct temporary versus permanent workspace configurations', () => {
        const temps = floor1Workspaces.filter(w => w.workspaceType === 'temporary-desk');
        expect(temps.length).toBe(8);
        temps.forEach(t => {
            expect(t.permanentAssignmentAllowed).toBe(false);
            expect(t.assignable).toBe(true);
        });

        const perms = floor1Workspaces.filter(w => w.workspaceType === 'permanent-desk');
        expect(perms.length).toBeGreaterThan(0);
        perms.forEach(p => {
            expect(p.permanentAssignmentAllowed).toBe(true);
        });
    });

    it('includes required emergency and service circulation spaces', () => {
        expect(floor1Rooms.find(r => r.name.toLowerCase().includes('service elevator'))).toBeDefined();
        expect(floor1Rooms.find(r => r.name.toLowerCase().includes('passenger elevator'))).toBeDefined();
        expect(floor1Rooms.find(r => r.name.toLowerCase().includes('emergency stairs'))).toBeDefined();
    });
});
