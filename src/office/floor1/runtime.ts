import { OfficeOverlayDocument } from '../types';
import { assertValidOverlayDocument } from '../validation';

export type Floor1DataSource = 'existing-sample' | 'candidate-review' | 'approved-production';
export type ProductionRawModules = Readonly<Record<string, string>>;

const PRODUCTION_RAW_MODULES = import.meta.glob('../data/floor1/production/*.json', {
    eager: true,
    import: 'default',
    query: '?raw',
}) as ProductionRawModules;
const REQUIRED_PRODUCTION_FILES = [
    'rooms.json', 'walkable.json', 'walls.json', 'objects.json', 'doors.json', 'door-lights.json',
    'computers.json', 'positions.json', 'interactive-objects.json', 'navigation.json',
    'registration.json', 'extraction-ledger.json', 'runtime-overlay.json',
];

function canonical(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical((value as Record<string, unknown>)[key])]));
    }
    return value;
}

async function sha256(value: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return [...new Uint8Array(digest)].map(item => item.toString(16).padStart(2, '0')).join('');
}

function moduleByName(modules: ProductionRawModules, name: string): string | undefined {
    return Object.entries(modules).find(([key]) => key.replace(/\\/g, '/').endsWith(`/production/${name}`))?.[1];
}

function parseDocument(raw: string | undefined, name: string): Record<string, unknown> {
    if (!raw) throw new Error(`Approved Floor 1 dataset is partial: ${name} is missing.`);
    try { return JSON.parse(raw) as Record<string, unknown>; }
    catch { throw new Error(`Approved Floor 1 dataset is malformed: ${name} is not valid JSON.`); }
}

export function selectFloor1RuntimeSource(productionDocument: unknown): Floor1DataSource {
    if (productionDocument == null) return 'existing-sample';
    if (typeof productionDocument !== 'object') throw new Error('Approved Floor 1 data is invalid.');
    const record = productionDocument as Record<string, unknown>;
    if (record.productionApproved !== true || record.registrationStatus !== 'approved') {
        throw new Error('Normal office mode refuses candidate or provisional Floor 1 data.');
    }
    return 'approved-production';
}

export function isFloor1CandidateReviewRequested(
    search: string,
    isDevelopment: boolean = import.meta.env.DEV,
): boolean {
    if (!isDevelopment) return false;
    return new URLSearchParams(search).get('floor1Review') === 'candidate';
}

export async function loadVerifiedProductionOverlay(modules: ProductionRawModules = PRODUCTION_RAW_MODULES): Promise<OfficeOverlayDocument | null> {
    if (Object.keys(modules).length === 0) return null;
    const manifestRaw = moduleByName(modules, 'manifest.json');
    if (!manifestRaw) throw new Error('Approved Floor 1 dataset is partial: manifest.json is missing.');
    const manifest = parseDocument(manifestRaw, 'manifest.json');
    selectFloor1RuntimeSource(manifest);
    const approvalChecksum = manifest.approvalChecksum;
    const sourceChecksum = manifest.sourceChecksum;
    if (typeof approvalChecksum !== 'string' || typeof sourceChecksum !== 'string') throw new Error('Approved Floor 1 manifest checksums are missing.');
    const files = manifest.files;
    if (!Array.isArray(files) || files.length === 0) throw new Error('Approved Floor 1 manifest file ledger is missing.');
    const listedPaths = new Set((files as { path?: string }[]).map(entry => entry.path));
    if (REQUIRED_PRODUCTION_FILES.some(name => !listedPaths.has(name))) throw new Error('Approved Floor 1 dataset is partial: required documents are missing.');
    for (const entry of files as { path?: string; sha256?: string }[]) {
        if (!entry.path || !entry.sha256) throw new Error('Approved Floor 1 manifest contains a malformed file entry.');
        const raw = moduleByName(modules, entry.path);
        if (!raw || await sha256(raw) !== entry.sha256) throw new Error(`Approved Floor 1 dataset checksum is stale for ${entry.path}.`);
        const document = parseDocument(raw, entry.path);
        if (document.productionApproved !== true || document.registrationStatus !== 'approved'
            || document.approvalChecksum !== approvalChecksum || document.sourceChecksum !== sourceChecksum) {
            throw new Error(`Approved Floor 1 document gate failed for ${entry.path}.`);
        }
    }
    const registration = parseDocument(moduleByName(modules, 'registration.json'), 'registration.json');
    const approval = registration.approval as Record<string, unknown> | undefined;
    if (!approval || approval.approved !== true || approval.status !== 'approved' || approval.checksum !== approvalChecksum) {
        throw new Error('Approved Floor 1 registration approval is malformed.');
    }
    const approvalPayload = { ...approval };
    delete approvalPayload.checksum;
    if (await sha256(JSON.stringify(canonical(approvalPayload))) !== approvalChecksum) {
        throw new Error('Approved Floor 1 registration approval checksum is stale.');
    }
    const overlayDocument = parseDocument(moduleByName(modules, 'runtime-overlay.json'), 'runtime-overlay.json');
    return assertValidOverlayDocument(overlayDocument.data);
}
