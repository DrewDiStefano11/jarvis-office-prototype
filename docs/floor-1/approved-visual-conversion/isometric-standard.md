# Isometric and asset-resolution standard

| Contract | Approved value |
|---|---|
| Grid basis | 64 world units per planning tile |
| Projection | 2:1 isometric, no convergence |
| World to screen | `screenX = (worldX - worldY) × 0.5`; `screenY = (worldX + worldY) × 0.25` |
| Screen to world | inverse of the shared renderer transform, camera-adjusted |
| Room convention | world-space bounds; north/west walls full height, south/east walls cut away |
| Floor anchor | diamond polygon from room bounds |
| Wall anchor | wall baseline at world segment; height rises in screen Y only |
| Door anchor | center of a real wall opening with clearance on both connected sides |
| Desk/chair anchor | footprint center; visual origin at lower isometric contact edge |
| Character anchor | center foot contact, stable across all facings and poses |
| Depth | worldX + worldY plus typed layer offset |
| Pixel filtering | nearest-neighbor, whole-pixel placement, no smoothing |

## Source classes

- Standing characters: 96 × 128 source canvases for the proof; future profiles may use 80 × 112 where density requires it.
- Seated characters: dedicated 96 × 112 canvases with chair-compatible leg and arm placement.
- Major furniture: 128 × 128 or 160 × 160 depending on footprint.
- Architecture: 160 × 192 for doors, walls, elevator, and stairs; larger composites assembled from modular pieces.
- Overview detail: small props may be hidden below the medium-detail threshold, but furniture silhouettes and room identity remain readable.

Every asset uses a stable key, explicit footprint, origin, movement bounds, interaction bounds, compatible poses, and department/material variants.
