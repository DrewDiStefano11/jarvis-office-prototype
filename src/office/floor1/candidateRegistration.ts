import type { MarkupRegistration } from './navigation/candidateNavigation';

export const FLOOR1_CANDIDATE_REGISTRATION: MarkupRegistration = {
    sourceWidth: 8192,
    sourceHeight: 5460,
    markupWidth: 6144,
    markupHeight: 4096,
    scale: 1.3333333333333333,
    offsetX: 0,
    offsetY: -0.6666666666665151,
    rotationDegrees: 0,
    status: 'unverified',
    approvalStatus: 'candidate_unverified',
    storedCoordinateSpace: 'registered_candidate_source',
    productionApproved: false,
    registrationLandmarks: [],
    maximumResidualErrorPixels: Number.POSITIVE_INFINITY,
    provenance: {
        generator: 'scripts/generate-floor1-all.mjs',
        generatedArtifact: 'src/office/data/floor1/provisional/*.json',
        sourceEvidence: [
            'artifacts/production-floor1/registration-candidate.json',
            'artifacts/production-floor1/generated-artifact-manifest.json',
            'src/office/data/floor1/provisional/*.json',
        ],
    },
};
