# Floor 1 Universal Navigation Reachability

Status: in_progress
Plan ID: 105
Owner: Codex
Reviewer: TBD
Created: 2026-08-06
Last Updated: 2026-08-06
Related Task: Floor 1 universal navigation and reliability goal
Related Branch: codex/floor1-universal-navigation-reachability
Related Pull Request: TBD (draft only)

## Executive Summary

Replace the PR #27 prototype's sparse manual walk-line authority and fixed 620-pixel endpoint envelope with one deterministic, clearance-aware continuous Floor 1 navigation authority. A generated hybrid clearance field will model every agent-footprint-valid interior floor location, explicit interior doorway apertures, exterior boundaries, and footprint-inflated walls/objects. Runtime projection, arbitrary-start recovery, route search, safe smoothing, door transitions, destination replacement, traffic recovery, diagnostics, and reachability certification will consume the same revisioned representation.

Success means every legitimate clearance-valid interior sample belongs to one bidirectionally navigable component, arbitrary valid starts and targets work without node proximity, invalid drops project to the intended room and wall side, D46 is resolved from visual/geometric evidence, temporary congestion does not permanently fail a valid request, 50 agents remain responsive, PR #27 drag/portal/animation/UI behavior remains covered, and the resulting draft PR remains open, unmerged, and not ready for review.

The candidate registration remains explicitly unverified and must not be described as production-approved. This plan changes navigation behavior and evidence, not registration approval status.

## Goal

From any clearance-valid Floor 1 source point, route an agent naturally and collision-safely to any other clearance-valid interior point; project invalid destinations and recover invalid starts without crossing walls; prove 100% of valid adaptive samples are in the expected interior component; preserve reversible door topology, PR #27 interaction/portal/motion behavior, and responsive operation with up to 50 agents; publish deterministic computational and visible-browser evidence on a draft, unmerged PR.

## Background and Context

PR #27 merged into `main` as `14ccd4f937c2b0b67d24627e86776ca9373d3af1`. It preserved drag-to-route, accepted-destination preview, portal dissolve phases, 1-50 agents, hover/selection labels, pan/zoom, displacement-derived facing, gait continuity, activity sprites, doorway reservations, local waiting/sidestepping, route metrics, browser QA, and production exclusion. It also intentionally left D46 unsupported and still routes primarily on registered walk segments/nodes.

The present code limits route candidates and door endpoints to `PROTOTYPE_CLICK_SNAP_LIMIT = 620`, requires a sparse-network start, stops after one bounded replan, can set `route-failed`, uses manual D01 bridge coordinates, and reports disconnected walk-network failures. These behaviors cannot satisfy arbitrary valid endpoints or universal interior coverage.

## Current Repository State

- Framework: React 19, TypeScript 5.7, Vite 6, Vitest 4; React/SVG/DOM office runtime.
- Package manager: npm with `package-lock.json`.
- Starting main SHA: `14ccd4f937c2b0b67d24627e86776ca9373d3af1`.
- PR #27: confirmed merged on 2026-08-06; merge commit equals starting SHA.
- Branch: `codex/floor1-universal-navigation-reachability`, created directly from `origin/main`.
- Initial worktree/index: clean.
- Master image: `public/assets/office/office-8192x5460.png`, 50,161,177 bytes; repository validators assert 8192 x 5460.
- Markup: nine single-page PDF sources; nominal PDF canvas 4608 x 3072; embedded common background 6144 x 4096; 867 extracted records.
- Registration: scale `1.3333333333333333`, offset `(0, -0.6666666666665151)`, no landmarks, `candidate-unverified`, `approved: false`.
- Geometry: 69 room annotations, 131 walk-path annotations, 62 wall annotations, 105 object annotations, 47 door polygons/IDs, 205 position annotations, 44 computers, six major interactives.
- Existing runtime: candidate graph with room polygons, polyline/thickness colliders, sparse sampled walk nodes and segments; prototype compatibility runtime adds traffic, portals, tasks, rendering telemetry, drag-to-route, and 1-50 agents.
- Existing provisional `navigation.json`: empty review-only cells/routes and warns that visual review is required.
- Existing D46: Focus D to RM10 circulation, yellow missing-light/event access in the authority CSV; PR #27 portal audit rejects its registered threshold because it is about 1,218.88 source pixels from the nearest collision-clear Focus D support point.
- Baseline commands after clean install:
  - `npm ci`: pass after stopping the prior workspace Vite process that locked esbuild/rollup.
  - `npm run typecheck`: pass.
  - `npm run lint`: pass.
  - `npm test`: 472/472 tests, 40/40 files pass.
  - `npm run check:floor1-generated`: pass, 65 files / 11,568,585 bytes.
  - `npm run check:sprites-generated`: **pre-existing baseline failure**; drift reported for `manifest.json`, `sprite-inventory.json`, and `sprite-inventory.md` while the Git worktree remains clean.
  - `npm run build`: pass outside the filesystem sandbox; sandboxed esbuild cannot read required parent config paths.
  - `npm run check:production-bundle`: pass.
- Baseline browser: both normal and candidate routes load the same authoritative 8192 x 5460 surface; normal view initially shows 20 ambient agents and the PR #27 controls.
- Repository layout: authoritative runtime data/tests live under `src/office/data/floor1` and `src/**`; root `data/` and root `tests/` do not exist.

## Source-of-Truth Files

| File | Controls |
|---|---|
| `AGENTS.md` | Repository rules, coordinate authority, phase gates, safety, validation |
| `docs/AI_HUB_MARKUP_LEGEND.md` | Markup meaning and positive-walkable/collision precedence |
| `docs/DOOR_ACCESS.csv` | D01-D47 identity, access, zones, lights, manual-review metadata |
| `docs/INTERACTIONS.md` | Drag/selection, navigation, door, failure, accessibility behavior |
| `docs/ANIMATION_MANIFEST.md` | Foot anchors, displacement/facing/gait, portal and reduced-motion contracts |
| `.agent/PLANS.md` | Living-plan and evidence standard |
| `.agent/plans/103-floor1-agent-motion-routing-portals.md` | PR #27 precursor decisions and known sparse-routing limitations |
| `.agent/plans/104-pr27-manual-qa-salvage.md` | Final PR #27 behavior/evidence and D46 limitation |
| `public/assets/office/office-8192x5460.png` | Visual appearance and final alignment authority |
| `src/office/data/floor1/provisional/*.json` | Candidate room, walk, wall, object, door, anchor data |
| `artifacts/production-floor1/registration-candidate.json` | Candidate registration values and source hashes |
| `src/office/floor1/navigation/candidateNavigation.ts` | Current graph/collision/door route primitives |
| `src/office/floor1/navigation/prototypeRuntime.ts` | PR #27 drag routing, portals, traffic, tasks, motion |
| `src/components/office/OfficeViewport.tsx` | Authoritative world/client/pan/zoom conversion |
| `src/components/office/Floor1CandidateSimulation.tsx` | Shared Office Engine/Agent Simulation runtime and development UI |
| `artifacts/debug/pr27-terminal-browser-qa.mjs` | Retained browser QA authority to extend |

## Scope

- [x] Generate one deterministic, revisioned hybrid clearance field from authoritative candidate source geometry.
- [x] Validate finite/bounded/nondegenerate geometry, source revisions, door apertures, and checksums fail-closed.
- [x] Replace sparse-node endpoint authority with continuous validity and same-room/same-side projection.
- [x] Route from arbitrary valid starts, recover invalid starts, and reject only true exterior/nonexistent space.
- [x] Prove all valid adaptive interior samples share one expected component and routes are reversible.
- [x] Classify all doors as interior, exterior, or malformed; fully resolve and document D46.
- [x] Add deterministic route search, collision-safe line-of-sight smoothing, and quality metrics.
- [x] Preserve closed-door portal presentation and continuous walking through explicitly open interior doorways.
- [x] Implement request/revision IDs, stale-result rejection, route replacement, and preview/commit consistency.
- [x] Extend waiting/local avoidance/reservations into fair bounded retry/replan behavior without permanent congestion failure.
- [x] Validate all spawns, workstations, room anchors, queues, portal exits, and reset/reload positions.
- [x] Bound revision-keyed route caches and replay evidence.
- [x] Extend the existing development UI with reachability/clearance/component/route/projection diagnostics.
- [x] Add deterministic report/replay scripts, automated coverage, compact evidence, and production-bundle guards.
- [x] Extend the retained PR #27 browser runner and run representative visible routes plus a ten-minute 50-agent active test.
- [ ] Commit in logical checkpoints, push exact validated SHA, open a draft PR, and wait for Node 18/20 CI.

## Out of Scope

- Production approval of the candidate markup registration.
- New sprite-sheet generation, character designs, departments, floors, backend orchestration, inventory, or minimap.
- Recoloring/regenerating/destructively editing the clean master image.
- Replacing the established office viewport or broad component library.
- Inventing exterior destinations or using portals as arbitrary long-range teleportation.
- Merging, enabling auto-merge, or marking the PR ready for review.

## Assumptions

| ID | Assumption | Confidence | Evidence | Impact if wrong |
|---|---|---:|---|---|
| A-105-01 | Room polygons cover every intended interior floor zone, including circulation areas. | Medium | 69 named/zone records and current overlays | Positive-space generation needs image-guided repairs if coverage gaps are real. |
| A-105-02 | Existing wall/object polyline thickness plus footprint inflation can conservatively model static collision. | Medium | Current collision tests and PR #27 browser evidence | Individual collider repairs may be required; provenance must record them. |
| A-105-03 | A 48-source-pixel clearance lattice plus continuous arbitrary endpoints is fine enough for a 68-pixel footprint. | High | 7,729 valid cells, adaptive boundary/door/anchor sampling, 100% expected coverage | Revisit only if approved geometry later exposes a narrower legitimate passage. |
| A-105-04 | Runtime generation is deterministic and fast enough when built once and cached by revision. | High | Approximately 0.5-second one-time build; zero rebuilds in the 613-second soak | Pre-generation is unnecessary for the candidate runtime. |
| A-105-05 | PR #27 portal visuals remain appropriate for visually closed interior doors. | High | Explicit user decision and existing accepted behavior | Door classification controls whether physical traversal or portal presentation is used. |

## Known Unknowns

| ID | Unknown | Blocks phase? | Resolution method | Safe temporary behavior |
|---|---|---:|---|---|
| U-105-01 | Exact clearance-valid union of room polygons near open circulation seams. | Yes for certification | Generate overlays, inspect source artwork, compare adaptive components | Fail reachability check; do not hide regions. |
| U-105-02 | Which boundary doors truly lead outside modeled space. | Yes per door | CSV zones + clean-image overlay + room membership on both sides | Classify unresolved as malformed and fail publication. |
| U-105-03 | Correct D46 aperture/approach/exit geometry. | Yes | Inspect clean master, door/room/wall/object overlays and both-side clearance | Keep D46 failing until evidence supports a repair/classification. |
| U-105-04 | Cause of baseline sprite generation drift. | No for navigation, yes for final gate | Diff temporary regenerated artifacts and pipeline inputs | Preserve working tree; fix only if deterministic and in-scope. |
| U-105-05 | Browser heap measurement availability in selected browser surface. | No | Use exposed performance APIs/cache counters; state limits honestly | Prove bounded caches directly and report heap as unavailable if unsupported. |

## Questions Requiring User Decision

None. The three goal files explicitly authorize navigation architecture and geometry repairs and define all product decisions. Ask only if later evidence presents a true mutually exclusive product decision not resolvable from source/image data.

## Architecture Decision

### Selected Approach

Use a deterministic **hybrid clearance field**:

1. Build positive floor space from registered room/zone polygons plus valid walk-path support where needed.
2. Subtract wall/object colliders inflated by the 34-pixel foot radius plus configurable preferred clearance.
3. Rasterize valid floor centers on a 48-pixel world lattice, with deterministic boundary/door/narrow-space evidence and explicit aperture links.
4. Store compact cells, eight-neighbor clearance-safe edges, room/component membership, distance-to-static-obstacle, door links/classification, provenance, configuration, source checksum, and navigation revision.
5. Project arbitrary points continuously using exact point validity, cell candidates, boundary refinement, room/wall-side intent, and deterministic tie-breaking.
6. Attach arbitrary start/target points to collision-clear nearby cells; recover invalid starts on their intended side.
7. Search with deterministic A* using distance, clearance, turn/smoothness, door, and congestion costs; validate every edge.
8. Smooth using collision-checked line-of-sight string pulling plus clearance-aware corner offsets; never smooth across portal boundaries.
9. Keep a compatibility adapter that returns the PR #27 route/door-step structures so motion, portals, activities, and rendering migrate incrementally.

### Why It Fits

- Scales to the 8192 x 5460 world without a large engine or third-party dependency.
- Covers continuous floor regions rather than only manual line vertices.
- Provides deterministic component proof and compact reproducible artifacts.
- Supports arbitrary endpoints, footprint clearance, explicit doors, smoothing, debug overlays, and predictable performance.
- Preserves exact world coordinates and OfficeViewport transforms.
- Allows sparse walk lines to remain provenance/semantic hints rather than runtime authority.
- Can be generated once, cached/shared across 50 agents, and validated fail-closed by revision.

## Alternatives Considered

### Constrained polygonal navmesh/triangulation

Advantages: compact routes, natural funnel smoothing. Disadvantages: robust polygon union/difference/offset/triangulation is high-risk without a focused dependency; current geometry is polyline/thickness based and unverified. Decision: defer unless the grid proves insufficient.

### Dense grid without explicit door/room topology

Advantages: simplest generation/search. Disadvantages: may connect across walls through sampling artifacts and cannot preserve portal/access semantics clearly. Decision: reject; use explicit apertures and semantic links.

### Visibility graph over obstacle vertices

Advantages: short routes and small graph. Disadvantages: fragile around complex inflated polylines, room coverage, narrow spaces, and projection/component certification. Decision: reject as sole authority; use line-of-sight only for smoothing.

### Extend sparse manual lines and snap radius

Advantages: smallest diff. Disadvantages: cannot prove arbitrary continuous coverage, encourages D46 envelopes/bridges, and directly contradicts the goal. Decision: reject.

## Data Model

Planned public concepts (names may adapt while invariants remain):

```ts
type NavigationRevision = string;
type NavigationCellId = string;

interface Floor1NavigationArtifact {
  schemaVersion: 1;
  navigationRevision: NavigationRevision;
  sourceGeometryRevision: string;
  world: { width: 8192; height: 5460 };
  footprint: { radius: number; preferredClearance: number; emergencyClearance: number };
  lattice: { baseSpacing: number; boundarySpacing: number };
  cells: NavigationCell[];
  doors: NavigationDoorLink[];
  components: NavigationComponent[];
  provenance: NavigationProvenance;
}

interface NavigationProjection {
  requestId: string;
  navigationRevision: NavigationRevision;
  requestedPoint: Point;
  acceptedPoint: Point;
  distance: number;
  requestedRoomIds: readonly string[];
  acceptedRoomIds: readonly string[];
  sameWallSide: boolean;
  exact: boolean;
  reason: string;
}

interface NavigationRoute {
  requestId: string;
  navigationRevision: NavigationRevision;
  rawPoints: readonly Point[];
  points: readonly Point[];
  doorSteps: readonly CandidateDoorStep[];
  metrics: RouteQualityMetrics;
}
```

Invariants: finite bounded coordinates; stable IDs independent of array order; current revision on every route/projection/cache key; no stale artifact fallback; bidirectional ordinary edges unless explicitly one-way; every edge/segment clearance-validated; every component/cell has provenance; door crossings only through explicit aperture links; caches bounded.

## File and Directory Changes

| Path | Action | Purpose |
|---|---|---|
| `.agent/plans/105-floor1-universal-navigation-reachability.md` | Create/update | Living plan, evidence, decisions, findings |
| `src/office/floor1/navigation/continuousNavigation.ts` | Create | Artifact schema, geometry validation, field build, projection, A*, smoothing |
| `src/office/floor1/navigation/continuousNavigation.test.ts` | Create | Deterministic unit/component/projection/route tests |
| `src/office/floor1/navigation/reachability.ts` | Create | Adaptive sampling, certification, replay case model |
| `src/office/floor1/navigation/candidateNavigation.ts` | Modify | Expose/reuse validated source geometry and compatibility types |
| `src/office/floor1/navigation/prototypeRuntime.ts` | Modify | Migrate routing/recovery/revisioning/retry/fairness/metrics |
| `src/components/office/Floor1CandidateSimulation.tsx` | Modify | Request lifecycle, preview consistency, debug overlays/telemetry |
| `src/components/office/PrototypeAgentRenderer.tsx` | Modify if needed | Recovery/route/replan diagnostics without duplicate visuals |
| `src/components/office/floor1-candidate-simulation.css` | Modify | Development-only reachability visualization |
| `scripts/check-floor1-reachability.mjs` | Create | Deterministic report/replay CLI |
| `scripts/generate-floor1-navigation.mjs` | Create if pre-generation is selected after measurement | Artifact generation/checksum validation |
| `package.json` | Modify | Reachability/replay commands |
| `artifacts/debug/floor1-reachability/**` | Generate | Compact JSON/Markdown/selected visual evidence |
| `artifacts/debug/pr27-terminal-browser-qa.mjs` | Modify | Extend retained browser QA without removing assertions |
| Existing focused tests | Modify/add | Stronger continuous-navigation expectations |

## Implementation Milestones

### Milestone 1 — Baseline Connectivity and Geometry Audit

Status: completed

Tasks: generate sparse-baseline component report; enumerate failure causes; inspect all doors/D46; record coordinate spaces; capture representative browser failures.

Acceptance: deterministic baseline report identifies component counts, room/corner/door/anchor gaps and reproducible route cases; no application behavior changed.

### Milestone 2 — Revisioned Clearance Field

Status: completed

Tasks: geometry validators; positive-space/obstacle inflation; cells/edges; door classification/apertures; checksum/revision; fail-closed loader; caches.

Acceptance: deterministic rebuild/checksum; finite/bounded/nondegenerate cells/edges; no obstacle-crossing edges; D46 has evidence-backed status; build time measured.

### Milestone 3 — Continuous Projection, Recovery, and Universal Routing

Status: completed

Tasks: exact validity; same-room/same-side projection; arbitrary endpoint attachment; invalid-start recovery; A* costs; safe smoothing; assertions/metrics.

Acceptance: arbitrary cases route both directions; invalid drops preserve intent; no segment crosses collision; route metrics deterministic; no 620-pixel dependency.

### Milestone 4 — Runtime Request and Movement Reliability

Status: completed

Tasks: request/revision IDs; stale cancellation; preview/commit consistency; route replacement; portal-phase replacement rules; acceleration/deceleration integration; gait/facing preservation; reload/reset safety.

Acceptance: replacement never restores old route or teleports; preview initially matches execution unless reason recorded; reload/reset positions valid; PR #27 portal/gait behavior preserved.

### Milestone 5 — Fair Multi-Agent Traffic and Bounded Planning

Status: completed

Tasks: pending-valid-target state; waiting/sidestepping/queue/replan/alternate/retry sequence; fairness/ownership expiry; occupied-destination alternatives; planning queue/budget/cache telemetry.

Acceptance: temporary blockage never permanently yields route failure; no deadlock/livelock/starvation fixtures; 50 requests time-sliced; caches bounded; no static-geometry violation.

### Milestone 6 — Reachability Diagnostics and Deterministic Evidence

Status: completed

Tasks: adaptive sampler/component proof; all-room/door/anchor/random/boundary cases; replay command; development-only overlays; compact reports and visual evidence; production exclusion.

Acceptance: 100% legitimate valid samples connected; zero malformed geometry; bidirectional door/route coverage; failures replay by ID; normal game view clean.

### Milestone 7 — Full Browser/Soak/Publication Validation

Status: in_progress

Tasks: extend retained QA; two app routes; viewport/DPR/pan/zoom alignment; fixed visual cases; 50-agent test; ten-minute active run; full npm gates; diff cleanup; logical commits; push/draft PR/CI.

Acceptance: exact local/remote SHA match; local gates and Node 18/20 CI green; PR open/draft/unmerged/not-ready; requested final evidence complete.

## Detailed Task Breakdown

| Task ID | Task | Status | Dependency | Evidence |
|---|---|---|---|---|
| T-105-001 | Read goal addenda and mandatory repository docs | done | none | Complete file reads |
| T-105-002 | Fetch/verify PR #27 and create exact branch | done | T-105-001 | Starting SHA and GitHub PR metadata |
| T-105-003 | Run clean baseline matrix | done_with_failure | T-105-002 | Commands above; sprite drift recorded |
| T-105-004 | Inspect PR #27 architecture and browser baseline | done | T-105-002 | Source audit and browser snapshots |
| T-105-005 | Produce sparse-baseline connectivity report | done | T-105-004 | Deterministic artifact |
| T-105-006 | Implement/validate revisioned clearance field | done | T-105-005 | Unit tests, artifact checksum, overlay |
| T-105-007 | Classify doors and resolve D46 | done | T-105-006 | Door report and visual evidence |
| T-105-008 | Implement continuous projection/recovery/routing/smoothing | done | T-105-006 | Focused tests and replay cases |
| T-105-009 | Migrate PR #27 runtime compatibility and request lifecycle | done | T-105-008 | Runtime/component tests |
| T-105-010 | Implement fair congestion retries and bounded planning | done | T-105-009 | Traffic tests and metrics |
| T-105-011 | Add reachability CLI/report/replay and debug overlay | done | T-105-008 | JSON/Markdown/visual artifacts |
| T-105-012 | Extend browser QA and run visual/load/soak validation | in_progress | T-105-009,T-105-011 | QA report/screenshots |
| T-105-013 | Resolve baseline/final generation checks | done | T-105-006 | EOL-stable hashing and passing gate |
| T-105-014 | Final validation, commits, push, draft PR, CI | in_progress | all | SHAs, PR, CI runs |

## Validation Strategy

- Schema/geometry: reject non-finite, out-of-bounds, duplicate, zero-area, self-intersecting, sliver, invalid-door, obstacle-crossing, stale-revision data.
- Connectivity: adaptive valid samples, explicit components, boundary/door/corner/anchor coverage, 100% expected interior membership.
- Route correctness: reusable route assertion over every raw/smoothed segment and door sequence.
- Projection: same-room/same-side/obstacle/wall/door/outside cases with visible projection lines.
- Runtime: route replacement, stale requests, preview consistency, portal interruption, reload/reset, congestion fairness, bounded caches.
- Visual: fixed source landmarks and overlay/background alignment across viewports, pan/zoom, DPR when available.
- Performance: build/projection/search/smoothing/replan durations, queue depth, cache hit/size, longest operation, 50-agent and ten-minute sampling gaps.
- Publication: exact final commit reruns every required command, remote SHA comparison, Node 18/20 CI.

## Test Plan

### Unit

Geometry validity, inflation/clearance, point validity, projection intent, component IDs, arbitrary endpoints, recovery, A*, cost tie-breaking, smoothing, revision checks, bounded LRU caches, route assertions.

### Integration

Every room pair, every interior door both directions, D46 both directions if interior, exterior rejection, semantic anchors, preview/commit, route replacement, portal replacement, occupancy alternatives, fair retry/replan, reload/reset.

### End-to-End

Select/drag/preview/commit from arbitrary point -> project -> route -> wait/door/portal -> replan -> arrive; replace destination during normal walking, traffic, doorway approach, portal, replan, and near arrival; open associated workstation; release reservations.

### Regression

All retained PR #27 assertions plus 620-pixel failure, disconnected components, D46, through-wall snapping, stale route restoration, gait reset, single-replan permanent failure, cache growth, overlay drift.

## Visual Review Plan

- Full clearance-valid space and inflated obstacles.
- Component/unreachable overlay (zero legitimate failures at completion).
- All door classifications and aperture endpoints.
- D46 close-up with source coordinates and room/zone labels.
- Same-side wall and furniture projection.
- Representative long, narrow, corner, workstation, and door routes.
- Fixed calibration landmarks near four map corners, Central Nexus, and elevator.
- Normal/candidate views at 1920 x 1080 and 1366 x 768, zoom/pan/resize, DPR 1/1.25/1.5/2 where automation supports it.

## Performance Considerations

- Build static navigation once per source revision; share across agents/renders.
- The 48-pixel base lattice yields 7,729 collision-clear cells before authoritative-component filtering; build once and share it.
- Use spatial buckets for collider/neighbor/projection queries.
- Bound route/projection caches and replay records; include revision in every key.
- Queue/time-slice bursts; do not plan 50 requests synchronously in one frame.
- Measure rather than infer; routine route target is one animation-frame budget, with expensive work cached/queued.

## Accessibility Considerations

Preserve keyboard selection/controls, visible focus, accessible slider and agent names, Escape cancellation, text route/projection/access states, reduced-motion portal behavior, and clean status announcements. Debug colors receive text/ID labels; color is not the only diagnostic signal.

## Security and Data Integrity

Candidate geometry remains development-only and unapproved. Malformed/stale artifacts fail closed. Door access meanings remain authoritative; red cannot be bypassed and blue/yellow remain explicit/contextual. No debug teleports in production, no secrets/machine paths/browser profiles committed, no external dependency without license/maintenance/bundle review.

## Risks and Mitigations

| Risk ID | Risk | Likelihood | Impact | Mitigation | Trigger |
|---|---|---:|---:|---|---|
| R-105-01 | Room polygons/walk markups do not fully describe visible floor | High | Critical | Overlay/image-guided provenance repairs; fail certification rather than hide space | Legitimate visible samples excluded/disconnected |
| R-105-02 | Lattice misses narrow but valid passages | Medium | High | Boundary/door refinement; tune spacing; explicit aperture cells | Door/narrow sample disconnected |
| R-105-03 | Collider inflation blocks real aisles or permits scraping | High | High | Preferred/emergency clearance tiers and visual route QA | Coverage loss or wall/furniture contact |
| R-105-04 | D46 evidence conflicts with current registration | High | Critical | Inspect source artwork and record explicit correction/classification | No safe two-sided aperture |
| R-105-05 | 50-agent planning blocks rendering | Medium | High | Shared field, bounded caches, queue/time slicing, metrics | Long task/sample gap regression |
| R-105-06 | Runtime migration regresses PR #27 portals/gait/UI | Medium | Critical | Compatibility adapter and retained tests/runner | Any prior assertion/visual behavior fails |
| R-105-07 | Generated sprite baseline drift blocks final gate | Medium | Medium | Diagnose deterministic generator output separately; avoid blind expected update | Drift persists at final SHA |

## Rollback Strategy

Use logical checkpoint commits. Add the new navigation authority and compatibility adapter before retiring sparse assumptions. The prior PR #27 behavior remains recoverable by reverting runtime-integration commits while keeping audit artifacts. Generated navigation is derived and may be discarded/regenerated; never alter the clean master or approved source records. Do not maintain two silent runtime authorities: migration state must be explicit and tested.

## Decision Log

### D-105-001 — Use a hybrid clearance field

Date: 2026-08-06
Decision: Deterministic 48-pixel clearance lattice with adaptive certification, explicit door links, arbitrary connectors, A*, and safe line-of-sight smoothing.
Context: Source geometry is polyline/thickness based; current sparse network cannot cover continuous floor; no large engine/dependency is justified.
Alternatives: triangulated navmesh, pure grid, visibility graph, sparse-line extension.
Reason: Best balance of robustness, deterministic certification, performance, and incremental PR #27 migration.
Consequences: Must prove lattice coverage near boundaries/narrow spaces and preserve exact continuous projection beyond cell centers.
Affected Files: new continuous navigation/reachability modules, runtime, tests, diagnostics.

### D-105-002 — Preserve candidate-unverified trust state

Date: 2026-08-06
Decision: Navigation may be corrected and certified for the candidate runtime, but registration remains unverified/non-production-approved.
Context: Registration record has no calibration landmarks and explicit `approved: false`.
Alternatives: promote registration based on successful routing.
Reason: Routing success is not visual registration approval.
Consequences: Development warning and production exclusion remain mandatory.
Affected Files: plan, artifact metadata, UI/report wording.

## Progress Log

### 2026-08-06

- Read all three goal files completely and activated the substantive goal.
- Read mandatory repository documents and inspected assets/data/source/tests/build configuration.
- Confirmed PR #27 merged; fetched `origin/main`; created required branch at `14ccd4f937c2b0b67d24627e86776ca9373d3af1` from a clean worktree.
- Ran the baseline validation matrix; recorded the isolated pre-existing generated-sprite drift without changing expected output.
- Inspected PR #27 plans, merge diff, sparse candidate routing, fixed 620-pixel envelope, D01 manual bridge, D46 rejection, single-replan failure, portal/task/motion systems, and browser-loaded normal office.
- Selected the hybrid clearance-field architecture and created this plan before application code changes.
- Added the deterministic continuous clearance field, revision hashing over source geometry/walk support/cells/edges/doors, footprint-aware point and segment validation, explicit reversible door links, A* heap search, safe smoothing, and bounded LRU route caching.
- Replaced runtime click/drag route authority with the continuous-field compatibility adapter; drag preview and commit now share one route plan and reject stale agent revisions.
- Repaired D46 from clean-image evidence at source point `(7510, 2708)` while preserving candidate registration as unverified; D46 now has a reversible interior link and traversal coverage.
- Added adaptive positive-space bridging only where a complete collision-clear segment proves continuity. Raw components fell from 1,836 sparse components to six clearance-field components: one 7,467-cell authoritative interior component and five explicitly classified exclusions.
- Added adaptive reachability certification across uniform, room-boundary, collider-corner, door-aperture, anchor, and narrow-offset samples. Current result: 55,748 total samples, 15,901 authoritative valid samples, 100% expected-component coverage, 40/40 reversible interior doors, and 16/16 reversible representative routes.
- Changed temporary traffic stalls to bounded exponential replanning/waiting with aging priority; valid congested requests no longer become permanent `route-failed` tasks. True static endpoint failure still stops safely.
- Replaced sparse debug nodes/edges with sampled continuous cells/edges and added revision, connectivity, classification, D46, and bounded-cache telemetry to the development debugger.
- Replaced platform-sensitive byte hashing in the generated-sprite check with normalized text hashing; the formerly failing Windows baseline now passes with a regression test.
- Hardened door topology so D46 cannot be geometrically bypassed: both directions require and report the explicit D46 edge, while the authoritative component remains 7,467 cells with five evidence-backed exclusions.
- Generated deterministic baseline/current/replay artifacts. Final certification revision `nav-b08b92ce` covers 15,901 clearance-valid samples at 100%, all 40 interior doors are reversible, and all 16 representative routes pass in both directions.
- Ran visible long-route, projection, exterior-rejection, clearance-overlay, and D46 probes in the real application. The second D46 leg explicitly reported `D46` after the topology repair.
- Completed a 613-second active 50-agent soak: 50 agents remained active, movement continued, 139 portal transitions completed, the graph rebuilt zero times, the route cache remained bounded at 256, and no `route-failed` state appeared.
- Passed the local matrix: typecheck, lint, 484 tests in 41 files, Floor 1 and sprite generated checks, deterministic reachability/replay, production-bundle guard, and production build.
- Extended and ran the retained Chrome QA runner through two 600-second windows. It passed 20/20 representative routes, 16 cross-room/portal cases, 405 debug portal transitions, 6,001 samples per window, sub-163 ms maximum sample gaps, sub-307 ms maximum walking-without-motion intervals, an 8.8 ms longest route plan, zero motion-direction regressions, and zero browser errors.

## Unexpected Discoveries

### X-105-001 — Baseline sprite generation drift

Date: 2026-08-06
Discovery: `check:sprites-generated` reports drift in the manifest and two inventories immediately after `npm ci`, while `git status` remains clean and every other baseline gate passes.
Impact: Final publication requires a deterministic diagnosis/fix; it is not evidence of navigation changes.
Decision: Capture exact temporary diff later and repair only through the official generator/pipeline with explanation.
Plan change: T-105-013 added.
User review needed: No unless the fix would require a product/asset decision.

### X-105-002 — Registration is unverified despite exact candidate transform values

Date: 2026-08-06
Discovery: Candidate transform has stored scale/offset but zero landmarks and `approved: false`.
Impact: Universal navigation evidence must not be described as production geometry approval.
Decision: Preserve trust boundary and development-only diagnostics.
Plan change: Explicit trust-state completion criterion.
User review needed: No.

## Manual Review Items

- [ ] Drag an agent into each major room and far valid corners.
- [ ] Drop on desks/furniture and confirm nearby intended-side projection.
- [ ] Drop on and near both sides of thin walls; confirm no through-wall snap.
- [ ] Send multiple/opposing agents through narrow doorways; observe fair waiting/resumption.
- [ ] Pan/zoom/resize before dragging; confirm identical source destination.
- [ ] Route to D46 and inspect its documented classification/behavior.
- [ ] Attempt an exterior door and confirm safe interior handling.
- [ ] Replace routes during movement, traffic, portal transition, replan, and near arrival.
- [ ] Observe animation continuity and absence of freezes, wall crossings, furniture entry, backward walk, or sideways glide.
- [ ] Confirm PR remains draft/unmerged/not-ready.

## Completion Criteria

### Functional

- [x] Every clearance-valid interior sample is in one expected component and representative routes work both directions.
- [x] Arbitrary valid starts/targets, projection, recovery, smoothing, route replacement, and preview consistency pass.
- [x] D46 and every door are evidence-backed/classified; exterior space is not invented.
- [x] Temporary congestion never permanently abandons a valid target.
- [x] PR #27 drag, portal, count, label, pan/zoom, gait, sprite, task, and diagnostics behavior remains covered.

### Data Integrity

- [x] Generated navigation is deterministic, revisioned, finite, bounded, nondegenerate, provenance-bearing, and fail-closed.
- [x] No stale route/artifact revision is accepted; semantic anchors are valid or have deliberate approaches.
- [x] Candidate registration remains unverified and source artwork/IDs/meanings are unchanged.

### Tests

- [x] `npm run check:floor1-reachability` passes with deterministic replay support.
- [x] Typecheck, lint, all tests, Floor 1/sprite generated checks, build, and production-bundle check pass locally.
- [ ] Node 18 and Node 20 CI pass without skipped/weakened coverage.

### Visual

- [ ] Compact fixed evidence covers full walkable field, inflated obstacles, doors, D46, zero legitimate disconnected samples, long/narrow routes, and same-side projection.
- [ ] Both routes align at required viewports, pan/zoom/resize and available DPRs.
- [ ] Normal view remains clean/game-like; diagnostics remain development-only.

### Performance

- [ ] Build/projection/search/smoothing/replan metrics recorded; routine routing normally fits one frame budget.
- [x] Fifty-agent requests/movement remain responsive with bounded per-tick replanning.
- [x] Ten-minute active test shows no repeated multi-second freeze, permanent failure, or unbounded cache growth.

### Accessibility

- [ ] Keyboard/focus/Escape/text states/reduced-motion/slider semantics remain valid.

### Documentation

- [ ] Plan, report, D46 evidence, manual checklist, PR description, PR #27 behavior comparison, limitations, commands, seeds, SHAs, and CI results are current and factual.

### Build and Publication

- [ ] Worktree/index clean; final local SHA equals pushed remote SHA.
- [ ] Draft PR is open, unmerged, no auto-merge, and not ready for review.

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

Candidate registration remains unverified unless a separate explicit approval process occurs. Other limitations TBD from evidence.

### Deferred Work

Unrelated discoveries only; TBD.

### Manual Review Remaining

All checklist items remain pending until final candidate evidence exists.

### Recommended Next Plan

TBD after final validation.
