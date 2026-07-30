# Floor 1 Candidate Multi-Agent Navigation

Status: draft
Plan ID: 090
Owner: Arena agent
Reviewer: TBD
Created: 2026-07-29
Last Updated: 2026-07-29
Related Task: Floor 1 candidate multi-agent navigation, validated movement, and sprite integration
Related Branch: arena/019fadd5-jarvis-office-prototype
Related Pull Request: TBD

## Executive Summary

Build a development-only Floor 1 candidate review simulation behind `?floor1Review=candidate`. The phase adds deterministic provisional review agents rendered with the validated generated sprite sheets, a fail-closed candidate navigation domain, route preview/movement controls, debug overlays, focused animation runtime corrections, tests, and bundle-exclusion checks. Floor 1 remains candidate-only and unapproved.

## Goal

Allow reviewers to select one of approximately 36–42 candidate agents placed on existing candidate position anchors, choose a safe candidate destination, validate an access-aware route, preview it, and move the agent along it without changing approved or production Floor 1 data.

## Background and Context

Confirmed:
- Remote state was fetched before planning.
- The working branch is `arena/019fadd5-jarvis-office-prototype` and starts at `345d61cfe3dea77cf1ef74e1e6d92e07264c9517`, the PR #21 merge commit.
- PR #19 added Floor 1 candidate review mode and explicitly left production approval out of scope.
- PR #21 added the deterministic sprite inventory/generation/runtime and left permanent role-to-sprite assignments out of scope.
- Candidate Floor 1 data is unapproved and must remain outside production semantics.

Inferred:
- Candidate coordinate values are already the existing candidate transform/registration output consumed by current Floor 1 review mode.
- The existing provisional `navigation.json` contains no reviewed cells/routes, so this phase needs a bounded candidate-only graph from walk paths, doors, positions, rooms, computers, and colliders.

Decided:
- Navigation and fixtures will be development-only modules loaded only in candidate review mode through compile-time `import.meta.env.DEV` boundaries.
- Routes validate against static world collisions and door/access data; dynamic agent-to-agent avoidance is documented as out of scope.

Unresolved:
- Human-reviewed route approval remains future work. This plan must not create a real approval artifact.

## Current Repository State

- Framework: React 19 + Vite.
- Package manager: npm with `package-lock.json`.
- Build command: `npm run build` / `npm run build-nolog`.
- Test command: `npm test`.
- Lint command: `npm run lint`.
- Typecheck command: `npm run typecheck` / `npx tsc --noEmit`.
- Existing relevant files: `src/components/office/*`, `src/office/floor1/*`, `src/office/sprites/*`, `src/office/data/floor1/provisional/*.json`, `docs/DOOR_ACCESS.csv`.
- Known failures: none observed before implementation; validation pending.
- Uncommitted changes: this plan.

## Source-of-Truth Files

| File | Controls |
|---|---|
| `AGENTS.md` | Repository rules, source/world coordinates, candidate/approval boundaries |
| `docs/AI_HUB_MARKUP_LEGEND.md` | Markup meanings, coordinate rules, room/door/position semantics |
| `docs/DOOR_ACCESS.csv` | Authoritative D01–D47 access modes and safe behavior |
| `docs/INTERACTIONS.md` | Interaction and accessibility behavior |
| `docs/ANIMATION_MANIFEST.md` | Animation states and runtime requirements |
| `docs/AGENT_SPRITE_PIPELINE.md` | Generated sprite constraints, blocked Nexus/reference-only assets |
| `.agent/PLANS.md` | Plan structure/status requirements |
| `.agent/plans/000-repository-audit.md` | Floor 1 pipeline plan from PR #19 |
| `.agent/plans/080-agent-sprite-animation-pipeline.md` | Sprite pipeline plan from PR #21 |

## Scope

- [ ] Fix animation clip-origin, inactive-time, and non-looping yoyo behavior.
- [ ] Add deterministic provisional candidate agent fixtures from existing candidate positions.
- [ ] Add candidate-only navigation graph, route validation, and route outcomes.
- [ ] Integrate candidate sprites into the office coordinate system.
- [ ] Add selection, destination, preview, movement, pause/resume/cancel, inspector/status updates.
- [ ] Add independently toggled candidate route/collision debug overlays.
- [ ] Expand tests and production-bundle exclusion checks.

## Out of Scope

- Production Floor 1 approval or promotion.
- Creating `src/office/data/floor1/production/`.
- Editing source PNGs or markup PDFs.
- Permanent job/role-to-sprite assignments.
- Nexus sprite generation or fabricated metadata.
- Dynamic agent-to-agent collision avoidance.

## Assumptions

| ID | Assumption | Confidence | Evidence | Impact if wrong |
|---|---|---:|---|---|
| A-001 | Candidate position anchors are usable review anchors after existing candidate transform. | Medium | PR #19 review mode renders these entities. | Agents may need filtering/validation to fail closed. |
| A-002 | Door `csvAccessMode` in provisional doors mirrors `docs/DOOR_ACCESS.csv`. | High | PR #19 reconciliation and document fields. | Route outcomes must fail closed on mismatch/missing metadata. |
| A-003 | A grid/waypoint graph over walk-path records is acceptable for candidate review evidence. | Medium | Current provisional `navigation.json` has no approved cells. | Future human approval may replace graph. |

## Known Unknowns

| ID | Unknown | Blocks phase? | Resolution method | Safe temporary behavior |
|---|---|---:|---|---|
| U-001 | Exact human-approved navigation cells. | No | Future approval workflow. | Label routes as candidate evidence only. |
| U-002 | Permanent sprite-role mapping. | No | Future authored data. | Use provisional fixture mapping only. |
| U-003 | Dynamic agent avoidance. | No | Future simulation plan. | Document static-collision-only validation. |

## Questions Requiring User Decision

None blocking. Human merge reviewers should later decide whether candidate route evidence is sufficient for approval workflow expansion.

## Architecture Decision

### Selected Approach

Use development-only React controls and sprite layer integration over the existing DOM/SVG office viewport. Build a deterministic candidate route graph from candidate world/source pixels: positions, computers, interactive anchors, room centers, door centers, and sampled walk-path vertices. Validate routes with geometry predicates, door access outcomes, finite/bounds checks, work limits, and deterministic A* tie-breaking.

### Why It Fits

It preserves the current renderer, coordinate transforms, layers, accessibility behavior, and candidate-only boundary. It avoids production data changes and can be bundle-isolated with existing Vite DEV guards.

## Alternatives Considered

### Navigation mesh

Advantages:
- Better geometric optimality.

Disadvantages:
- Requires human-approved polygons/cells not present in candidate data.

Decision:
- Defer until approval-grade navigation cells exist.

### Pure grid pathfinding

Advantages:
- Simple and deterministic.

Disadvantages:
- Higher node count and more risk of invented walkable geometry.

Decision:
- Use sampled candidate waypoints and explicit validation instead.

### Sprite-per-agent clocks

Advantages:
- Simple component isolation.

Disadvantages:
- Violates one-clock-per-surface performance requirement.

Decision:
- Use shared `SpriteSurfaceRuntime` per mounted candidate surface.

## Data Model

Candidate-only types: `CandidateAgentFixture`, `CandidateNavigationGraph`, `CandidateDestination`, `CandidateRouteResult`, `CandidateMovementState`, `CandidateRouteDebugOptions`. Each stores world/source pixel coordinates, stable IDs, candidate-only status labels, bounded route diagnostics, and provisional sprite asset IDs.

## File and Directory Changes

| Path | Action | Purpose |
|---|---|---|
| `.agent/plans/090-floor1-candidate-multi-agent-navigation.md` | create/update | Execution plan |
| `src/office/floor1/navigation/*` | create | Candidate graph, fixtures, routes, movement helpers, tests |
| `src/components/office/Floor1CandidateSimulation.tsx` | create | Candidate-only simulation UI/layer |
| `src/components/office/floor1-candidate-simulation.css` | create | Dev-only route/debug CSS |
| `src/components/office/SpritePlayer.tsx` | modify | Animation-origin/pause fixes |
| `src/office/sprites/*` | modify/tests | Runtime/yoyo fixes |
| `scripts/check-production-bundle.mjs` | modify | Expand candidate route exclusion markers |

## Implementation Milestones

### Milestone 1 — Animation corrections

Status: not_started

Objective:
Fix per-clip origin, inactive-time exclusion, pause/resume continuity, and yoyo sequences.

Dependencies:
- Existing sprite runtime and tests.

Tasks:
- [ ] T-001 Add frame-sequence helper and yoyo tests.
- [ ] T-002 Change clock elapsed to active elapsed only.
- [ ] T-003 Add SpritePlayer playback-origin reset and pause continuity.

Files:
- `src/office/sprites/runtime.ts`
- `src/office/sprites/resolver.ts`
- `src/components/office/SpritePlayer.tsx`

Tests:
- `src/office/sprites/runtime.test.ts`
- `src/office/sprites/resolver.test.ts`
- `src/components/office/SpritePlayer.test.tsx`

Visual artifacts:
- Browser evidence for sprite playback/reduced motion.

Acceptance criteria:
- [ ] New loop starts at first frame.
- [ ] Inactive wall-clock time is not counted.
- [ ] Non-looping yoyo ends at initial frame.

### Milestone 2 — Candidate graph and routes

Status: not_started

Objective:
Create a fail-closed deterministic route graph and validation matrix.

Dependencies:
- Candidate data files only.

Tasks:
- [ ] T-010 Build candidate graph from existing candidate records.
- [ ] T-011 Validate start/destination/collisions/doors/access/bounds/work limits.
- [ ] T-012 Add route and movement unit tests.

Files:
- `src/office/floor1/navigation/*`

Tests:
- candidate route matrix tests.

Visual artifacts:
- Debug overlays and browser route screenshots.

Acceptance criteria:
- [ ] Required route outcomes are covered by tests.
- [ ] Blocked/restricted/malformed routes do not animate.

### Milestone 3 — Candidate UI and sprites

Status: not_started

Objective:
Render 36–42 candidate agents with selected route controls and movement.

Dependencies:
- Milestones 1 and 2.

Tasks:
- [ ] T-020 Add deterministic fixture generation outside components.
- [ ] T-021 Add candidate layer with shared sprite runtime.
- [ ] T-022 Add accessible controls, status announcements, and debug toggles.

Files:
- `src/components/office/Floor1CandidateSimulation.tsx`
- `src/components/office/OfficeViewport.tsx`
- `src/components/office/OfficeEngine.tsx`

Tests:
- selection, inspector/status, movement, pause/resume, cancellation, concurrent agents, no sample mixing.

Acceptance criteria:
- [ ] 36–42 agents render in candidate mode only.
- [ ] Production bundle excludes fixtures/controls/debug strings.

## Detailed Task Breakdown

| Task ID | Task | Status | Dependency | Evidence |
|---|---|---|---|---|
| T-001 | Add yoyo sequence helper/tests | not_started | none | Vitest |
| T-002 | Active-time animation clock | not_started | none | Vitest |
| T-003 | Per-clip playback origin in SpritePlayer | not_started | T-001/T-002 | Vitest |
| T-010 | Candidate fixtures | not_started | none | Vitest |
| T-011 | Candidate graph/pathfinding | not_started | T-010 | Vitest |
| T-012 | Route validation matrix | not_started | T-011 | Vitest |
| T-020 | Candidate simulation layer | not_started | T-010/T-011 | RTL/browser |
| T-021 | Debug controls | not_started | T-020 | RTL/browser |
| T-022 | Bundle exclusion | not_started | T-020 | production bundle check |

## Validation Strategy

Run generation, drift, lint, strict typecheck, full Vitest, production build, production bundle check, source-drift checks, and focused browser QA. Do not claim any command passed unless it ran successfully.

## Test Plan

### Unit
- Animation origin, inactive time, yoyo sequences.
- Graph construction, deterministic pathfinding, access denial, collision/bounds/malformed data.
- Movement interpolation, reduced motion, cleanup, one-clock/concurrent agents.

### Integration
- Candidate data loading, agent initialization, selection/status, route preview, movement, arrival, pause/resume/cancel, blocked route, view switching, pan/zoom, layer toggles, no sample mixing.

### End-to-End
- Real-browser QA for desktop/laptop, normal mode, candidate mode, production build, reduced motion, keyboard operation, multiple agents, blocked and allowed routes, view switching, pan/zoom during movement.

### Regression
- Production bundle exclusion and no creation of production Floor 1 artifacts.

## Visual Review Plan

Capture focused browser evidence under the established artifact structure without generating production approval artifacts.

## Performance Considerations

Use one shared sprite runtime per mounted candidate surface, static agents avoid unnecessary subscriptions, completed one-shots unsubscribe, route search has explicit node/work limits, and animation movement updates DOM/CSS transforms without unbounded React rerender loops where practical.

## Accessibility Considerations

Keyboard-selectable agents and destinations, visible focus, route status text/announcements, non-color-only statuses, meaningful labels, and reduced-motion behavior.

## Security and Data Integrity

All candidate data remains development-only and fail-closed. No source PNGs/PDFs, approved data, approval artifact, or production directory are changed. Missing door metadata/access fails closed.

## Risks and Mitigations

| Risk ID | Risk | Likelihood | Impact | Mitigation | Trigger |
|---|---|---:|---:|---|---|
| R-090-01 | Candidate graph implies approval | Medium | High | labels and metadata say candidate-only; no approval artifact | PR review |
| R-090-02 | Bundle leakage | Medium | High | compile-time DEV boundaries plus check markers | production-bundle check |
| R-090-03 | Route graph disconnected due provisional data | Medium | Medium | safe failure reasons and curated test destinations | route tests |
| R-090-04 | Animation rerender/performance regressions | Medium | Medium | shared clock and DOM frame updates | runtime tests/browser QA |

## Rollback Strategy

Revert the plan, candidate navigation modules, candidate simulation components/CSS/tests, SpritePlayer/runtime/resolver changes, and production-bundle marker additions. No production Floor 1 data should exist to remove.

## Decision Log

### D-090-01 — Candidate-only waypoint graph

Date: 2026-07-29
Decision: Use a bounded deterministic waypoint graph over existing candidate source-coordinate records.
Context: No approved navigation cells exist in provisional navigation data.
Alternatives: full navmesh or production-style approved cells.
Reason: Preserves candidate boundary and fails closed.
Consequences: Evidence supports review but is not approval.
Affected Files: `src/office/floor1/navigation/*`.

### D-090-02 — Static collision only

Date: 2026-07-29
Decision: Validate against static world collisions and document no dynamic agent avoidance.
Context: User allowed out-of-scope if documented.
Alternatives: dynamic reservations and avoidance.
Reason: Avoids pretending unimplemented behavior exists.
Consequences: Concurrent agents may visually pass near each other; static blockers still apply.
Affected Files: simulation docs/UI/tests.

## Progress Log

### 2026-07-29

- Fetched remote state before planning.
- Confirmed branch `arena/019fadd5-jarvis-office-prototype` at starting SHA `345d61cfe3dea77cf1ef74e1e6d92e07264c9517`.
- Read required repository instructions, markup/access/interaction/animation/sprite docs, PR #19/#21 summaries and plans, and inspected relevant candidate data/runtime/render/sprite/test files.
- Created this execution plan before implementation.

## Unexpected Discoveries

None yet.

## Manual Review Items

- [ ] Human route evidence review before any future approval.
- [ ] Permanent sprite-role assignments.
- [ ] Dynamic agent avoidance scope decision.

## Completion Criteria

### Functional
- [ ] Candidate agents render/move with selected validated routes.

### Data Integrity
- [ ] No production data, approval artifact, source PNG, or markup PDF changed.

### Tests
- [ ] Required unit/integration tests pass.

### Visual
- [ ] Browser evidence captured.

### Performance
- [ ] Route and animation bounds measured.

### Accessibility
- [ ] Keyboard/reduced-motion/status behavior verified.

### Documentation
- [ ] PR and plan document limitations.

### Build
- [ ] Generation, drift, lint, typecheck, tests, build, bundle check, and diff check pass.

## Final Report

### Delivered

TBD.

### Files Changed

TBD.

### Data Generated

TBD.

### Tests Run

TBD.

### Test Results

TBD.

### Build Results

TBD.

### Visual Artifacts

TBD.

### Performance Results

TBD.

### Accessibility Results

TBD.

### Known Limitations

Dynamic agent-to-agent avoidance is out of scope unless later implemented.

### Deferred Work

Production approval/promotion, permanent role mapping, Nexus sprites, approval-grade navigation cells.

### Manual Review Remaining

Floor 1 remains unapproved.

### Recommended Next Plan

Human navigation review and approval workflow expansion after this candidate evidence phase.

## Implementation Update — 2026-07-29

Status: implemented-local-validation

Confirmed:
- Candidate simulation was implemented behind the existing development-only `?floor1Review=candidate` path.
- It creates 40 deterministic provisional review agents from existing candidate positions and labels sprite assignments as provisional review fixtures.
- It adds candidate route graph/validation helpers, route preview/movement controls, pause/resume/cancel controls, and independent route/door/collider overlay toggles.
- Routes validate static candidate collisions, finite/bounded coordinates, destination resolution, D01–D47 door metadata, access modes, manual-review doors, node/route limits, and deterministic reruns.
- Dynamic agent-to-agent avoidance remains out of scope and is disclosed in the UI.
- The production bundle check now rejects candidate navigation controls/fixtures/debug markers.
- Floor 1 remains unapproved; no approval artifact or production dataset was created.

Evidence:
- `npm ci` passed.
- `npm run generate:floor1` passed: 65 generated files / 11,568,585 bytes.
- `npm run check:floor1-generated` passed.
- `npm run inventory:sprites` passed: 18 sources, 16 production candidates, 1 reference-only, 1 blocked.
- `npm run generate:sprites` passed.
- `npm run check:sprites-generated` passed.
- `npm run typecheck` passed.
- `npx tsc --noEmit` passed.
- `npm run lint` and `npx eslint src` passed.
- `npm test -- --run` passed: 36 files, 347 tests.
- `npm run build` passed.
- `npm run check:production-bundle` passed and reported candidate navigation markers excluded.
- `git diff --check` passed.
- Verified no source PNG/PDF changed, no `src/office/data/floor1/production/` exists, and no approval artifact was found.

Limitations:
- Browser QA evidence has not been captured in this environment yet.
- The candidate route graph is review evidence only and is not approval-grade navigation.
- React state is used for bounded movement snapshots; future performance work can move interpolation fully to refs/CSS transforms if review finds render frequency too high.

## Codex Review Fix Update — 2026-07-29

Status: codex-findings-fixed-local-validation

Confirmed:
- Fetched remote state first and continued on PR #22 branch at reviewed head `292734e585176b0a7e206a2a523e89df8346b3c4`.
- Fixed all five Codex findings from reviewed head:
  1. Door-adjacent collision bypass removed; object collisions are never exempted and wall intersections are allowed only inside bounded crossed-door apertures.
  2. Route previews now bind `agentId`, `destinationId`, start point, and agent revision; stale previews cannot start movement.
  3. Movement RAF loop only runs while at least one agent is walking.
  4. Movement progress uses actual RAF timestamp deltas in normal and reduced-motion modes.
  5. Multi-path ink collision records preserve every path with stable `kind:record:path:index` IDs.
- Added walk-path-derived nodes from provisional `walk-paths.json` to the candidate graph and route connectors.
- Door access is applied during graph traversal so blocked/restricted/reserved/manual-review doors are skipped while alternate allowed routes remain searchable.
- Destination controls now expose rooms, computers, interactive objects, all positions, standard positions, and priority positions through category and search controls.
- Individual sprite pause/resume now resets per-player playback origin while retaining accumulated clip elapsed.

Evidence:
- Focused navigation review tests cover agent-04 to computers 022–025 collision rejection, objects-053/054 collision detection, multi-path preservation, alternate allowed door routes, and movement timing.
- Component tests cover idle RAF suppression, destination category accessibility, and preview invalidation on agent/destination/cancel changes.
- Sprite tests cover individual paused-player timing while a shared clock may continue advancing.
- Full local validation before commit passed: generation/drift, typecheck, strict tsc, lint, strict eslint, 38-file/360-test suite, production build, production-bundle exclusion, and diff check.

Browser QA:
- Real-browser QA could not be captured in this sandbox because no Chromium/Chrome/Playwright/Puppeteer browser executable is installed. This remains a manual PR review item and is not reported as passed.

## Fresh Codex Review Fix Update — 2026-07-29

Status: fresh-codex-findings-fixed-local-tests

Confirmed:
- Fresh Codex review on `25e525bd9d576b1f111c938323d58b3f7cd2b866` produced four additional valid findings.
- Fixed open ink path handling so sampled ink strokes are not artificially filled unless endpoints close within tolerance.
- Added positive walk-path support validation so route segments must remain supported by candidate walk-path geometry except bounded start/destination connectors and doorway apertures.
- Replaced wall-edge midpoint aperture checks with actual route/wall contact points.
- Portaled candidate navigation controls to the viewport-level `.office-viewport` so pan/zoom transforms affect only world agents/debug geometry, not the review controls.

Evidence:
- Added regressions for open ink preservation, walkable-geometry rejection, actual doorway contact points, and viewport-level controls portal.
- `npm run typecheck`, `npm run lint`, and full `npm test -- --run` passed locally after these changes: 38 files / 364 tests.

## Current Merge Blocker Fix Plan Update — 2026-07-29

Status: current-codex-findings-implemented-local-focused-validation

Confirmed defects from latest Codex review on `a899a40e158aa8df72e8644bea04ce034e579573`:
1. Connector segments could bypass positive walk support through the first/last connector exemption.
2. Overlapping zone membership was collapsed to one room ID, including real `POSITION_117` (`ROOM_CENTRAL_NEXUS` plus `ROOM_MAIN_CONNECTING_WALKWAY`).
3. Route collision checks used centerlines only and did not account for an agent floor footprint.
4. Portaled controls retained world-scale dimensions and typography.

Selected implementation:
- Segment validation now distinguishes `start_connector`, `walk_network`, `doorway_transition`, and `destination_connector`.
- Connector maximum distance is `420` world pixels; endpoint ingress/egress tolerance is `180` world pixels; walk support sampling interval is `96` world pixels; walk support tolerance remains `260` world pixels against candidate walk segments/nodes.
- Collisions take precedence over positive-walk support.
- Graph topology now stores deterministic multi-membership `roomIds` for agents, destinations, and walk nodes; overlap transitions are local to points/nodes carrying multiple memberships and do not create broad room merges.
- Candidate agent footprint is a conservative floor-plane circle with radius `34` world pixels around the base point. Collision checks expand wall/object strokes by this radius and reject start/destination footprint overlap.
- Door usable aperture requires `door.apertureRadius > AGENT_FOOTPRINT_RADIUS`, and aperture checks use the actual wall contact point after subtracting footprint clearance.
- Portaled controls now use screen-space responsive CSS: `width: clamp(320px, 34vw, 480px)`, `max-width: calc(100vw - 24px)`, `max-height: calc(100vh - 24px)`, internal scrolling, compact breakpoints at 900px and 520px, and normal 1rem-scale typography.

Test matrix added/updated:
- Unsupported two-point route, unsupported start connector, unsupported destination connector, valid bounded connector, connector collider conflict.
- Real `POSITION_117` membership includes both Central Nexus and Main Connecting Walkway; route to walkway-associated position avoids `D38`.
- Fixture overlap chooses allowed `D10` instead of restricted `D38`.
- Agent footprint blocks near-object and near-wall centerline misses, start/destination footprint overlaps, and too-narrow doorway apertures.
- Responsive CSS test verifies viewport-scale controls and rejects old world-scale dimensions.

Browser QA matrix:
- Real-browser checks remain required for desktop/laptop/compact panel visibility, pan/zoom independence, internal scrolling, `POSITION_117` routing, connector rejection, footprint rejection, movement controls, and normal-mode absence. No browser executable is available in this sandbox, so these are not marked passed.

Rollback:
- Revert this plan update plus changes in `candidateNavigation.ts`, candidate navigation tests, `Floor1CandidateSimulation.test.tsx`, `floor1-candidate-simulation.css`, and production-bundle marker updates. No production data or approval artifact is involved.

## Final Review Findings Fix Update — 2026-07-29

Status: final-review-findings-implemented-local-focused-validation

Confirmed latest findings on `cee6563599ae8e9e00e0500a7ec4c58568aaeaef`:
1. Priority position access was not enforced inside the planner because route calls carried only a point/destination ID.
2. The planner stopped after the first access-allowed door chain even if geometry validation rejected that chain.
3. Computer destinations used screen-marker centroids instead of safe approach anchors.

Selected implementation:
- `planCandidateRoute` now accepts a typed request object with `start`, `destinationId`, and required authoritative `agent` context (`id`, `accessTier`). Priority destinations fail closed with `destination_access_restricted` unless the agent context is priority. Missing runtime agent context for priority destinations also fails closed.
- The simulation passes selected-agent context during preview and revalidates by calling the planner again immediately before movement begins.
- Door topology search now deterministically enumerates bounded access-allowed door chains and validates each candidate route until one passes geometry, footprint, connector, walk-support, and aperture checks. It preserves blocked/restricted/manual/malformed door exclusion.
- Computer destinations preserve ID/label/kind and source marker point, but their navigation `point` is now a deterministic same-zone candidate position approach anchor with `approachPositionId` metadata. The marker centroid remains available as `markerPoint` for debug/review identity but is not used as the movement endpoint.
- Agent fixture selection now includes both priority and standard agents while preserving the historical `floor1-review-agent-04` / `POSITION_118` regression identity.

Regression tests:
- Standard agent denied priority destination; priority agent may plan to priority; standard agent may plan to standard; missing context fails closed; deterministic result.
- Alternate door chain fixture where the lexicographically first allowed chain is collision-blocked and the later chain succeeds; all-alternates-blocked remains deterministic.
- Real computers 022–025 retain identities, use approach anchors instead of marker centroids, avoid endpoint collision failure, and remain deterministic.
- Component tests continue to verify stale previews cannot enable movement.

Browser QA:
- Still unavailable in this sandbox because no browser executable/tooling is installed.

## Registration and Clock Restart Fix Update — 2026-07-29

Status: latest-codex-findings-implemented-local-focused-validation

Confirmed latest findings on `530f93db0aa6ac39f0bacf69178b2cf7a437cedd`:
1. PDF/markup geometry was treated as world geometry by candidate navigation.
2. Parallel wall contact fallback used an arbitrary endpoint projection rather than the full finite-segment contact.
3. Shared animation clock restart did not reset per-player sprite playback origins.

Selected implementation:
- Added a typed `MarkupRegistration` boundary, registration validation, uniform `source = markup * scale + offset` point transforms, and markup width transforms. The default repository registration is explicitly unapproved/candidate-unverified; without an approved registration, candidate navigation returns an unavailable graph and the simulation renders only a bounded diagnostic, no agents/routes/colliders/destinations.
- Unit tests use synthetic approved registrations only inside tests to verify transform behavior and preserve navigation regression coverage. No approved production registration was invented.
- Wall contact detection now returns all relevant finite route contact samples for inflated segment/stroke contacts (intersections plus both endpoint projection directions), so parallel/extended contacts must be fully contained in the crossed doorway aperture and cannot be cleared by one arbitrary nearby point.
- `AnimationClock` subscribers now receive `{ elapsedMs, restartGeneration }`; `restart()` increments generation, resets elapsed/timestamp state, notifies subscribers, and avoids duplicate RAF loops. `SpritePlayer` tracks generation and resets playback origin/accumulated clip elapsed on generation changes.

Tests:
- Registration disabled/missing/unverified/review-required/invalid behavior, synthetic approved point and full graph coordinate transforms.
- Candidate simulation no-agent fail-closed rendering without approved registration.
- Existing wall contact, footprint, object, aperture, and door-adjacent collision regressions continue to pass.
- Runtime restart generation and SpritePlayer restart-origin behavior.

Browser QA:
- Still unavailable in this sandbox because no browser executable/tooling is installed.

## Door Runtime, Interactive Approach, and Room Anchor Fix Update — 2026-07-29

Status: latest-door-anchor-findings-implemented-local-focused-validation

Confirmed latest findings on `2802bdab73b84219466faddf789028b8aa5a7471`:
1. Closed permission-eligible doors were still crossed without a candidate opening phase.
2. Interactive-object destinations used visual centroids that can overlap object collision geometry.
3. Concave room destinations used arithmetic vertex means that can fall outside rooms.

Selected implementation:
- Added candidate-only door runtime types and deterministic review timing constants (`CANDIDATE_DOOR_OPEN_MS`, hold, close). Planned routes now populate ordered `doorSteps`; movement helper stops at the approach point with `waiting_for_door` until door runtime reaches `open`. Door state remains separate from immutable authored permission. D47/elevator remains non-general and fails closed unless a runtime is implemented.
- Added shared position-approach anchor resolution and reused it for computer and interactive-object destinations. Interactive destinations preserve `markerPoint` and identity while routing to collision-free, walk-supported candidate position anchors with approach metadata.
- Added deterministic room anchor resolution: rooms prefer safe position anchors, then safe walk nodes inside the target polygon. RM4/RM7 tests prove destination points are inside their polygons and not the old exterior arithmetic center.

Regression tests:
- Door steps populated for automatic doors, movement waits before crossing, door runtime opens/holds/closes deterministically, D47/elevator is not general traversal.
- Main Robot Tube, Small Robot Tube, and Map use approach anchors and preserve visual marker metadata.
- RM4 and RM7 room destinations use valid interior anchors.
