/* global process */
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative, resolve } from 'node:path';

export const spriteReviewOnlyMarkers = [
  'Agent sprite laboratory',
  'Inventory summary',
  'sprite-inventory.json',
  'Sprite demonstration',
  'spriteDemo',
  'agent-sprite-layer',
  'demo-agent__label',
];

export const floor1CandidateOnlyMarkers = [
  'floor1-candidate-simulation',
  'floor1-candidate-agent',
  'floor1-review-agent-',
  'Candidate navigation review controls',
  'Candidate routes validate static world collisions only',
  '?floor1Review=candidate',
  'src/components/office/Floor1CandidateSimulation',
  'src/office/floor1/navigation/candidateNavigation',
  'src/office/floor1/candidateRegistration',
  'provisionalSpriteAssignment',
];

export const forbiddenMarkers = [...spriteReviewOnlyMarkers, ...floor1CandidateOnlyMarkers];
export const searchableExtensions = new Set(['.css', '.html', '.js', '.json', '.map']);

async function visit(directory, outputRoot, markers, matches) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(absolute, outputRoot, markers, matches);
      continue;
    }
    const extensionIndex = entry.name.lastIndexOf('.');
    const extension = extensionIndex >= 0 ? entry.name.slice(extensionIndex) : '';
    if (!searchableExtensions.has(extension)) continue;
    const content = await readFile(absolute, 'utf8');
    for (const marker of markers) {
      if (content.includes(marker)) {
        matches.add(`${relative(outputRoot, absolute).replaceAll('\\', '/')}: ${marker}`);
      }
    }
  }
}

export async function findProductionBundleMarkerMatches(outputRoot, markers = forbiddenMarkers) {
  const matches = new Set();
  await visit(outputRoot, outputRoot, markers, matches);
  return [...matches].sort((a, b) => a.localeCompare(b));
}

export async function checkProductionBundle(outputRoot = resolve('dist')) {
  let matches;
  try {
    matches = await findProductionBundleMarkerMatches(outputRoot);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      throw new Error('Production bundle is missing. Run npm run build first.');
    }
    throw error;
  }

  if (matches.length > 0) {
    throw new Error(`Development-only sprite review surface leaked into production:\n${matches.join('\n')}`);
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  await checkProductionBundle(resolve(process.argv[2] ?? 'dist'));
  process.stdout.write('Production bundle excludes development-only sprite lab, demo, and Floor 1 candidate navigation markers.\n');
}
