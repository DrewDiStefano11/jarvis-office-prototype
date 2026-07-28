# Sprite Pipeline

How source PNGs become validated, renderable animations. This system is
intentionally isolated: it adds no Floor 1 placement and modifies no Floor 1
markup, geometry, navigation or registration data.

## 1. Overview

```text
repository-root *.png  (source of truth, never modified)
        │
        ▼  scripts/sprites/analyze-source-assets.mjs   (measure pixels)
src/office/sprites/source-asset-inventory.json          (machine-readable facts)
        │
        ├──▶ scripts/sprites/generate-inventory-doc.mjs ──▶ docs/sprites/SOURCE_ASSET_INVENTORY.md
        │
        ▼  scripts/sprites/sync-production-assets.mjs   (byte-for-byte copies)
public/assets/office/sprites/**                          (served assets)
src/office/sprites/production-asset-map.json             (source → destination map)
        │
        ▼  src/office/sprites/manifest.ts                (curated animations)
        ▼  src/office/sprites/manifestValidation.ts      (fail-closed validation)
        ▼  src/components/office/SpriteSheetRenderer.tsx (rendering)
        ▼  sprite-lab.html + src/sprite-lab/**           (isolated review surface)
```

## 2. Regenerating everything

```bash
node scripts/sprites/analyze-source-assets.mjs
node scripts/sprites/sync-production-assets.mjs
node scripts/sprites/generate-inventory-doc.mjs
```

All three are deterministic. Running them twice on unchanged inputs produces
byte-identical output — there are no timestamps, and all iteration is sorted.
A second pass was verified to produce identical SHA-256 hashes.

## 3. Source measurement

`scripts/sprites/png-decoder.mjs` is a dependency-free PNG decoder (IHDR/PLTE/
tRNS/IDAT, all filter types, 8-bit colour types 0/2/3/4/6). No new npm packages
were added and `package.json` was not modified.

For every source file the analyzer records: path, byte size, SHA-256, width,
height, bit depth, colour type, chunk list, alpha-channel presence, whether
transparency is actually used, alpha range, transparent-pixel counts, whether the
background is a uniform opaque colour, measured grid structure, blank cells,
cells that spill past their boundary, classification, readiness, ambiguity and
warnings.

Two ink tests are used, because one threshold does not fit both asset families:

- **Agent sheets** use `alpha >= 128`. The background is fully transparent.
- **Nexus tube sheet** uses `alpha > 16 && luminance > 18`. The tube glass is
  semi-transparent, so an alpha-only test floods the whole canvas.

## 4. Classification

| Classification | Meaning |
|---|---|
| `central_nexus_hologram` | The blue-tube hologram sheet |
| `agent_sprite_sheet` | Walk-cycle sheet with a verified equal-cell grid |
| `agent_reference` | Agent art that failed grid verification; ambiguous |
| `role_reference` | Role/job reference art, not animation source |
| `individual_character` | Reserved; currently unused |
| `animation_reference` | Reserved; currently unused |
| `unknown` | Reserved; currently unused |

Readiness is separate from classification: `production_ready`,
`conditionally_usable`, `reference_only`, `invalid`.

An asset is only `production_ready` when it has a true alpha channel, is not
ambiguous, and has a measured grid where equal-cell extraction was verified.
This invariant is enforced by a test.

### Approval is separate from measurement

Measurement never grants approval. `isProductionUsable()` requires readiness to
be exactly `production_ready` — `conditionally_usable` is explicitly excluded,
because it means "measured, but a human still has to decide".

Production eligibility requires **all** of:

1. inventory readiness is exactly `production_ready`;
2. the asset is not ambiguous;
3. alpha channel present and transparency actually used;
4. an authored `approvalStatus: 'production-approved'` on the manifest entry;
5. the whole manifest passes validation.

`approvalStatus` is a strict union: `candidate-unverified` |
`production-approved` | `reference-only`. Animations additionally carry
`sequenceAuthorship`, and a production animation may not use a
`curated-preview-unverified` order.

**Nothing in this pipeline is currently production-approved.** The Nexus grid is
`candidate-unverified`; everything else is `reference-only`.

## 5. Production copies

`sync-production-assets.mjs` copies with `copyFileSync` and then re-reads the
copy and compares SHA-256 against the source. No resizing, re-encoding, cropping
or background removal ever happens. Layout:

- `public/assets/office/sprites/holograms/candidates/central-nexus-pose-grid.png`
  — the Nexus **candidate**. Isolated on purpose.
- `public/assets/office/sprites/central-blue-tube-hologram.png` — **intentionally
  NOT created.** The office sample overlay declares this asset ID as a uniform
  128x192 / 8-frame / 8-column sheet; the 1254x1254 non-uniform pose grid does
  not satisfy that, so writing here would change runtime loading and defeat the
  engine's missing-asset fallback. `sync-production-assets.mjs` throws if any
  mapping resolves to this path, and a regression test asserts its absence.
- `public/assets/office/sprites/agents/` — verified uniform agent sheets.
- `public/assets/office/sprites/references/` — reference-only and ambiguous art,
  named so it cannot be mistaken for a production sprite.

## 6. Manifest

`src/office/sprites/manifestTypes.ts` defines the contract; `manifest.ts` builds
entries by reading geometry back out of the inventory rather than retyping
numbers, so the manifest cannot drift from the measured pixels. Only curatorial
choices (frame order, timing, anchor, layer, loop mode) are authored by hand,
and each carries a `notes` justification.

Stable IDs currently defined:

- `ASSETSET_CENTRAL_NEXUS_HOLOGRAM`
- `ANIM_CENTRAL_NEXUS_IDLE`
- `ANIM_CENTRAL_NEXUS_FLOAT`

Both Nexus animations ship as `candidate-unverified` with `production: false`.

No `ANIMSET_AGENT_REFERENCE_*` animations are defined yet. The agent sheets have
verified grids, but nothing in the source states which row is which facing
direction, so defining walk animations would require inventing metadata. That
decision is deliberately deferred to a human.

## 7. Validation

`validateSpriteManifest()` returns structured issues; `assertValidSpriteManifest()`
throws. Checks cover missing/duplicate asset and animation IDs, unknown source
files, invalid or mismatched dimensions, invalid rows/columns, cell-count
mismatch, rectangles out of bounds, duplicate/out-of-range frame indexes,
used/unused overlap, frames played but not marked used, empty sequences, invalid
timing, unsupported loop modes, invalid anchors, opacity, scale and z-layers,
pixel-art/interpolation mismatch, missing fallback animations, reference-only
assets backing production entries, and manifest-vs-PNG dimension mismatch.

Validation fails closed: the renderer shows a fallback rather than guessing.

## 8. Renderer API

`<SpriteSheetRenderer />` — `src/components/office/SpriteSheetRenderer.tsx`

| Prop | Type | Default | Purpose |
|---|---|---|---|
| `animation` | `SpriteAnimation` | required | Manifest-backed animation |
| `displayScale` | `number` | `1` | Multiplies the manifest world scale |
| `manualFrameIndex` | `number` | – | Pins a frame (manual mode) |
| `paused` | `boolean` | `false` | Stops the clock |
| `forceReducedMotion` | `boolean` | – | Overrides the OS preference |
| `pauseWhenOffscreen` | `boolean` | `false` | IntersectionObserver pause |
| `speedMultiplier` | `number` | `1` | Divides elapsed delta; `2` = half speed |
| `opacity` / `glow` / `zIndex` | – | manifest | Presentation overrides |
| `floatTransform` | `boolean` | `false` | Vertical bob, separate from frames |
| `label` | `string` | animation ID | Accessible name |
| `onStateChange` | `(s) => void` | – | `loading \| ready \| missing \| invalid` |

Behaviour guarantees:

- One frame is shown at a time via `background-position`.
- Uniform grids and explicit per-frame rectangles are both supported.
- Variable-size rectangles render inside a **stable logical frame box**, so
  frame 0 and frame 9 always produce identical outer dimensions.
- Anchor, logical box, trim offset and float are separate composed layers, so
  the float transform can never overwrite the anchor translation.
- A single animation is validated together with its **fallback dependency
  closure**, so fallback checking stays enabled without false
  `FALLBACK_ANIMATION_MISSING` errors. Cyclic fallbacks are detected.
- Frame selection is a pure function of elapsed milliseconds, so playback is
  identical at 60 Hz and 144 Hz.
- The clock only accumulates while visible, so hiding and restoring the tab
  resumes on the same frame instead of jumping.
- `prefers-reduced-motion` pins the manifest's reduced-motion frame.
- Timers, rAF handles and observers are cleaned up on unmount.
- Missing assets, invalid metadata and dimension mismatches all render a safe
  dashed fallback box, preserving existing missing-sprite behaviour.
- `pointer-events: none` by default, so sprites never intercept office input.
- Asset URLs resolve through the existing `resolvePublicAssetPath` / `BASE_URL`
  mechanism, so nested deployment bases work.

## 9. Visual lab

```bash
npm run dev
# then open http://localhost:8080/sprite-lab.html
```

Production build emits `dist/sprite-lab.html` alongside `dist/index.html`. Only
`vite/config.prod.mjs` was changed, to add the second rollup input.
`package.json` and `src/App.tsx` were not modified.

The lab provides: asset selector, full source preview, checkerboard/dark/light/
magenta backgrounds, grid overlay with zero-based row/column labels and cell
boundaries, individual-frame preview, play/pause, prev/next frame, speed and
scale controls, loop-mode selector, reduced-motion toggle, float-transform
toggle, a locked nearest-neighbour indicator, manifest validation results,
readiness badges, and a deliberately invalid animation demonstrating the safe
fallback.

Status is reported on **five separate axes** rather than one green badge:
manifest structure, source measurements, production approval, sequence
authorship and visual review. The Nexus entry is labelled
`CANDIDATE — HUMAN REVIEW REQUIRED`.

Assets whose measured layout failed equal-cell verification do **not** get a
fabricated uniform grid. The lab shows the source image with no clickable frame
cells and states that frame extraction is unavailable pending human review.

Manual frame navigation stores a **sequence position**, resolving the sheet
frame via `sequence[position]`. Both values are displayed, because under
ping-pong they differ. The position resets when the animation or loop mode
changes and is clamped so it can never select an unrelated or negative frame.

## 10. Reusing existing code

`src/office/sprites/playback.ts` delegates to the existing helpers in
`src/office/animation.ts` (`buildPlaybackSequence`, `nextPlaybackIndex`) via a
`toAnimationDefinition()` adapter. `src/office/animation.ts`,
`src/office/assets.ts` and `src/office/types.ts` were **not modified**, so all
existing tests keep passing unchanged. No competing animation system was created.
