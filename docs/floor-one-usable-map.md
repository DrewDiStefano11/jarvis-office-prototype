# Floor One Usable Map

This prototype converts the 1536x1024 canonical isometric floor plan into a dynamic environment mapped to a deterministic navigation graph.

## Features
- **Map Data Loading:** Map geometry is decoupled from Phaser rendering logic. Stored centrally in `src/data/floorOne/floor-one-map.json`.
- **Navigation Engine:** Uses deterministic pathfinding (Dijkstra) between 13 core nodes representing major departments, corridors, and the entrance.
- **Occlusion Handling:** Custom masks are applied on foreground layers (Nexus Console, Reception, Exec wall) using Phaser's custom layer depths to make the test character walk "behind" structures.
- **Geometry Editor:** Included via `MapEditorScene` allowing for dynamic manipulation of room points, navigation vertices, doors, and edges. Includes strict import validation and history stack (`Undo` / `Redo`).
- **Interactive Inspector:** Click a room or hover over debug polygons to read detailed JSON state in the React UI overlay.

## Running the project
- `npm ci`
- `npm run dev`
- **To test compilation:** `npm run build`

## Map JSON Structure
`src/data/floorOne/floor-one-map.json` contains:
- `rooms[]` (26 functional areas)
- `walkableAreas[]`
- `blockedAreas[]`
- `navigationNodes[]`
- `navigationEdges[]`
- `foregroundMasks[]`

## Editor Mode (Geometry Editor)
The UI switch in the top left toggles the Geometry Editor.
- Click to select polygons or navigation nodes/doors.
- Drag any node or vertex independently.
- Export modified changes safely via Blob.
- Arrow keys move items precisely by 1px (or 10px with Shift).
- Hit `Delete` or `Backspace` to remove selected navigation edges.

## Known Limitations
- Real AI agent profiles are disabled per requirements; a single procedural marker serves as the Test Character.
- Permissions/authentication routing is mocked in JSON properties but not strictly enforced algorithmically.
- The editor does not yet support multi-vertex drag.
- Foreground masks are basic overlays currently generated as cropped vectors via Phaser, not pure image slices.

## Recommended Next Phase
- replace the test character with a real agent sprite
- add agent identities and workstation assignments
- add multiple-agent path reservation
- add room access permissions
- add task and simulation systems
