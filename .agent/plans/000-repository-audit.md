# Production Floor 1 Markup Pipeline

Status: in_progress
Plan ID: 000
Owner: Codex
Reviewer: Human visual reviewer
Created: 2026-07-28
Last Updated: 2026-07-28
Related Task: Production Floor 1 markup pipeline
Related Branch: `codex/production-floor1-markup-pipeline-v2`
Related Pull Request: TBD

## Executive Summary

Build a deterministic, dependency-free extraction, classification, registration, provisional-geometry, evidence, and protected-promotion pipeline for the nine authored Floor 1 PDFs. Candidate geometry remains isolated from normal runtime until measured landmark evidence and explicit human approval pass.

## Goal

Publish a tested draft PR that extracts every PDF annotation, preserves source traceability, produces browser/SVG review artifacts, and makes production promotion impossible from unverified registration.

## Background and Context

The clean 8192×5460 PNG controls appearance. PDFs contain a shared lossless DCT stream plus separately authored annotations in lower-left-origin 4608×3072 page space. Runtime geometry uses upper-left-origin production pixels.

## Current Repository State

- Framework: React 19, Vite 6, Phaser 4 compatibility view
- Package manager: npm with lockfile
- Build command: `npm run build`
- Test command: `npm test`
- Lint command: `npm run lint`
- Typecheck command: `npm run typecheck`
- Existing relevant files: `src/office`, `src/components/office`, nine root PDFs
- Known failures: none established before implementation
- Uncommitted changes: this plan only

## Source-of-Truth Files

| File | Controls |
|---|---|
| `AGENTS.md` | repository rules, phases, gates |
| `docs/AI_HUB_MARKUP_LEGEND.md` | markup meaning |
| `docs/DOOR_ACCESS.csv` | D01–D47 authored access facts |
| `docs/INTERACTIONS.md` | runtime behavior |
| `docs/ANIMATION_MANIFEST.md` | animation contracts |
| `docs/INTERACTIVE_OFFICE_ENGINE.md` | current architecture |

## Confirmed Audit Facts

- Clean master: `public/assets/office/office-8192x5460.png`, 8192×5460, alpha present.
- Nine PDFs exist; each page MediaBox is 4608×3072.
- Each PDF contains one 6144×4096 DCT image and separately authored annotations.
- Observed total annotations: 867.
- Observed principal geometry: rooms 34 polylines; paths 131 ink; walls 62 ink; objects 105 ink; doors 47 polygons; computers 44 polygons; interactive objects 6 polygons.
- Existing renderer is a React/HTML/SVG hybrid with centralized source transforms.
- Sprite inventory: sixteen 1086×1448 alpha PNGs, one 1254×1254 alpha tube sprite, and one 1536×1024 opaque jobs image.
- Remote-write preflight passed at `0c2183150ab06b1024cd9b548e1b3468773dbc51`.

## Scope

- [ ] deterministic PDF/source audit and extraction
- [ ] raw, classified, and provisional records
- [ ] SVG previews and static registration evidence
- [ ] typed coordinate and registration utilities
- [ ] registration and provisional browser labs
- [ ] browser-only alignment assistance
- [ ] protected production promotion and runtime boundary
- [ ] tests, determinism checks, build, draft PR

## Out of Scope

- Human visual approval or invented landmarks
- Marking registration approved
- Merging the PR
- Implementing other floors or external agent integrations

## Assumptions

| ID | Assumption | Confidence | Evidence | Impact if wrong |
|---|---|---:|---|---|
| A-001 | PDFs use direct classic objects for encountered annotations | high | inspected object dictionaries | parser must report, never discard, exceptions |
| A-002 | Shared embedded JPEG bytes are identical | high | equal declared length/header; hash will validate | extraction fails with actual hashes |
| A-003 | Nearest label pairing is a candidate, not approval | high | geometry and labels are separate annotations | unresolved/review flags remain |

## Known Unknowns

| ID | Unknown | Blocks phase? | Resolution method | Safe temporary behavior |
|---|---|---:|---|---|
| U-001 | Exact production registration | yes for promotion | 8+ distributed landmarks and residual review | candidate-unverified only |
| U-002 | Exact object collider footprints | yes for production navigation | visual review against clean art | review regions remain provisional |
| U-003 | Some door connected zones/thresholds | yes where CSV flags review | visual lab and reviewer resolution | fail closed/manual review |

## Questions Requiring User Decision

None before candidate review. Human approval is deliberately deferred to the registration lab.

## Architecture Decision

### Selected Approach

Retain the DOM/SVG hybrid renderer; add dependency-free Node PDF extraction, JSON polygon/source-path storage, review-only grid A*, a small event-driven lab state, and existing generic sprite infrastructure.

### Why It Fits

It preserves inspectable geometry and accessible hit targets, avoids native PDF tooling, supports deterministic generation, and keeps production/candidate data boundaries explicit.

## Alternatives Considered

- Rendering: Canvas 2D is fast but less inspectable; WebGL/Pixi scales further but adds migration/dependencies; DOM/SVG hybrid best matches current hundreds of entities.
- Navigation: grid A* is deterministic and reviewable; navmesh is compact but risky with provisional shapes; visibility graph is weak for wide agents; hybrid may follow after approval.
- Geometry: JSON polygons are diffable; binary is opaque; masks lose source traceability; polygon-plus-derived-grid is selected.
- State: component-local state alone fragments approval logic; a central store is excessive here; event-driven lab state plus pure state machines is selected.
- Animation: framework components couple timing to React; renderer-native code couples domain state to renderer; existing generic metadata player remains selected.

## Data Model

Raw records preserve PDF object/annotation IDs, subtype, native geometry, style, text/rich text, bounds, warnings, confidence, and unknown field names. Classified records add stable semantic IDs and review state. Provisional records add transformed production coordinates plus `candidate-unverified` and `productionApproved: false`.

## File and Directory Changes

| Path | Action | Purpose |
|---|---|---|
| `scripts/floor1/` | add | parser, generators, validation |
| `src/office/data/floor1/` | add | raw/classified/provisional records |
| `artifacts/production-floor1/` | add | audit, SVGs, evidence |
| `src/components/office/floor1/` | add | review laboratories |
| `src/office/floor1/` | add | transforms, registration, runtime gate |

## Implementation Milestones

### Milestone 1 — Audit and extraction

Status: in_progress

Acceptance criteria:
- [ ] nine PDFs audited; 867 annotations ledgered
- [ ] shared DCT hash verified without re-encoding
- [ ] zero silently discarded records

### Milestone 2 — Classification and candidate registration

Status: not_started

Acceptance criteria:
- [ ] exact entity counts reconciled
- [ ] one uniform scale plus offsets only
- [ ] approval remains false

### Milestone 3 — Labs, evidence, provisional geometry/navigation

Status: not_started

Acceptance criteria:
- [ ] both query routes preserve normal office behavior
- [ ] candidate status is unavoidable
- [ ] review-only navigation respects blockers

### Milestone 4 — Promotion/runtime gate and publication

Status: not_started

Acceptance criteria:
- [ ] bypass tests fail closed
- [ ] required commands and deterministic rerun pass
- [ ] logical commits pushed and real draft PR verified

## Validation Strategy

Validate real PDFs and synthetic parser/geometry fixtures; run generators twice and compare sorted file hashes; inspect browser-viewable SVG evidence at corners and central landmarks.

## Test Plan

### Unit

PDF tokens, stream extraction, transforms, least-squares fit, checksum invalidation, geometry predicates.

### Integration

All nine files, exact counts, D01–D47 reconciliation, provisional conversion, promotion refusal.

### End-to-End

Audit → extract → classify → candidate register → evidence; normal runtime never imports provisional files.

### Regression

Existing typecheck, lint, Vitest, and Vite build.

## Visual Review Plan

Review nine SVG layers and candidate overlays at full extent, corners, Central Nexus, and elevator. Approval requires eight distributed measured landmarks and documented residual thresholds.

## Performance Considerations

Generation is offline and deterministic. Browser labs downsample alignment images, cull optional layers, and avoid decoding source PDFs.

## Accessibility Considerations

Lab controls use labels/buttons, keyboard-operable entities, textual state, visible focus, and color-independent status.

## Security and Data Integrity

No secrets. Hash every source. Promotion validates schema, source hashes, landmark checksum, residuals, complete PDFs, and 47 doors.

## Risks and Mitigations

| Risk ID | Risk | Likelihood | Impact | Mitigation | Trigger |
|---|---|---:|---:|---|---|
| R-001 | unsupported PDF structure | low | high | ledger unresolved structures and fail critical validation | unresolved parser object |
| R-002 | plausible but wrong registration | high | high | never auto-approve; require distributed landmarks | promotion request |
| R-003 | oversized generated diffs | medium | medium | stable compact JSON and source ledgers | review size |

## Rollback Strategy

Generated directories and isolated modules can be reverted by logical commit without changing the clean master or normal sample runtime.

## Decision Log

### D-001 — Preserve hybrid renderer

Date: 2026-07-28
Decision: Extend the existing React/HTML/SVG office engine.
Context: It already centralizes 8192×5460 transforms and accessibility.
Alternatives: Canvas, WebGL/Pixi.
Reason: Lowest integration risk and strongest debug inspectability.
Consequences: Profile large layers; keep generated SVG data outside React state where possible.
Affected Files: `src/components/office`, `src/office`

## Progress Log

### 2026-07-28

- Remote preflight and real branch publication passed.
- Mandatory sources and source asset inventory inspected.
- PDF annotation distributions and page/image dimensions confirmed.

## Unexpected Discoveries

### X-001 — PDFs are at repository root

Date: 2026-07-28
Discovery: All nine authored PDFs are present at root, not under `docs/authoring/floor-1`.
Impact: Commands use an explicit source manifest.
Decision: Preserve originals; never move or rewrite them.
Plan change: None.
User review needed: no.

## Manual Review Items

- [ ] eight or more registration landmarks
- [ ] room/door/light associations
- [ ] object collider refinement
- [ ] connected-zone and threshold review

## Completion Criteria

### Functional
- [ ] all requested commands work

### Data Integrity
- [ ] exact counts; no silent discards; deterministic hashes

### Tests
- [ ] required and regression suites pass

### Visual
- [ ] candidate evidence generated; approval honestly pending

### Performance
- [ ] lab remains usable with all layers

### Accessibility
- [ ] controls and state are keyboard/text accessible

### Documentation
- [ ] plan and evidence README reflect reality

### Build
- [ ] typecheck, lint, test, build, diff check pass

## Final Report

TBD after implementation and draft PR verification.
