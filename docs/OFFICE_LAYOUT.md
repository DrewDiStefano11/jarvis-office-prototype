# Office Layout and Asset Foundation

## Overview
This document outlines the foundation for the upcoming deterministic office layout and sprite assets. The structures defined in `src/office-layout` describe the physical coordinates, boundaries, assets, and workspace assignments for the permanent Jarvis agents.

**Note:** This layer is framework-independent and purely data-driven. It operates independently from the active deterministic task-simulation logic and contains no Phaser or React dependencies.

## Coordinate System
- Uses a standard 2D Cartesian plane starting at `(x: 0, y: 0)` in the top-left corner.
- Units map 1:1 to logical pixels for layout purposes.

## Canvas and Office Bounds
- **Overall Dimensions:** The office is a composite of several rooms with bounding dimensions that fit neatly into common grid maps.
- See `src/office-layout/layout.ts` for actual coordinate and bounds configurations.

## Rooms and Zones
- The layout is divided into structured zones like the `Main Office`, `Meeting Room`, `Research Area`, `Planning Area`, etc.
- Each room provides clear bounds (`x, y, width, height`).

## Stable ID Naming
- Every entity (room, agent, destination, furniture, doorway, etc.) uses stable string IDs.
- Examples: `room-main-office`, `desk-research-scout`, `spawn-jarvis`, `dest-meeting-table`.
- Ensure new entities conform to this format without relying on array indices.

## Agent Workspace Assignments
- Assignments map the existing permanent agents (using their stable IDs: `agent-jarvis`, `agent-atlas`, `agent-scout`, `agent-archive`, `agent-sentinel`) to:
  - A workstation ID
  - A default spawn point ID
  - A primary destination ID
  - Optional secondary destination IDs
  - An associated sprite ID

## Asset Folder Structure
- Placeholder assets are organized under `public/assets/office/` to maintain modularity:
  - `agents/`: Agent character sprites
  - `furniture/`: Desks, tables, cabinets
  - `environment/`: Doors, walls
  - `indicators/`: Status markers
  - `tiles/`: Floor and background tiles
  - `decoration/`: Plants, non-interactive elements

## Sprite Dimensions and Animation Conventions
- Placeholder assets are small solid-color graphics.
- The `assetManifest.ts` holds metadata outlining intended default bounds (e.g., 32x32 for agents, 64x32 for desks), scaling factors, and animation sequences (like `idle-down`, `walk-up`).
- Replaced sprites should conform to the frame-rate and repetition metadata provided in the manifest.

## Validation Rules
- `src/office-layout/validation.ts` provides pure helper methods to enforce structural integrity:
  - Entities must have unique IDs.
  - Workstations, spawn points, and destinations must exist inside bounds of the referenced room.
  - Doorways must reference exactly two existing rooms.
  - Assignments must point to valid workstations, spawn points, destinations, and sprite IDs.
  - Sprite animation frame ranges must be valid.

## How to Expand the Layout
1. **Rooms**: Add new bounds objects to `rooms` in `layout.ts`.
2. **Destinations**: Append to `destinations` in `layout.ts` referencing the target room ID and valid coordinate points.
3. **Furniture**: Add to `furniture` with the corresponding `spriteId`, size, and bounds.
4. **Workstations & Assignments**: Add new desks in `layout.ts` and attach the assignment map in `assignments.ts`.
5. **Assets**: Generate new assets via `scripts/generate-placeholders.js` and register them in `assetManifest.ts`.

## Future Phaser Integration Contract
Integration with the Phaser scene renderer is **intentionally deferred** in this task to avoid merge conflicts with the active simulation branch.

In the future, the Phaser scene should:
- Import `defaultOfficeLayout` and `defaultAssetManifest`.
- Use the manifest to configure Phaser's asset loader natively, replacing current procedural shapes with the loaded sprites.
- Pre-bake walkable paths and blocking bodies using `walkableAreas` and `blockedAreas`.
- Spawn initial agents at their designated `spawnPoints` retrieved from `workspaceAssignments`.
- Handle movement destinations strictly through stable IDs (`DestinationId`) queried via the layout data layer rather than local scene constants.

This ensures Phaser remains solely an ephemeral visual renderer driven by external layout and domain models.
