import { describe, it, expect } from 'vitest';
import { RouteEngine } from '../domain/movement/routeEngine';
import { floor1RouteNodes, floor1RouteEdges } from '../domain/floors/floor-1/routes';
import { createRouteNodeId } from '../types/ids';

describe('Route Engine Constraints', () => {
    const engine = new RouteEngine(floor1RouteNodes, floor1RouteEdges);

    const start = createRouteNodeId('floor-1.route.public-entrance');

    it('forces all agents to cross the checkpoint to enter', () => {
        const req = {
            startNodeId: start,
            endNodeId: createRouteNodeId('floor-1.route.temporary-launch'),
            agentAccessLevel: 'general' as const,
            agentType: 'temporary' as const
        };
        const path = engine.findPath(req);
        expect(path).not.toBeNull();
        expect(path?.find(n => n.nodeType === 'checkpoint')).toBeDefined();
    });

    it('prevents temporary agents from routing directly to production/engineering', () => {
        const req = {
            startNodeId: start,
            endNodeId: createRouteNodeId('floor-1.route.engineering-entry'),
            agentAccessLevel: 'general' as const,
            agentType: 'temporary' as const
        };
        const path = engine.findPath(req);
        expect(path).toBeNull();
    });

    it('allows permanent agents to reach production', () => {
         const req = {
            startNodeId: start,
            endNodeId: createRouteNodeId('floor-1.route.engineering-entry'),
            agentAccessLevel: 'department' as const,
            agentType: 'permanent' as const
        };
        const path = engine.findPath(req);
        expect(path).not.toBeNull();
    });

    it('restricts sandbox cells to containment-escorted experimental agents', () => {
        const reqGen = {
            startNodeId: start,
            endNodeId: createRouteNodeId('floor-1.route.sandbox-cell-1-entry'),
            agentAccessLevel: 'department' as const,
            agentType: 'permanent' as const
        };
        expect(engine.findPath(reqGen)).toBeNull();

        const reqExp = {
            startNodeId: start,
            endNodeId: createRouteNodeId('floor-1.route.sandbox-cell-1-entry'),
            agentAccessLevel: 'escorted-containment' as const,
            agentType: 'experimental' as const
        };
        expect(engine.findPath(reqExp)).not.toBeNull();
    });

    it('prevents unauthorized access to highly restricted rooms', () => {
        const req = {
            startNodeId: createRouteNodeId('floor-1.route.nexus-center'),
            endNodeId: createRouteNodeId('floor-1.route.security-vault-entry'),
            agentAccessLevel: 'department' as const,
            agentType: 'permanent' as const
        };
        expect(engine.findPath(req)).toBeNull();
    });
});
