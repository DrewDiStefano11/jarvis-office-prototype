# High-Resolution Checkpoint - Final Evidence Index

This evidence was captured from the running application on branch `feature/floor-1-visual-foundation-v2` at implementation commit `795ba49`. The capture viewport is 1920x1080 and DPR 1 unless a filename or metadata entry states otherwise. All 40 scripted screenshots reported zero browser console errors. Exact camera zoom, viewport, label mode, effects mode, purpose, and requirement mapping are recorded in `capture-metadata.json`.

The comparison lab is isolated behind `?visualLab=high-resolution-checkpoint`; the production Floor 1 remains the default route.

## Decision set

| Evidence | File |
| --- | --- |
| Four-way Baseline / A / B / C | `04-four-way-baseline-a-b-c-comparison.png` |
| Candidate A full suite | `06-candidate-a-full-prototype.png` |
| Candidate B full suite | `07-candidate-b-full-prototype.png` |
| Candidate C full suite | `08-candidate-c-full-prototype.png` |
| A close pixel clarity | `34-candidate-a-close-pixel-clarity.png` |
| B close pixel clarity | `35-candidate-b-close-pixel-clarity.png` |
| C close pixel clarity | `36-candidate-c-close-pixel-clarity.png` |
| Detailed source reference beside B and C | `41-source-room-vs-candidates-b-c.png` |
| Original floor target beside the four-way lab | `42-source-floor-vs-four-way.png` |
| Interaction recording | `high-resolution-checkpoint-interactions.webm` |

## Required detailed coverage

| Requirement | Evidence |
| --- | --- |
| Current full Floor 1 and current close character | `01-current-full-floor-baseline-1920x1080.png`, `02-current-close-character-baseline.png` |
| Lab overview and matched four-way views | `03-visual-lab-full-prototype-overview.png`, `04-four-way-baseline-a-b-c-comparison.png`, `09-four-way-medium-zoom.png`, `10-four-way-close-zoom.png` |
| Standing, seated, and Operations characters | `11-standing-character-comparison.png`, `12-seated-desk-character-comparison.png`, `13-operations-console-character-comparison.png` |
| Executive, Security, temporary, visitor, and sandbox roles | `14-executive-and-security-character-comparison.png`, `15-temporary-and-visitor-comparison.png`, `16-sandbox-character-comparison.png` |
| Desks, chairs, consoles, and meeting tables | `17-desk-comparison.png` through `20-meeting-table-comparison.png` |
| Walls, doors, glass, access devices | `21-wall-and-door-comparison.png`, `22-glass-and-secure-access-comparison.png` |
| Materials, lighting, and department palettes | `23-floor-material-comparison.png` through `25-department-color-theme-comparison.png` |
| Hover, selection, and inspector | `26-department-hover-title-hidden.png` through `28-selected-department-title-state.png` |
| Label modes | `29-labels-minimal-mode.png`, `30-labels-on-mode.png` |
| 1366x768 responsive views | `31-candidate-a-1366x768.png` through `33-candidate-c-1366x768.png` |
| Dimensions, anchors, and bounds | `37-dimensions-scale-anchor-overlay.png` |
| Presentation and reduced/off effects | `38-presentation-mode-comparison.png` through `40-effects-off-state.png` |

## Integrity notes

- The two source-reference comparison sheets place unedited source images and unedited running-app screenshots on the same canvas. They are QA composites, not production assets.
- No supplied reference artwork is included in runtime code or production textures.
- The final evidence commit may be newer than `795ba49`; `795ba49` is the implementation tree rendered by every scripted capture.
- The complete authoritative before-state remains in the sibling `baseline/` directory and was captured at verified starting PR #9 SHA `694521d71aa64450dcec2921e524c6aa47468d7f` before candidate implementation.
