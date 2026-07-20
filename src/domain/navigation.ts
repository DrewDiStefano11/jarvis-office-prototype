import { WaypointNode } from '../types';
import { WAYPOINTS, OFFICE_LOCATIONS } from './seed';

export function getPath(startNodeId: string, endNodeId: string): WaypointNode[] {
    if (startNodeId === endNodeId) {
        const node = WAYPOINTS.find(w => w.id === startNodeId);
        return node ? [node] : [];
    }

    const queue: { id: string, path: string[] }[] = [];
    const visited = new Set<string>();

    queue.push({ id: startNodeId, path: [startNodeId] });
    visited.add(startNodeId);

    while (queue.length > 0) {
        const current = queue.shift()!;

        if (current.id === endNodeId) {
            return current.path.map(id => WAYPOINTS.find(w => w.id === id)!).filter(Boolean) as WaypointNode[];
        }

        const node = WAYPOINTS.find(w => w.id === current.id);
        if (node) {
            for (const connectionId of node.connections) {
                if (!visited.has(connectionId)) {
                    visited.add(connectionId);
                    queue.push({ id: connectionId, path: [...current.path, connectionId] });
                }
            }
        }
    }

    return []; // No path found
}

export function getLocationById(locationId: string) {
    return OFFICE_LOCATIONS.find(loc => loc.id === locationId);
}

// Simple heuristic: find the closest node to a given (x,y)
export function getClosestNode(x: number, y: number): WaypointNode {
    let closestNode = WAYPOINTS[0];
    let minDistance = Infinity;

    for (const node of WAYPOINTS) {
        const dist = Math.sqrt(Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2));
        if (dist < minDistance) {
            minDistance = dist;
            closestNode = node;
        }
    }

    return closestNode;
}
