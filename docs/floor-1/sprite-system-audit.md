# Floor 1 Sprite System Audit

## Verified starting point

- Repository: `DrewDiStefano11/jarvis-office-prototype`
- Branch: `feature/floor-1-visual-foundation-v2`
- Starting local, remote, and PR #9 head: `5df2964cf5bcd7e9f52d1b1ac8ba60459640f5ba`
- Main: `23ff763f1afeb5b3394e40de077a272cacb4c518`
- PR #9 and PR #8: open and unmerged
- CI: passed on Node 18 and Node 20
- Working tree before this pass: clean
- Visual references: original target and latest full-floor rendering available
- Browser baseline: HTTP 200 with no console or page errors

## Existing character pipeline

The starting renderer generated six category textures, each 16×24 source pixels and rendered at 1.25× (20×30 CSS/game pixels). All 38 occupants used one standing silhouette, one pose, one skin palette, one hair treatment, and identical anchors. Category color plus a broad variant tint supplied the only visible differentiation. The appearance was deterministic, but there was no typed appearance record, pose library, seat composition, appearance-based cache key, character animation, or sprite-specific placement validation.

Starting counts:

- Visible occupants: 38
- Occupant textures: 6
- Body silhouettes: 1
- Poses: 1
- Clothing structures: 1 (six category colors)
- Hair variants: 1
- Skin-tone palettes: 1
- Rendered dimensions: 20×30
- Floor-contact origin: `(0.5, 0.8)`

Known problems: repeated programmer-art silhouettes, standing bodies over seated contexts, category tint covering role nuance, no facing-aware drawing, minimal floor contact, weak hover area at overview scale, no appearance data in the inspector, and no idle-motion cleanup to test. The existing central interaction/event architecture and scene cleanup are sound and will be extended rather than replaced.

## Implementation plan

Add a strict deterministic appearance model to each population record; generate layered low-resolution textures from stable appearance/pose/facing keys; use dedicated standing and seated dimensions/anchors; express department identity through small clothing panels, badge shapes, accessories, pose, and inspector text; use one shared restrained idle tween; and validate counts, cache keys, pose/seat compatibility, assigned-space containment, selection bounds, and cleanup. No external assets or dependencies are required.

## Final architecture and measured counts

- 38 typed appearance definitions and 38 stable cached texture combinations
- 24×34 standing source pixels; 24×30 seated source pixels; 1.24× render scale
- 3 body silhouettes and 3 controlled heights
- 11 hair styles, 6 skin-tone palettes, and 11 clothing structures
- All 13 authored pose families represented on the floor
- All 4 isometric facing directions represented and context-authored
- 11 accessory states including `none`; accessories remain selective
- Dedicated standing/seated anchors and contact shadows
- 5 occupants in one shared restrained idle tween; reduced/off modes freeze them
- Population render-object count unchanged at 38; unique character textures increased from 6 to 38
- Texture generation occurs once per stable key and never on pan, resize, selection, or React rerender
- Renderer shutdown destroys both ambient and occupant tweens and removes shared event listeners

Automated checks cover deterministic regeneration, variation floors, stable texture keys, appearance validity, pose/seat compatibility, assigned-space containment, doorway clearance, severe furniture intersections, duplicate IDs/positions, exact population categories, permanent identity, vacant workspaces, four Sandbox cells, interaction-bound standards, and reduced/off motion policy.
