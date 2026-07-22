import { Scene, GameObjects } from 'phaser';
import { Route } from './systems/NavigationSystem';

export class TestCharacter {
    private scene: Scene;
    public graphics: GameObjects.Graphics;

    // Position state
    public x: number;
    public y: number;

    // Movement state
    private speed = 150; // pixels per second
    private activeRoute: Route | null = null;
    private currentRouteIndex: number = 0;

    constructor(scene: Scene, x: number, y: number) {
        this.scene = scene;
        this.x = x;
        this.y = y;

        this.graphics = this.scene.add.graphics();
        this.graphics.setDepth(10); // Above floor, below UI/occlusion

        this.draw();
    }

    private draw() {
        this.graphics.clear();

        // Outline
        this.graphics.lineStyle(2, 0xffffff, 1);

        // Body (Ellipse/Circle)
        this.graphics.fillStyle(0x3498db, 1);
        this.graphics.fillCircle(this.x, this.y - 15, 12);
        this.graphics.strokeCircle(this.x, this.y - 15, 12);

        // Head
        this.graphics.fillStyle(0xecf0f1, 1);
        this.graphics.fillCircle(this.x, this.y - 30, 8);
        this.graphics.strokeCircle(this.x, this.y - 30, 8);

        // Footpoint (Debug/Visual reference)
        this.graphics.fillStyle(0xe74c3c, 0.8);
        this.graphics.fillCircle(this.x, this.y, 3);
    }

    public setRoute(route: Route) {
        if (!route.found || route.path.length === 0) {
            this.activeRoute = null;
            return;
        }
        this.activeRoute = route;
        this.currentRouteIndex = 0;
        // Don't restart from 0 if we are already at 0.
        // Usually path[0] is the closest node or start node.
        // We'll move towards path[0] first.
    }

    public update(deltaMs: number) {
        if (!this.activeRoute || this.currentRouteIndex >= this.activeRoute.path.length) {
            this.activeRoute = null; // Finished
            return;
        }

        const deltaS = deltaMs / 1000;
        const targetNode = this.activeRoute.path[this.currentRouteIndex];

        const distanceToTarget = Phaser.Math.Distance.Between(this.x, this.y, targetNode.x, targetNode.y);
        const moveDist = this.speed * deltaS;

        if (distanceToTarget <= moveDist) {
            // Reached node
            this.x = targetNode.x;
            this.y = targetNode.y;
            this.currentRouteIndex++;
        } else {
            // Move towards node
            const angle = Phaser.Math.Angle.Between(this.x, this.y, targetNode.x, targetNode.y);
            this.x += Math.cos(angle) * moveDist;
            this.y += Math.sin(angle) * moveDist;
        }

        this.draw();
    }

    public setPosition(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.activeRoute = null; // Stop moving
        this.draw();
    }

    public getPosition() {
        return { x: this.x, y: this.y };
    }
}
