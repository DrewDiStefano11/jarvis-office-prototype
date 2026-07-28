import { describe, expect, it } from 'vitest';
import { buildCandidateExport } from './approval';
import { fitUniformRegistration, RegistrationLandmark } from './registration';

describe('registration export', () => {
    it('uses fitted values rather than stale manual controls', () => {
        const landmarks: RegistrationLandmark[] = [
            { id: 'a', label: 'a', embedded: { x: 0, y: 0 }, production: { x: 10, y: 20 }, enabled: true },
            { id: 'b', label: 'b', embedded: { x: 100, y: 0 }, production: { x: 210, y: 20 }, enabled: true },
        ];
        const fit = fitUniformRegistration(landmarks);
        const value = buildCandidateExport(landmarks, fit, { scale: 99, offsetX: 99, offsetY: 99 });
        expect(value.transform).toEqual({ scale: 2, offsetX: 10, offsetY: 20 });
        expect(value.landmarks.every(landmark => landmark.residual?.distance === 0)).toBe(true);
    });
});

