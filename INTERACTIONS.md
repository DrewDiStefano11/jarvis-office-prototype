# AI Hub Office — Interaction Specification

## 1. Purpose

This document defines how users, agents, doors, workstations, rooms, and major interactive objects behave inside the AI Hub office.

It is an implementation contract for Codex. It defines:

- what can be interacted with;
- how interaction targets are identified;
- what happens when an interaction succeeds or fails;
- how agent permissions affect doors, seats, rooms, and workstations;
- how visual feedback, collision, navigation, and UI panels stay synchronized;
- what must remain configurable rather than hard-coded;
- how unfinished features behave without breaking the office.

This document does **not** define final visual styling, final backend integrations, or exact screen-panel content. Those may evolve, but the interaction rules in this document must remain stable unless explicitly revised.

---

## 2. Authoritative Canvas and Coordinate System

The clean office master image is:

```text
Width: 8192 px
Height: 5460 px
Origin: top-left
X direction: left to right
Y direction: top to bottom
```

All interaction bounds, anchors, navigation geometry, door thresholds, room polygons, object polygons, and effects must be stored in original-image coordinates.

Runtime display scaling must use a coordinate transform. Do not rewrite the source coordinates when the viewport changes.

Recommended transform:

```ts
screenX = worldX * scale + offsetX
screenY = worldY * scale + offsetY

worldX = (screenX - offsetX) / scale
worldY = (screenY - offsetY) / scale
```

The office image must preserve its aspect ratio. Cropping, stretching, independent X/Y scaling, and per-layer resizing are prohibited.

---

## 3. Source Files and Precedence

The implementation must use the following source-of-truth order:

1. Clean 8192 × 5460 office image — visual appearance.
2. `AI_HUB_MARKUP_LEGEND.md` — meaning of markup colors and symbols.
3. `DOOR_ACCESS.csv` — authoritative door access and door-light behavior.
4. Room, wall, object, door, walkable-area, computer, chair/standing, and interactive-object markup files — approximate geometry and identity.
5. Structured layout data generated from the markups — runtime geometry.
6. This document — runtime interaction behavior.

When a hand-drawn markup is slightly inaccurate, preserve its intended target while refining the final bounds to match the clean image.

---

## 4. Interaction Design Principles

### 4.1 Predictability

The same type of object must behave consistently throughout the office.

Examples:

- all green doors use the same open-access logic;
- all blue doors use explicit authorization;
- all yellow positions use priority access;
- all marked computers use a defined computer interaction type;
- all unavailable future features show a clear placeholder rather than silently failing.

### 4.2 Visual and Logical Synchronization

Visual state must never contradict application state.

Examples:

- a red door light must correspond to a blocked door;
- a door displayed as open must not retain collision;
- an agent shown sitting must occupy a valid seat anchor;
- a busy workstation must not appear available;
- an elevator floor display must match the current elevator state.

### 4.3 Data-Driven Behavior

Do not hard-code individual object behavior inside rendering components.

Use structured data for:

- IDs;
- bounds;
- anchors;
- interaction types;
- access rules;
- assigned agents;
- room relationships;
- current state;
- feature flags;
- animation references;
- UI-panel destinations.

### 4.4 Graceful Incompleteness

An unfinished interaction must:

1. remain selectable if it is intended to be interactive;
2. display a consistent “Not yet available” or “Under construction” state;
3. avoid navigation, collision, or state corruption;
4. log the interaction in development mode;
5. not invent unsupported functionality.

---

## 5. Supported Input Methods

The office should support:

- mouse;
- trackpad;
- keyboard;
- touch, where practical;
- autonomous agent interaction;
- programmatic interaction from internal systems.

### 5.1 Pointer Controls

- Single click or tap: select/interact.
- Double click: optional focus or open primary panel; do not use unless implemented consistently.
- Hover: show subtle highlight, cursor change, and compact label.
- Drag on empty office area: pan view.
- Mouse wheel or pinch: zoom.
- Escape: close the active panel or cancel the current selection.
- Clicking empty space: clear selection unless a modal is open.

### 5.2 Keyboard Controls

Minimum keyboard behavior:

- `Tab`: move between currently visible interactive targets and controls.
- `Shift + Tab`: reverse focus order.
- `Enter` or `Space`: activate focused target.
- `Escape`: close/cancel.
- Arrow keys: navigate lists or menus inside panels.
- `+` and `-`: optional zoom controls.
- `0`: optional reset-view control.

All keyboard-focusable targets must have a visible focus indicator.

### 5.3 Agent-Initiated Interaction

An autonomous agent may interact only when:

- the target exists and is enabled;
- a valid path exists;
- the agent satisfies access requirements;
- the target is not exclusively occupied by another agent;
- the agent has reached the required approach or anchor point;
- the target’s state allows interaction.

---

## 6. Common Interaction State Model

Every interactive object should support the following state model where applicable:

```text
disabled
idle
hovered
focused
approaching
active
busy
reserved
restricted
blocked
completed
error
```

Not every object must use every state.

### 6.1 State Definitions

- `disabled`: object exists but interaction is unavailable.
- `idle`: normal available state.
- `hovered`: pointer is over the interaction target.
- `focused`: keyboard or programmatic focus is active.
- `approaching`: an agent is pathing toward the object.
- `active`: interaction is currently in progress.
- `busy`: another process or agent controls the object.
- `reserved`: available only to designated participants.
- `restricted`: authorization is required.
- `blocked`: interaction is prohibited.
- `completed`: a one-time interaction has finished.
- `error`: the interaction failed safely.

### 6.2 State Priority

When multiple conditions apply, use this priority:

```text
error
blocked
disabled
restricted
reserved
busy
active
approaching
focused
hovered
idle
```

Higher-priority states override lower-priority presentation and interaction behavior.

---

## 7. Hit Testing and Target Priority

Interactive targets may overlap visually. Hit testing must choose the most specific valid target.

Recommended priority:

1. open modal or panel controls;
2. selected object controls;
3. door lights and door controls;
4. interactive objects;
5. computers and displays;
6. agent sprites;
7. seats and standing anchors;
8. room or zone;
9. empty walkable area;
10. background.

### 7.1 Bounds

Each target may define:

- `visualBounds`: visible object footprint;
- `hitBounds`: clickable area;
- `collisionBounds`: blocked movement area;
- `approachAnchor`: location an agent walks to;
- `interactionAnchor`: exact position used during interaction;
- `labelAnchor`: UI label placement.

These bounds may differ and must not be treated as interchangeable.

### 7.2 Minimum Hit Area

Small targets may use a slightly enlarged invisible hit area, but it must:

- remain centered on the intended object;
- not overlap unrelated objects;
- preserve accurate selection at high zoom;
- not change collision geometry.

---

## 8. Selection Behavior

At most one primary world object should be selected at a time unless multi-select is explicitly enabled in development tools.

Selecting an object should:

1. store its stable ID;
2. display a subtle selection outline or highlight;
3. show a compact tooltip or information card;
4. expose the object’s primary action;
5. not alter access state merely because it was selected.

Selecting another object replaces the previous world selection.

Active modal panels may retain the ID of the object that opened them.

---

## 9. Room and Zone Interactions

Rooms and zones are defined by room polygons.

### 9.1 Enter and Exit Events

When an agent’s base point crosses a room boundary:

```text
room:exit(previousRoomId)
room:enter(newRoomId)
agent:roomChanged(agentId, previousRoomId, newRoomId)
```

Do not determine room membership using the sprite’s visual center. Use the sprite’s base/feet anchor.

### 9.2 Room Selection

Clicking an unobstructed room floor may:

- select the room;
- show its name;
- show department status;
- show assigned agents;
- show room access classification;
- show active meetings or reservations;
- provide “focus view” without teleporting the user or agents.

### 9.3 Room Focus

Focusing a room may pan and zoom the camera to fit the room polygon.

The transition should:

- preserve aspect ratio;
- avoid sudden extreme zoom;
- be cancelable;
- not move agents;
- not bypass access rules.

### 9.4 Reserved and Restricted Rooms

Room access is enforced through doors, not merely through room polygon membership.

A room’s panel may report:

- open;
- restricted;
- reserved;
- blocked;
- occupied;
- under construction.

The door system remains authoritative for actual entry.

---

## 10. Door Interactions

Door IDs and access behavior come from `DOOR_ACCESS.csv`.

### 10.1 Door Light Meanings

- `GREEN`: any active agent may enter.
- `RED`: no agent may enter.
- `BLUE`: only explicitly authorized members may enter.
- `YELLOW`: only active meeting participants, assigned event members, assigned group members, or temporarily authorized agents may enter.
- `YELLOW_MISSING_LIGHT`: same behavior as yellow, but a new visible light must be added.
- `ELEVATOR`: use elevator behavior and a floor-number display instead of a standard access light.

### 10.2 Existing Door Lights

Where the clean image already contains a small door indicator:

- place the assigned light effect directly over it;
- preserve its position, perspective, and scale;
- do not redraw or move the underlying door;
- keep the effect synchronized with access state.

### 10.3 Missing Door Lights

Where the markup identifies a missing light:

- add a new light fixture/effect;
- match nearby door lights in pixel-art style;
- place it at the indicated location;
- use the correct state color;
- give it the same animation and state transitions as existing lights.

### 10.4 User Clicking a Door

Clicking a normal door should open a compact door-status panel showing:

- door ID;
- connected zones;
- current light color;
- current access mode;
- current door state;
- reason for restriction or reservation;
- authorized groups, when the current user is allowed to see them;
- active meeting/event name for yellow doors, when applicable.

Clicking a door does **not** automatically grant access.

A user may manually request an open action only if:

- manual opening is enabled;
- the selected user/agent is authorized;
- the door is not red;
- no agent occupies the clearance zone.

### 10.5 Agent Approaching a Door

When pathfinding reaches a door approach zone:

1. evaluate access;
2. reserve the door threshold briefly for the approaching agent;
3. open the door if authorized;
4. remove the temporary collision blocker;
5. allow the agent to cross;
6. wait until the clearance zone is empty;
7. close the door;
8. restore the collision blocker.

### 10.6 Denied Access

When access is denied:

- do not allow the agent to clip into the door;
- cancel or recompute the path;
- emit a denied-access event;
- show an optional brief status indicator;
- keep the assigned light unchanged;
- do not retry continuously without a state change.

### 10.7 Door Safety

A door must never:

- close through an agent;
- close while the threshold is occupied;
- visually open while retaining collision;
- visually close while remaining passable;
- change color without changing access logic;
- grant access based only on visual proximity.

---

## 11. Chair and Standing-Position Interactions

The chair/standing markup uses color for rank priority, not pose.

### 11.1 Access Meaning

- Yellow dot: priority position for higher-ranking or privileged agents.
- Red dot: standard position for agents who are not high-ranking.

### 11.2 Pose Detection

Determine pose from the underlying furniture:

- chair, couch, executive seat, boardroom seat, conference seat → seated;
- standing desk, standing console, open standing station → standing.

Do not infer pose from dot color.

### 11.3 Position States

Each position supports:

```text
available
reserved
approaching
occupied
temporarily_unavailable
disabled
```

### 11.4 Claiming a Position

Before an agent paths to a position:

1. verify access tier;
2. verify room and door access;
3. verify the anchor is reachable;
4. atomically reserve the position;
5. assign the approaching agent;
6. release the reservation if pathing fails or times out.

### 11.5 Occupying a Position

Once the agent reaches the position:

- snap only the base/feet anchor, not the full image center;
- apply the correct facing direction;
- switch to seated or standing animation;
- associate the agent with the workstation or table;
- mark the position occupied.

### 11.6 Releasing a Position

Release when:

- the agent receives a new task;
- the meeting ends;
- the agent logs out;
- the room becomes inaccessible;
- a higher-priority scheduler reassigns the position;
- an error or timeout occurs.

The position must not remain permanently reserved after an interrupted action.

### 11.7 Priority Rules

Yellow positions are not automatically occupied merely because a high-ranking agent exists.

A higher-ranking agent must still:

- be assigned;
- be present;
- have room access;
- claim the position;
- satisfy any active meeting or event rules.

Standard agents may not use yellow positions unless an explicit temporary override exists.

---

## 12. Computer and Display Interactions

Every marked computer/display anchor must receive a stable ID and interaction type.

Unmarked screens are decorative by default.

### 12.1 Computer Types

Use one of the following types:

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

### 12.2 Agent Workstation

Primary behavior:

- show assigned agent;
- show current status;
- show current task;
- show recent activity;
- open the agent workspace panel.

If unassigned:

```text
Status: Unassigned workstation
Primary action: Assign agent
```

Assignment actions must be permission-controlled and data-driven.

### 12.3 Department Workstation

Opens a department panel showing:

- department name;
- active agents;
- queued tasks;
- blocked work;
- current alerts;
- recent completions;
- system health relevant to the department.

### 12.4 Department Wall Display

Opens a larger read-only dashboard.

It may show:

- maps;
- charts;
- department status;
- system metrics;
- active incidents;
- project progress.

It should not duplicate a workstation’s editing controls unless explicitly configured.

### 12.5 Conference and Boardroom Displays

When no meeting is active:

- show room availability;
- show next reservation;
- allow authorized scheduling or meeting-start actions.

When a meeting is active:

- show meeting title;
- participants;
- agenda;
- elapsed time;
- shared artifacts;
- meeting controls for authorized participants.

### 12.6 Executive Command Console

Primary purpose:

- executive overview;
- global system status;
- major decisions;
- escalations;
- priority queues;
- cross-department coordination.

Access to detailed controls should be restricted to configured authorized agents/users.

### 12.7 Nexus Console

Primary purpose:

- system-wide health;
- agent network status;
- orchestration state;
- current global tasks;
- central command actions.

A Nexus console may open the same core system panel as the Main Robot Tube but should retain its own object ID and analytics.

### 12.8 Focus-Room Terminal

Primary purpose:

- initiate or resume a focused task session;
- show assigned agent;
- show focus-session duration;
- reduce noncritical UI distractions;
- reserve the associated room or position.

### 12.9 Security Console

Primary purpose:

- access-control status;
- blocked doors;
- restricted entries;
- system alerts;
- audit activity.

It must not allow bypassing red-door rules unless a later explicit administrative policy is added.

### 12.10 Sandbox Terminal

Primary purpose:

- open the sandbox workspace;
- show active experiment/group;
- show reservation;
- show assigned participants;
- show temporary resources;
- end or release the sandbox session.

### 12.11 Computer Error Handling

If a referenced backend feature is unavailable:

- keep the computer selectable;
- show the workstation identity;
- show a clear unavailable state;
- provide retry only when meaningful;
- never render an empty panel without explanation.

---

## 13. Main Robot Tube

Stable ID:

```text
INTERACTIVE_MAIN_ROBOT_TUBE
```

Location:

```text
Central Nexus
```

### 13.1 Purpose

The Main Robot Tube is the primary visual representation of the AI Hub’s central orchestrator.

### 13.2 Default Presentation

- continuously run a subtle idle floating animation;
- preserve transparent sprite background;
- center the holographic sprite inside the tube;
- anchor the sprite relative to the tube, not the viewport;
- maintain correct scaling at all zoom levels;
- prevent the sprite from escaping the tube bounds.

### 13.3 Primary Interaction

Clicking or activating the tube opens the global AI Hub command panel.

The panel may include:

- global system status;
- active agents;
- task orchestration;
- urgent alerts;
- department summaries;
- recent decisions;
- command input;
- system-wide search.

### 13.4 Agent Interaction

An agent interacting with the tube must:

1. reserve an available Nexus interaction anchor;
2. path to the anchor;
3. face the tube;
4. play an interaction animation;
5. emit a system request;
6. remain until completed, canceled, or timed out;
7. release the anchor.

### 13.5 Tube States

```text
idle
listening
thinking
responding
warning
critical
offline
```

Each state may change:

- hologram animation;
- glow intensity;
- pulse timing;
- particle behavior;
- panel status.

Do not change collision geometry based on visual state.

### 13.6 Collision

The tube and its surrounding machinery are hard collision objects.

The holographic sprite itself does not create additional collision beyond the tube’s object geometry.

---

## 14. Small Robot Tube

Stable ID:

```text
INTERACTIVE_SMALL_ROBOT_TUBE
```

Location:

```text
Agent Platform & Models
```

### 14.1 Purpose

The Small Robot Tube represents the agent-platform and model-management interface.

### 14.2 Primary Interaction

Clicking or activating the tube opens the Agent Platform & Models panel.

Suggested sections:

- available agent templates;
- deployed agents;
- model assignments;
- agent creation;
- agent configuration;
- agent testing;
- agent retirement or archival;
- model-health status.

### 14.3 Placeholder Behavior

Until real agent-management functionality exists:

- show the tube animation;
- open a structured placeholder panel;
- list the intended future capabilities;
- do not simulate destructive actions;
- do not create fake agents that persist unexpectedly.

### 14.4 Collision and Anchors

The tube is a hard collision object.

Agents interact from designated nearby anchors and may not occupy the tube footprint.

---

## 15. Map Interaction

Stable ID:

```text
INTERACTIVE_MAP
```

Location:

```text
Reliability & Operations
```

### 15.1 Primary Interaction

Clicking the map opens the office navigation map.

The map should display:

- room boundaries;
- room names;
- current user/selected agent;
- active agents, when enabled;
- door access states;
- room reservations;
- alerts;
- current target destination;
- optional path preview.

### 15.2 Room Navigation

Clicking a room in the map may:

- close or minimize the map;
- pan and zoom the office to that room;
- select the room;
- optionally preview a path for the selected agent.

It must not teleport an agent unless an explicit debug-only teleport tool is enabled.

### 15.3 Access Visibility

The map may show:

- green door: general access;
- red door: blocked;
- blue door: restricted;
- yellow door: reserved/event access.

The map must not reveal sensitive membership details to unauthorized users.

---

## 16. Elevator Interaction

Stable ID:

```text
INTERACTIVE_ELEVATOR
```

Associated door:

```text
D47
```

### 16.1 Floor-Number Display

Add a pixel-art floor-number sign above the elevator entrance.

The display must:

- remain aligned with the elevator at every zoom level;
- show the current or arriving floor;
- use configurable floor labels;
- animate changes only when the elevator state changes;
- not use a normal red/green/blue/yellow door light.

### 16.2 Elevator States

```text
idle_closed
called
arriving
opening
open
boarding
closing
traveling
unavailable
error
```

### 16.3 Primary User Interaction

Clicking the elevator opens the floor selector.

The selector must show:

- current floor;
- available floors;
- unavailable floors;
- under-construction floors;
- selected destination;
- call status.

### 16.4 Agent Use

An agent using the elevator must:

1. select or receive a destination floor;
2. path to the elevator approach point;
3. call the elevator;
4. wait outside the collision threshold;
5. enter only when the door is open;
6. transition to an internal elevator/travel state;
7. leave the current floor;
8. appear at the destination arrival anchor after travel completes.

### 16.5 Single-Floor Placeholder

If only one floor exists:

- the elevator remains interactive;
- the current floor is shown;
- unavailable floors are labeled under construction or unavailable;
- no fake floor transition occurs;
- the system does not remove the agent from the map.

### 16.6 Safety

The elevator door must not close while an agent occupies its threshold.

The display, elevator state, door animation, and pathfinding blocker must remain synchronized.

---

## 17. Stair Interactions

Stable IDs:

```text
INTERACTIVE_STAIRS_1
INTERACTIVE_STAIRS_2
```

Canonical assignment:

```text
Stairs1 = upper-right staircase
Stairs2 = upper-left staircase
```

### 17.1 Primary Interaction

Clicking a staircase opens a compact transition panel showing:

- staircase name;
- destination floor or zone;
- availability;
- access restrictions;
- under-construction state, when applicable.

### 17.2 Agent Use

An agent may use stairs only when:

- the destination exists;
- the related door is accessible;
- the staircase is enabled;
- a valid transition anchor is configured.

### 17.3 Placeholder Behavior

Until additional floors are implemented:

- stairs remain visible and selectable;
- transition attempts show “Under construction” or “Destination unavailable”;
- agents do not disappear;
- no invalid path is created beyond the active floor boundary.

---

## 18. Sandbox Interactions

Sandbox rooms are event/group-use spaces and use yellow access behavior.

### 18.1 Sandbox Session

A sandbox session should define:

```text
sessionId
sandboxRoomId
title
hostAgentId
participantAgentIds
participantGroupIds
startTime
endTime
status
resourceAssignments
```

### 18.2 Starting a Session

A session may be started from:

- the sandbox terminal;
- a room scheduling panel;
- an authorized group workflow.

Starting a session may:

- reserve the room;
- authorize listed participants at yellow doors;
- reserve standard or priority positions as configured;
- initialize the sandbox panel;
- display session status.

### 18.3 Ending a Session

Ending a session must:

- release temporary access;
- release positions;
- close active sandbox tools safely;
- preserve required results or logs;
- restore default door behavior.

---

## 19. Conference and Boardroom Interactions

Conference rooms and the Executive Boardroom support scheduled group interactions.

### 19.1 Meeting Record

```text
meetingId
roomId
title
hostId
participantIds
participantGroupIds
startTime
endTime
status
agenda
priority
```

### 19.2 Access

- Yellow conference-room doors grant access to active participants and assigned groups.
- Blue access remains restricted unless the meeting explicitly grants the required authorization.
- Red access cannot be overridden by a meeting.

### 19.3 Seat Assignment

Meeting scheduling may reserve:

- yellow priority seats for executives, leadership, hosts, or privileged agents;
- red standard seats for ordinary participants.

Seat assignment must not infer identity solely from chair location.

### 19.4 Meeting Lifecycle

```text
scheduled
starting
active
ending
completed
canceled
```

At meeting completion or cancellation:

- release temporary door access;
- release reserved seats;
- clear active meeting displays;
- preserve meeting history if configured.

---

## 20. Agent Sprite Interactions

### 20.1 Selecting an Agent

Clicking an agent may open an agent card showing:

- display name;
- agent ID;
- department;
- rank/access tier;
- current room;
- current task;
- current status;
- assigned workstation;
- current destination.

### 20.2 Agent Commands

Authorized users may be able to:

- focus camera on agent;
- open agent workspace;
- assign a task;
- send agent to room;
- request interaction with object;
- pause or resume agent;
- release a reserved position.

Commands must be validated against:

- access;
- path availability;
- object availability;
- current critical task;
- agent state.

### 20.3 Agent-to-Agent Interaction

Agent-to-agent interactions are optional for the first implementation.

If included, they should use:

- an approach distance;
- a shared interaction reservation;
- facing alignment;
- a timed interaction;
- a completion or cancellation event.

Agents must not overlap physically during the interaction.

---

## 21. User Interface Panels

World interactions should open reusable panels rather than embedding custom UI directly into the map renderer.

Recommended panel types:

```text
AgentPanel
RoomPanel
DoorPanel
ComputerPanel
DepartmentPanel
MeetingPanel
SandboxPanel
MapPanel
ElevatorPanel
NexusPanel
AgentPlatformPanel
PlaceholderPanel
ErrorPanel
```

### 21.1 Panel Requirements

Every panel should support:

- title;
- object ID;
- current state;
- close action;
- loading state;
- unavailable state;
- error state;
- permission-aware actions;
- keyboard navigation.

### 21.2 Panel Persistence

Closing a panel must not cancel an active agent action unless the action explicitly requires the panel to stay open.

Refreshing the page should not silently duplicate an in-progress command.

---

## 22. Event Model

Use an event-driven interaction layer so the renderer, simulation, UI, and backend remain decoupled.

Recommended events:

```text
interaction:selected
interaction:started
interaction:completed
interaction:canceled
interaction:failed

door:accessRequested
door:accessGranted
door:accessDenied
door:opening
door:opened
door:closing
door:closed
door:stateChanged

agent:destinationAssigned
agent:pathStarted
agent:pathFailed
agent:arrived
agent:positionReserved
agent:positionOccupied
agent:positionReleased
agent:roomChanged

meeting:scheduled
meeting:started
meeting:ended
meeting:canceled

sandbox:started
sandbox:ended

elevator:called
elevator:arrived
elevator:floorChanged

panel:opened
panel:closed
```

Events should include stable IDs and timestamps.

---

## 23. Suggested Data Schema

Example interaction object:

```json
{
  "id": "INTERACTIVE_MAIN_ROBOT_TUBE",
  "type": "main_robot_tube",
  "roomId": "ROOM_CENTRAL_NEXUS",
  "visualBounds": {
    "type": "polygon",
    "points": []
  },
  "hitBounds": {
    "type": "polygon",
    "points": []
  },
  "collisionObjectId": "OBJECT_MAIN_ROBOT_TUBE",
  "approachAnchors": [
    "ANCHOR_NEXUS_TUBE_01"
  ],
  "primaryAction": "open_nexus_panel",
  "enabled": true,
  "state": "idle",
  "animationSetId": "ANIM_MAIN_ROBOT_TUBE",
  "featureFlags": []
}
```

Example position:

```json
{
  "id": "POSITION_001",
  "roomId": "ROOM_EXEC_COMMAND",
  "accessTier": "priority",
  "pose": "seated",
  "anchor": {
    "x": 0,
    "y": 0
  },
  "facing": "north",
  "associatedComputerId": "COMPUTER_001",
  "state": "available",
  "reservedByAgentId": null,
  "occupiedByAgentId": null
}
```

Example computer:

```json
{
  "id": "COMPUTER_001",
  "type": "agent_workstation",
  "roomId": "ROOM_SOFTWARE_ENGINEERING",
  "screenAnchor": {
    "x": 0,
    "y": 0
  },
  "hitBounds": {
    "type": "rectangle",
    "x": 0,
    "y": 0,
    "width": 0,
    "height": 0
  },
  "assignedAgentId": null,
  "associatedPositionId": "POSITION_001",
  "primaryAction": "open_agent_workspace",
  "state": "idle"
}
```

---

## 24. Rendering and Layer Order

Recommended world rendering order:

1. clean office background;
2. permanent environmental effects;
3. door-light effects;
4. elevator floor display;
5. object-specific effects;
6. agents behind foreground geometry;
7. agents in normal layer;
8. foreground masks/occlusion;
9. selection highlights;
10. hover/focus indicators;
11. debug overlays;
12. UI panels and modal interfaces.

Markup images must never appear in production rendering.

---

## 25. Debug Interaction Tools

Development mode must include:

- show interaction bounds;
- show collision bounds;
- show approach anchors;
- show position access tier;
- show computer IDs;
- show interactive-object IDs;
- show current object state;
- show door access evaluation;
- show current room;
- show current path;
- trigger object states manually;
- simulate meeting reservations;
- simulate blue-door membership;
- simulate yellow-door participant lists;
- simulate red-door denial;
- test elevator states;
- inspect emitted events.

Debug-only actions must be clearly separated from production controls.

---

## 26. Logging

Development logging should record:

```text
timestamp
interactionId
targetId
targetType
actorType
actorId
action
previousState
nextState
authorizationResult
failureReason
```

Do not spam logs for continuous hover movement. Log meaningful transitions.

Production logging should be configurable and avoid exposing sensitive access-group membership unnecessarily.

---

## 27. Failure Handling

### 27.1 Missing Geometry

If an object lacks required geometry:

- do not place it at coordinate `(0,0)`;
- disable the interaction;
- show it in validation reports;
- log a structured error.

### 27.2 Missing Assignment

If a computer or position lacks an assignment:

- keep it available where appropriate;
- label it unassigned;
- do not attach it to a random agent.

### 27.3 Missing Authorization Data

For blue access:

- fail closed;
- deny entry until explicit authorization exists.

For yellow access:

- fail closed when a reservation is required and no active participant data exists.

For green access:

- allow active agents unless another explicit override exists.

For red access:

- always deny.

### 27.4 Path Failure

If no path exists:

- release reserved targets;
- stop the agent safely;
- report the failure;
- do not teleport;
- do not clip through collision.

---

## 28. Accessibility Requirements

- interactive targets must have accessible names;
- color must not be the only indication of access state in panels;
- provide text labels such as “Blocked,” “Open access,” “Restricted,” and “Reserved”;
- keyboard users must be able to reach panels and controls;
- motion-reduction preference should reduce nonessential pulsing and floating;
- status changes should be announced appropriately in accessible UI;
- tooltips must not contain critical information that is unavailable elsewhere.

---

## 29. Performance Requirements

- hit testing should use spatial indexing or another efficient lookup;
- hover detection must not iterate over every object at full cost on every pointer event;
- agent pathfinding should not rebuild all geometry for every request;
- animation state changes should not rerender unrelated UI;
- large panels should load data independently from map rendering;
- effects should degrade gracefully on lower-performance devices;
- debug overlays may be slower but must remain usable.

---

## 30. Acceptance Criteria

The interaction system is not complete until all of the following pass.

### 30.1 General

- Every marked interactive object has a stable ID.
- Every interaction target aligns with the 8192 × 5460 master image.
- No markup appears in production mode.
- Selection, hover, focus, and active states are distinguishable.
- Keyboard activation works for all primary interactions.

### 30.2 Doors

- All D01–D47 records load successfully.
- Green doors allow any active agent.
- Red doors deny every agent.
- Blue doors require explicit authorization.
- Yellow doors require an active meeting, event, group assignment, or temporary authorization.
- Missing yellow lights are added at the correct marked locations.
- D47 shows an elevator floor-number display.
- Door visuals, access logic, and collision stay synchronized.
- Doors do not close through agents.

### 30.3 Positions

- Yellow positions reject standard agents without an override.
- Red positions accept standard eligible agents.
- Pose is determined from furniture, not dot color.
- Position reservation prevents two agents from occupying the same anchor.
- Failed navigation releases the reservation.

### 30.4 Computers

- Every marked computer has a type.
- Assigned workstations open the correct agent or department panel.
- Unassigned workstations display an explicit unassigned state.
- Unavailable backend features use a safe placeholder.

### 30.5 Major Objects

- Main Robot Tube opens the Nexus panel.
- Small Robot Tube opens the Agent Platform & Models panel.
- Map opens the navigation map.
- Elevator opens the floor selector.
- Stairs show valid destinations or an under-construction state.
- Object interaction does not bypass collision or access rules.

### 30.6 Navigation

- Agents reach interaction anchors without crossing walls or objects.
- Closed doors block paths.
- Authorized doors become traversable only when open.
- Denied doors cause rerouting or a safe stop.
- No interaction teleports agents in production mode.

### 30.7 Responsive Alignment

- Pan and zoom do not change world coordinates.
- Every interaction remains aligned at multiple viewport sizes.
- Hit areas, effects, and debug overlays remain aligned with the clean image.
- The elevator number display remains fixed above the elevator.

---

## 31. Explicit Non-Goals for the First Working Version

Unless separately requested, the first working interaction implementation does not need:

- voice input;
- multiplayer user presence;
- real elevator travel between completed floors;
- advanced agent-to-agent conversation animation;
- final backend integrations for every computer;
- final production-quality particles and lighting;
- free-form furniture movement;
- dynamic room remodeling;
- procedural generation of new office geometry.

These may be added later without changing the core interaction contracts.

---

## 32. Codex Implementation Rule

Codex must not treat this document as permission to implement the entire project in one uncontrolled change.

Implementation must proceed in validated phases:

1. load structured interaction data;
2. render debug bounds and anchors;
3. validate alignment;
4. implement selection and panels;
5. implement one test agent;
6. implement doors and access;
7. implement positions;
8. implement computers;
9. implement major interactive objects;
10. add final animations and polish.

Each phase must include tests and visual verification before the next phase begins.
