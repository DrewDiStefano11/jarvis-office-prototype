# Character, furniture, material, and effect manifests

## Character system

- 30 visually unique base appearances; eight appear in the proof cluster.
- 4 facings: northeast, northwest, southeast, southwest.
- Dedicated standing and seated compositions.
- Variation axes: 4 silhouette/height combinations, 6 skin palettes, 12 hair constructions, 7 hair colors, 4 facial-hair modes, 3 glasses modes, 12 clothing constructions, 7 badges, 12 accessories, 13 poses.
- Stable 96×128 standing and 96×112 seated canvases in the proof.
- Anchors and identity remain invariant across facing and pose.

## Furniture families

- Desks: executive, private-office, permanent, Engineering, Project, Knowledge, Security, Quality, temporary, reception, Operations, Nexus, surge.
- Chairs: task, ergonomic Engineering, technical Operations, Nexus operator, executive, Boardroom, conference, focus, visitor, waiting, temporary, research.
- Tables: Executive Boardroom, standard conference, Security Review, Incident Command, Agent and Release Review, collaboration, side, reception-side, research.
- Other: bookshelves, filing/archive cabinets, equipment racks, printers, monitors, keyboards, phones, tablets, lamps, plants, wall displays, whiteboards, office props, security hardware.

Each asset defines a stable key, category/subtype, source class, world footprint, anchor, depth behavior, compatible pose, material profile, department variants, interaction bounds, movement bounds, and optional effect anchors.

## Material profiles

Neutral architecture uses warm gray, cream, muted steel, and dark trim. Department systems provide controlled accents:

- Executive: cream/walnut/amber/brass
- Security: burgundy/charcoal/muted red
- Operations: navy/steel/cyan
- Agent Platform: indigo/violet/cool gray
- Engineering: slate blue/blue-gray
- Plugins: forest/teal/restrained amber
- Project: warm brown/blue-gray/amber
- Knowledge: dark teal/olive/warm wood
- Quality: purple/pale gray
- Sandbox: violet/orange/controlled cyan

## Effect profiles

- Nexus: cyan motes, core rise, restrained ring pulse.
- Operations: refresh bands and status lights.
- Agent Platform: contained violet compute motes.
- Plugins: short green/teal connector pulses.
- Quality: purple validation scans and completion indicators.
- Sandbox: cell-specific contained effects with no leakage.
- Expansion: rare dust/work light/spark only when effects are enabled.
- General office: subtle screen changes, task lamps, close-detail coffee steam.

All effect profiles support On, Reduced, Off, camera visibility, and deterministic cleanup.
