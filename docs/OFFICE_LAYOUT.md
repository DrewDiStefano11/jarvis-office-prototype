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
- When performing validation or generating files inside Node.js scripts (like tests and generation), paths are fully resolved absolute paths against a strictly provided `publicRoot`.
- Safety against sibling/parent directory traversal attacks (e.g. `../` escapes or absolute `/etc` paths) is enforced algorithmically by evaluating if `path.relative` leads back up beyond the defined public boundary.

## Placeholder Dimensions
- The generated deterministic placeholder files exactly match the manifest `frameWidth` and `frameHeight`.
- No required asset uses 1x1 dimensions.

## Static-placeholder animation rules
- Static assets like simple placeholder PNGs must be marked as `isPlaceholder: true` and have **empty animations** `animations: []`. They should not attempt to define animation clips for frames that do not exist.

## Validation Contracts
Validation has been split into two strict layers: pure browser-safe metadata validation and a Node.js physical file validator. Both return structured `OfficeValidationResult` objects populated with typed `OfficeValidationIssue` entries utilizing exact `OfficeValidationCode`s.

### Browser-Safe Validation (`src/office-layout/validation.ts`)
- **Layout Validation:**
  - Emits specific codes like `EMPTY_ID`, `DUPLICATE_ROOM_ID`, `DUPLICATE_WORKSTATION_ID`.
  - Enforces finite geometries (`NONFINITE_COORDINATE`, `INVALID_DIMENSIONS`).
  - Validates `Furniture` size dimensions (`INVALID_DIMENSIONS`) and exact bounding-box overlap of footprints (`BLOCKED_GEOMETRY_CONFLICT`).
  - Checks for strictly inside bounds (`OUTSIDE_ROOM_BOUNDS`).
  - Checks for blocked area conflicts (`BLOCKED_GEOMETRY_CONFLICT`).
  - Asserts doorways physically touch the shared border geometries of two distinct valid rooms explicitly (`INVALID_DOORWAY`, `UNKNOWN_ROOM_REFERENCE`).
- **Assignment Validation:**
  - Precisely maps every agent defined in the canonical `PERMANENT_AGENT_IDS` list (`MISSING_PERMANENT_AGENT_ASSIGNMENT`).
  - Verifies presence of workstations, spawn points, primary and secondary destinations, and sprites inside the active layout and manifest (`UNKNOWN_WORKSPACE_ID`, `UNKNOWN_SPAWN_ID`, etc).
  - Detects duplicate assignment mappings (`DUPLICATE_ASSIGNMENT`) and exclusive workstation conflicts (`WORKSTATION_CONFLICT`).
  - Primary destination repeated in secondaries (`PRIMARY_DESTINATION_REPEATED`).
- **Asset Manifest Validation:**
  - Emits `DUPLICATE_ASSET_ID`, `INVALID_ASSET_DIMENSIONS`, `INVALID_ASSET_PATH`.
  - Rejects browser paths trying to escape root (`INVALID_ASSET_PATH`).
  - Rejects unsupported categories (`UNSUPPORTED_ASSET_CATEGORY`).
  - Ensures static placeholders properly enforce empty animations (`STATIC_ASSET_HAS_ANIMATION`).
  - Validates animation structures natively (`INVALID_ANIMATION_RANGE`, `INVALID_ANIMATION_FRAME_RATE`).
  - Enforces required elements exist like chair, computer, wall tile (`MISSING_REQUIRED_ASSET`).

### Node-Only File Validation (`src/office-layout/nodeValidation.ts`)
- Accepts a manifest and resolves against a strict public root directory checking `path.relative` constraints.
- Verifies files physically exist (`ASSET_FILE_MISSING`).
- Checks PNG structural headers using `fs`/Buffer directly without large library dependencies (`INVALID_PNG_SIGNATURE`).
- Finds the `IHDR` chunk verifying its exact length is exactly 13 bytes (`PNG_IHDR_INVALID`), to correctly compare binary encoded dimensions to the source-of-truth declared in the manifest (`PNG_WIDTH_MISMATCH`, `PNG_HEIGHT_MISMATCH`).

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
