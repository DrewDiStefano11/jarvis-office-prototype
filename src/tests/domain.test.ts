import { describe, it, expect } from 'vitest';
import { getPath, getLocationById } from '../domain/navigation';
import { INITIAL_AGENTS, OFFICE_LOCATIONS } from '../domain/seed';

describe('Domain Logic tests', () => {
    it('should have 5 distinct initial agents', () => {
        expect(INITIAL_AGENTS.length).toBe(5);
        const ids = new Set(INITIAL_AGENTS.map(a => a.id));
        expect(ids.size).toBe(5);
    });

    it('should be able to get path between connected waypoints', () => {
        // Just checking basic BFS logic on simple paths
        const path = getPath('n_exec_desk', 'n_c_2');
        // n_exec_desk -> n_c_1 -> n_c_2
        expect(path.length).toBeGreaterThan(0);
        expect(path[path.length - 1].id).toBe('n_c_2');
    });

    it('should find office locations by id', () => {
        const loc = getLocationById('meeting_room');
        expect(loc).toBeDefined();
        expect(loc?.displayName).toBe('Meeting Room');
    });

    it('agents should have valid managers', () => {
        INITIAL_AGENTS.forEach(agent => {
            if (agent.managerId !== null) {
                const manager = INITIAL_AGENTS.find(a => a.id === agent.managerId);
                expect(manager).toBeDefined();
            }
        });
    });

    it('agents should have valid home desk locations', () => {
        INITIAL_AGENTS.forEach(agent => {
            const loc = OFFICE_LOCATIONS.find(l => l.id === agent.homeDesk);
            expect(loc).toBeDefined();
            expect(loc?.type).toBe('desk');
        });
    });
});
