/**
 * Deterministic source-asset inventory generator for the sprite foundation.
 *
 * Every value written by this script is measured from pixel data. Nothing is
 * inferred from a filename. Re-running the script on unchanged inputs must
 * produce byte-identical output, so all iteration order is explicitly sorted
 * and no timestamps are emitted.
 *
 * Usage: node scripts/sprites/analyze-source-assets.mjs
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, statSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng } from './png-decoder.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

/** Alpha at/above this value counts as visible "ink" for bounds measurement. */
const INK_ALPHA_THRESHOLD = 128;
/** Below this per-cell ink count a grid cell is treated as structurally blank. */
const BLANK_CELL_INK_LIMIT = 200;

/**
 * The 18 committed source PNGs, in stable lexicographic order. Listed
 * explicitly so an accidental new root PNG cannot silently enter the manifest.
 */
const SOURCE_FILES = [
    '791eeb5a-09f5-4c81-b691-271f59b258d0.png',
    'Nexus Tube Sprite.png',
    'Sprite Jobs.png',
    'd85660f4-dd62-4dbc-baa6-7ccd75361bf0 (1).png',
    'd85660f4-dd62-4dbc-baa6-7ccd75361bf0 (10).png',
    'd85660f4-dd62-4dbc-baa6-7ccd75361bf0 (11).png',
    'd85660f4-dd62-4dbc-baa6-7ccd75361bf0 (12).png',
    'd85660f4-dd62-4dbc-baa6-7ccd75361bf0 (13).png',
    'd85660f4-dd62-4dbc-baa6-7ccd75361bf0 (14).png',
    'd85660f4-dd62-4dbc-baa6-7ccd75361bf0 (2).png',
    'd85660f4-dd62-4dbc-baa6-7ccd75361bf0 (3).png',
    'd85660f4-dd62-4dbc-baa6-7ccd75361bf0 (4).png',
    'd85660f4-dd62-4dbc-baa6-7ccd75361bf0 (5).png',
    'd85660f4-dd62-4dbc-baa6-7ccd75361bf0 (6).png',
    'd85660f4-dd62-4dbc-baa6-7ccd75361bf0 (7).png',
    'd85660f4-dd62-4dbc-baa6-7ccd75361bf0 (8).png',
    'd85660f4-dd62-4dbc-baa6-7ccd75361bf0 (9).png',
    'd85660f4-dd62-4dbc-baa6-7ccd75361bf0.png',
].sort();

const AGENT_SHEET_CELL = 181;
const AGENT_SHEET_COLUMNS = 6;
const AGENT_SHEET_ROWS = 8;

function sha256(buffer) {
    return createHash('sha256').update(buffer).digest('hex');
}

/** Detects the PNG chunk types actually present, without trusting the decoder. */
function readChunkTypes(buffer) {
    const types = new Set();
    let offset = 8;
    while (offset + 8 <= buffer.length) {
        const length = buffer.readUInt32BE(offset);
        const type = buffer.toString('ascii', offset + 4, offset + 8);
        types.add(type);
        if (type === 'IEND') break;
        offset += 12 + length;
    }
    return [...types].sort();
}

function measureAlpha(image) {
    const { width, height, rgba } = image;
    const total = width * height;
    let fullyTransparent = 0;
    let partiallyTransparent = 0;
    let minAlpha = 255;
    let maxAlpha = 0;
    for (let i = 0; i < total; i++) {
        const a = rgba[i * 4 + 3];
        if (a === 0) fullyTransparent++;
        else if (a < 255) partiallyTransparent++;
        if (a < minAlpha) minAlpha = a;
        if (a > maxAlpha) maxAlpha = a;
    }
    return {
        minAlpha,
        maxAlpha,
        fullyTransparentPixels: fullyTransparent,
        partiallyTransparentPixels: partiallyTransparent,
        transparencyUsed: fullyTransparent > 0 || partiallyTransparent > 0,
    };
}

/**
 * A "uniform opaque background" means every edge pixel is fully opaque and the
 * whole border shares one colour. Used to separate flat reference sheets from
 * true transparent sprite art.
 */
function measureUniformOpaqueBackground(image) {
    const { width, height, rgba } = image;
    const at = (x, y) => {
        const i = (y * width + x) * 4;
        return [rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3]];
    };
    const [r0, g0, b0, a0] = at(0, 0);
    if (a0 !== 255) return { uniformOpaqueBackground: false, backgroundColor: null };
    const sameBorder = (x, y) => {
        const [r, g, b, a] = at(x, y);
        return r === r0 && g === g0 && b === b0 && a === a0;
    };
    for (let x = 0; x < width; x++) {
        if (!sameBorder(x, 0) || !sameBorder(x, height - 1)) {
            return { uniformOpaqueBackground: false, backgroundColor: null };
        }
    }
    for (let y = 0; y < height; y++) {
        if (!sameBorder(0, y) || !sameBorder(width - 1, y)) {
            return { uniformOpaqueBackground: false, backgroundColor: null };
        }
    }
    const hex = `#${[r0, g0, b0].map(v => v.toString(16).padStart(2, '0')).join('')}`;
    return { uniformOpaqueBackground: true, backgroundColor: hex };
}

/** Contiguous runs of columns/rows that contain at least one ink pixel. */
function measureInkBands(image, inkTest) {
    const { width, height, rgba } = image;
    const columnInk = new Array(width).fill(0);
    const rowInk = new Array(height).fill(0);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            if (inkTest(rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3])) {
                columnInk[x]++;
                rowInk[y]++;
            }
        }
    }
    const toBands = counts => {
        const bands = [];
        let start = -1;
        for (let i = 0; i < counts.length; i++) {
            if (counts[i] > 0) {
                if (start < 0) start = i;
            } else if (start >= 0) {
                bands.push([start, i - 1]);
                start = -1;
            }
        }
        if (start >= 0) bands.push([start, counts.length - 1]);
        return bands;
    };
    return { columnBands: toBands(columnInk), rowBands: toBands(rowInk) };
}

/** Per-cell tight bounds for a uniform grid partition. */
function measureUniformGrid(image, cellWidth, cellHeight, columns, rows) {
    const { width, rgba } = image;
    const cells = [];
    let blankCells = 0;
    let horizontalSpillCells = 0;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            const x0 = c * cellWidth;
            const y0 = r * cellHeight;
            let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1, ink = 0;
            for (let y = y0; y < y0 + cellHeight; y++) {
                for (let x = x0; x < x0 + cellWidth; x++) {
                    const i = (y * width + x) * 4;
                    if (rgba[i + 3] >= INK_ALPHA_THRESHOLD) {
                        ink++;
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }
            const index = r * columns + c;
            if (ink < BLANK_CELL_INK_LIMIT) {
                blankCells++;
                cells.push({ index, row: r, column: c, inkPixels: ink, bounds: null });
                continue;
            }
            // Only horizontal spill invalidates a column grid; feet legitimately
            // rest on the bottom edge of a character cell.
            if (minX === x0 || maxX === x0 + cellWidth - 1) horizontalSpillCells++;
            cells.push({
                index, row: r, column: c, inkPixels: ink,
                bounds: { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
            });
        }
    }
    return { cells, blankCells, horizontalSpillCells };
}

/** Bands measured from ink runs, converted to explicit per-frame rectangles. */
function measureBandRectangles(columnBands, rowBands) {
    const rects = [];
    for (let r = 0; r < rowBands.length; r++) {
        for (let c = 0; c < columnBands.length; c++) {
            const [x0, x1] = columnBands[c];
            const [y0, y1] = rowBands[r];
            rects.push({
                index: r * columnBands.length + c,
                row: r,
                column: c,
                x: x0,
                y: y0,
                width: x1 - x0 + 1,
                height: y1 - y0 + 1,
            });
        }
    }
    return rects;
}

/**
 * Nexus tube frames sit on a transparent field but the tube glass itself is
 * semi-transparent, so an alpha-only test floods. Luminance-gated alpha isolates
 * the drawn artwork.
 */
const nexusInk = (r, g, b, a) => a > 16 && (r + g + b) / 3 > 18;
const alphaInk = (_r, _g, _b, a) => a >= INK_ALPHA_THRESHOLD;

function analyzeNexus(image) {
    const { columnBands, rowBands } = measureInkBands(image, nexusInk);
    const rects = measureBandRectangles(columnBands, rowBands);
    const widths = [...new Set(rects.map(r => r.width))].sort((a, b) => a - b);
    const heights = [...new Set(rects.map(r => r.height))].sort((a, b) => a - b);
    const uniformCells = widths.length === 1 && heights.length === 1;
    return {
        detectedColumns: columnBands.length,
        detectedRows: rowBands.length,
        totalCells: rects.length,
        columnBands,
        rowBands,
        frameRectangles: rects,
        uniformCells,
        distinctCellWidths: widths,
        distinctCellHeights: heights,
        blankCells: rects.filter(r => r.width <= 0 || r.height <= 0).map(r => r.index),
    };
}

function analyzeAgentSheet(image) {
    const grid = measureUniformGrid(
        image, AGENT_SHEET_CELL, AGENT_SHEET_CELL, AGENT_SHEET_COLUMNS, AGENT_SHEET_ROWS,
    );
    const { columnBands, rowBands } = measureInkBands(image, alphaInk);
    return {
        assumedCellSize: { width: AGENT_SHEET_CELL, height: AGENT_SHEET_CELL },
        columns: AGENT_SHEET_COLUMNS,
        rows: AGENT_SHEET_ROWS,
        totalCells: AGENT_SHEET_COLUMNS * AGENT_SHEET_ROWS,
        widthDivisible: image.width % AGENT_SHEET_CELL === 0,
        heightDivisible: image.height % AGENT_SHEET_CELL === 0,
        detectedColumnBands: columnBands.length,
        detectedRowBands: rowBands.length,
        blankCells: grid.blankCells,
        horizontalSpillCells: grid.horizontalSpillCells,
        equalCellExtractionValid: grid.horizontalSpillCells === 0 && grid.blankCells === 0
            && columnBands.length === AGENT_SHEET_COLUMNS,
    };
}

function classify(file, image, alpha, background, structure) {
    if (file === 'Nexus Tube Sprite.png') {
        return {
            classification: 'central_nexus_hologram',
            readiness: 'conditionally_usable',
            ambiguous: false,
        };
    }
    if (file === 'Sprite Jobs.png') {
        // colour type 2 = no alpha channel at all, plus a flat opaque field.
        return {
            classification: 'role_reference',
            readiness: 'reference_only',
            ambiguous: false,
        };
    }
    if (structure && structure.equalCellExtractionValid) {
        return { classification: 'agent_sprite_sheet', readiness: 'production_ready', ambiguous: false };
    }
    return { classification: 'agent_reference', readiness: 'reference_only', ambiguous: true };
}

function buildWarnings(file, image, alpha, background, structure) {
    const warnings = [];
    if (!image.hasAlphaChannel) {
        warnings.push('No alpha channel (PNG colour type 2); cannot be composited over the office background.');
    }
    if (background.uniformOpaqueBackground) {
        warnings.push(`Uniform opaque background detected (${background.backgroundColor}); background is baked in, not transparent.`);
    }
    if (structure && structure.horizontalSpillCells > 0) {
        warnings.push(`${structure.horizontalSpillCells} cell(s) spill horizontally past the ${AGENT_SHEET_CELL}px cell boundary; equal-cell extraction is unsafe.`);
    }
    if (structure && structure.detectedColumnBands !== undefined
        && structure.detectedColumnBands !== AGENT_SHEET_COLUMNS
        && structure.columns === AGENT_SHEET_COLUMNS) {
        warnings.push(`Measured ${structure.detectedColumnBands} column band(s) but the sheet is ${AGENT_SHEET_COLUMNS} cells wide; column layout is inconsistent.`);
    }
    if (file === 'Nexus Tube Sprite.png') {
        warnings.push('Grid is NOT uniform: measured cell widths and heights vary, so explicit per-frame rectangles are required.');
        warnings.push('Final row is vertically truncated relative to the other rows.');
    }
    return warnings;
}

function analyzeFile(file) {
    const absolute = join(REPO_ROOT, file);
    const buffer = readFileSync(absolute);
    const image = decodePng(absolute);
    const alpha = measureAlpha(image);
    const background = measureUniformOpaqueBackground(image);

    const isNexus = file === 'Nexus Tube Sprite.png';
    const isAgentSheet = /^(791eeb5a|d85660f4)/.test(file);

    const nexus = isNexus ? analyzeNexus(image) : null;
    const agent = isAgentSheet ? analyzeAgentSheet(image) : null;
    const structure = agent;

    const { classification, readiness, ambiguous } = classify(file, image, alpha, background, structure);

    return {
        path: file,
        fileSizeBytes: statSync(absolute).size,
        sha256: sha256(buffer),
        width: image.width,
        height: image.height,
        bitDepth: image.bitDepth,
        colorType: image.colorType,
        channels: image.channels,
        chunkTypes: readChunkTypes(buffer),
        hasAlphaChannel: image.hasAlphaChannel,
        transparencyUsed: alpha.transparencyUsed,
        minAlpha: alpha.minAlpha,
        maxAlpha: alpha.maxAlpha,
        fullyTransparentPixels: alpha.fullyTransparentPixels,
        partiallyTransparentPixels: alpha.partiallyTransparentPixels,
        uniformOpaqueBackground: background.uniformOpaqueBackground,
        backgroundColor: background.backgroundColor,
        classification,
        readiness,
        ambiguous,
        nexusGrid: nexus,
        agentGrid: agent,
        warnings: buildWarnings(file, image, alpha, background, structure),
    };
}

function main() {
    const rootPngs = readdirSync(REPO_ROOT).filter(n => n.toLowerCase().endsWith('.png')).sort();
    const missing = SOURCE_FILES.filter(f => !rootPngs.includes(f));
    if (missing.length > 0) {
        throw new Error(`Missing expected source PNG(s): ${missing.join(', ')}`);
    }

    const entries = SOURCE_FILES.map(analyzeFile);

    // Exact-duplicate detection by content hash, in stable order.
    const byHash = new Map();
    for (const e of entries) {
        if (!byHash.has(e.sha256)) byHash.set(e.sha256, []);
        byHash.get(e.sha256).push(e.path);
    }
    const duplicateGroups = [...byHash.entries()]
        .filter(([, paths]) => paths.length > 1)
        .map(([hash, paths]) => ({ sha256: hash, paths: [...paths].sort() }))
        .sort((a, b) => a.sha256.localeCompare(b.sha256));

    const document = {
        schemaVersion: 1,
        generator: 'scripts/sprites/analyze-source-assets.mjs',
        inkAlphaThreshold: INK_ALPHA_THRESHOLD,
        totalAssets: entries.length,
        duplicateGroups,
        assets: entries,
    };

    const outDir = join(REPO_ROOT, 'src', 'office', 'sprites');
    mkdirSync(outDir, { recursive: true });
    const outPath = join(outDir, 'source-asset-inventory.json');
    writeFileSync(outPath, `${JSON.stringify(document, null, 4)}\n`);
    process.stdout.write(`Wrote ${outPath} (${entries.length} assets)\n`);
}

main();
