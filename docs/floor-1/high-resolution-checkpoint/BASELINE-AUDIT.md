# High-Resolution Visual Checkpoint — Baseline Audit

## Verified start

| Item | Verified value |
| --- | --- |
| Repository | `DrewDiStefano11/jarvis-office-prototype` |
| Origin | `https://github.com/DrewDiStefano11/jarvis-office-prototype.git` |
| Base branch / SHA | `main` / `23ff763f1afeb5b3394e40de077a272cacb4c518` |
| Working branch | `feature/floor-1-visual-foundation-v2` |
| Starting head | `694521d71aa64450dcec2921e524c6aa47468d7f` |
| Local versus remote head | `0 ahead / 0 behind` |
| PR #9 | Open, ready for review, unmerged, mergeable, targets `main` |
| PR #9 CI | Node 18 and Node 20 both passed |
| PR #9 size at start | 10 commits; 92 changed files |
| PR #8 | Open and unmerged |
| Other repository scope | `jarvis-agent-ecosystem` was not opened or modified |

The working tree was clean at verification. The only subsequent pre-implementation changes were the baseline evidence and checkpoint documentation described here.

## Baseline validation

| Command | Result |
| --- | --- |
| `npm ci` | Passed; 231 packages installed |
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Passed |
| `npx vitest run` | Passed; 12 files and 164 tests |
| `npm run build` | Passed |
| Running application | HTTP 200 at 1920×1080; zero console or page errors during evidence capture |

## Current geometry and rendering measurements

| Measurement | Baseline |
| --- | --- |
| Floor world dimensions | 1792×1024 world units |
| Projected floor bounds | 1521×1007.9 at x 193.2, y 2.15 |
| Typical Engineering module | 140×110; area 15,400 |
| Jarvis private office | 160×135; area 21,600 |
| Executive Boardroom | 300×180; area 54,000 |
| Operations pod | 120×220; area 26,400 |
| Sandbox cell | 82×115; area 9,430 |
| Standard desk footprint | 44×24 world units |
| Standard chair footprint | 18×18 world units |
| Operations console footprint | 44×28 world units |
| Standing sprite | 24×34 source; 29.76×42.16 rendered at 1.24× |
| Seated sprite | 24×30 source; 29.76×37.2 rendered at 1.24× |
| Furniture texture | 32×32 source; 40.96×40.96 rendered at 1.28× |
| Architecture texture | 40×40 source; 51.2×51.2 rendered at 1.28× |
| Wall treatment | Authoritative height with 2 px edge, 3 px cap, and 1 px base line |
| Door treatment | World width ÷ 3 (minimum 12 px) × 22 px |
| Canvas / internal render | 1920×1080 at DPR 1 for the primary capture |
| Filtering | Nearest-neighbor, antialias off, rounded pixels |
| Camera limits | 0.5–2.75; step 0.16; Fit Floor cap 1.28 |
| Fit Floor at 1920×1080 | 0.9683500347 |
| Render-plan commands | 766 |
| Estimated generated textures | 187: 26 base, 109 furniture variants, 14 architecture variants, 38 characters |
| Animation | 4 tween groups; 38 animated targets including 5 occupants |

The complete per-room and per-zone measurement record is in `docs/visual-evidence/high-resolution-checkpoint/baseline/baseline-measurements.json`.

## Why the current result is hard to read

1. The standard open-work module is only 140×110 world units while a workstation combines a 44×24 desk, an 18×18 chair, monitor, workspace plate, occupant, props, labels, walls, and adjacent circulation. Negative space is too limited for the object density.
2. A 24×34 standing texture has too few source pixels for simultaneously readable hair, face, jacket structure, arms, separated legs, shoes, badge, and accessory. At overview zoom it collapses correctly to a category silhouette, but at medium and close zoom the source limitation becomes visible.
3. Most furniture categories share a 32×32 drawing slot. Desks, chairs, conference tables, consoles, and storage therefore rely on block silhouettes and tint differences more than construction and material.
4. Walls and doors are renderer primitives with only a few edge bands. Close zoom exposes flat planes, minimal frames, and limited hardware.
5. Nine large department labels remain part of the overview layer. They cover workstations and occupants even when room materials already provide some identity.
6. The floor carries 766 render-plan commands inside a 1521×1007.9 projected footprint. The camera works well, but the physical composition—not the screenshot size—is the density bottleneck.

## Checkpoint implication

The candidate laboratory must change authored geometry and source-detail density together. Camera zoom alone cannot solve the issue. Candidate A should establish the smallest credible improvement, Candidate B should target clearly readable medium-zoom characters and furniture, and Candidate C should establish the practical upper boundary without replacing production Floor 1.

