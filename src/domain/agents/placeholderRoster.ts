import { AgentRosterEntry } from '../../types/agents';
import { createAgentId, createFloorId, createWorkspaceId, createDepartmentId } from '../../types/ids';

const FLOOR_1_ID = createFloorId('floor-1');

// Private offices assignments (12 agents)
const execAssignments = [
    { name: 'Jarvis', role: 'Command Node', ws: 'exec.jarvis', dept: 'executive-command', access: 'highly-restricted', sprite: 'jarvis' },
    { name: 'Atlas', role: 'Operations Director', ws: 'exec.operations-dir', dept: 'executive-command', access: 'highly-restricted', sprite: 'exec-agent' },
    { name: 'Scout', role: 'Strategic Architect', ws: 'exec.strategic', dept: 'executive-command', access: 'highly-restricted', sprite: 'exec-agent' },
    { name: 'Sentinel', role: 'Security & Approval', ws: 'sec.approval', dept: 'security', access: 'highly-restricted', sprite: 'sec-agent' },
    { name: 'Cipher', role: 'Cybersecurity', ws: 'sec.cyber', dept: 'security', access: 'highly-restricted', sprite: 'sec-agent' },
    { name: 'Aegis', role: 'Governance', ws: 'sec.gov', dept: 'security', access: 'highly-restricted', sprite: 'sec-agent' },
    { name: 'Veritas', role: 'Independent Audit', ws: 'sec.audit', dept: 'security', access: 'highly-restricted', sprite: 'sec-agent' },
    { name: 'Warden', role: 'Incident Manager', ws: 'ops.incident', dept: 'operations', access: 'restricted', sprite: 'ops-agent' },
    { name: 'Shield', role: 'Backup Manager', ws: 'ops.backup', dept: 'operations', access: 'restricted', sprite: 'ops-agent' },
    { name: 'Tracker', role: 'Release Manager', ws: 'proj.manager', dept: 'project-management', access: 'department', sprite: 'proj-agent' },
    { name: 'Archive', role: 'Knowledge Manager', ws: 'data.knowledge', dept: 'data-memory', access: 'department', sprite: 'data-agent' },
    { name: 'Index', role: 'Memory Manager', ws: 'data.memory', dept: 'data-memory', access: 'department', sprite: 'data-agent' },
] as const;

// Engineering (8 agents)
const engAssignments = Array.from({ length: 8 }).map((_, i) => ({
    name: `Eng-${i + 1}`, role: 'Engineer', ws: `eng.desk-${i + 1}`, dept: 'software-engineering', access: 'department', sprite: 'eng-agent'
})) as any;

// Quality (2 agents)
const qualAssignments = [
    { name: 'QA Lead', role: 'Testing & Quality', ws: 'quality.lead', dept: 'quality-testing', access: 'department', sprite: 'qual-agent' },
    { name: 'Eval Bot', role: 'Evaluation', ws: 'quality.eval', dept: 'quality-testing', access: 'department', sprite: 'qual-agent' },
] as const;

// Operations Permanent (2 agents)
const opsAssignments = [
    { name: 'Ops Health', role: 'System Health', ws: 'ops.pod-a-1', dept: 'operations', access: 'restricted', sprite: 'ops-agent' },
    { name: 'Ops Conn', role: 'Connectivity', ws: 'ops.pod-a-2', dept: 'operations', access: 'restricted', sprite: 'ops-agent' },
] as const;

const allPermanentAssignments = [...execAssignments, ...engAssignments, ...qualAssignments, ...opsAssignments];

export const floor1PlaceholderRoster: AgentRosterEntry[] = allPermanentAssignments.map((a, index) => ({
    id: createAgentId(`agent-${String(index + 1).padStart(3, '0')}`),
    placeholderName: a.name,
    placeholderRole: a.role,
    departmentId: createDepartmentId(`floor-1.department.${a.dept}`),
    assignedWorkspaceId: createWorkspaceId(`floor-1.workspace.${a.ws}`),
    homeFloorId: FLOOR_1_ID,
    currentFloorId: FLOOR_1_ID,
    accessPermissions: a.access as any,
    visualState: 'idle',
    spriteVariant: a.sprite,
    isPermanent: true,
    isActive: true,
    placeholderTask: 'Awaiting instruction...'
}));
