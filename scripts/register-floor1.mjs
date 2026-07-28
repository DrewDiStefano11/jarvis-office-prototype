import { promoteProduction, registerCandidate } from './floor1/core.mjs';
const production = process.argv.includes('--production');
console.log(JSON.stringify(production ? promoteProduction() : registerCandidate(), null, 2));
