# Floor 1 Sprite Work Log

## Gate — verified `5df2964`

The verified application returned HTTP 200 at 1920×1080 with no console or page errors. Captures covered the full floor, permanent-agent area, Operations, Executive meeting space, and Sandbox. At overview and close zoom, characters were crisp but visibly repeated: one 16×24 silhouette and one standing pose were tinted into six category textures. Seated agents did not have distinct seated anatomy.

Baseline commands passed: `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npx vitest run` (157 tests), and `npm run build`. The sandbox initially blocked esbuild from reading the Vite config; the identical build passed outside that filesystem restriction. Remote CI also passed on Node 18 and Node 20.

## Typed appearance architecture

The source of truth is a strict appearance record attached to each occupant. Stable FNV-1a seeds derive controlled variation from occupant IDs; activity, context, category, and role variants author pose, seat, badge, accent, and accessory decisions. The first checkpoint remained crisp at overview and close zoom. Standing bodies now have visible arms, legs, clothing panels, hair, faces, badges, accessories, and contact shadows. Dedicated seated bodies sit behind desks and tables instead of reusing standing-height art. Operations console silhouettes and Boardroom seating read more naturally, although final close-up framing and label density still require a later QA capture.
