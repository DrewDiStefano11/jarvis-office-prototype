import { promoteProduction, registerCandidate } from './floor1/core.mjs';
const production = process.argv.includes('--production');
const approvalIndex = process.argv.indexOf('--approval');
const artifactPath = approvalIndex >= 0 ? process.argv[approvalIndex + 1] : undefined;
console.log(JSON.stringify(production ? promoteProduction({ artifactPath }) : registerCandidate(), null, 2));
