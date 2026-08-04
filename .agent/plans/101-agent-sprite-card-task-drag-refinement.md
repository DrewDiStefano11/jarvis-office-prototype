# Agent sprite, card, task, and drag refinement

## Goal

Refine the existing Floor 1 candidate sandbox on `codex/pr24-runtime-repair` so its 25-agent simulation uses repository sprite assets, exposes polished per-agent task controls and diagnostics, and supports safe graph-snapped repositioning without changing the authoritative office transform or navigation policy.

## Current repository state

- Starting head: `01f4d502c4a1bcc69d11c571267205e092b8ae3c`.
- PR #26 remains draft.
- Candidate runtime already has one simulation `requestAnimationFrame`, open-door prototype routing, deterministic agents, overlays, and a compact debugger.
- `SpritePlayer` already provides manifest resolution, validation, texture caching, reduced-motion fallback, and a shared sprite clock, but the candidate runtime does not use it and running both clocks would violate the one-loop requirement.
- Candidate agents currently render as circular markers and have implicit activity fields rather than an explicit task state.

## Scope

- Externally clocked `SpritePlayer` playback and diagnostics.
- Stable sprite assignment, directional movement states, fallback marker only on resolution/load failure.
- Screen-space selected-agent card with task actions and advanced sprite/runtime diagnostics.
- Typed discriminated task state for walking, working, talking, wandering, idle/stopped, and repositioning.
- Pointer-captured drag reposition in Agent Simulation only, with threshold, valid snap preview, invalid revert, and Escape cancellation.
- Deterministic ambient work/talk/walk variation.
- Focused unit/integration tests, browser QA, full repository validation, commit, push, and GitHub Actions verification.

## Out of scope

- Production approval of provisional Floor 1 geometry or sprite assignments.
- Dynamic inter-agent collision avoidance.
- New sprite artwork, geometry, door policy, or pathfinding engine.
- Enabling drag mutation in Office Engine ambient mode.

## Source files

- `src/components/office/Floor1CandidateSimulation.tsx`
- `src/components/office/PrototypeAgentRenderer.tsx`
- `src/components/office/OfficeViewport.tsx`
- `src/components/office/SpritePlayer.tsx`
- `src/components/office/floor1-candidate-simulation.css`
- `src/office/floor1/navigation/prototypeRuntime.ts`
- existing sprite manifest, resolver, runtime, tests, and generated sprite assets

## Assumptions and known unknowns

- Existing generated `agent-sheet-01` through `agent-sheet-16` assets remain the only valid visual source.
- Stable modulo assignment is acceptable while explicitly labeled provisional.
- The candidate graph's reachable walk nodes are the reposition snap surface; invalid/off-map drops revert.
- Workstation destinations may be provisional and should be reported as such in the card.
- Browser image loading behavior must be verified because jsdom does not decode sprites.

## Architecture decision

Keep the current candidate simulation as the sole animation owner. Add an optional external elapsed-time input to `SpritePlayer`; when present, it computes frames without subscribing to `SpriteSurfaceRuntime.clock`. Reuse one `SpriteSurfaceRuntime` only for its texture cache. Render the agent card through a viewport-local overlay host outside the transformed office surface. Keep drag state local to the candidate simulation and convert pointer coordinates with the existing transform contract.

## Data model

Use a discriminated `PrototypeTask` union with task-specific fields and phases. Store task start time as deterministic simulation elapsed milliseconds. Keep movement state orthogonal. Expose pure helpers for task assignment, arrival transitions, room lookup, sprite state mapping, and reachable graph snapping.

## Milestones and acceptance criteria

1. **Sprite integration** — every candidate agent requests a stable manifest asset/state/direction; the real sprite is visible on successful load; fallback marker appears only on failure; all playback uses the simulation clock.
2. **Task runtime** — every agent has a valid discriminated task; walk/work/talk/wander/idle/stop transitions are deterministic and arrival-aware; ambient talk partners are reciprocal and work tasks have destinations.
3. **Agent card** — selected card follows and clamps in viewport, shows identity/activity/task/location, supplies all required actions, and exposes resolver/frame/fallback diagnostics.
4. **Drag reposition** — debug mode supports pointer capture and a screen-space drag threshold, shows original/snap feedback, commits only a reachable snap, reverts invalid drops, and cancels with Escape; ambient mode is read-only.
5. **Verification** — focused tests cover behaviors and interaction boundaries; full commands pass; browser QA passes at 1920×1080 and 1366×768; pushed exact head has green Node 18 and Node 20 jobs; PR remains draft.

## Test strategy

- Pure runtime tests for deterministic sprite assignment, task unions/transitions, snapping, room resolution, direction/state mapping, and ambient pair invariants.
- Component tests for external sprite clock, card actions, selection, drag threshold/capture/snap/revert/Escape, debug-only mutation, and diagnostics.
- Existing regression suite plus all requested npm commands.

## Visual-validation strategy

- Compare implementation against the preview concept at both requested desktop sizes.
- Verify sprites remain readable at fit zoom, selected ring/card tracking, clamping, no panel overlap, route feedback, valid/invalid drag states, and Office Engine read-only behavior.
- Inspect the final screenshot directly after browser QA.

## Risks

- Sprite anchor and fit-zoom compensation can make hit targets drift from agent feet.
- Portaled card coordinates can be wrong if transform telemetry differs from the rendered surface.
- Pointer capture can conflict with viewport pan unless propagation is stopped from pointer-down onward.
- Updating all agents each frame can produce avoidable rerenders; state changes remain batched under the existing single loop.

## Decision log

- Use the existing sprite manifest/resolver/player; do not create sprite artwork.
- Use externally clocked frames rather than a second sprite RAF.
- Use viewport-local portal for the card and drag banner.
- Use reachable walk nodes for deterministic reposition snapping.
- Keep provisional/open-door warning language visible.

## Progress log

- 2026-08-04: verified exact branch/head and clean worktree.
- 2026-08-04: audited candidate runtime and sprite stack.
- 2026-08-04: generated and inspected preview-only interaction concept.
- 2026-08-04: integrated real externally clocked sprites, task union, agent card, ambient behaviors, and debug drag/snap flow.
- 2026-08-04: expanded focused coverage to 45 tests; full suite passes 443 tests across 40 files.
- 2026-08-04: completed Chromium QA at 1920×1080 and 1366×768 with 20/25 visible real sprites, zero visible fallbacks, and 42px minimum sprite bounds.
- 2026-08-04: completed the final callback-stability cleanup and reran every requested validation command successfully.

## Remaining work

- Commit and push the existing branch.
- Reload and capture exact-commit browser evidence.
- Monitor all GitHub Actions jobs and report exact head while leaving PR draft.
