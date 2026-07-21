# Floor 1 Work Log

## Goal 1 — architecture and clean branch

- Repository: `DrewDiStefano11/jarvis-office-prototype`
- Origin: `https://github.com/DrewDiStefano11/jarvis-office-prototype.git`
- Branch: `feature/floor-1-visual-foundation-v2`
- Base SHA (`main`): `23ff763f1afeb5b3394e40de077a272cacb4c518`
- Goal 1 architecture HEAD: `50492efcd62ed9eb0ca8e9841101ad3374e83784`
- PR #8: open, unmerged, reference-only at `38a8452fae3846f70c955e2ea097bd575874b7d4`
- Reference image: available at task attachment `image-1.png`
- Isolation: `jarvis-agent-ecosystem` was not cloned or opened

### Baseline on untouched `main`

- `npm ci`: passed; 231 packages installed; npm reported 7 pre-existing dependency vulnerabilities
- `npx tsc --noEmit`: passed
- `npm run lint`: failed because `main` had no `lint` script
- `npx eslint src`: passed
- `npx vitest run`: passed, 8 files / 143 tests
- `npm run build`: passed outside the filesystem sandbox
- `npm run dev-nolog`: HTTP 200; browser title `Phaser React Template`; no console or page errors
- Baseline visual: sparse top-down debug geometry with raw blocks and overlapping labels

### Goal 1 implementation

- Added dedicated IDs and typed building, floor, department, room, zone, wall, door, access, furniture, workspace, architecture, occupant, and permanent-agent definitions.
- Added populated Floor 1 foundation data and stable permanent roster IDs.
- Added generic validation for uniqueness, references, geometry, footprints, capacities, and floor ownership.
- Added one centralized world-to-isometric projection and a renderer-neutral render plan.
- Added a generic Phaser pixel-texture factory and renderer with no Floor 1 ID branches.
- Added `lint` and `test` scripts matching the required commands.
- Added a second minimal mock-floor test proving renderer independence from Floor 1 IDs.

### Pixel-art method

The renderer creates original 16–40 px internal textures for occupants, desks, consoles, plants, shelves, doors, stairs, elevators, gates, and equipment. Textures use nearest-neighbor filtering and integer placement. Layered hard-edged shapes, stepped geometry, highlights, shadows, and a limited warm palette create sprite-like assets without external copyrighted material. Floor placement remains data-driven; renderer strategies branch only on generic object categories.
