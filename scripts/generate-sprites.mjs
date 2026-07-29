import { generateSprites } from './sprites/core.mjs';

const result = await generateSprites();
process.stdout.write(`Generated ${result.manifest.assets.length} validated runtime sprite sheets.\n`);
