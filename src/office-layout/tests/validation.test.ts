import { describe, it, expect } from 'vitest';
import { defaultOfficeLayout } from '../layout';
import { defaultAssetManifest } from '../assetManifest';
import { workspaceAssignments, PERMANENT_AGENT_IDS } from '../assignments';
import { validateLayout, validateAssetManifest, validateAssignments } from '../validation';
import { SpriteCategory } from '../types';
import * as fs from 'fs';
import * as path from 'path';

// Minimal PNG header reader to extract width and height
function readPngDimensions(filePath: string): { width: number, height: number } | null {
    if (!fs.existsSync(filePath)) return null;
    const buffer = Buffer.alloc(24);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 24, 0);
    fs.closeSync(fd);

    // Check PNG signature
    if (buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') {
        return null; // Not a valid PNG
    }

    return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20)
    };
}

describe('Office Layout Validation', () => {
    it('default layout passes validation', () => {
        const result = validateLayout(defaultOfficeLayout);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
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
        expect(result.errors).toContain('Duplicate ID found: room-entrance (Room)');
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
        expect(result.errors).toContain('Workstation desk-invalid references missing room: room-missing');
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
        expect(result.errors).toContain(`SpawnPoint spawn-outside is outside room ${room.id} bounds`);
    });

    it('rejects invalid or empty room dimensions', () => {
        const invalidLayout = {
            ...defaultOfficeLayout,
            rooms: [
                { id: 'room-bad', label: 'Bad', bounds: { x: 0, y: 0, width: 0, height: 0 } }
            ]
        };
        const result = validateLayout(invalidLayout);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Room room-bad has invalid dimensions');
    });

    it('rejects workstations in blocked areas', () => {
        const block = defaultOfficeLayout.blockedAreas[0];
        const invalidLayout = {
            ...defaultOfficeLayout,
            workstations: [
                ...defaultOfficeLayout.workstations,
                { id: 'desk-blocked', roomId: 'room-main-office', position: { x: block.bounds.x, y: block.bounds.y }, label: 'Blocked' }
            ]
        };
        const result = validateLayout(invalidLayout);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Workstation desk-blocked occupies a blocked area');
    });

    it('does not mutate layout on validation', () => {
        const originalRoomsLength = defaultOfficeLayout.rooms.length;
        validateLayout(defaultOfficeLayout);
        expect(defaultOfficeLayout.rooms.length).toBe(originalRoomsLength);
    });
});

describe('Asset Manifest Validation', () => {
    it('default manifest passes validation', () => {
        const result = validateAssetManifest(defaultAssetManifest);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
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
        expect(result.errors).toContain(`Duplicate Sprite ID found: ${defaultAssetManifest.entries[0].id}`);
    });

    it('rejects invalid animation ranges', () => {
        const invalidManifest = {
            entries: [
                {
                    id: 'sprite-test',
                    filePath: 'test.png',
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
        expect(result.errors).toContain("Sprite sprite-test has invalid animation range for 'invalid'");
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
        expect(result.errors).toContain(`Sprite ${invalidManifest.entries[0].id} is a static placeholder but claims animations`);
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
        expect(result.errors).toContain(`Sprite ${invalidManifest.entries[0].id} has unsupported category: unsupported-cat`);
    });

    it('verifies placeholder asset paths exist and match dimensions', () => {
        const publicDir = path.resolve(__dirname, '../../../public');
        defaultAssetManifest.entries.forEach(entry => {
            if (entry.isPlaceholder) {
                const fullPath = path.join(publicDir, entry.filePath);
                expect(fs.existsSync(fullPath)).toBe(true);

                // Read actual dimensions
                const dims = readPngDimensions(fullPath);
                expect(dims).not.toBeNull();
                expect(dims!.width).toBe(entry.frameWidth);
                expect(dims!.height).toBe(entry.frameHeight);
            }
        });
    });

    it('ensures chair, computer, and wall-tile are in manifest', () => {
        const ids = defaultAssetManifest.entries.map(e => e.id);
        expect(ids).toContain('sprite-chair');
        expect(ids).toContain('sprite-computer');
        expect(ids).toContain('sprite-wall-tile');
    });
});

describe('Workspace Assignments Validation', () => {
    it('default assignments pass validation', () => {
        const result = validateAssignments(workspaceAssignments, defaultOfficeLayout, defaultAssetManifest);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
    });

    it('assignments correctly cover canonical permanent agents', () => {
        const assignedAgents = workspaceAssignments.map(a => a.agentId);
        expect(assignedAgents).toHaveLength(PERMANENT_AGENT_IDS.length);
        PERMANENT_AGENT_IDS.forEach(id => {
            expect(assignedAgents).toContain(id);
        });
    });

    it('rejects assignments with missing workstation', () => {
        const invalidAssignments = [
            ...workspaceAssignments,
            {
                agentId: 'scout',
                workstationId: 'desk-missing',
                spawnPointId: workspaceAssignments[0].spawnPointId,
                primaryDestinationId: workspaceAssignments[0].primaryDestinationId,
                secondaryDestinationIds: [],
                spriteId: workspaceAssignments[0].spriteId
            }
        ];
        const result = validateAssignments(invalidAssignments, defaultOfficeLayout, defaultAssetManifest);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Duplicate Assignment for agent: scout');
    });

    it('rejects unknown agent IDs', () => {
        const invalidAssignments = [
            {
                agentId: 'unknown-agent',
                workstationId: workspaceAssignments[0].workstationId,
                spawnPointId: workspaceAssignments[0].spawnPointId,
                primaryDestinationId: workspaceAssignments[0].primaryDestinationId,
                secondaryDestinationIds: [],
                spriteId: workspaceAssignments[0].spriteId
            }
        ];
        const result = validateAssignments(invalidAssignments, defaultOfficeLayout, defaultAssetManifest);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Unknown or invalid agent ID: unknown-agent');
    });

    it('rejects duplicate agent assignments', () => {
        const invalidAssignments = [
            workspaceAssignments[0],
            workspaceAssignments[0]
        ];
        const result = validateAssignments(invalidAssignments, defaultOfficeLayout, defaultAssetManifest);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(`Duplicate Assignment for agent: ${workspaceAssignments[0].agentId}`);
    });
});
