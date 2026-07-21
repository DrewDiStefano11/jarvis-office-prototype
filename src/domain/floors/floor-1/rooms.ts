import { RoomDefinition } from '../../../types/building';
import { createRoomId, createFloorId, createDepartmentId } from '../../../types/ids';

const FLOOR_1_ID = createFloorId('floor-1');

// Real, non-overlapping coordinate definitions (Logical Grid 1792x1024)
export const floor1Rooms: RoomDefinition[] = [
    // --- EXECUTIVE COMMAND (Center to North-Center) ---
    { id: createRoomId('floor-1.room.jarvis-command'), floorId: FLOOR_1_ID, departmentId: createDepartmentId('floor-1.department.executive-command'), name: 'Jarvis Command', roomType: 'private-office', accessLevel: 'highly-restricted', bounds: { x: 700, y: 350, width: 130, height: 100 }, capacity: 1, occupants: [] },
    { id: createRoomId('floor-1.room.operations-director'), floorId: FLOOR_1_ID, departmentId: createDepartmentId('floor-1.department.executive-command'), name: 'Operations Director', roomType: 'private-office', accessLevel: 'highly-restricted', bounds: { x: 830, y: 350, width: 130, height: 100 }, capacity: 1, occupants: [] },
    { id: createRoomId('floor-1.room.strategic-planning'), floorId: FLOOR_1_ID, departmentId: createDepartmentId('floor-1.department.executive-command'), name: 'Strategic Planning', roomType: 'private-office', accessLevel: 'highly-restricted', bounds: { x: 960, y: 350, width: 130, height: 100 }, capacity: 1, occupants: [] },

    // --- CENTRAL NEXUS ---
    { id: createRoomId('floor-1.room.central-nexus'), floorId: FLOOR_1_ID, name: 'Central Nexus', roomType: 'open-area', accessLevel: 'department', bounds: { x: 700, y: 450, width: 390, height: 200 }, capacity: 20, occupants: [] },

    // --- SECURITY, PRIVACY & GOVERNANCE (Northwest) ---
    { id: createRoomId('floor-1.room.security-approval'), floorId: FLOOR_1_ID, departmentId: createDepartmentId('floor-1.department.security'), name: 'Security & Approval', roomType: 'private-office', accessLevel: 'highly-restricted', bounds: { x: 100, y: 100, width: 150, height: 100 }, capacity: 1, occupants: [] },
    { id: createRoomId('floor-1.room.cybersecurity-credentials'), floorId: FLOOR_1_ID, departmentId: createDepartmentId('floor-1.department.security'), name: 'Cyber & Credentials', roomType: 'private-office', accessLevel: 'highly-restricted', bounds: { x: 100, y: 200, width: 150, height: 100 }, capacity: 1, occupants: [] },
    { id: createRoomId('floor-1.room.governance-autonomy'), floorId: FLOOR_1_ID, departmentId: createDepartmentId('floor-1.department.security'), name: 'Governance', roomType: 'private-office', accessLevel: 'highly-restricted', bounds: { x: 250, y: 100, width: 150, height: 100 }, capacity: 1, occupants: [] },
    { id: createRoomId('floor-1.room.independent-audit'), floorId: FLOOR_1_ID, departmentId: createDepartmentId('floor-1.department.security'), name: 'Independent Audit', roomType: 'private-office', accessLevel: 'highly-restricted', bounds: { x: 250, y: 200, width: 150, height: 100 }, capacity: 1, occupants: [] },
    { id: createRoomId('floor-1.room.security-vault'), floorId: FLOOR_1_ID, departmentId: createDepartmentId('floor-1.department.security'), name: 'Security Vault', roomType: 'restricted', accessLevel: 'highly-restricted', bounds: { x: 100, y: 300, width: 300, height: 80 }, capacity: 3, occupants: [] },
    { id: createRoomId('floor-1.room.approval-review-center'), floorId: FLOOR_1_ID, departmentId: createDepartmentId('floor-1.department.security'), name: 'Approval Review Center', roomType: 'restricted', accessLevel: 'restricted', bounds: { x: 400, y: 100, width: 150, height: 280 }, capacity: 5, occupants: [] },

    // --- RELIABILITY & SYSTEM OPERATIONS (Northeast) ---
    { id: createRoomId('floor-1.room.incident-failure-manager'), floorId: FLOOR_1_ID, departmentId: createDepartmentId('floor-1.department.operations'), name: 'Incident Manager', roomType: 'private-office', accessLevel: 'restricted', bounds: { x: 1350, y: 100, width: 150, height: 100 }, capacity: 1, occupants: [] },
    { id: createRoomId('floor-1.room.backup-migration-manager'), floorId: FLOOR_1_ID, departmentId: createDepartmentId('floor-1.department.operations'), name: 'Backup & Continuity', roomType: 'private-office', accessLevel: 'restricted', bounds: { x: 1500, y: 100, width: 150, height: 100 }, capacity: 1, occupants: [] },
    { id: createRoomId('floor-1.room.operations-bay'), floorId: FLOOR_1_ID, departmentId: createDepartmentId('floor-1.department.operations'), name: 'Operations Bay (Pods A, B, C)', roomType: 'open-area', accessLevel: 'restricted', bounds: { x: 1350, y: 200, width: 300, height: 250 }, capacity: 12, occupants: [] },

    // --- ENGINEERING BAY (Southwest-center) ---
    { id: createRoomId('floor-1.room.engineering-bay'), floorId: FLOOR_1_ID, name: 'Engineering Bay (Depts 4,5,6)', roomType: 'open-area', accessLevel: 'department', bounds: { x: 300, y: 500, width: 350, height: 250 }, capacity: 30, occupants: [] },

    // --- PROJECT, PRODUCT & RELEASE (South-center) ---
    { id: createRoomId('floor-1.room.project-release-manager'), floorId: FLOOR_1_ID, departmentId: createDepartmentId('floor-1.department.project-management'), name: 'Project & Release Manager', roomType: 'private-office', accessLevel: 'department', bounds: { x: 650, y: 650, width: 250, height: 100 }, capacity: 1, occupants: [] },

    // --- DATA, MEMORY & KNOWLEDGE (East-center) ---
    { id: createRoomId('floor-1.room.knowledge-search-manager'), floorId: FLOOR_1_ID, departmentId: createDepartmentId('floor-1.department.data-memory'), name: 'Knowledge Manager', roomType: 'private-office', accessLevel: 'department', bounds: { x: 1100, y: 500, width: 150, height: 100 }, capacity: 1, occupants: [] },
    { id: createRoomId('floor-1.room.memory-context-manager'), floorId: FLOOR_1_ID, departmentId: createDepartmentId('floor-1.department.data-memory'), name: 'Memory & Quality', roomType: 'private-office', accessLevel: 'department', bounds: { x: 1250, y: 500, width: 150, height: 100 }, capacity: 1, occupants: [] },
    { id: createRoomId('floor-1.room.decision-archive'), floorId: FLOOR_1_ID, departmentId: createDepartmentId('floor-1.department.data-memory'), name: 'Decision Archive', roomType: 'restricted', accessLevel: 'highly-restricted', bounds: { x: 1100, y: 600, width: 300, height: 80 }, capacity: 2, occupants: [] },
    { id: createRoomId('floor-1.room.knowledge-library'), floorId: FLOOR_1_ID, departmentId: createDepartmentId('floor-1.department.data-memory'), name: 'Knowledge Library', roomType: 'open-area', accessLevel: 'general', bounds: { x: 1100, y: 400, width: 300, height: 100 }, capacity: 10, occupants: [] },

    // --- QUALITY, TESTING & VERIFICATION (Southeast) ---
    { id: createRoomId('floor-1.room.quality-testing'), floorId: FLOOR_1_ID, departmentId: createDepartmentId('floor-1.department.quality-testing'), name: 'Quality & Testing', roomType: 'open-area', accessLevel: 'department', bounds: { x: 950, y: 750, width: 200, height: 150 }, capacity: 8, occupants: [] },

    // --- CONFERENCE ROOMS (Exactly 5) ---
    { id: createRoomId('floor-1.room.exec-boardroom'), floorId: FLOOR_1_ID, name: 'Executive Boardroom', roomType: 'conference', accessLevel: 'restricted', bounds: { x: 700, y: 150, width: 300, height: 150 }, capacity: 20, occupants: [] },
    { id: createRoomId('floor-1.room.strategy-architecture'), floorId: FLOOR_1_ID, name: 'Strategy & Architecture', roomType: 'conference', accessLevel: 'restricted', bounds: { x: 1000, y: 150, width: 200, height: 150 }, capacity: 8, occupants: [] },
    { id: createRoomId('floor-1.room.incident-command-room'), floorId: FLOOR_1_ID, departmentId: createDepartmentId('floor-1.department.operations'), name: 'Incident Command', roomType: 'conference', accessLevel: 'restricted', bounds: { x: 1200, y: 200, width: 150, height: 200 }, capacity: 12, occupants: [] },
    { id: createRoomId('floor-1.room.security-review-room'), floorId: FLOOR_1_ID, departmentId: createDepartmentId('floor-1.department.security'), name: 'Security Review', roomType: 'conference', accessLevel: 'highly-restricted', bounds: { x: 550, y: 100, width: 150, height: 150 }, capacity: 6, occupants: [] },
    { id: createRoomId('floor-1.room.agent-release-review-room'), floorId: FLOOR_1_ID, name: 'Agent & Release Review', roomType: 'conference', accessLevel: 'restricted', bounds: { x: 950, y: 900, width: 200, height: 100 }, capacity: 6, occupants: [] },

    // --- ELEVATORS & STAIRS (North-center core) ---
    { id: createRoomId('floor-1.room.main-stairs'), floorId: FLOOR_1_ID, name: 'Main Stairs', roomType: 'circulation', accessLevel: 'general', bounds: { x: 750, y: 50, width: 100, height: 100 }, capacity: 10, occupants: [] },
    { id: createRoomId('floor-1.room.passenger-elevators'), floorId: FLOOR_1_ID, name: 'Passenger Elevators', roomType: 'circulation', accessLevel: 'general', bounds: { x: 850, y: 50, width: 100, height: 100 }, capacity: 10, occupants: [] },
    { id: createRoomId('floor-1.room.service-elevator'), floorId: FLOOR_1_ID, name: 'Service Elevator & Vestibule', roomType: 'restricted', accessLevel: 'restricted', bounds: { x: 950, y: 50, width: 100, height: 100 }, capacity: 2, occupants: [] },
    { id: createRoomId('floor-1.room.remote-emergency-stairs'), floorId: FLOOR_1_ID, name: 'Remote Emergency Stairs', roomType: 'circulation', accessLevel: 'general', bounds: { x: 100, y: 900, width: 100, height: 100 }, capacity: 5, occupants: [] },

    // --- RECEPTION & TEMPORARY ---
    { id: createRoomId('floor-1.room.reception'), floorId: FLOOR_1_ID, name: 'Reception & Agent Intake Center', roomType: 'circulation', accessLevel: 'general', bounds: { x: 600, y: 800, width: 200, height: 200 }, capacity: 30, occupants: [] },
    { id: createRoomId('floor-1.room.temporary-launch-bay'), floorId: FLOOR_1_ID, name: 'Temporary Launch Bay', roomType: 'open-area', accessLevel: 'general', bounds: { x: 300, y: 750, width: 300, height: 150 }, capacity: 15, occupants: [] },

    // --- FOCUS ROOMS (Southwest) ---
    { id: createRoomId('floor-1.room.focus-1'), floorId: FLOOR_1_ID, name: 'Focus 1', roomType: 'focus', accessLevel: 'general', bounds: { x: 300, y: 900, width: 75, height: 100 }, capacity: 3, occupants: [] },
    { id: createRoomId('floor-1.room.focus-2'), floorId: FLOOR_1_ID, name: 'Focus 2', roomType: 'focus', accessLevel: 'general', bounds: { x: 375, y: 900, width: 75, height: 100 }, capacity: 3, occupants: [] },
    { id: createRoomId('floor-1.room.focus-3'), floorId: FLOOR_1_ID, name: 'Focus 3', roomType: 'focus', accessLevel: 'general', bounds: { x: 450, y: 900, width: 75, height: 100 }, capacity: 3, occupants: [], specialRestrictions: ['Future Office Conversion'] },
    { id: createRoomId('floor-1.room.focus-4'), floorId: FLOOR_1_ID, name: 'Focus 4', roomType: 'focus', accessLevel: 'general', bounds: { x: 525, y: 900, width: 75, height: 100 }, capacity: 3, occupants: [], specialRestrictions: ['Future Office Conversion'] },

    // --- SUPPORT ROOMS ---
    { id: createRoomId('floor-1.room.break-room'), floorId: FLOOR_1_ID, name: 'Break Room', roomType: 'support', accessLevel: 'general', bounds: { x: 200, y: 700, width: 100, height: 100 }, capacity: 10, occupants: [] },
    { id: createRoomId('floor-1.room.restrooms'), floorId: FLOOR_1_ID, name: 'Restrooms', roomType: 'support', accessLevel: 'general', bounds: { x: 200, y: 800, width: 100, height: 100 }, capacity: 5, occupants: [] },
    { id: createRoomId('floor-1.room.utility-closet'), floorId: FLOOR_1_ID, name: 'Utility Closet', roomType: 'support', accessLevel: 'general', bounds: { x: 200, y: 900, width: 100, height: 50 }, capacity: 1, occupants: [] },
    { id: createRoomId('floor-1.room.it-electrical'), floorId: FLOOR_1_ID, name: 'Electrical/IT Room', roomType: 'support', accessLevel: 'restricted', bounds: { x: 200, y: 950, width: 100, height: 50 }, capacity: 2, occupants: [] },

    // --- SANDBOX ---
    { id: createRoomId('floor-1.room.sandbox-transfer-corridor'), floorId: FLOOR_1_ID, name: 'Sandbox Transfer Corridor', roomType: 'circulation', accessLevel: 'escorted-containment', bounds: { x: 800, y: 800, width: 150, height: 50 }, capacity: 5, occupants: [] },
    { id: createRoomId('floor-1.room.sandbox-vestibule'), floorId: FLOOR_1_ID, name: 'Containment Vestibule', roomType: 'vestibule', accessLevel: 'escorted-containment', bounds: { x: 1150, y: 800, width: 250, height: 50 }, capacity: 4, occupants: [] },

    // --- CONSTRUCTION ZONES ---
    { id: createRoomId('floor-1.room.west-wing-construction'), floorId: FLOOR_1_ID, name: 'Future West Wing', roomType: 'construction', accessLevel: 'restricted', bounds: { x: 0, y: 100, width: 100, height: 400 }, capacity: 0, occupants: [] },
    { id: createRoomId('floor-1.room.east-wing-construction'), floorId: FLOOR_1_ID, name: 'Future East Wing', roomType: 'construction', accessLevel: 'restricted', bounds: { x: 1650, y: 100, width: 100, height: 400 }, capacity: 0, occupants: [] },
];

export const floor1SandboxCells: RoomDefinition[] = [
    { id: createRoomId('floor-1.room.sandbox-cell-1'), floorId: FLOOR_1_ID, name: 'Sandbox Cell 1', roomType: 'sandbox', accessLevel: 'escorted-containment', bounds: { x: 1150, y: 850, width: 62, height: 100 }, capacity: 1, occupants: [] },
    { id: createRoomId('floor-1.room.sandbox-cell-2'), floorId: FLOOR_1_ID, name: 'Sandbox Cell 2', roomType: 'sandbox', accessLevel: 'escorted-containment', bounds: { x: 1212, y: 850, width: 62, height: 100 }, capacity: 1, occupants: [] },
    { id: createRoomId('floor-1.room.sandbox-cell-3'), floorId: FLOOR_1_ID, name: 'Sandbox Cell 3', roomType: 'sandbox', accessLevel: 'escorted-containment', bounds: { x: 1274, y: 850, width: 62, height: 100 }, capacity: 1, occupants: [] },
    { id: createRoomId('floor-1.room.sandbox-cell-4'), floorId: FLOOR_1_ID, name: 'Sandbox Cell 4', roomType: 'sandbox', accessLevel: 'escorted-containment', bounds: { x: 1336, y: 850, width: 64, height: 100 }, capacity: 1, occupants: [] },
];

floor1Rooms.push(...floor1SandboxCells);
