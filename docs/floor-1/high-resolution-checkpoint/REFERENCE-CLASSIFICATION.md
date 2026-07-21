# Supplied Visual-Reference Classification

All six supplied files were accessible before implementation. The two authoritative comparison images—the latest full-floor overview and the original whole-office target—were confirmed at 1920×1080 and 1536×1024 respectively. Reference-only artwork is not committed as production content.

| Reference | Classification | Dimensions | Perspective / density | Useful traits | Do not copy | Renderer compatibility |
| --- | --- | ---: | --- | --- | --- | --- |
| `codex-clipboard-eeeb816d-ef80-4bae-80db-2671984cbab2.png` | Latest current implementation | 1920×1080 | Project isometric projection; low-to-moderate source density; 24×34 characters and 32×32 furniture | Working camera composition, current layout, controls, exact population, access and department structure | Current compressed geometry, large persistent titles, low-detail sprites | Exact baseline truth |
| `codex-clipboard-75aa89e1-ffba-4cdc-a683-fecc14244f30.png` | Original whole-office target | 1536×1024 | Dense cutaway/isometric-inspired elevation; high scene density with readable subrooms | Rich office hierarchy, clear room purpose, architectural depth, furniture variety, warm lighting, functional storytelling | Exact layout, text, characters, or identifiable asset designs | Conceptual target; adapt to the existing projection and data model |
| `codex-clipboard-d71644ad-2db9-45fb-962c-2ba960501243.png` | Primary detailed isometric pixel-office reference | 211×212 | Crisp approximately 2:1 isometric pixel construction; high detail per object | Spacious single-room composition, character-to-furniture scale, warm wood and teal, shelving, plants, wall art, differentiated desks | Exact room arrangement, palette placement, or asset silhouettes | Strongest quality reference for the candidate suite |
| `codex-clipboard-68539610-3474-4b8c-9424-f700d33a53de.png` | Character-detail reference | 203×203 | Front-facing orthographic business character; high character-to-frame scale | Separate hair/face, jacket, shirt, tie, arms, legs, shoes, briefcase, deliberate shading | Perspective, identity, pose, tracing, recolor, or production use | Detail benchmark only; redraw as original isometric facings |
| `codex-clipboard-c9ba6ac6-4430-4e89-bc03-4ab31ab13512.png` | Isometric furniture-structure reference | 263×178 | Small hard-edged sprite sheet; clean isometric angle; low-to-moderate detail | Desk planes, chair construction, cabinet scale, monitor orientation, consistent anchors | Exact sprites, palette, tracing, or its low detail ceiling | Geometry guide for original higher-resolution furniture |
| `codex-clipboard-93efb8b9-2cc0-487f-8fd6-8c10c1bb155d.png` | Pixel-prop detail reference | 2304×1952 | Mixed front/three-quarter pixel objects; high display resolution; varied object density | Phones, printers, PCs, water coolers, paperwork, clocks, charts, calendars, plants, storage, material ideas | Flat placement into the isometric scene, exact props, branding, or copied clusters | Prop vocabulary only; every object must be reinterpreted through Jarvis HQ projection |

## Reference priority applied

1. Written checkpoint requirements and the user's supplied classification.
2. Original whole-office target.
3. Detailed isometric pixel-office quality reference.
4. Verified current PR #9 implementation.
5. Character-detail reference.
6. Isometric furniture-structure reference.
7. Pixel-prop reference.

No separate illustrated/vector furniture collection was supplied in this checkpoint. Its absence is not a blocker and no replacement upload is required.

## Art-direction conclusion

The candidates will retain the project's current isometric projection, hard edges, nearest-neighbor rendering, interaction model, and data architecture. They will test original higher-resolution Jarvis HQ characters and furniture, larger authored room geometry, warm directional lighting, functional object detail, department-specific material systems, and non-obstructive label behavior. None of the supplied artwork will be traced, recolored, cropped into production textures, or committed as an asset.

