import { OFFICE_SOURCE_WIDTH, OFFICE_SOURCE_HEIGHT, DEFAULT_VIEWPORT_OPTIONS } from './constants';
import { constrainTransform } from './coordinates';
import { ViewTransform, ViewportSize } from './types';

export const EPSILON = 1e-6;

export type CameraState = Readonly<{
    transform: ViewTransform;
    userManipulated: boolean;
    autoFitted: boolean;
    lastValidViewport: ViewportSize;
}>;

export function computeFitScale(viewport: ViewportSize): number {
    if (viewport.width <= 0 || viewport.height <= 0) return DEFAULT_VIEWPORT_OPTIONS.minimumZoom;
    return Math.min(viewport.width / OFFICE_SOURCE_WIDTH, viewport.height / OFFICE_SOURCE_HEIGHT);
}

export function computeMinimumZoom(viewport: ViewportSize): number {
    return Math.min(DEFAULT_VIEWPORT_OPTIONS.minimumZoom, computeFitScale(viewport));
}

export function computeMaximumZoom(): number {
    return DEFAULT_VIEWPORT_OPTIONS.maximumZoom;
}

export function isValidViewport(size: ViewportSize): boolean {
    return Number.isFinite(size.width) && Number.isFinite(size.height) && size.width > 0 && size.height > 0;
}

export function safeViewportSize(rect: DOMRectReadOnly | undefined): ViewportSize | null {
    if (!rect) return null;
    if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) return null;
    return { width: rect.width, height: rect.height };
}

export function buildInitialCamera(viewport: ViewportSize): CameraState {
    const fittedScale = Math.min(viewport.width / OFFICE_SOURCE_WIDTH, viewport.height / OFFICE_SOURCE_HEIGHT);
    const transform = {
        scale: fittedScale,
        x: (viewport.width - OFFICE_SOURCE_WIDTH * fittedScale) / 2,
        y: (viewport.height - OFFICE_SOURCE_HEIGHT * fittedScale) / 2,
    };
    return {
        transform,
        userManipulated: false,
        autoFitted: true,
        lastValidViewport: viewport,
    };
}

export function preserveWorldCenter(
    previousTransform: ViewTransform,
    previousViewport: ViewportSize,
    nextViewport: ViewportSize,
): ViewTransform {
    if (!isValidViewport(previousViewport) || !isValidViewport(nextViewport)) return previousTransform;
    const worldCenter = {
        x: (previousViewport.width / 2 - previousTransform.x) / previousTransform.scale,
        y: (previousViewport.height / 2 - previousTransform.y) / previousTransform.scale,
    };
    const fittedScale = computeFitScale(nextViewport);
    const minZoom = computeMinimumZoom(nextViewport);
    const newScale = Math.max(minZoom, Math.min(DEFAULT_VIEWPORT_OPTIONS.maximumZoom, fittedScale));
    // Preserve center: compute new translation so same world point stays at viewport center
    const newTransform = {
        scale: newScale,
        x: nextViewport.width / 2 - worldCenter.x * newScale,
        y: nextViewport.height / 2 - worldCenter.y * newScale,
    };
    return constrainTransform(newTransform, nextViewport, OFFICE_SOURCE_WIDTH, OFFICE_SOURCE_HEIGHT, DEFAULT_VIEWPORT_OPTIONS.boundaryPadding);
}
