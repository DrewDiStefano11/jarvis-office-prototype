# Floor 1 agent motion, collision, workstation, and performance refinement

## Goal

Refine the existing Floor 1 candidate runtime on `codex/pr24-runtime-repair` so real agent sprites move continuously and truthfully, remain world-scaled, avoid static and dynamic collisions, occupy believable workstation anchors, and stay responsive with 20 ambient and 25 debugger agents while preserving the unverified candidate boundary and all existing workflows.

## Current repository state

- Required starting head verified: `8a48193732fda7bada8c734ef6bc27df9c4259d8`.
- Existing draft PR: #26; no new branch or PR is allowed.
- Current simulation owns one RAF but commits the full agent array through React every frame.
- Existing sprite manifest exposes real assets through the shared resolver/player.
- Candidate registration remains unverified and all prototype doors are forced open only in the candidate runtime.

## Scope

- Baseline profiling and repeatable runtime diagnostics.
- Truthful direction selection with velocity/tangent hysteresis.
- Movement-synchronized sprite cadence and stable foot anchors.
- Constant world-space sprite dimensions across zoom.
- Continuous RAF/tick behavior with staggered ambient scheduling.
- Agent-footprint validation against static geometry.
- Deterministic local traffic avoidance, reservations, yielding, and blocked recovery.
- Derived workstation approach/final anchors, facing, reservation, and release.
- React/runtime performance isolation and Advanced diagnostics.
- Focused unit/component regression tests and real-browser QA.

## Out of scope

- Approving candidate registration or changing registration evidence.
- Editing generated Floor 1 geometry to conceal runtime defects.
- New sprite artwork or invented animation rows.
- Production access behavior beyond the existing candidate forced-open policy.
- Marking PR #26 ready for review.

## Source files

- `src/components/office/Floor1CandidateSimulation.tsx`
- `src/components/office/PrototypeAgentRenderer.tsx`
- `src/components/office/SpritePlayer.tsx`
- `src/components/office/floor1-candidate-simulation.css`
- `src/components/office/office-engine.css`
- `src/office/floor1/navigation/prototypeRuntime.ts`
- `src/office/sprites/manifest.ts`
- `src/office/sprites/resolver.ts`
- related tests and validated candidate graph/data readers

## Assumptions

- Runtime/world coordinates remain 8192 × 5460.
- Existing validated wall/object geometry and explicit position/computer anchors remain authoritative inputs.
- A compact circular floor footprint is more truthful than the transparent sprite rectangle.
- Existing source sprite sheets must be represented exactly as inventoried; unsupported directions use truthful nearest-view fallback.

## Known unknowns

- Exact source of the reported periodic freeze until baseline instrumentation is captured.
- Which, if any, of the 16 sheets contain authoritative north/south directional rows.
- Whether existing position metadata is sufficient for every workstation final anchor or a conservative derived subset is required.
- Collision coverage limitations caused by provisional geometry rather than runtime execution.

## Architecture decision

Keep one authoritative RAF and one deterministic runtime module. Cache immutable navigation, obstacle, sprite, and workstation derivations by stable graph/manifest identity. Move high-frequency telemetry and position rendering away from full-office React state where practical; expose throttled snapshots for controls/cards. Use a world-space circular footprint, validated route segments, a per-tick spatial hash, deterministic node/edge reservations, and bounded replan backoff.

## Data model

- Extend prototype agent state with velocity, facing hysteresis, traveled distance, blocked/waiting telemetry, reservation state, and workstation phase.
- Add derived workstation records: entity IDs, approach node/point, final anchor, facing, footprint clearance, and occupancy.
- Add simulation diagnostics: RAF/tick/frame timing, moving/stationary/blocked counts, plan/build/check/conflict counters, and last global-pause evidence.
- Add truthful per-sprite motion capabilities only where repository metadata supports them.

## Milestones

1. **Baseline diagnosis** — reproduce both modes at both URLs; record cadence, scale, pauses, render/update/planning behavior, collisions, and workstation deltas.
2. **Direction, cadence, and scale** — velocity/tangent facing with hysteresis, distance-aware walking cadence, stable anchor, and world-scaled bodies.
3. **Continuous runtime and performance** — stable RAF ownership, cached derivations, staggered tasks, and isolated/throttled React UI commits.
4. **Static and dynamic collision** — footprint-aware segment validation, spatial hash, reservations, deterministic yielding, and recovery.
5. **Workstation placement** — derived anchors/facing, reservations, phased arrival, release, and debug overlay.
6. **Diagnostics and tests** — Advanced metrics and focused coverage for the 65-item checklist.
7. **Browser and release validation** — long-running QA at both desktop sizes, all npm gates, commit/push, and Node 18/20 CI.

## Per-milestone acceptance criteria

1. Baseline evidence identifies the exact recurring-pause mechanism and measured bottlenecks.
2. No sprite faces opposite actual velocity; stationary facing is stable; agent/furniture scale ratio is zoom-invariant.
3. One RAF remains mounted, no synchronized recurring pause occurs, and normal route planning does not stall unrelated agents.
4. Swept footprints remain outside modeled static obstacles and agents yield before material overlap.
5. Work agents reserve distinct valid anchors beside workstations and face the workstation while stationary.
6. Diagnostics remain under Advanced and automated tests cover all feasible checklist invariants without timing-sensitive stress assertions.
7. Browser evidence, commands, exact-head matrix, and repository hygiene all pass while PR #26 remains draft.

## Test strategy

- Pure runtime tests for direction hysteresis, distance cadence, delta clamping, static sweep checks, reservations, avoidance, starvation recovery, workstation selection/release, and determinism.
- Component tests for single RAF ownership, no routine loop restart, world scaling, card/overlay regressions, diagnostics, drag/click behavior, and reduced motion.
- Existing full suite plus all eight required commands.

## Visual-validation strategy

- Capture baseline and final browser evidence outside the repository at 1920×1080 and 1366×768.
- Measure sprite-to-desk and sprite-to-door ratios across minimum, fit, 0.5, 1.0, 1.5, and maximum zoom.
- Observe Office Engine for at least 60 seconds and collision/workstation scenarios for at least two minutes; collect one-second motion samples and performance metrics.
- Inspect final screenshots directly with `view_image`.

## Risks

- Provisional geometry can contain gaps that limit absolute collision guarantees; runtime must fail safely and report evidence rather than fabricate geometry.
- Overly conservative footprint inflation can close narrow valid doors.
- Dynamic avoidance can deadlock without deterministic priority aging and replan throttling.
- Imperative rendering can diverge from React state unless ownership and snapshot boundaries are explicit.
- Source sheets may not contain directional views requested by the brief; truthful fallback must remain visible in diagnostics.

## Decision log

- 2026-08-04: keep existing branch/PR and exact required start.
- 2026-08-04: no ImageGen asset pass; this is underlying runtime debugging in an accepted existing visual system.
- 2026-08-04: retain one RAF/shared sprite runtime and cached static graph architecture.

## Progress log

- 2026-08-04: verified exact starting head and clean worktree.
- 2026-08-04: completed clean dependency installation and began targeted runtime/sprite audit.

## Remaining work

- Complete baseline browser profiling and root-cause analysis.
- Implement milestones 2–6 with focused tests.
- Complete long-running browser validation and all command gates.
- Commit, push, confirm final Node 18/20 CI, and leave PR #26 draft.
