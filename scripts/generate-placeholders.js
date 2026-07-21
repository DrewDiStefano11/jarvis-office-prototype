const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Use regex to parse the TS manifest without evaluating TS natively in Node
const manifestPath = path.resolve(__dirname, '../src/office-layout/assetManifest.ts');
const manifestContent = fs.readFileSync(manifestPath, 'utf8');

const idRegex = /id:\s*'([^']+)'/g;
const filePathRegex = /filePath:\s*'([^']+)'/g;
const widthRegex = /frameWidth:\s*(\d+)/g;
const heightRegex = /frameHeight:\s*(\d+)/g;
const placeholderRegex = /isPlaceholder:\s*(true|false)/g;

let idMatch, fileMatch, wMatch, hMatch, phMatch;
const assets = [];

while ((idMatch = idRegex.exec(manifestContent)) !== null) {
    fileMatch = filePathRegex.exec(manifestContent);
    wMatch = widthRegex.exec(manifestContent);
    hMatch = heightRegex.exec(manifestContent);
    phMatch = placeholderRegex.exec(manifestContent);

    if (phMatch && phMatch[1] === 'true') {
        assets.push({
            id: idMatch[1],
            file: 'public/' + fileMatch[1],
            w: parseInt(wMatch[1], 10),
            h: parseInt(hMatch[1], 10)
        });
    }
}

function generateMinimalPng(width, height, colorR, colorG, colorB) {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData.writeUInt8(8, 8); // Bit depth
    ihdrData.writeUInt8(6, 9); // Color type (6 = truecolor with alpha)
    ihdrData.writeUInt8(0, 10); // Compression
    ihdrData.writeUInt8(0, 11); // Filter
    ihdrData.writeUInt8(0, 12); // Interlace

    const ihdr = createChunk('IHDR', ihdrData);

    const rowLength = 1 + width * 4;
    const rawData = Buffer.alloc(height * rowLength);

    for (let y = 0; y < height; y++) {
        const rowStart = y * rowLength;
        rawData[rowStart] = 0;
        for (let x = 0; x < width; x++) {
            const pixelStart = rowStart + 1 + x * 4;
            // Add a simple border pattern so they look different
            const isBorder = x === 0 || y === 0 || x === width - 1 || y === height - 1;
            rawData[pixelStart] = isBorder ? 0 : colorR;
            rawData[pixelStart + 1] = isBorder ? 0 : colorG;
            rawData[pixelStart + 2] = isBorder ? 0 : colorB;
            rawData[pixelStart + 3] = 255;
        }
    }

    const compressedData = zlib.deflateSync(rawData, { level: 9 });
    const idat = createChunk('IDAT', compressedData);
    const iend = createChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32BE(data.length, 0);
    const typeBuffer = Buffer.from(type, 'ascii');
    const crcBuffer = Buffer.alloc(4);
    const crcInput = Buffer.concat([typeBuffer, data]);
    const crc = crc32(crcInput);
    crcBuffer.writeUInt32BE(crc, 0);
    return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

const crcTable = [];
for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
        if (c & 1) c = 0xedb88320 ^ (c >>> 1);
        else c = c >>> 1;
    }
    crcTable[n] = c;
}

function crc32(buffer) {
    let crc = 0xffffffff;
    for (let i = 0; i < buffer.length; i++) {
        crc = crcTable[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

assets.forEach(asset => {
    const fullPath = path.resolve(__dirname, '..', asset.file);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Deterministic color based on the asset ID
    let hash = 0;
    for (let i = 0; i < asset.id.length; i++) {
        hash = ((hash << 5) - hash) + asset.id.charCodeAt(i);
        hash |= 0;
    }
    const r = Math.abs((hash & 0xFF0000) >> 16) % 256;
    const g = Math.abs((hash & 0x00FF00) >> 8) % 256;
    const b = Math.abs(hash & 0x0000FF) % 256;

    const buffer = generateMinimalPng(asset.w, asset.h, r, g, b);
    fs.writeFileSync(fullPath, buffer);
    console.log(`Generated: ${asset.file} (${asset.w}x${asset.h})`);
});
