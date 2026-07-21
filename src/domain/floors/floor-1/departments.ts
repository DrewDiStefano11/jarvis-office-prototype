import { departmentId } from '../../building/ids';
import type { DepartmentDefinition } from '../../building/types';
import { FLOOR_1_ID } from './metadata';

const department = (
    number: number,
    slug: string,
    name: string,
    palette: string,
    accessLevel: DepartmentDefinition['accessLevel'],
    x: number,
    y: number,
): DepartmentDefinition => ({
    id: departmentId(`floor-1.department.${slug}`),
    floorId: FLOOR_1_ID,
    number,
    name,
    accessLevel,
    visual: { label: name, shortLabel: `${number}. ${name}`, palette, visualVariant: `department-${slug}` },
    labelPosition: { x, y },
});

export const floor1Departments: readonly DepartmentDefinition[] = [
    department(1, 'executive-command', 'Executive Command', 'olive-gold', 'restricted', 910, 245),
    department(2, 'security-privacy-governance', 'Security, Privacy and Governance', 'rust-red', 'highly-restricted', 300, 188),
    department(3, 'reliability-system-operations', 'Reliability and System Operations', 'steel-blue', 'restricted', 1390, 265),
    department(4, 'agent-platform-models', 'Agent Platform and Models', 'violet', 'department', 160, 455),
    department(5, 'software-platform-engineering', 'Software and Platform Engineering', 'indigo', 'department', 455, 455),
    department(6, 'plugins-integrations-automation', 'Plugins, Integrations and Automation', 'plum', 'department', 235, 705),
    department(7, 'project-product-release', 'Project, Product and Release Management', 'navy', 'department', 820, 682),
    department(8, 'data-memory-knowledge', 'Data, Memory and Knowledge', 'forest', 'department', 1450, 458),
    department(9, 'quality-testing-verification', 'Quality, Testing and Verification', 'purple', 'department', 1270, 680),
];
