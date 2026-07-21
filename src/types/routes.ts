import { RouteNodeId, FloorId, DoorId, RoomId } from './ids';
import { AccessLevel, Point2D } from './building';

export type AllowedAgentType = 'permanent' | 'temporary' | 'visitor' | 'experimental' | 'maintenance' | 'any';

export interface RouteNode {
    id: RouteNodeId;
    floorId: FloorId;
    roomId?: RoomId;
    position: Point2D;
    nodeType: 'corridor' | 'doorway' | 'checkpoint' | 'workspace-interaction' | 'destination' | 'vestibule' | 'elevator' | 'stair';
}

export interface RouteEdge {
    sourceId: RouteNodeId;
    targetId: RouteNodeId;
    accessLevel: AccessLevel;
    allowedAgentTypes: AllowedAgentType[];
    escortRequired?: boolean;
    doorId?: DoorId;
    checkpointRequired?: boolean;
    containmentRequired?: boolean;
    disabledOrSealed?: boolean;
    movementCost: number;
}
