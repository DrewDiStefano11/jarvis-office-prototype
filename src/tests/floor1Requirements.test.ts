import { describe, expect, it } from 'vitest';
import { roomId, zoneId } from '../domain/building/ids';
import { floor1Definition } from '../domain/floors/floor-1';
import { floor1AccessFlow } from '../domain/floors/floor-1/circulation';
import { validateFloor1Requirements } from '../domain/floors/floor-1/validation';

describe('Floor 1 exact requirements', () => {
    it('passes the complete exact-count and access invariant validator', () => {
        expect(validateFloor1Requirements(floor1Definition)).toEqual({ valid: true, errors: [] });
    });

    it('keeps Project vacancies outside the private manager office', () => {
        const vacancies = floor1Definition.workspaces.filter((workspace) => workspace.id.includes('project-vacant'));
        expect(vacancies).toHaveLength(2);
        expect(vacancies.every((workspace) => workspace.zoneId === zoneId('floor-1.zone.project-coordination'))).toBe(true);
        expect(vacancies.every((workspace) => workspace.roomId !== roomId('floor-1.room.project-release-manager-office'))).toBe(true);
    });

    it('connects every sandbox cell only to the shared containment vestibule', () => {
        const cells = floor1Definition.rooms.filter((room) => room.roomType === 'sandbox-cell');
        cells.forEach((cell) => {
            const doors = floor1Definition.doors.filter((door) => door.connectedSpaceIds.includes(cell.id));
            expect(doors).toHaveLength(1);
            expect(doors[0].connectedSpaceIds).toContain(roomId('floor-1.room.containment-vestibule'));
        });
    });

    it('models the full checkpoint sequence without a pre-to-post bypass', () => {
        const sequence = floor1AccessFlow.slice(0, 7).map((connection) => [connection.from, connection.to]);
        expect(sequence).toEqual([
            [zoneId('floor-1.zone.public-vestibule'), zoneId('floor-1.zone.reception-navigation')],
            [zoneId('floor-1.zone.reception-navigation'), zoneId('floor-1.zone.intake-stations')],
            [zoneId('floor-1.zone.intake-stations'), zoneId('floor-1.zone.secure-checkpoint')],
            [zoneId('floor-1.zone.secure-checkpoint'), zoneId('floor-1.zone.controlled-internal-lobby')],
            [zoneId('floor-1.zone.controlled-internal-lobby'), zoneId('floor-1.zone.temporary-route')],
            [zoneId('floor-1.zone.controlled-internal-lobby'), zoneId('floor-1.zone.production-route')],
            [zoneId('floor-1.zone.controlled-internal-lobby'), zoneId('floor-1.zone.secure-evaluation-route')],
        ]);
        expect(floor1AccessFlow.filter((connection) => connection.checkpoint)).toHaveLength(2);
    });

    it('keeps permanent and transient population categories separate', () => {
        const permanent = floor1Definition.occupants.filter((occupant) => occupant.category === 'permanent');
        const transient = floor1Definition.occupants.filter((occupant) => occupant.category !== 'permanent');
        expect(permanent).toHaveLength(24);
        expect(transient).toHaveLength(14);
        expect(permanent.every((occupant) => occupant.agentId?.startsWith('agent-'))).toBe(true);
        expect(transient.every((occupant) => occupant.agentId === undefined)).toBe(true);
    });
});
