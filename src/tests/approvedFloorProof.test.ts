import { describe, expect, it } from 'vitest';
import { APPROVED_PROOF_CHARACTERS, APPROVED_PROOF_DOORS, APPROVED_PROOF_FURNITURE, APPROVED_PROOF_ROOMS, APPROVED_PROOF_ROUTES } from '../approved-proof/data';

describe('approved Floor 1 proof cluster', () => {
    it('stays inside the isolated 20–30% review scope', () => {
        expect(APPROVED_PROOF_ROOMS).toHaveLength(8);
        expect(APPROVED_PROOF_CHARACTERS.length).toBeGreaterThanOrEqual(8);
        expect(APPROVED_PROOF_CHARACTERS.length).toBeLessThan(24);
    });

    it('contains every required representative room type', () => {
        expect(APPROVED_PROOF_ROOMS.map((room) => room.id)).toEqual(expect.arrayContaining(['executive', 'nexus', 'engineering', 'release-review', 'focus', 'public-entry', 'sandbox-vestibule', 'sandbox-cell']));
    });

    it('uses distinct permanent occupant identities and data-backed poses', () => {
        expect(new Set(APPROVED_PROOF_CHARACTERS.map((character) => character.id)).size).toBe(APPROVED_PROOF_CHARACTERS.length);
        expect(new Set(APPROVED_PROOF_CHARACTERS.map((character) => character.name)).size).toBe(APPROVED_PROOF_CHARACTERS.length);
        expect(APPROVED_PROOF_CHARACTERS.map((character) => character.pose)).toEqual(expect.arrayContaining(['standing', 'seated-desk', 'seated-console', 'seated-meeting', 'waiting', 'contained']));
    });

    it('provides multiple original workstation and chair families', () => {
        const types = new Set(APPROVED_PROOF_FURNITURE.map((item) => item.type));
        ['engineering-desk', 'executive-desk', 'reception-desk', 'security-desk', 'ergonomic-chair', 'executive-chair', 'conference-chair', 'waiting-chair', 'technical-chair'].forEach((type) => expect(types.has(type as never)).toBe(true));
    });

    it('gives every enclosed room a documented controlled entrance', () => {
        const doorRooms = new Set(APPROVED_PROOF_DOORS.map((door) => door.roomId));
        APPROVED_PROOF_ROOMS.filter((room) => room.id !== 'nexus').forEach((room) => expect(doorRooms.has(room.id)).toBe(true));
        const cellDoor = APPROVED_PROOF_DOORS.find((door) => door.roomId === 'sandbox-cell');
        expect(cellDoor?.connectsTo).toBe('sandbox-vestibule');
    });

    it('defines circulation from public entry through controlled routes', () => {
        expect(APPROVED_PROOF_ROUTES.map((route) => route.id)).toEqual(expect.arrayContaining(['main-spine', 'nexus-loop', 'engineering-branch', 'release-branch', 'focus-branch', 'containment-branch']));
        expect(APPROVED_PROOF_ROUTES.every((route) => route.width >= 62)).toBe(true);
    });
});
