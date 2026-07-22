import { FloorOneMapData } from './floorOneTypes';
import { parseMapData } from './floorOneValidation';

class MapLoader {
    private currentMapData: FloorOneMapData | null = null;
    private originalMapData: FloorOneMapData | null = null;

    public async loadInitialMap(url: string = '/assets/maps/jarvis-floor-1-map.json'): Promise<FloorOneMapData> {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load map data from ${url}`);
            }
            const text = await response.text();
            const { data, errors } = parseMapData(text);

            if (errors.length > 0) {
                throw new Error(`Map Validation Errors:\n${errors.join('\n')}`);
            }

            if (!data) {
                throw new Error("Failed to parse map data.");
            }

            // Deep copy to store original
            this.originalMapData = JSON.parse(JSON.stringify(data));
            this.currentMapData = JSON.parse(JSON.stringify(data));

            return this.currentMapData!;
        } catch (error) {
            console.error("Error loading map:", error);
            throw error;
        }
    }

    public getMapData(): FloorOneMapData | null {
        return this.currentMapData;
    }

    public importMapData(jsonString: string): string[] {
        const { data, errors } = parseMapData(jsonString);
        if (errors.length === 0 && data) {
            this.currentMapData = data;
        }
        return errors;
    }

    public exportMapData(): string {
        if (!this.currentMapData) {
            return "{}";
        }
        return JSON.stringify(this.currentMapData, null, 2);
    }

    public resetToOriginal() {
        if (this.originalMapData) {
            this.currentMapData = JSON.parse(JSON.stringify(this.originalMapData));
        }
    }
}

export const floorOneLoader = new MapLoader();

// Coordinate Conversion Utilities
// The map native coordinates are 1536x1024.
// Phaser Camera handles zooming and panning.
// If we need absolute conversion:
export const MapCoordinates = {
    screenToMap: (screenX: number, screenY: number, camera: Phaser.Cameras.Scene2D.Camera) => {
        return {
            x: camera.scrollX + (screenX / camera.zoom),
            y: camera.scrollY + (screenY / camera.zoom)
        };
    },
    mapToScreen: (mapX: number, mapY: number, camera: Phaser.Cameras.Scene2D.Camera) => {
        return {
            x: (mapX - camera.scrollX) * camera.zoom,
            y: (mapY - camera.scrollY) * camera.zoom
        };
    }
};
