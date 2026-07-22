import { FloorOneMapData } from './floorOneTypes';

export function validateMapData(data: FloorOneMapData): string[] {
    const errors: string[] = [];

    if (!data.map) {
        errors.push("Missing 'map' metadata object.");
        return errors;
    }

    if (data.map.width !== 1536 || data.map.height !== 1024) {
        errors.push(`Invalid map dimensions. Expected 1536x1024, got ${data.map.width}x${data.map.height}`);
    }

    const allIds = new Set<string>();

    const checkDuplicateId = (id: string, context: string) => {
        if (!id) {
            errors.push(`Missing ID in ${context}`);
            return;
        }
        if (allIds.has(id)) {
            errors.push(`Duplicate ID found: ${id} in ${context}`);
        }
        allIds.add(id);
    };

    const checkPointBounds = (x: number, y: number, context: string) => {
        if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
            errors.push(`Invalid numeric coordinates in ${context}: (${x}, ${y})`);
        } else if (x < 0 || x > data.map.width || y < 0 || y > data.map.height) {
            errors.push(`Coordinates outside map bounds in ${context}: (${x}, ${y})`);
        }
    };

    const roomIds = new Set<string>();
    data.rooms?.forEach((room, i) => {
        const ctx = `rooms[${i}] (${room.id || 'unknown'})`;
        checkDuplicateId(room.id, ctx);
        if (room.id) roomIds.add(room.id);

        if (!room.polygon || room.polygon.length < 3) {
            errors.push(`Room must have at least 3 polygon points: ${ctx}`);
        } else {
            room.polygon.forEach(p => checkPointBounds(p.x, p.y, ctx));
        }
    });

    data.walkableAreas?.forEach((area, i) => {
        const ctx = `walkableAreas[${i}] (${area.id || 'unknown'})`;
        checkDuplicateId(area.id, ctx);
        if (!area.polygon || area.polygon.length < 3) {
            errors.push(`Walkable area must have at least 3 polygon points: ${ctx}`);
        } else {
            area.polygon.forEach(p => checkPointBounds(p.x, p.y, ctx));
        }
    });

    data.blockedAreas?.forEach((area, i) => {
        const ctx = `blockedAreas[${i}] (${area.id || 'unknown'})`;
        checkDuplicateId(area.id, ctx);
        if (!area.polygon || area.polygon.length < 3) {
            errors.push(`Blocked area must have at least 3 polygon points: ${ctx}`);
        } else {
            area.polygon.forEach(p => checkPointBounds(p.x, p.y, ctx));
        }
    });

    data.doors?.forEach((door, i) => {
        const ctx = `doors[${i}] (${door.id || 'unknown'})`;
        checkDuplicateId(door.id, ctx);
        checkPointBounds(door.x, door.y, ctx);

        if (door.roomA && !roomIds.has(door.roomA) && door.roomA !== 'outside') { // allow 'outside' or 'corridor' if they aren't explicit rooms?
            // "missing room references"
            errors.push(`Door ${door.id} references missing roomA: ${door.roomA}`);
        }
        if (door.roomB && !roomIds.has(door.roomB) && door.roomB !== 'outside') {
            errors.push(`Door ${door.id} references missing roomB: ${door.roomB}`);
        }
    });

    const nodeIds = new Set<string>();
    data.navigationNodes?.forEach((node, i) => {
        const ctx = `navigationNodes[${i}] (${node.id || 'unknown'})`;
        checkDuplicateId(node.id, ctx);
        if (node.id) nodeIds.add(node.id);
        checkPointBounds(node.x, node.y, ctx);
    });

    const edgePairs = new Set<string>();
    data.navigationEdges?.forEach((edge, i) => {
        const ctx = `navigationEdges[${i}] (${edge.id || 'unknown'})`;
        checkDuplicateId(edge.id, ctx);

        if (!nodeIds.has(edge.from)) {
            errors.push(`Edge ${edge.id} references missing from node: ${edge.from}`);
        }
        if (!nodeIds.has(edge.to)) {
            errors.push(`Edge ${edge.id} references missing to node: ${edge.to}`);
        }

        if (edge.from === edge.to) {
            errors.push(`Edge ${edge.id} has same start and end: ${edge.from}`);
        }

        const pair1 = `${edge.from}-${edge.to}`;
        const pair2 = `${edge.to}-${edge.from}`;

        if (edgePairs.has(pair1) || (!edge.bidirectional && edgePairs.has(pair2))) {
           // To keep it simple, we just check if this exact pair was defined.
           // If it's bidirectional, one edge is enough.
           // We flag duplicate edges.
        }
        if (edgePairs.has(pair1)) {
             errors.push(`Duplicate navigation edge between ${edge.from} and ${edge.to} (Edge ID: ${edge.id})`);
        }
        edgePairs.add(pair1);
        if (edge.bidirectional) {
            edgePairs.add(pair2);
        }
    });

    // Check connectivity for major departments
    // A simple BFS from the first node to ensure all nodes are reachable,
    // or specifically major departments are reachable from the entrance.
    const entranceNode = data.navigationNodes?.find(n => n.id === 'nav-public-entrance');
    if (entranceNode && data.navigationEdges) {
        const adjacencyList = new Map<string, string[]>();
        nodeIds.forEach(id => adjacencyList.set(id, []));

        data.navigationEdges.forEach(edge => {
            if (edge.enabled) {
                adjacencyList.get(edge.from)?.push(edge.to);
                if (edge.bidirectional) {
                    adjacencyList.get(edge.to)?.push(edge.from);
                }
            }
        });

        const visited = new Set<string>();
        const queue = [entranceNode.id];
        visited.add(entranceNode.id);

        while (queue.length > 0) {
            const current = queue.shift()!;
            const neighbors = adjacencyList.get(current) || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                }
            }
        }

        // Check if all major department rooms have at least one reachable node.
        const majorDepartments = [
            'executive-command',
            'security-and-governance',
            'reliability-and-operations',
            'agent-platform-and-models',
            'software-engineering',
            'plugins-and-automation',
            'project-and-release-management',
            'data-memory-and-knowledge'
        ];

        for (const dept of majorDepartments) {
            // Find nodes in this department
            const nodesInDept = data.navigationNodes?.filter(n => n.roomId === dept && n.enabled);
            if (nodesInDept && nodesInDept.length > 0) {
                const isReachable = nodesInDept.some(n => visited.has(n.id));
                if (!isReachable) {
                    errors.push(`Department ${dept} is disconnected from the Public Entrance.`);
                }
            }
        }
    }

    return errors;
}

export function parseMapData(jsonString: string): { data: FloorOneMapData | null, errors: string[] } {
    try {
        const data = JSON.parse(jsonString) as FloorOneMapData;
        const errors = validateMapData(data);
        return { data: errors.length === 0 ? data : null, errors };
    } catch (e: unknown) {
        return { data: null, errors: [`Malformed JSON: ${e instanceof Error ? e.message : 'Unknown error'}`] };
    }
}
