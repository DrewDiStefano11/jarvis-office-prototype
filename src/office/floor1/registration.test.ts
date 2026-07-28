import { describe, expect, it } from 'vitest';
import {
    alignEdgeMaps, embeddedToPdf, fitUniformRegistration, hasDistributedCoverage,
    pdfToEmbedded, pdfToProduction, productionToPdf,
} from './registration';
import { selectFloor1RuntimeSource } from './runtime';

const candidate = { scale: 4 / 3, offsetX: 0, offsetY: -2 / 3 };

describe('Floor 1 coordinate spaces and registration', () => {
    it('inverts the PDF Y axis exactly once and round trips', () => {
        const embedded = pdfToEmbedded({ x: 4608, y: 3072 });
        expect(embedded).toEqual({ x: 6144, y: 0 });
        expect(embeddedToPdf(embedded)).toEqual({ x: 4608, y: 3072 });
        expect(productionToPdf(pdfToProduction({ x: 100, y: 200 }, candidate), candidate)).toEqual({ x: 100, y: 200 });
    });

    it('rejects nonpositive and independent registration scales', () => {
        expect(() => pdfToProduction({ x: 0, y: 0 }, { scale: 0, offsetX: 0, offsetY: 0 })).toThrow();
        expect(() => pdfToProduction({ x: 0, y: 0 }, { ...candidate, scaleX: 1 } as never)).toThrow(/Independent/);
    });

    it('fits one scale and offsets with residual evidence', () => {
        const landmarks = [
            { id: 'a', label: 'a', embedded: { x: 0, y: 0 }, production: { x: 10, y: 20 }, enabled: true },
            { id: 'b', label: 'b', embedded: { x: 100, y: 0 }, production: { x: 210, y: 20 }, enabled: true },
            { id: 'c', label: 'c', embedded: { x: 0, y: 100 }, production: { x: 10, y: 220 }, enabled: true },
        ];
        expect(fitUniformRegistration(landmarks)).toMatchObject({ scale: 2, offsetX: 10, offsetY: 20, maximumResidual: 0 });
    });

    it('requires eight landmarks distributed across the image', () => {
        const coordinates = [[0, 0], [6144, 0], [0, 4096], [6144, 4096], [100, 2000], [6000, 2000], [3000, 100], [3000, 4000]];
        expect(hasDistributedCoverage(coordinates.map(([x, y], index) => ({ id: String(index), label: String(index), embedded: { x, y }, production: { x, y }, enabled: true })))).toBe(true);
    });

    it('aligns deterministic synthetic edge maps', () => {
        const moving = { width: 3, height: 3, values: [0, 0, 0, 0, 255, 0, 0, 0, 0] };
        const reference = { width: 5, height: 5, values: Array.from({ length: 25 }, (_, index) => index === 12 ? 255 : 0) };
        expect(alignEdgeMaps(reference, moving, { scale: 1, offsetX: 0, offsetY: 0 }).offsetX).toBe(1);
    });

    it('aligns a realistic larger edge-map fixture', () => {
        const width = 64;
        const height = 48;
        const movingValues = Array.from({ length: width * height }, (_, index) => {
            const x = index % width;
            const y = Math.floor(index / width);
            return x === 20 || y === 31 || (x > 35 && x < 50 && y > 8 && y < 12) ? 255 : 0;
        });
        const referenceWidth = 68;
        const referenceHeight = 52;
        const referenceValues = new Array(referenceWidth * referenceHeight).fill(0);
        for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) referenceValues[(y + 2) * referenceWidth + x + 3] = movingValues[y * width + x];
        const result = alignEdgeMaps({ width: referenceWidth, height: referenceHeight, values: referenceValues }, { width, height, values: movingValues }, { scale: 1, offsetX: 1, offsetY: 1 }, 4);
        expect(result.offsetX).toBe(3);
        expect(result.offsetY).toBe(2);
        expect(result.scale).toBeCloseTo(1, 1);
        expect(result.score).toBeGreaterThan(0.9);
    });

    it('never loads candidate data in normal mode', () => {
        expect(selectFloor1RuntimeSource(null)).toBe('existing-sample');
        expect(() => selectFloor1RuntimeSource({ productionApproved: false, registrationStatus: 'candidate-unverified' })).toThrow(/refuses/);
    });
});
