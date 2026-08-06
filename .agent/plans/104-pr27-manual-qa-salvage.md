# PR #27 Manual-QA Salvage

Status: ready_for_user_manual_review
Plan ID: 104
Owner: Codex
Reviewer: User
Created: 2026-08-05
Last Updated: 2026-08-06
Related Task: Salvage PR #27 after failed manual visual testing
Related Branch: codex/floor1-agent-motion-routing-portals
Related Pull Request: #27 (must remain draft and unmerged)

## Executive Summary

PR #27 passed automated validation at `025a1180a2264d4495c86c74be8af5d8b0d4d64d`, but user manual QA rejected the visible simulation. This plan replaces the prior narrow motion/portal scope with a phased salvage: reproduce and instrument the visual failures, repair the single authoritative clock and motion continuity, replace teleporting drag/click controls with route-producing drag-to-walk, restore a preserving 1–50 Office Engine count slider, complete explicit room/door/collision geometry and visible portals, create real complete sprite image assets with reviewed frame sequences, and replace random pacing with purposeful staggered activity. Completion means one exact final SHA is genuinely ready for user manual QA; it does not mean user approval has already occurred.

## Goal

Deliver a continuous, responsive Floor 1 office in both application modes where agents move toward meaningful destinations without backward walking, gliding, gait resets, stale-position rollback, or wall/furniture intersections; drag release creates a route without teleporting; every cross-room route uses a visible registered-door portal; Office Engine supports 1–50 agents without resetting unaffected agents; labels appear only on hover or selection; purposeful work dominates; and actual idle, directional walking, sitting, typing/working, talking, and waiting image assets are visibly used.

## Background and Context

The starting branch is the existing PR #27 branch. On 2026-08-05, `git fetch --prune origin` confirmed both local and remote head exactly equal `025a1180a2264d4495c86c74be8af5d8b0d4d64d`; the worktree was clean and the branch already checked out. Previous plan 103 intentionally excluded new sprite art and disabled incomplete portal doors; both decisions are superseded by user manual QA. The unverified candidate registration remains a trust constraint: provisional geometry must be labeled truthfully and must not be promoted to production-approved.

## Current Repository State

- Framework: React 19, TypeScript 5.7, Vite 6, Vitest 4; DOM/SVG world rendering inside `OfficeViewport`.
- Package manager: npm with lockfile.
- Exact starting SHA: `025a1180a2264d4495c86c74be8af5d8b0d4d64d`.
- Existing PR: #27, open, draft, unmerged.
- Starting local/remote branch: exact match and clean.
- Current runtime: one candidate graph and shared React runtime for Office Engine and Agent Simulation.
- Current agents: limited-cardinal idle/walk generated sheets; four sheets quarantined; no complete sitting/typing/talking families.
- Current doors: plan 103 reports 30/47 provisional-valid and 17 disabled-incomplete.
- Current normal interaction: click-to-route plus a drag path that repositions rather than requests a route.
- Current labels: short A## tiles can render persistently.
- Current tests/build: previous exact SHA passed 470 tests and Node 18/20 CI run #137, but this is not visual acceptance.
- Root `data/` and root `tests/` directories are absent; structured runtime data and tests live under `src/office/data/floor1` and colocated `*.test.*` files.
- Current engine warning: Vitest 4.1.10 and happy-dom 20.11.1 declare Node 18 outside supported engines; dependencies and matrix are unchanged unless separately decided.

## Source-of-Truth Files

| File | Controls |
|---|---|
| `AGENTS.md` | Repository rules, phase gates, coordinates, safety, completion evidence |
| `docs/AI_HUB_MARKUP_LEGEND.md` | Markup meanings and registration constraints |
| `docs/DOOR_ACCESS.csv` | D01–D47 identities, access, confidence, manual-review flags |
| `docs/INTERACTIONS.md` | Input, navigation, positions, doors, failure behavior |
| `docs/ANIMATION_MANIFEST.md` | Explicit frames, anchors, animation states, validation |
| `.agent/PLANS.md` | Living-plan and evidence requirements |
| `.agent/plans/103-floor1-agent-motion-routing-portals.md` | Superseded implementation decisions and starting defects |
| `public/assets/office/office-8192x5460.png` | Authoritative clean appearance |
| `src/office/data/floor1/**` | Current provisional/classified/raw geometry |
| `src/components/office/**` | Viewport, controls, agent/sprite/portal rendering |
| `src/office/floor1/navigation/**` | Graph, routing, tasks, clock-driven agent state |
| `src/office/sprites/**`, `scripts/sprites/**`, `config/sprite-sources.json` | Sprite metadata and official generation pipeline |

## Scope

- [ ] Capture and preserve a measured failed baseline in both app modes.
- [ ] Instrument authoritative clock, render/step timestamps, scheduler events, route-planning cost, remounts, position/frame histories, and long tasks in development diagnostics.
- [ ] Repair periodic global pauses, synchronized task churn, gait resets, false facing, gliding, and stale-position rollback.
- [ ] Add explicit reviewed frame sequences and a direction/animation/frame/anchor visual lab.
- [ ] Replace normal click-to-walk and teleporting drag with destination-preview drag-to-walk.
- [ ] Restore a preserving Office Engine slider from 1 through 50.
- [ ] Show labels only on hover/selection, except explicit debug overlay.
- [ ] Audit D01–D47 and all accessible rooms; add collision-valid provisional door approaches/interior exits without falsifying approval.
- [ ] Make every cross-room route use a visible ~0.5 second portal transition.
- [ ] Repair route corridors, static/swept collision, yielding, workstation and portal anchors.
- [ ] Create real coherent pixel-art source/generated assets for required activities and directions; validate and visually inspect them.
- [ ] Use sitting/typing/working/talking/waiting assets in purposeful staggered tasks.
- [ ] Validate both modes, 1–50 counts, 20 drags/10 cross-room drags, 10 portal observations, two 10-minute runs, all local gates, exact remote SHA, and Node 18/20 CI.

## Out of Scope

- Production approval of the currently unverified Floor 1 registration.
- Changing D01–D47 IDs, access colors/meanings, room identities, or the clean master artwork.
- Real backend, persistence, real inter-floor elevator travel, or external agent orchestration.
- Merging PR #27 or marking it ready for review.
- Claiming user manual approval; the goal ends at a testable manual-review candidate.

## Assumptions

| ID | Assumption | Confidence | Evidence | Impact if wrong |
|---|---|---:|---|---|
| A-104-01 | Both visible modes should share one authoritative simulation clock and runtime state. | High | Existing consolidation and user contract | A second runtime would reintroduce divergence. |
| A-104-02 | A smaller number of complete sprite families may be reused across 50 agents. | High | User explicitly permits reuse | Asset work can prioritize quality over uniqueness. |
| A-104-03 | Provisional door points may be added only when overlay/graph/collision evidence supports them and review status remains explicit. | High | AGENTS.md and user requirements | Unsupported doors remain individually reported, not silently approved. |
| A-104-04 | User-reported visual failures override existing tests and PR claims. | High | Explicit salvage instruction | Contradictory tests must be replaced, not preserved. |

## Known Unknowns

| ID | Unknown | Blocks phase? | Resolution method | Safe temporary behavior |
|---|---:|---:|---|---|
| U-104-01 | Exact source of the repeating three-second global pause. | Yes for Phase B | Baseline traces of RAF/step/render/scheduler/route planning/remounts | No behavior change until reproduced and measured. |
| U-104-02 | Exact truthful frame order and capabilities for every current/created sheet. | Yes for assignment | Frame-by-frame visual lab plus generated validation metadata | Unreviewed sheets are not assignable. |
| U-104-03 | Safe provisional endpoints and accessible-room coverage for all 47 doors. | Yes per route | Overlay, room membership, walk graph, collision and manual visual audit | Fail closed and report individual door/room. |
| U-104-04 | Whether image generation can produce coherent matching pixel art. | Yes for final asset gate | Use image-generation workflow against existing reference, then inspect visual lab | Complete non-asset work and produce precise handoff spec if quality fails. |

## Questions Requiring User Decision

None before implementation. The user authorized autonomous salvage and defined safe fallback behavior. Final visual acceptance remains a user review item.

## Architecture Decision

### Selected Approach

Retain `OfficeViewport` as the sole world transform and one monotonic shared simulation clock. Move periodic scheduling into per-agent absolute deadlines with deterministic staggering and bounded incremental planning. Keep committed world position authoritative; render interpolation may only bridge the previous and current committed states and may never write simulation state. Derive visual heading and distance-based gait from collision-resolved displacement. Represent drag as a preview-only interaction until release creates a route. Reconcile count by stable agent ID, preserving the prefix of existing runtime agents. Store provisional door endpoints and explicit animation sequences as validated structured data owned by existing data/generation pipelines. Render portals from real route door steps, never independently.

### Why It Fits

This approach preserves world coordinates, stable identities, trust boundaries, deterministic testing, debug visibility, and production exclusion. It removes synchronized work bursts and prevents UI rerenders from resetting gait or position.

## Alternatives Considered

### Independent timer per agent

Advantages: local scheduling. Disadvantages: timer proliferation, pause drift, nondeterministic tests. Decision: reject; use one clock with per-agent deadlines.

### Move agents directly during pointer drag

Advantages: immediate UI feedback. Disadvantages: teleportation and collision bypass. Decision: reject; preview destination only.

### Infer geometry from background pixels

Advantages: automated coverage. Disadvantages: violates source-of-truth rules and produces wall shortcuts. Decision: reject; use explicit provisional structured geometry and overlays.

### Fake new activities with standing frames/CSS transforms

Advantages: cheap. Disadvantages: violates asset contract and visual quality. Decision: reject; create real complete sprite image files.

## Data Model

- `SimulationClockSnapshot`: monotonic elapsed time, delta, frame/step/render generations, pause source, long-task counters.
- `AgentSchedule`: stable task ID, reason, origin, destination, expected next activity, assigned/started/ends timestamps.
- `MotionSnapshot`: previous/current committed points, interpolated point, requested/resolved velocity, filtered heading, distance phase, route segment/revision.
- `DragDestinationPreview`: raw/local/world points, validation state, accepted endpoint, route summary; never mutates the agent.
- `DoorPortalRegistration`: D##, connected zone IDs, approach/threshold/interior points in world coordinates, provenance, confidence, manual-review status, validation findings.
- `AnimationSequence`: animation/direction, source row or rectangles, exact frame sequence, anchors, playback/distance cadence, loop/hold and review status.
- `AgentCountReconciliation`: stable ordered IDs, retained IDs, deterministic additions/removals, no unrelated route/task reset.

## File and Directory Changes

| Path | Action | Purpose |
|---|---|---|
| `.agent/plans/104-pr27-manual-qa-salvage.md` | Create/update | Living salvage decisions/evidence |
| `src/office/floor1/navigation/prototypeRuntime.*` | Modify | Clock, motion, scheduling, routes, collision, portals |
| `src/components/office/Floor1CandidateSimulation.*` | Modify | Drag-to-walk, count reconciliation, diagnostics, controls |
| `src/components/office/PrototypeAgentRenderer.*` | Modify | Interpolation, facing/gait, hover labels, portal visuals |
| `src/components/office/SpritePlayer.*` | Modify | Explicit sequences and stable phase |
| `src/components/office/AgentSpriteVisualLab.*` | Modify | Required sheet/sequence/anchor review |
| `src/office/sprites/**`, `config/sprite-sources.json`, `scripts/sprites/**` | Modify/generate | Complete asset metadata and validation |
| `src/office/data/floor1/**` | Modify/generate only with preserved provenance | Door/room/collision registration |
| `public/assets/office/sprites/**` and approved source asset directories | Create/generate | Real new image assets |
| `artifacts/debug/**`, `artifacts/animation-previews/**` | Generate | Visual/timing/geometry evidence |

## Implementation Milestones

### Milestone 1 — Failed Baseline and Instrumentation

Status: complete

Acceptance: both modes are observed; user-reported defects are reproduced or explicitly marked not reproduced; timestamped traces and screenshots record global timing, positions, frames, remounts, controls, labels, portal state and representative sheet rows.

### Milestone 2 — Clock, Motion, and Animation Continuity

Status: complete

Acceptance: one monotonic clock; no repeating global pause or synchronized regeneration; facing never opposes meaningful displacement; stationary gait does not advance; moving gait advances continuously from distance; no stale-position rollback; both modes pass 10-minute continuity traces.

### Milestone 3 — Drag-to-Walk, Count Slider, and Labels

Status: complete

Acceptance: normal click-to-walk absent; drag preview does not move agent; release creates route from original point; invalid releases roll back; 1–50 slider preserves unaffected identities/tasks/positions/routes/sprites; labels appear only on hover/selection.

### Milestone 4 — Geometry, Doors, Portals, and Collision

Status: complete_with_D46_unsupported

Acceptance: all D01–D47 audited, intended accessible rooms have a validated entrance, cross-room routes use explicit door steps, portals are visibly observed across multiple doors, and no route visibly crosses walls/desks/furniture.

### Milestone 5 — Complete Sprite Assets and Workstation Activities

Status: complete

Acceptance: real image files and generated outputs exist for idle, required walk directions, sitting, typing/working, talking and waiting; every assigned sequence is visually reviewed; sitting/typing anchors and occlusion work in the office.

### Milestone 6 — Purposeful Scheduler, Cleanup, and Performance

Status: complete

Acceptance: 60–75% work/sit/type, 10–25% moving, small talk/wait/idle group; tasks are staggered for believable durations; normal view is clean; 50 agents remain responsive.

### Milestone 7 — Exact Final Validation and Publication

Status: validation_complete_publication_deferred

Acceptance: all required local commands, real browser QA, two ten-minute runs, exact local/remote SHA, all Node 18/20 CI steps, updated truthful draft PR; PR remains unmerged and user manual approval remains pending.

## Detailed Task Breakdown

| Task ID | Task | Status | Dependency | Evidence |
|---|---|---|---|---|
| T-104-01 | Verify exact starting remote/local SHA and clean branch | done | none | Git output, 2026-08-05 |
| T-104-02 | Correct PR description to salvage-in-progress | done | T-104-01 | PR #27 metadata |
| T-104-03 | Capture both-mode failed baseline and traces | done | T-104-01 | 1920x1080 screenshots and 8-second walker trace |
| T-104-04 | Repair clock/motion/animation continuity | done | T-104-03 | Two terminal-browser 600-second active traces; zero gaps/rollback/backward/sideways samples |
| T-104-05 | Implement drag-to-walk/count slider/labels | done | T-104-04 | 20 successful drags; invalid drag preserved point; 1-50 identity preservation; hover/selection checks |
| T-104-06 | Complete doors/rooms/routes/collision/portals | done_with_D46_unsupported | T-104-04 | 15 cross-room drags/portal observations; two D01 successes; D46 remains sole unsupported door |
| T-104-07 | Generate/review/integrate complete sprite assets | done | T-104-03 | Generated assets/manifests current; browser observed all required activity states |
| T-104-08 | Implement purposeful staggered scheduler | done | T-104-04,T-104-07 | Prevalidated cached patrol scheduling; work/talk/idle distribution and active traces |
| T-104-09 | Clean visuals and validate 50-agent performance | done | T-104-05,T-104-06,T-104-08 | 50-agent 600-second run, 6,002 samples, maximum gap 142.5 ms |
| T-104-10 | Exact final validation, push and CI | publication_deferred | all | Local gates pass; user explicitly prohibited commit/push; PR remains draft/unmerged |

## Validation Strategy

Use timestamped runtime traces for temporal claims; pure tests for scheduling/motion/sequence/geometry invariants; component tests for interactions and stable identity; generated validators for assets/data; visual overlays for geometry/anchors; actual browser observation and screenshots/recordings for motion and portal behavior; full local/CI gates for integrity.

## Test Plan

### Unit

Clock monotonicity, no global pause state, staggered schedules, distance phase, zero-motion hold, truthful direction, stale-position rejection, explicit sequences, collision substeps, door endpoint validation, count reconciliation.

### Integration

Same/hall/cross-room drag, invalid/occupied/disconnected drops, portal lifecycle/congestion/reset, workstation route/reservation/sit/type, purposeful task transitions, count changes during motion/portal.

### End-to-End

Drag from original point through registered doors, portal out/hidden/in, arrive at workstation, sit/type, later release/return; exercise hover/selection labels and count changes.

### Regression

Global three-second freeze, backward/sideways facing, gait restart, drag teleport, permanent A## labels, missing count control, invisible portals, final-endpoint rollback, duplicate primary sprites.

## Visual Review Plan

Test `/` and `/?floor1Review=candidate` at 1920×1080 and 1366×768, multiple zoom levels and pan. Capture baseline/final screenshots, timestamped motion/frame traces, portal phase traces, sprite-lab contact sheets, count-preservation logs, and geometry overlays. Final QA includes 20 drags (10 cross-room), 10 observed portal transitions across multiple doors, both modes for 10 uninterrupted minutes, and 50 Office Engine agents for 10 minutes.

## Performance Considerations

Measure RAF/step/render intervals, long tasks, route-planning duration, graph rebuilds, active movement ratio, DOM primary-sprite/portal/marker counts, and input responsiveness. Cache immutable geometry/sequence data; schedule planning incrementally; reconcile counts without whole-runtime recreation; cull optional offscreen effects without hiding required state.

## Accessibility Considerations

Preserve keyboard selection/actions, visible focus, Escape cancellation, text destination validity, accessible slider value/name, non-color status labels, reduced-motion portal/animation fallbacks, and stable selection during portal transitions.

## Security and Data Integrity

Keep candidate geometry development-only and `unverified-sandbox`; preserve source confidence/manual-review flags; fail closed for invalid door data; never write viewport coordinates as world data; use the official asset generator; preserve source and clean artwork; commit no local paths/secrets.

## Risks and Mitigations

| Risk ID | Risk | Likelihood | Impact | Mitigation | Trigger |
|---|---|---:|---:|---|---|
| R-104-01 | Global pause is main-thread CPU rather than explicit pause state | High | Critical | Long-task and planning instrumentation; incremental scheduling/caching | RAF gaps without pause transitions |
| R-104-02 | Provisional geometry cannot safely cover every requested door | High | High | Manual overlay audit, preserve review status, report individual residuals | No collision-clear two-sided anchors |
| R-104-03 | Generated sprite art is visually incoherent | Medium | Critical | Reference-guided generation, small complete families, visual-lab rejection | Anchor/identity/frame review fails |
| R-104-04 | 50-agent performance regresses | Medium | High | Stable reconciliation, capped moving minority, cached planners, measure | Long tasks/input stalls grow materially |
| R-104-05 | Existing tests encode rejected behavior | High | Medium | Replace only contradictory expectations with user-visible regressions | Test expects teleport/click-to-walk/permanent labels |

## Rollback Strategy

Use logical checkpoint commits and revert them independently. Do not rewrite PR history. Keep old generated assets until references migrate and validation passes. Geometry changes retain provenance and can be disabled without modifying the master image. Feature behavior remains isolated to development candidate surfaces until final review.

## Decision Log

### D-104-01 — Supersede plan 103 acceptance claims

Date: 2026-08-05
Decision: User manual QA is authoritative; prior browser/CI claims do not establish acceptance.
Context: User observed systemic visual failures at the exact green SHA.
Alternatives: Preserve plan 103 and patch isolated defects.
Reason: The requested end state differs materially and includes previously excluded scope.
Consequences: New phased salvage and fresh baseline/final evidence.
Affected Files: plan 104, PR #27 description, subsequent runtime/assets/data.

### D-104-02 — Preserve one clock and committed-position authority

Date: 2026-08-05
Decision: One monotonic clock drives per-agent deadlines; committed simulation positions are never replaced by render snapshots.
Context: Periodic freezes, gait resets and apparent teleporting require temporal separation.
Alternatives: More timers or CSS-only smoothing.
Reason: Deterministic, traceable, pause-safe behavior.
Consequences: Scheduler and rendering must consume the same monotonic timeline.
Affected Files: runtime, simulation, renderer, diagnostics.

## Progress Log

### 2026-08-05

- Read both authoritative salvage request files completely.
- Read required repository documents and inspected repository/assets/tests/build configuration.
- Fetched origin; confirmed exact local/remote starting SHA and clean existing PR branch.
- Replaced inaccurate PR #27 visual-success claims with failed-user-QA and salvage-in-progress status; PR remains draft/unmerged.
- Created this living plan before application changes.
- Captured both 1920x1080 modes. Office Engine exposed discrete 15/20/25/30 count buttons; Agent Simulation exposed normal map-click walking, direct reposition controls, and persistent A## labels.
- Inspected live sprite resolution: agents requesting `working` rendered the `idle` fallback, proving required working art was not actually available.
- Measured Office Engine motion for eight seconds: three walkers produced only 24 position changes and 12 sprite-frame changes total while the sampling loop remained responsive (171 samples, maximum 60 ms sample gap). This reproduces bursty/starved observable motion without evidence of a deadlocked main thread.
- Traced direct reposition code: pointer drag replaces the rendered point with a preview and commits `repositionPrototypeAgent(...)` on release, bypassing a walking route by design.
- Replaced ordinary map-click walking and direct reposition with preview-only drag-to-route behavior; invalid releases preserve the committed point.
- Restored a stable 1-50 Office Engine slider and count reconciliation that preserves unaffected agents.
- Changed normal labels to hover/selection only and retained explicit diagnostics as the sole show-all path.
- Replaced the frame driver with one monotonic 30 Hz simulation clock; ambient deadlines are staggered and purposeful rather than globally regenerated.
- Created and pipeline-validated `agent-activity-sheet-01.png` with explicit activity rows. Inventory reports no edge bleed and a maximum one-pixel anchor deviation.
- Audited all 47 portal IDs. Collision-clear provisional support/alias points represent 46; D46 remains rejected because its registered threshold is 1218.88 px from the nearest collision-clear Focus D support point, beyond the 620 px portal envelope.
- Replayed the reported A21 long drag. Removing the invented geometric D47 shortcut exposes a disconnected D01 approach; the runtime fails safely rather than crossing a wall or teleporting.

### 2026-08-06

- Replaced the inaccessible in-app browser with terminal-controlled Chrome 150 over CDP, using a temporary clean profile and disabled cache. No Playwright, Puppeteer, Selenium, or new project dependency was installed.
- Verified Vite served the current uncommitted `Floor1CandidateSimulation.tsx` byte-for-byte: disk and served SHA-256 both `0c1a112ff311c2ecdc0e29dd7fff7e2b7050e135902d1eba959612ceace06b08`; the Vite development client and salvage tokens were present.
- Removed a real passive-wheel console error by registering the viewport wheel handler as a native non-passive listener; browser console/network error count is zero afterward.
- Moved automatic scheduling off synchronous whole-roster cross-room planning and onto deterministic prevalidated local patrols. Explicit drag/work/talk commands retain full routing.
- Completed a 50-agent Office Engine run for 600,074.5 ms: 6,002 samples, maximum sample gap 142.5 ms, no gaps over 250 ms, zero stale rollback, zero backward samples, zero sideways samples, 8,136 position changes, and 94,265 animation-frame changes.
- Completed an active Agent Simulation run for 600,017.9 ms: 6,001 samples, maximum sample gap 120.3 ms, no gaps over 250 ms, zero stale rollback, zero backward samples, zero sideways samples, 7,931 position changes, and 5,581 animation-frame changes.
- Exercised the 1-50 slider through 20, 30, 10, 1, and 50 agents; retained unaffected identities and points across every count change.
- Verified labels hidden normally and visible on hover/selection, pointer pan, wheel zoom, invalid-drag rollback, and route origin preservation.
- Completed 20 successful drags in 22 attempts, including 15 successful cross-room drags and 15 observed portal transitions. Two successful routes crossed D01 and arrived at their requested points.
- Observed all portal phases (`portal-out`, `hidden-transition`, `portal-in`) plus the visible blue glow/pixel-dissolve effect. Observed `sitting`, `typing`, `working`, `talking`, `waiting`, `idle`, and directional `walking` assets.
- Live route discovery reports 46 supported door IDs and exactly one unsupported ID: D46. No D46 envelope expansion, hidden teleport, or invented doorway was added.
- Final local validation passes: TypeScript, ESLint, 472/472 Vitest tests, generated sprite check, generated Floor 1 check, production build, and production-bundle exclusion check.
- Preserved the uncommitted salvage work, live server, clean Chrome profile, draft PR state, and unmerged branch; no stage, commit, reset, push, or dependency change was performed.
- Finalization audit retained the repository-appropriate CDP runner and compact JSON evidence, and removed redundant full-resolution screenshots plus the exploratory browser dump before commit. No browser profile, cache, secret, or machine-specific path entered the tree.

## Unexpected Discoveries

### X-104-01 — Repository structure differs from nominal root layout

Date: 2026-08-05
Discovery: root `data/` and root `tests/` are absent; data/tests are under `src`.
Impact: Follow existing generator/runtime structure rather than creating duplicates.
Decision: Keep changes in existing locations.
Plan change: File table reflects actual layout.
User review needed: No.

### X-104-02 — Observable motion starvation is not a main-thread deadlock

Date: 2026-08-05
Discovery: an eight-second browser trace sampled normally (maximum 60 ms gap) but three active walkers produced only 24 committed position changes and 12 sprite-frame changes in total.
Impact: the repair must make clock stepping and observable render motion robust instead of hiding the symptom with a longer animation or timeout.
Decision: retain one monotonic simulation timeline, remove schedule work from the render-critical path, and add explicit continuity metrics/tests.
Plan change: Milestone 2 owns both scheduler isolation and rendered continuity.
User review needed: No.

### X-104-03 — Rejected interaction is explicit production code

Date: 2026-08-05
Discovery: `handleMapClick` routes on any ordinary map click, and drag release calls `repositionPrototypeAgent`, directly changing the authoritative point.
Impact: this is not a flaky gesture bug; the input contract itself contradicts the requested behavior.
Decision: ordinary map clicks stop issuing walks; drag becomes destination preview and route assignment from the original point.
Plan change: Milestone 3 replaces both paths and their tests.
User review needed: No.

### X-104-04 — D46 registration and hallway topology are not safely inferable

Date: 2026-08-05
Discovery: D46's registered threshold `(7002.11, 3946.43)` is over 1,200 source pixels from the nearest collision-clear Focus D support, and its second zone is the unresolved `ambiguous:rm10 circulation zone`. The reproduced A21 route also resolves to an unreachable D01 approach once the invented D47 shortcut is removed.
Impact: Focus D and the reproduced cross-room route cannot meet the navigation/portal gate from the current unverified registration without inventing geometry.
Decision: Preserve safe rejection and do not stretch, teleport, or silently remap zones.
Plan change: D01 was repaired and validated through two real terminal-browser crossings. D46 alone remains unsupported pending authoritative doorway evidence; no global portal envelope was increased.
User review needed: Only for any future request to support D46 or approve the unverified registration as production geometry.

## Manual Review Items

- [ ] User manually verifies the final exact SHA locally.
- [ ] User approves provisional door/room geometry in overlays.
- [ ] User visually accepts created complete sprite families and frame sequences.
- [ ] User confirms no repeating freeze, backward/gliding gait, or portal visibility issue remains.
- [ ] PR #27 remains draft until these checks occur.

## Completion Criteria

### Functional
- [ ] All 23 authoritative goal items are demonstrated on one exact SHA.

### Data Integrity
- [ ] World coordinates, door IDs/access meanings, provenance, review flags, asset metadata and references validate.

### Tests
- [x] Focused regressions and full tests pass; no required test is skipped/weakened.

### Visual
- [x] Both modes and all mandatory drag/portal/activity/asset checks are observed in terminal-controlled Chrome.

### Performance
- [x] Both 10-minute runs pass; 50 agents remain responsive without repeating freeze or observed state rollback.

### Accessibility
- [ ] Keyboard, focus, Escape, text status, slider semantics, labels and reduced motion pass.

### Documentation
- [ ] Plan/PR/final report separate automated, Codex visual, and pending user evidence.

### Build
- [x] Current uncommitted tree passes all local commands.
- [ ] Commit/push, exact remote SHA, and Node 18/20 CI are intentionally deferred by the user's no-commit/no-push instruction.

## Final Report

Terminal-browser QA is complete and the candidate is ready for optional user review. Durable evidence is stored in `artifacts/debug/pr27-terminal-browser-qa/qa-report.json`; the reusable development-only runner is `artifacts/debug/pr27-terminal-browser-qa.mjs`. D46 remains explicitly unsupported; candidate registration remains unverified and is not production-approved. Publication/CI was initially deferred by user instruction and then explicitly authorized for finalization on 2026-08-06. PR #27 must remain open, draft, and unmerged.
