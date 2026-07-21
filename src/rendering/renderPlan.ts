import type { FloorDefinition, Point2D, VisualMetadata } from '../domain/building/types';

export type RenderLayer = 'surface' | 'wall' | 'access' | 'object' | 'occupant' | 'label';
export type RenderCategory =
    | 'room'
    | 'zone'
    | 'wall'
    | 'door'
    | 'access-threshold'
    | 'furniture'
    | 'workspace'
    | 'architecture'
    | 'occupant';

export interface RenderCommand {
    readonly id: string;
    readonly layer: RenderLayer;
    readonly category: RenderCategory;
    readonly position: Point2D;
    readonly visualVariant: string;
    readonly label?: string;
}

const center = (bounds: { x: number; y: number; width: number; height: number }): Point2D => ({
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
});

const visualCommand = (
    id: string,
    category: RenderCategory,
    position: Point2D,
    visual: VisualMetadata,
): RenderCommand => ({ id, category, position, layer: 'surface', visualVariant: visual.visualVariant, label: visual.label });

export function createRenderPlan(floor: FloorDefinition): readonly RenderCommand[] {
    return [
        ...floor.rooms.map((entity) => visualCommand(entity.id, 'room', center(entity.bounds), entity.visual)),
        ...floor.zones.map((entity) => visualCommand(entity.id, 'zone', center(entity.bounds), entity.visual)),
        ...floor.walls.map((entity) => ({ id: entity.id, category: 'wall' as const, layer: 'wall' as const, position: entity.from, visualVariant: entity.visualVariant })),
        ...floor.doors.map((entity) => ({ id: entity.id, category: 'door' as const, layer: 'access' as const, position: entity.position, visualVariant: entity.visualVariant })),
        ...floor.accessThresholds.map((entity) => ({ id: entity.id, category: 'access-threshold' as const, layer: 'access' as const, position: entity.position, visualVariant: entity.visualVariant })),
        ...floor.furniture.map((entity) => ({ id: entity.id, category: 'furniture' as const, layer: 'object' as const, position: entity.position, visualVariant: entity.visualVariant })),
        ...floor.workspaces.map((entity) => ({ id: entity.id, category: 'workspace' as const, layer: 'object' as const, position: entity.position, visualVariant: entity.visualVariant })),
        ...floor.architecturalObjects.map((entity) => ({ id: entity.id, category: 'architecture' as const, layer: 'object' as const, position: entity.position, visualVariant: entity.visualVariant })),
        ...floor.occupants.map((entity) => ({ id: entity.id, category: 'occupant' as const, layer: 'occupant' as const, position: entity.position, visualVariant: entity.visualVariant, label: entity.label })),
    ];
}
