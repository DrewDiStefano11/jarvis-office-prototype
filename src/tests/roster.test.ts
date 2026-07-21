import { describe, it, expect } from 'vitest';
import { floor1PlaceholderRoster } from '../domain/agents/placeholderRoster';
import { floor1Workspaces } from '../domain/floors/floor-1/workspaces';

describe('Agent Roster Constraints', () => {
    it('creates exactly 24 placeholder permanent agents', () => {
        expect(floor1PlaceholderRoster.length).toBe(24);
        const permanentAgents = floor1PlaceholderRoster.filter(a => a.isPermanent);
        expect(permanentAgents.length).toBe(24);
    });

    it('ensures stable unique IDs for all agents', () => {
        const idSet = new Set();
        floor1PlaceholderRoster.forEach(a => {
            expect(idSet.has(a.id)).toBe(false);
            idSet.add(a.id);
        });
        expect(floor1PlaceholderRoster[0].id).toBe('agent-001');
    });

    it('ensures every permanent agent is assigned to a valid permanent workspace', () => {
        const validPermanentWorkspaceIds = new Set(
            floor1Workspaces
                .filter(w => w.permanentAssignmentAllowed)
                .map(w => w.id)
        );

        floor1PlaceholderRoster.forEach(a => {
            expect(a.assignedWorkspaceId).toBeDefined();
            expect(validPermanentWorkspaceIds.has(a.assignedWorkspaceId!)).toBe(true);
        });
    });
});
