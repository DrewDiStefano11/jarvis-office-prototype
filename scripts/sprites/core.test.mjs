import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildInventory,
  canonicalJson,
  compareTrees,
  generateSprites,
  inspectPngBytes,
  markDuplicateRecords,
  paths,
} from './core.mjs';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

describe('sprite inventory and generation', () => {
  it('inspects committed PNG dimensions, transparency, bounds, and uniform borders', async () => {
    const bytes = await readFile(join(paths.REPO_ROOT, 'd85660f4-dd62-4dbc-baa6-7ccd75361bf0.png'));
    const inspected = inspectPngBytes(bytes);
    expect(inspected.width).toBe(1086);
    expect(inspected.height).toBe(1448);
    expect(inspected.alphaChannelPresent).toBe(true);
    expect(inspected.fullyOpaque).toBe(false);
    expect(inspected.contentBounds).not.toBeNull();
    expect(inspected.uniformBorderColor).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it('fails malformed images with a concise path and canonicalizes output', () => {
    expect(() => inspectPngBytes(Buffer.from('not png'), 'broken.png')).toThrow(/broken\.png: malformed PNG signature/);
    expect(canonicalJson({ z: 1, a: { y: 2, b: 3 } })).toBe('{\n  "a": {\n    "b": 3,\n    "y": 2\n  },\n  "z": 1\n}\n');
  });

  it('detects duplicate content deterministically', () => {
    expect(markDuplicateRecords([
      { id: 'a', sha256: 'same' },
      { id: 'b', sha256: 'other' },
      { id: 'c', sha256: 'same' },
    ])).toEqual([
      { id: 'a', sha256: 'same', duplicateOf: null },
      { id: 'b', sha256: 'other', duplicateOf: null },
      { id: 'c', sha256: 'same', duplicateOf: 'a' },
    ]);
  });

  it('classifies ambiguous/reference sources without crashing the inventory', async () => {
    const inventory = await buildInventory();
    expect(inventory.counts).toEqual({
      total: 18,
      productionCandidates: 12,
      provisional: 1,
      blocked: 5,
      duplicates: 0,
    });
    expect(inventory.records.find(record => record.id === 'nexus-tube-reference')?.blockingIssues).toContain(
      'The 1254x1254 source is not evenly divisible by the apparent frame rows and columns.',
    );
    expect(inventory.records.find(record => record.id === 'agent-sheet-01')?.frameIntegrity).toMatchObject({
      inspectedFrameCount: 24,
      emptyFrameIndexes: [],
      edgeBleedFrameIndexes: [],
      fragmentedFrameIndexes: [],
    });
    expect(inventory.records.find(record => record.id === 'agent-sheet-05')?.blockingIssues).toContain(
      'Authored directional frames contain multiple major disconnected body regions: 12, 13, 14, 15, 16, 17.',
    );
    expect(inventory.records.find(record => record.id === 'agent-sheet-12')?.runtimeCapability).toBe('quarantined-fallback-only');
  }, 30_000);

  it('is deterministic, removes stale files, and preserves source bytes', async () => {
    const rootA = await mkdtemp(join(tmpdir(), 'sprite-generation-a-'));
    const rootB = await mkdtemp(join(tmpdir(), 'sprite-generation-b-'));
    const sourcePath = join(paths.REPO_ROOT, 'd85660f4-dd62-4dbc-baa6-7ccd75361bf0.png');
    const before = sha256(await readFile(sourcePath));
    try {
      await generateSprites(rootA);
      await generateSprites(rootB);
      expect(await compareTrees(join(rootA, paths.GENERATED_RELATIVE), join(rootB, paths.GENERATED_RELATIVE))).toEqual([]);
      await writeFile(join(rootA, paths.GENERATED_RELATIVE, 'stale.txt'), 'stale');
      await generateSprites(rootA);
      expect(await readdir(join(rootA, paths.GENERATED_RELATIVE))).not.toContain('stale.txt');
      expect(sha256(await readFile(sourcePath))).toBe(before);
    } finally {
      await rm(rootA, { recursive: true, force: true });
      await rm(rootB, { recursive: true, force: true });
    }
  }, 30_000);

  it('cleans partial staging and preserves the last valid output on failure', async () => {
    const root = await mkdtemp(join(tmpdir(), 'sprite-generation-failure-'));
    try {
      await generateSprites(root);
      const inventoryPath = join(root, paths.ARTIFACT_RELATIVE, 'sprite-inventory.json');
      const manifestPath = join(root, paths.GENERATED_RELATIVE, 'manifest.json');
      await writeFile(inventoryPath, 'last valid inventory\n');
      await writeFile(manifestPath, 'last valid runtime\n');
      await expect(generateSprites(root, { failAfterCopies: 2 })).rejects.toThrow('Injected generation failure.');
      expect(await readFile(inventoryPath, 'utf8')).toBe('last valid inventory\n');
      expect(await readFile(manifestPath, 'utf8')).toBe('last valid runtime\n');
      await expect(generateSprites(root, { failAfterPublishes: 1 })).rejects.toThrow('Injected transactional publish failure.');
      expect(await readFile(inventoryPath, 'utf8')).toBe('last valid inventory\n');
      expect(await readFile(manifestPath, 'utf8')).toBe('last valid runtime\n');
      expect((await readdir(join(root, 'artifacts'))).some(name => name.startsWith('.sprite-inventory-stage-'))).toBe(false);
      expect((await readdir(join(root, 'public', 'assets', 'office', 'sprites'))).some(name => name.startsWith('.generated-stage-'))).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 30_000);
});
