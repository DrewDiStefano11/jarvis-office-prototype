const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Generate a valid minimal PNG placeholder of specific width and height with a random color
function generateMinimalPng(width, height) {
    // We will construct a very basic uncompressed truecolor PNG.
    // It is simpler to use a tiny helper function to generate the PNG structure.

    // PNG Signature
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    // IHDR Chunk
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData.writeUInt8(8, 8); // Bit depth
    ihdrData.writeUInt8(6, 9); // Color type (6 = truecolor with alpha)
    ihdrData.writeUInt8(0, 10); // Compression method
    ihdrData.writeUInt8(0, 11); // Filter method
    ihdrData.writeUInt8(0, 12); // Interlace method

    const ihdr = createChunk('IHDR', ihdrData);

    // Color
    const r = Math.floor(Math.random() * 200) + 50;
    const g = Math.floor(Math.random() * 200) + 50;
    const b = Math.floor(Math.random() * 200) + 50;
    const a = 255;

    // IDAT Chunk (uncompressed zlib data)
    // The data for uncompressed truecolor with alpha:
    // Every row starts with a filter byte (0)
    // Then width * 4 bytes of pixel data
    const rowLength = 1 + width * 4;
    const rawData = Buffer.alloc(height * rowLength);

    for (let y = 0; y < height; y++) {
        const rowStart = y * rowLength;
        rawData[rowStart] = 0; // Filter none
        for (let x = 0; x < width; x++) {
            const pixelStart = rowStart + 1 + x * 4;
            rawData[pixelStart] = r;
            rawData[pixelStart + 1] = g;
            rawData[pixelStart + 2] = b;
            rawData[pixelStart + 3] = a;
        }
    }

    // Zlib headers for uncompressed block
    // CM=8, CINFO=7 (window size 32K) -> 0x78
    // FLG=0x01 (FCHECK=1, FDICT=0, FLEVEL=0)
    // See RFC1950. 0x7801 is valid for no compression.
    // However, it's easier to just use zlib built-in to node.
    const zlib = require('zlib');
    const compressedData = zlib.deflateSync(rawData, { level: 0 }); // level 0 = no compression, ensures deterministic speed or simple structure, though zlib.deflateSync works fine.

    const idat = createChunk('IDAT', compressedData);

    // IEND Chunk
    const iend = createChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32BE(data.length, 0);

    const typeBuffer = Buffer.from(type, 'ascii');

    const crcBuffer = Buffer.alloc(4);

    // CRC is calculated over chunk type and chunk data
    const crcInput = Buffer.concat([typeBuffer, data]);
    const crc = crc32(crcInput);
    crcBuffer.writeUInt32BE(crc, 0);

    return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

// Simple CRC32 implementation for PNG chunks
const crcTable = [];
for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
        if (c & 1) {
            c = 0xedb88320 ^ (c >>> 1);
        } else {
            c = c >>> 1;
        }
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


const assetsToGenerate = [
    { file: 'public/assets/office/agents/jarvis-placeholder.png', w: 32, h: 32 },
    { file: 'public/assets/office/agents/atlas-placeholder.png', w: 32, h: 32 },
    { file: 'public/assets/office/agents/scout-placeholder.png', w: 32, h: 32 },
    { file: 'public/assets/office/agents/archive-placeholder.png', w: 32, h: 32 },
    { file: 'public/assets/office/agents/sentinel-placeholder.png', w: 32, h: 32 },
    { file: 'public/assets/office/furniture/desk-placeholder.png', w: 64, h: 32 },
    { file: 'public/assets/office/furniture/meeting-table-placeholder.png', w: 96, h: 64 },
    { file: 'public/assets/office/furniture/filing-cabinet-placeholder.png', w: 32, h: 32 },
    { file: 'public/assets/office/furniture/chair-placeholder.png', w: 32, h: 32 },
    { file: 'public/assets/office/furniture/computer-placeholder.png', w: 32, h: 32 },
    { file: 'public/assets/office/environment/door-placeholder.png', w: 32, h: 32 },
    { file: 'public/assets/office/environment/wall-tile-placeholder.png', w: 32, h: 32 },
    { file: 'public/assets/office/decoration/plant-placeholder.png', w: 32, h: 32 },
    { file: 'public/assets/office/indicators/status-marker-placeholder.png', w: 16, h: 16 },
    { file: 'public/assets/office/tiles/floor-tile-placeholder.png', w: 32, h: 32 }
];

assetsToGenerate.forEach(asset => {
    const fullPath = path.resolve(__dirname, '..', asset.file);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Deterministic random by passing a static seed based on filename
    // To ensure the same run produces same files, let's fix Math.random
    let seed = 0;
    for (let i = 0; i < asset.file.length; i++) {
        seed += asset.file.charCodeAt(i);
    }
    Math.random = () => {
        let x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };

    const buffer = generateMinimalPng(asset.w, asset.h);
    fs.writeFileSync(fullPath, buffer);
    console.log(`Generated: ${asset.file} (${asset.w}x${asset.h})`);
});
