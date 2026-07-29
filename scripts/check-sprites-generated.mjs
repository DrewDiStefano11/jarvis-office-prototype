import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compareTrees, generateSprites, paths } from './sprites/core.mjs';

const temp = await mkdtemp(join(tmpdir(), 'jarvis-sprites-'));
try {
  await generateSprites(temp);
  const comparisons = [
    [join(temp, paths.ARTIFACT_RELATIVE), join(paths.REPO_ROOT, paths.ARTIFACT_RELATIVE)],
    [join(temp, paths.GENERATED_RELATIVE), join(paths.REPO_ROOT, paths.GENERATED_RELATIVE)],
  ];
  const drift = [];
  for (const [expected, actual] of comparisons) {
    for (const file of await compareTrees(expected, actual)) drift.push(file);
  }
  if (drift.length > 0) {
    process.stderr.write(`Generated sprite artifacts have drifted: ${[...new Set(drift)].sort().join(', ')}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write('Generated sprite artifacts are current.\n');
  }
} finally {
  await rm(temp, { recursive: true, force: true });
}
