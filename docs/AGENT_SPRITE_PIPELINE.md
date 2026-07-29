# Agent sprite and animation pipeline

## Purpose

This pipeline inventories committed character and hologram sources, promotes only deterministically usable files into a generated runtime directory, validates a typed animation manifest, and renders the result without making the renderer authoritative for agent identity or state.

The pipeline does not approve Floor 1, assign permanent workstations, invent missing art, remove ambiguous backgrounds, or synthesize unsupported directions.

## Commands

```text
npm run inventory:sprites
npm run generate:sprites
npm run check:sprites-generated
```

- `inventory:sprites` decodes every configured PNG and writes canonical JSON and Markdown to `artifacts/sprite-inventory/`.
- `generate:sprites` stages validated runtime copies, verifies exact SHA-256 checksums, writes the runtime manifest, and atomically replaces `public/assets/office/sprites/generated/`.
- `check:sprites-generated` regenerates into a temporary directory and fails when inventory or runtime output differs from the checked-in result.

Failures remove partial staging and preserve the last valid generated directory. Source files are never overwritten.

## Current inventory

| Classification | Count | Runtime behavior |
|---|---:|---|
| Deterministic production candidates | 16 | Losslessly copied and approved for generated runtime use |
| Source/reference only | 1 | Reported and previewable only |
| Blocked/manual edit | 1 | Reported and previewable only |
| Duplicate content | 0 | None |

The sixteen character PNGs are `1086×1448`, contain used alpha, and divide exactly into a `6×8` grid of `181×181` frames. Generation copies these bytes unchanged; the source and generated checksums must match.

`Sprite Jobs.png` is an opaque role/reference board with embedded title, numbering, labels, palette, margins, and notes. It is not a runtime sheet.

`Nexus Tube Sprite.png` is transparent, but its `1254×1254` dimensions do not divide exactly into the apparent visual rows/columns. No authoritative frame rectangles or order are committed. It remains blocked until a corrected exact-grid source or explicit per-frame atlas is supplied.

## Manifest contract

The generated manifest declares:

- source and generated references/checksums;
- frame width/height/count and rows/columns;
- normalized anchor and visual scale;
- pixel-art rendering;
- availability and approval;
- profile compatibility;
- authored and optionally flipped directions;
- ordered clips, FPS, looping, repeat delay, yoyo, reduced-motion frame, and static fallback;
- an explicit state fallback graph.

Strict validation rejects duplicate asset/clip IDs, missing or mismatched files/checksums, invalid dimensions/anchors/FPS, empty clips, out-of-range frames, unsupported directional claims, undefined fallbacks, cycles, and provisional/blocked production usage.

No compass direction is claimed for the current character sheets. Their authored direction is `none` until row direction metadata is provided and reviewed.

## State fallback graph

```text
walking   → idle
working   → idle
thinking  → idle
reviewing → working → idle
waiting   → idle
blocked   → idle
error     → idle
offline   → static fallback
idle      → static fallback when required
```

Assets may implement a subset. The resolver records the complete fallback chain and chooses an explicit static frame for reduced motion.

## Runtime architecture

React/domain state chooses the asset, state, direction, position, selection, and label. The sprite renderer only loads a validated texture, resolves a clip, advances frames, and positions the visual.

Each mounted visual surface owns:

- one `AnimationClock`, regardless of sprite count;
- one texture promise per URL;
- bounded subscribers;
- direct DOM background-position updates, avoiding React rerenders per frame;
- visibility/active-view pausing;
- deterministic cleanup of scheduled frames and texture references.

The office demonstration agents and positions are configured in `src/domain/seed.ts`. They are explicitly development-only and are not Floor 1 assignments.

## Development review routes

```text
?visualLab=agent-sprites
?spriteDemo=agents
```

Both routes require `import.meta.env.DEV`; the queries are harmless in production builds.

The sprite lab provides inventory counts, asset/state/direction selection, play/pause/restart/stepping, current frame, speed, zoom, checker/light/dark backgrounds, nearest-neighbor control, source/generated sheet views, grid/content/anchor/ground/hitbox overlays, pixel dimensions, office-context scale, reduced-motion preview, fallback chains, warnings, checksums, and approval status.

The office demo renders five stable profile names at deterministic review positions, supports keyboard/pointer selection, preserves the existing office pan/zoom and application view lifecycle, pauses when hidden, and visibly states that positions and profile-to-art mappings are provisional demonstrations.

## Accessibility

- Animation is never the only status indicator; names, states, fallback chains, warnings, and approval text remain visible.
- The lab always exposes pause and frame-step controls.
- Reduced motion selects an explicit static frame.
- Demo agents are keyboard-focusable buttons with identity/state labels.
- Existing focus styles and view `inert` behavior are preserved.
- No rapid flashing is authored; manifest validation caps playback at 30 FPS.

## Adding or promoting an asset

1. Preserve the original file.
2. Add an explicit entry to `config/sprite-sources.json`.
3. Supply exact grid dimensions or explicit atlas metadata; never guess.
4. Confirm transparency/background safety and absence of embedded labels inside frames.
5. Run inventory and inspect the report.
6. Generate, run the drift check, and inspect the visual lab at source and office scale.
7. Add only authored clips/directions and explicit fallbacks.
8. Run the complete validation and browser QA.

Blocked sources remain useful references and must not be silently substituted.
