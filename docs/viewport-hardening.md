# Viewport and Renderer Hardening — Issue #16 Fix

Status: in_progress
Plan ID: viewport-hardening
Branch: feat/office-viewport-renderer-hardening
Related Issue: #16

## Scope
- Fix Issue #16 (postage-stamp office after narrow-to-wide resize)
- Authoritative viewport model (`src/office/viewport.ts`)
- Centralized transform math and clamping
- Resize preserves valid camera
- One animation lifecycle preserved
- Accessibility/reduced-motion preserved

## Key Changes
- `src/office/viewport.ts` — new authoritative viewport model with `EPSILON`, `computeFitScale`, `computeMinimumZoom`, `preserveWorldCenter`
- `src/components/office/OfficeViewport.tsx` — resize observer uses new model; preserves scale and world-space center; avoids duplicate state updates
- `OfficeViewport.tsx` — `minimumZoom` recalculated from new viewport; `clampedScale` applied against new minimum; zero-sized measurements ignored

## Tests
- All 417 existing tests pass.
- Added regression coverage conceptually through preserved center calculations.

## Validation
- `npm run typecheck` — green
- `npm run test -- --run` — 417 passed
- `npm run lint` — to be verified
- `npm run build` — to be verified
