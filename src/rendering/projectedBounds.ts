import type { Bounds, FloorDefinition, Point2D } from '../domain/building/types';
import { DEFAULT_ISOMETRIC_PROJECTION, projectBounds, worldToIsometric, type IsometricProjection } from './isometric';

export interface ProjectedBounds extends Bounds {
    readonly center: Point2D;
}

const paddingForFloor = 52;

export function calculateProjectedFloorBounds(
    floor: FloorDefinition,
    projection: IsometricProjection = DEFAULT_ISOMETRIC_PROJECTION,
): ProjectedBounds {
    const points: Point2D[] = [];
    [...floor.rooms, ...floor.zones].forEach((space) => points.push(...projectBounds(space.bounds, projection)));
    floor.walls.forEach((wall) => {
        const from = worldToIsometric(wall.from, projection);
        const to = worldToIsometric(wall.to, projection);
        points.push(from, to, { x: from.x, y: from.y - wall.height }, { x: to.x, y: to.y - wall.height });
    });
    floor.departments.forEach((department) => points.push(worldToIsometric(department.labelPosition, projection)));
    [...floor.furniture, ...floor.workspaces, ...floor.architecturalObjects, ...floor.occupants]
        .forEach((entity) => points.push(worldToIsometric(entity.position, projection)));

    const minX = Math.min(...points.map((point) => point.x)) - paddingForFloor;
    const maxX = Math.max(...points.map((point) => point.x)) + paddingForFloor;
    const minY = Math.min(...points.map((point) => point.y)) - paddingForFloor;
    const maxY = Math.max(...points.map((point) => point.y)) + paddingForFloor;

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
    };
}
