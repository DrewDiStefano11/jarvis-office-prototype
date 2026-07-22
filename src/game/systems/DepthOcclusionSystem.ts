import { Scene, GameObjects } from 'phaser';
import { FloorOneMapData } from '../../data/floorOne/floorOneTypes';

export class DepthOcclusionSystem {
    private scene: Scene;
    private mapData: FloorOneMapData;

    // In a full implementation, you would crop portions of the original image
    // and place them dynamically above the character. For this prototype, we'll
    // utilize masked polygons from the original image rendered at a higher depth.

    private overlayImages: GameObjects.Image[] = [];

    constructor(scene: Scene, mapData: FloorOneMapData) {
        this.scene = scene;
        this.mapData = mapData;
    }

    public setupOcclusion() {
        if (!this.mapData.foregroundMasks || this.mapData.foregroundMasks.length === 0) {
            return;
        }

        // We can create a masked copy of the original image for each mask region
        for (const mask of this.mapData.foregroundMasks) {
            if (!mask.enabled || (!mask.polygon && !mask.rect)) continue;

            // Create a dedicated graphics object to act as the mask geometry
            const geometry = this.scene.add.graphics();
            geometry.fillStyle(0xffffff, 1);

            if (mask.polygon && mask.polygon.length > 0) {
                geometry.beginPath();
                geometry.moveTo(mask.polygon[0].x, mask.polygon[0].y);
                for (let i = 1; i < mask.polygon.length; i++) {
                    geometry.lineTo(mask.polygon[i].x, mask.polygon[i].y);
                }
                geometry.closePath();
                geometry.fillPath();
            } else if (mask.rect) {
                geometry.fillRect(mask.rect.x, mask.rect.y, mask.rect.width, mask.rect.height);
            }

            // Create the mask
            const phaserMask = geometry.createGeometryMask();

            // Create a duplicate of the base image but set it to render ABOVE the character
            // The character is depth 10, so this goes to 15.
            const overlay = this.scene.add.image(0, 0, 'jarvis-floor-1-clean').setOrigin(0, 0);
            overlay.setDepth(15);
            overlay.setMask(phaserMask);

            // We can toggle this overlay on and off for debug
            this.overlayImages.push(overlay);
        }
    }

    public setVisible(visible: boolean) {
        this.overlayImages.forEach(img => img.setVisible(visible));
    }
}
