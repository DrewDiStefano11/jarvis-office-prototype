import { GameObjects, Scene, Textures } from 'phaser';
import type { ArchitecturalObjectType, FurnitureType, OccupantCategory } from '../domain/building/types';

export const furnitureTextureKey = (type: FurnitureType) => `pixel-furniture-${type}`;
export const architectureTextureKey = (type: ArchitecturalObjectType) => `pixel-architecture-${type}`;
export const occupantTextureKey = (category: OccupantCategory) => `pixel-occupant-${category}`;

type DrawTexture = (graphics: GameObjects.Graphics) => void;

function createTexture(scene: Scene, key: string, width: number, height: number, draw: DrawTexture): void {
    if (scene.textures.exists(key)) return;
    const graphics = scene.add.graphics();
    draw(graphics);
    graphics.generateTexture(key, width, height);
    graphics.destroy();
    scene.textures.get(key).setFilter(Textures.FilterMode.NEAREST);
}

function drawDesk(graphics: GameObjects.Graphics, accent = 0xb8783e): void {
    graphics.fillStyle(0x26170f).fillRect(4, 18, 24, 5);
    graphics.fillStyle(0x70401f).fillRect(3, 9, 26, 10);
    graphics.fillStyle(accent).fillRect(5, 7, 22, 8);
    graphics.fillStyle(0xe4b56d).fillRect(6, 7, 18, 2);
    graphics.fillStyle(0x2a2724).fillRect(8, 22, 4, 8).fillRect(22, 22, 4, 8);
    graphics.fillStyle(0x142838).fillRect(11, 1, 12, 8);
    graphics.fillStyle(0x38bad4).fillRect(13, 3, 8, 4);
    graphics.fillStyle(0x191919).fillRect(16, 9, 2, 4);
}

function drawConsole(graphics: GameObjects.Graphics, accent: number): void {
    graphics.fillStyle(0x131a1f).fillRect(2, 9, 28, 15);
    graphics.fillStyle(0x39444a).fillRect(4, 7, 24, 4);
    graphics.fillStyle(0x102a33).fillRect(5, 1, 10, 8).fillRect(17, 1, 10, 8);
    graphics.fillStyle(accent).fillRect(7, 3, 6, 3).fillRect(19, 3, 6, 3);
    graphics.fillStyle(0xd5a94e).fillRect(6, 14, 3, 2).fillRect(11, 14, 3, 2);
    graphics.fillStyle(0x23282b).fillRect(6, 24, 5, 7).fillRect(21, 24, 5, 7);
}

function drawFurniture(scene: Scene, type: FurnitureType): void {
    createTexture(scene, furnitureTextureKey(type), 32, 32, (graphics) => {
        switch (type) {
            case 'desk': drawDesk(graphics); break;
            case 'chair':
                graphics.fillStyle(0x231b18).fillRect(9, 8, 14, 14).fillRect(7, 22, 4, 8).fillRect(21, 22, 4, 8);
                graphics.fillStyle(0x6d5548).fillRect(11, 6, 10, 12).fillStyle(0x9c765e).fillRect(12, 7, 8, 3);
                break;
            case 'monitor':
            case 'display':
                graphics.fillStyle(0x16191d).fillRect(3, 3, 26, 19).fillStyle(0x1c6374).fillRect(6, 6, 20, 13);
                graphics.fillStyle(0x3ce0d0).fillRect(8, 8, 8, 2).fillRect(8, 12, 14, 2);
                graphics.fillStyle(0x2a2724).fillRect(14, 22, 4, 6).fillRect(9, 28, 14, 3);
                break;
            case 'conference-table':
                graphics.fillStyle(0x3a2115).fillRect(2, 13, 28, 12).fillStyle(0x8b512a).fillRect(3, 7, 26, 12);
                graphics.fillStyle(0xd29a58).fillRect(5, 7, 20, 2).fillStyle(0x21150f).fillRect(7, 25, 4, 6).fillRect(21, 25, 4, 6);
                break;
            case 'operations-console': drawConsole(graphics, 0x22d3c5); break;
            case 'nexus-console': drawConsole(graphics, 0x43e9ff); break;
            case 'shelf':
                graphics.fillStyle(0x3d2417).fillRect(4, 2, 24, 29).fillStyle(0x8a532e).fillRect(6, 4, 20, 4).fillRect(6, 13, 20, 3).fillRect(6, 22, 20, 3);
                graphics.fillStyle(0xb84d3b).fillRect(8, 8, 3, 5).fillStyle(0x567c4c).fillRect(12, 7, 4, 6).fillStyle(0xd8ad55).fillRect(18, 9, 5, 4);
                break;
            case 'plant':
                graphics.fillStyle(0x5b3420).fillRect(10, 21, 12, 9).fillStyle(0xb56c38).fillRect(8, 20, 16, 4);
                graphics.fillStyle(0x315d35).fillRect(14, 7, 5, 15).fillRect(7, 10, 8, 7).fillRect(18, 4, 7, 10);
                graphics.fillStyle(0x6f9c50).fillRect(10, 8, 5, 5).fillRect(19, 6, 4, 5);
                break;
            case 'security-terminal': drawConsole(graphics, 0xf26a4b); break;
            case 'checkpoint-gate':
                graphics.fillStyle(0x23272c).fillRect(2, 5, 7, 26).fillRect(23, 5, 7, 26).fillStyle(0x84939b).fillRect(4, 7, 3, 20).fillRect(25, 7, 3, 20);
                graphics.fillStyle(0x42df77).fillRect(4, 2, 5, 4).fillStyle(0xe64f43).fillRect(23, 2, 5, 4).fillStyle(0x9ed9de).fillRect(9, 14, 14, 3);
                break;
            case 'glass-barrier':
                graphics.fillStyle(0x8ad8df, 0.45).fillRect(3, 4, 26, 23).fillStyle(0xd7fbff).fillRect(5, 6, 3, 18).fillStyle(0x344a51).fillRect(2, 27, 28, 4);
                break;
            case 'credenza': drawDesk(graphics, 0x91542c); break;
            case 'whiteboard':
                graphics.fillStyle(0x3c332b).fillRect(2, 3, 28, 25).fillStyle(0xe6dfca).fillRect(5, 6, 22, 17);
                graphics.fillStyle(0x5582a7).fillRect(7, 9, 9, 2).fillStyle(0xb75e4f).fillRect(7, 13, 15, 2);
                break;
            case 'cabinet':
            case 'support-equipment':
                graphics.fillStyle(0x272b2c).fillRect(5, 2, 22, 29).fillStyle(0x687378).fillRect(7, 4, 18, 11).fillRect(7, 17, 18, 11);
                graphics.fillStyle(0xd59f43).fillRect(21, 9, 2, 2).fillRect(21, 22, 2, 2);
                break;
        }
    });
}

function drawArchitecture(scene: Scene, type: ArchitecturalObjectType): void {
    createTexture(scene, architectureTextureKey(type), 40, 40, (graphics) => {
        switch (type) {
            case 'stairs':
            case 'emergency-exit':
                for (let step = 0; step < 7; step += 1) {
                    graphics.fillStyle(step % 2 ? 0x75675b : 0x9b8877).fillRect(5 + step * 2, 5 + step * 4, 28 - step * 2, 4);
                }
                break;
            case 'elevator':
            case 'service-elevator':
                graphics.fillStyle(0x252a2e).fillRect(3, 2, 34, 37).fillStyle(0x7b8589).fillRect(6, 5, 13, 30).fillRect(21, 5, 13, 30);
                graphics.fillStyle(type === 'service-elevator' ? 0xe0503f : 0x4ea5e4).fillRect(17, 1, 6, 3);
                break;
            case 'expansion-seal':
                graphics.fillStyle(0x2c2926).fillRect(2, 5, 36, 31).fillStyle(0xd19a39).fillRect(4, 8, 32, 5).fillRect(4, 23, 32, 5);
                graphics.lineStyle(3, 0x241c16).lineBetween(6, 8, 34, 34).lineBetween(34, 8, 6, 34);
                break;
            case 'hologram':
                graphics.fillStyle(0x1dbad3, 0.25).fillCircle(20, 18, 16).fillStyle(0x61f1ff, 0.75).fillCircle(20, 16, 8);
                graphics.lineStyle(2, 0x7ff7ff, 0.8).strokeCircle(20, 18, 14).lineBetween(7, 18, 33, 18).lineBetween(20, 4, 20, 32);
                graphics.fillStyle(0x234657).fillRect(8, 33, 24, 5);
                break;
            case 'clock':
                graphics.fillStyle(0x36271c).fillCircle(20, 20, 15).fillStyle(0xe8d9b7).fillCircle(20, 20, 12);
                graphics.lineStyle(2, 0x36271c).lineBetween(20, 20, 20, 11).lineBetween(20, 20, 27, 23);
                break;
            case 'camera':
                graphics.fillStyle(0x2a3033).fillRect(7, 11, 22, 12).fillStyle(0x779096).fillRect(9, 8, 18, 6).fillStyle(0xe44c3c).fillRect(24, 15, 4, 4);
                graphics.fillStyle(0x3a3f40).fillRect(17, 23, 4, 10);
                break;
            case 'badge-reader':
                graphics.fillStyle(0x22282c).fillRect(8, 5, 24, 30).fillStyle(0x62d478).fillRect(12, 10, 16, 8).fillStyle(0xbcc7c9).fillRect(13, 23, 14, 3);
                break;
            case 'construction-material':
                graphics.fillStyle(0x6f4c2a).fillRect(4, 24, 32, 8).fillStyle(0xc58b43).fillRect(6, 18, 28, 6).fillRect(9, 12, 22, 6);
                break;
        }
    });
}

function drawOccupant(scene: Scene, category: OccupantCategory): void {
    const colors: Record<OccupantCategory, number> = {
        permanent: 0x4778a8,
        temporary: 0xd6a43d,
        sandbox: 0x8e5bc2,
        visitor: 0x6d8a68,
        escort: 0xc45c48,
        waiting: 0x8b7766,
    };
    createTexture(scene, occupantTextureKey(category), 16, 24, (graphics) => {
        graphics.fillStyle(0x2b1d18).fillRect(5, 1, 6, 3);
        graphics.fillStyle(0xd6a273).fillRect(4, 4, 8, 7).fillStyle(0xf2c397).fillRect(6, 5, 4, 3);
        graphics.fillStyle(colors[category]).fillRect(3, 11, 10, 8).fillStyle(0x222d37).fillRect(3, 19, 4, 5).fillRect(9, 19, 4, 5);
        graphics.fillStyle(0xf1c35f).fillRect(11, 12, 2, 3);
    });
}

export function createPixelArtTextures(scene: Scene): void {
    const furnitureTypes: readonly FurnitureType[] = ['desk', 'chair', 'monitor', 'conference-table', 'operations-console', 'nexus-console', 'shelf', 'plant', 'display', 'security-terminal', 'checkpoint-gate', 'glass-barrier', 'credenza', 'whiteboard', 'cabinet', 'support-equipment'];
    const architectureTypes: readonly ArchitecturalObjectType[] = ['elevator', 'service-elevator', 'stairs', 'emergency-exit', 'expansion-seal', 'hologram', 'clock', 'camera', 'badge-reader', 'construction-material'];
    const occupantCategories: readonly OccupantCategory[] = ['permanent', 'temporary', 'sandbox', 'visitor', 'escort', 'waiting'];
    furnitureTypes.forEach((type) => drawFurniture(scene, type));
    architectureTypes.forEach((type) => drawArchitecture(scene, type));
    occupantCategories.forEach((category) => drawOccupant(scene, category));
}
