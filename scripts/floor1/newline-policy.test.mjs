import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { normalizeGeneratedTextFile, writeText } from './core.mjs';

test('generated text normalization replaces CRLF and lone CR with LF', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'floor1-newlines-'));
    const file = path.join(directory, 'artifact.json');

    try {
        await writeFile(file, '{\r\n"value": 1\r}\r\n', 'utf8');
        expect(normalizeGeneratedTextFile(file)).toBe(true);
        expect(await readFile(file, 'utf8')).toBe('{\n"value": 1\n}\n');
        expect(normalizeGeneratedTextFile(file)).toBe(false);
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test('generated text writer emits LF regardless of input newline style', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'floor1-write-newlines-'));
    const file = path.join(directory, 'artifact.md');

    try {
        writeText(file, 'one\r\ntwo\rthree\n');
        expect(await readFile(file)).toEqual(Buffer.from('one\ntwo\nthree\n'));
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});
