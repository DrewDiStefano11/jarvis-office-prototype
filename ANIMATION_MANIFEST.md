# AI Hub Office — Animation Manifest

## 1. Purpose

This document defines the animation-asset contract for the AI Hub office.

It tells Codex:

- how animation assets are named and organized;
- how sprite sheets are interpreted;
- how frames are ordered;
- how animations are anchored to the 8192 × 5460 office world;
- which animations are required for agents, doors, door lights, computers, robot tubes, the elevator, and environmental effects;
- how animation states transition;
- how missing assets are handled safely;
- how animation metadata is validated before implementation;
- how the project can add new animation packs later without rewriting the rendering system.

This document is intentionally data-driven. No animation should depend on a renderer guessing frame size, frame order, transparent padding, playback speed, or anchor placement.

---

## 2. Authoritative World Canvas

The clean office master image uses:

```text
Width: 8192 px
Height: 5460 px
Origin: top-left
X direction: left to right
Y direction: top to bottom
```

Animation assets are rendered on top of this world.

All world-position anchors must be stored in original-image coordinates.

Animations must remain aligned while the user:

- zooms;
- pans;
- resizes the browser;
- switches display resolution;
- enters or exits fullscreen;
- changes device pixel ratio.

The animation renderer must transform world coordinates into screen coordinates at runtime.

---

## 3. Core Rule: Never Guess Sprite Metadata

Codex must never infer animation metadata solely from an image filename or visual appearance.

Every animation asset must define:

```text
asset ID
file path
asset type
source dimensions
frame dimensions
rows
columns
frame count
frame order
used frame indexes
frame duration
loop behavior
playback direction
anchor point
trim behavior
transparent background behavior
world scale
z-index/layer
state transitions
fallback behavior
```

If any required field is missing, the asset must be marked invalid in development mode.

Invalid assets must not silently render using guessed settings.

---

## 4. Recommended Repository Structure

```text
assets/
└── sprites/
    ├── agents/
    │   ├── shared/
    │   ├── executive/
    │   ├── leadership/
    │   ├── standard/
    │   ├── temporary/
    │   └── placeholders/
    ├── holograms/
    │   ├── main-robot/
    │   └── small-robot/
    ├── doors/
    │   ├── door-panels/
    │   └── door-lights/
    ├── computers/
    │   ├── workstation-screens/
    │   ├── wall-displays/
    │   ├── conference-displays/
    │   └── security-displays/
    ├── elevator/
    │   ├── doors/
    │   ├── floor-display/
    │   └── effects/
    ├── environment/
    │   ├── lights/
    │   ├── particles/
    │   ├── construction/
    │   ├── alerts/
    │   └── ambient/
    └── ui/
        ├── selection/
        ├── interaction/
        └── status/
```

Metadata should be stored separately from the images:

```text
data/
└── animations/
    ├── animation-manifest.json
    ├── agent-animation-sets.json
    ├── hologram-animation-sets.json
    ├── door-animation-sets.json
    ├── computer-animation-sets.json
    ├── elevator-animation-sets.json
    └── environmental-animation-sets.json
```

This Markdown document is the human-readable specification.

The JSON files are the runtime source of truth after validation.

---

## 5. Supported Asset Formats

Preferred formats:

```text
PNG sprite sheet
PNG frame sequence
WebP frame sequence, if tested and lossless enough
SVG only for non-pixel-art UI effects
```

Avoid:

```text
JPEG for sprites
GIF as the authoritative animation format
video files for small world sprites
formats with unknown or inconsistent alpha behavior
```

### 5.1 PNG Requirements

PNG assets should:

- use transparent backgrounds where the animation overlays the office;
- preserve hard pixel edges where the art is pixel-based;
- avoid color-profile shifts;
- avoid premultiplied-alpha artifacts;
- avoid partially transparent halos unless intentionally part of the effect;
- preserve exact frame dimensions.

### 5.2 GIF Restrictions

A GIF may be included as a preview, but must not be the authoritative implementation asset unless specifically approved.

GIFs may introduce:

- reduced color depth;
- inconsistent timing;
- disposal-mode issues;
- transparency artifacts;
- difficulty controlling individual states.

---

## 6. Sprite Sheet Conventions

### 6.1 Frame Indexing

Use zero-based indexing in code:

```text
First frame = 0
Second frame = 1
...
```

Human-readable documentation may show one-based frame numbers, but it must clearly identify the conversion.

Preferred manifest field:

```json
{
  "frameIndexBase": 0
}
```

### 6.2 Default Frame Order

Unless explicitly overridden:

```text
left-to-right
then top-to-bottom
```

Example for a 4-column × 3-row sheet:

```text
0  1  2  3
4  5  6  7
8  9 10 11
```

### 6.3 Unused Frames

Unused frames must be explicitly listed.

Example:

```json
{
  "usedFrames": [0, 1, 2, 3, 4, 5],
  "unusedFrames": [6, 7]
}
```

Do not assume every cell in a sprite sheet belongs to one animation.

### 6.4 Blank Cells

Blank grid cells must not count as frames unless explicitly identified as intentional hold frames.

### 6.5 Unequal Frame Sizes

Avoid mixed frame sizes in the same sprite sheet.

If unavoidable:

- define per-frame rectangles;
- do not use simple row/column extraction;
- include a packed-atlas metadata file;
- validate every frame rectangle.

---

## 7. Animation Metadata Schema

Every animation entry should follow a structure similar to:

```json
{
  "animationId": "ANIM_MAIN_ROBOT_IDLE",
  "assetSetId": "ASSETSET_MAIN_ROBOT",
  "file": "assets/sprites/holograms/main-robot/main-robot-idle.png",
  "assetType": "sprite_sheet",
  "sourceWidth": null,
  "sourceHeight": null,
  "frameWidth": null,
  "frameHeight": null,
  "rows": null,
  "columns": null,
  "frameCount": null,
  "frameIndexBase": 0,
  "frameOrder": "left_to_right_top_to_bottom",
  "usedFrames": [],
  "unusedFrames": [],
  "frameDurationsMs": [],
  "defaultFrameDurationMs": 100,
  "loopMode": "loop",
  "playbackDirection": "forward",
  "holdLastFrame": false,
  "anchor": {
    "type": "normalized",
    "x": 0.5,
    "y": 1.0
  },
  "trim": {
    "enabled": false,
    "preserveLogicalFrameSize": true
  },
  "worldScale": 1.0,
  "pixelArt": true,
  "interpolation": "nearest",
  "zLayer": "world_effect",
  "blendMode": "normal",
  "opacity": 1.0,
  "preload": true,
  "reducedMotionFallbackFrame": 0,
  "fallbackAnimationId": null,
  "notes": ""
}
```

Fields marked `null` must be populated after the actual asset is uploaded.

---

## 8. Timing Rules

### 8.1 Frame Durations

Use explicit frame duration in milliseconds.

Preferred ranges:

```text
Fast interface pulse: 50–90 ms
Walk cycle: 80–140 ms
Idle breathing/floating: 100–220 ms
Door open/close: 50–120 ms
Computer screen loop: 100–300 ms
Warning flash: 200–600 ms
Slow ambient effect: 250–1000 ms
```

These are starting ranges, not mandatory values.

### 8.2 Variable Frame Timing

Some animations may require nonuniform timing.

Example:

```json
{
  "frameDurationsMs": [120, 120, 120, 240, 120, 120]
}
```

If `frameDurationsMs` is present, it overrides `defaultFrameDurationMs`.

### 8.3 Time Source

Playback should use elapsed time, not assumed frame counts per render loop.

Do not tie animation speed directly to browser refresh rate.

### 8.4 Pause Behavior

World animations should define whether they pause when:

- the tab is hidden;
- the app is paused;
- a modal is open;
- the object is offscreen;
- reduced motion is enabled.

---

## 9. Loop Modes

Supported values:

```text
loop
once
ping_pong
hold
manual
state_driven
```

Definitions:

- `loop`: restart after final frame.
- `once`: play once, then stop.
- `ping_pong`: play forward and backward.
- `hold`: play once and hold final frame.
- `manual`: external code selects the frame.
- `state_driven`: frame or sequence depends on object state.

---

## 10. Pixel-Art Rendering Rules

For pixel-art assets:

```text
image-rendering: pixelated
interpolation: nearest-neighbor
no smoothing
integer-friendly scale when practical
```

At noninteger zoom levels, the world may still require fractional scaling. The renderer should minimize shimmer by:

- keeping world positions stable;
- avoiding per-frame rounding changes;
- using a consistent transform;
- rounding only at the final render stage when appropriate;
- testing at multiple zoom levels.

Do not enlarge a low-resolution sprite destructively and save it as a new master unless explicitly approved.

---

## 11. Anchor Types

Supported anchor types:

```text
normalized
pixel
world_attachment
object_relative
```

### 11.1 Normalized Anchor

```json
{
  "type": "normalized",
  "x": 0.5,
  "y": 1.0
}
```

Meaning:

- X is 50% across the frame.
- Y is 100% down the frame.
- This is a bottom-center anchor.

### 11.2 Pixel Anchor

```json
{
  "type": "pixel",
  "x": 91,
  "y": 176
}
```

Use when frame padding is irregular and exact pixel control is required.

### 11.3 World Attachment

Used for effects attached to a specific world anchor.

Example:

```json
{
  "type": "world_attachment",
  "anchorId": "DOORLIGHT_D01"
}
```

### 11.4 Object Relative

Used for effects attached to a moving object.

Example:

```json
{
  "type": "object_relative",
  "targetObjectId": "AGENT_001",
  "offsetX": 0,
  "offsetY": -48
}
```

---

## 12. Agent Animation System

Each agent must use an `animationSetId`.

Example:

```text
ANIMSET_AGENT_STANDARD_001
ANIMSET_AGENT_EXECUTIVE_001
ANIMSET_AGENT_SECURITY_001
```

### 12.1 Required Agent Animations

Minimum first-version animations:

```text
idle
walk_north
walk_south
walk_east
walk_west
sit_north
sit_south
sit_east
sit_west
stand_work_north
stand_work_south
stand_work_east
stand_work_west
computer_work
interact
```

Recommended additional animations:

```text
walk_north_east
walk_north_west
walk_south_east
walk_south_west
sit_idle
sit_work
thinking
talking
listening
reading
typing
alert
celebrate
error
sleep/offline
enter_door
exit_door
enter_elevator
exit_elevator
stairs_up
stairs_down
```

### 12.2 Direction Model

Preferred direction model:

```text
4-direction minimum
8-direction optional
```

If diagonal movement exists without diagonal art:

- choose the dominant axis;
- avoid rapid direction flicker;
- use hysteresis before changing animation direction.

### 12.3 Agent Base Anchor

All agent animations must share a consistent logical feet/base anchor.

Recommended default:

```json
{
  "type": "normalized",
  "x": 0.5,
  "y": 0.92
}
```

The exact value must be verified per sprite set.

### 12.4 Consistent Logical Frame

Different animations in the same agent set should use the same logical frame size where possible.

If visual content varies:

- retain transparent padding;
- preserve the same base anchor;
- prevent the sprite from visually jumping between states.

### 12.5 Idle Animation

Requirements:

- subtle motion;
- no excessive displacement;
- loops cleanly;
- does not change the agent’s world base position;
- supports reduced-motion fallback.

### 12.6 Walk Animation

Requirements:

- synchronized with actual agent velocity;
- pauses on the correct idle frame when movement stops;
- does not continue while blocked;
- direction matches movement;
- should not imply faster motion than actual path movement.

Optional:

```text
animationSpeed = baseWalkAnimationSpeed × velocityRatio
```

Clamp the ratio to avoid extreme speeds.

### 12.7 Seated Animation

The agent’s base anchor must align to the marked seat anchor.

Seated state should define:

- seat-facing direction;
- body offset;
- optional chair occlusion;
- workstation relationship;
- transition animation, if available.

### 12.8 Standing Work Animation

Used at standing desks and consoles.

Requirements:

- align to the standing anchor;
- face the associated object;
- preserve access-tier reservation;
- loop while the work action remains active.

### 12.9 Interaction Animation

Used for:

- robot tube interaction;
- map use;
- console use;
- door request;
- elevator request;
- room terminal use.

The animation should not begin until the agent reaches the interaction anchor.

### 12.10 Agent Transition Graph

Recommended state graph:

```text
idle
  -> walk
  -> idle

walk
  -> interact
  -> sit
  -> stand_work
  -> idle
  -> blocked/error

sit
  -> sit_work
  -> stand_up
  -> walk

stand_work
  -> idle
  -> walk

interact
  -> idle
  -> walk
```

Do not jump directly from distant walking to seated without reaching the seat anchor.

---

## 13. Agent Animation Set Template

Use one block per sprite set.

```yaml
assetSetId: ANIMSET_AGENT_TBD
displayName: TBD
category: agent
pixelArt: true
logicalFrameWidth: TBD
logicalFrameHeight: TBD
baseAnchor:
  type: normalized
  x: 0.5
  y: TBD

animations:
  idle:
    animationId: TBD
    file: TBD
    rows: TBD
    columns: TBD
    frameCount: TBD
    usedFrames: TBD
    frameDurationMs: TBD
    loopMode: loop

  walk_north:
    animationId: TBD
    file: TBD
    rows: TBD
    columns: TBD
    frameCount: TBD
    usedFrames: TBD
    frameDurationMs: TBD
    loopMode: loop

  walk_south:
    animationId: TBD
    file: TBD
    rows: TBD
    columns: TBD
    frameCount: TBD
    usedFrames: TBD
    frameDurationMs: TBD
    loopMode: loop

  walk_east:
    animationId: TBD
    file: TBD
    rows: TBD
    columns: TBD
    frameCount: TBD
    usedFrames: TBD
    frameDurationMs: TBD
    loopMode: loop

  walk_west:
    animationId: TBD
    file: TBD
    rows: TBD
    columns: TBD
    frameCount: TBD
    usedFrames: TBD
    frameDurationMs: TBD
    loopMode: loop
```

---

## 14. Main Robot Hologram Animation Set

Stable object:

```text
INTERACTIVE_MAIN_ROBOT_TUBE
```

Recommended asset-set ID:

```text
ANIMSET_MAIN_ROBOT_HOLOGRAM
```

### 14.1 Required States

```text
idle
listening
thinking
responding
warning
critical
offline
transition_in
transition_out
```

### 14.2 Idle

The idle animation should:

- float vertically;
- include subtle holographic shimmer;
- remain centered in the tube;
- loop without a visible jump;
- not move the logical anchor;
- avoid touching the tube walls.

### 14.3 Listening

Suggested behavior:

- slight forward orientation or pulse;
- brighter core;
- restrained animation;
- no warning colors unless intentionally designed.

### 14.4 Thinking

Suggested behavior:

- scanning bands;
- orbiting particles;
- controlled flicker;
- looping until response begins.

### 14.5 Responding

Suggested behavior:

- speaking/pulsing rhythm;
- optional waveform effect;
- brighter but not visually overwhelming.

### 14.6 Warning

Suggested behavior:

- amber or orange accent;
- intermittent pulse;
- moderate urgency.

### 14.7 Critical

Suggested behavior:

- red accent;
- sharper pulse;
- optional tube-wide alert effect;
- must respect reduced-motion settings.

### 14.8 Offline

Suggested behavior:

- dim hologram;
- static or slow glitch;
- no active-response animation;
- fallback frame required.

### 14.9 Main Robot Sheet Status

The exact file path, grid dimensions, frame count, and frame size must be populated after the final sprite sheet is placed in the repository.

Known intended format from the current design work:

```text
A multi-frame grid containing multiple floating/motion variations.
Exact approved frame usage: TBD
Exact sheet rows: TBD
Exact sheet columns: TBD
Exact frame width: TBD
Exact frame height: TBD
```

Do not assume all visible options belong in the final idle loop.

The chosen frames must be explicitly listed in order.

### 14.10 Main Robot Manifest Template

```yaml
assetSetId: ANIMSET_MAIN_ROBOT_HOLOGRAM
objectId: INTERACTIVE_MAIN_ROBOT_TUBE
category: hologram
worldAttachment: MAIN_ROBOT_TUBE_CENTER
pixelArt: true
blendMode: screen_or_additive_if_approved
opacity: TBD
worldScale: TBD
anchor:
  type: normalized
  x: 0.5
  y: 1.0

animations:
  idle:
    animationId: ANIM_MAIN_ROBOT_IDLE
    file: TBD
    sourceWidth: TBD
    sourceHeight: TBD
    frameWidth: TBD
    frameHeight: TBD
    rows: TBD
    columns: TBD
    usedFrames: TBD
    defaultFrameDurationMs: TBD
    loopMode: loop
    reducedMotionFallbackFrame: TBD

  listening:
    animationId: ANIM_MAIN_ROBOT_LISTENING
    file: TBD
    usedFrames: TBD
    defaultFrameDurationMs: TBD
    loopMode: loop

  thinking:
    animationId: ANIM_MAIN_ROBOT_THINKING
    file: TBD
    usedFrames: TBD
    defaultFrameDurationMs: TBD
    loopMode: loop

  responding:
    animationId: ANIM_MAIN_ROBOT_RESPONDING
    file: TBD
    usedFrames: TBD
    defaultFrameDurationMs: TBD
    loopMode: loop

  warning:
    animationId: ANIM_MAIN_ROBOT_WARNING
    file: TBD
    usedFrames: TBD
    defaultFrameDurationMs: TBD
    loopMode: loop

  critical:
    animationId: ANIM_MAIN_ROBOT_CRITICAL
    file: TBD
    usedFrames: TBD
    defaultFrameDurationMs: TBD
    loopMode: loop

  offline:
    animationId: ANIM_MAIN_ROBOT_OFFLINE
    file: TBD
    usedFrames: TBD
    defaultFrameDurationMs: TBD
    loopMode: hold_or_loop
```

---

## 15. Small Robot Hologram Animation Set

Stable object:

```text
INTERACTIVE_SMALL_ROBOT_TUBE
```

Recommended asset-set ID:

```text
ANIMSET_SMALL_ROBOT_HOLOGRAM
```

### 15.1 Required States

```text
idle
active
creating_agent
testing_model
warning
offline
```

### 15.2 Behavior

The small robot should:

- use a distinct visual identity from the main robot;
- remain inside the smaller tube;
- use a smaller world scale;
- avoid visually overpowering nearby workstations;
- react when the Agent Platform & Models panel is open;
- support a reduced-motion fallback.

### 15.3 Template

```yaml
assetSetId: ANIMSET_SMALL_ROBOT_HOLOGRAM
objectId: INTERACTIVE_SMALL_ROBOT_TUBE
category: hologram
worldAttachment: SMALL_ROBOT_TUBE_CENTER
pixelArt: true
worldScale: TBD
anchor:
  type: normalized
  x: 0.5
  y: 1.0

animations:
  idle:
    file: TBD
    frameWidth: TBD
    frameHeight: TBD
    rows: TBD
    columns: TBD
    usedFrames: TBD
    defaultFrameDurationMs: TBD
    loopMode: loop
```

---

## 16. Door Animation System

Each door record from `DOOR_ACCESS.csv` must reference a door animation set.

Recommended IDs:

```text
ANIMSET_DOOR_STANDARD_VERTICAL
ANIMSET_DOOR_STANDARD_HORIZONTAL
ANIMSET_DOOR_SPECIAL
ANIMSET_ELEVATOR_DOOR
```

### 16.1 Required Door States

```text
closed
opening
open
closing
locked
blocked
error
```

### 16.2 Door Animation Requirements

- opening removes collision only when the doorway is sufficiently clear;
- closing restores collision only after the threshold is empty;
- animation direction matches the actual artwork;
- the final open frame aligns with the opening;
- the closed frame aligns with the clean background;
- no door panel should float away from its frame;
- state changes must be interruptible safely.

### 16.3 Background Integration Options

Codex may use one of these approaches:

#### Option A: Overlay Animation

- keep clean background unchanged;
- overlay animated door panels;
- mask the original static door panel beneath them.

#### Option B: Layered Background

- use separate background and door layers;
- animate the door layer.

#### Option C: State-Specific Door Sprites

- render closed, opening, open, and closing sprites over a prepared doorway mask.

Codex must document the chosen approach and verify visual alignment.

### 16.4 Door Transition Safety

Valid transitions:

```text
closed -> opening -> open
open -> closing -> closed
opening -> open
closing -> open if obstruction detected
locked -> closed only after access state changes
blocked -> closed only after explicit override
```

Do not jump from `closed` to `open` without the animation unless reduced motion is enabled or the animation asset is unavailable.

---

## 17. Door Light Animation System

Door-light access meaning:

```text
green = accessible to anyone
red = blocked for everyone
blue = restricted to explicitly authorized members
yellow = reserved for meetings, events, or group work
yellow missing light = add new yellow fixture/effect
elevator = floor-number display, not ordinary status light
```

### 17.1 Recommended Asset IDs

```text
ANIM_DOOR_LIGHT_GREEN_IDLE
ANIM_DOOR_LIGHT_GREEN_OPENING
ANIM_DOOR_LIGHT_RED_IDLE
ANIM_DOOR_LIGHT_RED_DENIED
ANIM_DOOR_LIGHT_BLUE_IDLE
ANIM_DOOR_LIGHT_BLUE_GRANTED
ANIM_DOOR_LIGHT_BLUE_DENIED
ANIM_DOOR_LIGHT_YELLOW_IDLE
ANIM_DOOR_LIGHT_YELLOW_ACTIVE
ANIM_DOOR_LIGHT_YELLOW_DENIED
```

### 17.2 Default Light Behavior

#### Green

- steady green glow;
- optional slight pulse when a valid agent approaches;
- brief brighter flash when access is granted.

#### Red

- steady red glow;
- optional short denial pulse;
- must not imply access will be granted.

#### Blue

- steady blue glow;
- brief scan/pulse during authorization;
- brighter confirmation pulse when authorized;
- restrained denial pulse when unauthorized.

#### Yellow

- steady or slow pulsing yellow;
- brighter while an active meeting/event is in progress;
- optional countdown or reservation indicator in UI, not necessarily in the tiny world light.

### 17.3 Light Anchoring

Each light effect must attach to:

```text
DOORLIGHT_D01
DOORLIGHT_D02
...
DOORLIGHT_D46
```

D47 uses the elevator display instead.

### 17.4 Existing Lights

Where an existing light is visible:

- overlay the effect on the same location;
- avoid creating a duplicate fixture;
- preserve perspective;
- keep the light smaller than the door panel;
- test at multiple zoom levels.

### 17.5 Missing Lights

Where a light is absent:

- add a fixture matching nearby doors;
- store its added-light bounds;
- attach the same effect system;
- do not modify the clean master image destructively unless explicitly approved.

Preferred method:

```text
render a new light fixture/effect as a separate overlay
```

---

## 18. Computer and Screen Animation System

Marked computer displays may use subtle animated screen content.

### 18.1 Screen Categories

```text
agent_workstation
department_workstation
department_wall_display
conference_display
boardroom_display
executive_command_console
nexus_console
focus_room_terminal
security_console
sandbox_terminal
decorative_display
```

### 18.2 Required Screen States

```text
idle
active
busy
alert
offline
reserved
meeting
processing
```

### 18.3 Animation Rules

- screen animation must stay inside the visible screen area;
- use a mask or clip rectangle;
- do not spill light over unrelated objects unless intentionally designed;
- avoid rapidly flashing patterns;
- reduce animation when offscreen;
- do not use identical content on every screen unless intended.

### 18.4 Screen Effects

Possible effects:

```text
cursor movement
text crawl
small graph changes
status pulse
map scanning
terminal flicker
notification badge
processing spinner
meeting indicator
security alert
```

### 18.5 Workstation Activity

When an agent is assigned and working:

- screen enters `active` or `processing`;
- the associated agent uses a work animation;
- the workstation state and agent state stay synchronized.

When unassigned:

- use a calm idle screen;
- do not imply active work.

---

## 19. Elevator Animation System

Associated object:

```text
INTERACTIVE_ELEVATOR
```

Associated door:

```text
D47
```

Recommended animation set:

```text
ANIMSET_ELEVATOR
```

### 19.1 Required Elevator Animations

```text
door_closed
door_opening
door_open
door_closing
called
arriving
traveling
unavailable
error
```

### 19.2 Floor Display

The display above the elevator requires:

```text
digits 0–9
optional letters B, G, L
up arrow
down arrow
idle indicator
unavailable indicator
```

Preferred implementation options:

- individual pixel-art digit sprites;
- bitmap font;
- manually controlled atlas.

### 19.3 Floor Display States

```text
current_floor
called
arriving
traveling_up
traveling_down
unavailable
error
```

### 19.4 Display Behavior

- current floor remains steady while idle;
- directional arrow animates during travel;
- arriving state may pulse;
- unavailable state shows a clear symbol or text in the UI;
- world display remains visually simple and legible.

### 19.5 Single-Floor Mode

Until additional floors exist:

- display the current floor number;
- elevator door animation may still be previewed;
- unavailable floors remain disabled;
- do not simulate real travel.

---

## 20. Map Animation System

Associated object:

```text
INTERACTIVE_MAP
```

Possible world states:

```text
idle
active
alert
route_preview
offline
```

World animation should remain subtle.

The detailed navigation map belongs in the UI panel, not entirely inside the tiny wall display.

Possible idle effects:

- slow map scan;
- blinking department points;
- restrained data movement.

---

## 21. Central Nexus Environmental Animations

The Central Nexus may contain multiple coordinated effects.

Recommended asset IDs:

```text
ANIM_NEXUS_CORE_IDLE
ANIM_NEXUS_CORE_ACTIVE
ANIM_NEXUS_RING_ROTATION
ANIM_NEXUS_CONSOLE_PULSE
ANIM_NEXUS_PARTICLES
ANIM_NEXUS_ALERT
```

### 21.1 Synchronization

Effects may share a state source:

```text
idle
active
high_load
warning
critical
offline
```

They do not need identical timing.

Use deterministic offsets so every console does not pulse simultaneously unless intended.

### 21.2 Performance

Allow lower-quality modes:

```text
full
reduced
minimal
off
```

---

## 22. Room Ambient Effects

Room-specific ambient effects are optional for the first version.

Possible categories:

```text
department glow
screen ambience
security scan
server blink
conference active light
sandbox experiment effect
construction sparks
status beacon
```

Room effects must:

- remain behind agents when appropriate;
- not obscure navigation;
- respect reduced motion;
- deactivate when the room is offscreen if safe.

---

## 23. Under-Construction Effects

Future rooms or floors may use:

```text
warning beacon
caution pulse
construction hologram
barrier shimmer
small sparks
inactive screen
```

Do not use effects that imply a space is traversable when it is blocked.

Under-construction visuals must agree with collision and access rules.

---

## 24. Selection and Interaction Effects

Recommended asset IDs:

```text
ANIM_SELECTION_RING
ANIM_INTERACTION_AVAILABLE
ANIM_INTERACTION_DENIED
ANIM_PATH_DESTINATION
ANIM_AGENT_SELECTED
ANIM_OBJECT_SELECTED
```

### 24.1 Selection Ring

- rendered around the selected object or agent;
- does not create collision;
- remains visible over the correct layer;
- scales with world zoom;
- has a reduced-motion static fallback.

### 24.2 Interaction Available

May use:

- subtle outline;
- small icon;
- slow pulse.

Do not constantly animate every interactive object at once.

### 24.3 Denied Feedback

Use:

- brief red or access-specific pulse;
- small lock icon;
- panel message.

Avoid aggressive screen shake.

---

## 25. Occlusion and Z-Layer Rules

Recommended layers:

```text
background
background_effect
floor_effect
object_back
agent_back
agent
object_front
world_effect
selection
debug
ui
```

### 25.1 Agent Occlusion

Agents may need to appear:

- behind desks;
- behind the front edge of consoles;
- behind walls or door frames;
- in front of floor effects;
- beneath overhead effects.

Codex should use:

- foreground masks;
- depth sorting by base Y coordinate;
- object-specific occlusion layers;
- explicit z overrides for special objects.

### 25.2 Hologram Layering

Holograms may use:

- additive or screen blend mode if visually appropriate;
- a tube-front mask;
- a tube-back mask;
- controlled opacity.

Do not place the entire hologram above every foreground element.

---

## 26. Reduced Motion

Respect the user’s reduced-motion preference.

When enabled:

- replace floating loops with a static frame or very slow motion;
- disable rapid pulsing;
- remove unnecessary particle movement;
- shorten or simplify door transitions;
- retain critical state visibility;
- keep access colors and text labels intact.

Every looping animation must specify:

```text
reducedMotionFallbackFrame
```

or:

```text
reducedMotionAnimationId
```

---

## 27. Asset Loading Strategy

### 27.1 Preload

Preload:

- selected agent animation set;
- visible room effects;
- door lights;
- door animations near the current viewport;
- main robot idle;
- elevator display.

### 27.2 Lazy Load

Lazy load:

- uncommon alerts;
- offscreen room effects;
- future floor assets;
- rare celebration/error animations;
- alternate agent packs.

### 27.3 Loading Failure

If an asset fails:

- use the declared fallback animation;
- otherwise use the declared fallback frame;
- otherwise show a development placeholder;
- log a structured error;
- do not crash the entire office.

---

## 28. Animation State Synchronization

Animation state must derive from domain state.

Examples:

```text
door.accessMode = blocked
-> door animation = locked/closed
-> door light animation = red idle
-> path threshold = blocked

agent.motionState = walking east
-> agent animation = walk_east

meeting.status = active
-> conference display = meeting
-> yellow door light = active
-> reserved positions = occupied/reserved

mainRobot.state = thinking
-> hologram animation = thinking
-> Nexus core effect = active/high-load if configured
```

Do not allow the visual animation system to independently invent domain state.

---

## 29. Animation Events

Recommended events:

```text
animation:loaded
animation:failed
animation:started
animation:looped
animation:completed
animation:interrupted
animation:stateChanged
animation:fallbackUsed
```

Event payload:

```json
{
  "timestamp": "",
  "animationId": "",
  "assetSetId": "",
  "objectId": "",
  "previousState": "",
  "nextState": "",
  "reason": ""
}
```

---

## 30. Animation Debugger

Development mode must include an animation debugger capable of:

- listing loaded animation sets;
- previewing every state;
- scrubbing frames;
- changing frame duration;
- showing frame index;
- showing source rectangle;
- showing anchor point;
- showing logical frame bounds;
- showing world attachment;
- showing z-layer;
- forcing reduced-motion mode;
- forcing loading failure;
- inspecting fallback behavior;
- testing multiple zoom levels;
- pausing all animation;
- stepping one frame at a time.

### 30.1 Required Visual Overlays

The debugger should show:

```text
frame bounds
content bounds
anchor point
world anchor
collision bounds
hit bounds
occlusion mask
current state
current frame
```

---

## 31. Asset Validation

A validation script must check:

- file exists;
- file can be decoded;
- source dimensions match metadata;
- frame dimensions divide the sheet correctly when using a grid;
- frame count is valid;
- used frame indexes exist;
- unused frame indexes do not overlap used frames;
- duration is positive;
- anchor is inside or intentionally outside the frame;
- fallback frame exists;
- fallback animation exists;
- transparent assets contain alpha when expected;
- no duplicate animation IDs exist;
- no duplicate asset-set IDs exist;
- every required state exists or has a fallback;
- every referenced object or agent set exists.

Recommended command:

```text
npm run validate:animations
```

---

## 32. Screenshot and Recording Validation

For every major animation set, produce:

```text
artifacts/animation-previews/<asset-set-id>/
```

Include:

- contact sheet;
- idle screenshot;
- active screenshot;
- anchor-overlay screenshot;
- reduced-motion screenshot;
- short preview recording where practical;
- validation report.

The preview must use the real office world scale when the animation attaches to the map.

---

## 33. Required Runtime Animation Sets

The first functional version must include or safely stub:

```text
1. At least one complete standard-agent animation set
2. Main Robot Tube idle animation
3. Small Robot Tube idle animation
4. Door open and close animation
5. Green door-light effect
6. Red door-light effect
7. Blue door-light effect
8. Yellow door-light effect
9. Missing-light overlay fixture
10. Elevator floor-number display
11. At least one computer idle screen effect
12. Selection/focus effect
13. Reduced-motion fallbacks
```

A stub must still define valid metadata and a visible placeholder.

---

## 34. Asset Completion Status Table

The repository should maintain this table as assets are uploaded.

| Asset set | Required | File uploaded | Metadata complete | Validated | Approved |
|---|---:|---:|---:|---:|---:|
| Standard agent | Yes | TBD | TBD | TBD | TBD |
| Executive agent | Later | TBD | TBD | TBD | TBD |
| Leadership agent | Later | TBD | TBD | TBD | TBD |
| Main robot hologram | Yes | TBD | TBD | TBD | TBD |
| Small robot hologram | Yes | TBD | TBD | TBD | TBD |
| Standard door | Yes | TBD | TBD | TBD | TBD |
| Elevator door | Yes | TBD | TBD | TBD | TBD |
| Green door light | Yes | TBD | TBD | TBD | TBD |
| Red door light | Yes | TBD | TBD | TBD | TBD |
| Blue door light | Yes | TBD | TBD | TBD | TBD |
| Yellow door light | Yes | TBD | TBD | TBD | TBD |
| Missing light fixture | Yes | TBD | TBD | TBD | TBD |
| Elevator floor display | Yes | TBD | TBD | TBD | TBD |
| Computer idle effect | Yes | TBD | TBD | TBD | TBD |
| Computer active effect | Later | TBD | TBD | TBD | TBD |
| Nexus ambience | Later | TBD | TBD | TBD | TBD |
| Construction effect | Later | TBD | TBD | TBD | TBD |
| Selection ring | Yes | TBD | TBD | TBD | TBD |

---

## 35. Runtime JSON Skeleton

```json
{
  "version": 1,
  "world": {
    "width": 8192,
    "height": 5460,
    "origin": "top-left"
  },
  "defaults": {
    "pixelArt": true,
    "interpolation": "nearest",
    "frameIndexBase": 0,
    "frameOrder": "left_to_right_top_to_bottom"
  },
  "assetSets": [],
  "animations": [],
  "attachments": [],
  "fallbacks": []
}
```

---

## 36. Naming Conventions

### 36.1 Asset-Set IDs

```text
ANIMSET_<CATEGORY>_<NAME>
```

Examples:

```text
ANIMSET_AGENT_STANDARD_001
ANIMSET_MAIN_ROBOT_HOLOGRAM
ANIMSET_DOOR_STANDARD_VERTICAL
ANIMSET_ELEVATOR
```

### 36.2 Animation IDs

```text
ANIM_<CATEGORY>_<NAME>_<STATE>
```

Examples:

```text
ANIM_AGENT_STANDARD_001_IDLE
ANIM_AGENT_STANDARD_001_WALK_NORTH
ANIM_MAIN_ROBOT_THINKING
ANIM_DOOR_LIGHT_BLUE_GRANTED
```

### 36.3 Files

Use lowercase kebab-case:

```text
main-robot-idle.png
agent-standard-001-walk-north.png
door-light-blue-granted.png
```

Do not use spaces in filenames.

---

## 37. Approval Workflow

An animation asset is not approved merely because it loads.

Approval requires:

1. file placed in the correct directory;
2. metadata completed;
3. validation script passes;
4. contact sheet generated;
5. anchor verified;
6. world-scale preview checked;
7. looping checked;
8. reduced-motion fallback checked;
9. state transition checked;
10. final approval field set.

Recommended status values:

```text
missing
uploaded
metadata_pending
validation_failed
ready_for_review
approved
deprecated
```

---

## 38. Deprecation

Do not delete an animation immediately when replacing it.

Mark it:

```json
{
  "status": "deprecated",
  "replacementAnimationId": "ANIM_NEW_ID"
}
```

Remove deprecated assets only after:

- no runtime references remain;
- migrations are complete;
- tests pass;
- visual review confirms the replacement.

---

## 39. Explicit Unknowns That Must Be Filled After Asset Upload

The following values are intentionally not invented:

- exact file names;
- exact frame width and height;
- exact sprite-sheet rows and columns;
- exact approved frame order for each sheet;
- exact animation duration;
- exact world scale;
- exact anchor pixel;
- exact opacity and blend mode;
- exact occlusion masks;
- exact list of agent animation sets;
- exact final Main Robot Tube frame sequence;
- exact final Small Robot Tube frame sequence.

Codex must inspect the uploaded assets and propose these values through the animation debugger and validation process.

Codex must not silently fill them without recording the decision.

---

## 40. Acceptance Criteria

The animation system is complete only when:

- every active animation has explicit metadata;
- all required asset files exist;
- every required state resolves to an animation or fallback;
- the main and small holograms remain inside their tubes;
- agent feet anchors remain stable across state changes;
- door animations and collision states match;
- door-light colors match access logic;
- missing yellow lights render as added overlay fixtures;
- the elevator displays the current floor above D47;
- computer effects remain clipped to screens;
- selection effects align at all zoom levels;
- reduced-motion mode works;
- validation scripts pass;
- no renderer guesses frame layout;
- no production markup is visible;
- debug previews are generated and reviewed.

---

## 41. Codex Implementation Sequence

Codex should implement animation support in this order:

### Phase 1 — Metadata Loader

- define schemas;
- load JSON;
- validate IDs;
- reject invalid metadata;
- provide readable errors.

### Phase 2 — Generic Sprite Player

- grid extraction;
- explicit frame lists;
- variable timing;
- loops;
- once;
- ping-pong;
- pause;
- fallback.

### Phase 3 — World Attachment

- world-to-screen transform;
- anchors;
- z-layers;
- pixel-art rendering;
- zoom/pan stability.

### Phase 4 — Animation Debugger

- preview;
- frame stepping;
- anchor overlay;
- timing controls;
- reduced motion.

### Phase 5 — Main Robot Tube

- idle;
- state changes;
- tube clipping/occlusion;
- panel interaction.

### Phase 6 — Agent Prototype

- one agent;
- idle;
- walking;
- seated;
- standing work;
- interaction.

### Phase 7 — Doors and Lights

- open/close;
- collision synchronization;
- all four access colors;
- added missing lights.

### Phase 8 — Elevator

- door animation;
- floor display;
- call/arrival states.

### Phase 9 — Computer and Ambient Effects

- screen clipping;
- state-driven displays;
- performance controls.

### Phase 10 — Validation and Approval

- automated validation;
- screenshot artifacts;
- reduced-motion test;
- responsive alignment test;
- production build.

---

## 42. Final Rule

The animation renderer must be generic.

Adding a new agent, hologram, door effect, computer effect, or environmental animation should require:

1. adding the asset;
2. adding metadata;
3. validating it;
4. referencing its ID.

It should not require rewriting core rendering logic.
