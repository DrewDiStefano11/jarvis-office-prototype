import {
    OfficeLayout,
    Room,
    Doorway,
    WalkableArea,
    BlockedArea,
    Workstation,
    SpawnPoint,
    Destination,
    Furniture
} from './types';

const rooms: readonly Room[] = [
    { id: 'room-entrance', label: 'Entrance', bounds: { x: 0, y: 0, width: 200, height: 200 } },
    { id: 'room-main-office', label: 'Main Office', bounds: { x: 200, y: 0, width: 400, height: 400 } },
    { id: 'room-meeting', label: 'Meeting Room', bounds: { x: 600, y: 0, width: 200, height: 200 } },
    { id: 'room-research', label: 'Research Area', bounds: { x: 0, y: 200, width: 200, height: 200 } },
    { id: 'room-file', label: 'File & Records Area', bounds: { x: 600, y: 200, width: 200, height: 200 } },
    { id: 'room-planning', label: 'Planning Area', bounds: { x: 200, y: 400, width: 200, height: 200 } },
    { id: 'room-monitoring', label: 'System Monitoring', bounds: { x: 400, y: 400, width: 200, height: 200 } },
    { id: 'room-break', label: 'Break Area', bounds: { x: 0, y: 400, width: 200, height: 200 } },
    { id: 'room-collab', label: 'Collaboration Area', bounds: { x: 600, y: 400, width: 200, height: 200 } },
];

const doorways: readonly Doorway[] = [
    { id: 'door-entrance-main', bounds: { x: 190, y: 80, width: 20, height: 40 }, connectsRooms: ['room-entrance', 'room-main-office'] },
    { id: 'door-main-meeting', bounds: { x: 590, y: 80, width: 20, height: 40 }, connectsRooms: ['room-main-office', 'room-meeting'] },
    { id: 'door-research-main', bounds: { x: 190, y: 280, width: 20, height: 40 }, connectsRooms: ['room-research', 'room-main-office'] },
    { id: 'door-main-file', bounds: { x: 590, y: 280, width: 20, height: 40 }, connectsRooms: ['room-main-office', 'room-file'] },
    { id: 'door-main-planning', bounds: { x: 280, y: 390, width: 40, height: 20 }, connectsRooms: ['room-main-office', 'room-planning'] },
    { id: 'door-main-monitoring', bounds: { x: 480, y: 390, width: 40, height: 20 }, connectsRooms: ['room-main-office', 'room-monitoring'] },
    { id: 'door-break-planning', bounds: { x: 190, y: 480, width: 20, height: 40 }, connectsRooms: ['room-break', 'room-planning'] },
    { id: 'door-monitoring-collab', bounds: { x: 590, y: 480, width: 20, height: 40 }, connectsRooms: ['room-monitoring', 'room-collab'] },
];

const walkableAreas: readonly WalkableArea[] = [
    { id: 'walk-main', bounds: { x: 20, y: 20, width: 760, height: 560 } }
];

const blockedAreas: readonly BlockedArea[] = [
    { id: 'block-wall-1', bounds: { x: 190, y: 0, width: 20, height: 80 } },
    { id: 'block-wall-2', bounds: { x: 190, y: 120, width: 20, height: 160 } },
    { id: 'block-wall-3', bounds: { x: 190, y: 320, width: 20, height: 280 } },
    { id: 'block-wall-4', bounds: { x: 590, y: 0, width: 20, height: 80 } },
    { id: 'block-wall-5', bounds: { x: 590, y: 120, width: 20, height: 160 } },
    { id: 'block-wall-6', bounds: { x: 590, y: 320, width: 20, height: 160 } },
    { id: 'block-wall-7', bounds: { x: 590, y: 520, width: 20, height: 80 } },
    { id: 'block-wall-8', bounds: { x: 200, y: 390, width: 80, height: 20 } },
    { id: 'block-wall-9', bounds: { x: 320, y: 390, width: 160, height: 20 } },
    { id: 'block-wall-10', bounds: { x: 520, y: 390, width: 80, height: 20 } },
];

const workstations: readonly Workstation[] = [
    { id: 'jarvis_desk', roomId: 'room-main-office', position: { x: 400, y: 100 }, label: 'Jarvis Desk' },
    { id: 'scout_desk', roomId: 'room-research', position: { x: 100, y: 300 }, label: 'Scout Desk' },
    { id: 'sentinel_desk', roomId: 'room-monitoring', position: { x: 500, y: 500 }, label: 'Sentinel Desk' },
    { id: 'atlas_desk', roomId: 'room-planning', position: { x: 300, y: 500 }, label: 'Atlas Desk' },
    { id: 'archive_desk', roomId: 'room-file', position: { x: 700, y: 300 }, label: 'Archive Desk' },
];

const spawnPoints: readonly SpawnPoint[] = [
    { id: 'spawn-jarvis', roomId: 'room-main-office', position: { x: 400, y: 150 } },
    { id: 'spawn-scout', roomId: 'room-research', position: { x: 100, y: 350 } },
    { id: 'spawn-sentinel', roomId: 'room-monitoring', position: { x: 500, y: 550 } },
    { id: 'spawn-atlas', roomId: 'room-planning', position: { x: 300, y: 550 } },
    { id: 'spawn-archive', roomId: 'room-file', position: { x: 700, y: 350 } },
];

const destinations: readonly Destination[] = [
    { id: 'dest-meeting-table', roomId: 'room-meeting', position: { x: 700, y: 100 }, label: 'Meeting Table' },
    { id: 'dest-entrance-lobby', roomId: 'room-entrance', position: { x: 100, y: 100 }, label: 'Lobby' },
    { id: 'dest-break-room', roomId: 'room-break', position: { x: 100, y: 500 }, label: 'Coffee Machine' },
    { id: 'dest-collab-board', roomId: 'room-collab', position: { x: 700, y: 500 }, label: 'Whiteboard' },
    { id: 'dest-main-center', roomId: 'room-main-office', position: { x: 400, y: 250 }, label: 'Office Center' },
];

const furniture: readonly Furniture[] = [
    {
        id: 'furn-desk-jarvis', roomId: 'room-main-office', spriteId: 'sprite-desk',
        position: { x: 400, y: 80 }, size: { width: 64, height: 32 },
        blockedArea: { x: 368, y: 64, width: 64, height: 32 }
    },
    {
        id: 'furn-desk-scout', roomId: 'room-research', spriteId: 'sprite-desk',
        position: { x: 100, y: 280 }, size: { width: 64, height: 32 },
        blockedArea: { x: 68, y: 264, width: 64, height: 32 }
    },
    {
        id: 'furn-desk-sentinel', roomId: 'room-monitoring', spriteId: 'sprite-desk',
        position: { x: 500, y: 480 }, size: { width: 64, height: 32 },
        blockedArea: { x: 468, y: 464, width: 64, height: 32 }
    },
    {
        id: 'furn-desk-atlas', roomId: 'room-planning', spriteId: 'sprite-desk',
        position: { x: 300, y: 480 }, size: { width: 64, height: 32 },
        blockedArea: { x: 268, y: 464, width: 64, height: 32 }
    },
    {
        id: 'furn-desk-archive', roomId: 'room-file', spriteId: 'sprite-desk',
        position: { x: 700, y: 280 }, size: { width: 64, height: 32 },
        blockedArea: { x: 668, y: 264, width: 64, height: 32 }
    },
    {
        id: 'furn-meeting-table', roomId: 'room-meeting', spriteId: 'sprite-meeting-table',
        position: { x: 700, y: 100 }, size: { width: 96, height: 64 },
        blockedArea: { x: 652, y: 68, width: 96, height: 64 }
    },
];

export const defaultOfficeLayout: OfficeLayout = {
    rooms,
    doorways,
    walkableAreas,
    blockedAreas,
    workstations,
    spawnPoints,
    destinations,
    furniture
};
