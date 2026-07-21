import { BuildingDefinition, FloorDefinition } from '../../types/building';
import { FloorId } from '../../types/ids';

export class BuildingRegistry {
    private building: BuildingDefinition = {
        id: 'jarvis-hq',
        floors: {}
    };

    public registerFloor(floor: FloorDefinition): void {
        this.building.floors[floor.id] = floor;
    }

    public getFloor(floorId: FloorId): FloorDefinition | undefined {
        return this.building.floors[floorId];
    }

    public getBuilding(): BuildingDefinition {
        return this.building;
    }

    public clear(): void {
        this.building.floors = {};
    }
}

export const globalBuildingRegistry = new BuildingRegistry();
