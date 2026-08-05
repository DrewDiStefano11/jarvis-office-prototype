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

## PR #26 CI state-model repair addendum (2026-08-05)

### Goal and current repository state

Repair TS2367 at `Floor1CandidateSimulation.tsx:309` on exact branch head
`0f2e382f1dc1c1f24aa5e111a6a64d33391bcf2d`, retain the existing motion and
workstation design, commit the omitted current sprite artifacts, validate the
exact committed tree, push normally to draft PR #26, and stop after both CI
matrix jobs are green. Local and remote heads matched before editing. The
worktree contained two uncommitted generated sprite outputs; the official
`check:sprites-generated` command confirms those outputs are required by the
committed direction-aware generator.

### Scope and out of scope

- Correct the activity scheduler so a scheduled desk-work intent reaches the
  existing `assignPrototypeWork` transition.
- Strengthen runtime tests for routing, work phase, stationary behavior,
  occupancy retention, cancellation, and task replacement.
- Include only the two generator-confirmed sprite outputs omitted from the
  prior motion-refinement commit.
- Run clean-install, committed-tree, browser, remote-SHA, PR-description, and
  Node 18/20 workflow validation required by the repair prompt.
- Do not alter geometry, access, dependencies, compiler/CI settings, PR draft
  state, branch history, or production trust boundaries.

### Architecture and data model decision

Keep the existing separated model: `movementState` is authoritative for
physical motion; the discriminated `task.kind/phase` is authoritative for task
lifecycle; `activityState` is the UI/animation activity projection; and
`workstationId` is the occupancy reservation. Do not add `working-at-desk` to a
movement union or suppress the compiler. Preserve the scheduler's
`working-at-desk` intent until `assignPrototypeWork` creates a `work/traveling`
task; arrival then advances through `approaching` to `working`, while idle,
replacement, drag, reset, and removal paths clear `workstationId`.

### Milestones and acceptance criteria

1. Reproduce and explain the exact CI error and local/CI discrepancy.
2. Make the scheduler branch reachable without weakening types; focused tests
   prove work arrival, stationary occupancy, and release transitions.
3. Run every required local gate after `npm ci`, inspect the staged patch, and
   commit only intentional files.
4. Re-run typecheck and the complete test suite against the exact commit, leave
   an empty worktree, and verify the pushed remote SHA byte-for-byte.
5. Complete the specified browser workflow, update the PR body truthfully, and
   verify every required step succeeds in both Node matrix jobs.

### Test, visual validation, risks, and rollback

Use Vitest runtime/component coverage plus TypeScript control-flow validation;
run all generated and production exclusion checks. Browser QA must exercise the
full work-at-desk transition and release flow, pause/resume, click movement,
drag rollback, diagnostics, scaling, and collision behavior at both routes.
The main risk is confusing scheduled activity with authoritative task phase;
the mitigation is to assert all four relevant fields. The candidate geometry
remains unverified and unchanged. Rollback is the single repair commit; no
history rewrite or force push is permitted.

### Decision and progress log

- 2026-08-05: Verified local HEAD, remote branch, and PR head all equal the
  required starting SHA; PR #26 is open, draft, mergeable, and unmerged.
- 2026-08-05: Reproduced TS2367 locally. `scheduledActivity` was narrowed by a
  rewrite from `working-at-desk` to `idle` immediately before the work branch,
  making the comparison unreachable even though runtime work state is valid.
- 2026-08-05: Found the prior final tree was not what the claimed local checks
  described: committed source fails typecheck, while two generated artifacts
  needed by the committed generator remained only in the working tree.
- 2026-08-05: Browser QA found the authoritative `work/working` task, working
  sprite, stationary position, and workstation reservation could coexist with a
  stale `idle` activity projection. The generic arrival-settling branch reset
  already-working agents to idle on later ticks; it now preserves the domain
  task projection so accessible labels, diagnostics, and styling stay truthful.
- 2026-08-05: Current-tree clean-install validation passes typecheck, lint, 457
  tests across 40 files, both generated checks, production build, production
  bundle exclusion, and `git diff --check`.
- 2026-08-05: Browser QA passes both routes at 1920x1080 and 1366x768 with a
  truthful work transition, stationary reserved worker, concurrent movement,
  pause/resume, cancellation/release, click-to-walk, zoom scaling, and clean
  console. Browser automation did not emit pointer-move events for its drag
  gesture; the dedicated component test remains the invalid-drop evidence.

### Remaining work

- Inspect and commit the staged repair, validate the exact committed tree,
  repeat exact-SHA browser smoke, push, update the PR body, and monitor the
  exact-SHA Node 18/20 workflow to green.
