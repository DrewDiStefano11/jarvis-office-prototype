# AGENTS.md — AI Hub Interactive Office Repository Instructions

## 1. Mission

This repository contains the interactive AI Hub office.

The office is built from a clean, high-resolution pixel-art master image and a set of annotated markup files that define rooms, doors, walkable areas, wall collisions, object collisions, computer locations, workstation positions, major interactive objects, and door-access lights.

The implementation must convert those reference files into a reliable, data-driven, interactive environment without changing the intended geometry, access meanings, room identities, door IDs, or visual composition.

Codex has broad freedom to choose and implement the technical architecture, but it must follow the source-of-truth, validation, phasing, and acceptance rules in this file.

---

## 2. Repository-Level Authority

This file applies to the entire repository unless a more specific nested `AGENTS.md` exists in a subdirectory.

Nested instructions may add implementation-specific guidance, but they may not override the following non-negotiable rules:

- preserve the clean office artwork;
- The authoritative runtime/world coordinate system is 8192 × 5460.
- The markup PDFs use a 4608 × 3072 reference canvas.
- The markup files must cover the same uncropped office composition and maintain the same aspect ratio.
- Markup coordinates must be converted into production source coordinates using a single uniform scale and explicit registration offsets:
  - sourceX = markupX * uniformScale + offsetX
  - sourceY = markupY * uniformScale + offsetY
- The markup must never be independently stretched along X and Y.
- A mismatch between nominal canvas aspect ratios is evidence that crop, padding, export margins, or source assumptions must be investigated. It is not permission to stretch the markup independently along X and Y.
- No markup-derived geometry may be classified as production-approved until visual registration has passed.
- Unknown registration values must remain clearly unverified. Do not invent final numerical values for `uniformScale`, `offsetX`, or `offsetY` unless the repository contains enough evidence to derive and verify them.
- Runtime geometry must be stored in 8192 × 5460 source pixels.
- The markup images themselves are development references and must never be rendered in production.

### Coordinate terminology

- **Source or world coordinates**: The authoritative coordinates stored by production runtime geometry. Defined as 8192 × 5460, origin at upper-left, X increases to the right, Y increases downward.
- **Markup coordinates**: Coordinates measured from the original markup export or rendered PDF page before registration. Markup coordinates must not be treated as source coordinates.
- **Registered source coordinates**: Markup coordinates transformed using the approved uniform scale and registration offsets.
- **Viewport coordinates**: Temporary screen coordinates after pan, zoom, responsive scaling, and camera transformations. Viewport coordinates must never be stored as authoritative geometry.

### Required Registration Procedure

1. Verify the actual pixel dimensions of every markup image or rendered PDF page.
2. Verify whether the markup covers the full clean image, a cropped subsection, a padded canvas, or an image with borders/export margins.
3. Select at least four clearly identifiable landmarks distributed across the office (one near each corner, plus central landmarks like the Central Nexus and elevator).
4. Record each landmark in both markup coordinates and source-image coordinates.
5. Calculate the candidate uniform scale and offsets.
6. Measure residual alignment error at all calibration landmarks.
7. Reject the mapping if errors indicate nonuniform stretching, rotation, cropping mismatch, inconsistent export margins, or incorrect source dimensions.
8. Produce a visual registration overlay before extracting production geometry.
9. Store the approved registration information in a dedicated structured record before production geometry generation, using an interface similar to:

```ts
interface MarkupRegistration {
  sourceWidth: 8192;
  sourceHeight: 5460;
  markupWidth: number;
  markupHeight: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  rotationDegrees: 0;
  registrationLandmarks: RegistrationLandmark[];
  maximumResidualErrorPixels: number;
  status: 'unverified' | 'review_required' | 'approved';
}
```
- preserve room and door identities;
- preserve markup meanings;
- preserve door-access color meanings;
- preserve priority-position meanings;
- keep geometry and behavior data-driven;
- validate alignment visually before building later systems;
- never present markup as final artwork;
- never silently guess missing asset metadata;
- never bypass collision or access logic for convenience.

When two documents conflict, use the precedence order defined below.

---

## 3. Mandatory Reading Before Work

Before planning or modifying application code, read all of the following files completely:

```text
AGENTS.md
docs/AI_HUB_MARKUP_LEGEND.md
docs/DOOR_ACCESS.csv
docs/INTERACTIONS.md
docs/ANIMATION_MANIFEST.md
.agent/PLANS.md
```

Also inspect:

```text
public/assets/office/
docs/authoring/floor-1/
src/office/
data/
src/
tests/
artifacts/
README.md
package.json or equivalent project manifest
existing build and test configuration
```

If any required document is missing:

1. do not invent its contents;
2. record the missing dependency in the execution plan;
3. determine whether work can safely continue;
4. create only a clearly marked placeholder when the task explicitly requires it;
5. do not call the affected phase complete.

---

## 4. Source-of-Truth Precedence

Use the following precedence order:

### 4.1 Visual Appearance

The clean office master image is the source of truth for:

- final visible office appearance;
- object appearance;
- room colors;
- furniture appearance;
- wall appearance;
- door appearance;
- lighting already painted into the scene;
- pixel-art style;
- perspective and visual composition.

### 4.2 Markup Meaning

`docs/AI_HUB_MARKUP_LEGEND.md` is the source of truth for:

- what each markup file means;
- how red, yellow, blue, green, labels, dots, outlines, and painted regions are interpreted;
- which marks represent approximate geometry versus exact points;
- whether an item is a room, collision object, anchor, door, or effect reference.

### 4.3 Door Behavior

`docs/DOOR_ACCESS.csv` is the source of truth for:

- door IDs;
- default access mode;
- door-light meaning;
- connected zones;
- default blocked/open/restricted/reserved behavior;
- existing versus missing light behavior;
- elevator special behavior;
- manual-review flags.

### 4.4 Runtime Interaction Behavior

`docs/INTERACTIONS.md` is the source of truth for:

- selection;
- user input;
- agent interaction;
- room behavior;
- computer behavior;
- seat and standing-position behavior;
- robot tubes;
- map;
- stairs;
- elevator;
- meetings;
- sandbox sessions;
- event model;
- failure behavior;
- interaction acceptance criteria.

### 4.5 Animation Behavior

`docs/ANIMATION_MANIFEST.md` is the source of truth for:

- sprite-sheet interpretation;
- frame metadata;
- animation state definitions;
- anchor rules;
- timing;
- looping;
- reduced motion;
- animation validation;
- animation debugging;
- fallback behavior.

### 4.6 Runtime Structured Data

Validated structured files under `data/` are the runtime source of truth after they have been generated, reviewed, and approved.

Generated runtime data may not contradict the documents above.

### 4.7 Code

Code implements the approved data and behavior.

Code is never the source of truth for geometry, room names, door IDs, access colors, or animation metadata when structured data exists.

---

## 5. Authoritative Coordinate System

The clean office image is:

```text
width: 8192
height: 5460
origin: top-left
x-axis: increases left to right
y-axis: increases top to bottom
```

All world-space data must use this coordinate system.

This includes:

- room polygons;
- walkable polygons;
- wall-collision polygons;
- object-collision polygons;
- door bounds;
- door thresholds;
- computer anchors;
- workstation-position anchors;
- interactive-object bounds;
- light anchors;
- effect anchors;
- agent positions;
- paths;
- camera focus targets;
- occlusion masks.

Do not permanently convert authoritative geometry to viewport coordinates.

Do not independently resize, crop, stretch, rotate, or offset individual layers.

Do not use separate X and Y scale factors that distort the office.

Recommended transform:

```ts
screenX = worldX * scale + offsetX;
screenY = worldY * scale + offsetY;

worldX = (screenX - offsetX) / scale;
worldY = (screenY - offsetY) / scale;
```

Coordinate conversion must be centralized and tested.

---

## 6. Clean Master Image Rules

The clean 8192 × 5460 image must:

- remain unchanged as the visual master;
- be stored in a clearly named base-assets directory;
- never have markup burned into it;
- never be destructively resized;
- never be regenerated by AI;
- never be recolored to simplify extraction;
- never be overwritten by debug output;
- never be used as a writable runtime canvas source.

Derived thumbnails and optimized runtime copies are allowed only when:

- the original remains preserved;
- aspect ratio is unchanged;
- coordinate mapping remains exact;
- the derivation process is documented;
- visual alignment is tested.

---

## 7. Markup File Rules

Markup files are development references only.

They may be used to extract:

- polygons;
- points;
- rectangles;
- labels;
- IDs;
- access meanings;
- approximate bounds;
- effect placement.

They must not:

- appear in production mode;
- be composited into the final office image;
- be used as visible textures;
- replace the clean image;
- define final artwork color;
- be interpreted as exact stroke-width collision geometry when the legend says they are approximate.

When markup is hand-drawn:

1. identify the intended underlying object;
2. refine the final geometry to the clean artwork;
3. preserve the intended meaning;
4. record judgment calls;
5. provide a debug overlay for review.

---

## 8. Non-Negotiable Semantic Meanings

### 8.1 Workstation Position Dots

For the chair/standing-position markup:

- yellow dot = priority position for higher-ranking or privileged agents;
- red dot = standard position for agents who are not high-ranking;
- dot color does not determine seated versus standing pose;
- pose is determined from the underlying furniture;
- priority access must be data-driven;
- standard agents may not use priority positions without an explicit temporary override.

### 8.2 Door Lights

- red = no access for anyone;
- green = accessible to anyone;
- blue = accessible only to explicitly authorized members;
- yellow = reserved for meetings, specified events, group work, sandbox sessions, conference activity, and similar scheduled use;
- yellow missing-light designation = same yellow access behavior, but a new matching light must be added;
- elevator designation = use a floor-number display above the elevator rather than an ordinary access light.

### 8.3 Existing Door Lights

Most doors already contain a small indicator light.

The implementation must:

- place the assigned light effect directly over the existing light;
- preserve the light’s perspective and location;
- not add a duplicate fixture when one already exists;
- add a matching fixture only when the markup explicitly says the light is missing.

### 8.4 Red Door Priority

Red access is absolute.

Do not allow:

- executive bypass;
- administrator bypass;
- meeting bypass;
- group bypass;
- rank bypass;
- pathfinding bypass;
- debug bypass in production.

Only an explicit state change away from red may permit access.

### 8.5 Blue Door Priority

Blue access is explicit membership-based authorization.

Do not grant blue access based on rank alone.

### 8.6 Yellow Door Priority

Yellow access is contextual and temporary.

Access may be granted by:

- active meeting participation;
- active event participation;
- assigned work group;
- sandbox-session membership;
- temporary authorization;
- approved room assignment.

Yellow access must expire when the applicable reservation or assignment ends.

---

## 9. Stable Identity Rules

Use stable IDs.

Do not rename or renumber existing IDs without a migration.

### 9.1 Doors

Preserve:

```text
D01 through D47
```

### 9.2 Rooms

Preserve canonical room names and reserved room IDs.

Do not rename `RM1` through `RM10` until a deliberate room-assignment decision is recorded.

### 9.3 Major Interactive Objects

Use stable IDs such as:

```text
INTERACTIVE_MAIN_ROBOT_TUBE
INTERACTIVE_SMALL_ROBOT_TUBE
INTERACTIVE_ELEVATOR
INTERACTIVE_MAP
INTERACTIVE_STAIRS_1
INTERACTIVE_STAIRS_2
```

### 9.4 Runtime IDs

Recommended patterns:

```text
ROOM_<NAME>
ZONE_<NAME>
DOOR_D##
COMPUTER_###
POSITION_###
OBJECT_###
ANCHOR_<TYPE>_###
ANIMSET_<CATEGORY>_<NAME>
ANIM_<CATEGORY>_<NAME>_<STATE>
```

IDs must not depend on array position.

---

## 10. Data-Driven Architecture Requirement

The implementation must separate:

```text
visual rendering
world geometry
collision
pathfinding
access control
interaction
animation
simulation state
UI panels
persistence
debugging
```

Do not place large coordinate arrays directly inside React/Vue/Svelte components or equivalent UI files.

Do not encode door behavior in scattered conditional statements.

Do not infer room membership repeatedly from image colors at runtime.

Do not use DOM element positions as authoritative world geometry.

Preferred data groups:

```text
data/office-layout.json
data/rooms.json
data/walkable-polygons.json
data/wall-colliders.json
data/object-colliders.json
data/doors.json
data/door-lights.json
data/computers.json
data/positions.json
data/interactive-objects.json
data/access-control.json
data/animations/
```

The exact file split may differ if the architecture documents a better approach.

---

## 11. Architecture Freedom and Boundaries

Codex may select:

- rendering framework;
- UI framework;
- state-management library;
- geometry library;
- pathfinding algorithm;
- spatial index;
- build tooling;
- test tooling;
- schema-validation library;
- animation renderer.

Codex may not select an architecture that:

- loses original coordinates;
- depends on manually positioned DOM elements without a world transform;
- makes debug overlays impractical;
- hard-codes access logic into visuals;
- requires destructive changes to source assets;
- cannot handle the full 8192 × 5460 map;
- cannot support sprite animation;
- cannot support collision masks or polygons;
- cannot support pan and zoom;
- cannot support deterministic testing.

Document all major architecture decisions.

---

## 12. Plan-First Requirement

For any task affecting multiple subsystems, create or update an execution plan before coding.

Use `.agent/PLANS.md`.

The plan must include:

```text
goal
current repository state
scope
out of scope
source files
assumptions
known unknowns
architecture decision
data model
milestones
per-milestone acceptance criteria
test strategy
visual-validation strategy
risks
decision log
progress log
remaining work
```

Do not begin a large implementation with only a one-paragraph plan.

Do not treat the full office as a single undivided task.

---

## 13. Required Implementation Order

Unless the current task explicitly narrows scope, follow this order.

### Phase 0 — Repository Audit

- inspect all files;
- verify asset dimensions;
- identify missing documents;
- identify missing assets;
- verify markup alignment;
- record contradictions;
- create the execution plan;
- do not implement the complete application.

### Phase 1 — Static Office Viewer

- render the clean office;
- preserve aspect ratio;
- implement pan;
- implement zoom;
- centralize world/screen transforms;
- support viewport resizing;
- add reset-view controls;
- test multiple viewport sizes.

### Phase 2 — Structured Geometry

- rooms;
- zones;
- walkable areas;
- wall collisions;
- object collisions;
- doors;
- computers;
- positions;
- interactive objects;
- light anchors.

### Phase 3 — Debug Overlays

- room overlay;
- walkable overlay;
- wall overlay;
- object overlay;
- door overlay;
- anchor overlay;
- light overlay;
- all-layers overlay;
- selected-object inspector.

Do not proceed to pathfinding until alignment is reviewed.

### Phase 4 — One-Agent Navigation Prototype

- one placeholder agent;
- click-to-move;
- pathfinding;
- collision;
- door thresholds;
- arrival detection;
- path debug view.

### Phase 5 — Door and Access System

- D01–D47;
- access evaluation;
- open/close state;
- collision synchronization;
- green/red/blue/yellow behavior;
- existing light overlays;
- missing light fixtures;
- elevator special behavior.

### Phase 6 — Position System

- priority and standard position access;
- reservation;
- occupancy;
- seated and standing pose;
- facing;
- release and timeout.

### Phase 7 — Computers and Major Interactions

- computer selection;
- workstation panels;
- Main Robot Tube;
- Small Robot Tube;
- map;
- stairs;
- elevator selector;
- room panels.

### Phase 8 — Animation System

- metadata loader;
- generic sprite player;
- animation debugger;
- one complete agent animation set;
- hologram loops;
- doors;
- lights;
- elevator display;
- computer effects.

### Phase 9 — Persistence and Real Agent Integration

- agent roster;
- assignments;
- access groups;
- meetings;
- sandbox sessions;
- real task state;
- safe persistence.

### Phase 10 — Final Validation and Polish

- reachability;
- collision;
- access;
- responsive alignment;
- performance;
- accessibility;
- reduced motion;
- production build;
- documentation.

---

## 14. Phase Gates

Each phase must pass its gate before the next begins.

### 14.1 Geometry Gate

Required:

- all visible overlays align;
- no unexplained global offset;
- no independent layer scaling;
- room IDs are visible;
- door IDs are visible;
- anchors are selectable;
- geometry is stored in original-image coordinates.

### 14.2 Navigation Gate

Required:

- agent cannot cross wall collisions;
- agent cannot cross object collisions;
- agent can cross valid open thresholds;
- agent stops or reroutes when blocked;
- paths are visible in debug mode;
- no teleporting.

### 14.3 Access Gate

Required:

- red denies all agents;
- green permits all active agents;
- blue checks explicit authorization;
- yellow checks active context;
- visual light matches access state;
- closed door blocks path;
- open door permits path.

### 14.4 Position Gate

Required:

- standard agents cannot claim priority positions;
- valid priority agents can claim priority positions;
- double occupancy is prevented;
- failed paths release reservations;
- pose aligns to furniture;
- facing is correct.

### 14.5 Animation Gate

Required:

- no guessed frame layouts;
- anchors remain stable;
- loops are clean;
- reduced motion works;
- invalid metadata produces readable errors;
- world alignment survives zoom and pan.

---

## 15. Required Debug System

Debug tooling is part of the product-development requirement, not optional polish.

Provide toggles for:

```text
room polygons
room names
walkable areas
wall collisions
object collisions
door bounds
door IDs
door thresholds
door state
door-light anchors
door-light access modes
computer anchors
computer IDs
position anchors
position access tiers
position pose
interactive-object bounds
interaction anchors
agent collision radius
current path
current destination
room membership
world coordinates
screen coordinates
occlusion masks
animation bounds
animation anchors
z-layers
```

Provide an inspector capable of showing structured data for the selected object.

Debug overlays must use the same world transform as production elements.

---

## 16. Required Debug Artifacts

Generate review artifacts under:

```text
artifacts/debug/
```

Minimum files:

```text
rooms.png
walkable-areas.png
wall-collisions.png
object-collisions.png
doors.png
door-lights.png
computers.png
positions.png
interactive-objects.png
navigation.png
all-layers.png
```

Where practical, also generate:

```text
geometry-validation.json
reachability-report.json
door-validation.json
animation-validation.json
```

Do not overwrite source markups.

---

## 17. Visual Validation Rules

Do not rely only on automated tests for geometry.

Visual review must confirm:

- room boundaries follow intended rooms;
- collision follows physical walls and objects;
- door openings remain passable when open;
- walkable regions connect correctly;
- computer anchors sit on screens;
- position anchors sit at agent base locations;
- interactive bounds target the intended object;
- light effects align with visible fixtures;
- elevator floor display is above the elevator;
- Central Nexus remains navigable;
- no overlay shifts when zoom changes.

---

## 18. Collision Rules

A world point is walkable only if:

```text
inside positive walkable geometry
AND outside wall collisions
AND outside object collisions
AND outside active closed-door collision
AND inside valid map bounds
```

Wall and object collisions are permanent unless explicitly changed by a future feature.

Door collision is state-dependent.

Do not use only bounding rectangles for irregular large objects when that causes visible pathing errors.

Use an agent collision radius or footprint.

Prevent diagonal corner-cutting.

Do not let an agent base point enter nonwalkable space even when the sprite image overlaps visually.

---

## 19. Pathfinding Rules

Pathfinding must:

- use world coordinates;
- respect current door state;
- consider agent authorization before routing through restricted doors;
- avoid walls and objects;
- support destination approach anchors;
- release reservations on failure;
- provide a debug path;
- avoid continuous retry loops;
- recompute when relevant state changes;
- prevent oscillation at door thresholds.

Possible algorithms include:

- navigation mesh;
- visibility graph;
- grid-based A*;
- hierarchical pathfinding;
- polygonal pathfinding.

Document the selected method and its tradeoffs.

---

## 20. Door System Rules

Doors must combine:

```text
identity
geometry
connected zones
access mode
authorization
visual state
animation state
collision state
threshold occupancy
light state
```

Do not represent a door as only a clickable image.

Required invariants:

- closed means collision active;
- open means collision inactive;
- red means denied;
- green means public;
- blue means explicit authorization;
- yellow means active-context authorization;
- light and access stay synchronized;
- threshold occupancy prevents closing;
- denied agents do not clip through;
- D47 uses elevator behavior.

---

## 21. Agent Position Rules

Every position must define:

```text
position ID
room ID
world anchor
pose
facing
access tier
associated workstation or object
availability
reservation holder
occupant
```

Position state transitions must be atomic where required.

Recommended states:

```text
available
reserved
approaching
occupied
temporarily_unavailable
disabled
```

Do not permanently assign a position based only on visual proximity.

---

## 22. Computer Rules

Every marked computer must have:

```text
computer ID
type
room ID
screen anchor
hit bounds
associated position
assigned agent or department
interaction action
state
```

Unmarked screens are decorative by default.

Do not create click targets for every glowing pixel.

Computer effects must be clipped to visible screen areas.

---

## 23. Major Interactive Objects

Implement stable, data-driven behavior for:

```text
Main Robot Tube
Small Robot Tube
Map
Elevator
Stairs1
Stairs2
```

### 23.1 Main Robot Tube

- central orchestrator representation;
- opens global AI Hub panel;
- supports animation states;
- remains inside tube;
- tube remains collision.

### 23.2 Small Robot Tube

- agent/model platform representation;
- opens Agent Platform & Models panel;
- supports safe placeholder behavior.

### 23.3 Map

- opens navigation map;
- may focus rooms;
- may preview paths;
- must not teleport in production.

### 23.4 Elevator

- D47;
- floor number above elevator;
- floor selector;
- safe single-floor placeholder;
- no ordinary door-access light.

### 23.5 Stairs

- right = Stairs1;
- left = Stairs2;
- unavailable destinations show under construction;
- do not remove agents from the map without a real destination.

---

## 24. Animation Rules

Animation must follow `docs/ANIMATION_MANIFEST.md`.

Required:

- generic animation system;
- explicit metadata;
- stable base anchors;
- elapsed-time playback;
- frame validation;
- fallback behavior;
- reduced-motion behavior;
- animation debugger;
- world attachment;
- z-layer control;
- occlusion support.

Do not:

- assume every sprite sheet uses the same frame size;
- infer frame count from filename;
- stretch sprites independently;
- tie timing directly to render-frame rate;
- allow state animations to invent domain state.

---

## 25. Accessibility Requirements

At minimum:

- keyboard access to primary controls;
- visible keyboard focus;
- accessible names for interactive objects;
- text access-state labels in panels;
- no reliance on color alone;
- reduced-motion support;
- clear error and unavailable states;
- sufficient panel contrast;
- focus management for modals;
- Escape closes dialogs;
- status changes exposed to assistive UI where practical.

World-map interaction may be supplemented by list-based navigation for accessibility.

---

## 26. Performance Requirements

The 8192 × 5460 world is large.

The architecture should support:

- efficient image loading;
- lazy loading;
- spatial indexing;
- viewport culling;
- limited offscreen animation;
- stable transforms;
- memoized geometry;
- efficient hit testing;
- pathfinding reuse;
- configurable effects quality.

Avoid:

- rebuilding every polygon every frame;
- iterating every object on every pointer movement;
- decoding large assets repeatedly;
- triggering full-app rerenders for a single sprite frame;
- storing giant images in application state.

Measure performance before optimizing blindly.

---

## 27. Error-Handling Requirements

Failures must be explicit and safe.

### 27.1 Missing Asset

- use declared fallback;
- log structured error;
- show development placeholder;
- do not crash office.

### 27.2 Missing Geometry

- disable affected interaction;
- report object ID;
- never place at `(0, 0)` by default.

### 27.3 Invalid Door Data

- fail closed;
- report door ID;
- do not guess access.

### 27.4 Missing Blue Authorization

- deny.

### 27.5 Missing Yellow Context

- deny when context is required.

### 27.6 Path Failure

- stop safely;
- release reservation;
- report cause;
- do not teleport.

### 27.7 Invalid Animation Metadata

- reject asset;
- use fallback;
- report exact field;
- do not guess.

---

## 28. Schema Validation

All major structured data should use machine-validatable schemas.

Validate:

```text
room IDs
door IDs
object IDs
position IDs
computer IDs
coordinate ranges
polygon validity
duplicate IDs
missing references
unknown room references
unknown door references
invalid access modes
invalid animation references
invalid frame indexes
```

Prefer runtime and build-time schema validation.

A production build must fail on critical data-integrity errors.

---

## 29. Testing Requirements

### 29.1 Unit Tests

Test:

- world/screen transforms;
- access evaluation;
- door-state transitions;
- reservation logic;
- position assignment;
- room membership;
- animation frame selection;
- path-blocking logic;
- schema validation.

### 29.2 Integration Tests

Test:

- agent routes through green door;
- agent denied at red door;
- authorized agent passes blue door;
- unauthorized agent denied at blue door;
- meeting participant passes yellow door;
- nonparticipant denied at yellow door;
- door opens and collision clears;
- door closes after threshold clears;
- position claim and release;
- elevator placeholder;
- computer panel opens correct data.

### 29.3 Visual Tests

Test:

- overlays at multiple zoom levels;
- anchors;
- light effects;
- elevator display;
- sprite position;
- door animation alignment;
- occlusion.

### 29.4 End-to-End Tests

Test a complete flow:

```text
select agent
assign destination
path to door
evaluate access
open door
cross threshold
close door
arrive at position
reserve position
play work animation
open associated computer panel
release position
```

---

## 30. Build and Command Rules

Before changing build configuration:

1. inspect the existing project;
2. identify package manager;
3. identify current commands;
4. preserve working commands;
5. document any new commands.

Recommended commands, where applicable:

```text
npm run dev
npm run build
npm run test
npm run test:e2e
npm run lint
npm run typecheck
npm run validate:data
npm run validate:geometry
npm run validate:animations
npm run generate:debug-artifacts
```

If the project uses another package manager, use its equivalent consistently.

Do not claim completion without running the relevant commands.

---

## 31. Code Quality Rules

Prefer:

- strict typing;
- small modules;
- pure geometry utilities;
- explicit state machines;
- schema validation;
- deterministic tests;
- documented interfaces;
- descriptive names;
- stable IDs;
- reusable generic systems.

Avoid:

- giant components;
- hidden global mutable state;
- magic coordinate offsets;
- magic access-color strings scattered through code;
- duplicated transforms;
- duplicated door logic;
- silent catches;
- random visual placement;
- commented-out abandoned implementations;
- unbounded event listeners;
- debug code enabled in production.

---

## 32. Type Safety

Where TypeScript is used:

- enable strict mode;
- do not use `any` without a documented reason;
- define branded/stable ID types where useful;
- distinguish world coordinates from screen coordinates;
- distinguish polygons, rectangles, and points;
- distinguish access mode from light color;
- distinguish door state from authorization result;
- validate external JSON before casting.

Example conceptual types:

```ts
type WorldPoint = { x: number; y: number };
type ScreenPoint = { x: number; y: number };

type DoorAccessMode =
  | "open"
  | "blocked"
  | "restricted"
  | "event"
  | "elevator";

type DoorState =
  | "closed"
  | "opening"
  | "open"
  | "closing"
  | "locked"
  | "error";
```

---

## 33. Logging Rules

Development logs should include stable IDs and meaningful transitions.

Log:

- data-load failures;
- validation failures;
- access decisions;
- door transitions;
- path failures;
- reservation failures;
- missing references;
- animation fallback use.

Do not log:

- every animation frame;
- every pointer movement;
- sensitive access membership unnecessarily;
- giant geometry arrays repeatedly.

---

## 34. Security and Privacy

Do not commit:

- API keys;
- tokens;
- passwords;
- private certificates;
- local secrets;
- user credentials;
- personal data not required by the project.

Use environment-variable templates.

Any future external integration must:

- validate input;
- avoid exposing privileged agent actions;
- enforce access server-side when relevant;
- not rely solely on client-side blue/yellow door checks for real sensitive operations.

---

## 35. Asset Safety

Do not:

- overwrite uploaded originals;
- recompress source assets destructively;
- rename assets without updating references;
- delete uncertain assets;
- embed local absolute paths in runtime data;
- commit temporary editor files.

Keep source assets and derived assets separate.

Recommended:

```text
assets/source/
assets/runtime/
artifacts/
```

---

## 36. Decision Logging

Record important decisions in the execution plan or a dedicated decision document.

Each entry should include:

```text
date
decision
context
alternatives
reason
consequences
affected files
```

Examples:

- renderer choice;
- pathfinding choice;
- polygon format;
- sprite renderer choice;
- door-animation technique;
- room-membership method;
- persistence method;
- viewport transform.

Do not make irreversible architecture decisions without recording them.

---

## 37. Assumption Rules

When a requirement is unclear:

1. search the existing documents;
2. inspect relevant markup and assets;
3. inspect structured data;
4. identify whether the ambiguity changes behavior;
5. ask the user when needed;
6. otherwise choose the safest reversible option;
7. record the assumption.

Do not present a visual inference as confirmed fact.

Use fields such as:

```text
sourceConfidence
manualReviewRequired
assumption
```

---

## 38. User Review Checkpoints

Request or prepare review after:

- base viewer alignment;
- geometry extraction;
- door mapping;
- first navigation prototype;
- first complete access-control flow;
- position alignment;
- first hologram animation;
- first door-light effect;
- elevator display;
- final validation.

Provide visual artifacts, not only written claims.

---

## 39. Completion Reporting

A completion report must state:

```text
what changed
which files changed
which requirements were implemented
which tests ran
test results
build result
debug artifacts generated
known limitations
manual-review items
next recommended phase
```

Do not say “complete” when:

- required tests were not run;
- visual alignment was not checked;
- manual-review items remain unresolved for the claimed scope;
- fallbacks hide missing core data;
- debug overlays are unavailable;
- the production build fails.

---

## 40. Git and Change-Scope Rules

The repository is intentionally new and Codex may make broad changes, but changes must remain controlled.

Before a major change:

- inspect current status;
- understand existing work;
- avoid deleting unrelated files;
- keep commits logically scoped where commits are requested;
- do not rewrite history unless explicitly instructed.

Do not mix:

- geometry extraction;
- animation-system redesign;
- unrelated UI polish;
- backend integrations;

into one unreviewable change unless the execution plan explicitly justifies it.

---

## 41. No Premature Polish

Do not prioritize:

- decorative transitions;
- particle effects;
- advanced dashboards;
- agent personality UI;
- multiple floors;
- elaborate meetings;
- deep backend integrations;

before:

- coordinates;
- geometry;
- collision;
- door access;
- debug overlays;
- one-agent navigation;

are correct.

Correct geometry and behavior are more important than visual polish.

---

## 42. No Full-Project One-Shot Implementation

Do not attempt to build the entire office in one uncontrolled pass.

A large one-shot implementation is considered incorrect because it prevents:

- alignment review;
- geometry correction;
- access review;
- test isolation;
- architecture correction;
- controlled user approval.

Follow the phased plan.

---

## 43. Required Repository Structure

The exact architecture may vary, but the repository should preserve clear separation similar to:

```text
/
├── AGENTS.md
├── README.md
├── package.json
├── .agent/
│   └── PLANS.md
├── assets/
│   ├── base/
│   ├── markups/
│   │   ├── pdf/
│   │   └── png/
│   ├── sprites/
│   └── source/
├── docs/
│   ├── AI_HUB_MARKUP_LEGEND.md
│   ├── DOOR_ACCESS.csv
│   ├── INTERACTIONS.md
│   ├── ANIMATION_MANIFEST.md
│   └── decisions/
├── data/
│   ├── office-layout.json
│   ├── rooms.json
│   ├── doors.json
│   ├── positions.json
│   ├── computers.json
│   ├── access-control.json
│   └── animations/
├── src/
│   ├── rendering/
│   ├── geometry/
│   ├── navigation/
│   ├── access/
│   ├── interactions/
│   ├── animation/
│   ├── simulation/
│   ├── state/
│   ├── ui/
│   └── debug/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── visual/
│   └── e2e/
└── artifacts/
    ├── debug/
    └── animation-previews/
```

Do not create empty directories without a near-term purpose.

---

## 44. Required Data Relationships

At minimum, support these relationships:

```text
room -> doors
room -> computers
room -> positions
room -> interactive objects
door -> two zones
door -> light
door -> access policy
computer -> position
computer -> assigned agent or department
position -> access tier
position -> pose
position -> occupant
interactive object -> approach anchors
agent -> department
agent -> rank/access tier
agent -> access groups
agent -> assigned workstation
agent -> current room
agent -> current task
meeting -> room
meeting -> participants
meeting -> temporary access
sandbox session -> room
sandbox session -> participants
animation set -> object or agent type
```

Validate all references.

---

## 45. Room Reachability Validation

Every occupied or interactive room must be reachable through intended doors.

Validation should report:

```text
room ID
reachable from entrance
reachable from elevator lobby
number of entrances
blocked by default
requires blue authorization
requires yellow context
no valid path
```

Red-only future/service areas may be intentionally unreachable.

Mark intentional isolation explicitly.

---

## 46. Door Review Flags

`docs/DOOR_ACCESS.csv` contains confidence and manual-review fields.

Codex must:

- preserve them;
- surface uncertain mappings in debug tools;
- `manual_review_required=yes` means the row is provisional;
- provisional zone mappings must not automatically become production navigation connections;
- uncertain door records may be loaded for review/debugging but must not be marked approved;
- pathfinding and access-control implementation must not depend on an unverified zone pairing;
- approval must be recorded explicitly after comparison against the door and room markups.
- Do not change individual door assignments unless the visual source files provide clear evidence that the current value is wrong.
- not silently clear review flags;
- allow later correction without code changes;
- avoid treating uncertain zone names as final canonical IDs until reconciled.

---

## 47. Elevator Rules

D47 is special.

Required:

- elevator-specific door behavior;
- floor number above entrance;
- no ordinary colored status light;
- safe door animation;
- threshold collision;
- single-floor placeholder;
- unavailable floors clearly disabled;
- no fake transition;
- current floor stays synchronized.

---

## 48. Main and Small Robot Tube Rules

Robot-tube sprites must:

- remain centered in their tubes;
- use transparent backgrounds;
- preserve pixel-art quality;
- use explicit frame metadata;
- remain visually clipped or occluded correctly;
- not create additional collision beyond the tube object;
- support reduced motion;
- open the correct panel.

Do not regenerate these sprites without explicit user instruction.

---

## 49. Production and Debug Separation

Production mode must not expose:

- markup;
- coordinate labels;
- collision polygons;
- door IDs;
- anchor dots;
- review warnings;
- debug teleport;
- forced access;
- state override controls;
- animation frame controls.

Development mode may expose them through a clearly labeled debug interface.

---

## 50. Final Acceptance Checklist

Before declaring the interactive office foundation complete, verify:

### Assets

- clean image is 8192 × 5460;
- all markups align;
- source assets preserved;
- runtime assets documented.

### Geometry

- rooms extracted;
- walkable areas extracted;
- walls extracted;
- objects extracted;
- doors extracted;
- anchors extracted;
- debug overlays approved.

### Navigation

- one agent navigates;
- no wall clipping;
- no object clipping;
- no closed-door clipping;
- valid thresholds work;
- path failures are safe.

### Access

- red blocks everyone;
- green permits everyone;
- blue uses explicit authorization;
- yellow uses active context;
- lights match logic;
- missing lights added;
- elevator display works.

### Positions

- yellow is priority;
- red is standard;
- pose comes from furniture;
- reservation prevents conflicts;
- anchors align.

### Interactions

- computers selectable;
- tubes selectable;
- map selectable;
- elevator selectable;
- stairs safe;
- room panels work;
- unavailable features explain themselves.

### Animation

- explicit metadata;
- stable anchors;
- valid frame timing;
- reduced motion;
- fallbacks;
- debugger;
- validation passes.

### Quality

- tests pass;
- typecheck passes;
- lint passes;
- production build passes;
- debug artifacts generated;
- known limitations documented.

---

## 51. First-Task Instruction for a Fresh Repository

When this repository is first opened, do not immediately build the complete office.

Perform the following:

1. read all required documents;
2. inventory all files and assets;
3. verify the 8192 × 5460 clean image;
4. verify markup alignment;
5. identify missing assets and documents;
6. inspect existing project setup;
7. compare suitable architecture options;
8. choose and document one architecture;
9. create or update the execution plan;
10. define initial schemas;
11. define phase-specific acceptance criteria;
12. stop for review before implementing beyond the first approved phase.

---

## 52. Final Operating Principle

The office must be built as a verified world model, not as a collection of visually positioned clickable elements.

Every major visible behavior must connect to:

```text
stable identity
structured geometry
structured state
validated access
validated interaction
explicit animation metadata
debug visibility
test coverage
```

When speed conflicts with correctness, preserve correctness and make the implementation reversible.
