import { spawnSync } from 'node:child_process';
import './generate-floor1-all.mjs';

const paths = ['src/office/data/floor1', 'artifacts/production-floor1'];
const result = spawnSync('git', ['diff', '--exit-code', '--', ...paths], { encoding: 'utf8', shell: false });
if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error('Committed Floor 1 generated artifacts have drifted. Run npm run generate:floor1 and commit the result.');
}
console.log('Floor 1 generated artifacts match committed output.');
