import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

export const ROOT = process.cwd();
export const OUT = path.join(ROOT, 'artifacts', 'production-floor1');
export const DATA = path.join(ROOT, 'src', 'office', 'data', 'floor1');
export const PAGE = { width: 4608, height: 3072 };
export const EMBEDDED = { width: 6144, height: 4096 };
export const PRODUCTION = { width: 8192, height: 5460 };
export const SOURCES = [
    ['rooms', 'Rooms.pdf'], ['walk-paths', 'Walk paths.pdf'], ['walls', 'Walls.pdf'],
    ['objects', 'Objects.pdf'], ['doors', 'Doors.pdf'], ['door-lights', 'Door Lights.pdf'],
    ['computers', 'Computers.pdf'], ['chairs-standing-desks', 'Chairs-Standing desks.pdf'],
    ['interactive-objects', 'Interactive Objects.pdf'],
];
const EXPECTED = {
    rooms: 69, 'walk-paths': 131, walls: 62, objects: 105, doors: 95,
    'door-lights': 144, computers: 44, 'chairs-standing-desks': 205,
    'interactive-objects': 12,
};
const KNOWN_FIELDS = new Set([
    'Subtype', 'Rect', 'QuadPoints', 'InkList', 'Vertices', 'L', 'LE', 'C', 'IC',
    'CA', 'BS', 'Border', 'Contents', 'RC', 'NM', 'T', 'M', 'F', 'AP', 'Type', 'P',
]);

export function sha(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}
export function mkdir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    }
    return value;
}
export function writeJson(file, value) {
    mkdir(path.dirname(file));
    fs.writeFileSync(file, `${JSON.stringify(canonical(value), null, 2)}\n`);
}
function text(buffer) { return buffer.toString('latin1'); }
function objectEntries(buffer) {
    const source = text(buffer);
    return [...source.matchAll(/(\d+)\s+(\d+)\s+obj\b([\s\S]*?)\bendobj\b/g)].map(match => ({
        id: Number(match[1]), generation: Number(match[2]), body: match[3], start: match.index,
    }));
}
function balanced(body, key, open, close) {
    const marker = `/${key}`;
    let start = body.indexOf(marker);
    if (start < 0) return null;
    start = body.indexOf(open, start + marker.length);
    if (start < 0) return null;
    let depth = 0;
    for (let index = start; index < body.length; index += 1) {
        if (body.startsWith(open, index)) { depth += 1; index += open.length - 1; continue; }
        if (body.startsWith(close, index)) {
            depth -= 1;
            if (depth === 0) return body.slice(start, index + close.length);
            index += close.length - 1;
        }
    }
    return null;
}
function pdfString(body, key) {
    const marker = `/${key}`;
    const at = body.indexOf(marker);
    if (at < 0) return null;
    let start = body.indexOf('(', at + marker.length);
    if (start < 0) return null;
    let depth = 0;
    let escaped = false;
    for (let index = start; index < body.length; index += 1) {
        const char = body[index];
        if (escaped) { escaped = false; continue; }
        if (char === '\\') { escaped = true; continue; }
        if (char === '(') depth += 1;
        if (char === ')' && --depth === 0) return decodePdfString(body.slice(start + 1, index));
    }
    return null;
}
function decodePdfString(value) {
    return value
        .replace(/\\([0-7]{1,3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)))
        .replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t')
        .replace(/\\([()\\])/g, '$1');
}
function numbers(value) {
    return value ? [...value.matchAll(/[-+]?(?:\d*\.)?\d+(?:[Ee][-+]?\d+)?/g)].map(match => Number(match[0])) : [];
}
function points(values) {
    const result = [];
    for (let i = 0; i + 1 < values.length; i += 2) result.push({ x: values[i], y: values[i + 1] });
    return result;
}
function nestedPointLists(value) {
    if (!value) return [];
    const inner = value.slice(1, -1);
    const lists = [...inner.matchAll(/\[([^\[\]]*)\]/g)].map(match => points(numbers(match[1])));
    return lists.length ? lists : [points(numbers(inner))];
}
function name(body, key) {
    return body.match(new RegExp(`/${key}\\s*/([^\\s/<>()\\[\\]]+)`))?.[1] ?? null;
}
function number(body, key) {
    const value = body.match(new RegExp(`/${key}\\s+([-+]?\\d+(?:\\.\\d+)?)`))?.[1];
    return value == null ? null : Number(value);
}
function reference(body, key) {
    const match = body.match(new RegExp(`/${key}\\s+(\\d+)\\s+(\\d+)\\s+R`));
    return match ? { objectId: Number(match[1]), generation: Number(match[2]) } : null;
}
function bounds(values) {
    if (!values || values.length < 4) return null;
    return { x1: values[0], y1: values[1], x2: values[2], y2: values[3] };
}
function geometry(body, subtype) {
    const vertices = points(numbers(balanced(body, 'Vertices', '[', ']')));
    const ink = nestedPointLists(balanced(body, 'InkList', '[', ']'));
    const rect = bounds(numbers(balanced(body, 'Rect', '[', ']')));
    const line = points(numbers(balanced(body, 'L', '[', ']')));
    const quads = points(numbers(balanced(body, 'QuadPoints', '[', ']')));
    if (vertices.length) return { kind: subtype === 'PolyLine' ? 'polyline' : 'polygon', points: vertices };
    if (ink.some(list => list.length)) return { kind: 'ink', paths: ink };
    if (line.length) return { kind: 'line', points: line };
    if (quads.length) return { kind: 'quad-points', points: quads };
    if (rect) return { kind: 'rectangle', rect };
    return { kind: 'none' };
}
function annotation(object, sourceFile, pageIndex, ordinal) {
    const body = object.body;
    const subtype = name(body, 'Subtype') ?? 'Unknown';
    const rectValues = numbers(balanced(body, 'Rect', '[', ']'));
    const fieldNames = [...new Set([...body.matchAll(/\/([A-Za-z][A-Za-z0-9]*)/g)].map(match => match[1]))].sort();
    const rawContents = pdfString(body, 'Contents');
    const richText = pdfString(body, 'RC');
    const record = {
        id: `${path.basename(sourceFile, '.pdf').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${String(ordinal + 1).padStart(3, '0')}`,
        sourceFile, pageIndex, pdfObjectId: object.id, pdfGeneration: object.generation,
        annotationId: pdfString(body, 'NM') ?? `object-${object.id}`,
        subtype,
        nativeGeometry: geometry(body, subtype),
        style: {
            strokeColor: numbers(balanced(body, 'C', '[', ']')),
            interiorColor: numbers(balanced(body, 'IC', '[', ']')),
            opacity: number(body, 'CA'),
            width: number(balanced(body, 'BS', '<<', '>>') ?? '', 'W'),
            blendMode: name(body, 'BM'),
        },
        originalText: rawContents,
        decodedText: richText?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"') || rawContents,
        richTextSource: richText,
        pdfBounds: bounds(rectValues),
        appearance: reference(balanced(body, 'AP', '<<', '>>') ?? '', 'N'),
        flags: number(body, 'F'),
        author: pdfString(body, 'T'),
        modified: pdfString(body, 'M'),
        confidence: subtype === 'Unknown' ? 'low' : 'high',
        warnings: subtype === 'Unknown' ? ['Unknown annotation subtype'] : [],
        unknownSourceFields: fieldNames.filter(field => !KNOWN_FIELDS.has(field)),
        sourceFieldNames: fieldNames,
    };
    return record;
}
function streamBytes(buffer, object) {
    const bodyStart = object.start;
    const header = text(buffer.subarray(bodyStart, Math.min(buffer.length, bodyStart + 2000)));
    const streamMatch = /\bstream\r?\n/.exec(header);
    const length = Number(object.body.match(/\/Length\s+(\d+)/)?.[1]);
    if (!streamMatch || !Number.isInteger(length)) return null;
    const start = bodyStart + streamMatch.index + streamMatch[0].length;
    return buffer.subarray(start, start + length);
}
function decodeStream(bytes, body) {
    if (!bytes) return null;
    const filters = [...body.matchAll(/\/(FlateDecode|ASCIIHexDecode|ASCII85Decode|DCTDecode)/g)].map(match => match[1]);
    let result = bytes;
    for (const filter of filters) {
        if (filter === 'FlateDecode') result = zlib.inflateSync(result);
        else if (filter === 'ASCIIHexDecode') {
            const hex = text(result).replace(/\s|>/g, '');
            result = Buffer.from(hex.length % 2 ? `${hex}0` : hex, 'hex');
        } else if (filter === 'ASCII85Decode') {
            throw new Error('ASCII85Decode encountered but not implemented for this source set.');
        }
    }
    return result;
}
function pageInfo(objects, buffer) {
    const page = objects.find(object => /\/Type\s*\/Page\b/.test(object.body));
    if (!page) return { unresolved: ['No page dictionary'] };
    const contentRef = reference(page.body, 'Contents');
    const contentObject = contentRef ? objects.find(object => object.id === contentRef.objectId) : null;
    const decoded = contentObject ? decodeStream(streamBytes(buffer, contentObject), contentObject.body) : null;
    const content = decoded ? text(decoded) : '';
    const matrix = [...content.matchAll(/([-+.\d]+)\s+([-+.\d]+)\s+([-+.\d]+)\s+([-+.\d]+)\s+([-+.\d]+)\s+([-+.\d]+)\s+cm\s*\/Image\s+Do/g)]
        .map(match => match.slice(1).map(Number))[0] ?? null;
    return {
        mediaBox: numbers(balanced(page.body, 'MediaBox', '[', ']')),
        cropBox: numbers(balanced(page.body, 'CropBox', '[', ']')),
        rotation: number(page.body, 'Rotate') ?? 0,
        contents: contentRef,
        resources: reference(page.body, 'Resources') ?? (page.body.includes('/Resources<<') ? 'inline' : null),
        imagePlacementMatrix: matrix,
        contentOperators: [...new Set([...content.matchAll(/(?:^|\s)(q|Q|cm|Do|m|l|c|v|y|h|re|S|s|f\*?|B\*?|b\*?|n|w|J|j|M|d|RG|rg|G|g|K|k)(?=\s|$)/g)].map(match => match[1]))].sort(),
    };
}
export function inspectPdf(key, fileName, includeRecords = true) {
    const absolute = path.join(ROOT, fileName);
    const buffer = fs.readFileSync(absolute);
    const objects = objectEntries(buffer);
    const annotationObjects = objects.filter(object => /\/Type\s*\/Annot\b/.test(object.body));
    const records = includeRecords ? annotationObjects.map((object, index) => annotation(object, fileName, 0, index)) : [];
    const images = objects.filter(object => /\/Subtype\s*\/Image\b/.test(object.body)).map(object => {
        const bytes = streamBytes(buffer, object);
        return {
            objectId: object.id, width: number(object.body, 'Width'), height: number(object.body, 'Height'),
            encoding: name(object.body, 'Filter'), byteLength: bytes?.length ?? null,
            sha256: bytes ? sha(bytes) : null,
        };
    });
    const subtypeCounts = {};
    for (const object of annotationObjects) {
        const subtype = name(object.body, 'Subtype') ?? 'Unknown';
        subtypeCounts[subtype] = (subtypeCounts[subtype] ?? 0) + 1;
    }
    const appearances = annotationObjects.filter(object => /\/AP\s*(?:<<|\d+\s+\d+\s+R)/.test(object.body)).length;
    const formXObjects = objects.filter(object => /\/Subtype\s*\/Form\b/.test(object.body)).length;
    const info = {
        key, fileName, sha256: sha(buffer), byteSize: buffer.length, pageCount: objects.filter(object => /\/Type\s*\/Page\b/.test(object.body)).length,
        indirectObjectCount: objects.length, annotationCount: annotationObjects.length, annotationSubtypeCounts: subtypeCounts,
        appearanceStreamCount: appearances, embeddedImages: images, formXObjectCount: formXObjects,
        ...pageInfo(objects, buffer),
        unresolvedStructures: [],
    };
    return { info, records, buffer, objects };
}
function extractBackground(result) {
    const imageObject = result.objects.find(object => /\/Subtype\s*\/Image\b/.test(object.body));
    const bytes = imageObject ? streamBytes(result.buffer, imageObject) : null;
    if (!bytes) throw new Error(`Unable to extract DCT stream from ${result.info.fileName}`);
    return { bytes, objectId: imageObject.id, hash: sha(bytes) };
}
function xml(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}
function svgFor(key, records, backgroundHref = null) {
    const elements = [];
    if (backgroundHref) elements.push(`<image href="${xml(backgroundHref)}" x="0" y="0" width="4608" height="3072" opacity=".35"/>`);
    elements.push('<g transform="translate(0 3072) scale(1 -1)">');
    for (const record of records) {
        const meta = `id="${xml(record.id)}" data-object-id="${record.pdfObjectId}" data-annotation-id="${xml(record.annotationId)}"`;
        const geometry = record.nativeGeometry;
        const color = record.warnings.length ? '#ff00ff' : '#ef4444';
        if (geometry.kind === 'polygon' || geometry.kind === 'polyline') {
            const coords = geometry.points.map(point => `${point.x},${point.y}`).join(' ');
            elements.push(`<${geometry.kind === 'polygon' ? 'polygon' : 'polyline'} ${meta} points="${coords}" fill="${geometry.kind === 'polygon' ? `${color}22` : 'none'}" stroke="${color}" stroke-width="${record.style.width ?? 6}"/>`);
        } else if (geometry.kind === 'ink') {
            geometry.paths.forEach((pointsList, index) => elements.push(`<polyline id="${xml(record.id)}-${index}" data-object-id="${record.pdfObjectId}" data-annotation-id="${xml(record.annotationId)}" points="${pointsList.map(point => `${point.x},${point.y}`).join(' ')}" fill="none" stroke="${color}" stroke-opacity=".65" stroke-width="${record.style.width ?? 6}"/>`));
        } else if (geometry.kind === 'rectangle' && geometry.rect) {
            const rect = geometry.rect;
            elements.push(`<rect ${meta} x="${rect.x1}" y="${rect.y1}" width="${rect.x2 - rect.x1}" height="${rect.y2 - rect.y1}" fill="none" stroke="${color}" stroke-width="4"/>`);
        }
    }
    elements.push('</g>');
    for (const record of records.filter(item => item.decodedText && item.pdfBounds)) {
        elements.push(`<text id="${xml(record.id)}-label" x="${record.pdfBounds.x1}" y="${PAGE.height - record.pdfBounds.y2}" fill="#fff" stroke="#111" paint-order="stroke" font-size="24">${xml(record.decodedText)}</text>`);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4608 3072"><title>${xml(key)} Floor 1 vector preview</title><metadata>Source annotations; not production artwork.</metadata>${elements.join('')}</svg>\n`;
}
export function auditAll() {
    mkdir(OUT);
    const results = SOURCES.map(([key, file]) => inspectPdf(key, file, false));
    const audit = {
        schemaVersion: 1, sourceCount: results.length,
        totalAnnotations: results.reduce((sum, result) => sum + result.info.annotationCount, 0),
        totalAppearanceStreams: results.reduce((sum, result) => sum + result.info.appearanceStreamCount, 0),
        sources: results.map(result => result.info),
    };
    writeJson(path.join(OUT, 'audit.json'), audit);
    writeJson(path.join(OUT, 'extraction-ledger.json'), results.map(result => ({
        fileName: result.info.fileName, sha256: result.info.sha256, expectedRecords: EXPECTED[result.info.key],
        observedAnnotations: result.info.annotationCount, status: result.info.annotationCount === EXPECTED[result.info.key] ? 'complete' : 'mismatch',
    })));
    fs.writeFileSync(path.join(OUT, 'alignment-report.md'), [
        '# Floor 1 Alignment Report', '', 'Status: candidate-unverified', '',
        '- All nine pages report `MediaBox [0 0 4608 3072]`.',
        '- Each PDF embeds one `6144 × 4096` DCT image.',
        '- Registration requires one uniform scale and explicit offsets.',
        '- Visual landmark review is required; nominal dimensions do not constitute approval.', '',
    ].join('\n'));
    if (audit.totalAnnotations !== 867) throw new Error(`Expected 867 annotations, observed ${audit.totalAnnotations}`);
    return audit;
}
export function extractAll() {
    const rawDir = path.join(DATA, 'raw-pdf');
    const previewDir = path.join(OUT, 'vector-previews');
    const bgDir = path.join(OUT, 'embedded-backgrounds');
    mkdir(rawDir); mkdir(previewDir); mkdir(bgDir);
    const results = SOURCES.map(([key, file]) => inspectPdf(key, file, true));
    const backgrounds = new Map();
    for (const result of results) {
        if (result.records.length !== EXPECTED[result.info.key]) throw new Error(`${result.info.fileName}: expected ${EXPECTED[result.info.key]}, got ${result.records.length}`);
        writeJson(path.join(rawDir, `${result.info.key}.json`), {
            schemaVersion: 1, coordinateSpace: 'pdf-lower-left', page: PAGE, records: result.records,
        });
        fs.writeFileSync(path.join(previewDir, `${result.info.key}.svg`), svgFor(result.info.key, result.records));
        const background = extractBackground(result);
        if (!backgrounds.has(background.hash)) backgrounds.set(background.hash, { bytes: background.bytes, sources: [] });
        backgrounds.get(background.hash).sources.push({ fileName: result.info.fileName, objectId: background.objectId, placementMatrix: result.info.imagePlacementMatrix });
    }
    for (const [hash, value] of backgrounds) fs.writeFileSync(path.join(bgDir, `${hash}.jpg`), value.bytes);
    const backgroundMetadata = [...backgrounds].map(([hash, value]) => ({
        sha256: hash, dimensions: EMBEDDED, encoding: 'DCTDecode', byteLength: value.bytes.length, sources: value.sources,
    }));
    writeJson(path.join(bgDir, 'metadata.json'), { uniqueImageCount: backgrounds.size, allPdfsShareIdenticalBytes: backgrounds.size === 1, images: backgroundMetadata });
    const summary = {
        schemaVersion: 1, totalRecords: results.reduce((sum, result) => sum + result.records.length, 0),
        bySource: Object.fromEntries(results.map(result => [result.info.key, result.records.length])),
        totalAppearanceStreams: results.reduce((sum, result) => sum + result.info.appearanceStreamCount, 0),
        unresolvedRecordCount: results.flatMap(result => result.records).filter(record => record.warnings.length).length,
        uniqueBackgroundHashes: [...backgrounds.keys()],
    };
    writeJson(path.join(OUT, 'extraction-summary.json'), summary);
    writeJson(path.join(OUT, 'unresolved-records.json'), results.flatMap(result => result.records).filter(record => record.warnings.length));
    writeJson(path.join(OUT, 'pdf-structure.json'), results.map(result => result.info));
    if (backgrounds.size !== 1 || !backgrounds.has('9513850ce99814aee3b10bd1c64670e10b72e9ebd03b66960bff420e14558dea')) {
        throw new Error(`Unexpected embedded backgrounds: ${[...backgrounds.keys()].join(', ')}`);
    }
    return summary;
}
function loadRaw(key) {
    return JSON.parse(fs.readFileSync(path.join(DATA, 'raw-pdf', `${key}.json`), 'utf8')).records;
}
function center(record) {
    const rect = record.pdfBounds;
    if (rect) return { x: (rect.x1 + rect.x2) / 2, y: (rect.y1 + rect.y2) / 2 };
    const geometry = record.nativeGeometry;
    const values = geometry.points ?? geometry.paths?.flat() ?? [];
    return values.length ? { x: values.reduce((sum, point) => sum + point.x, 0) / values.length, y: values.reduce((sum, point) => sum + point.y, 0) / values.length } : null;
}
function pairNearest(shapes, labels) {
    const available = new Set(labels.map(label => label.id));
    return shapes.map(shape => {
        const shapeCenter = center(shape);
        const candidates = labels.filter(label => available.has(label.id) && center(label) && shapeCenter);
        candidates.sort((a, b) => {
            const pa = center(a); const pb = center(b);
            return Math.hypot(pa.x - shapeCenter.x, pa.y - shapeCenter.y) - Math.hypot(pb.x - shapeCenter.x, pb.y - shapeCenter.y);
        });
        const label = candidates[0] ?? null;
        if (label) available.delete(label.id);
        return { shape, label };
    });
}
function parseCsv(source) {
    const rows = []; let row = []; let cell = ''; let quoted = false;
    for (let i = 0; i < source.length; i += 1) {
        const char = source[i];
        if (char === '"') {
            if (quoted && source[i + 1] === '"') { cell += '"'; i += 1; } else quoted = !quoted;
        } else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
        else if ((char === '\n' || char === '\r') && !quoted) {
            if (char === '\r' && source[i + 1] === '\n') i += 1;
            row.push(cell); if (row.some(value => value.length)) rows.push(row); row = []; cell = '';
        } else cell += char;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    const [rawHeaders, ...values] = rows;
    const headers = rawHeaders.map((header, index) => index === 0 ? header.replace(/^\uFEFF/, '') : header);
    return values.map(items => Object.fromEntries(headers.map((header, index) => [header, items[index] ?? ''])));
}
function slug(value) { return value.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
export function classifyAll() {
    const classified = path.join(DATA, 'classified'); mkdir(classified);
    const roomsRaw = loadRaw('rooms');
    const roomShapes = roomsRaw.filter(record => record.subtype === 'PolyLine');
    const roomLabels = roomsRaw.filter(record => record.subtype === 'FreeText');
    const roomPairs = pairNearest(roomShapes, roomLabels.filter(label => !/^\s*34\s*$/.test(label.decodedText ?? '')));
    const rooms = roomPairs.map((pair, index) => ({
        id: `ROOM_${slug(pair.label?.decodedText ?? `unresolved-${index + 1}`).toUpperCase().replace(/-/g, '_')}`,
        canonicalName: pair.label?.decodedText ?? null, originalDisplayLabel: pair.label?.originalText ?? null,
        category: /walkway|entrance|stairs|nexus/i.test(pair.label?.decodedText ?? '') ? 'zone' : 'room',
        pdfPolygon: pair.shape.nativeGeometry.points, pdfLabelAnchor: pair.label ? center(pair.label) : null,
        sourceAnnotationIds: [pair.shape.annotationId, pair.label?.annotationId].filter(Boolean),
        confidence: pair.label ? 'medium' : 'low', reviewStatus: 'provisional', warnings: pair.label ? [] : ['Unmatched room polygon'],
    }));
    writeJson(path.join(classified, 'rooms.json'), { schemaVersion: 1, rooms });
    const csv = parseCsv(fs.readFileSync(path.join(ROOT, 'docs', 'DOOR_ACCESS.csv'), 'utf8'));
    const doorRaw = loadRaw('doors');
    const doorShapes = doorRaw.filter(record => record.subtype === 'Polygon');
    const doorLabels = doorRaw.filter(record => /^D\d{2}$/i.test(record.decodedText ?? ''));
    const labelById = new Map(doorLabels.map(label => [label.decodedText.toUpperCase(), label]));
    const doors = csv.map(row => {
        const label = labelById.get(row.door_id);
        if (!label) throw new Error(`Missing label ${row.door_id}`);
        const labelPoint = center(label);
        const shape = [...doorShapes].sort((a, b) => Math.hypot(center(a).x - labelPoint.x, center(a).y - labelPoint.y) - Math.hypot(center(b).x - labelPoint.x, center(b).y - labelPoint.y))[0];
        const usedIndex = doorShapes.indexOf(shape); doorShapes.splice(usedIndex, 1);
        return {
            id: row.door_id, pdfPolygon: shape.nativeGeometry.points, pdfLabelAnchor: labelPoint,
            csvAccessMode: row.access_mode, csvDefaultState: row.default_door_state, csvLightMode: row.default_light_code,
            proposedConnectedZones: [row.zone_a, row.zone_b].filter(Boolean), manualReviewRequired: row.manual_review_required.toLowerCase() === 'yes',
            sourceAnnotationIds: [shape.annotationId, label.annotationId], classificationConfidence: row.source_confidence || 'medium',
            reviewStatus: 'provisional', authoredFacts: row,
        };
    });
    if (doors.map(door => door.id).join(',') !== Array.from({ length: 47 }, (_, i) => `D${String(i + 1).padStart(2, '0')}`).join(',')) throw new Error('Door IDs are not exact D01-D47 order');
    writeJson(path.join(classified, 'doors.json'), { schemaVersion: 1, doors });
    const passThrough = ['walk-paths', 'walls', 'objects', 'computers', 'door-lights'];
    for (const key of passThrough) {
        const records = loadRaw(key).map(record => ({ ...record, classification: 'provisional', reviewStatus: 'provisional' }));
        writeJson(path.join(classified, `${key}.json`), { schemaVersion: 1, records });
    }
    const positionsRaw = loadRaw('chairs-standing-desks');
    const positions = positionsRaw.map((record, index) => {
        const color = record.style.strokeColor;
        const accessTier = color[0] > 0.8 && color[1] > 0.5 ? 'priority' : 'standard';
        return { id: `POSITION_${String(index + 1).padStart(3, '0')}`, source: record, pdfAnchor: center(record), accessTier, poseCandidate: 'unresolved', reviewStatus: 'provisional' };
    });
    writeJson(path.join(classified, 'positions.json'), { schemaVersion: 1, positions });
    const interactiveRaw = loadRaw('interactive-objects');
    const interactivePairs = pairNearest(interactiveRaw.filter(record => record.subtype === 'Polygon'), interactiveRaw.filter(record => record.subtype === 'FreeText'));
    const interactiveObjects = interactivePairs.map(pair => ({
        id: `INTERACTIVE_${slug(pair.label?.decodedText ?? pair.shape.id).toUpperCase().replace(/-/g, '_')}`,
        name: pair.label?.decodedText ?? null, pdfPolygon: pair.shape.nativeGeometry.points, pdfLabelAnchor: pair.label ? center(pair.label) : null,
        sourceAnnotationIds: [pair.shape.annotationId, pair.label?.annotationId].filter(Boolean), reviewStatus: 'provisional',
    }));
    writeJson(path.join(classified, 'interactive-objects.json'), { schemaVersion: 1, interactiveObjects });
    const standard = positions.filter(position => position.accessTier === 'standard').length;
    const priority = positions.filter(position => position.accessTier === 'priority').length;
    const unmatchedRoomText = roomLabels.filter(label => !roomPairs.some(pair => pair.label?.id === label.id));
    const summary = {
        rooms: rooms.length, unmatchedRoomText: unmatchedRoomText.map(record => ({ id: record.id, text: record.decodedText })),
        walkPaths: loadRaw('walk-paths').length, walls: loadRaw('walls').length, objects: loadRaw('objects').length,
        doors: doors.length, doorLights: loadRaw('door-lights').length, computers: loadRaw('computers').length,
        positions: positions.length, standardPositions: standard, priorityPositions: priority, interactiveObjects: interactiveObjects.length,
    };
    writeJson(path.join(OUT, 'classification-summary.json'), summary);
    writeJson(path.join(OUT, 'door-reconciliation.json'), doors.map(door => ({ id: door.id, sourceAnnotationIds: door.sourceAnnotationIds, manualReviewRequired: door.manualReviewRequired })));
    writeJson(path.join(OUT, 'unresolved-classification.json'), { unmatchedRoomText, unresolvedPositionPoseCount: positions.length });
    return summary;
}
export function candidateRegistration() {
    const scale = PRODUCTION.width / EMBEDDED.width;
    return {
        schemaVersion: 1, source: { pdfHashes: Object.fromEntries(SOURCES.map(([key, file]) => [key, sha(fs.readFileSync(path.join(ROOT, file)))])), productionImageHash: sha(fs.readFileSync(path.join(ROOT, 'public/assets/office/office-8192x5460.png'))), embeddedImageHash: '9513850ce99814aee3b10bd1c64670e10b72e9ebd03b66960bff420e14558dea' },
        scale, offsetX: (PRODUCTION.width - EMBEDDED.width * scale) / 2,
        offsetY: (PRODUCTION.height - EMBEDDED.height * scale) / 2,
        status: 'candidate-unverified', approved: false, landmarks: [],
    };
}
export function pdfToProduction(point, registration = candidateRegistration()) {
    if (![point.x, point.y, registration.scale, registration.offsetX, registration.offsetY].every(Number.isFinite) || registration.scale <= 0) throw new Error('Finite coordinates and a positive uniform scale are required');
    const embeddedPoint = { x: point.x * EMBEDDED.width / PAGE.width, y: (PAGE.height - point.y) * EMBEDDED.height / PAGE.height };
    return { x: embeddedPoint.x * registration.scale + registration.offsetX, y: embeddedPoint.y * registration.scale + registration.offsetY };
}
function transformGeometry(value, registration) {
    if (Array.isArray(value)) return value.map(item => transformGeometry(item, registration));
    if (value && typeof value === 'object') {
        if (Number.isFinite(value.x) && Number.isFinite(value.y) && Object.keys(value).every(key => ['x', 'y'].includes(key))) return pdfToProduction(value, registration);
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, transformGeometry(item, registration)]));
    }
    return value;
}
export function registerCandidate() {
    const registration = candidateRegistration();
    writeJson(path.join(OUT, 'registration-candidate.json'), registration);
    const provisional = path.join(DATA, 'provisional'); mkdir(provisional);
    for (const [key] of SOURCES) {
        const source = JSON.parse(fs.readFileSync(path.join(DATA, 'classified', `${key === 'chairs-standing-desks' ? 'positions' : key}.json`), 'utf8'));
        writeJson(path.join(provisional, `${key === 'chairs-standing-desks' ? 'positions' : key}.json`), {
            schemaVersion: 1, registrationStatus: 'candidate-unverified', productionApproved: false,
            data: transformGeometry(source, registration),
        });
    }
    const navigation = { schemaVersion: 1, registrationStatus: 'candidate-unverified', productionApproved: false, method: 'review-only-derived-grid', agentRadius: 24, cells: [], routes: [], warnings: ['Navigation cells require visually reviewed walkable/collision geometry.'] };
    writeJson(path.join(provisional, 'navigation.json'), navigation);
    return registration;
}
function approvedChecksum(registration) {
    const payload = { schemaVersion: registration.schemaVersion, source: registration.source, landmarks: registration.landmarks, scale: registration.scale, offsetX: registration.offsetX, offsetY: registration.offsetY, residuals: registration.residuals };
    return sha(Buffer.from(JSON.stringify(canonical(payload))));
}
export function promoteProduction() {
    const file = path.join(OUT, 'registration-approved.json');
    if (!fs.existsSync(file)) throw new Error('Production promotion refused: approved registration file is absent.');
    const registration = JSON.parse(fs.readFileSync(file, 'utf8'));
    const enabled = registration.landmarks?.filter(landmark => landmark.enabled) ?? [];
    if (registration.status !== 'approved' || registration.approved !== true) throw new Error('Production promotion refused: registration is not approved.');
    if (enabled.length < 8) throw new Error('Production promotion refused: at least eight enabled landmarks are required.');
    if (!Number.isFinite(registration.scale) || registration.scale <= 0 || 'scaleX' in registration || 'scaleY' in registration) throw new Error('Production promotion refused: invalid uniform scale.');
    if (!registration.residuals || !Number.isFinite(registration.residuals.maximum) || !Number.isFinite(registration.residuals.mean)) throw new Error('Production promotion refused: residual evidence is missing.');
    if (registration.checksum !== approvedChecksum(registration)) throw new Error('Production promotion refused: stale or invalid checksum.');
    throw new Error('Production promotion refused: this repository contains no human-approved registration; synthetic promotion belongs in tests only.');
}
export function generateEvidence() {
    const registration = candidateRegistration();
    const dir = path.join(OUT, 'registration'); mkdir(dir);
    const master = '../../../public/assets/office/office-8192x5460.png';
    const banner = '<text x="80" y="150" font-size="72" fill="#ff2d55" stroke="#fff" paint-order="stroke">CANDIDATE — VISUAL APPROVAL REQUIRED</text>';
    const layerImages = [];
    for (const [key] of SOURCES) {
        const layer = `<image href="../vector-previews/${key}.svg" x="${registration.offsetX}" y="${registration.offsetY}" width="${EMBEDDED.width * registration.scale}" height="${EMBEDDED.height * registration.scale}" opacity=".75"/>`;
        layerImages.push(layer);
        const transformed = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8192 5460"><image href="${master}" width="8192" height="5460"/>${layer}${banner}</svg>\n`;
        fs.writeFileSync(path.join(dir, `candidate-${key}-overlay.svg`), transformed);
    }
    const full = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8192 5460"><image href="${master}" width="8192" height="5460"/>${layerImages.join('')}${banner}</svg>\n`;
    fs.writeFileSync(path.join(dir, 'candidate-full-overlay.svg'), full);
    fs.writeFileSync(path.join(dir, 'candidate-corners-overlay.svg'), full.replace('</svg>', '<path d="M0 300V0H300 M7892 0H8192V300 M0 5160V5460H300 M7892 5460H8192V5160" fill="none" stroke="#00ffff" stroke-width="20"/></svg>'));
    writeJson(path.join(dir, 'registration-summary.json'), registration);
    fs.writeFileSync(path.join(dir, 'README.md'), '# Floor 1 registration evidence\n\n**CANDIDATE — VISUAL APPROVAL REQUIRED**\n\nThese browser-viewable SVGs are review aids. They do not prove or grant production approval.\n');
    return { files: fs.readdirSync(dir).sort() };
}
