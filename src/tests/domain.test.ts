import { describe, it, expect } from 'vitest';
import { getPath, getLocationById, validateMovementCommand } from '../domain/navigation';
import { INITIAL_AGENTS, OFFICE_LOCATIONS, WAYPOINTS } from '../domain/seed';

describe('Domain Logic & Route Validation tests', () => {
    it('should have 5 distinct initial agents', () => {
        expect(INITIAL_AGENTS.length).toBe(5);
        const ids = new Set(INITIAL_AGENTS.map(a => a.id));
        expect(ids.size).toBe(5);
    });

    it('should be able to get path between connected waypoints', () => {
        const path = getPath('n_exec_desk', 'n_c_2');
        expect(path.length).toBeGreaterThan(0);
        expect(path[path.length - 1].id).toBe('n_c_2');
    });

    it('should return empty path for unreachable nodes', () => {
        const path = getPath('n_exec_desk', 'unknown_node');
        expect(path.length).toBe(0);
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
            expect(loc?.canOccupy).toBe(true);
        });
    });

    it('validates waypoint graph connectivity and integrity', () => {
        const waypointIds = new Set(WAYPOINTS.map(w => w.id));
        expect(waypointIds.size).toBe(WAYPOINTS.length); // No duplicate IDs

        WAYPOINTS.forEach(node => {
            node.connections.forEach(conn => {
                expect(waypointIds.has(conn)).toBe(true); // All connections must exist
            });
        });
    });

    it('validates every occupiable location has a valid approach waypoint', () => {
        OFFICE_LOCATIONS.forEach(loc => {
            if (loc.canOccupy) {
                expect(loc.approachNodeId).toBeDefined();
                const nodeExists = WAYPOINTS.some(w => w.id === loc.approachNodeId);
                expect(nodeExists).toBe(true);
            }
        });
    });

    it('validates every permanent agent can reach every occupiable location', () => {
        const occupiableLocations = OFFICE_LOCATIONS.filter(l => l.canOccupy);

        INITIAL_AGENTS.forEach(agent => {
            const home = OFFICE_LOCATIONS.find(l => l.id === agent.homeDesk);
            expect(home).toBeDefined();

            occupiableLocations.forEach(loc => {
                if (home!.approachNodeId && loc.approachNodeId) {
                     const path = getPath(home!.approachNodeId, loc.approachNodeId);
                     expect(path.length).toBeGreaterThan(0);
                }
            });
        });
    });

    it('validates movement command logic', () => {
        const validCommand = validateMovementCommand('jarvis', 'meeting_room');
        expect(validCommand.valid).toBe(true);

        const unknownAgent = validateMovementCommand('unknown_agent', 'meeting_room');
        expect(unknownAgent.valid).toBe(false);
        expect(unknownAgent.error).toContain('Unknown agent ID');

        const unknownDest = validateMovementCommand('jarvis', 'unknown_dest');
        expect(unknownDest.valid).toBe(false);
        expect(unknownDest.error).toContain('Unknown destination ID');

        const unoccupiableDest = validateMovementCommand('jarvis', 'agent_builder_lab');
        expect(unoccupiableDest.valid).toBe(false);
        expect(unoccupiableDest.error).toContain('cannot be occupied');
    });
});
