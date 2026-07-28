import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { withApprovalChecksum, validateApprovalArtifact, REQUIRED_ROUTE_TESTS } from './approval.mjs';
import { inspectPdfBuffer, promoteProduction } from './core.mjs';

const temporary = [];
afterEach(() => {
    for (const directory of temporary.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

function source() {
    return {
        pdfHashes: Object.fromEntries([
            ['rooms', 'a'], ['walk-paths', 'b'], ['walls', 'c'], ['objects', 'd'], ['doors', 'e'],
            ['door-lights', 'f'], ['computers', 'g'], ['chairs-standing-desks', 'h'], ['interactive-objects', 'i'],
        ]),
        productionImageHash: 'production',
        embeddedImageHash: 'embedded',
    };
}
function validArtifact() {
    const landmarks = [
        [0, 0], [6144, 0], [0, 4096], [6144, 4096], [100, 2000], [6000, 2000], [3000, 100], [3000, 4000],
    ].map(([x, y], index) => ({ id: String(index), label: String(index), embedded: { x, y }, production: { x, y }, enabled: true, residual: { x: 0, y: 0, distance: 0 } }));
    return withApprovalChecksum({
        schemaVersion: 2, status: 'approved', approved: true,
        reviewer: { id: 'reviewer', approvedAt: '2026-07-28T18:00:00.000Z' },
        source: source(), landmarks, transform: { scale: 1, offsetX: 0, offsetY: 0 },
        residuals: { maximum: 0, mean: 0, rms: 0, thresholds: { maximum: 8, mean: 4, rms: 5 } },
        coverage: { passed: true, quadrants: ['left-lower', 'left-upper', 'right-lower', 'right-upper'], xSpan: 6144, ySpan: 4096, missing: [] },
        reviews: {
            geometry: { status: 'approved', unresolvedCount: 0 },
            colliders: { status: 'approved', unresolvedCount: 0 },
            navigation: { status: 'approved', unresolvedCount: 0 },
        },
        navigation: { cells: [{ id: 'cell-1' }], routeTests: REQUIRED_ROUTE_TESTS.map(id => ({ id, passed: true })) },
    });
}
function context() {
    return {
        source: source(),
        reconciliation: { unresolvedCriticalCount: 0, discardedCount: 0 },
        classification: { complete: true, doorIds: Array.from({ length: 47 }, (_, index) => `D${String(index + 1).padStart(2, '0')}`) },
    };
}
function resigned(mutator) {
    const value = structuredClone(validArtifact());
    mutator(value);
    return withApprovalChecksum(value);
}

describe('production approval validation', () => {
    const cases = [
        ['schema', value => { value.schemaVersion = 1; }],
        ['approval', value => { value.approved = false; }],
        ['landmarks', value => { value.landmarks = value.landmarks.slice(0, 7); }],
        ['coverage', value => { value.coverage.passed = false; }],
        ['uniform scale', value => { value.transform.scaleX = 1; }],
        ['residual thresholds', value => { value.residuals.maximum = 9; }],
        ['geometry review', value => { value.reviews.geometry.unresolvedCount = 1; }],
        ['collider review', value => { value.reviews.colliders.unresolvedCount = 1; }],
        ['navigation review', value => { value.reviews.navigation.unresolvedCount = 1; }],
        ['navigation geometry', value => { value.navigation.cells = []; }],
        ['route tests', value => { value.navigation.routeTests[0].passed = false; }],
    ];
    it.each(cases)('rejects invalid %s', (_label, mutate) => {
        expect(() => validateApprovalArtifact(resigned(mutate), context())).toThrow(/refused/);
    });
    it('rejects a stale checksum and source mismatch', () => {
        expect(() => validateApprovalArtifact({ ...validArtifact(), checksum: 'stale' }, context())).toThrow(/checksum/);
        expect(() => validateApprovalArtifact(resigned(value => { value.source.productionImageHash = 'changed'; }), context())).toThrow(/image hash/);
    });
    it('rejects reconciliation, classification, and door failures', () => {
        expect(() => validateApprovalArtifact(validArtifact(), { ...context(), reconciliation: { unresolvedCriticalCount: 1, discardedCount: 0 } })).toThrow(/reconciliation/);
        expect(() => validateApprovalArtifact(validArtifact(), { ...context(), classification: { complete: false, doorIds: [] } })).toThrow(/classified/);
        expect(() => validateApprovalArtifact(validArtifact(), { ...context(), classification: { complete: true, doorIds: ['D01'] } })).toThrow(/D01-D47/);
    });
});

describe('synthetic production promotion', () => {
    it('writes a complete approved dataset atomically', () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'floor1-promotion-'));
        temporary.push(root);
        const classifiedDir = path.join(root, 'classified');
        const outputDir = path.join(root, 'production');
        fs.mkdirSync(classifiedDir);
        const doors = Array.from({ length: 47 }, (_, index) => ({
            id: `D${String(index + 1).padStart(2, '0')}`, csvAccessMode: 'open',
            pdfPolygon: [{ x: index, y: 0 }, { x: index + 1, y: 0 }, { x: index, y: 1 }],
            authoredFacts: { location_name: `Door ${index + 1}` },
        }));
        const documents = {
            rooms: {
                rooms: [{
                    id: 'ROOM_SYNTHETIC', canonicalName: 'Synthetic room',
                    pdfPolygon: [{ x: 0, y: 0 }, { x: 4608, y: 0 }, { x: 0, y: 3072 }],
                    pdfBounds: { x1: 0, x2: 4608, y1: 0, y2: 3072 },
                }],
            }, 'walk-paths': { records: [] }, walls: { records: [] }, objects: { records: [] },
            doors: { doors }, 'door-lights': { records: [] }, computers: { records: [] }, positions: { positions: [] },
            'interactive-objects': { interactiveObjects: [] },
        };
        for (const [name, value] of Object.entries(documents)) fs.writeFileSync(path.join(classifiedDir, `${name}.json`), JSON.stringify(value));
        const reconciliationPath = path.join(root, 'reconciliation.json');
        fs.writeFileSync(reconciliationPath, JSON.stringify({ discardedCount: 0, sources: [] }));
        const artifactPath = path.join(root, 'approved.json');
        fs.writeFileSync(artifactPath, JSON.stringify(validArtifact()));
        const result = promoteProduction({ artifactPath, outputDir, classifiedDir, reconciliationPath, source: source(), safeRoot: root });
        expect(result.files).toContain('manifest.json');
        expect(result.files).toContain('runtime-overlay.json');
        const manifest = JSON.parse(fs.readFileSync(path.join(outputDir, 'manifest.json'), 'utf8'));
        expect(manifest).toMatchObject({ productionApproved: true, registrationStatus: 'approved' });
        const rooms = JSON.parse(fs.readFileSync(path.join(outputDir, 'rooms.json'), 'utf8'));
        expect(rooms.data.rooms[0].pdfBounds).toEqual({ x1: 0, x2: 6144, y1: 0, y2: 4096 });
        expect(fs.existsSync(`${outputDir}.tmp-${process.pid}`)).toBe(false);
    });
});

describe('PDF integrity reconciliation fixtures', () => {
    it('reports missing annotation references', () => {
        const pdf = Buffer.from('%PDF-1.7\n1 0 obj <</Type/Page/MediaBox[0 0 10 10]/Annots 2 0 R>> endobj\n2 0 obj [99 0 R] endobj\n');
        const result = inspectPdfBuffer('fixture', 'fixture.pdf', pdf);
        expect(result.info.reconciliation.missingReferencedObjectCount).toBe(1);
        expect(result.info.unresolvedStructures).toContain('missing-annotation-object:99:0');
    });
    it('reports malformed arrays and unsupported filters', () => {
        const pdf = Buffer.from('%PDF-1.7\n1 0 obj <</Type/Page/MediaBox[0 0 10 10]/Annots 2 0 R>> endobj\n2 0 obj [3 0 R] endobj\n3 0 obj <</Type/Annot/Subtype/Polygon/Rect[0 0 1/NM(x)>> endobj\n4 0 obj <</Length 0/Filter/RunLengthDecode>>stream\nendstream endobj\n');
        const result = inspectPdfBuffer('fixture', 'fixture.pdf', pdf);
        expect(result.info.reconciliation.malformedObjects).toContain(3);
        expect(result.info.reconciliation.unsupportedFilters).toContain('RunLengthDecode');
    });
});
