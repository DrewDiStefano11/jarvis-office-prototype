# Agent Sprite and Animation Pipeline

Status: in_progress
Plan ID: 080
Owner: Codex
Reviewer: Codex review and repository maintainer
Created: 2026-07-28
Last Updated: 2026-07-28
Related Task: Production agent sprite, animation-manifest, validation, visual-review, and office-rendering pipeline
Related Branch: `codex/agent-sprite-animation-pipeline`
Related Pull Request: TBD

## Executive Summary

Build a deterministic source inventory and generated-asset pipeline for the committed sprite artwork, a strict typed runtime manifest with explicit state fallbacks, a reusable DOM sprite player that does not rerender React per frame, a development-only sprite visual lab, and a development-only multi-agent office demonstration. Promote only sources whose frame geometry and transparency are proven. Keep the Floor 1 candidate dataset unchanged and unapproved.

## Goal

Make committed, validated agent sheets reproducibly usable in the office while ensuring malformed, ambiguous, provisional, or drifted assets cannot silently enter production. The final draft PR must include generated reports/assets, tests, browser evidence, green local/CI validation, and a completed Codex review loop without merging.

## Background and Context

The React/HTML/SVG office engine already owns pan, zoom, selection, and the authoritative 8192×5460 world transform. Domain and visual-profile data remain outside renderers. The repository contains sixteen exact-grid character sheets, an opaque role reference board, and a transparent Nexus tube source whose grid is not exactly divisible. Existing animation helpers are too small to validate checksums, availability, fallbacks, directions, reduced motion, or production approval.

## Current Repository State

- Framework: React 19, Vite 6, Phaser 4 compatibility view.
- Package manager: npm with lockfile.
- Build: `npm run build` / `npm run build-nolog`.
- Tests: `npm test`.
- Lint: `npm run lint`.
- Typecheck: `npm run typecheck`.
- Current source branch point: `0512380892b617849c21694c7bdc202a7e98baf4`.
- Open pull requests found during connected GitHub preflight: none.
- Worktree at branch creation: clean.
- Floor 1 status: candidate registration only; production directory and approval artifact must remain absent.

## Source-of-Truth Files

| File | Controls |
|---|---|
| `AGENTS.md` | Repository boundaries, animation gate, data/renderer separation |
| `.agent/PLANS.md` | Execution and evidence requirements |
| `docs/ANIMATION_MANIFEST.md` | Frame metadata, timing, anchors, validation, fallbacks |
| `docs/INTERACTIONS.md` | Selection, accessibility, state derivation, renderer behavior |
| `docs/AGENT_VISUAL_PROFILES.md` | Stable five-agent identity/profile boundary |
| `docs/ACCESSIBILITY_FOUNDATION.md` | Reduced-motion and keyboard contracts |
| `docs/INTERACTIVE_OFFICE_ENGINE.md` | Existing React/SVG renderer and world transform |
| Root committed PNG sprite/reference files | Immutable sprite sources |
| `src/domain/seed.ts` | Data-driven demo positions and agents |

## Scope

- Deterministic PNG inspection, inventory JSON/Markdown, duplicate detection, and drift checking.
- Atomic/idempotent generation of approved runtime copies without changing source bytes.
- Strict manifest types and validation for checksums, dimensions, grids, clips, directions, fallbacks, approvals, and production use.
- Explicit state resolver for idle, walking, working, thinking, reviewing, waiting, blocked, error, and offline.
- Shared decoded textures and one bounded animation clock per mounted surface, with cleanup and visibility/reduced-motion handling.
- Development-only `?visualLab=agent-sprites`.
- Development-only `?spriteDemo=agents` integrated with the existing office transform.
- Tests, documentation, browser evidence, CI drift checks, draft PR, and Codex review/fix loop.

## Out of Scope

- Backend, WebSockets, model calls, autonomous agents, or runtime task integration.
- Floor 1 approval, promotion, permanent candidate workstations, or candidate navigation claims.
- Hand editing, AI generation, uncertain background removal, fabricated frames, or unsupported directions.
- Replacing the office background or broad UI redesign.
- Modifying `jarvis-agent-ecosystem`.

## Assumptions

| ID | Assumption | Confidence | Evidence | Impact if wrong |
|---|---|---:|---|---|
| A-080-01 | Sixteen `1086×1448` PNGs are exact `6×8` grids of `181×181` cells | High | exact divisibility and visual inspection | generation/manifest rejected |
| A-080-02 | A single visually verified non-directional row can be exposed without claiming authored compass directions | High | sheet inspection; no direction metadata exists | clips remain `none` until reviewed |
| A-080-03 | Byte-for-byte copies are valid normalized outputs when the source already satisfies the runtime grid/alpha contract | High | no transform or crop is needed | generator can add a lossless transform later |
| A-080-04 | DOM sprites inside the existing transformed office surface preserve alignment and accessibility | High | current renderer architecture | fall back to isolated lab only if integration fails |

## Known Unknowns

| ID | Unknown | Blocks phase? | Resolution method | Safe temporary behavior |
|---|---|---:|---|---|
| U-080-01 | Authored compass-direction order of the eight rows | No | future human/artist metadata | expose only direction `none` |
| U-080-02 | Exact Nexus frame rectangles/order | Yes for promotion | explicit atlas metadata or manual source correction | reference-only, blocked with exact reason |
| U-080-03 | Intended role-to-sheet mapping for all thirty job references | No | future authored mapping | demo maps five profiles to distinct validated sheets, clearly as demo-only |
| U-080-04 | Whether each walking row is intended as a polished loop | No | browser visual review | use one conservative clip and static fallback |

## Questions Requiring User Decision

None before the draft review. Uncertain asset semantics remain blocked or provisional instead of being guessed.

## Architecture Decision

### Selected Approach

Use dependency-free Node scripts with a strict PNG decoder built on `node:zlib`, explicit source configuration, canonical JSON/Markdown writers, staged atomic directory replacement, and SHA-256 verification. Use TypeScript manifest/domain modules and a DOM sprite player driven by one `requestAnimationFrame` clock per mounted surface. Render sprites inside the existing office surface so the established transform, pan, zoom, view switching, and layering remain authoritative.

### Why It Fits

It adds no image/native dependency, works on Node 18/20 CI, preserves exact bytes and pixel edges, makes all promotion decisions reviewable, keeps React out of per-frame updates, and leaves Phaser renderer-only.

## Alternatives Considered

- `sharp`/canvas: stronger transforms but adds native/dependency risk when current approved sources require only verified copying.
- Phaser animation integration: would couple the new normal office view to the legacy renderer and weaken DOM accessibility.
- CSS animation per sprite: simple but difficult to pause, step, synchronize, instrument, and clean up deterministically.
- Guessing an atlas for the Nexus source: rejected because dimensions are not exactly divisible and no authoritative rectangles exist.

## Data Model

The inventory records path, hash, bytes, PNG color type/mode, dimensions, alpha presence/use, opacity, nontransparent bounds, exact uniform border color, declared/discovered grid, embedded-marking flags, duplicate hash, status, blockers, generated destination, and manifest ID. Runtime manifest assets declare source/generated hashes and URLs, frame/grid/anchor/scale/pixel settings, approval/availability/effect classification/profile compatibility, clips, and state fallbacks. Clip IDs are unique per asset and include state, direction, ordered frames, FPS, loop, delay, yoyo, reduced-motion frame, static fallback, and optional explicit horizontal flip.

## File and Directory Changes

| Path | Action | Purpose |
|---|---|---|
| `scripts/sprites/` | Create | PNG inspection, inventory, generation, drift check, shared canonical utilities |
| `config/sprite-sources.json` | Create | Explicit immutable source decisions |
| `artifacts/sprite-inventory/` | Generate | Canonical JSON and Markdown inventory |
| `public/assets/office/sprites/generated/` | Generate | Verified runtime sprite sheets and generated manifest |
| `src/office/sprites/` | Create | Types, strict validation, manifest, resolver, clock/texture cache |
| `src/components/office/AgentSprite*.tsx` | Create | Runtime sprite renderer and lab/demo UI |
| `src/domain/seed.ts` | Modify | Data-driven deterministic demo agents/positions |
| `src/App.tsx` and office components/CSS | Modify | Development route gates and narrow demo integration |
| `.github/workflows/ci.yml` | Modify | Generated sprite drift check |
| `package.json` | Modify | Inventory/generate/check scripts |
| `docs/AGENT_SPRITE_PIPELINE.md` | Create | Contracts, fallbacks, limitations, commands |

## Implementation Milestones

### Milestone 1 — Inventory and generation

Status: done

Acceptance criteria:
- all relevant committed sources are reported;
- malformed PNGs fail, ordinary blocked references remain reportable;
- sixteen exact-grid sources generate atomically without source mutation;
- Nexus and job board remain unpromoted with exact blockers;
- rerun and drift check are deterministic.

### Milestone 2 — Manifest and runtime

Status: done

Acceptance criteria:
- strict validation rejects every specified invalid state;
- explicit cycle-free fallbacks resolve deterministically;
- textures are shared and one animation clock services a surface;
- cleanup leaves no timers/listeners/frames.

### Milestone 3 — Visual lab and office demo

Status: validation

Acceptance criteria:
- both routes are development-only and normal route is unchanged;
- lab supports required selection, playback, overlays, checksums, warnings, scale, and reduced motion;
- demo shows multiple selectable named agents at deterministic non-production positions.

### Milestone 4 — Validation, publication, and review

Status: not_started

Acceptance criteria:
- required local commands and browser matrix pass;
- focused visual evidence is captured;
- Floor 1/source files/approval state are unchanged;
- draft PR is green and mergeable;
- fresh Codex review on final SHA has zero actionable/unresolved threads.

## Detailed Task Breakdown

| Task ID | Task | Status | Dependency | Evidence |
|---|---|---|---|---|
| T-080-01 | Preflight remote, branch, PR overlap | done | none | recorded SHA/branch |
| T-080-02 | Inventory/config/generator | done | T-080-01 | canonical artifacts and drift check |
| T-080-03 | Manifest validation/resolver | done | T-080-02 | validation/resolver tests |
| T-080-04 | Shared runtime renderer | done | T-080-03 | clock/cache instrumentation tests |
| T-080-05 | Visual lab | validation | T-080-04 | component tests; browser evidence pending |
| T-080-06 | Office demo | validation | T-080-04 | component tests; browser evidence pending |
| T-080-07 | Full validation and QA | not_started | T-080-02..06 | command log/screenshots |
| T-080-08 | Draft PR, CI, Codex reviews | not_started | T-080-07 | PR/review state |

## Validation Strategy

Validate source bytes before and after generation, canonical output hashes across reruns, staged failure cleanup, manifest references against disk, all fallback graphs, browser asset requests/console, normal/candidate/lab/demo routes, desktop/laptop/reduced-motion/keyboard behavior, and exact git diffs for Floor 1/approval/source protection.

## Test Plan

### Unit

PNG filters/color modes/alpha/bounds/backgrounds, duplicates, malformed input, manifest fields, checksums, frames, anchors, FPS, directions, fallbacks, production gating, resolver, clock, and cache.

### Integration

Inventory-to-generation-to-manifest, asset loading, lab controls, shared textures, cleanup, query gating, demo selection, view persistence, pan/zoom compatibility.

### End-to-End

Run all scripts, open each requested route in a real browser, exercise keyboard and playback controls, inspect console/network state, and verify reduced motion.

### Regression

Existing Floor 1 generation/drift, all Vitest tests, strict TypeScript, ESLint, production build, and `git diff --check`.

## Visual Review Plan

Capture a focused set under `artifacts/sprite-inventory/browser-evidence/`: lab overview, grid/anchor overlay, office scale, multi-agent demo, reduced-motion preview, and blocked Nexus/reference behavior. Inspect desktop and laptop layouts plus normal/candidate routes.

## Performance Considerations

Use one decoded image per URL, one shared RAF clock per mounted surface, direct DOM frame updates, visibility pausing, no per-frame React state, bounded subscriber count, and cleanup instrumentation. Demo count remains small while the architecture supports dozens.

## Accessibility Considerations

Provide named buttons/selects/ranges, persistent pause, visible focus, textual status and fallback chains, keyboard-selectable agents, `aria-live` status where appropriate, hidden/inactive controls removed from focus, and explicit static reduced-motion frames.

## Security and Data Integrity

Reject path traversal, absolute output paths, source/output overlap, malformed PNGs, hash drift, duplicate IDs, and provisional production use. No secrets, environment files, backend code, or external integrations.

## Risks and Mitigations

| Risk ID | Risk | Likelihood | Impact | Mitigation | Trigger |
|---|---|---:|---:|---|---|
| R-080-01 | Direction semantics guessed from visuals | High | High | publish only `none` direction | missing authored mapping |
| R-080-02 | Large source sheets hurt memory | Medium | Medium | shared cache, visible-surface clock, no repeated decode | repeated loads/listeners |
| R-080-03 | Nexus grid appears regular but is not exact | High | High | block promotion; require rectangles | non-divisible dimensions |
| R-080-04 | Demo accidentally implies Floor 1 assignment | Medium | High | explicit dev query, labels, seed namespace, no candidate imports | normal route/data diff |

## Rollback Strategy

Revert the isolated plan/scripts/config/generated directory/sprite modules/components and route wiring. Generated outputs are reproducible and can be discarded. No source artwork, Floor 1 approval artifact, or production data is changed.

## Decision Log

### D-080-01 — Preserve exact-grid source bytes

Date: 2026-07-28
Decision: Normalize approved sheets by verified byte-for-byte copy.
Context: All sixteen sheets are already exact `181×181` grids with alpha.
Alternatives: crop/re-encode/resize.
Reason: zero distortion, zero quality loss, deterministic output.
Consequences: runtime manifest carries frame/grid semantics; no false detail is created.
Affected Files: sprite scripts/config/generated outputs.

### D-080-02 — Block the Nexus sheet

Date: 2026-07-28
Decision: inventory and preview it, but do not generate runtime frames.
Context: `1254×1254` does not divide into the visually suggested grid and no rectangles are authored.
Alternatives: guess gutters or component-detect frames.
Reason: source-of-truth rules prohibit guessed frame bounds/order.
Consequences: visual lab reports the exact blocker.
Affected Files: inventory/config/manifest documentation.

### D-080-03 — Use one non-directional clip

Date: 2026-07-28
Decision: expose only direction `none` until authoritative row directions exist.
Context: rows visibly show directions but their compass mapping is not documented.
Alternatives: infer compass order.
Reason: no unsupported directional claims.
Consequences: explicit fallbacks/static frames cover unsupported states and directions.
Affected Files: manifest/resolver/demo.

## Progress Log

### 2026-07-28

- Read mandatory repository and task specifications.
- Fetched and fast-forwarded to exact current `origin/main`.
- Confirmed no open pull-request overlap through the connected GitHub app.
- Created `codex/agent-sprite-animation-pipeline` from `0512380892b617849c21694c7bdc202a7e98baf4`.
- Inspected committed image dimensions, color formats, alpha capability, hashes, and representative pixels/visual layouts.
- Classified the exact agent grid and the Nexus/job-board blockers without modifying sources.
- Added canonical inventory/generation/check commands and generated sixteen byte-identical runtime sheets.
- Added strict manifest, fallback resolver, shared surface runtime, visual lab, and data-driven office demo.
- Focused generation/runtime/UI tests and strict TypeScript/ESLint checks pass.
- Completed clean dependency installation, full 316-test suite, production build, drift check, and real-browser desktop/laptop/reduced-motion/keyboard QA.
- Verified production builds ignore both development-only sprite query flags.
- Preserved Floor 1 data exactly; its existing Windows regeneration path records a one-byte newline difference in the generated manifest, while Linux CI remains authoritative.
- Opened draft PR #21; CI exposed and the branch fixed a Node 18 incompatibility in module-directory resolution, then verified the sprite drift checker directly on Node 18.20.8.

## Unexpected Discoveries

### X-080-01 — Exact character grid, ambiguous tube grid

Date: 2026-07-28
Discovery: every character sheet is exactly `6×8` at `181×181`, while the Nexus source is `1254×1254` and not exactly divisible by the apparent layout.
Impact: agent generation can be lossless; Nexus generation must remain blocked.
Decision: promote only the exact-grid sheets.
Plan change: generator supports copy normalization first; no uncertain slicing.
User review needed: only if future Nexus rectangles/directions are to be authored.

## Manual Review Items

- [ ] Confirm any future compass-direction mapping for character rows.
- [ ] Provide explicit Nexus frame rectangles/order or a corrected exact-grid source.
- [ ] Confirm permanent profile-to-art assignments before changing profiles from placeholder.

## Completion Criteria

### Functional
- [x] inventory, generation, drift check, manifest, resolver, lab, and demo work.

### Data Integrity
- [x] sources unchanged; hashes verified; Floor 1/approval/production unchanged.

### Tests
- [x] focused and complete suites pass on final changes.

### Visual
- [x] required real-browser evidence is captured and reviewed.

### Performance
- [x] shared texture/clock and cleanup instrumentation pass.

### Accessibility
- [x] keyboard, labels, pause, focus, and reduced motion pass.

### Documentation
- [x] commands, fallbacks, classifications, blockers, and limitations are current.

### Build
- [x] sprite generation/drift, typecheck, lint, tests, build, and diff check pass; Floor 1 is unchanged and its Windows-only newline drift is documented for Linux CI verification.

## Final Report

### Delivered

TBD after implementation and final reviewed SHA.

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

Nexus rectangles/directions and permanent agent-to-art assignments remain manual-review items unless authoritative evidence appears.

### Deferred Work

Backend/runtime events, Floor 1 assignments, and additional authored animation states.

### Manual Review Remaining

TBD.

### Recommended Next Plan

TBD after review.
