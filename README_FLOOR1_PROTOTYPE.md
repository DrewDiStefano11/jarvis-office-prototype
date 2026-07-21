# Jarvis HQ Floor 1 Foundation Prototype

This repository contains the architecture implementation for Floor 1 of the Jarvis HQ prototype.

## Architecture

*   **Building Registry (`src/domain/building/registry.ts`)**: The core entry point. `BuildingRegistry` holds all registered floors. You can dynamically register `FloorDefinition` objects.
*   **Coordinate Conventions**: The application maps strict logical space coordinates (`x, y, width, height`) to a baseline logical resolution of `1792 x 1024` (a strict 16:9 canvas). The `PhaserGame.tsx` component automatically scales this viewport up or down to fit the browser seamlessly.

## Floor 1 Data Structure
The floor is rigorously separated into structural typescript modules:
1.  **Departments** (`departments.ts`): Defines the exact 9 numbered foundational departments.
2.  **Rooms** (`rooms.ts`): Defines spatial constraints, names, types (e.g. `private-office`, `conference`, `focus`, `sandbox`, etc).
3.  **Workspaces** (`workspaces.ts`): Maps exact coordinates and roles (permanent desk, surge-console, temporary).
4.  **Routes** (`routes.ts`): Implements the logical Graph (nodes & edges) enforcing pathfinding constraints based on `AgentType` and `AccessLevel`.

## Agent Roster
*   A placeholder roster (`src/domain/agents/placeholderRoster.ts`) creates exactly 24 stable permanent agents (`agent-001` through `agent-024`), assigned directly to their permanent workspaces (12 private offices, 12 desks/consoles).
*   *Adding Agents*: Simply add a new record to the `floor1PlaceholderRoster` array utilizing standard helper IDs.
*   *Replacing Placeholder Data*: Since data drives rendering, replacing the placeholder data involves modifying `placeholderRoster.ts` and nothing within the Phaser Engine.

## How to add another floor
The registry supports multi-floor capability without touching `OfficeScene`. Simply:
1. Create `src/domain/floors/floor-2/...`
2. Populate its arrays.
3. Call `globalBuildingRegistry.registerFloor(myFloor2Def)`

## Deferred Work
*   Complex A* pathfinding is avoided in favor of predefined node edge traversal (Dijkstra) mapping door/corridor thresholds.
*   Advanced behavioral trees or complex AI tasks.
*   Final Sprite asset replacements (currently relying on simple colored bounding shapes).
