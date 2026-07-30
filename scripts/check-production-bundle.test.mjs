import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { checkProductionBundle, findProductionBundleMarkerMatches } from './check-production-bundle.mjs';

let roots = [];

async function bundle(files) {
  const root = await mkdtemp(join(tmpdir(), 'production-bundle-'));
  roots.push(root);
  for (const [name, content] of Object.entries(files)) {
    const path = join(root, name);
    await mkdir(path.slice(0, path.lastIndexOf('/')), { recursive: true });
    await writeFile(path, content, 'utf8');
  }
  return root;
}

afterEach(async () => {
  await Promise.all(roots.map(root => rm(root, { recursive: true, force: true })));
  roots = [];
});

describe('production bundle marker checks', () => {
  it('allows stable production IDs and generic route fields', async () => {
    const root = await bundle({
      'assets/app.js': 'INTERACTIVE_MAIN_ROBOT_TUBE ROOM_RM4 ROOM_MAIN_CONNECTING_WALKWAY POSITION_117 markerPoint approachPositionId doorSteps automatic_open waiting_for_door approachResolution',
    });
    await expect(checkProductionBundle(root)).resolves.toBeUndefined();
  });

  it('rejects candidate-only review UI, fixture, query, and module markers deterministically', async () => {
    const root = await bundle({
      'assets/a.js': 'floor1-candidate-agent floor1-candidate-agent floor1-review-agent- ?floor1Review=candidate',
      'assets/nested/b.css': '.floor1-candidate-simulation{}',
      'assets/c.map': 'src/office/floor1/navigation/candidateNavigation src/components/office/Floor1CandidateSimulation',
      'assets/d.txt': 'floor1-candidate-agent ignored extension',
    });
    await expect(checkProductionBundle(root)).rejects.toThrow('Development-only sprite review surface leaked into production');
    await expect(findProductionBundleMarkerMatches(root)).resolves.toEqual([
      'assets/a.js: ?floor1Review=candidate',
      'assets/a.js: floor1-candidate-agent',
      'assets/a.js: floor1-review-agent-',
      'assets/c.map: src/components/office/Floor1CandidateSimulation',
      'assets/c.map: src/office/floor1/navigation/candidateNavigation',
      'assets/nested/b.css: floor1-candidate-simulation',
    ]);
  });

  it('still rejects sprite lab and demo markers', async () => {
    const root = await bundle({ 'index.html': 'Agent sprite laboratory Sprite demonstration spriteDemo' });
    const matches = await findProductionBundleMarkerMatches(root);
    expect(matches).toContain('index.html: Agent sprite laboratory');
    expect(matches).toContain('index.html: Sprite demonstration');
    expect(matches).toContain('index.html: spriteDemo');
  });

  it('reports a clear missing bundle failure', async () => {
    const root = join(tmpdir(), `missing-production-bundle-${Date.now()}`);
    await expect(checkProductionBundle(root)).rejects.toThrow('Production bundle is missing. Run npm run build first.');
  });
});
