import { describe, it, expect } from 'vitest';
import { defaultOfficeLayout } from '../layout';
import { defaultAssetManifest } from '../assetManifest';
import { workspaceAssignments, PERMANENT_AGENT_IDS } from '../assignments';
import { validateLayout, validateAssetManifest, validateAssignments } from '../validation';
import { validateAssetFiles } from '../nodeValidation';
import { SpriteCategory } from '../types';
import * as path from 'path';

describe('Office Layout Validation', () => {
    it('default layout passes validation', () => {
        const result = validateLayout(defaultOfficeLayout);
        expect(result.isValid).toBe(true);
        expect(result.issues).toEqual([]);
    });

    it('rejects duplicate IDs in layout', () => {
        const invalidLayout = {
            ...defaultOfficeLayout,
            rooms: [
                ...defaultOfficeLayout.rooms,
                { id: 'room-entrance', label: 'Duplicate', bounds: { x: 0, y: 0, width: 10, height: 10 } }
            ]
        };
        const result = validateLayout(invalidLayout);
        expect(result.isValid).toBe(false);
        expect(result.issues.some(i => i.code === 'DUPLICATE_ROOM_ID')).toBe(true);
    });

    it('rejects missing room references', () => {
        const invalidLayout = {
            ...defaultOfficeLayout,
            workstations: [
                ...defaultOfficeLayout.workstations,
                { id: 'desk-invalid', roomId: 'room-missing', position: { x: 10, y: 10 }, label: 'Invalid' }
            ]
        };
        const result = validateLayout(invalidLayout);
        expect(result.isValid).toBe(false);
        expect(result.issues.some(i => i.code === 'UNKNOWN_ROOM_REFERENCE')).toBe(true);
    });

    it('rejects positions outside room bounds', () => {
        const room = defaultOfficeLayout.rooms[0];
        const invalidLayout = {
            ...defaultOfficeLayout,
            spawnPoints: [
                ...defaultOfficeLayout.spawnPoints,
                { id: 'spawn-outside', roomId: room.id, position: { x: room.bounds.x - 10, y: room.bounds.y - 10 } }
            ]
        };
        const result = validateLayout(invalidLayout);
        expect(result.isValid).toBe(false);
        expect(result.issues.some(i => i.code === 'OUTSIDE_ROOM_BOUNDS')).toBe(true);
    });

    it('rejects invalid or empty room dimensions', () => {
        const invalidLayout = {
            ...defaultOfficeLayout,
            rooms: [
                ...defaultOfficeLayout.rooms,
                { id: 'room-bad', label: 'Bad', bounds: { x: 0, y: 0, width: 0, height: 0 } }
            ]
        };
        const result = validateLayout(invalidLayout);
        expect(result.isValid).toBe(false);
        expect(result.issues.some(i => i.code === 'INVALID_DIMENSIONS')).toBe(true);
    });

    it('rejects workstations in blocked areas', () => {
        const block = defaultOfficeLayout.blockedAreas[0];
        const invalidLayout = {
            ...defaultOfficeLayout,
            workstations: [
                ...defaultOfficeLayout.workstations,
                { id: 'desk-blocked', roomId: 'room-main-office', position: { x: block.bounds.x + 1, y: block.bounds.y + 1 }, label: 'Blocked' }
            ]
        };
        const result = validateLayout(invalidLayout);
        expect(result.isValid).toBe(false);
        expect(result.issues.some(i => i.code === 'BLOCKED_GEOMETRY_CONFLICT')).toBe(true);
    });

    it('validates exact boundary inclusion/exclusion logic', () => {
        const block = defaultOfficeLayout.blockedAreas[0];
        // Placing a workstation exactly on the blocked area edge (it should be allowed)
        const validLayout = {
            ...defaultOfficeLayout,
            workstations: [
                ...defaultOfficeLayout.workstations,
                { id: 'desk-edge', roomId: 'room-main-office', position: { x: block.bounds.x, y: block.bounds.y }, label: 'Edge' }
            ]
        };
        const res1 = validateLayout(validLayout);
        expect(res1.issues.some(i => i.code === 'BLOCKED_GEOMETRY_CONFLICT')).toBe(false); // Exactly on edge = no overlap

        const room = defaultOfficeLayout.rooms[0];
        // Placing a workstation exactly on the room edge (it should be allowed)
        const edgeRoomLayout = {
            ...defaultOfficeLayout,
            workstations: [
                ...defaultOfficeLayout.workstations,
                { id: 'desk-room-edge', roomId: room.id, position: { x: room.bounds.x + room.bounds.width, y: room.bounds.y + room.bounds.height }, label: 'Edge' }
            ]
        };
        const res2 = validateLayout(edgeRoomLayout);
        expect(res2.issues.some(i => i.code === 'OUTSIDE_ROOM_BOUNDS')).toBe(false); // Exactly on edge = inside room bounds
    });

    it('does not mutate layout on validation', () => {
        const originalRoomsLength = defaultOfficeLayout.rooms.length;
        validateLayout(defaultOfficeLayout);
        expect(defaultOfficeLayout.rooms.length).toBe(originalRoomsLength);
    });

    it('rejects doorway entirely inside one room', () => {
        const invalidLayout = {
            ...defaultOfficeLayout,
            doorways: [
                ...defaultOfficeLayout.doorways,
                { id: 'door-inside', bounds: { x: 210, y: 10, width: 20, height: 20 }, connectsRooms: ['room-main-office', 'room-meeting'] as readonly [string, string] }
            ]
        };
        const result = validateLayout(invalidLayout);
        expect(result.isValid).toBe(false);
        expect(result.issues.some(i => i.code === 'INVALID_DOORWAY' && i.entityId === 'door-inside')).toBe(true);
    });

    it('rejects furniture with zero width or negative height', () => {
        const invalidLayout = {
            ...defaultOfficeLayout,
            furniture: [
                ...defaultOfficeLayout.furniture,
                { id: 'furn-bad', roomId: 'room-main-office', spriteId: 'sprite-desk', position: { x: 210, y: 10 }, size: { width: 0, height: -10 }, blockedArea: { x: 210, y: 10, width: 64, height: 32 } }
            ]
        };
        const result = validateLayout(invalidLayout);
        expect(result.isValid).toBe(false);
        expect(result.issues.some(i => i.code === 'INVALID_DIMENSIONS' && i.entityId === 'furn-bad')).toBe(true);
    });

    it('rejects furniture whose blockedArea does not intersect footprint', () => {
        const invalidLayout = {
            ...defaultOfficeLayout,
            furniture: [
                ...defaultOfficeLayout.furniture,
                { id: 'furn-block-distant', roomId: 'room-main-office', spriteId: 'sprite-desk', position: { x: 210, y: 10 }, size: { width: 64, height: 32 }, blockedArea: { x: 999, y: 999, width: 64, height: 32 } }
            ]
        };
        const result = validateLayout(invalidLayout);
        expect(result.isValid).toBe(false);
        expect(result.issues.some(i => i.code === 'BLOCKED_GEOMETRY_CONFLICT' && i.entityId === 'furn-block-distant')).toBe(true);
    });
});

describe('Asset Manifest Validation', () => {
    it('default manifest passes validation', () => {
        const result = validateAssetManifest(defaultAssetManifest);
        expect(result.isValid).toBe(true);
        expect(result.issues).toEqual([]);
    });

    it('rejects duplicate sprite IDs', () => {
        const invalidManifest = {
            entries: [
                ...defaultAssetManifest.entries,
                { ...defaultAssetManifest.entries[0] }
            ]
        };
        const result = validateAssetManifest(invalidManifest);
        expect(result.isValid).toBe(false);
        expect(result.issues.some(i => i.code === 'DUPLICATE_ASSET_ID')).toBe(true);
    });

    it('rejects invalid animation ranges', () => {
        const invalidManifest = {
            entries: [
                {
                    id: 'sprite-test',
                    filePath: 'assets/test.png',
                    category: 'agent' as const,
                    frameWidth: 32,
                    frameHeight: 32,
                    scale: 1,
                    defaultFacingDirection: 'down' as const,
                    isPlaceholder: false,
                    animations: [
                        { name: 'invalid', frameRange: [5, 2] as const, frameRate: 1, repeat: 0 }
                    ]
                }
            ]
        };
        const result = validateAssetManifest(invalidManifest);
        expect(result.isValid).toBe(false);
        expect(result.issues.some(i => i.code === 'INVALID_ANIMATION_RANGE')).toBe(true);
    });

    it('rejects static placeholders claiming animations', () => {
        const invalidManifest = {
            entries: [
                {
                    ...defaultAssetManifest.entries[0],
                    isPlaceholder: true,
                    animations: [ { name: 'idle', frameRange: [0, 0] as const, frameRate: 1, repeat: -1 } ]
                }
            ]
        };
        const result = validateAssetManifest(invalidManifest);
        expect(result.isValid).toBe(false);
        expect(result.issues.some(i => i.code === 'STATIC_ASSET_HAS_ANIMATION')).toBe(true);
    });

    it('rejects unsupported asset categories', () => {
        const invalidManifest = {
            entries: [
                {
                    ...defaultAssetManifest.entries[0],
                    category: 'unsupported-cat' as SpriteCategory
                }
            ]
        };
        const result = validateAssetManifest(invalidManifest);
        expect(result.isValid).toBe(false);
        expect(result.issues.some(i => i.code === 'UNSUPPORTED_ASSET_CATEGORY')).toBe(true);
    });

    it('ensures chair, computer, and wall-tile are in manifest', () => {
        const result = validateAssetManifest({ entries: [] });
        expect(result.isValid).toBe(false);
        expect(result.issues.filter(i => i.code === 'MISSING_REQUIRED_ASSET')).toHaveLength(3);
    });

    it('rejects asset paths that escape public root', () => {
        const invalidManifest = {
            entries: [
                {
                    ...defaultAssetManifest.entries[0],
                    id: 'sprite-invalid-path',
                    filePath: '../assets/test.png'
                }
            ]
        };
        const result = validateAssetManifest(invalidManifest);
        expect(result.isValid).toBe(false);
        expect(result.issues.some(i => i.code === 'INVALID_ASSET_PATH')).toBe(true);
    });
});

describe('Node File Validation', () => {
    it('verifies placeholder asset paths exist, match dimensions, and are valid PNGs', () => {
        const publicDir = path.resolve(process.cwd(), 'public');
        const result = validateAssetFiles(defaultAssetManifest, publicDir);
        expect(result.isValid).toBe(true);
        expect(result.issues).toEqual([]);
    });

    it('fails on missing file', () => {
        const publicDir = path.resolve(process.cwd(), 'public');
        const invalidManifest = {
            entries: [
                {
                    ...defaultAssetManifest.entries[0],
                    id: 'sprite-missing',
                    filePath: 'assets/office/non-existent.png'
                }
            ]
        };
        const result = validateAssetFiles(invalidManifest, publicDir);
        expect(result.isValid).toBe(false);
        expect(result.issues.some(i => i.code === 'ASSET_FILE_MISSING')).toBe(true);
    });

    it('fails if width or height mismatches manifest', () => {
        const publicDir = path.resolve(process.cwd(), 'public');
        const invalidManifest = {
            entries: [
                {
                    ...defaultAssetManifest.entries[0],
                    frameWidth: 9999, // incorrect width
                }
            ]
        };
        const result = validateAssetFiles(invalidManifest, publicDir);
        expect(result.isValid).toBe(false);
        expect(result.issues.some(i => i.code === 'PNG_WIDTH_MISMATCH')).toBe(true);
    });
});

describe('Workspace Assignments Validation', () => {
    it('default assignments pass validation', () => {
        const result = validateAssignments(workspaceAssignments, defaultOfficeLayout, defaultAssetManifest);
        expect(result.isValid).toBe(true);
        expect(result.issues).toEqual([]);
    });

    it('assignments exactly match canonical permanent agents', () => {
        const assignedAgents = workspaceAssignments.map(a => a.agentId);
        expect(assignedAgents).toHaveLength(PERMANENT_AGENT_IDS.length);
        PERMANENT_AGENT_IDS.forEach(id => {
            expect(assignedAgents).toContain(id);
        });
    });

    it('rejects missing permanent agent assignments', () => {
        const invalidAssignments = workspaceAssignments.filter(a => a.agentId !== 'scout');
        const result = validateAssignments(invalidAssignments, defaultOfficeLayout, defaultAssetManifest);
        expect(result.isValid).toBe(false);
        expect(result.issues.some(i => i.code === 'MISSING_PERMANENT_AGENT_ASSIGNMENT')).toBe(true);
    });

    it('rejects unknown agent IDs', () => {
        const invalidAssignments = [
            ...workspaceAssignments,
            {
                agentId: 'unknown-agent' as string,
                workstationId: workspaceAssignments[0].workstationId,
                spawnPointId: workspaceAssignments[0].spawnPointId,
                primaryDestinationId: workspaceAssignments[0].primaryDestinationId,
                secondaryDestinationIds: [],
                spriteId: workspaceAssignments[0].spriteId
            }
        ];
        const result = validateAssignments(invalidAssignments, defaultOfficeLayout, defaultAssetManifest);
        expect(result.isValid).toBe(false);
        expect(result.issues.some(i => i.code === 'UNKNOWN_AGENT_ID')).toBe(true);
    });

    it('rejects duplicate agent assignments', () => {
        const invalidAssignments = [
            workspaceAssignments[0],
            ...workspaceAssignments
        ];
        const result = validateAssignments(invalidAssignments, defaultOfficeLayout, defaultAssetManifest);
        expect(result.isValid).toBe(false);
        expect(result.issues.some(i => i.code === 'DUPLICATE_ASSIGNMENT')).toBe(true);
    });

    it('rejects assignments with missing workstation', () => {
        const invalidAssignments = workspaceAssignments.map(a =>
            a.agentId === 'scout' ? { ...a, workstationId: 'desk-missing' } : a
        );
        const result = validateAssignments(invalidAssignments, defaultOfficeLayout, defaultAssetManifest);
        expect(result.isValid).toBe(false);
        expect(result.issues.some(i => i.code === 'UNKNOWN_WORKSPACE_ID')).toBe(true);
    });
});
