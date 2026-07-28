import {
    assessDistributedCoverage, landmarkResiduals, RegistrationFit,
    RegistrationLandmark, UniformRegistration,
} from './registration';

export const FLOOR1_SOURCE = {
    pdfHashes: {
        rooms: '9f18013711ca674df7001582e32582771dc05b22df91c6b72ea5a302814c0a12',
        'walk-paths': 'acc974dcb55ec609381b246e9a6bbc7560859d0f07ea23f3148a29db3a3b7ee3',
        walls: 'b0f2ac169e0c30ad8bc1b6cc47ddffc8bf1524eed2b5cbbe4ac72d361007c442',
        objects: 'c808b29a321537ad5109385e600fd8df427894cf162038226d76647d065d72b8',
        doors: 'ac0f07f96742cff63692a548c53b1f37170aaa539c47fadbe2e4c496b99d4d7f',
        'door-lights': 'c24b6492ce6c637144a4dfb2802720b678276cad994586d643df9fe1ca493058',
        computers: '20514e88efd2ae8a456b7949963e1ffa3d0221f355f42d3c88fcff77d9a47166',
        'chairs-standing-desks': '08e3a65f22351a4f0d76d24b5f23f8082b721f0bfc7880f794a64cd0b23f4f38',
        'interactive-objects': '6dbb3c891f4107d12bd05fc847fa0f8a7a3c5a481a82b00bbb18f7382f86847a',
    },
    productionImageHash: 'aa0ff821d5530e8ee1be3c1de733d0bff4bb74767a0ba27e48a141abf784d026',
    embeddedImageHash: '9513850ce99814aee3b10bd1c64670e10b72e9ebd03b66960bff420e14558dea',
} as const;

export const RESIDUAL_THRESHOLDS = { maximum: 8, mean: 4, rms: 5 } as const;

function canonical(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical((value as Record<string, unknown>)[key])]));
    }
    return value;
}

async function checksum(value: unknown): Promise<string> {
    const bytes = new TextEncoder().encode(JSON.stringify(canonical(value)));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map(item => item.toString(16).padStart(2, '0')).join('');
}

export function buildCandidateExport(landmarks: readonly RegistrationLandmark[], fit: RegistrationFit | null, manual: UniformRegistration) {
    const transform = fit ? { scale: fit.scale, offsetX: fit.offsetX, offsetY: fit.offsetY } : manual;
    const residuals = fit ? landmarkResiduals(landmarks, transform) : [];
    return {
        schemaVersion: 2,
        status: 'candidate-unverified',
        approved: false,
        source: FLOOR1_SOURCE,
        transform,
        landmarks: landmarks.map(landmark => {
            const residual = residuals.find(value => value.id === landmark.id);
            return { ...landmark, residual: residual ? { x: residual.x, y: residual.y, distance: residual.distance } : null };
        }),
        residuals: fit ? { maximum: fit.maximumResidual, mean: fit.meanResidual, rms: fit.rmsResidual, thresholds: RESIDUAL_THRESHOLDS } : null,
        coverage: assessDistributedCoverage(landmarks),
    };
}

export async function buildApprovedExport(candidate: ReturnType<typeof buildCandidateExport>, reviewerId: string, reviews: unknown, navigation: unknown) {
    if (!candidate.residuals || !candidate.coverage.passed) throw new Error('Objective registration requirements are not satisfied.');
    if (!reviewerId.trim()) throw new Error('Reviewer identity is required.');
    const payload = {
        ...candidate,
        status: 'approved',
        approved: true,
        reviewer: { id: reviewerId.trim(), approvedAt: new Date().toISOString() },
        reviews,
        navigation,
    };
    return { ...payload, checksum: await checksum(payload) };
}

