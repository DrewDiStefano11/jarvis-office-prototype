import type { Bounds, Point2D } from '../domain/building/types';

export interface IsometricProjection {
    readonly origin: Point2D;
    readonly tileWidth: number;
    readonly tileHeight: number;
}

export interface ScreenPoint extends Point2D {
    readonly depth: number;
}

export const DEFAULT_ISOMETRIC_PROJECTION: IsometricProjection = {
    origin: { x: 760, y: 72 },
    tileWidth: 1.04,
    tileHeight: 0.66,
};

export function worldToIsometric(
    point: Point2D,
    projection: IsometricProjection = DEFAULT_ISOMETRIC_PROJECTION,
    elevation = 0,
): ScreenPoint {
    return {
        x: projection.origin.x + (point.x - point.y) * projection.tileWidth / 2,
        y: projection.origin.y + (point.x + point.y) * projection.tileHeight / 2 - elevation,
        depth: point.x + point.y + elevation,
    };
}

export function projectBounds(bounds: Bounds, projection: IsometricProjection = DEFAULT_ISOMETRIC_PROJECTION) {
    return [
        worldToIsometric({ x: bounds.x, y: bounds.y }, projection),
        worldToIsometric({ x: bounds.x + bounds.width, y: bounds.y }, projection),
        worldToIsometric({ x: bounds.x + bounds.width, y: bounds.y + bounds.height }, projection),
        worldToIsometric({ x: bounds.x, y: bounds.y + bounds.height }, projection),
    ] as const;
}
