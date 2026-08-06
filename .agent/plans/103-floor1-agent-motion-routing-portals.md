# Floor 1 Agent Motion, Routing, Portals, and Sprite Integrity

Status: in_progress
Plan ID: 103
Owner: Codex
Reviewer: TBD
Created: 2026-08-05
Last Updated: 2026-08-05
Related Task: Floor 1 motion/routing/portal/collision/sprite-integrity refinement
Related Branch: codex/floor1-agent-motion-routing-portals
Related Pull Request: TBD (draft only)

## Executive Summary

Refine the merged PR #26 Floor 1 runtime without replacing its authoritative viewport, candidate graph, Office Engine, Agent Simulation, shared clock, or development trust boundary. The work will make visual facing derive from committed displacement, make ordinary map clicks select a useful reachable endpoint, represent every safe registered-door crossing as a short world-anchored portal transition, quarantine invalid sprite sheets before assignment, and improve collision, spacing, labels, and stall recovery. The final branch must be validated from a clean install, exercised in a real browser, pushed at the exact validated SHA, and published as a draft PR that remains unmerged.

## Goal

At 15-25 agents, agents move and face naturally, ordinary visible floor clicks route to the closest sensible reachable endpoint, visible walking never crosses static door/wall artwork, each agent has one coherent primary sprite, feet footprints do not enter modeled obstacles or settle on one another, labels avoid their owner and nearby labels, and all recoverable failures leave agents visible and reservations released.

## Background and Context

PR #26 merged at `4636773591d42507dcfd16795dd24d8d15098974`. The required ancestor check passed and `origin/main` was exactly that SHA when this branch was created. The attached screenshot reports A21 with apparently detached body fragments. The merged runtime already separates task, movement, activity, animation, workstation state, route reservations, candidate trust warnings, and production exclusion; this plan extends those systems rather than adding a second runtime.

## Current Repository State

- Framework: React 19, TypeScript 5.7, Vite 6, Vitest 4; the PR #26 world runtime is React/SVG/DOM based.
- Package manager: npm with `package-lock.json`.
- Starting main SHA: `4636773591d42507dcfd16795dd24d8d15098974`.
- Required merge ancestor: confirmed by `git merge-base --is-ancestor`.
- Initial worktree: clean on `main`; branch created only after fast-forward.
- Build: `npm run build`.
- Tests: `npm test`.
- Lint/typecheck: `npm run lint`, `npm run typecheck`.
- Generated checks: `npm run check:floor1-generated`, `npm run check:sprites-generated`.
- Production boundary: `npm run check:production-bundle`.
- Baseline clean install: `npm ci` succeeded.
- Baseline validation: typecheck and lint passed; 457 tests in 40 files passed.
- Baseline browser reproduction: at 1920x1080, 25-agent Agent Simulation selected A21; a representative hallway click after “Walk somewhere” returned `No reachable path near clicked location.`
- A21 trace: `prototype-agent-21` -> `agent-sheet-05` -> idle/east -> frame 12 -> 181x181 cell in a 6x8 1086x1448 sheet -> anchor (0.5, 0.94); current inspected DOM contained one primary sprite and one frame layer.
- Repository layout discrepancy: no root `data/` directory exists; runtime Floor 1 data is under `src/office/data/floor1`.
- GitHub CLI exists but its stored token is invalid. Local implementation may continue; draft PR creation is blocked until authentication works.

## Source-of-Truth Files

| File | Controls |
|---|---|
| `AGENTS.md` | Repository, coordinates, gates, validation, and safety |
| `docs/AI_HUB_MARKUP_LEGEND.md` | Markup semantics and coordinate registration |
| `docs/DOOR_ACCESS.csv` | D01-D47 identity and access semantics |
| `docs/INTERACTIONS.md` | Runtime interaction, door, position, and failure behavior |
| `docs/ANIMATION_MANIFEST.md` | Sprite metadata, anchors, playback, and validation |
| `.agent/PLANS.md` | Plan structure and evidence requirements |
| `src/components/office/OfficeViewport.tsx` | Authoritative world/viewport transform |
| `src/components/office/Floor1CandidateSimulation.tsx` | Shared Office Engine/Agent Simulation control and rendering |
| `src/components/office/PrototypeAgentRenderer.tsx` | One-agent world wrapper, sprite, label, and diagnostics |
| `src/components/office/SpritePlayer.tsx` | Frame crop and playback |
| `src/office/floor1/navigation/prototypeRuntime.ts` | Prototype routing, movement, traffic, tasks, reservations |
| `src/office/floor1/navigation/candidateNavigation.ts` | Graph, collision, door, and route primitives |
| `public/assets/office/sprites/generated/manifest.json` | Generated runtime sprite metadata |
| `config/sprite-sources.json` and `scripts/sprites/core.mjs` | Sprite inventory/generation source |

## Scope

- [x] Diagnose screenshot/A21 and audit every assignable sheet and frame.
- [x] Enforce assignable sprite validity/capability states and development duplicate-render assertions.
- [x] Derive facing from filtered committed displacement with hysteresis and distance-based walk phase.
- [x] Add bounded, progressively widening, connected-component-aware click destination scoring and specific failure results.
- [x] Add raw/converted click and accepted-endpoint diagnostics plus an accepted target marker.
- [x] Add a shared-clock portal state machine for every valid registered Floor 1 door transition.
- [x] Validate approach, hidden entry, and interior exit points; reject unsafe/incomplete transitions.
- [x] Reserve portal exits and release on success, cancel, reset, error, or agent removal.
- [x] Add swept/substepped feet-footprint collision, personal spacing, bounded yielding/replan, and truthful stall reasons.
- [x] Add stable dynamic label placement and deterministic feet-Y z-order.
- [ ] Add focused unit/integration/regression/browser/soak/performance evidence.
- [ ] Push the exact validated commit and open a draft PR targeting `main`.

## Out of Scope

- Production approval of candidate registration or geometry.
- Changing door access meanings, IDs, room identities, or clean artwork.
- Replacing OfficeViewport, the navigation graph, or the shared simulation runtime.
- New backend/persistence integration.
- Fabricating new sprite art, metadata, directions, sitting, typing, or talking frames.
- Modifying or reopening PR #26.
- Merging or marking the new PR ready.

## Assumptions

| ID | Assumption | Confidence | Evidence | Impact if wrong |
|---|---|---:|---|---|
| A-103-01 | Existing candidate graph remains development-only and unverified. | High | PR #26 code and warning | Production activation remains prohibited. |
| A-103-02 | A21 screenshot can result from intermittent layering/clustering even though its inspected frame is coherent. | Medium | Current A21 DOM/sheet inspection | Whole-library validation and duplicate assertions are required before root cause is final. |
| A-103-03 | Registered door points can seed provisional side endpoints only when nearby graph geometry validates them. | Medium | Candidate graph door and walk-node data | Unsafe doors must be disabled, not guessed. |
| A-103-04 | Existing cardinal sheets are limited but can remain assignable when coherent and truthfully declared. | High | Generated manifest | Diagonal motion maps to stable cardinal visuals. |

## Known Unknowns

| ID | Unknown | Blocks phase? | Resolution method | Safe temporary behavior |
|---|---:|---:|---|---|
| U-103-01 | Exact screenshot event sequence and whether fragments are stale A21 visuals or overlapping agents. | Yes for final root-cause claim | Instrument primary sprite counts, render keys, frames, positions, and run soak | Do not claim resolved until evidence distinguishes causes. |
| U-103-02 | Which generated sheets have internally inconsistent feet anchors or fragmented cells. | Yes for assignment policy | Automated alpha/content-bounds audit plus contact-sheet inspection | Quarantine failing sheets and reuse valid ones. |
| U-103-03 | Which of D01-D47 have two safe graph-supported side endpoints. | Yes per door | Generate audit from graph and validate collision/room membership | Disable transition for incomplete doors with specific diagnostics. |
| U-103-04 | Browser performance cost of labels/portal effects at 25 agents. | No | Same-scenario before/after measurement | Prefer correctness; avoid per-frame global scans. |

## Questions Requiring User Decision

None currently. The requested behavior and safe fallback policy are explicit. GitHub authentication may require user action only at publication time.

## Architecture Decision

### Selected Approach

Extend `PrototypeAgent` with explicit resolved-motion telemetry, stall/yield reason, and an optional door-transition record. Keep one shared simulation tick. Build a cached walk-network index containing connected components, nodes, segments, and door-side endpoints. Click routing evaluates a bounded candidate set (nodes, segment projections, destinations) in progressive radii, filters by component/collision/occupancy, then scores click offset plus route cost. Door traversal replaces the visible threshold segment with approach -> portal-out -> hidden reposition -> portal-in -> resume phases totaling about 500ms. Rendering keeps one stable keyed agent wrapper and one primary `SpritePlayer`; labels and portal effects are siblings with intentional z-order.

### Why It Fits

The approach preserves 8192x5460 world coordinates and OfficeViewport transforms, uses existing graph and collision data, supports deterministic tests, keeps candidate behavior development-only, avoids per-agent timers, and makes diagnostics explicit.

## Alternatives Considered

### Whole-office nearest-node fallback

Advantage: simple and often returns something. Disadvantage: can send agents to unrelated locations. Decision: rejected; use bounded progressive search.

### Visible walk through static doors

Advantage: minimal state. Disadvantage: contradicts artwork and requested acceptance. Decision: replace only registered safe crossings with portal phases.

### Sprite rotation or invented diagonal rows

Advantage: more apparent directions. Disadvantage: false metadata and degraded pixel art. Decision: rejected; select nearest truthful authored direction with hysteresis.

### Independent CSS/JS timers per portal

Advantage: localized code. Disadvantage: pause/reset races and DOM buildup. Decision: rejected; advance all transitions on the shared clock.

## Data Model

Planned concepts (exact names may adapt to existing style):

- `VisualMotionState`: requested velocity, resolved displacement/velocity, filtered heading, direction sector, sprite direction, distance delta, walk phase.
- `ClickRouteDiagnostic`: screen/local/world point, radius, candidates, selected candidate, route cost, offset, rejection code.
- `PortalEndpointPair`: door ID, side IDs, approach/entry/exit points, provenance, provisional flag, validation status/reason.
- `PortalTransition`: door ID, direction, phase, phase elapsed, total elapsed, origin/destination side, reservation ID, visible point.
- `SpriteValidationStatus`: `valid-full | valid-limited | invalid-quarantined`, capabilities, reasons, anchor statistics.
- `MovementBlockReason`: intentional pause/work/talk, agent yield, portal capacity, static collision, occupied destination, replan cooldown, no route.

Invariants: world coordinates only; stable IDs; one primary sprite per agent; hidden transition is the only invisible discontinuity; no invalid sprite assignment; every reservation has bounded cleanup.

## File and Directory Changes

| Path | Action | Purpose |
|---|---|---|
| `.agent/plans/103-floor1-agent-motion-routing-portals.md` | Create/update | Living plan and evidence |
| `src/office/floor1/navigation/prototypeRuntime.ts` | Modify | Movement, scoring, portals, collision, stalls |
| `src/office/floor1/navigation/prototypeRuntime.test.ts` | Modify | User-visible runtime invariants |
| `src/components/office/Floor1CandidateSimulation.tsx` | Modify | Authoritative click conversion, diagnostics, effects |
| `src/components/office/Floor1CandidateSimulation.test.tsx` | Modify | Rendering/routing/portal regressions |
| `src/components/office/PrototypeAgentRenderer.tsx` | Modify | One primary visual, hidden phases, labels, diagnostics |
| `src/components/office/SpritePlayer.tsx` and tests | Modify | Integer crop and authoritative render identity |
| `src/components/office/floor1-candidate-simulation.css` | Modify | Portal dissolve/glow, labels, z-order |
| `src/office/sprites/*` | Modify as needed | Capability/validation/quarantine rules |
| `scripts/sprites/*`, generated manifest/inventory | Modify/generate only if official pipeline owns the result | Build-time validation and quarantine |
| `artifacts/...` | Generate only repository-approved evidence | Audit/QA summaries |

## Implementation Milestones

### Milestone 1 - Diagnosis and Sprite Integrity

Status: completed

Tasks: trace A21, audit all sheets/cells/anchors, distinguish overlap from stale layers, add one-primary-sprite assertion, quarantine invalid assets. Acceptance: exact screenshot cause recorded; every assignable sheet passes; A21 regression proves one coherent primary visual.

### Milestone 2 - Resolved Motion and Facing

Status: completed

Tasks: compute committed displacement after collision, filter heading, apply sector hysteresis, map to authored directions, advance frames by distance, stop cadence at zero movement. Acceptance: cardinal/diagonal/corner/blocked/pause tests pass with no double flip or glide.

### Milestone 3 - Click Routing

Status: completed

Tasks: use authoritative conversion, build component/segment candidate index, progressive search and scoring, occupancy alternatives, diagnostic codes and markers. Acceptance: representative hallway/room/door clicks succeed across pan/zoom; invalid clicks report specific reasons.

### Milestone 4 - Portal Transitions

Status: completed

Tasks: audit all registered doors, validate side endpoints, add approximately 0.5s shared-clock phases, hide sprite/label, reserve exits, handle pause/cancel/reset/error/removal. Acceptance: no visible wall crossing or permanent hidden state; congestion cleanup passes.

### Milestone 5 - Collision, Spacing, Labels, and Recovery

Status: completed

Tasks: swept/substepped feet checks, preferred spacing, deterministic yielding, stable label scoring, feet-Y sort, progress tracking and bounded replans. Acceptance: fixtures/high-speed/corners/head-on/same-destination/label/stall tests pass.

### Milestone 6 - Validation and Publication

Status: in_progress

Tasks: full clean-install matrix, exact-commit browser QA, 20/25-agent ten-minute soaks, before/after performance, diff evidence, commit/push/SHA verification, draft PR, Node 18/20 CI. Acceptance: every required gate is green and PR remains draft/unmerged.

## Detailed Task Breakdown

| Task ID | Task | Status | Dependency | Evidence |
|---|---|---|---|---|
| T-103-01 | Verify branch/baseline/ancestor/clean install | done | none | Git and npm outputs |
| T-103-02 | Reproduce click failure and trace A21 | done | T-103-01 | Browser DOM/screenshot and manifest trace |
| T-103-03 | Audit sprite cells, anchors, and assignments | done | T-103-02 | Generated per-frame alpha/component audit |
| T-103-04 | Implement resolved-motion/facing/cadence | done | T-103-03 | Unit/integration tests |
| T-103-05 | Implement progressive click scoring | done | T-103-02 | Tests and browser A21 click |
| T-103-06 | Audit door endpoint coverage | done | T-103-02 | 47-door runtime audit |
| T-103-07 | Implement portal phases/reservations | done | T-103-06 | Transition/congestion tests and browser QA |
| T-103-08 | Improve swept collision/spacing/stalls | done | T-103-04,T-103-07 | Runtime tests; soak pending |
| T-103-09 | Implement stable label placement/z-order | done | T-103-08 | Component/runtime tests and browser QA |
| T-103-10 | Complete validation and draft PR | in_progress | all | Exact SHA, CI, PR |

## Validation Strategy

Use pure deterministic unit tests for heading, frame phase, scoring, endpoints, substeps, reservations, and labels; integration tests for task/route/portal lifecycle; component tests for one sprite and DOM cleanup; generated checks for sprite/data drift; real browser QA for visual and transform correctness; timed soaks for leaks and intermittent stalls.

## Test Plan

### Unit

Cardinal/diagonal heading, hysteresis, distance phase, stopped animation, progressive candidate scoring, failure codes, swept footprint, endpoint validation, portal phase timing, reservation cleanup, label candidates, z-order.

### Integration

Click-to-route at transformed views, door entry/exit, pause/cancel/reset/removal during portal, congestion, workstation reservation, persistent blockage/replan/failure.

### End-to-End

Select agent -> click destination -> route -> approach door -> dissolve/hide -> reappear inside -> continue -> arrive; repeat for two agents and a busy exit.

### Regression

A21/agent-sheet-05 frame crop and one-primary-visual assertion; invalid grid/direction/anchor fixture quarantine; ordinary hallway click no longer reports the generic failure.

## Visual Review Plan

Review normal and `?floor1Review=candidate` routes at 1920x1080 and 1366x768, default/in/out zoom and pan. Inspect every assignable sheet frame-by-frame. Verify A21 scenario, portal alignment, hidden selection presentation, target markers, label placement, and feet-Y ordering. Keep local diagnostic screenshot outside the repository unless a safe repository fixture becomes necessary.

## Performance Considerations

Keep one RAF/shared clock; cache immutable graph/component/sprite validation indexes; run click scoring only on click; bound collision substeps and candidate counts; avoid per-frame global label optimization. Measure average/p95 frame duration, >50ms tasks, simulation/render frequency, primary sprite count, portal element count, reservations, and hidden agents in equivalent before/after 20- and 25-agent scenarios.

## Accessibility Considerations

Preserve keyboard actions, visible focus, text status/rejection reasons, reduced-motion transition fallback, accessible agent names, and Escape cancellation. Portal state must not strand focus or remove selection truthfully.

## Security and Data Integrity

Candidate geometry remains development-only and unapproved. Invalid door/sprite data fails closed or quarantines. No secrets or machine paths enter committed diagnostics. Production-bundle exclusion must still pass.

## Risks and Mitigations

| Risk ID | Risk | Likelihood | Impact | Mitigation | Trigger |
|---|---:|---:|---:|---|---|
| R-103-01 | Screenshot defect is intermittent and initially unreproduced | High | High | Instrument counts/render keys and soak before final claim | Cannot identify exact cause |
| R-103-02 | Candidate door geometry lacks safe endpoints | High | High | Audit, provisional graph-supported endpoints, disable unsafe doors | Endpoint validation fails |
| R-103-03 | Broader collision checks regress 25-agent performance | Medium | Medium | Spatial hash, bounded substeps, before/after profile | p95/long tasks regress materially |
| R-103-04 | Portal state leaks hidden agents/reservations | Medium | Critical | Shared clock, deadlines, centralized cleanup, soak assertions | Hidden/reservation count persists |
| R-103-05 | GitHub auth blocks draft PR | High | Medium | Complete local work; request re-auth only at publish gate | `gh auth status` remains invalid |

## Rollback Strategy

The work is isolated to the requested feature branch. Revert logical commits in reverse order. Generated sprite files are regenerated only through the official pipeline. No approved geometry or clean artwork is mutated. Portal behavior can be removed while retaining validated routing/movement fixes if door endpoint evidence proves insufficient.

## Decision Log

### D-103-01 - Preserve Shared Runtime

Date: 2026-08-05
Decision: Extend the PR #26 runtime and shared clock.
Context: Both application views already share Floor 1 state and OfficeViewport.
Alternatives: Second simulation/runtime.
Reason: Required architecture and lifecycle consistency.
Consequences: Changes concentrate in existing runtime/components.
Affected Files: `prototypeRuntime.ts`, `Floor1CandidateSimulation.tsx`.

### D-103-02 - Treat A21 Evidence as Unresolved Until Soak

Date: 2026-08-05
Decision: Do not label `agent-sheet-05` invalid solely from the screenshot.
Context: Current frame 12 and source sheet are coherent; DOM count is one.
Alternatives: Hard-quarantine sheet 05 immediately.
Reason: Quarantine must be evidence-based, while duplicate/stale render paths still require instrumentation.
Consequences: Whole-library audit and runtime assertion precede assignment changes.
Affected Files: Sprite validation/rendering/tests.

### D-103-03 - Quarantine Major Disconnected Frame Regions

Date: 2026-08-05
Decision: Treat an authored directional frame as invalid when its largest alpha-connected region is below 72% and another region contains at least 5% of opaque pixels.
Context: A21's assigned `agent-sheet-05` east row (frames 12-17) contains two major disconnected regions; largest-region ratios are 0.59-0.64. This directly matches the screenshot's separated-body report.
Reason: The test distinguishes small intentional detached effects from body-scale fragmentation and runs before runtime assignment.
Consequences: `agent-sheet-05`, `12`, `13`, and `16` are quarantined; 12 coherent limited-capability sheets remain assignable and are reused stably.

### D-103-04 - Portal Only Across Safe Registered Endpoint Pairs

Date: 2026-08-05
Decision: Derive provisional door-side endpoints only from collision-clear registered walk nodes within 620 world pixels and disable incomplete doors.
Context: Candidate geometry is unverified and not every D01-D47 zone has two safe nearby nodes.
Consequences: a fresh exact-registration graph reports 30/47 doors provisional-valid; 17 are explicitly disabled until geometry is completed. Visible route segments remain collision-valid; only the two portal jump segments are skipped while the agent is hidden.

## Progress Log

### 2026-08-05

- Fetched/pruned origin; verified required merge ancestor.
- Fast-forwarded local main and created requested branch from exact `4636773591d42507dcfd16795dd24d8d15098974`.
- Read all required repository documents and inspected assets/code/tests/artifacts.
- Ran clean install, typecheck, lint, and 457-test baseline successfully.
- Reproduced ordinary hallway click failure at 25 agents in the real app.
- Traced A21 to `agent-sheet-05`, idle/east frame 12, one current primary DOM visual.
- Visually inspected sheet 05; no permanently detached cell content found.
- GitHub CLI token is invalid; publication remains deferred until the final gate.
- Extended the sprite generator with per-frame cell-edge, empty-frame, feet-anchor, and connected-component audits.
- Root-caused A21's screenshot asset: `agent-sheet-05` frames 12-17 contain two major disconnected regions (largest region 59-64%); quarantined it before assignment.
- Quarantined `agent-sheet-12`, `13`, and `16` for horizontal cell-edge bleed; 12 valid limited cardinal idle/walk sheets remain assignable.
- Added one-primary-visual development assertions; browser inspection held exactly 25 primary visuals for 25 agents with no duplicate IDs or stale portal elements.
- Replaced sparse nearest-node click routing with bounded 160/320/620px candidate scoring over nodes, segment projections, and destinations, including route cost, room match, portal cost, collision, and occupancy.
- A hot-reloaded browser initially accepted the reproduced A21 click at screen 608,440 -> world 5325,2966, but a fresh graph audit proved that route depends on disabled-incomplete D47. Corrected coverage now rejects it specifically as `transition-unavailable`; ordinary safe registered clicks remain the positive routing cases.
- Added 160ms portal-out + 120ms hidden + 220ms portal-in shared-clock phases, world-anchored glow, stable selection, hidden labels, reservations, congestion waiting, and cleanup.
- Audited 47 doors on a fresh graph: 30 provisional-valid endpoint pairs and 17 disabled-incomplete; no unsafe endpoint is invented.
- Added filtered resolved velocity, distance-based cadence, deterministic feet-Y z-order, throttled six-position label scoring, occupied-destination alternatives, arrival spacing, and bounded stall replan/failure.
- Current local validation passes: typecheck, lint, all 469 tests, Floor 1 and sprite generated checks, production build, and production-bundle exclusion.
- Fresh-browser QA passed at 1920x1080 and 1366x768: 25 agents retained exactly 25 primary visuals, six representative clicks produced three routes and three accurate already-near outcomes, an additional invalid click returned a door-specific failure, zoom in/out and focused pan preserved alignment, and visible-agent labels stayed in bounds.
- A fresh D01 route reported 97 nodes, 1098px, and D01; live diagnostics subsequently recorded 12 completed portal transitions with zero active/hidden remnants and no portal waits at that observation.
- Global pause held all 25 agent styles stable for 1.2s and resume restored the shared clock.
- The first exact-commit 20-agent soak was stopped at minute 7: Agents 17 and 18 remained statically blocked at unchanged feet positions because a collision-valid route was repeatedly accepted by stall replanning but rejected by swept-footprint movement.
- Added a strict one-replan budget; a second static stall now fails to explicit `route-failed`, and automatic scheduling leaves that agent safely idle until a manual command or reset instead of ever retrying the same failed destination.
- The first restarted 20-agent soak again sampled Agent 18 at the same blocked feet position beyond two minutes. The run was stopped and does not count; automatic post-failure activity rotation was removed entirely, and richer development attributes were added to prove duration/replan/revision/progress on the next fresh run.
- The richer diagnostics identified the exact state: Agent 18 was at 100% route progress with 0px remaining, but the final swept-footprint placement was statically rejected. Added an immediate endpoint failure path that clears the route at the last safe point; live HMR verification changed Agent 18 from blocked/traveling to idle/route-cleared on the next tick.

## Unexpected Discoveries

### X-103-01 - Root data directory absent

Date: 2026-08-05
Discovery: Structured Floor 1 data is stored under `src/office/data/floor1`, not root `data/`.
Impact: No functional blocker; plan and changes must follow actual repository structure.
Decision: Do not create a speculative duplicate root data tree.
Plan change: Use existing generated-data layout.
User review needed: No.

### X-103-02 - Baseline A21 is coherent at inspection time

Date: 2026-08-05
Discovery: A21 currently has one sprite layer using a coherent source cell.
Impact: The screenshot root cause remains intermittent and may involve stale DOM, overlap, or another agent asset.
Decision: Add instrumentation and soak before declaring a cause.
Plan change: None; strengthens milestone 1 evidence requirement.
User review needed: No.

### X-103-03 - Hot-reload cache masked an incomplete D47 transition

Date: 2026-08-05
Discovery: A browser graph retained across hot reload accepted the reproduced long A21 click, while a fresh exact-registration graph correctly reported that the route requires D47 and D47 lacks a complete safe portal pair.
Impact: The earlier successful-click observation was not valid clean-start evidence.
Decision: Preserve the fail-closed D47 result, expose its specific `transition-unavailable` reason and candidate-search diagnostics, and reserve positive click assertions for geometry that is reachable through complete endpoint pairs.
Plan change: Fresh-page/exact-commit browser QA is mandatory before any success claim; no hot-reloaded result counts as final evidence.
User review needed: No.

### X-103-04 - Stall replanning could accept the same swept-footprint failure forever

Date: 2026-08-05
Discovery: During the first exact-commit 20-agent soak, Agents 17 and 18 stayed in `blocked` with `static-collision=blocked`, zero velocity, unchanged feet positions, and traveling work tasks for multiple minute samples. Richer diagnostics later showed the repeating Agent 18 case was already at 100% route progress with 0px remaining: the graph endpoint passed route validation but its final swept feet placement was rejected.
Impact: The existing cooldown bounded retry frequency but not retry count, so an accepted replacement route could restart the same collision indefinitely.
Decision: A statically rejected final endpoint fails immediately at the last safe feet point. Mid-route stalls may use one automatic replan; if that route stalls again, fail visibly and clear the route/reservations. Automatic mode must keep the agent safely idle until a manual command or reset. Development DOM diagnostics expose blocked duration, replan count, revision, and route progress for soak verification.
Plan change: Restart both full-duration soaks from a new exact commit; the failed seven-minute run does not count.
User review needed: No.

## Manual Review Items

- [x] Confirm screenshot defect root cause from frame-component evidence and runtime instrumentation.
- [x] Review quarantined sprite reasons and replacement assignment.
- [x] Review door endpoint audit, especially incomplete/provisional doors.
- [x] Review portal visual timing and label placement artifacts.
- [ ] Re-authenticate GitHub CLI if still invalid at publication.

## Completion Criteria

### Functional

- [ ] Ordinary hallway/room clicks route sensibly with specific failures otherwise.
- [ ] Facing matches actual displacement; stationary agents do not walk-cycle.
- [ ] Registered safe door crossings use the ~0.5s portal effect without visible wall traversal.
- [ ] No agent remains hidden; no stale reservation persists.
- [ ] No two settled feet footprints overlap.

### Data Integrity

- [ ] Every runtime-assignable sprite is valid-full or valid-limited.
- [ ] Invalid sheets are quarantined with reasons.
- [ ] Door endpoint status is reported for all registered doors.

### Tests

- [ ] All focused and existing tests pass on Node 18 and Node 20 CI.
- [ ] Generated checks and production exclusion pass.

### Visual

- [ ] A21 scenario and every assignable sprite show one coherent visual.
- [ ] Portal/labels/markers remain aligned across zoom, pan, viewport, and DPR checks.

### Performance

- [ ] 20- and 25-agent ten-minute soaks complete without growing sprite/portal counts, hidden agents, or stale reservations.
- [ ] Before/after frame metrics are recorded without unsupported improvement claims.

### Accessibility

- [ ] Keyboard, Escape, focus, text status, and reduced motion remain functional.

### Documentation

- [ ] Plan final report and draft PR body contain exact evidence and limitations.

### Build

- [ ] Clean-install validation passes against the exact final commit.
- [ ] Local/remote SHA and CI SHA match; worktree is clean.

## Final Report

Pending implementation and validation. Do not mark this plan completed while any stop condition or required gate remains unresolved.
