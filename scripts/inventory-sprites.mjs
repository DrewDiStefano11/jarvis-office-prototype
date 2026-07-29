import { writeInventory } from './sprites/core.mjs';

const inventory = await writeInventory();
process.stdout.write(`Sprite inventory: ${inventory.counts.total} sources, ${inventory.counts.productionCandidates} production candidates, ${inventory.counts.provisional} reference-only, ${inventory.counts.blocked} blocked.\n`);
