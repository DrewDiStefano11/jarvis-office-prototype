# Design QA — approved Floor 1 proof cluster

- source visual truth: `C:/Users/DDistefano/.codex/attachments/d51edddc-8b1f-4681-ab30-3899ac983c1d/image-1.png` (1536×1024) plus the supplied populated-office and character boards in the same attachment directory
- implementation: `docs/visual-evidence/approved-floor-proof/proof-overview.png` (1280×720 browser capture)
- route: `?visualLab=approved-floor-proof`
- viewport: 1280×720 CSS pixels, device pixel ratio 1
- density normalization: the source is a complete-floor concept and the implementation is an intentionally isolated 25% cluster, so comparison used equal on-screen framing rather than false pixel-for-pixel geometry
- state: expanded review card, fit-floor camera, labels auto, effects on, validation overlays off

## Findings

No actionable P0/P1/P2 issue remains for the isolated proof-cluster scope. The implementation is not a completed Floor 1 and must not be replicated until the user approves this checkpoint.

Required fidelity surfaces:

- Fonts and typography: the established Jarvis monospace UI remains crisp and readable; physical room signs use a compact pixel hierarchy. The reference contains denser room annotations, but those belong to the future complete-floor pass.
- Spacing and layout rhythm: the revised proof has one continuous facility foundation, broad room footprints, visible circulation, readable furniture clearance, and a consistent left control safe area. Expanded, compact, collapsed, presentation, pan, zoom, fit, and reset states remain usable at the captured viewport.
- Colors and visual tokens: executive amber/wood, Nexus cyan/metal, engineering blue, project brown, public neutral/green, focus green, and Sandbox purple remain distinguishable without abandoning the existing Jarvis palette.
- Image quality and asset fidelity: original nearest-neighbor textures use 112×128 character sources and 160×160 furniture sources. Supplied references remain reference-only and are not used as runtime assets. Focused captures confirm readable faces, hair, clothing, chairs, monitors, consoles, plants, doors, readers, and storage.
- Copy and content: the route clearly identifies itself as an isolated 25% proof and a user review gate. Room, role, inspector, and layer labels describe actual data-backed content.
- States and interactions: pan, pointer-centered zoom, Fit Floor, Reset View, hover, selection, inspector, expanded/compact status cards, labels, effects, movement routes, door clearances, furniture bounds, and presentation mode were exercised.
- Accessibility: semantic React controls, pressed states, visible keyboard focus, reduced-effects mode, inspector text, tooltips, and a screen-reader summary are present.

## Comparison history

### Pass 1 — blocked

- [P1] The initial proof rendered as disconnected room tiles instead of a coherent facility massing.
- [P2] Unclipped material hatch lines extended into the black canvas and made the floor look unfinished.
- [P2] Character and furniture silhouettes were too small and dark at the intended inspection zoom.

Fixes:

- Added a single stepped foundation footprint with edge trim and a grounded shadow.
- Removed the unbounded hatch treatment.
- Added repeated inset wall panels, larger furniture rendering, larger characters, and preserved their original multicolor sprite treatment.

Post-fix evidence: `proof-overview.png`, `proof-detail.png`, and `proof-close-up.png`.

### Pass 2 — passed

The revised source/implementation comparison showed a coherent partial facility, clear departmental zoning, readable high-resolution sprites at inspection zoom, and working validation overlays. Remaining differences from the complete-floor concept are expected because replication is deliberately paused at 25%.

## Focused evidence

- character and furniture readability: `docs/visual-evidence/approved-floor-proof/proof-close-up.png`
- hover: `docs/visual-evidence/approved-floor-proof/proof-hover.png`
- selection and inspector: `docs/visual-evidence/approved-floor-proof/proof-inspector.png`
- movement and door clearance: `docs/visual-evidence/approved-floor-proof/proof-overlays.png`
- controls and camera sequence: `docs/visual-evidence/approved-floor-proof/approved-floor-proof-interaction.gif`

## Runtime verification

- browser-rendered objects: 217
- cached generated textures: 53
- rooms: 8
- representative occupants: 10
- final clean-tab console errors: 0
- automated tests: 175 passed across 14 files
- TypeScript: passed
- ESLint: passed
- production build: passed

## Residual P3 polish

- Full Floor 1 will need additional furniture and decoration variants so repetition stays low across all 41 rooms.
- Additional hair, accessory, and seated-pose families should be introduced during replication while retaining the approved source scale.
- The final completed overview should approach the reference’s room density without shrinking the newly approved circulation widths.

final result: passed
