import type { BuildingDefinition, FloorDefinition } from './types';
import type { FloorId } from './ids';

export class BuildingRegistry {
    private readonly floors = new Map<FloorId, FloorDefinition>();

    public constructor(private readonly definition: Omit<BuildingDefinition, 'floors'>) {}

    public registerFloor(floor: FloorDefinition): void {
        if (this.floors.has(floor.id)) {
            throw new Error(`Floor already registered: ${floor.id}`);
        }
        if (floor.buildingId !== this.definition.id) {
            throw new Error(`Floor ${floor.id} belongs to ${floor.buildingId}, not ${this.definition.id}`);
        }
        this.floors.set(floor.id, floor);
    }

    public getFloor(id: FloorId): FloorDefinition | undefined {
        return this.floors.get(id);
    }

    public getBuilding(): BuildingDefinition {
        return { ...this.definition, floors: [...this.floors.values()] };
    }
}
