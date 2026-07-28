import { describe, expect, it } from 'vitest';
import computers from '../data/floor1/provisional/computers.json';
import doorLights from '../data/floor1/provisional/door-lights.json';
import doors from '../data/floor1/provisional/doors.json';
import interactiveObjects from '../data/floor1/provisional/interactive-objects.json';
import objects from '../data/floor1/provisional/objects.json';
import positions from '../data/floor1/provisional/positions.json';
import rooms from '../data/floor1/provisional/rooms.json';
import walkPaths from '../data/floor1/provisional/walk-paths.json';
import walls from '../data/floor1/provisional/walls.json';
import { NON_PRODUCTION_OVERLAY } from '../sampleOverlay';
import {
    buildFloor1CandidateOverlay,
    candidateEntityCounts,
    FLOOR1_CANDIDATE_CATEGORIES,
    FLOOR1_CANDIDATE_LABEL,
    FLOOR1_CANDIDATE_LAYERS,
} from './candidateReview';

const documents = {
    rooms,
    'walk-paths': walkPaths,
    walls,
    objects,
    doors,
    'door-lights': doorLights,
    computers,
    positions,
    'interactive-objects': interactiveObjects,
};

describe('Floor 1 candidate review projection', () => {
    it('projects every extracted category into normal office entities without sample entities', () => {
        const document = buildFloor1CandidateOverlay(documents);

        expect(document.production).toBe(false);
        expect(document.entities).toHaveLength(907);
        expect(candidateEntityCounts(document)).toEqual({
            rooms: 34,
            'walk-paths': 167,
            walls: 82,
            objects: 178,
            doors: 47,
            'door-lights': 144,
            computers: 44,
            positions: 205,
            'interactive-objects': 6,
        });
        expect(new Set(document.entities.map(entity => entity.metadata.candidateCategory)))
            .toEqual(new Set(FLOOR1_CANDIDATE_CATEGORIES));
        expect(new Set(document.entities.map(entity => entity.sourceLayer)))
            .toEqual(FLOOR1_CANDIDATE_LAYERS);
        expect(document.entities.every(entity => entity.interactive)).toBe(true);
        expect(document.entities.some(entity => entity.id.startsWith('sample.'))).toBe(false);
        expect(NON_PRODUCTION_OVERLAY.entities.some(entity => document.entities.includes(entity))).toBe(false);
    });

    it('keeps the persistent review label explicit about approval status', () => {
        expect(FLOOR1_CANDIDATE_LABEL).toBe('Floor 1 candidate — not production approved');
    });

    it('rejects a provisional wrapper that crosses the approved-production boundary', () => {
        const invalid = {
            ...documents,
            rooms: { ...rooms, productionApproved: true },
        };
        expect(() => buildFloor1CandidateOverlay(invalid)).toThrow(/production approval boundary/);
    });
});
