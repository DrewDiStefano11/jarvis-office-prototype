import { FloorOneMapData, NavigationNode, NavigationEdge } from '../../data/floorOne/floorOneTypes';

export type Route = {
    path: NavigationNode[];
    found: boolean;
};

export class NavigationSystem {
    private mapData: FloorOneMapData | null = null;
    private adjacencyList = new Map<string, NavigationEdge[]>();
    private nodes = new Map<string, NavigationNode>();

    public loadMap(mapData: FloorOneMapData) {
        this.mapData = mapData;
        this.adjacencyList.clear();
        this.nodes.clear();

        if (this.mapData.navigationNodes) {
            for (const node of this.mapData.navigationNodes) {
                if (node.enabled) {
                    this.nodes.set(node.id, node);
                    this.adjacencyList.set(node.id, []);
                }
            }
        }

        if (this.mapData.navigationEdges) {
            for (const edge of this.mapData.navigationEdges) {
                if (!edge.enabled) continue;

                const fromList = this.adjacencyList.get(edge.from);
                if (fromList) {
                    fromList.push(edge);
                }

                if (edge.bidirectional) {
                    const toList = this.adjacencyList.get(edge.to);
                    if (toList) {
                        // Create a reversed edge for the adjacency list
                        toList.push({
                            id: edge.id + "_rev",
                            from: edge.to,
                            to: edge.from,
                            movementCost: edge.movementCost,
                            bidirectional: true,
                            enabled: true
                        });
                    }
                }
            }
        }
    }

    public getNearestNode(x: number, y: number): NavigationNode | null {
        let nearest: NavigationNode | null = null;
        let minDistance = Infinity;
        for (const node of this.nodes.values()) {
            const dist = Phaser.Math.Distance.Between(x, y, node.x, node.y);
            if (dist < minDistance) {
                minDistance = dist;
                nearest = node;
            }
        }
        return nearest;
    }

    public calculatePath(startId: string, endId: string): Route {
        if (!this.nodes.has(startId) || !this.nodes.has(endId)) {
            return { path: [], found: false };
        }

        // Dijkstra's algorithm
        const distances = new Map<string, number>();
        const previous = new Map<string, string>();
        const unvisited = new Set<string>();

        for (const nodeId of this.nodes.keys()) {
            distances.set(nodeId, Infinity);
            unvisited.add(nodeId);
        }
        distances.set(startId, 0);

        while (unvisited.size > 0) {
            // Find minimum distance node
            let currentId: string | null = null;
            let currentMin = Infinity;
            for (const nodeId of unvisited) {
                const dist = distances.get(nodeId)!;
                if (dist < currentMin) {
                    currentMin = dist;
                    currentId = nodeId;
                }
            }

            if (currentId === null || currentId === endId) {
                break; // Target reached or unreachable
            }

            unvisited.delete(currentId);
            const currentDist = distances.get(currentId)!;

            const edges = this.adjacencyList.get(currentId) || [];
            for (const edge of edges) {
                if (!unvisited.has(edge.to)) continue;

                const alt = currentDist + edge.movementCost;
                if (alt < distances.get(edge.to)!) {
                    distances.set(edge.to, alt);
                    previous.set(edge.to, currentId);
                }
            }
        }

        // Reconstruct path
        const path: NavigationNode[] = [];
        let curr: string | undefined = endId;

        if (previous.has(curr) || curr === startId) {
            while (curr !== undefined) {
                path.unshift(this.nodes.get(curr)!);
                curr = previous.get(curr);
            }
            return { path, found: true };
        }

        return { path: [], found: false };
    }
}
