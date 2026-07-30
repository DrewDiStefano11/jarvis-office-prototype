import fs from 'fs';

const filePath = 'src/office/floor1/navigation/candidateNavigation.ts';
let content = fs.readFileSync(filePath, 'utf-8');

content = content.replace(
    'instrumentation?: CandidateGraphBuildInstrumentation;',
    'instrumentation?: CandidateGraphBuildInstrumentation;\n    mode?: \'strict-review\' | \'unverified-sandbox\';'
);

content = content.replace(
    'unavailableReason?: string;',
    'unavailableReason?: string;\n    verificationMode?: \'reviewed\' | \'unverified-sandbox\';'
);

content = content.replace(
    'return { rooms: [], doors: [], agents: [], destinations: [], colliders: [], walkNodes: [], walkSegments: [], roomDiagnostics: [reason], nodeCount: 0, edgeCount: 0, navigationAvailable: false, unavailableReason: reason };',
    'return { rooms: [], doors: [], agents: [], destinations: [], colliders: [], walkNodes: [], walkSegments: [], roomDiagnostics: [reason], nodeCount: 0, edgeCount: 0, navigationAvailable: false, unavailableReason: reason, verificationMode: undefined };'
);

content = content.replace(
    'export function validateMarkupRegistration(registration: MarkupRegistration | null | undefined): string | null {',
    'export function validateCandidateSandboxRegistration(registration: MarkupRegistration | null | undefined): string | null {\n    // Disable process env check for this patch to let browser bundler handle it\n    const shapeFailure = validateRegistrationShape(registration);\n    if (shapeFailure) return shapeFailure;\n    if (!registration) return \'Candidate navigation unavailable: Floor 1 markup registration is missing.\';\n    if (registration.productionApproved !== false) return \'Candidate navigation unavailable: Floor 1 candidate registration crossed the production boundary.\';\n    if (!registration.provenance?.generator || !registration.provenance.generatedArtifact || registration.provenance.sourceEvidence.length === 0) return \'Candidate navigation unavailable: Floor 1 candidate registration provenance is missing.\';\n    return null;\n}\n\nexport function validateMarkupRegistration(registration: MarkupRegistration | null | undefined): string | null {'
);

content = content.replace(
    'const registrationFailure = validateCandidateReviewRegistration(registration);',
    'const mode = options.mode ?? \'strict-review\';\n    const registrationFailure = mode === \'strict-review\'\n        ? validateCandidateReviewRegistration(registration)\n        : validateCandidateSandboxRegistration(registration);'
);

content = content.replace(
    'edgeCount: doors.length + walkSegments.length,\n        navigationAvailable: true,\n    };',
    'edgeCount: doors.length + walkSegments.length,\n        navigationAvailable: true,\n        verificationMode: mode === \'strict-review\' ? \'reviewed\' : \'unverified-sandbox\',\n    };'
);

content = content.replace(
    'edgeCount: 0,\n        navigationAvailable: true,\n    } satisfies CandidateNavigationGraph;',
    'edgeCount: 0,\n        navigationAvailable: true,\n        verificationMode: mode === \'strict-review\' ? \'reviewed\' : \'unverified-sandbox\',\n    } satisfies CandidateNavigationGraph;'
);

fs.writeFileSync(filePath, content);
