import {
    auditAll, classifyAll, extractAll, generateArtifactManifest,
    generateEvidence, registerCandidate,
} from './floor1/core.mjs';

auditAll();
extractAll();
classifyAll();
registerCandidate();
generateEvidence();
const manifest = generateArtifactManifest();
console.log(JSON.stringify({ generatedFiles: manifest.totals.fileCount, byteSize: manifest.totals.byteSize }));
