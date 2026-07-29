import { readFile, readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const root = resolve('.');
const output = join(root, 'dist');
const forbiddenMarkers = [
  'Agent sprite laboratory',
  'Inventory summary',
  'sprite-inventory.json',
  'Sprite demonstration',
  'spriteDemo',
  'agent-sprite-layer',
  'demo-agent__label',
  'Candidate navigation',
  'floor1-candidate-simulation',
  'floor1-review-agent',
  'Candidate routes validate static world collisions only',
  'provisionalSpriteAssignment',
  'candidateNavigation',
  'Destination category',
  'Walk-path and door graph nodes',
  'Route segment intersects candidate object collision geometry',
  'object:objects-053:path:01',
  'floor1-candidate-agent',
  'Search destinations',
  'start_connector_unsupported',
  'destination_connector_unsupported',
  'route_leaves_walkable_geometry',
  'footprint overlaps',
  'candidate agent footprint',
  'ROOM_MAIN_CONNECTING_WALKWAY',
  'POSITION_117',
  'width: clamp(320px, 34vw, 480px)',
  'destination_access_restricted',
  'approachPositionId',
  'markerPoint',
  'requires a priority review agent',
  'Computer 022',
];
const searchableExtensions = new Set(['.css', '.html', '.js', '.json', '.map']);
const matches = [];

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(absolute);
      continue;
    }
    const extension = entry.name.slice(entry.name.lastIndexOf('.'));
    if (!searchableExtensions.has(extension)) continue;
    const content = await readFile(absolute, 'utf8');
    for (const marker of forbiddenMarkers) {
      if (content.includes(marker)) {
        matches.push(`${relative(output, absolute).replaceAll('\\', '/')}: ${marker}`);
      }
    }
  }
}

try {
  await visit(output);
} catch (error) {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
    throw new Error('Production bundle is missing. Run npm run build first.');
  }
  throw error;
}

if (matches.length > 0) {
  throw new Error(`Development-only sprite review surface leaked into production:\n${matches.join('\n')}`);
}

process.stdout.write('Production bundle excludes development-only sprite lab, demo, and Floor 1 candidate navigation markers.\n');
