export type BrandedPoint<Space extends string> = Readonly<{ x: number; y: number; readonly __space?: Space }>;
export type PdfPoint = BrandedPoint<'pdf'>;
export type EmbeddedPoint = BrandedPoint<'embedded'>;
export type ProductionPoint = BrandedPoint<'production'>;
export type ViewportPoint = BrandedPoint<'viewport'>;

export interface UniformRegistration {
    readonly scale: number;
    readonly offsetX: number;
    readonly offsetY: number;
}

export interface RegistrationLandmark {
    readonly id: string;
    readonly label: string;
    readonly embedded: EmbeddedPoint;
    readonly production: ProductionPoint;
    readonly enabled: boolean;
}

export interface RegistrationFit extends UniformRegistration {
    readonly count: number;
    readonly maximumResidual: number;
    readonly meanResidual: number;
    readonly rmsResidual: number;
}

const PDF_WIDTH = 4608;
const PDF_HEIGHT = 3072;
const EMBEDDED_WIDTH = 6144;
const EMBEDDED_HEIGHT = 4096;

function finite(...values: readonly number[]): void {
    if (!values.every(Number.isFinite)) throw new Error('Coordinate values must be finite.');
}

function validRegistration(registration: UniformRegistration): void {
    finite(registration.scale, registration.offsetX, registration.offsetY);
    if (registration.scale <= 0) throw new Error('Registration scale must be positive.');
    if ('scaleX' in registration || 'scaleY' in registration) throw new Error('Independent registration scales are forbidden.');
}

export function pdfToEmbedded(point: PdfPoint): EmbeddedPoint {
    finite(point.x, point.y);
    return { x: point.x * EMBEDDED_WIDTH / PDF_WIDTH, y: (PDF_HEIGHT - point.y) * EMBEDDED_HEIGHT / PDF_HEIGHT };
}

export function embeddedToPdf(point: EmbeddedPoint): PdfPoint {
    finite(point.x, point.y);
    return { x: point.x * PDF_WIDTH / EMBEDDED_WIDTH, y: PDF_HEIGHT - point.y * PDF_HEIGHT / EMBEDDED_HEIGHT };
}

export function embeddedToProduction(point: EmbeddedPoint, registration: UniformRegistration): ProductionPoint {
    validRegistration(registration);
    return { x: point.x * registration.scale + registration.offsetX, y: point.y * registration.scale + registration.offsetY };
}

export function productionToEmbedded(point: ProductionPoint, registration: UniformRegistration): EmbeddedPoint {
    validRegistration(registration);
    return { x: (point.x - registration.offsetX) / registration.scale, y: (point.y - registration.offsetY) / registration.scale };
}

export function pdfToProduction(point: PdfPoint, registration: UniformRegistration): ProductionPoint {
    return embeddedToProduction(pdfToEmbedded(point), registration);
}

export function productionToPdf(point: ProductionPoint, registration: UniformRegistration): PdfPoint {
    return embeddedToPdf(productionToEmbedded(point, registration));
}

export function productionToViewport(point: ProductionPoint, transform: UniformRegistration): ViewportPoint {
    return embeddedToProduction(point as EmbeddedPoint, transform) as ViewportPoint;
}

export function viewportToProduction(point: ViewportPoint, transform: UniformRegistration): ProductionPoint {
    return productionToEmbedded(point as ProductionPoint, transform) as ProductionPoint;
}

export function fitUniformRegistration(landmarks: readonly RegistrationLandmark[]): RegistrationFit {
    const enabled = landmarks.filter(landmark => landmark.enabled);
    if (enabled.length < 2) throw new Error('At least two enabled landmarks are required to fit registration.');
    enabled.forEach(landmark => finite(landmark.embedded.x, landmark.embedded.y, landmark.production.x, landmark.production.y));
    const meanEx = enabled.reduce((sum, value) => sum + value.embedded.x, 0) / enabled.length;
    const meanEy = enabled.reduce((sum, value) => sum + value.embedded.y, 0) / enabled.length;
    const meanPx = enabled.reduce((sum, value) => sum + value.production.x, 0) / enabled.length;
    const meanPy = enabled.reduce((sum, value) => sum + value.production.y, 0) / enabled.length;
    let numerator = 0;
    let denominator = 0;
    for (const landmark of enabled) {
        const ex = landmark.embedded.x - meanEx;
        const ey = landmark.embedded.y - meanEy;
        numerator += ex * (landmark.production.x - meanPx) + ey * (landmark.production.y - meanPy);
        denominator += ex * ex + ey * ey;
    }
    const scale = numerator / denominator;
    const result = { scale, offsetX: meanPx - scale * meanEx, offsetY: meanPy - scale * meanEy };
    validRegistration(result);
    const residuals = enabled.map(landmark => {
        const predicted = embeddedToProduction(landmark.embedded, result);
        return Math.hypot(predicted.x - landmark.production.x, predicted.y - landmark.production.y);
    });
    return {
        ...result,
        count: enabled.length,
        maximumResidual: Math.max(...residuals),
        meanResidual: residuals.reduce((sum, value) => sum + value, 0) / residuals.length,
        rmsResidual: Math.sqrt(residuals.reduce((sum, value) => sum + value * value, 0) / residuals.length),
    };
}

export function hasDistributedCoverage(landmarks: readonly RegistrationLandmark[]): boolean {
    const enabled = landmarks.filter(landmark => landmark.enabled);
    if (enabled.length < 8) return false;
    const quadrants = new Set(enabled.map(({ embedded }) => `${embedded.x >= EMBEDDED_WIDTH / 2 ? 1 : 0}:${embedded.y >= EMBEDDED_HEIGHT / 2 ? 1 : 0}`));
    const xs = enabled.map(value => value.embedded.x);
    const ys = enabled.map(value => value.embedded.y);
    return quadrants.size === 4 && Math.max(...xs) - Math.min(...xs) >= EMBEDDED_WIDTH * 0.7 && Math.max(...ys) - Math.min(...ys) >= EMBEDDED_HEIGHT * 0.7;
}

export interface EdgeMap {
    readonly width: number;
    readonly height: number;
    readonly values: readonly number[];
}

function edgeScore(reference: EdgeMap, moving: EdgeMap, registration: UniformRegistration): { score: number; overlap: number } {
    validRegistration(registration);
    let error = 0;
    let count = 0;
    for (let y = 0; y < moving.height; y += 1) {
        for (let x = 0; x < moving.width; x += 1) {
            const rx = Math.round(x * registration.scale + registration.offsetX);
            const ry = Math.round(y * registration.scale + registration.offsetY);
            if (rx < 0 || ry < 0 || rx >= reference.width || ry >= reference.height) continue;
            error += Math.abs(moving.values[y * moving.width + x] - reference.values[ry * reference.width + rx]);
            count += 1;
        }
    }
    const overlap = count / moving.values.length;
    return { score: count ? (1 - error / (count * 255)) * overlap : -Infinity, overlap };
}

export function alignEdgeMaps(reference: EdgeMap, moving: EdgeMap, candidate: UniformRegistration, range = 2): UniformRegistration & { score: number; overlap: number } {
    let best = { ...candidate, ...edgeScore(reference, moving, candidate) };
    for (const scaleDelta of [-0.02, -0.01, 0, 0.01, 0.02]) {
        for (let offsetY = candidate.offsetY - range; offsetY <= candidate.offsetY + range; offsetY += 1) {
            for (let offsetX = candidate.offsetX - range; offsetX <= candidate.offsetX + range; offsetX += 1) {
                const trial = { scale: candidate.scale + scaleDelta, offsetX, offsetY };
                const measured = edgeScore(reference, moving, trial);
                if (measured.score > best.score) best = { ...trial, ...measured };
            }
        }
    }
    return best;
}
