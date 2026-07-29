import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile, copyFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONFIG_PATH = join(REPO_ROOT, 'config', 'sprite-sources.json');
const ARTIFACT_RELATIVE = join('artifacts', 'sprite-inventory');
const GENERATED_RELATIVE = join('public', 'assets', 'office', 'sprites', 'generated');
const PROFILE_IDS = ['jarvis', 'atlas', 'scout', 'archive', 'sentinel'];

function assertInside(root, target, label) {
  const rel = relative(resolve(root), resolve(target));
  if (rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel))) return;
  throw new Error(`${label} escapes the allowed root.`);
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  }
  return value;
}

export function canonicalJson(value) {
  return `${JSON.stringify(canonical(value), null, 2)}\n`;
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decodePng(bytes, sourcePath) {
  if (bytes.length < 33 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error(`${sourcePath}: malformed PNG signature.`);
  }
  let offset = 8;
  let header;
  const idat = [];
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const end = offset + 12 + length;
    if (end > bytes.length) throw new Error(`${sourcePath}: truncated ${type} chunk.`);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        compression: data[10],
        filter: data[11],
        interlace: data[12],
      };
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset = end;
  }
  if (!header || idat.length === 0) throw new Error(`${sourcePath}: missing IHDR or IDAT.`);
  if (header.width <= 0 || header.height <= 0 || header.bitDepth !== 8 || header.interlace !== 0) {
    throw new Error(`${sourcePath}: only positive, non-interlaced, 8-bit PNGs are supported.`);
  }
  const channelsByType = { 0: 1, 2: 3, 4: 2, 6: 4 };
  const channels = channelsByType[header.colorType];
  if (!channels) throw new Error(`${sourcePath}: unsupported PNG color type ${header.colorType}.`);
  const stride = header.width * channels;
  const inflated = inflateSync(Buffer.concat(idat));
  const expected = (stride + 1) * header.height;
  if (inflated.length !== expected) throw new Error(`${sourcePath}: decoded byte length is inconsistent.`);
  const scanlines = Buffer.alloc(stride * header.height);
  for (let y = 0; y < header.height; y += 1) {
    const filter = inflated[y * (stride + 1)];
    const sourceStart = y * (stride + 1) + 1;
    const rowStart = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const raw = inflated[sourceStart + x];
      const left = x >= channels ? scanlines[rowStart + x - channels] : 0;
      const above = y > 0 ? scanlines[rowStart - stride + x] : 0;
      const upperLeft = y > 0 && x >= channels ? scanlines[rowStart - stride + x - channels] : 0;
      let value;
      if (filter === 0) value = raw;
      else if (filter === 1) value = raw + left;
      else if (filter === 2) value = raw + above;
      else if (filter === 3) value = raw + Math.floor((left + above) / 2);
      else if (filter === 4) value = raw + paeth(left, above, upperLeft);
      else throw new Error(`${sourcePath}: unsupported PNG filter ${filter}.`);
      scanlines[rowStart + x] = value & 255;
    }
  }
  const rgba = Buffer.alloc(header.width * header.height * 4);
  for (let i = 0, pixel = 0; i < scanlines.length; i += channels, pixel += 4) {
    if (header.colorType === 6) {
      rgba[pixel] = scanlines[i];
      rgba[pixel + 1] = scanlines[i + 1];
      rgba[pixel + 2] = scanlines[i + 2];
      rgba[pixel + 3] = scanlines[i + 3];
    } else if (header.colorType === 4) {
      rgba[pixel] = scanlines[i];
      rgba[pixel + 1] = scanlines[i];
      rgba[pixel + 2] = scanlines[i];
      rgba[pixel + 3] = scanlines[i + 1];
    } else if (header.colorType === 2) {
      rgba[pixel] = scanlines[i];
      rgba[pixel + 1] = scanlines[i + 1];
      rgba[pixel + 2] = scanlines[i + 2];
      rgba[pixel + 3] = 255;
    } else {
      rgba[pixel] = scanlines[i];
      rgba[pixel + 1] = scanlines[i];
      rgba[pixel + 2] = scanlines[i];
      rgba[pixel + 3] = 255;
    }
  }
  return { ...header, rgba };
}

function rgbaAt(decoded, x, y) {
  const i = (y * decoded.width + x) * 4;
  return [decoded.rgba[i], decoded.rgba[i + 1], decoded.rgba[i + 2], decoded.rgba[i + 3]];
}

function inspectPixels(decoded) {
  let minX = decoded.width;
  let minY = decoded.height;
  let maxX = -1;
  let maxY = -1;
  let alphaUsed = false;
  let fullyOpaque = true;
  for (let y = 0; y < decoded.height; y += 1) {
    for (let x = 0; x < decoded.width; x += 1) {
      const alpha = decoded.rgba[(y * decoded.width + x) * 4 + 3];
      if (alpha !== 255) fullyOpaque = false;
      if (alpha !== 0) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
      if (alpha > 0 && alpha < 255) alphaUsed = true;
    }
  }
  const first = rgbaAt(decoded, 0, 0);
  let borderUniform = true;
  const matches = (x, y) => rgbaAt(decoded, x, y).every((value, i) => value === first[i]);
  for (let x = 0; x < decoded.width && borderUniform; x += 1) {
    borderUniform = matches(x, 0) && matches(x, decoded.height - 1);
  }
  for (let y = 0; y < decoded.height && borderUniform; y += 1) {
    borderUniform = matches(0, y) && matches(decoded.width - 1, y);
  }
  return {
    alphaUsed,
    fullyOpaque,
    contentBounds: maxX < 0 ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
    uniformBorderColor: borderUniform ? { r: first[0], g: first[1], b: first[2], a: first[3] } : null,
  };
}

export function inspectPngBytes(bytes, sourcePath = 'memory.png') {
  const decoded = decodePng(bytes, sourcePath);
  return {
    width: decoded.width,
    height: decoded.height,
    bitDepth: decoded.bitDepth,
    colorType: decoded.colorType,
    alphaChannelPresent: decoded.colorType === 4 || decoded.colorType === 6,
    ...inspectPixels(decoded),
  };
}

export function markDuplicateRecords(records) {
  const firstByHash = new Map();
  return records.map(record => {
    const duplicateOf = firstByHash.get(record.sha256) ?? null;
    if (!duplicateOf) firstByHash.set(record.sha256, record.id);
    return { ...record, duplicateOf };
  });
}

async function loadConfig() {
  const parsed = JSON.parse(await readFile(CONFIG_PATH, 'utf8'));
  if (parsed.version !== 1 || !Array.isArray(parsed.sources)) throw new Error('Unsupported sprite source configuration.');
  return parsed;
}

export async function buildInventory() {
  const config = await loadConfig();
  const records = [];
  const ids = new Set();
  for (const source of config.sources) {
    if (ids.has(source.id)) throw new Error(`Duplicate source ID: ${source.id}`);
    ids.add(source.id);
    if (typeof source.path !== 'string' || isAbsolute(source.path)) throw new Error(`${source.id}: invalid source path.`);
    const absolute = resolve(REPO_ROOT, source.path);
    assertInside(REPO_ROOT, absolute, `${source.id} source path`);
    const bytes = await readFile(absolute);
    const decoded = decodePng(bytes, source.path);
    const pixels = inspectPixels(decoded);
    const blockingIssues = [...(source.blockingIssues ?? [])];
    let frameWidth = null;
    let frameHeight = null;
    if (source.rows !== undefined || source.columns !== undefined) {
      if (!Number.isInteger(source.rows) || !Number.isInteger(source.columns) || source.rows <= 0 || source.columns <= 0) {
        blockingIssues.push('Declared rows and columns must be positive integers.');
      } else if (decoded.width % source.columns !== 0 || decoded.height % source.rows !== 0) {
        blockingIssues.push('Declared grid does not divide source dimensions exactly.');
      } else {
        frameWidth = decoded.width / source.columns;
        frameHeight = decoded.height / source.rows;
      }
    }
    if (source.status === 'production_candidate' && decoded.colorType !== 4 && decoded.colorType !== 6) {
      blockingIssues.push('Production sprite does not contain a PNG alpha channel.');
    }
    if (source.status === 'production_candidate' && pixels.fullyOpaque) {
      blockingIssues.push('Production sprite is fully opaque.');
    }
    const approvedForGeneration = source.status === 'production_candidate' && blockingIssues.length === 0;
    records.push({
      id: source.id,
      path: source.path.replaceAll('\\', '/'),
      kind: source.kind,
      sha256: sha256(bytes),
      fileSize: bytes.length,
      fileType: 'image/png',
      colorMode: ({ 0: 'grayscale', 2: 'rgb', 4: 'grayscale-alpha', 6: 'rgba' })[decoded.colorType],
      bitDepth: decoded.bitDepth,
      width: decoded.width,
      height: decoded.height,
      alphaChannelPresent: decoded.colorType === 4 || decoded.colorType === 6,
      alphaUsed: pixels.alphaUsed,
      fullyOpaque: pixels.fullyOpaque,
      opaqueBackgroundStatus: pixels.fullyOpaque ? 'opaque' : 'transparent-or-translucent',
      contentBounds: pixels.contentBounds,
      uniformBorderColor: pixels.uniformBorderColor,
      proposedRows: source.rows ?? null,
      proposedColumns: source.columns ?? null,
      proposedFrameWidth: frameWidth,
      proposedFrameHeight: frameHeight,
      frameCount: frameWidth && frameHeight ? source.rows * source.columns : null,
      embeddedMarkings: source.embeddedMarkings === true,
      status: approvedForGeneration ? 'production_candidate' : source.status,
      confidence: approvedForGeneration ? 'deterministic' : 'explicitly_blocked',
      blockingIssues,
      duplicateOf: null,
      generatedAssetDestination: approvedForGeneration
        ? `public/assets/office/sprites/generated/${source.id}.png`
        : null,
      manifestAssociation: approvedForGeneration ? source.id : null,
    });
  }
  const recordsWithDuplicates = markDuplicateRecords(records);
  const counts = {
    total: recordsWithDuplicates.length,
    productionCandidates: recordsWithDuplicates.filter(record => record.status === 'production_candidate').length,
    provisional: recordsWithDuplicates.filter(record => record.status === 'source_reference_only').length,
    blocked: recordsWithDuplicates.filter(record => record.status === 'unusable_without_manual_editing').length,
    duplicates: recordsWithDuplicates.filter(record => record.duplicateOf !== null).length,
  };
  return {
    schemaVersion: 1,
    generatedBy: 'scripts/sprites/core.mjs',
    sourceRoot: '.',
    counts,
    records: recordsWithDuplicates,
  };
}

function inventoryMarkdown(inventory) {
  const lines = [
    '# Sprite source inventory',
    '',
    '> Canonical generated evidence. Source artwork is never modified.',
    '',
    `- Total sources: ${inventory.counts.total}`,
    `- Production candidates: ${inventory.counts.productionCandidates}`,
    `- Source/reference only: ${inventory.counts.provisional}`,
    `- Blocked/manual edit: ${inventory.counts.blocked}`,
    `- Duplicate contents: ${inventory.counts.duplicates}`,
    '',
    '| ID | Source | Dimensions | Alpha | Grid | Status | Blockers |',
    '|---|---|---:|---|---:|---|---|',
  ];
  for (const record of inventory.records) {
    const grid = record.proposedRows && record.proposedColumns
      ? `${record.proposedColumns}×${record.proposedRows} @ ${record.proposedFrameWidth ?? '?'}×${record.proposedFrameHeight ?? '?'}`
      : 'not proven';
    lines.push(`| ${record.id} | \`${record.path}\` | ${record.width}×${record.height} | ${record.alphaChannelPresent ? (record.fullyOpaque ? 'present, unused' : 'used') : 'none'} | ${grid} | ${record.status} | ${record.blockingIssues.join('<br>') || '—'} |`);
  }
  lines.push('', '## Promotion boundary', '', 'Only deterministic production candidates are copied into the generated runtime directory. The generated checksum must equal the inspected source checksum. Compass directions are not claimed because no authoritative row-direction metadata is committed.', '');
  return lines.join('\n');
}

export async function writeInventory(root = REPO_ROOT) {
  const inventory = await buildInventory();
  const directory = join(root, ARTIFACT_RELATIVE);
  assertInside(root, directory, 'inventory output');
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'sprite-inventory.json'), canonicalJson(inventory));
  await writeFile(join(directory, 'sprite-inventory.md'), inventoryMarkdown(inventory));
  return inventory;
}

function runtimeManifest(inventory) {
  const assets = inventory.records
    .filter(record => record.status === 'production_candidate' && record.blockingIssues.length === 0)
    .map(record => ({
      id: record.id,
      sourceAssetReference: record.path,
      generatedAssetUrl: `assets/office/sprites/generated/${record.id}.png`,
      sourceChecksum: record.sha256,
      generatedChecksum: record.sha256,
      frameWidth: record.proposedFrameWidth,
      frameHeight: record.proposedFrameHeight,
      frameCount: record.frameCount,
      rows: record.proposedRows,
      columns: record.proposedColumns,
      anchor: { x: 0.5, y: 0.94 },
      visualScale: 1,
      pixelArt: true,
      availability: 'available',
      approval: 'approved',
      blockingReason: null,
      agentProfileCompatibility: PROFILE_IDS,
      classification: 'agent',
      authoredDirections: ['none'],
      horizontalFlipDirections: [],
      clips: [
        {
          id: `${record.id}:idle`,
          state: 'idle',
          direction: 'none',
          frames: [0],
          framesPerSecond: 1,
          loop: false,
          repeatDelayMs: 0,
          yoyo: false,
          reducedMotionFallbackFrame: 0,
          staticFallbackFrame: 0,
        },
        {
          id: `${record.id}:walking`,
          state: 'walking',
          direction: 'none',
          frames: [0, 1, 2, 3, 4, 5],
          framesPerSecond: 8,
          loop: true,
          repeatDelayMs: 0,
          yoyo: false,
          reducedMotionFallbackFrame: 0,
          staticFallbackFrame: 0,
        }
      ],
    }));
  return {
    schemaVersion: 1,
    generatedBy: 'scripts/sprites/core.mjs',
    fallbackGraph: {
      idle: null,
      walking: 'idle',
      working: 'idle',
      thinking: 'idle',
      reviewing: 'working',
      waiting: 'idle',
      blocked: 'idle',
      error: 'idle',
      offline: null,
    },
    assets,
    blockedAssets: inventory.records
      .filter(record => record.status !== 'production_candidate')
      .map(record => ({
        id: record.id,
        sourceAssetReference: record.path,
        availability: 'blocked',
        approval: 'provisional',
        blockingReason: record.blockingIssues.join(' '),
      })),
  };
}

async function replaceDirectoryAtomically(staging, destination) {
  const parent = dirname(destination);
  const backup = join(parent, `.generated-backup-${process.pid}-${Date.now()}`);
  assertInside(parent, staging, 'staging directory');
  assertInside(parent, destination, 'generated destination');
  let hadDestination = false;
  try {
    await stat(destination);
    hadDestination = true;
  } catch {
    hadDestination = false;
  }
  if (hadDestination) await rename(destination, backup);
  try {
    await rename(staging, destination);
    if (hadDestination) await rm(backup, { recursive: true, force: true });
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    if (hadDestination) await rename(backup, destination);
    throw error;
  }
}

export async function generateSprites(root = REPO_ROOT, options = {}) {
  const inventory = await writeInventory(root);
  const destination = join(root, GENERATED_RELATIVE);
  const parent = dirname(destination);
  const staging = join(parent, `.generated-stage-${process.pid}-${Date.now()}`);
  assertInside(root, destination, 'generated destination');
  assertInside(parent, staging, 'generated staging');
  await mkdir(staging, { recursive: true });
  try {
    let copiedCount = 0;
    for (const record of inventory.records.filter(item => item.status === 'production_candidate' && item.blockingIssues.length === 0)) {
      const source = resolve(REPO_ROOT, record.path);
      const output = join(staging, `${record.id}.png`);
      await copyFile(source, output);
      copiedCount += 1;
      if (options.failAfterCopies === copiedCount) throw new Error('Injected generation failure.');
      const copied = await readFile(output);
      if (sha256(copied) !== record.sha256) throw new Error(`${record.id}: generated checksum mismatch.`);
    }
    await writeFile(join(staging, 'manifest.json'), canonicalJson(runtimeManifest(inventory)));
    await replaceDirectoryAtomically(staging, destination);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
  return { inventory, manifest: runtimeManifest(inventory) };
}

async function fileMap(directory) {
  const map = new Map();
  const visit = async current => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const absolute = join(current, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else map.set(relative(directory, absolute).replaceAll('\\', '/'), sha256(await readFile(absolute)));
    }
  };
  await visit(directory);
  return map;
}

export async function compareTrees(expected, actual) {
  const expectedMap = await fileMap(expected);
  const actualMap = await fileMap(actual);
  const keys = [...new Set([...expectedMap.keys(), ...actualMap.keys()])].sort();
  return keys.filter(key => expectedMap.get(key) !== actualMap.get(key));
}

export const paths = { REPO_ROOT, ARTIFACT_RELATIVE, GENERATED_RELATIVE };
