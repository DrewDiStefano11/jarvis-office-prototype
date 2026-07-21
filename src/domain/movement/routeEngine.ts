import { RouteNode, RouteEdge, AllowedAgentType } from '../../types/routes';
import { RouteNodeId } from '../../types/ids';
import { AccessLevel } from '../../types/building';

export interface AgentPathRequest {
    startNodeId: RouteNodeId;
    endNodeId: RouteNodeId;
    agentAccessLevel: AccessLevel;
    agentType: AllowedAgentType;
}

const accessHierarchy: Record<AccessLevel, number> = {
    'general': 1,
    'department': 2,
    'restricted': 3,
    'highly-restricted': 4,
    'escorted-containment': 5 // Special rules apply here, but strictly it requires containment metadata
};

export class RouteEngine {
    constructor(private nodes: RouteNode[], private edges: RouteEdge[]) {}

    private canTraverse(edge: RouteEdge, req: AgentPathRequest): boolean {
        if (edge.disabledOrSealed) return false;

        // Agent Type Check
        if (!edge.allowedAgentTypes.includes('any') && !edge.allowedAgentTypes.includes(req.agentType)) {
            return false;
        }

        // Access Level check
        const agentLvl = accessHierarchy[req.agentAccessLevel];
        const edgeLvl = accessHierarchy[edge.accessLevel];

        if (edge.accessLevel === 'escorted-containment' && req.agentAccessLevel !== 'escorted-containment') {
             // Exception: highly-restricted security agents might have implicit access, but keeping simple for now
             return false;
        }

        if (edge.accessLevel !== 'escorted-containment' && agentLvl < edgeLvl) {
            return false;
        }

        return true;
    }

    // A simple BFS pathfinder for deterministic shortest path based on hops (ignoring cost for now for simplicity, or simple Dijkstra)
    public findPath(req: AgentPathRequest): RouteNode[] | null {
        // Dijkstra's simple implementation
        const dist = new Map<RouteNodeId, number>();
        const prev = new Map<RouteNodeId, RouteNodeId | null>();
        const unvisited = new Set<RouteNodeId>();

        this.nodes.forEach(n => {
            dist.set(n.id, Infinity);
            prev.set(n.id, null);
            unvisited.add(n.id);
        });

        dist.set(req.startNodeId, 0);

        while (unvisited.size > 0) {
            let u: RouteNodeId | null = null;
            let minDist = Infinity;
            unvisited.forEach(id => {
                const d = dist.get(id)!;
                if (d < minDist) {
                    minDist = d;
                    u = id;
                }
            });

            if (!u || minDist === Infinity) break;
            if (u === req.endNodeId) break;

            unvisited.delete(u);

            // Find valid edges (bi-directional for this prototype unless specified)
            const neighbors = this.edges.filter(e =>
                (e.sourceId === u || e.targetId === u) && this.canTraverse(e, req)
            );

            neighbors.forEach(e => {
                const v = e.sourceId === u ? e.targetId : e.sourceId;
                if (!unvisited.has(v)) return;

                const alt = dist.get(u as RouteNodeId)! + e.movementCost;
                if (alt < dist.get(v)!) {
                    dist.set(v, alt);
                    prev.set(v, u!);
                }
            });
        }

        if (dist.get(req.endNodeId) === Infinity) return null; // No path

        // Reconstruct path
        const path: RouteNode[] = [];
        let curr: RouteNodeId | null = req.endNodeId;
        while (curr) {
            if(curr === null) break; const node = this.nodes.find(n => n.id === curr);
            if (node) path.unshift(node);
            curr = prev.get(curr) || null;
        }

        return path;
    }
}
