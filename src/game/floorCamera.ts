import type { Bounds, Point2D, Size2D } from '../domain/building/types';

export interface ScreenInsets {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
}

export interface FloorCameraState {
    readonly zoom: number;
    readonly scroll: Point2D;
}

export interface FitFloorInput {
    readonly viewport: Size2D;
    readonly bounds: Bounds;
    readonly safeArea: ScreenInsets;
    readonly margin: number;
    readonly minZoom: number;
    readonly maxZoom: number;
}

export function calculateFitFloor(input: FitFloorInput): FloorCameraState {
    const availableWidth = Math.max(1, input.viewport.width - input.safeArea.left - input.safeArea.right - input.margin * 2);
    const availableHeight = Math.max(1, input.viewport.height - input.safeArea.top - input.safeArea.bottom - input.margin * 2);
    const zoom = Math.max(input.minZoom, Math.min(input.maxZoom, availableWidth / input.bounds.width, availableHeight / input.bounds.height));
    const visibleCenter = {
        x: input.safeArea.left + input.margin + availableWidth / 2,
        y: input.safeArea.top + input.margin + availableHeight / 2,
    };
    const worldCenter = {
        x: input.bounds.x + input.bounds.width / 2,
        y: input.bounds.y + input.bounds.height / 2,
    };

    return {
        zoom,
        scroll: {
            x: worldCenter.x - visibleCenter.x / zoom,
            y: worldCenter.y - visibleCenter.y / zoom,
        },
    };
}

export function clampCameraScroll(
    scroll: Point2D,
    viewport: Size2D,
    zoom: number,
    bounds: Bounds,
    margin = 180,
): Point2D {
    const visibleWidth = viewport.width / zoom;
    const visibleHeight = viewport.height / zoom;
    const minX = bounds.x - margin;
    const minY = bounds.y - margin;
    const maxX = bounds.x + bounds.width + margin - visibleWidth;
    const maxY = bounds.y + bounds.height + margin - visibleHeight;
    return {
        x: maxX < minX ? (minX + maxX) / 2 : Math.max(minX, Math.min(maxX, scroll.x)),
        y: maxY < minY ? (minY + maxY) / 2 : Math.max(minY, Math.min(maxY, scroll.y)),
    };
}
