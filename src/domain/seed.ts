import { Agent, OfficeLocation, WaypointNode } from '../types';
export { NON_PRODUCTION_OVERLAY } from '../office/sampleOverlay';

export const INITIAL_AGENTS: Agent[] = [
    {
        id: 'jarvis',
        name: 'Jarvis',
        role: 'Executive Manager',
        department: 'Executive',
        managerId: null,
        currentStatus: 'idle',
        previousStatus: 'idle',
        currentTaskId: null,
        statusMessage: 'Awaiting instructions',
        progress: 0,
        currentLocation: 'jarvis_desk',
        targetLocation: null,
        homeDesk: 'jarvis_desk',
        spriteKey: 'agent_jarvis',
        movementSpeed: 150,
        queueCount: 0,
        currentBlocker: null,
        isTemporary: false,
        visuals: {
            color: 0x4a90e2, // Blue/silver accent
            shape: 'rectangle',
            initial: 'J'
        }
    },
    {
        id: 'atlas',
        name: 'Atlas',
        role: 'Research Manager',
        department: 'Research and Knowledge',
        managerId: 'jarvis',
        currentStatus: 'idle',
        previousStatus: 'idle',
        currentTaskId: null,
        statusMessage: 'Ready for research',
        progress: 0,
        currentLocation: 'atlas_desk',
        targetLocation: null,
        homeDesk: 'atlas_desk',
        spriteKey: 'agent_atlas',
        movementSpeed: 150,
        queueCount: 0,
        currentBlocker: null,
        isTemporary: false,
        visuals: {
            color: 0x00bcd4, // Cyan/teal accent
            shape: 'circle',
            initial: 'A'
        }
    },
    {
        id: 'scout',
        name: 'Scout',
        role: 'Research Specialist',
        department: 'Research and Knowledge',
        managerId: 'atlas',
        currentStatus: 'idle',
        previousStatus: 'idle',
        currentTaskId: null,
        statusMessage: 'Monitoring',
        progress: 0,
        currentLocation: 'scout_desk',
        targetLocation: null,
        homeDesk: 'scout_desk',
        spriteKey: 'agent_scout',
        movementSpeed: 180,
        queueCount: 0,
        currentBlocker: null,
        isTemporary: false,
        visuals: {
            color: 0x00ffff, // Bright cyan accent
            shape: 'triangle',
            initial: 'S'
        }
    },
    {
        id: 'archive',
        name: 'Archive',
        role: 'File and Document Specialist',
        department: 'Personal Operations',
        managerId: 'jarvis',
        currentStatus: 'idle',
        previousStatus: 'idle',
        currentTaskId: null,
        statusMessage: 'Organizing files',
        progress: 0,
        currentLocation: 'archive_desk',
        targetLocation: null,
        homeDesk: 'archive_desk',
        spriteKey: 'agent_archive',
        movementSpeed: 120,
        queueCount: 0,
        currentBlocker: null,
        isTemporary: false,
        visuals: {
            color: 0xffb300, // Amber accent
            shape: 'rectangle',
            initial: 'AR'
        }
    },
    {
        id: 'sentinel',
        name: 'Sentinel',
        role: 'Security Reviewer',
        department: 'Governance and Security',
        managerId: 'jarvis',
        currentStatus: 'idle',
        previousStatus: 'idle',
        currentTaskId: null,
        statusMessage: 'Reviewing logs',
        progress: 0,
        currentLocation: 'sentinel_desk',
        targetLocation: null,
        homeDesk: 'sentinel_desk',
        spriteKey: 'agent_sentinel',
        movementSpeed: 140,
        queueCount: 0,
        currentBlocker: null,
        isTemporary: false,
        visuals: {
            color: 0x9c27b0, // Purple accent
            shape: 'rectangle',
            initial: 'SE'
        }
    }
];

export const OFFICE_LOCATIONS: OfficeLocation[] = [
    { id: 'jarvis_desk', displayName: "Jarvis's Desk", x: 512, y: 150, type: 'desk', department: 'Executive', canOccupy: true, approachNodeId: 'n_exec_desk' },
    { id: 'delivery_point', displayName: 'Final Delivery', x: 512, y: 100, type: 'delivery', department: 'Executive', canOccupy: true, approachNodeId: 'n_exec_desk' },

    { id: 'atlas_desk', displayName: "Atlas's Desk", x: 256, y: 256, type: 'desk', department: 'Research and Knowledge', canOccupy: true, approachNodeId: 'n_res_manager' },
    { id: 'scout_desk', displayName: "Scout's Desk", x: 200, y: 256, type: 'desk', department: 'Research and Knowledge', canOccupy: true, approachNodeId: 'n_res_specialist' },
    { id: 'research_terminal', displayName: "Research Terminal", x: 256, y: 200, type: 'terminal', department: 'Research and Knowledge', canOccupy: true, approachNodeId: 'n_res_manager' },

    { id: 'archive_desk', displayName: "Archive's Desk", x: 768, y: 256, type: 'desk', department: 'Personal Operations', canOccupy: true, approachNodeId: 'n_ops_desk' },
    { id: 'archive_storage', displayName: "Archive Storage", x: 800, y: 200, type: 'storage', department: 'Personal Operations', canOccupy: true, approachNodeId: 'n_ops_storage' },

    { id: 'sentinel_desk', displayName: "Sentinel's Desk", x: 768, y: 600, type: 'desk', department: 'Governance and Security', canOccupy: true, approachNodeId: 'n_gov_desk' },
    { id: 'security_review_station', displayName: "Review Station", x: 820, y: 600, type: 'station', department: 'Governance and Security', canOccupy: true, approachNodeId: 'n_gov_desk' },
    { id: 'approval_terminal', displayName: "Approval Console", x: 768, y: 650, type: 'terminal', department: 'Governance and Security', canOccupy: true, approachNodeId: 'n_gov_desk' },

    { id: 'meeting_room', displayName: "Meeting Room", x: 512, y: 384, type: 'table', department: 'Meeting Room', canOccupy: true, approachNodeId: 'n_meeting' },

    { id: 'project_table', displayName: "Project Table", x: 512, y: 512, type: 'table', department: 'Shared Project Area', canOccupy: true, approachNodeId: 'n_project' },

    { id: 'audit_station', displayName: "Audit Station", x: 512, y: 650, type: 'station', department: 'Audit and Notification', canOccupy: true, approachNodeId: 'n_audit' },
    { id: 'notification_station', displayName: "Notification Station", x: 550, y: 650, type: 'station', department: 'Audit and Notification', canOccupy: true, approachNodeId: 'n_audit' },

    { id: 'agent_builder_lab', displayName: "Agent Builder Lab (Offline)", x: 256, y: 600, type: 'lab', department: 'Agent Builder Laboratory', canOccupy: false, approachNodeId: 'n_lab' }
];

export const WAYPOINTS: WaypointNode[] = [
    { id: 'n_c_1', x: 512, y: 200, connections: ['n_exec_desk', 'n_c_2'] },
    { id: 'n_c_2', x: 512, y: 256, connections: ['n_c_1', 'n_c_3', 'n_c_w1', 'n_c_e1'] },
    { id: 'n_c_3', x: 512, y: 320, connections: ['n_c_2', 'n_c_4'] },
    { id: 'n_c_4', x: 512, y: 450, connections: ['n_c_3', 'n_c_5', 'n_meeting'] },
    { id: 'n_c_5', x: 512, y: 560, connections: ['n_c_4', 'n_c_6', 'n_project', 'n_c_w2', 'n_c_e2'] },
    { id: 'n_c_6', x: 512, y: 600, connections: ['n_c_5', 'n_audit'] },

    { id: 'n_c_w1', x: 350, y: 256, connections: ['n_c_2', 'n_res_manager', 'n_res_specialist'] },
    { id: 'n_c_e1', x: 650, y: 256, connections: ['n_c_2', 'n_ops_desk', 'n_ops_storage'] },

    { id: 'n_c_w2', x: 350, y: 560, connections: ['n_c_5', 'n_lab'] },
    { id: 'n_c_e2', x: 650, y: 560, connections: ['n_c_5', 'n_gov_desk'] },

    { id: 'n_exec_desk', x: 512, y: 180, connections: ['n_c_1'] },
    { id: 'n_res_manager', x: 256, y: 280, connections: ['n_c_w1'] },
    { id: 'n_res_specialist', x: 200, y: 280, connections: ['n_c_w1'] },
    { id: 'n_ops_desk', x: 768, y: 280, connections: ['n_c_e1'] },
    { id: 'n_ops_storage', x: 800, y: 230, connections: ['n_c_e1'] },
    { id: 'n_meeting', x: 450, y: 384, connections: ['n_c_4'] },
    { id: 'n_project', x: 450, y: 512, connections: ['n_c_5'] },
    { id: 'n_gov_desk', x: 768, y: 560, connections: ['n_c_e2'] },
    { id: 'n_audit', x: 512, y: 620, connections: ['n_c_6'] },
    { id: 'n_lab', x: 256, y: 560, connections: ['n_c_w2'] }
];
