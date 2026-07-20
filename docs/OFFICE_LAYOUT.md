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

## Boundary-inclusion rules
- When validating if an object is inside a room, a point exactly on the boundary (e.g. `x = bounds.x + bounds.width`) is considered **inside**.
- When checking if an object overlaps with a blocked area, a point exactly on the edge is considered **outside**. Only strictly internal points overlap.

## Canonical IDs

### Agent IDs
- `jarvis`
- `atlas`
- `scout`
- `archive`
- `sentinel`

### Canonical Workspace IDs
- `jarvis_desk`
- `atlas_desk`
- `scout_desk`
- `archive_desk`
- `sentinel_desk`

### Canonical Sprite IDs
- `sprite-agent-jarvis`
- `sprite-agent-atlas`
- `sprite-agent-scout`
- `sprite-agent-archive`
- `sprite-agent-sentinel`

## Asset Folder Structure
- Placeholder assets are organized under `public/assets/office/` to maintain modularity:
  - `agents/`: Agent character sprites
  - `furniture/`: Desks, tables, cabinets
  - `environment/`: Doors, walls
  - `indicators/`: Status markers
  - `tiles/`: Floor and background tiles
  - `decoration/`: Plants, non-interactive elements

## Browser Asset Paths
- In `assetManifest.ts`, browser paths must omit the leading `public/` folder, for example: `assets/office/agents/jarvis-placeholder.png`.

## Filesystem Path Resolution
- When performing validation or generating files inside Node.js scripts (like tests and generation), paths are fully resolved absolute paths, combining the manifest `filePath` prefixed with `public/` using `path.resolve(process.cwd(), 'public')` safely.

## Placeholder Dimensions
- The generated deterministic placeholder files exactly match the manifest `frameWidth` and `frameHeight`.
- No required asset uses 1x1 dimensions.

## Static-placeholder animation rules
- Static assets like simple placeholder PNGs must be marked as `isPlaceholder: true` and have **empty animations** `animations: []`. They should not attempt to define animation clips for frames that do not exist.

## Validation Contracts
- `src/office-layout/validation.ts` provides structured validations returning `ValidationIssue` objects pointing to specific problems (`code`, `message`, `severity`).
- **Layout Validation:**
  - Duplicate IDs (rooms, doorways, workstations).
  - Out of bounds and blocked area geometry checks.
  - Empty IDs.
  - Negative/non-finite dimension rules.
  - Doorway references invalid or duplicate rooms.
- **Assignment Validation:**
  - Exactly maps every canonical permanent agent.
  - Verifies presence of workstations, spawn points, primary and secondary destinations, and sprites inside the active layout and manifest.
- **Asset Manifest Validation:**
  - Checks duplicate assets.
  - Files exist on disk via filesystem validation.
  - Tests verify valid actual file dimensions and PNG signatures.
  - Invalid paths (`public/`, `../`, etc) are rejected.

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
