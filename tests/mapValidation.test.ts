import { describe, it, expect } from 'vitest';
import { parseMapData } from '../src/data/floorOne/floorOneValidation';
import * as fs from 'fs';
import * as path from 'path';

describe('Map Validation', () => {
    it('should validate the canonical map data cleanly', () => {
        const jsonString = fs.readFileSync(path.resolve(__dirname, '../src/data/floorOne/floor-one-map.json'), 'utf8');
        const result = parseMapData(jsonString);
        expect(result.errors).toHaveLength(0);
        expect(result.data).not.toBeNull();
        expect(result.data?.rooms.length).toBeGreaterThanOrEqual(20); // Includes our patched rooms
    });

    it('should catch invalid dimensions', () => {
        const result = parseMapData(JSON.stringify({ map: { width: 100, height: 100 } }));
        expect(result.errors).toContain('Invalid map dimensions. Expected 1536x1024, got 100x100');
    });
});
