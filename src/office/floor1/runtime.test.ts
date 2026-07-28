import { describe, expect, it } from 'vitest';
import { loadVerifiedProductionOverlay, ProductionRawModules, selectFloor1RuntimeSource } from './runtime';

function canonical(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical((value as Record<string, unknown>)[key])]));
    return value;
}
async function sha(value: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return [...new Uint8Array(digest)].map(item => item.toString(16).padStart(2, '0')).join('');
}
async function validModules(): Promise<Record<string, string>> {
    const approvalPayload = { schemaVersion: 2, status: 'approved', approved: true };
    const approvalChecksum = await sha(JSON.stringify(canonical(approvalPayload)));
    const approval = { ...approvalPayload, checksum: approvalChecksum };
    const shared = { schemaVersion: 1, registrationStatus: 'approved', productionApproved: true, approvalChecksum, sourceChecksum: 'source' };
    const overlay = { schemaVersion: 1, source: { width: 8192, height: 5460 }, production: true, entities: [], pathNodes: [] };
    const names = [
        'rooms.json', 'walkable.json', 'walls.json', 'objects.json', 'doors.json', 'door-lights.json',
        'computers.json', 'positions.json', 'interactive-objects.json', 'navigation.json',
        'registration.json', 'extraction-ledger.json', 'runtime-overlay.json',
    ];
    const modules: Record<string, string> = {};
    for (const name of names) {
        const value = name === 'registration.json' ? { ...shared, approval }
            : name === 'runtime-overlay.json' ? { ...shared, data: overlay }
                : { ...shared, data: {} };
        modules[`../data/floor1/production/${name}`] = `${JSON.stringify(value)}\n`;
    }
    const files = await Promise.all(names.map(async name => ({ path: name, sha256: await sha(modules[`../data/floor1/production/${name}`]) })));
    modules['../data/floor1/production/manifest.json'] = `${JSON.stringify({ ...shared, files })}\n`;
    return modules;
}

describe('verified production runtime loader', () => {
    it('uses sample data when production is absent', async () => {
        expect(selectFloor1RuntimeSource(null)).toBe('existing-sample');
        await expect(loadVerifiedProductionOverlay({})).resolves.toBeNull();
    });
    it('rejects provisional and malformed approval data', async () => {
        expect(() => selectFloor1RuntimeSource({ registrationStatus: 'candidate-unverified', productionApproved: false })).toThrow(/refuses/);
        const modules = await validModules();
        const registration = JSON.parse(modules['../data/floor1/production/registration.json']);
        registration.approval.approved = false;
        modules['../data/floor1/production/registration.json'] = `${JSON.stringify(registration)}\n`;
        await expect(loadVerifiedProductionOverlay(modules)).rejects.toThrow(/checksum|gate/);
    });
    it('rejects stale checksums and partial generation', async () => {
        const stale = await validModules();
        stale['../data/floor1/production/rooms.json'] += ' ';
        await expect(loadVerifiedProductionOverlay(stale)).rejects.toThrow(/stale/);
        const partial = await validModules();
        delete partial['../data/floor1/production/doors.json'];
        await expect(loadVerifiedProductionOverlay(partial)).rejects.toThrow(/partial|stale/);
    });
    it('loads a valid synthetic approved overlay', async () => {
        const overlay = await loadVerifiedProductionOverlay(await validModules() as ProductionRawModules);
        expect(overlay).toMatchObject({ production: true, source: { width: 8192, height: 5460 } });
    });
});

