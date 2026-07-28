# AI Hub Office Markup Legend

## 1. Purpose

These markup files define the geometry, navigation, interaction points, workstation locations, room names, and visual behavior for the AI Hub office.

The finished application must use the clean, unmarked office image as the visible background. All markup colors, dots, outlines, labels, and scribbles are reference data only and must not appear in the final interface.

## 2. Shared Coordinate System

- The authoritative runtime/world coordinate system is 8192 × 5460.
- The markup PDFs use a 4608 × 3072 reference canvas.
- The markup files must cover the same uncropped office composition and maintain the same aspect ratio.
- Markup coordinates must be converted into production source coordinates:
  - sourceX = markupX × (8192 / 4608)
  - sourceY = markupY × (5460 / 3072)
- Runtime geometry must be stored in 8192 × 5460 source pixels.
- The markup images themselves are development references and must never be rendered in production.
- The top-left corner is coordinate `(0, 0)`.
- X increases from left to right.
- Y increases from top to bottom.
- Do not independently crop, stretch, rotate, or resize individual markup layers.
- Any runtime scaling must preserve the original aspect ratio.
- Store geometry in original-image coordinates, then transform it for the displayed viewport.

## 3. General Interpretation Rules

- Markup is a guide for extracting geometry and anchors; it is not final artwork.
- Follow the underlying office artwork when a hand-drawn line is slightly imperfect.
- Use polygons for irregular rooms, walls, walkable areas, and obstacles.
- Use rectangles or polygons for doors and larger interactive objects.
- Use points for computers, chair anchors, standing anchors, and effect origins.
- All extracted geometry must be viewable through a developer/debug overlay before final implementation.

---

## 4. File-by-File Legend

### `Rooms.pdf`

**Purpose:** Defines named rooms, departments, hallways, stairs, security areas, focus rooms, conference rooms, sandbox rooms, the entrance, and the Central Nexus.

**Markup meaning:**

- Red outline = boundary of a named room or zone.
- White label with red text = canonical room or zone name.
- Room boundaries should follow the interior usable floor area and should not include wall thickness.
- The two areas labeled `Main Connecting Walkway` are circulation zones, not normal offices.
- `Stairs1` is the upper-right staircase.
- `Stairs2` is the upper-left staircase.
- `Entrance` is the bottom-center arrival zone.
- `Central Nexus` is the central octagonal room.
- `RM1` through `RM10` are reserved unnamed rooms and must retain those IDs until assigned later.
- `Security A` and `Security B` are separate security zones.

**Recommended data type:** room/zone polygon with a unique ID and display name.

---

### `Computers.pdf`

**Purpose:** Identifies computer screens, workstation displays, wall displays, control terminals, and other digital display surfaces.

**Markup meaning:**

- Red dot = computer or display anchor.
- Place the anchor at the center of the marked screen or terminal.
- Detect the display type from its underlying artwork:
  - workstation monitor
  - multi-monitor workstation
  - wall display
  - conference display
  - control terminal
  - Nexus console
  - focus-room terminal
- Do not treat the red dot itself as visible artwork.
- Computers may later open an agent panel, task view, department dashboard, system screen, or decorative animation depending on their assigned type.

**Recommended data type:** point anchor plus optional screen bounds and display type.

---

### `Interactive Objects.pdf`

**Purpose:** Defines major special objects that require dedicated interactions or animations.

**Marked objects:**

- `Main Robot Tube` - central holographic tube inside the Central Nexus.
- `Small Robot Tube` - smaller tube in the Agent Platform & Models room.
- `Elevator` - central lower elevator.
- `Map` - large wall map in Reliability & Operations.
- `Stairs1` - upper-right staircase.
- `Stairs2` - upper-left staircase.

**Markup meaning:**

- Red box, outline, or leader = approximate bounds and identity of the interactive object.
- Use the visible object in the clean image to refine the final interaction bounds.
- Each object must receive a unique stable ID.
- Interaction areas should be slightly larger than the visible object when necessary for reliable clicking, but must not overlap unrelated objects.

**Recommended data type:** polygon or rectangle, interaction anchor, object type, and action.

---

### `Chairs-Standing desks.pdf`

**Purpose:** Defines agent placement anchors and the rank/access priority assigned to each seat or standing work position.

**Markup meaning:**

- Yellow dot = priority position reserved for higher-ranking or privileged agents.
- Red dot = standard position available to agents who are not high-level ranking.
- Dot color defines who may use the position; it does **not** by itself define whether the agent is seated or standing.
- Determine the pose from the underlying furniture and workstation:
  - chair, couch, conference seat, or executive seat = seated pose
  - standing desk, standing console, or open standing station = standing pose
- Yellow priority positions include areas such as:
  - executive seats
  - boardroom seats
  - conference-room positions
  - other seats or stations intended for higher-level agents
- Red standard positions are available for ordinary agents unless another rule restricts them.
- The dot represents the location of the agent sprite's feet/base, not the center of the furniture.
- Derive the agent's facing direction from the associated desk, table, console, couch, or workstation orientation.
- An anchor is valid only when it does not overlap a wall or object collision polygon.

**Recommended data type:** point, pose (`seated` or `standing`), access tier (`priority` or `standard`), facing direction, and associated workstation/object ID.

---

### `Walls.pdf`

**Purpose:** Defines permanent hard-collision wall geometry.

**Markup meaning:**

- Red highlighted wall area = hard collision.
- Agents may not enter, cross, or path through these areas.
- Door openings must remain cut out of the wall collision geometry.
- Follow the full visible wall footprint rather than using only a thin centerline.
- Exterior boundaries, interior partitions, half walls, room dividers, and the Central Nexus perimeter are included where marked.
- If a decorative wall or railing should block movement, treat it as hard collision unless explicitly overridden later.

**Recommended data type:** hard-collision polygons.

---

### `Doors.pdf`

**Purpose:** Defines individual door locations and stable door IDs.

**Markup meaning:**

- Red rectangle or outline = door bounds.
- `D01` through `D47` = unique door IDs.
- Use the center of each door opening as the navigation threshold and interaction anchor.
- Door bounds are reference guides; refine them to the visible door frame and opening in the clean image.
- A door can control whether the walkable regions on its two sides are connected.
- A closed door blocks passage.
- An open door allows passage through its threshold.
- `D47` is the central elevator entrance and should use elevator behavior rather than ordinary hinged-door behavior.
- Each door record should identify the room or zone on both sides when possible.

**Recommended data type:** door bounds, threshold point, orientation, connected zones, state, and door-light reference.

---

### `Walk paths.pdf`

**Purpose:** Defines the positive walkable floor area for agent navigation.

**Markup meaning:**

- Dark red painted region = area agents are permitted to occupy and traverse.
- Unpainted area = not automatically walkable.
- The marked region is a walkable-area mask, not a required fixed route.
- Agents may choose their own paths anywhere within the valid walkable area.
- Wall collisions, object collisions, and closed doors override this layer.
- Door thresholds must form continuous connections between adjacent walkable regions.
- Preserve usable clearance around desks, tables, consoles, plants, couches, and other obstacles.
- The entrance, hallways, departments, rooms, stairs, focus rooms, and Central Nexus are included where painted.

**Recommended data type:** navigation polygon or walkable mask.

---

### `Objects.pdf`

**Purpose:** Defines furniture, equipment, decorations, and other non-wall obstacles that agents must not walk through.

**Markup meaning:**

- Bright red scribble or painted mark = object that requires a collision footprint.
- The red scribble identifies the object; it is not the exact final polygon.
- Trace the visible footprint of the underlying object in the clean image.
- Marked objects include, where shown:
  - desks
  - tables
  - couches
  - consoles
  - server racks
  - cabinets
  - planters and plants
  - wall-mounted equipment where it affects movement
  - room equipment
  - Nexus consoles and machinery
  - robot tubes
  - counters
  - decorative structures that block movement
- Do not create collision from the red stroke thickness itself.
- Keep enough clearance for the full sprite body, not only its center point.
- Objects may also have separate interaction records, but collision and interaction geometry should remain independent.

**Recommended data type:** hard-collision polygons with optional object type and interaction link.

---

### `Door Lights.pdf`

**Purpose:** Defines door-access status, the color of the visible door-light effect, and special elevator signage behavior.

**Access-state meaning:**

- `Red` = blocked. No agent has access while the door is in this state.
- `Green` = open access. Any agent may enter.
- `Blue` = restricted access. Only specifically authorized members may enter.
- `Yellow` = event/group access. Reserved for meetings, specified events, collaborative work, conference rooms, sandbox cells, and similar scheduled or group-use spaces.
- `Yellow 123` = same access behavior as `Yellow`, but the marked doorway does not currently contain the required visible light. Add a new light fixture/effect at each indicated position.
- `Elevator` = do not use an ordinary door-status light label. Add a visible floor-number sign above the elevator entrance.

**Visual implementation rules:**

- Most doors already contain a small indicator light in the artwork.
- Place the assigned colored light effect directly over the existing door light.
- Preserve the original light's location and perspective.
- When no light exists, add one that matches the style, size, angle, and pixel-art appearance of the existing door lights.
- For `Yellow 123`, add all indicated missing lights and give them yellow event/group-access behavior.
- The light effect must be visible in the finished office; the markup labels and outlines must not be visible.
- Match every marked light to the corresponding door ID from `Doors.pdf`.
- Door access logic and light color must remain synchronized.
- A door's light may change dynamically if its access state changes later.

**Recommended data type:** door ID, access mode (`blocked`, `open`, `restricted`, or `event`), light color, existing-light anchor or added-light bounds, authorized member IDs when restricted, scheduled event/group context when yellow, and optional animation state.

---

## 5. Navigation and Collision Precedence

Apply the layers in this order:

1. Start with the `Walk paths.pdf` positive walkable region.
2. Subtract all wall polygons from `Walls.pdf`.
3. Subtract all object polygons from `Objects.pdf`.
4. Treat closed doors from `Doors.pdf` as temporary blockers.
5. Treat open doors as passable thresholds.
6. Validate chair and standing anchors against the resulting navigation space.
7. Validate that every occupied room has at least one reachable entrance.
8. Prevent diagonal corner-cutting through walls, furniture, or closed doors.

A location is walkable only when it is inside the walkable mask and outside all active collision geometry.

---

## 6. Suggested ID Conventions

Use stable IDs that do not change when visual styling changes.

```text
ROOM_EXEC_COMMAND
ROOM_EXEC_BOARDROOM
ROOM_SECURITY_GOVERNANCE
ROOM_RELIABILITY_OPERATIONS
ROOM_AGENT_PLATFORM_MODELS
ROOM_SOFTWARE_ENGINEERING
ROOM_PLUGINS_AUTOMATION
ROOM_PROJECT_RELEASE_MGMT
ROOM_DATA_MEMORY_KNOWLEDGE
ROOM_FOCUS_A
ROOM_FOCUS_B
ROOM_FOCUS_C
ROOM_FOCUS_D
ROOM_CONFERENCE_1
ROOM_CONFERENCE_2
ROOM_SANDBOX_1
ROOM_SANDBOX_2
ROOM_RM01 ... ROOM_RM10

DOOR_D01 ... DOOR_D47

INTERACTIVE_MAIN_ROBOT_TUBE
INTERACTIVE_SMALL_ROBOT_TUBE
INTERACTIVE_ELEVATOR
INTERACTIVE_MAP
INTERACTIVE_STAIRS_1
INTERACTIVE_STAIRS_2

COMPUTER_001 ...
SEAT_001 ...
STAND_001 ...
OBJECT_001 ...
```

---

## 7. Minimum Extracted Data

The implementation should produce structured data similar to:

```json
{
  "canvas": {
    "width": 8192,
    "height": 5460,
    "origin": "top-left"
  },
  "rooms": [],
  "walkablePolygons": [],
  "wallColliders": [],
  "objectColliders": [],
  "doors": [],
  "doorLights": [],
  "computers": [],
  "agentAnchors": [],
  "interactiveObjects": [],
  "elevatorDisplay": {}

}
```

Each item should contain:

- stable ID
- type
- coordinates in original-image space
- optional bounds
- room or zone assignment
- interaction behavior when applicable
- enabled/disabled state when applicable

---

## 8. Required Debug and Validation Tools

Before polishing the office, implement a developer overlay with toggles for:

- room boundaries and names
- walkable area
- wall collision
- object collision
- doors and door IDs
- door-light anchors and colors
- computer anchors
- seated anchors
- standing anchors
- interactive-object bounds
- current agent path
- current agent target
- agent collision radius

Validation requirements:

- Every layer aligns with the clean `8192 x 5460` background.
- No agent can walk through a wall, object, or closed door.
- Every door threshold connects the correct spaces.
- Every permanent workstation anchor is reachable.
- Every room can be entered through its intended door.
- The Central Nexus ring remains navigable without clipping consoles.
- No markup appears when debug mode is disabled.
- Resizing or zooming the interface does not change relative alignment.

---

## 9. Source-of-Truth Rule

The clean office image is the source of truth for appearance.

The markup PDFs are the source of truth for intended meaning, approximate boundaries, IDs, colors, and behaviors.

When a hand-drawn mark is slightly misaligned, preserve the intended marked object or zone while refining its final geometry to match the clean artwork.
