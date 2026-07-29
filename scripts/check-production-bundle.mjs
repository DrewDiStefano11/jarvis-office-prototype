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

process.stdout.write('Production bundle excludes development-only sprite lab and demo markers.\n');
