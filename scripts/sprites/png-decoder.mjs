import { inflateSync } from 'node:zlib';
import { readFileSync } from 'node:fs';

export function decodePng(path) {
    const buf = readFileSync(path);
    if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not png');
    let off = 8;
    const idat = [];
    let ihdr = null, trns = null, plte = null;
    while (off < buf.length) {
        const len = buf.readUInt32BE(off);
        const type = buf.toString('ascii', off + 4, off + 8);
        const data = buf.subarray(off + 8, off + 8 + len);
        if (type === 'IHDR') ihdr = { width: data.readUInt32BE(0), height: data.readUInt32BE(4), bitDepth: data[8], colorType: data[9], interlace: data[12] };
        else if (type === 'IDAT') idat.push(data);
        else if (type === 'tRNS') trns = Buffer.from(data);
        else if (type === 'PLTE') plte = Buffer.from(data);
        else if (type === 'IEND') break;
        off += 12 + len;
    }
    if (!ihdr) throw new Error('no IHDR');
    if (ihdr.interlace !== 0) throw new Error('interlaced unsupported');
    if (ihdr.bitDepth !== 8) throw new Error('bit depth ' + ihdr.bitDepth + ' unsupported');
    const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ihdr.colorType];
    const bpp = channels;
    const raw = inflateSync(Buffer.concat(idat));
    const { width, height } = ihdr;
    const stride = width * bpp;
    const out = Buffer.alloc(height * stride);
    let pos = 0;
    for (let y = 0; y < height; y++) {
        const filter = raw[pos++];
        const line = raw.subarray(pos, pos + stride); pos += stride;
        const cur = out.subarray(y * stride, (y + 1) * stride);
        const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
        for (let i = 0; i < stride; i++) {
            const a = i >= bpp ? cur[i - bpp] : 0;
            const b = prev ? prev[i] : 0;
            const c = prev && i >= bpp ? prev[i - bpp] : 0;
            const x = line[i];
            let v;
            switch (filter) {
                case 0: v = x; break;
                case 1: v = x + a; break;
                case 2: v = x + b; break;
                case 3: v = x + ((a + b) >> 1); break;
                case 4: {
                    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
                    v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); break;
                }
                default: throw new Error('filter ' + filter);
            }
            cur[i] = v & 0xff;
        }
    }
    // normalize to RGBA
    const rgba = Buffer.alloc(width * height * 4);
    for (let i = 0, n = width * height; i < n; i++) {
        let r, g, b, a = 255;
        const s = i * bpp;
        if (ihdr.colorType === 6) { r = out[s]; g = out[s + 1]; b = out[s + 2]; a = out[s + 3]; }
        else if (ihdr.colorType === 2) { r = out[s]; g = out[s + 1]; b = out[s + 2]; }
        else if (ihdr.colorType === 0) { r = g = b = out[s]; }
        else if (ihdr.colorType === 4) { r = g = b = out[s]; a = out[s + 1]; }
        else { const idx = out[s]; r = plte[idx * 3]; g = plte[idx * 3 + 1]; b = plte[idx * 3 + 2]; a = trns && idx < trns.length ? trns[idx] : 255; }
        rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = a;
    }
    return { ...ihdr, channels, rgba, hasAlphaChannel: ihdr.colorType === 4 || ihdr.colorType === 6, hasTrns: trns !== null };
}
