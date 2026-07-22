export type Point = { x: number; y: number };

export type Room = {
    id: string;
    name: string;
    department: string;
    category: string;
    description: string;
    polygon: Point[];
    enabled: boolean;
    accessClassification?: string;
    operationalStatusPlaceholder?: string;
    occupancyCapacityPlaceholder?: number;
    connectedDoorIds?: string[];
    destinationIds?: string[];
};

export type WalkableArea = {
    id: string;
    name: string;
    polygon: Point[];
    enabled: boolean;
    purpose?: string;
};

export type BlockedArea = {
    id: string;
    name: string;
    polygon: Point[];
    enabled: boolean;
    purpose?: string;
};

export type Door = {
    id: string;
    name: string;
    x: number;
    y: number;
    roomA?: string;
    roomB?: string;
    accessType: string;
    enabled: boolean;
    orientation?: 'horizontal' | 'vertical' | 'custom';
};

export type InteractionPoint = {
    id: string;
    name: string;
    x: number;
    y: number;
    roomAssociation?: string;
    destinationType?: string;
    enabled: boolean;
};

export type NavigationNode = {
    id: string;
    name: string;
    x: number;
    y: number;
    roomId?: string; // parent room or corridor
    nodeType: string;
    enabled: boolean;
    destinationPriority?: number;
};

export type NavigationEdge = {
    id: string;
    from: string; // node ID
    to: string; // node ID
    movementCost: number;
    bidirectional: boolean;
    enabled: boolean;
    doorwayAssociation?: string;
};

export type ForegroundMask = {
    id: string;
    name: string;
    polygon?: Point[];
    rect?: { x: number; y: number; width: number; height: number };
    enabled: boolean;
    purpose?: string;
};

export type SpawnPoint = {
    id: string;
    name: string;
    x: number;
    y: number;
    roomAssociation?: string;
    facingDirection?: string;
    destinationType?: string;
};

export type MapMetadata = {
    id: string;
    name: string;
    image: string;
    width: number;
    height: number;
    version: number;
};

export type FloorOneMapData = {
    map: MapMetadata;
    rooms: Room[];
    walkableAreas: WalkableArea[];
    blockedAreas: BlockedArea[];
    doors: Door[];
    interactionPoints: InteractionPoint[];
    navigationNodes: NavigationNode[];
    navigationEdges: NavigationEdge[];
    foregroundMasks: ForegroundMask[];
    spawnPoints: SpawnPoint[];
};
