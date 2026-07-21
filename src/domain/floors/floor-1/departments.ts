import { departmentId } from '../../building/ids';
import type { DepartmentDefinition } from '../../building/types';
import { FLOOR_1_ID } from './metadata';

const department = (
    number: number,
    slug: string,
    name: string,
    palette: string,
    accessLevel: DepartmentDefinition['accessLevel'],
): DepartmentDefinition => ({
    id: departmentId(`floor-1.department.${slug}`),
    floorId: FLOOR_1_ID,
    number,
    name,
    accessLevel,
    visual: { label: name, shortLabel: `${number}. ${name}`, palette, visualVariant: `department-${slug}` },
});

export const floor1Departments: readonly DepartmentDefinition[] = [
    department(1, 'executive-command', 'Executive Command', 'olive-gold', 'restricted'),
    department(2, 'security-privacy-governance', 'Security, Privacy and Governance', 'rust-red', 'highly-restricted'),
    department(3, 'reliability-system-operations', 'Reliability and System Operations', 'steel-blue', 'restricted'),
    department(4, 'agent-platform-models', 'Agent Platform and Models', 'violet', 'department'),
    department(5, 'software-platform-engineering', 'Software and Platform Engineering', 'indigo', 'department'),
    department(6, 'plugins-integrations-automation', 'Plugins, Integrations and Automation', 'plum', 'department'),
    department(7, 'project-product-release', 'Project, Product and Release Management', 'navy', 'department'),
    department(8, 'data-memory-knowledge', 'Data, Memory and Knowledge', 'forest', 'department'),
    department(9, 'quality-testing-verification', 'Quality, Testing and Verification', 'purple', 'department'),
];
