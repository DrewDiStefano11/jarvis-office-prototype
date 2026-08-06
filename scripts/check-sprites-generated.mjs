import { mkdtemp, readFile, rm } from 'node:fs/promises';
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
    if (process.argv.includes('--diagnose')) {
      for (const [expectedRoot, actualRoot] of comparisons) {
        for (const file of ['manifest.json', 'sprite-inventory.json', 'sprite-inventory.md']) {
          try {
            const expected = (await readFile(join(expectedRoot, file), 'utf8')).split(/\r?\n/);
            const actual = (await readFile(join(actualRoot, file), 'utf8')).split(/\r?\n/);
            const differences = [];
            for (let index = 0; index < Math.max(expected.length, actual.length) && differences.length < 4; index += 1) {
              if (expected[index] !== actual[index]) differences.push({ line: index + 1, expected: expected[index], actual: actual[index] });
            }
            if (differences.length > 0) process.stderr.write(`${file}: ${JSON.stringify(differences)}\n`);
          } catch { /* file belongs to the other generated tree */ }
        }
      }
    }
    process.exitCode = 1;
  } else {
    process.stdout.write('Generated sprite artifacts are current.\n');
  }
} finally {
  await rm(temp, { recursive: true, force: true });
}
