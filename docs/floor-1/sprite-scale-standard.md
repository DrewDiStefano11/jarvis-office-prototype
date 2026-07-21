# Floor 1 Sprite Scale Standard

This document and `src/rendering/occupantSpriteModel.ts` are the shared source of truth for character scale.

| Element | Source size / world scale | Render treatment |
| --- | --- | --- |
| Standing character | 24×34 source pixels | 1.24×, `(0.5, 0.91)` floor-contact origin |
| Seated character | 24×30 source pixels | 1.24×, `(0.5, 0.88)` floor-contact origin |
| Character shadow | 11–15×5 source pixels | Hard-edged ellipse inside the cached sprite |
| Hover bound | 30×15 source/display target | Whole-body tolerant hit region |
| Selection ring | 32×16 display pixels | Floor-contact marker, not a body recolor |
| Desk / chair / monitor | 32×32 source pixels | 1.28× environment scale |
| Standard door frame | World width ÷ 3, 22 px high | Isometric position with access indicator |
| Wall | Authoritative world height | Projected once with cutaway top and side shading |
| Conference table | 32×32 source pixels | 1.28×; seated sprites sort behind the table edge |
| Checkpoint gate | 32×32 source pixels | 1.28× with reader and red/green state cues |
| Elevator / stairs | 40×40 source pixels | 1.28× architecture scale |
| Sandbox cell | Authoritative room bounds | Same character scale; no cell-specific enlargement |

The three height variants alter anatomy by at most three source pixels. Departments never alter character scale. Standing occupants depth-sort from their floor contact at `+430`; seated occupants use `+330` so desk, console, and table fronts remain legible. All generated textures use nearest-neighbor filtering and the game uses pixel-art, antialias-off, rounded-pixel rendering.
