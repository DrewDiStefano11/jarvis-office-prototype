import { agentId, departmentId } from '../building/ids';
import type { PermanentAgentDefinition } from '../building/types';

const roster = [
    ['Jarvis', 'Command Director', 'executive-command', 'highly-restricted', 'agent-command'],
    ['Atlas', 'Operations Director', 'executive-command', 'restricted', 'agent-executive'],
    ['Scout', 'Strategic Architect', 'executive-command', 'restricted', 'agent-executive'],
    ['Sentinel', 'Security and Approval Lead', 'security-privacy-governance', 'highly-restricted', 'agent-security'],
    ['Cipher', 'Cybersecurity and Credentials Lead', 'security-privacy-governance', 'highly-restricted', 'agent-security'],
    ['Aegis', 'Governance and Autonomy Lead', 'security-privacy-governance', 'highly-restricted', 'agent-security'],
    ['Veritas', 'Independent Auditor', 'security-privacy-governance', 'highly-restricted', 'agent-audit'],
    ['Warden', 'Incident and Failure Manager', 'reliability-system-operations', 'restricted', 'agent-operations'],
    ['Harbor', 'Backup and Continuity Manager', 'reliability-system-operations', 'restricted', 'agent-operations'],
    ['Pulse', 'System Health Operator', 'reliability-system-operations', 'restricted', 'agent-operations'],
    ['Relay', 'Connectivity Operator', 'reliability-system-operations', 'restricted', 'agent-operations'],
    ['Forge', 'Agent Factory Engineer', 'agent-platform-models', 'department', 'agent-engineer-violet'],
    ['Tensor', 'Model and Compute Engineer', 'agent-platform-models', 'department', 'agent-engineer-violet'],
    ['Kernel', 'Software Developer', 'software-platform-engineering', 'department', 'agent-engineer-blue'],
    ['Schema', 'Platform and Data Engineer', 'software-platform-engineering', 'department', 'agent-engineer-blue'],
    ['Octocat', 'GitHub and Code Review Engineer', 'software-platform-engineering', 'department', 'agent-engineer-blue'],
    ['Launch', 'DevOps and Deployment Engineer', 'software-platform-engineering', 'department', 'agent-engineer-blue'],
    ['Bridge', 'Plugin and Connector Engineer', 'plugins-integrations-automation', 'department', 'agent-engineer-plum'],
    ['Flow', 'Automation Builder', 'plugins-integrations-automation', 'department', 'agent-engineer-plum'],
    ['Tracker', 'Project and Release Manager', 'project-product-release', 'department', 'agent-project'],
    ['Archive', 'Knowledge and Search Manager', 'data-memory-knowledge', 'department', 'agent-knowledge'],
    ['Context', 'Memory and Data Quality Manager', 'data-memory-knowledge', 'department', 'agent-knowledge'],
    ['Proof', 'Quality Lead', 'quality-testing-verification', 'department', 'agent-quality'],
    ['Gauge', 'Evaluation Specialist', 'quality-testing-verification', 'department', 'agent-quality'],
] as const;

export const permanentAgents: readonly PermanentAgentDefinition[] = roster.map((entry, index) => ({
    id: agentId(`agent-${String(index + 1).padStart(3, '0')}`),
    displayName: entry[0],
    role: entry[1],
    departmentId: departmentId(`floor-1.department.${entry[2]}`),
    accessLevel: entry[3],
    visualVariant: entry[4],
}));
