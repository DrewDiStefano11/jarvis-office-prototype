# Floor 1 Sprite Work Log

## Gate — verified `5df2964`

The verified application returned HTTP 200 at 1920×1080 with no console or page errors. Captures covered the full floor, permanent-agent area, Operations, Executive meeting space, and Sandbox. At overview and close zoom, characters were crisp but visibly repeated: one 16×24 silhouette and one standing pose were tinted into six category textures. Seated agents did not have distinct seated anatomy.

Baseline commands passed: `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npx vitest run` (157 tests), and `npm run build`. The sandbox initially blocked esbuild from reading the Vite config; the identical build passed outside that filesystem restriction. Remote CI also passed on Node 18 and Node 20.

## Typed appearance architecture

The source of truth is a strict appearance record attached to each occupant. Stable FNV-1a seeds derive controlled variation from occupant IDs; activity, context, category, and role variants author pose, seat, badge, accent, and accessory decisions. The first checkpoint remained crisp at overview and close zoom. Standing bodies now have visible arms, legs, clothing panels, hair, faces, badges, accessories, and contact shadows. Dedicated seated bodies sit behind desks and tables instead of reusing standing-height art. Operations console silhouettes and Boardroom seating read more naturally, although final close-up framing and label density still require a later QA capture.

## Standing, seated, role, and group checkpoints

- Standing variation: inspected Nexus, Reception, Project, Security, and Sandbox at overview/close zoom; silhouettes, height, hair, clothes, facings, and shadows remain pixel-sharp.
- Seated integration: inspected Operations, Boardroom, Incident Command, knowledge desks, and waiting seats; seated anatomy uses a shorter source frame and sorts behind furniture fronts.
- Department/role styling: accents occupy small panels, ties, badges, headsets, and devices rather than recoloring whole bodies.
- Meeting composition: Boardroom, Strategy, Incident, and review spaces use authored four-way facings; no adjacent meeting group uses one identical appearance/pose combination.
- Sandbox: New Agent, Plugin, Model, and Automation use unique poses, facings, accents, and devices inside their assigned cells.
- Idle motion: five deterministically selected characters share one staggered one-pixel tween; Reduced and Off pause the tween and restore floor anchors.
- Interaction: hover, selection ring, inspector, Escape/clear, persistent selection during camera changes, and camera-drag suppression were exercised in the browser.
- Placement/depth: all 38 records passed assigned-space, door-clearance, severe furniture-overlap, duplicate, vacancy, and Sandbox-cell checks; close-up visual review found no major clipping defect.

## Final population review

Captured 26 final evidence states at 1920×1080 and 1366×768. The app returned HTTP 200, all totals remained 24 permanent / 6 temporary / 4 Sandbox / 4 visitor-escort-waiting, browser console/page errors were empty, and a scripted pan did not create a selection. TypeScript, ESLint, and 164 tests passed before evidence capture.
