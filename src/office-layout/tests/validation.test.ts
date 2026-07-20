import { describe, it, expect } from 'vitest';
import { defaultOfficeLayout } from '../layout';
import { defaultAssetManifest } from '../assetManifest';
import { workspaceAssignments } from '../assignments';
import { validateLayout, validateAssetManifest, validateAssignments } from '../validation';
import * as fs from 'fs';
import * as path from 'path';

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
                    isPlaceholder: true,
                    animations: [
                        { name: 'invalid', frameRange: [-1, 2] as const, frameRate: 1, repeat: 0 }
                    ]
                }
            ]
        };
        const result = validateAssetManifest(invalidManifest);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Sprite sprite-test has invalid animation range for \'invalid\'');
    });

    it('verifies placeholder asset paths exist in the repository', () => {
        const publicDir = path.resolve(__dirname, '../../../public');
        defaultAssetManifest.entries.forEach(entry => {
            if (entry.isPlaceholder) {
                const fullPath = path.join(publicDir, entry.filePath);
                expect(fs.existsSync(fullPath)).toBe(true);
            }
        });
    });
});

describe('Workspace Assignments Validation', () => {
    it('default assignments pass validation', () => {
        const result = validateAssignments(workspaceAssignments, defaultOfficeLayout, defaultAssetManifest);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
    });

    it('rejects assignments with missing workstation', () => {
        const invalidAssignments = [
            ...workspaceAssignments,
            {
                agentId: 'agent-missing',
                workstationId: 'desk-missing',
                spawnPointId: workspaceAssignments[0].spawnPointId,
                primaryDestinationId: workspaceAssignments[0].primaryDestinationId,
                secondaryDestinationIds: [],
                spriteId: workspaceAssignments[0].spriteId
            }
        ];
        const result = validateAssignments(invalidAssignments, defaultOfficeLayout, defaultAssetManifest);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Agent agent-missing references missing workstation: desk-missing');
    });
});
