# .agent/PLANS.md — Execution Plan Standard for the AI Hub Interactive Office

## 1. Purpose

This document defines how Codex must plan, execute, validate, record, and report all substantial work in the AI Hub interactive office repository.

This repository contains a large visual world with:

- an 8192 × 5460 master office image;
- room and zone geometry;
- walkable areas;
- wall and object collisions;
- doors D01 through D47;
- door-access lights;
- priority and standard agent positions;
- computers and displays;
- major interactive objects;
- pathfinding;
- access control;
- meetings and sandbox reservations;
- sprite animation;
- debug overlays;
- user-interface panels;
- future agent and backend integrations.

Because these systems depend on one another, Codex must not treat the project as a single unstructured coding task.

Every substantial change must be guided by a living execution plan.

---

## 2. Location and Use

The repository should store this file at:

```text
.agent/PLANS.md
```

Individual implementation plans should be stored under:

```text
.agent/plans/
```

Recommended naming:

```text
.agent/plans/000-repository-audit.md
.agent/plans/010-static-office-viewer.md
.agent/plans/020-geometry-extraction.md
.agent/plans/030-debug-overlays.md
.agent/plans/040-navigation-prototype.md
.agent/plans/050-door-access-system.md
.agent/plans/060-position-system.md
.agent/plans/070-interactions.md
.agent/plans/080-animation-system.md
.agent/plans/090-persistence-integration.md
.agent/plans/100-final-validation.md
```

Use zero-padded numeric prefixes so plan order remains clear.

---

## 3. When an Execution Plan Is Required

Create or update an execution plan before work that:

- affects more than one subsystem;
- changes application architecture;
- adds or changes world geometry;
- changes pathfinding;
- changes access control;
- changes door behavior;
- changes coordinate transforms;
- changes animation architecture;
- adds persistence;
- changes public data schemas;
- modifies multiple major files;
- requires visual validation;
- introduces a new framework or dependency;
- may take more than one focused implementation session;
- has meaningful unknowns or risks;
- could invalidate previously approved work.

A plan is not required for:

- correcting a typo;
- updating a single known data value;
- adding a small test for already-defined behavior;
- changing documentation wording without changing requirements;
- making a narrowly scoped reversible style adjustment.

When uncertain, create the plan.

---

## 4. Plan Status Values

Every plan must include one status:

```text
draft
ready_for_review
approved
in_progress
blocked
validation
completed
superseded
canceled
```

Definitions:

- `draft`: incomplete planning work.
- `ready_for_review`: plan is complete enough for review.
- `approved`: authorized to begin implementation.
- `in_progress`: implementation underway.
- `blocked`: work cannot continue until a dependency or decision is resolved.
- `validation`: implementation is complete for the stated scope and is being tested/reviewed.
- `completed`: all scope and acceptance criteria passed.
- `superseded`: replaced by a newer plan.
- `canceled`: deliberately abandoned.

Do not mark a plan `completed` while unresolved required acceptance criteria remain.

---

## 5. Plan Ownership

Each plan should identify:

```text
owner
reviewer
created date
last updated date
related issue or task
related branch
related pull request
```

When these values do not yet exist, use `TBD`.

Do not invent issue numbers, branch names, or reviewers.

---

## 6. Required Plan Header

Every plan must begin with:

```markdown
# <Plan Title>

Status: <status>
Plan ID: <numeric or stable ID>
Owner: <name or TBD>
Reviewer: <name or TBD>
Created: <YYYY-MM-DD>
Last Updated: <YYYY-MM-DD>
Related Task: <reference or TBD>
Related Branch: <branch or TBD>
Related Pull Request: <PR or TBD>
```

Then include:

```markdown
## Executive Summary
```

The executive summary should explain:

- what this phase creates;
- why it is needed now;
- which systems it depends on;
- what will be true when the phase is complete;
- what is explicitly not included.

---

## 7. Required Plan Sections

Every substantial execution plan must contain all of the following sections.

```text
1. Executive Summary
2. Goal
3. Background and Context
4. Current Repository State
5. Source-of-Truth Files
6. Scope
7. Out of Scope
8. Assumptions
9. Known Unknowns
10. Questions Requiring User Decision
11. Architecture Decision
12. Alternatives Considered
13. Data Model
14. File and Directory Changes
15. Implementation Milestones
16. Detailed Task Breakdown
17. Validation Strategy
18. Test Plan
19. Visual Review Plan
20. Performance Considerations
21. Accessibility Considerations
22. Security and Data Integrity
23. Risks and Mitigations
24. Rollback Strategy
25. Decision Log
26. Progress Log
27. Unexpected Discoveries
28. Manual Review Items
29. Completion Criteria
30. Final Report
```

A section may state `Not applicable`, but it may not be silently omitted.

---

## 8. Goal Section

The goal must be concrete and testable.

Poor goal:

```text
Make the office interactive.
```

Acceptable goal:

```text
Render the clean 8192 × 5460 office image inside a responsive viewport,
support pan and zoom without changing world coordinates, and provide tested
world-to-screen and screen-to-world coordinate transforms used by all later
geometry and interaction systems.
```

The goal should describe the final observable outcome, not only implementation activity.

---

## 9. Background and Context

Explain why the phase exists.

Include:

- relevant prior phase;
- relevant source documents;
- dependent systems;
- user intent;
- current limitations;
- reason this phase occurs now.

Do not repeat the entire repository specification. Include only context needed to make the plan self-contained.

---

## 10. Current Repository State

Before proposing changes, inspect the repository.

Record:

```text
current framework
package manager
build commands
test commands
lint commands
typecheck commands
existing source layout
existing data layout
existing assets
existing markups
current debug tools
known failing tests
known build warnings
uncommitted changes
```

Where applicable, include exact command results.

Do not assume the repository is empty.

Do not overwrite working architecture without first documenting it.

---

## 11. Source-of-Truth Files

List every file governing the phase.

Minimum project-level sources:

```text
AGENTS.md
docs/AI_HUB_MARKUP_LEGEND.md
docs/DOOR_ACCESS.csv
docs/INTERACTIONS.md
docs/ANIMATION_MANIFEST.md
.agent/PLANS.md
```

Also list relevant markups and runtime data.

Example:

```text
docs/authoring/floor-1/Rooms.png
docs/authoring/floor-1/Doors.png
docs/authoring/floor-1/Walk paths.png
data/rooms.json
data/doors.json
```

For each source, state what it controls.

---

## 12. Scope

Scope must identify exactly what the phase will deliver.

Use testable statements.

Example:

```text
- Load the clean master image.
- Preserve the 8192 × 5460 world coordinate system.
- Add pan and zoom.
- Add viewport resizing.
- Add coordinate conversion utilities.
- Add unit tests for transforms.
- Add a debug cursor coordinate readout.
```

Avoid vague phrases such as:

```text
improve the viewer
make it work better
handle edge cases
```

---

## 13. Out of Scope

Explicitly state what will not be implemented.

Example for the static viewer phase:

```text
- No room polygons.
- No collision.
- No agents.
- No door behavior.
- No final animation system.
- No backend integration.
```

This prevents scope expansion and false completion claims.

---

## 14. Assumptions

Every assumption must be:

- explicit;
- reversible when possible;
- supported by available evidence;
- marked with confidence.

Recommended format:

| ID | Assumption | Confidence | Evidence | Impact if wrong |
|---|---|---:|---|---|
| A-01 | Master image is exactly 8192 × 5460 | High | User confirmation | All coordinate mapping changes |
| A-02 | Markups align without cropping | Medium | Visual inspection | Geometry extraction offset |

Do not hide assumptions inside implementation details.

---

## 15. Known Unknowns

List information not yet confirmed.

Examples:

```text
- exact sprite-sheet frame dimensions;
- final agent roster;
- final mapping for manual-review door rows;
- exact room IDs for RM1–RM10;
- future floor count;
- final persistence backend;
- final animation blend modes.
```

For each unknown, state:

```text
whether it blocks this phase
how it will be resolved
safe temporary behavior
```

---

## 16. Questions Requiring User Decision

Only include questions that materially change implementation or final behavior.

Each question should present:

```text
decision needed
available options
recommended option
consequence of each option
whether work can continue without the answer
```

Do not ask questions Codex can answer by inspecting repository files.

Do not ask the user to choose implementation trivia unless the decision affects product behavior or meaningful architecture.

---

## 17. Architecture Decision

Describe the selected technical approach.

Include:

```text
rendering method
world coordinate model
state-management approach
geometry representation
pathfinding approach
animation approach
schema-validation approach
test approach
debug approach
```

Explain why the choice fits:

- the 8192 × 5460 world;
- pan and zoom;
- polygon geometry;
- sprite animation;
- debug overlays;
- access control;
- future multi-floor expansion.

---

## 18. Alternatives Considered

For each meaningful alternative, record:

```text
alternative
advantages
disadvantages
reason rejected or deferred
```

Example:

```text
DOM-positioned interactive elements
Advantages:
- familiar HTML interaction
- easy accessibility for small numbers of targets

Disadvantages:
- difficult large-world transforms
- weak collision/pathfinding integration
- poor scaling for many animated elements

Decision:
- reject as primary world renderer
- retain HTML for panels and controls
```

Do not produce performative comparisons for trivial decisions.

---

## 19. Data Model

Every plan affecting data must define proposed structures.

Include:

- IDs;
- types;
- required fields;
- optional fields;
- references;
- invariants;
- schema version;
- migration needs.

Example:

```ts
interface DoorRecord {
  id: DoorId;
  connectedZoneIds: [ZoneId, ZoneId];
  accessMode: DoorAccessMode;
  bounds: WorldPolygon;
  threshold: WorldSegment;
  lightAnchorId?: LightAnchorId;
  state: DoorState;
}
```

Data-model rules:

- keep world and screen coordinates distinct;
- preserve stable IDs;
- validate references;
- avoid using display names as IDs;
- include versioning for generated data;
- document nullable fields.

---

## 20. File and Directory Changes

List planned file changes before implementation.

Recommended table:

| Path | Action | Purpose |
|---|---|---|
| `src/world/coordinates.ts` | Create | World/screen transforms |
| `src/world/viewport.ts` | Create | Pan/zoom state |
| `tests/unit/coordinates.test.ts` | Create | Transform tests |
| `src/App.tsx` | Modify | Mount office viewer |

Use:

```text
Create
Modify
Move
Delete
Generate
```

Do not delete files without explaining why.

---

## 21. Implementation Milestones

A milestone must produce a reviewable result.

Each milestone should include:

```text
objective
tasks
files
tests
visual artifact
acceptance criteria
dependencies
status
```

Example:

```markdown
### Milestone 1 — World Coordinate Foundation

Objective:
Create one authoritative transform system for the 8192 × 5460 world.

Tasks:
- Define WorldPoint and ScreenPoint.
- Implement forward and inverse transforms.
- Implement fit-to-view scale.
- Implement pan bounds.
- Add tests.

Acceptance:
- Round-trip transform error is below defined tolerance.
- Resize does not alter stored world coordinates.
- Debug cursor reports correct world coordinates.
```

---

## 22. Detailed Task Breakdown

Tasks must be small enough to verify.

Use stable task IDs.

Example:

```text
T-001 Inspect current renderer.
T-002 Verify master-image dimensions.
T-003 Define coordinate types.
T-004 Implement transform utility.
T-005 Add unit tests.
T-006 Add viewport state.
T-007 Add pan controls.
T-008 Add zoom controls.
T-009 Add reset-view control.
T-010 Generate screenshot artifacts.
```

Task status values:

```text
not_started
in_progress
blocked
done
removed
```

Do not mark a task `done` merely because code was written. It must pass its relevant validation.

---

## 23. Validation Strategy

Validation must describe how correctness will be proven.

Possible validation categories:

```text
schema validation
coordinate validation
geometry validation
visual overlay validation
collision validation
pathfinding validation
access validation
animation validation
responsive validation
performance validation
accessibility validation
production-build validation
```

Every milestone must have at least one validation method.

---

## 24. Test Plan

### 24.1 Unit Tests

Use for:

- coordinate transforms;
- geometry functions;
- access evaluation;
- state transitions;
- reservation logic;
- frame selection;
- schema parsing.

### 24.2 Integration Tests

Use for:

- door access plus collision;
- agent navigation plus door opening;
- position reservation plus arrival;
- meeting access plus yellow doors;
- animation state plus domain state.

### 24.3 End-to-End Tests

Use for complete user and agent workflows.

### 24.4 Regression Tests

Every fixed defect should gain a regression test when practical.

### 24.5 Test Evidence

Record:

```text
command
result
date
relevant output
known skipped tests
```

Do not write only “tests pass.”

---

## 25. Visual Review Plan

Visual systems require visual proof.

The plan must define which artifacts will be generated.

Examples:

```text
artifacts/debug/base-viewer-desktop.png
artifacts/debug/base-viewer-mobile.png
artifacts/debug/rooms.png
artifacts/debug/doors.png
artifacts/debug/all-layers.png
artifacts/animation-previews/main-robot/idle.png
```

Review at:

```text
fit-to-screen
100% world scale where practical
minimum supported zoom
maximum supported zoom
multiple viewport sizes
```

For geometry work, compare overlays directly against the clean master.

---

## 26. Performance Considerations

A plan should identify likely costs.

Consider:

- 8192 × 5460 image memory;
- sprite count;
- offscreen animation;
- polygon count;
- hit-testing complexity;
- pathfinding frequency;
- debug overlay cost;
- large JSON parsing;
- browser device limits.

Define measurable performance targets when the phase affects runtime performance.

Examples:

```text
- Pointer hover remains responsive with all interaction targets loaded.
- Pan and zoom remain visually smooth on the reference development machine.
- Offscreen animations are paused or culled.
- Pathfinding completes within the agreed budget for a normal route.
```

Do not optimize before measuring.

---

## 27. Accessibility Considerations

Plans affecting UI or interaction must cover:

- keyboard access;
- visible focus;
- accessible names;
- non-color status labels;
- reduced motion;
- modal focus management;
- screen-reader-compatible panels;
- error messages;
- alternative list navigation where needed.

World-renderer limitations must be supplemented with accessible HTML controls where practical.

---

## 28. Security and Data Integrity

Consider:

- untrusted JSON;
- malformed geometry;
- ID collisions;
- missing references;
- access-control bypass;
- client-only authorization limitations;
- secrets;
- future backend actions;
- destructive commands.

For real sensitive actions, client-side office access state is not sufficient authorization.

---

## 29. Risks and Mitigations

Use a table.

| Risk ID | Risk | Likelihood | Impact | Mitigation | Trigger |
|---|---|---:|---:|---|---|
| R-01 | Markup and master image do not align | Medium | High | Overlay verification before geometry approval | Global offset detected |
| R-02 | Door-zone mapping is incorrect | Medium | Medium | Preserve review flags and validate visually | Door connects wrong room |
| R-03 | Large image causes memory issues | Medium | Medium | Runtime optimization and staged loading | Browser crashes or stalls |

Use:

```text
Low
Medium
High
Critical
```

for likelihood/impact.

---

## 30. Rollback Strategy

Every substantial plan must explain how to revert safely.

Include:

- files to restore;
- data migrations to reverse;
- feature flags;
- fallback implementation;
- previous known-good state;
- generated files that can be discarded;
- how to avoid corrupting approved geometry.

Prefer reversible additions before destructive replacements.

---

## 31. Decision Log

Use entries like:

```markdown
### D-001 — Use Original-Image World Coordinates

Date:
Decision:
Context:
Alternatives:
Reason:
Consequences:
Affected Files:
```

Update the log during implementation.

Do not rewrite earlier decisions to hide changes. Add a new decision that supersedes the prior one.

---

## 32. Progress Log

The progress log is chronological.

Example:

```markdown
### 2026-07-23

- Completed repository inventory.
- Verified master image is 8192 × 5460.
- Confirmed all markup exports use matching aspect ratio.
- Added initial transform tests.
- Blocked on missing clean PNG filename.
```

Record meaningful progress, not every keystroke.

---

## 33. Unexpected Discoveries

Document facts found during implementation that change the plan.

Examples:

```text
- one markup was exported with a different crop;
- the door image uses mixed orientations;
- a sprite sheet contains transparent padding;
- an existing framework already provides pan and zoom;
- room polygons overlap;
- a supposed computer is decorative.
```

For each discovery, state:

```text
impact
decision
plan change
user review needed
```

---

## 34. Manual Review Items

Keep a dedicated checklist for user review.

Example:

```text
- [ ] Confirm D06 zone mapping.
- [ ] Confirm D11 and D17 are intended permanent red doors.
- [ ] Approve missing-light placement for D45.
- [ ] Approve missing-light placement for D46.
- [ ] Approve elevator floor-display styling.
```

Do not mark these complete without actual review or explicit evidence.

---

## 35. Completion Criteria

Completion criteria must include:

```text
functional criteria
data-integrity criteria
test criteria
visual criteria
performance criteria
documentation criteria
build criteria
manual-review criteria
```

Example:

```text
- Static viewer loads the correct master image.
- The master image is not stretched.
- World/screen conversion passes round-trip tests.
- Pan, zoom, reset, and resize work.
- Debug cursor shows original-image coordinates.
- Production build passes.
- Desktop and mobile screenshots are generated.
- No markup appears in production.
```

---

## 36. Final Report

At plan completion, add:

```markdown
## Final Report

### Delivered
### Files Changed
### Data Generated
### Tests Run
### Test Results
### Build Results
### Visual Artifacts
### Performance Results
### Accessibility Results
### Known Limitations
### Deferred Work
### Manual Review Remaining
### Recommended Next Plan
```

The final report must be factual.

Do not claim testing that was not performed.

---

# Project Master Execution Sequence

The following plans define the recommended project order.

---

## 37. Plan 000 — Repository Audit and Architecture Recommendation

### Goal

Inspect the new repository, verify source assets, identify missing dependencies, select an architecture, define data schemas, and prepare the implementation sequence without building the complete office.

### Required Work

- read all documentation;
- inventory repository;
- verify master image dimensions;
- verify markup dimensions and alignment;
- inspect sprite assets;
- identify missing files;
- inspect package configuration;
- inspect existing code;
- compare rendering approaches;
- compare pathfinding approaches;
- compare state-management approaches;
- compare animation approaches;
- define recommended architecture;
- define initial schemas;
- define review checkpoints.

### Deliverables

```text
.agent/plans/000-repository-audit.md
docs/decisions/000-architecture.md
artifacts/debug/asset-inventory.json
artifacts/debug/alignment-report.md
```

### Gate

No major implementation until the audit plan is approved.

---

## 38. Plan 010 — Static Office Viewer

### Goal

Render the clean 8192 × 5460 office image correctly with pan, zoom, resize, reset view, and tested world/screen transforms.

### Scope

- master image loader;
- responsive viewport;
- fit-to-view;
- pan;
- zoom;
- reset;
- coordinate readout;
- transform tests;
- image-load error state.

### Out of Scope

- geometry;
- agents;
- collision;
- doors;
- animation;
- interactions.

### Required Acceptance

- no stretching;
- no cropping unless intentionally inside viewport clipping;
- correct fit-to-view;
- stable coordinates;
- correct inverse transform;
- screenshots at multiple viewports;
- production build passes.

---

## 39. Plan 020 — Geometry Extraction and Structured Layout

### Goal

Convert all markup meaning into validated structured world geometry.

### Required Data

```text
rooms
zones
walkable polygons
wall colliders
object colliders
doors
door thresholds
computer anchors
position anchors
interactive-object bounds
light anchors
```

### Requirements

- preserve original coordinates;
- record source and confidence;
- preserve manual-review flags;
- validate polygons;
- validate IDs;
- avoid hidden transforms;
- generate structured JSON.

### Gate

Do not begin pathfinding until visual geometry review passes.

---

## 40. Plan 030 — Debug Overlay and Inspector System

### Goal

Provide a complete development visualization system for all extracted geometry and state.

### Required Toggles

```text
rooms
walkable
walls
objects
doors
thresholds
lights
computers
positions
interactive objects
coordinates
all layers
```

### Required Inspector

Show:

```text
ID
type
room
bounds
anchor
state
access
source
confidence
manual review
```

### Gate

User can visually inspect all geometry over the clean image.

---

## 41. Plan 040 — One-Agent Navigation Prototype

### Goal

Move one placeholder agent through the office while respecting walkable areas, walls, objects, and door thresholds.

### Required Work

- agent base anchor;
- collision radius;
- pathfinding;
- destination selection;
- path rendering;
- arrival detection;
- failed-path handling;
- cancellation;
- door-threshold awareness.

### Out of Scope

- final sprites;
- full roster;
- meetings;
- persistent task system.

### Gate

Agent reaches representative rooms without crossing collision.

---

## 42. Plan 050 — Door and Access System

### Goal

Implement D01 through D47 as stateful, access-controlled, animated navigation barriers.

### Required Access Modes

```text
open
blocked
restricted
event
elevator
```

### Required Tests

- green allows;
- red denies;
- blue authorized allows;
- blue unauthorized denies;
- yellow participant allows;
- yellow nonparticipant denies;
- light and state synchronize;
- collision clears only while open;
- obstruction prevents closing;
- D47 behaves as elevator.

### Required Review

Manual-review rows in `docs/DOOR_ACCESS.csv`.

---

## 43. Plan 060 — Agent Position and Workstation Assignment

### Goal

Implement standard and priority positions, reservation, occupancy, pose, facing, and associated workstation assignment.

### Required Rules

- yellow position = priority;
- red position = standard;
- pose comes from furniture;
- reservation is atomic;
- failed path releases reservation;
- double occupancy prohibited;
- unauthorized standard agents cannot claim yellow positions.

### Required Tests

- priority access;
- standard access;
- reservation conflicts;
- timeout;
- release;
- room-access interaction.

---

## 44. Plan 070 — Computers and Major Interactive Objects

### Goal

Make marked computers, robot tubes, map, elevator, stairs, rooms, conference areas, and sandbox areas selectable and functional according to `docs/INTERACTIONS.md`.

### Required Panels

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

### Gate

Every marked interactive target resolves to a stable ID and safe behavior.

---

## 45. Plan 080 — Animation System

### Goal

Implement a generic metadata-driven animation renderer.

### Required Work

- schema;
- loader;
- validator;
- sprite player;
- frame timing;
- loop modes;
- anchors;
- world attachment;
- z-layers;
- occlusion;
- reduced motion;
- debugger;
- fallbacks.

### Required Initial Assets

```text
one standard agent set
main robot idle
small robot idle
door animation
four door-light colors
missing-light overlay
elevator display
computer idle
selection effect
```

### Gate

No renderer guesses frame metadata.

---

## 46. Plan 090 — Roster, Meetings, Sandboxes, and Persistence

### Goal

Connect agents, access groups, positions, meetings, yellow-door context, sandbox sessions, and persistent assignments.

### Required Data

```text
agent roster
rank
department
access groups
assigned room
assigned position
meeting participants
sandbox participants
temporary authorization
```

### Required Safety

- validate all input;
- preserve IDs;
- fail closed for missing restricted access;
- avoid duplicate reservations;
- avoid stale access after meetings end.

---

## 47. Plan 100 — Final Validation and Production Readiness

### Goal

Validate the full office foundation across geometry, navigation, access, interaction, animation, performance, accessibility, and production build.

### Required Reports

```text
geometry-validation.json
reachability-report.json
door-validation.json
position-validation.json
animation-validation.json
performance-report.md
accessibility-report.md
production-readiness.md
```

### Final Gate

Do not call production-ready until required reports and builds pass.

---

# Plan Quality Rules

## 48. Plans Must Be Self-Contained

A reviewer should understand:

- what is being built;
- why;
- where;
- how;
- what could go wrong;
- how it will be tested;
- how completion is judged;

without reconstructing the plan from chat history.

Links to source documents are useful, but the plan must summarize relevant constraints.

---

## 49. Plans Must Remain Current

Update the plan when:

- scope changes;
- architecture changes;
- a risk becomes real;
- new unknowns appear;
- a milestone completes;
- tests fail;
- visual review changes geometry;
- a decision is reversed;
- work is blocked.

An outdated plan is not acceptable merely because implementation is progressing.

---

## 50. Plans Must Distinguish Fact, Inference, and Decision

Use clear labels:

```text
Confirmed
Inferred
Proposed
Decided
Unresolved
```

Example:

```text
Confirmed:
The master image is 8192 × 5460.

Inferred:
D06 appears to connect Sandbox 2 to the RM2 circulation zone.

Proposed:
Use a polygonal navigation mesh.

Decided:
TBD pending architecture review.
```

---

## 51. Plans Must Avoid False Precision

Do not invent:

- exact coordinates;
- exact frame sizes;
- exact durations;
- exact performance claims;
- exact file names not present;
- exact door connections when marked uncertain.

Use `TBD`, confidence fields, and manual-review flags.

---

## 52. Plans Must Avoid Unbounded Scope

A plan should not say:

```text
Implement all future integrations.
```

Instead:

```text
Define interfaces and safe placeholders for future integrations.
```

Every phase needs a stopping point.

---

## 53. Plans Must Include Measurable Evidence

Evidence may include:

- command output;
- tests;
- screenshots;
- JSON validation;
- performance measurements;
- visual overlays;
- review checklists.

Statements such as “looks good” are not sufficient evidence.

---

## 54. Plans Must Preserve User-Controlled Meaning

Codex may optimize implementation, but it may not reinterpret:

- priority dot meaning;
- standard dot meaning;
- door-light meaning;
- D01–D47 identity;
- room labels;
- elevator behavior;
- markup visibility rules;
- master-image dimensions.

Any requested change to these meanings requires explicit user approval and documentation update.

---

# Required Plan Template

## 55. Copyable Plan Template

Use the following template for each plan.

```markdown
# <Plan Title>

Status: draft
Plan ID: <ID>
Owner: TBD
Reviewer: TBD
Created: <YYYY-MM-DD>
Last Updated: <YYYY-MM-DD>
Related Task: TBD
Related Branch: TBD
Related Pull Request: TBD

## Executive Summary

<What this phase creates, why it exists, and what success means.>

## Goal

<Concrete and measurable outcome.>

## Background and Context

<Relevant repository and product context.>

## Current Repository State

- Framework:
- Package manager:
- Build command:
- Test command:
- Lint command:
- Typecheck command:
- Existing relevant files:
- Known failures:
- Uncommitted changes:

## Source-of-Truth Files

| File | Controls |
|---|---|
| `AGENTS.md` | Repository rules |
| `docs/...` | ... |

## Scope

- [ ] ...
- [ ] ...

## Out of Scope

- ...
- ...

## Assumptions

| ID | Assumption | Confidence | Evidence | Impact if wrong |
|---|---|---:|---|---|
| A-001 | | | | |

## Known Unknowns

| ID | Unknown | Blocks phase? | Resolution method | Safe temporary behavior |
|---|---|---:|---|---|
| U-001 | | | | |

## Questions Requiring User Decision

### Q-001 — <Question>

Options:
1. ...
2. ...

Recommendation:
...

Impact:
...

Can work continue without answer:
...

## Architecture Decision

### Selected Approach

...

### Why It Fits

...

## Alternatives Considered

### Alternative 1

Advantages:
- ...

Disadvantages:
- ...

Decision:
...

## Data Model

...

## File and Directory Changes

| Path | Action | Purpose |
|---|---|---|
| | | |

## Implementation Milestones

### Milestone 1 — <Name>

Status: not_started

Objective:
...

Dependencies:
...

Tasks:
- [ ] T-001 ...
- [ ] T-002 ...

Files:
- ...

Tests:
- ...

Visual artifacts:
- ...

Acceptance criteria:
- [ ] ...
- [ ] ...

## Detailed Task Breakdown

| Task ID | Task | Status | Dependency | Evidence |
|---|---|---|---|---|
| T-001 | | not_started | | |

## Validation Strategy

...

## Test Plan

### Unit
- ...

### Integration
- ...

### End-to-End
- ...

### Regression
- ...

## Visual Review Plan

- ...

## Performance Considerations

- ...

## Accessibility Considerations

- ...

## Security and Data Integrity

- ...

## Risks and Mitigations

| Risk ID | Risk | Likelihood | Impact | Mitigation | Trigger |
|---|---|---:|---:|---|---|
| R-001 | | | | | |

## Rollback Strategy

...

## Decision Log

### D-001 — <Decision>

Date:
Decision:
Context:
Alternatives:
Reason:
Consequences:
Affected Files:

## Progress Log

### <YYYY-MM-DD>

- ...

## Unexpected Discoveries

### X-001 — <Discovery>

Date:
Discovery:
Impact:
Decision:
Plan change:
User review needed:

## Manual Review Items

- [ ] ...

## Completion Criteria

### Functional
- [ ] ...

### Data Integrity
- [ ] ...

### Tests
- [ ] ...

### Visual
- [ ] ...

### Performance
- [ ] ...

### Accessibility
- [ ] ...

### Documentation
- [ ] ...

### Build
- [ ] ...

## Final Report

### Delivered

### Files Changed

### Data Generated

### Tests Run

### Test Results

### Build Results

### Visual Artifacts

### Performance Results

### Accessibility Results

### Known Limitations

### Deferred Work

### Manual Review Remaining

### Recommended Next Plan
```

---

# First Plan Requirements

## 56. Required First Plan

The first plan created in the new repository must be:

```text
.agent/plans/000-repository-audit.md
```

It must not implement the complete office.

It must:

1. inspect all repository files;
2. confirm the clean master file;
3. confirm 8192 × 5460 dimensions;
4. inventory markups;
5. inspect documentation;
6. inspect sprite assets;
7. verify alignment;
8. identify missing requirements;
9. identify contradictions;
10. identify uncertain door mappings;
11. compare architecture choices;
12. recommend one architecture;
13. define initial schemas;
14. define implementation phases;
15. define review gates;
16. stop before broad implementation.

---

## 57. First Plan Required Architecture Comparison

The first plan must compare at least:

### Rendering

```text
Canvas 2D
WebGL renderer
PixiJS or equivalent
DOM/SVG hybrid
```

### Navigation

```text
grid-based A*
navigation mesh
visibility graph
hybrid method
```

### Geometry Storage

```text
JSON polygons
binary geometry
mask-based collision
hybrid polygons and masks
```

### State Management

```text
framework-local state
central store
event-driven simulation store
state machine
hybrid
```

### Animation

```text
generic sprite player
framework animation components
renderer-native animation system
```

The plan must recommend one combination and explain why.

---

## 58. First Plan Required Verification

Before recommending architecture, verify:

```text
master image file name
master image dimensions
markup file names
markup dimensions
sprite file names
sprite dimensions
whether assets have alpha
whether source documents exist
whether current code already exists
whether build commands run
whether tests exist
```

Do not assume these facts from documentation alone when the repository can be inspected.

---

# Plan Review Rules

## 59. Review Checklist

A plan is ready for approval only when:

- scope is bounded;
- out-of-scope is explicit;
- assumptions are visible;
- unknowns are visible;
- user questions are limited to material decisions;
- architecture is justified;
- milestones are independently reviewable;
- acceptance criteria are measurable;
- test commands are identified;
- visual artifacts are identified;
- rollback is possible;
- risks are addressed;
- completion reporting is defined.

---

## 60. Blocking Conditions

Mark the plan blocked when:

- required master image is absent;
- required coordinate dimensions conflict;
- markup alignment cannot be verified;
- access meanings conflict;
- critical door IDs are missing;
- architecture cannot satisfy core requirements;
- existing repository state is unsafe to modify;
- required user decision changes fundamental behavior.

A blocked plan should still identify safe work that can continue.

---

## 61. Superseding a Plan

When replacing a plan:

1. mark old plan `superseded`;
2. identify replacement plan;
3. preserve old decision history;
4. explain why replacement was needed;
5. migrate unfinished tasks;
6. do not delete the old plan.

---

## 62. Final Rule

The execution plan is part of the implementation.

A phase is not complete merely because code exists.

It is complete when:

```text
the planned scope is delivered,
the stated evidence exists,
the required tests pass,
the visual review is complete,
the data remains valid,
the build passes,
the plan reflects reality,
and remaining limitations are reported honestly.
```
