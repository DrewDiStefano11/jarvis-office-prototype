import { alignEdgeMaps, EdgeMap, scoreEdgeMaps, UniformRegistration } from './registration';

export interface AlignmentSuggestion extends UniformRegistration {
    readonly scoreBefore: number;
    readonly scoreAfter: number;
    readonly overlap: number;
    readonly productionHash: string;
    readonly embeddedHash: string;
    readonly productionDimensions: Readonly<{ width: number; height: number }>;
    readonly embeddedDimensions: Readonly<{ width: number; height: number }>;
    readonly parameters: Readonly<{ productionSampleWidth: number; embeddedSampleWidth: number; searchRange: number }>;
}

function edgeMagnitude(data: Uint8ClampedArray, width: number, height: number): number[] {
    const gray = new Array<number>(width * height);
    for (let index = 0; index < gray.length; index += 1) {
        const offset = index * 4;
        gray[index] = data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114;
    }
    const edges = new Array<number>(width * height).fill(0);
    for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
            const at = (dx: number, dy: number) => gray[(y + dy) * width + x + dx];
            const gx = -at(-1, -1) + at(1, -1) - 2 * at(-1, 0) + 2 * at(1, 0) - at(-1, 1) + at(1, 1);
            const gy = -at(-1, -1) - 2 * at(0, -1) - at(1, -1) + at(-1, 1) + 2 * at(0, 1) + at(1, 1);
            edges[y * width + x] = Math.min(255, Math.hypot(gx, gy));
        }
    }
    return edges;
}

async function imageEdgeMap(url: string, targetWidth: number): Promise<EdgeMap> {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    const width = targetWidth;
    const height = Math.max(1, Math.round(image.naturalHeight * targetWidth / image.naturalWidth));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas 2D is unavailable for alignment assistance.');
    context.drawImage(image, 0, 0, width, height);
    return { width, height, values: edgeMagnitude(context.getImageData(0, 0, width, height).data, width, height) };
}

export async function alignActualFloor1Images(candidate: UniformRegistration): Promise<AlignmentSuggestion> {
    const productionDimensions = { width: 8192, height: 5460 };
    const embeddedDimensions = { width: 6144, height: 4096 };
    const productionSampleWidth = 256;
    const embeddedSampleWidth = 192;
    const searchRange = 6;
    const [reference, moving] = await Promise.all([
        imageEdgeMap('/assets/office/office-8192x5460.png', productionSampleWidth),
        imageEdgeMap('/artifacts/production-floor1/embedded-backgrounds/9513850ce99814aee3b10bd1c64670e10b72e9ebd03b66960bff420e14558dea.jpg', embeddedSampleWidth),
    ]);
    const referenceScale = reference.width / productionDimensions.width;
    const movingScale = moving.width / embeddedDimensions.width;
    const mapCandidate = {
        scale: candidate.scale * referenceScale / movingScale,
        offsetX: candidate.offsetX * referenceScale,
        offsetY: candidate.offsetY * referenceScale,
    };
    const baseline = scoreEdgeMaps(reference, moving, mapCandidate);
    const result = alignEdgeMaps(reference, moving, mapCandidate, searchRange);
    return {
        scale: result.scale * movingScale / referenceScale,
        offsetX: result.offsetX / referenceScale,
        offsetY: result.offsetY / referenceScale,
        scoreBefore: baseline.score,
        scoreAfter: result.score,
        overlap: result.overlap,
        productionHash: 'aa0ff821d5530e8ee1be3c1de733d0bff4bb74767a0ba27e48a141abf784d026',
        embeddedHash: '9513850ce99814aee3b10bd1c64670e10b72e9ebd03b66960bff420e14558dea',
        productionDimensions,
        embeddedDimensions,
        parameters: { productionSampleWidth, embeddedSampleWidth, searchRange },
    };
}
