import { GameObjects, Scene } from 'phaser';
import type { FloorDefinition, Point2D, VisualMetadata } from '../domain/building/types';
import { projectBounds, worldToIsometric } from './isometric';
import { architectureTextureKey, createPixelArtTextures, furnitureTextureKey, occupantTextureKey } from './pixelTextures';

const paletteColor = (visual: VisualMetadata): number => {
    if (visual.palette.includes('cyan') || visual.palette.includes('nexus')) return 0x244854;
    if (visual.palette.includes('red') || visual.palette.includes('rust')) return 0x7a4b3f;
    if (visual.palette.includes('violet') || visual.palette.includes('purple') || visual.palette.includes('plum')) return 0x66536f;
    if (visual.palette.includes('blue') || visual.palette.includes('navy')) return 0x526678;
    if (visual.palette.includes('forest') || visual.palette.includes('olive')) return 0x66705a;
    return 0xb99b79;
};

const variantTint = (variant: string): number | undefined => {
    if (variant.includes('security') || variant.includes('audit') || variant.includes('red')) return 0xd97862;
    if (variant.includes('operations') || variant.includes('cyan') || variant.includes('nexus')) return 0x72cbd6;
    if (variant.includes('violet') || variant.includes('purple') || variant.includes('plum') || variant.includes('containment')) return 0xb38bd2;
    if (variant.includes('quality')) return 0xaa8bd8;
    if (variant.includes('knowledge') || variant.includes('green')) return 0x8fbd7a;
    if (variant.includes('temporary') || variant.includes('amber') || variant.includes('yellow')) return 0xe2ba62;
    if (variant.includes('project') || variant.includes('blue') || variant.includes('vacant')) return 0x7fa8d2;
    if (variant.includes('executive') || variant.includes('gold')) return 0xd7ad6f;
    return undefined;
};

const drawDiamond = (graphics: GameObjects.Graphics, points: readonly Point2D[], color: number): void => {
    graphics.fillStyle(color).beginPath().moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
    graphics.closePath().fillPath();
    graphics.lineStyle(2, 0x2b2521, 1).strokePath();
};

export class FloorSceneRenderer {
    private renderedObjectCount = 0;

    public constructor(private readonly scene: Scene, private readonly floor: FloorDefinition) {}

    public render(): number {
        createPixelArtTextures(this.scene);
        this.drawSpaces();
        this.drawDepartmentLabels();
        this.drawWalls();
        this.drawDoorsAndThresholds();
        this.drawFurniture();
        this.drawWorkspaces();
        this.drawArchitecture();
        this.drawOccupants();
        return this.renderedObjectCount;
    }

    private drawSpaces(): void {
        [...this.floor.rooms, ...this.floor.zones].forEach((space) => {
            const points = projectBounds(space.bounds);
            const graphics = this.scene.add.graphics().setDepth(points[0].depth - 1000);
            drawDiamond(graphics, points, paletteColor(space.visual));
            const inset = projectBounds({ x: space.bounds.x + 8, y: space.bounds.y + 8, width: Math.max(1, space.bounds.width - 16), height: Math.max(1, space.bounds.height - 16) });
            graphics.lineStyle(1, 0xd9c5a9, 0.35).beginPath().moveTo(inset[0].x, inset[0].y);
            inset.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
            graphics.closePath().strokePath();
            this.renderedObjectCount += 1;

            if (space.visual.labelVisibility !== 'hidden') {
                const center = worldToIsometric({ x: space.bounds.x + space.bounds.width / 2, y: space.bounds.y + 12 });
                this.scene.add.text(Math.round(center.x), Math.round(center.y), space.visual.shortLabel ?? space.visual.label, {
                    fontFamily: 'monospace', fontSize: '8px', color: '#f5e5c9', backgroundColor: '#201a17df', padding: { x: 3, y: 2 }, align: 'center', wordWrap: { width: 108 },
                }).setOrigin(0.5).setDepth(center.depth + 5000);
                this.renderedObjectCount += 1;
            }
        });
    }

    private drawWalls(): void {
        this.floor.walls.forEach((wall) => {
            const from = worldToIsometric(wall.from);
            const to = worldToIsometric(wall.to);
            const graphics = this.scene.add.graphics().setDepth(Math.max(from.depth, to.depth) + 200);
            const alpha = wall.material === 'glass' ? 0.42 : 1;
            const color = wall.material === 'construction-barrier' ? 0xc18b35 : 0x5f5147;
            graphics.fillStyle(color, alpha).beginPath().moveTo(from.x, from.y).lineTo(to.x, to.y).lineTo(to.x, to.y - wall.height).lineTo(from.x, from.y - wall.height).closePath().fillPath();
            graphics.lineStyle(2, wall.material === 'glass' ? 0xa8e8ed : 0x2a211c, alpha).strokePath();
            graphics.lineStyle(2, 0xd5b78f, alpha * 0.7).lineBetween(from.x, from.y - wall.height, to.x, to.y - wall.height);
            this.renderedObjectCount += 1;
        });
    }

    private drawDepartmentLabels(): void {
        this.floor.departments.forEach((department) => {
            const point = worldToIsometric(department.labelPosition);
            const color = paletteColor(department.visual);
            this.scene.add.text(Math.round(point.x), Math.round(point.y), department.visual.shortLabel ?? `${department.number}. ${department.name}`, {
                fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', color: '#fff3d6', backgroundColor: `#${color.toString(16).padStart(6, '0')}ee`,
                padding: { x: 7, y: 3 }, align: 'center', wordWrap: { width: 190 },
            }).setOrigin(0.5).setDepth(point.depth + 8000);
            this.renderedObjectCount += 1;
        });
    }

    private drawDoorsAndThresholds(): void {
        this.floor.doors.forEach((door) => {
            const point = worldToIsometric(door.position);
            const color = door.accessLevel === 'highly-restricted' ? 0xe14b3f : door.accessLevel === 'restricted' ? 0xe99a3a : door.accessLevel === 'escorted-containment' ? 0xa56ad4 : door.accessLevel === 'department' ? 0x448ed1 : 0x58b96b;
            this.scene.add.rectangle(Math.round(point.x), Math.round(point.y - 10), Math.max(10, door.width / 3), 20, 0x312a25).setStrokeStyle(2, color).setDepth(point.depth + 300);
            this.renderedObjectCount += 1;
        });
        this.floor.accessThresholds.forEach((threshold) => {
            const point = worldToIsometric(threshold.position);
            this.scene.add.rectangle(Math.round(point.x + 8), Math.round(point.y - 7), 5, 9, threshold.accessLevel === 'escorted-containment' ? 0xa56ad4 : threshold.accessLevel === 'highly-restricted' ? 0xe14b3f : threshold.accessLevel === 'restricted' ? 0xe99a3a : threshold.accessLevel === 'department' ? 0x448ed1 : 0x58b96b).setDepth(point.depth + 350);
            this.renderedObjectCount += 1;
        });
    }

    private addPixelImage(key: string, position: Point2D, scale = 1.25, visualVariant = ''): GameObjects.Image {
        const point = worldToIsometric(position);
        const image = this.scene.add.image(Math.round(point.x), Math.round(point.y), key).setScale(scale).setOrigin(0.5, 0.8).setDepth(point.depth + 400);
        const tint = variantTint(visualVariant);
        if (tint !== undefined) image.setTint(tint);
        this.renderedObjectCount += 1;
        return image;
    }

    private drawFurniture(): void {
        this.floor.furniture.forEach((entity) => this.addPixelImage(furnitureTextureKey(entity.furnitureType), entity.position, 1.25, entity.visualVariant));
    }

    private drawWorkspaces(): void {
        this.floor.workspaces.forEach((entity) => {
            const point = worldToIsometric(entity.position);
            const color = entity.workspaceType === 'temporary' ? 0xe4bd4c : entity.workspaceType === 'sandbox' ? 0xa56ad4 : entity.occupancyState === 'vacant' ? 0x5d9dd5 : entity.workspaceType === 'shared-surge' ? 0x7f8d91 : 0x55b46a;
            this.scene.add.rectangle(Math.round(point.x), Math.round(point.y + 4), 13, 5, color, 0.9).setDepth(point.depth + 350);
            this.renderedObjectCount += 1;
        });
    }

    private drawArchitecture(): void {
        this.floor.architecturalObjects.forEach((entity) => this.addPixelImage(architectureTextureKey(entity.architecturalType), entity.position, 1.25, entity.visualVariant));
    }

    private drawOccupants(): void {
        this.floor.occupants.forEach((entity) => this.addPixelImage(occupantTextureKey(entity.category), entity.position, 1.25, entity.visualVariant));
    }
}
