# Interactive Office Engine

## Purpose and boundaries

The office engine displays a clean 8192×5460 source image and renders validated interaction data above it. React owns viewport and selection state. Pure modules in `src/office` own coordinates, validation, geometry, access semantics, asset configuration, and deterministic ordering. The renderer consumes that state; it does not assign tasks, control agents, or provide a backend.

The current renderer is a hybrid: an HTML image preserves the browser's native image decode/downscale path, one transformed SVG holds vector overlays and accessible hit targets, and HTML provides controls and the inspector. A single source-space transform is applied to the image and overlay together, which prevents alignment drift and keeps the domain model renderer-independent. SVG is suitable for the current hundreds-to-low-thousands target because debug geometry remains inspectable and keyboard focusable. Labels are suppressed at low zoom, pointer motion does not rebuild the entity document, and transform commits are animation-frame scheduled while dragging.

The legacy Phaser prototype remains in the repository. It is not the source of truth for the new engine.

## Coordinate system

- Canonical source size: 8192 pixels wide × 5460 pixels high.
- Origin: top-left of the clean office image.
- Positive X: right. Positive Y: down.
- Overlay data uses source pixels, including path widths and sprite anchors.
- View transform: `screen = source × scale + translation`.
- Zoom is computed from the absolute current transform around the pointer; deltas are not accumulated in source coordinates.
- Fit chooses `min(viewportWidth / 8192, viewportHeight / 5460)` and centers the result.
- Pan constraints always leave a recoverable portion of the image in view.

Normalized conversion:

```text
sourceX = normalizedX × 8192
sourceY = normalizedY × 5460
normalizedX = sourceX / 8192
normalizedY = sourceY / 5460
```

Lower-resolution markup conversion:

```text
sourceX = markupX × (8192 / markupWidth)
sourceY = markupY × (5460 / markupHeight)
```

`markupToSource` accepts arbitrary positive markup dimensions. Do not assume the markup has the same aspect ratio as the production image. If its aspect ratio differs, first determine whether it was cropped, letterboxed, or stretched; a stretched guide is not a trustworthy production source.

## Assets

The manifest is `src/office/assets.ts`. The production files belong at:

```text
public/assets/office/office-8192x5460.png
public/assets/office/sprites/central-blue-tube-hologram.png
```

The background is critical and must report natural dimensions of exactly 8192×5460. The engine shows a visible error and neutral alignment grid when it is absent or invalid; it never substitutes `public/assets/bg.png`, duplicates the image, embeds it as base64, or modifies it.

The hologram is optional until supplied. Its anchor, animation metadata, scale, opacity, glow, and blend mode are data-driven. Missing sprite files render a simple non-image fallback instead of a broken-image icon. Pixel sprites use `image-rendering: pixelated`. Idle motion is disabled by `prefers-reduced-motion`.

Sprite animation data supports frame width/height/count, a frame sequence, frame duration, loop, ping-pong, idle, source-space scale, opacity, glow, and conservative blend modes. The current fallback renderer establishes this contract but does not crop through sprite-sheet frames until the real sheet is supplied and its layout is verified.

## Overlay schema

Every version 1 document declares:

- `schemaVersion: 1`
- exact source dimensions
- whether data is production
- `entities`
- `pathNodes`

Every entity has a stable ID, type, display name, geometry, source layer, enabled and interactive flags, metadata, and integer z-index. Optional fields cover tags, parents, links, access, door state, paths, seating priority, and sprites.

Supported types:

`room`, `walk_path`, `wall`, `door`, `desk`, `computer`, `access_light`, `effect_zone`, `sprite_anchor`, `restricted_zone`, `interaction_zone`, and `label_anchor`.

Supported geometry:

- `point`
- `rectangle` with positive area
- `polygon` with at least three vertices
- `polyline` with at least two vertices and positive width

Validation rejects unsupported versions, duplicate IDs, non-finite numbers, invalid bounds, malformed or zero-area geometry, zero-length path segments, unknown references, invalid layers, invalid access/priority values, malformed animation frames, and invalid path-node references.

Stable IDs use lowercase namespaced tokens, for example `room.executive-suite`, `door.executive-suite.north`, and `computer.research.desk-03`. Never rename an ID merely to improve its label; update `name`. When an ID truly changes, update all parent, entity, room, door, and path references in the same change and run tests.

## Layer model

Back to front:

1. clean background
2. paths
3. rooms
4. restricted zones
5. walls
6. doors
7. furniture
8. computers
9. access lights
10. effects
11. sprites
12. labels
13. hitboxes
14. selection, hover, and debug UI

Within a layer, z-index, entity-type precedence, then stable ID determine ordering. Production mode makes structural overlays transparent while leaving hit regions interactive. Lights, intentional effects, and sprites remain visible. Debug mode shows translucent geometry, filters, IDs where zoom permits, image coordinates, current zoom, hover, and selection.

## Access and priority semantics

Door and access-light states:

- Green: general access for standard authorized users.
- Blue: reserved or restricted to specified members, roles, teams, or rank groups.
- Yellow: temporarily reserved for meetings, events, group work, sandbox activity, or scheduled use.
- Red: blocked; no access.

Seat markers are deliberately different:

- Yellow: priority seating for executive, higher-ranking, or otherwise designated agents.
- Red: standard seating without priority designation.

Do not use yellow as a generic desk warning.

Doors can carry current/default access, linked rooms, an access policy, reserved groups, a future schedule reference, locked state, open/closed visual state, and interaction state. No scheduling or permission backend is implemented.

## Markup authoring workflow

Keep clean production imagery separate from authoring guides. Guides are never placed in `OFFICE_ASSETS` and never rendered by production code.

1. Record the clean image and guide dimensions. Confirm the guide covers the exact same uncropped image.
2. Trace one concern per guide: rooms, paths, doors, desks/computers, lights, walls, or effects.
3. Use rectangles only for genuinely rectangular regions. Use polygons for irregular rooms/restricted zones and polylines for centerline paths or walls.
4. Convert every guide point with `markupToSource`. Convert widths using the matching axis scale; reject non-uniformly stretched guides.
5. Use stable namespaced IDs and canonical layer names.
6. Encode green/blue/yellow/red access explicitly. Encode seats with only yellow/red priority.
7. Add entities to the overlay document exported through `src/domain/seed.ts`; do not hardcode them in React or Phaser scene logic.
8. Run schema tests, then turn on debug overlays and compare vertices and boundaries against the clean 8K image at fit, medium zoom, and native-detail zoom.
9. Resize the window and repeat alignment checks. Selection must remain on the same entity.
10. Disable debug mode and confirm structural markup is invisible while hit areas still work.

The checked-in `NON_PRODUCTION_OVERLAY` exists only to exercise the engine and is visibly labeled. Replace it with traced production data only after all source references are supplied and validated. A small file-shape example is in `docs/example-overlay.non-production.json`.

## Adding entities

- Room: polygon or rectangle on `rooms`; add access only when known.
- Path: polyline/polygon on `paths`; define node IDs, intersections, linked rooms/doors, direction, and blocked state.
- Door: rectangle/polygon on `doors`; link rooms and add complete door state.
- Desk/computer: appropriate geometry on `furniture`/`computers`; use a parent relationship.
- Access light: point on `lights`; provide textual access state.
- Effect: non-interactive by default on `effects`.
- Sprite: point anchor on `sprites`; reference only a manifest asset ID.

## UI and accessibility

Wheel/trackpad zoom centers on the pointer. Drag pans with pointer capture. Touch uses one-finger pan and two-pointer pinch. Buttons provide keyboard zoom, fit, reset, debug, and sidebar control. Interactive SVG entities are focusable and select with Enter or Space. Escape and background clicks clear selection. Focus outlines and inspector text avoid color-only meaning.

## Commands

```text
npm run typecheck
npm run lint
npm test
npm run build
git diff --check
```

There is no formatter dependency or formatting-check script in this repository.

## Known limitations and future boundary

- Production 8K imagery, marked-up guides, and a hologram sprite sheet are not currently present.
- No live agent movement, pathfinding, scheduling, backend, WebSocket, authentication, database, AI execution, or orchestration is included.
- The sprite contract is validated, but frame-cropping animation awaits the real asset.
- The SVG renderer avoids pathological React updates, but production-scale data should be profiled. If tens of thousands of regions require canvas, the document, transforms, ordering, and interaction helpers can remain unchanged.
- A future integration may provide validated overlay documents and live entity states to React. Phaser or another renderer may consume those states but must not become authoritative.
