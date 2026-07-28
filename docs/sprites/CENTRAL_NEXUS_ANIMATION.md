# Central Nexus Hologram Animation

Measured metadata for `Nexus Tube Sprite.png` and the animations derived from it.

## 1. Source facts (all measured, none assumed)

| Property | Measured value |
|---|---|
| Source path | `Nexus Tube Sprite.png` |
| Production path | `public/assets/office/sprites/central-blue-tube-hologram.png` |
| SHA-256 | `bf17e81c95cf3c54d4f972eafca980fe6af0958d476915f57e621a50593018d6` |
| File size | 2,596,931 bytes |
| Source dimensions | **1254 x 1254** |
| PNG bit depth | 8 |
| PNG colour type | 6 (RGBA) |
| True alpha channel | yes |
| Transparency used | yes (alpha range 0–255) |
| Fully transparent pixels | 831,513 of 1,572,516 (52.9%) |
| Uniform opaque background | no |
| Columns | **10** |
| Rows | **9** |
| Total cells | **90** |
| Blank cells | 0 |
| Uniform cell grid | **no** |

## 2. The assumptions that turned out to be wrong

The task brief warned against assuming 10 rows / 10 columns / 100 frames. The
measurements confirm that warning:

- The sheet is **10 columns x 9 rows = 90 cells**, not 100.
- `1254 / 10 = 125.4` and `1254 / 9 = 139.33`, so the canvas is **not evenly
  divisible** by any whole-pixel cell size in either axis.
- Measured cell widths vary across **88, 96, 100, 101, 102, 103 px**.
- Measured cell heights vary across **97, 120, 122, 123 px**.
- The final row is only **97 px** tall versus 120–123 px elsewhere: it is
  **vertically truncated**, with ink ending at y=1223 and rows 1224+ empty.

Because of this, **equal-cell extraction is invalid** for this asset. The
manifest therefore uses **explicit per-frame rectangles** measured from ink
bands, and `uniformGrid` is `false`. Validation rejects a non-uniform animation
that fails to supply rectangles.

## 3. Frame layout

Column ink bands (x-start, x-end):

```text
[21,108] [138,233] [263,350] [384,471] [498,599]
[618,720] [740,840] [860,959] [979,1079] [1101,1200]
```

Row ink bands (y-start, y-end):

```text
[10,132] [151,273] [292,414] [433,554] [572,694]
[712,833] [851,970] [989,1108] [1126,1223]
```

Frames are indexed **zero-based** in reading order: index = `row * 10 + column`,
so index 0 is top-left and index 89 is bottom-right. Full rectangles live in
`src/office/sprites/source-asset-inventory.json` and are consumed directly by
`src/office/sprites/manifest.ts`.

Left margin (x 0–20), right margin (x 1201–1253) and bottom margin (y 1224–1253)
contain no ink and are excluded. No numbers or text labels are embedded in this
artwork.

## 4. Tube vs. robot

The tube housing is **redrawn in every cell** — it is not a static background
with only the robot changing. Any future attempt to layer the robot in front of
or behind office geometry must account for the glass being part of each frame.
Foreground/background layering against the real office has **not** been
confirmed and is listed as an open decision below.

## 5. Is this an animation sequence?

Not verifiably. A per-cell similarity analysis (32x32 luminance-weighted-alpha
signatures, RMS distance) gave:

- mean distance between reading-order consecutive cells: **29.31**
- mean distance between random cell pairs: **35.80**
- ratio: **0.82**

Consecutive frames are only marginally more similar than random pairs. A genuine
smooth animation would show a ratio far closer to zero. The sheet reads as a
**grid of pose variations**, not an ordered animation strip. Several cells in row
3 also contain an orbiting-ring effect absent elsewhere.

Accordingly, the sheet is classified `conditionally_usable`, not
`production_ready`, and the frame order is documented as a curatorial choice
rather than a verified sequence.

## 6. Defined animations

### `ANIM_CENTRAL_NEXUS_IDLE`

| Field | Value |
|---|---|
| Asset set | `ASSETSET_CENTRAL_NEXUS_HOLOGRAM` |
| Public path | `assets/office/sprites/central-blue-tube-hologram.png` |
| Source dimensions | 1254 x 1254 |
| Rows / columns / cells | 9 / 10 / 90 |
| Nominal frame box | 103 x 123 (largest measured cell) |
| Frame index base | 0 |
| Frame order | `0,1,2,3,4,5,6,7,8,9` |
| Used frames | 10 (row 0) |
| Unused frames | 80 (rows 1–8) |
| Default frame duration | 120 ms |
| Per-frame durations | none (uniform) |
| Loop mode | `ping-pong` |
| Playback direction | `forward` |
| Hold behaviour | `first-frame` |
| Anchor | `{ x: 0.5, y: 1 }` (bottom-centre) |
| Trim behaviour | `none` |
| World scale | 1 |
| Pixel art / interpolation | true / `nearest` |
| Z-layer / blend / opacity | `sprites` / `normal` / 1 |
| Preload | `lazy` |
| Reduced-motion frame | 0 |
| Fallback animation | none |
| Production | true |

Row 0 was chosen because it is the only run of ten consecutive cells sharing a
single measured height (123 px) on a common baseline. `ping-pong` avoids a hard
visual cut between frame 9 and frame 0, which are not continuous.

### `ANIM_CENTRAL_NEXUS_FLOAT`

Identical frames, 160 ms per frame, `loop` mode, falls back to
`ANIM_CENTRAL_NEXUS_IDLE`. The vertical float is a **CSS transform** applied by
the renderer (`.sprite-sheet-renderer--float`), deliberately kept separate from
frame selection so it can be disabled independently and is automatically
suppressed under `prefers-reduced-motion`.

## 7. Unresolved — needs a human decision

1. Whether rows 1–8 form intended animation states, and if so their order and
   grouping. 80 of 90 frames are currently unused.
2. What the orbiting-ring cells in row 3 represent (a distinct state? an alt?).
3. Why the final row is truncated to 97 px — export artefact or intentional.
4. Whether the tube should render behind, in front of, or split around office
   geometry.
5. The real-world scale of the hologram against the 8192 x 5460 office canvas.

## 8. Floor 1 integration is deferred

**No Floor 1 placement was added in this work.** No coordinates, sprite anchors,
z-order decisions or overlay entries for the Central Nexus tube exist in this
change. Integration remains blocked until all of the following are true:

1. Floor 1 registration is human-approved.
2. Production sprite-anchor coordinates exist.
3. The Central Nexus anchor has been visually reviewed.
4. The animation's scale and z-layer have been tested against the real office
   viewport.
5. The foreground/background tube layering has been confirmed.

### Integration steps once PR #19 is merged and the above are satisfied

1. Read the approved sprite anchor for the Central Nexus from the registered
   Floor 1 data. Do not hand-author coordinates.
2. Add a `sprite_anchor` overlay entry referencing
   `ASSETSET_CENTRAL_NEXUS_HOLOGRAM` and `ANIM_CENTRAL_NEXUS_IDLE`.
3. Set `worldScale` from a measured comparison against the office canvas.
4. Mount `<SpriteSheetRenderer />` from `OverlayRenderer` at the anchor's
   world-to-screen transformed position, on the `sprites` layer.
5. Confirm layering against the tube artwork in the background image.
6. Re-run `npm run typecheck`, `npm run lint`, `npm test` and `npm run build`.
