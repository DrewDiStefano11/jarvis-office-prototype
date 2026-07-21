import { RouteNode, RouteEdge } from '../../../types/routes';
import { createRouteNodeId, createFloorId } from '../../../types/ids';

const FLOOR_1_ID = createFloorId('floor-1');
const p = (x: number, y: number) => ({ x, y });

// Expand Route Graph for comprehensive floor coverage
export const floor1RouteNodes: RouteNode[] = [
    // Entrance / Public
    { id: createRouteNodeId('floor-1.route.public-entrance'), floorId: FLOOR_1_ID, position: p(700, 1000), nodeType: 'corridor' },
    { id: createRouteNodeId('floor-1.route.intake-checkpoint-front'), floorId: FLOOR_1_ID, position: p(700, 950), nodeType: 'checkpoint' },
    { id: createRouteNodeId('floor-1.route.intake-checkpoint-back'), floorId: FLOOR_1_ID, position: p(700, 900), nodeType: 'checkpoint' },

    // Core Circulation (Perimeter Route mapping to Phase 23)
    { id: createRouteNodeId('floor-1.route.south-corridor-1'), floorId: FLOOR_1_ID, position: p(700, 800), nodeType: 'corridor' },
    { id: createRouteNodeId('floor-1.route.south-corridor-2'), floorId: FLOOR_1_ID, position: p(500, 800), nodeType: 'corridor' },
    { id: createRouteNodeId('floor-1.route.west-corridor-1'), floorId: FLOOR_1_ID, position: p(300, 600), nodeType: 'corridor' },
    { id: createRouteNodeId('floor-1.route.north-corridor-1'), floorId: FLOOR_1_ID, position: p(700, 350), nodeType: 'corridor' },
    { id: createRouteNodeId('floor-1.route.east-corridor-1'), floorId: FLOOR_1_ID, position: p(1100, 600), nodeType: 'corridor' },

    // Temporary Launch / Focus
    { id: createRouteNodeId('floor-1.route.temporary-launch'), floorId: FLOOR_1_ID, position: p(400, 850), nodeType: 'destination' },
    { id: createRouteNodeId('floor-1.route.focus-rooms'), floorId: FLOOR_1_ID, position: p(450, 950), nodeType: 'destination' },

    // Production / Nexus
    { id: createRouteNodeId('floor-1.route.nexus-center'), floorId: FLOOR_1_ID, position: p(895, 550), nodeType: 'destination' },

    // Engineering
    { id: createRouteNodeId('floor-1.route.engineering-entry'), floorId: FLOOR_1_ID, position: p(500, 600), nodeType: 'corridor' },
    { id: createRouteNodeId('floor-1.route.engineering-bay'), floorId: FLOOR_1_ID, position: p(550, 625), nodeType: 'destination' },

    // Security
    { id: createRouteNodeId('floor-1.route.security-entry'), floorId: FLOOR_1_ID, position: p(350, 250), nodeType: 'doorway' },
    { id: createRouteNodeId('floor-1.route.security-vault-entry'), floorId: FLOOR_1_ID, position: p(250, 350), nodeType: 'destination' },

    // Data / Knowledge
    { id: createRouteNodeId('floor-1.route.knowledge-library'), floorId: FLOOR_1_ID, position: p(1250, 450), nodeType: 'destination' },

    // Quality / Sandbox Transfer
    { id: createRouteNodeId('floor-1.route.quality-entry'), floorId: FLOOR_1_ID, position: p(1050, 850), nodeType: 'destination' },
    { id: createRouteNodeId('floor-1.route.secure-transfer-start'), floorId: FLOOR_1_ID, position: p(900, 900), nodeType: 'corridor' },
    { id: createRouteNodeId('floor-1.route.secure-transfer-mid'), floorId: FLOOR_1_ID, position: p(1100, 900), nodeType: 'corridor' },
    { id: createRouteNodeId('floor-1.route.sandbox-vestibule-entry'), floorId: FLOOR_1_ID, position: p(1250, 825), nodeType: 'doorway' },
    { id: createRouteNodeId('floor-1.route.sandbox-cell-1-entry'), floorId: FLOOR_1_ID, position: p(1225, 900), nodeType: 'destination' }
];

export const floor1RouteEdges: RouteEdge[] = [
    // Entrance sequence
    { sourceId: createRouteNodeId('floor-1.route.public-entrance'), targetId: createRouteNodeId('floor-1.route.intake-checkpoint-front'), accessLevel: 'general', allowedAgentTypes: ['any'], movementCost: 1 },
    { sourceId: createRouteNodeId('floor-1.route.intake-checkpoint-front'), targetId: createRouteNodeId('floor-1.route.intake-checkpoint-back'), accessLevel: 'general', allowedAgentTypes: ['any'], checkpointRequired: true, movementCost: 5 },

    // Core intersections
    { sourceId: createRouteNodeId('floor-1.route.intake-checkpoint-back'), targetId: createRouteNodeId('floor-1.route.south-corridor-1'), accessLevel: 'general', allowedAgentTypes: ['any'], movementCost: 1 },
    { sourceId: createRouteNodeId('floor-1.route.south-corridor-1'), targetId: createRouteNodeId('floor-1.route.south-corridor-2'), accessLevel: 'general', allowedAgentTypes: ['any'], movementCost: 1 },
    { sourceId: createRouteNodeId('floor-1.route.south-corridor-1'), targetId: createRouteNodeId('floor-1.route.nexus-center'), accessLevel: 'department', allowedAgentTypes: ['permanent'], movementCost: 2 },
    { sourceId: createRouteNodeId('floor-1.route.south-corridor-1'), targetId: createRouteNodeId('floor-1.route.secure-transfer-start'), accessLevel: 'general', allowedAgentTypes: ['permanent', 'experimental'], movementCost: 1 },

    // Left route (Temporary / Perimeter)
    { sourceId: createRouteNodeId('floor-1.route.south-corridor-2'), targetId: createRouteNodeId('floor-1.route.temporary-launch'), accessLevel: 'general', allowedAgentTypes: ['temporary', 'permanent'], movementCost: 1 },
    { sourceId: createRouteNodeId('floor-1.route.temporary-launch'), targetId: createRouteNodeId('floor-1.route.focus-rooms'), accessLevel: 'general', allowedAgentTypes: ['temporary', 'permanent'], movementCost: 1 },
    { sourceId: createRouteNodeId('floor-1.route.south-corridor-2'), targetId: createRouteNodeId('floor-1.route.west-corridor-1'), accessLevel: 'department', allowedAgentTypes: ['permanent'], movementCost: 2 },
    { sourceId: createRouteNodeId('floor-1.route.west-corridor-1'), targetId: createRouteNodeId('floor-1.route.engineering-entry'), accessLevel: 'department', allowedAgentTypes: ['permanent'], movementCost: 1 },

    // Production / Engineering
    { sourceId: createRouteNodeId('floor-1.route.engineering-entry'), targetId: createRouteNodeId('floor-1.route.engineering-bay'), accessLevel: 'department', allowedAgentTypes: ['permanent'], movementCost: 1 },
    { sourceId: createRouteNodeId('floor-1.route.nexus-center'), targetId: createRouteNodeId('floor-1.route.engineering-entry'), accessLevel: 'department', allowedAgentTypes: ['permanent'], movementCost: 1 },
    { sourceId: createRouteNodeId('floor-1.route.nexus-center'), targetId: createRouteNodeId('floor-1.route.north-corridor-1'), accessLevel: 'department', allowedAgentTypes: ['permanent'], movementCost: 1 },
    { sourceId: createRouteNodeId('floor-1.route.nexus-center'), targetId: createRouteNodeId('floor-1.route.east-corridor-1'), accessLevel: 'department', allowedAgentTypes: ['permanent'], movementCost: 1 },

    // Security Highly Restricted
    { sourceId: createRouteNodeId('floor-1.route.west-corridor-1'), targetId: createRouteNodeId('floor-1.route.security-entry'), accessLevel: 'highly-restricted', allowedAgentTypes: ['permanent'], movementCost: 1 },
    { sourceId: createRouteNodeId('floor-1.route.security-entry'), targetId: createRouteNodeId('floor-1.route.security-vault-entry'), accessLevel: 'highly-restricted', allowedAgentTypes: ['permanent'], movementCost: 2 },

    // Knowledge & Quality
    { sourceId: createRouteNodeId('floor-1.route.east-corridor-1'), targetId: createRouteNodeId('floor-1.route.knowledge-library'), accessLevel: 'general', allowedAgentTypes: ['permanent'], movementCost: 1 },
    { sourceId: createRouteNodeId('floor-1.route.east-corridor-1'), targetId: createRouteNodeId('floor-1.route.quality-entry'), accessLevel: 'department', allowedAgentTypes: ['permanent'], movementCost: 1 },

    // Secure Sandbox Corridor
    { sourceId: createRouteNodeId('floor-1.route.secure-transfer-start'), targetId: createRouteNodeId('floor-1.route.secure-transfer-mid'), accessLevel: 'escorted-containment', allowedAgentTypes: ['permanent', 'experimental'], containmentRequired: true, movementCost: 2 },
    { sourceId: createRouteNodeId('floor-1.route.secure-transfer-mid'), targetId: createRouteNodeId('floor-1.route.sandbox-vestibule-entry'), accessLevel: 'escorted-containment', allowedAgentTypes: ['experimental', 'permanent'], containmentRequired: true, movementCost: 1 },
    { sourceId: createRouteNodeId('floor-1.route.sandbox-vestibule-entry'), targetId: createRouteNodeId('floor-1.route.sandbox-cell-1-entry'), accessLevel: 'escorted-containment', allowedAgentTypes: ['experimental'], containmentRequired: true, movementCost: 1 },
];
