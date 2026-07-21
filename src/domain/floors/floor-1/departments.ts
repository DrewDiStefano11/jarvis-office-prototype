import { DepartmentDefinition } from '../../../types/building';
import { createDepartmentId, createFloorId } from '../../../types/ids';

const FLOOR_1_ID = createFloorId('floor-1');

export const floor1Departments: DepartmentDefinition[] = [
    {
        id: createDepartmentId('floor-1.department.executive-command'),
        floorId: FLOOR_1_ID,
        name: 'Executive Command',
        number: 1,
        accessLevel: 'highly-restricted',
        roomIds: [] // Populated in rooms phase
    },
    {
        id: createDepartmentId('floor-1.department.security'),
        floorId: FLOOR_1_ID,
        name: 'Security, Privacy and Governance',
        number: 2,
        accessLevel: 'highly-restricted',
        roomIds: []
    },
    {
        id: createDepartmentId('floor-1.department.operations'),
        floorId: FLOOR_1_ID,
        name: 'Reliability and System Operations',
        number: 3,
        accessLevel: 'restricted',
        roomIds: []
    },
    {
        id: createDepartmentId('floor-1.department.agent-platform'),
        floorId: FLOOR_1_ID,
        name: 'Agent Platform and Models',
        number: 4,
        accessLevel: 'department',
        roomIds: []
    },
    {
        id: createDepartmentId('floor-1.department.software-engineering'),
        floorId: FLOOR_1_ID,
        name: 'Software and Platform Engineering',
        number: 5,
        accessLevel: 'department',
        roomIds: []
    },
    {
        id: createDepartmentId('floor-1.department.plugins-automation'),
        floorId: FLOOR_1_ID,
        name: 'Plugins, Integrations and Automation',
        number: 6,
        accessLevel: 'department',
        roomIds: []
    },
    {
        id: createDepartmentId('floor-1.department.project-management'),
        floorId: FLOOR_1_ID,
        name: 'Project, Product and Release Management',
        number: 7,
        accessLevel: 'department',
        roomIds: []
    },
    {
        id: createDepartmentId('floor-1.department.data-memory'),
        floorId: FLOOR_1_ID,
        name: 'Data, Memory and Knowledge',
        number: 8,
        accessLevel: 'department',
        roomIds: []
    },
    {
        id: createDepartmentId('floor-1.department.quality-testing'),
        floorId: FLOOR_1_ID,
        name: 'Quality, Testing and Verification',
        number: 9,
        accessLevel: 'department',
        roomIds: []
    }
];
