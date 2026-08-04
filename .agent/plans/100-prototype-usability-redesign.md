# Prototype Usability Redesign

Status: in_progress
Plan ID: 100
Owner: Codex
Reviewer: TBD
Created: 2026-08-04
Last Updated: 2026-08-04
Related Task: Office Engine ambient simulation and Agent Simulation simplification
Related Branch: codex/pr24-runtime-repair
Related Pull Request: #26

## Executive Summary

Replace the candidate sandbox's dense route-review workflow with two deliberately different experiences sharing one candidate graph, viewport transform, agent renderer, route planner, door policy, and animation clock. Office Engine becomes a deterministic ambient preview with 20 agents and minimal controls. Agent Simulation becomes a direct Add agent -> click office -> walk debugging flow with up to 25 agents, compact overlay controls, and advanced diagnostics collapsed by default. Candidate geometry remains unverified and source registration data remains untouched.

## Goal

Deliver a visible, responsive prototype where Office Engine automatically shows varied office activity and Agent Simulation supports deterministic agent creation, selection, click-to-walk, global overlay visibility, and all-open prototype doors without duplicate transforms or animation loops.

## Background and Context

The previous repair unified the visible modes on the React/SVG Office Engine and removed the broken Phaser surface. It made the candidate graph inspectable but retained a review-oriented control model: named destination selection, preview/begin steps, numerous default overlays, and dense diagnostics. This task narrows the interaction model around direct manipulation and ambient simulation.

## Current Repository State

- Exact starting head: `fa3e1f92ea43a280c18b9ac9f4c73856b18b995d`.
- Branch and PR are correct and the worktree is clean.
- Candidate graph and immutable world data are cached.
- One component currently owns runtime agents, doors, routes, rendering, and the entire panel.
- Candidate mode currently initializes useful review overlays and two visible fixture agents.
- The strict reviewed loader and unverified candidate loader are separate.
- Generated Floor 1 and sprite artifacts are deterministic and passing.

## Source-of-Truth Files

- `AGENTS.md`
- `docs/AI_HUB_MARKUP_LEGEND.md`
- `docs/DOOR_ACCESS.csv`
- `docs/INTERACTIONS.md`
- `docs/ANIMATION_MANIFEST.md`
- `src/office/data/floor1/provisional/*.json`
- `src/office/floor1/navigation/candidateNavigation.ts`
- `src/components/office/OfficeViewport.tsx`
- `src/components/office/Floor1CandidateSimulation.tsx`

## Scope

- Shared prototype runtime and deterministic agent state.
- Agent fallback markers with transform-aware minimum screen size.
- Direct click-to-walk with click/drag discrimination and reachable-node snapping.
- 0-25 debug agents with deterministic IDs, names, and distributed spawns.
- Deterministic 15/20/25/30-agent ambient simulation.
- Prototype-open runtime policy for all 47 doors.
- Master and individual overlay controls.
- Compact debugger panel and ambient toolbar.
- Unit/component coverage and exact browser QA.

## Out of Scope

- Production approval of candidate registration.
- Mutation of candidate JSON, door semantics, or generated artifacts.
- Full dynamic agent-to-agent collision avoidance.
- Generated conversational text.
- A second canvas/Phaser runtime.
- New production sprite metadata or fabricated animation approval.

## Assumptions

- Provisional navigation nodes are suitable for a development-only sandbox.
- Existing sprite metadata may be used when valid; a code-native fallback marker remains mandatory.
- Prototype-open door state is an explicit development override and never reaches strict production behavior.
- Deterministic pseudo-random scheduling is acceptable for ambient activity.

## Known Unknowns

- How many graph components exist and which nodes offer the best broad spawn distribution.
- Whether every visual door point lies on a traversable component.
- Whether all current sprite sheets remain legible at fitted map scale.
- Browser responsiveness when rendering all optional graph edges plus 25 agents.

## Questions Requiring User Decision

None. The user supplied the interaction model, counts, labels, validation matrix, and draft-PR requirement.

## Architecture Decision

Create a single `OfficePrototypeRuntime` hook/controller backed by one requestAnimationFrame loop per mounted active mode. Keep static graph construction module-cached. Split rendering and controls into focused shared components: `AgentRenderer`, `OverlayControls`, `AgentSimulationPanel`, and `CompactOfficeToolbar`. Configure the runtime with `ambient` or `debug` mode rather than implementing separate engines.

## Alternatives Considered

- Extending the current monolithic component: rejected because it keeps UI, simulation, and rendering coupled.
- Reintroducing Phaser/canvas: rejected because it duplicates transforms and the prior implementation rendered at zero size.
- Direct linear movement: rejected because routes must follow the candidate graph.
- Editing candidate door JSON: rejected because the override must be runtime-only.

## Data Model

Runtime agent fields: stable ID, readable name, current point, current node ID, route, route point index/progress, movement state, activity state, target, speed, activity deadline, optional partner/workstation, direction, selected flag derived by controller, and deterministic spawn index. Runtime doors contain candidate door ID plus `open` and `locked: false` under policy `prototype-open`.

## File and Directory Changes

- Add focused runtime/controller and UI component modules under `src/components/office/` or `src/office/floor1/navigation/`.
- Refactor `Floor1CandidateSimulation.tsx`, `OfficeEngine.tsx`, `OfficeEngineCore.tsx`, and `OfficeViewport.tsx` only as needed for shared event flow.
- Update office/candidate CSS and tests.
- Update this plan and relevant documentation only; do not alter generated candidate data.

## Implementation Milestones

1. Baseline measurement and visual concept.
2. Shared runtime, prototype-open doors, and deterministic agent lifecycle.
3. Transform-aware renderer and click-to-walk interaction.
4. Compact debug panel and master overlays.
5. Ambient controller and minimal Office Engine toolbar.
6. Tests, responsive browser QA, validation, push, and CI monitoring.

## Detailed Task Breakdown

- Measure current DOM, viewport, agent marker, and control layout.
- Generate a compact two-mode UI concept using the existing office art as immutable context.
- Extract shared runtime types and pure deterministic helpers.
- Select unique spawn nodes from the main reachable component.
- Implement nearest reachable click target with maximum snap distance.
- Keep click separate from drag using a movement threshold.
- Render fallback markers above overlays with inverse-scale size compensation.
- Add deterministic ambient schedules with varied initial states.
- Implement master overlay snapshot/restore and grouped individual toggles.
- Hide diagnostics and door overrides behind collapsed advanced disclosure.
- Validate strict builder/source registration immutability.

## Validation Strategy

Run every requested npm command after implementation. Verify generated-artifact checks before and after to prove source data was not mutated. Inspect exact git diff and prohibit temporary QA output from the repository.

## Test Plan

Cover master overlay state, deterministic creation/removal/limits, distributed valid spawns, selection, coordinate conversion, route snapping, immediate movement, invalid clicks, drag suppression, Escape cancel, movement controls, shared-loop cleanup, ambient counts/states/reset, all-open doors, source immutability, and visible nonzero marker sizing.

## Visual Review Plan

Use the Browser plugin against the exact final commit at 1920x1080 and 1366x768. Exercise the full Agent Simulation, Office Engine, and door sequences. Capture screenshots outside the repository, inspect the generated concept and final render with `view_image`, and record measured visible counts/bounds/timings.

## Performance Considerations

- Cache the static graph and node indexes.
- Use one authoritative RAF per active runtime.
- Hold transient clock data in refs.
- Batch agent advancement into one state update per frame.
- Avoid rebuilding paths or large layer arrays on frame updates.
- Keep 25-agent creation deterministic and sub-frame where practical.

## Accessibility Considerations

- Preserve keyboard-focusable agents and named controls.
- Escape cancels commands.
- Status/errors use live regions.
- Destructive actions are visually distinct.
- Disabled add controls communicate the 25-agent limit.
- Reduced motion retains visible state without unnecessary animation.

## Security and Data Integrity

No external data, credentials, or persistence are added. Candidate registration and generated artifacts are treated read-only. Prototype-open is explicitly scoped to candidate development runtime.

## Risks and Mitigations

- Dense SVG graph hurts responsiveness: overlays default off and render only when requested.
- Sprite assets are too small or fail: fallback marker is always visible and sized in screen space.
- Disconnected graph targets: add deterministic prototype-only door-threshold connectors, then reject clicks that remain too far from navigation geometry.
- Ambient agents stack: deterministic distributed spawns and small screen-space offsets.
- RAF duplication on tab switching: active-mode gate plus cleanup tests.

## Rollback Strategy

The redesign is isolated to React/runtime modules and can be reverted as one commit. Generated data is not changed. Existing route planner tests remain the regression boundary.

## Decision Log

- 2026-08-04: Keep React/SVG shared engine; do not reintroduce Phaser.
- 2026-08-04: Treat all-open doors as a named prototype-only runtime policy.
- 2026-08-04: Prefer direct map commands over destination dropdowns.
- 2026-08-04: Preserve the existing clean office master without generated replacement art.

## Progress Log

- 2026-08-04: Confirmed required starting head, branch, clean worktree, and existing PR scope.
- 2026-08-04: Read repository authority, source-of-truth documents, implementation, tests, and applicable skills.
- 2026-08-04: Created redesign plan before application changes.
- 2026-08-04: Implemented the shared deterministic prototype runtime, transform-aware fallback renderer, compact debugger, ambient controller, and prototype-open door policy.
- 2026-08-04: Verified direct click-to-walk movement, 25 visible agents, overlay snapshot/restore, 47/47 open doors, and a 4,860px route through D28, D25, and D24 in the browser.
- 2026-08-04: Completed 1920x1080 and 1366x768 visual QA; inspected both generated concepts and final renders outside the repository.
- 2026-08-04: Passed clean install, typecheck, lint, 422 tests, generated-artifact checks, production build, and production-bundle audit.

## Unexpected Discoveries

- The current candidate component already caches the immutable graph but still owns nearly every mutable concern.
- Existing sprite rendering uses fixed world scaling, which explains poor readability when the 8192x5460 office is fitted.
- The candidate walk segments are split into components at doorway gaps. The prototype runtime now adds deterministic, runtime-only threshold connectors while preserving the strict reviewed graph and source JSON.
- UI controls initially bubbled into the world click handler; the panel now owns and stops its click events while the viewport's existing drag threshold suppresses movement commands after panning.

## Manual Review Items

- Visual balance of 20 ambient agents.
- Readability of fallback markers at both required viewports.
- Click-to-walk accuracy after pan and zoom.
- Responsiveness with 25 agents and optional overlays.
- Believability of mixed working, walking, idle, and talking states.

## Completion Criteria

- Add agent -> click office -> graph-routed movement works without advanced controls.
- 0-25 debug agents remain visible and selectable.
- Master overlay hides/restores every diagnostic category while preserving office and agents.
- Office Engine starts with about 20 varied ambient agents and minimal controls.
- All 47 candidate doors are open/unlocked/traversable in prototype runtime only.
- Requested tests, browser sequences, local commands, and Node 18/20 CI pass.
- PR #26 remains draft.

## Final Report

Implementation and local/browser validation complete. Pending exact final SHA, push, and replacement Node 18/20 CI results.
