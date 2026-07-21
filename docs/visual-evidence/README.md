# Floor 1 Final Visual Evidence Index

The authoritative final-pass evidence is in [`final-sprite-pass/`](final-sprite-pass/). It was captured from the running application on `feature/floor-1-visual-foundation-v2` at rendering source SHA `2fe2bfdbe14c180756c93daddc26aa74bdab42e6`. That commit contains the final renderer and sprite source; the later evidence/documentation commit does not alter rendering. `capture-metadata.json` records branch, SHA, viewport, zoom, area, requirement, effects, motion, and browser errors for each capture.

The 1920×1080 overview uses Labels Auto. Character close-ups use the normal Labels Minimal control so sprite silhouettes and furniture depth remain unobstructed; this is a shipped user control, not a developer overlay. Images are direct browser captures with no retouching or defect-concealing crops. The older root-level images remain historical first-pass evidence and are not the final sprite acceptance set.

| # | Screenshot | Area / requirement |
| --- | --- | --- |
| 1 | [Full Floor overview](final-sprite-pass/01-full-floor-overview.png) | Complete floor, all 38 occupants, exact totals |
| 2 | [Medium population overview](final-sprite-pass/02-medium-population-overview.png) | Density and character-to-furniture scale |
| 3 | [Close pixel clarity](final-sprite-pass/03-close-pixel-clarity.png) | Crisp layered sprites, outlines, contact shadows |
| 4 | [Executive variations](final-sprite-pass/04-executive-variations.png) | Leadership clothing and accessories |
| 5 | [Boardroom composition](final-sprite-pass/05-boardroom-composition.png) | Meeting facings, seats, table depth |
| 6 | [Security and visitor variations](final-sprite-pass/06-security-visitor-variations.png) | Security badge/pose versus visitor treatment |
| 7 | [Checkpoint orientation](final-sprite-pass/07-checkpoint-orientation.png) | Controlled entrance and public-flow context |
| 8 | [Operations seated poses](final-sprite-pass/08-operations-seated-poses.png) | Dedicated console seating and headset variation |
| 9 | [Engineering poses](final-sprite-pass/09-engineering-poses.png) | Technical desk and collaboration context |
| 10 | [Project variations](final-sprite-pass/10-project-variations.png) | Standing/meeting states and visible vacancies |
| 11 | [Knowledge research](final-sprite-pass/11-knowledge-research.png) | Reading/research treatment and archive context |
| 12 | [Quality review](final-sprite-pass/12-quality-review.png) | Testing/review identity |
| 13 | [Temporary Launch](final-sprite-pass/13-temporary-launch.png) | Temporary badges and occupied/vacant desks |
| 14 | [Waiting occupants](final-sprite-pass/14-waiting-occupants.png) | Waiting pose and neutral visitor clothing |
| 15 | [Four Sandbox occupants](final-sprite-pass/15-four-sandbox-occupants.png) | New Agent, Plugin, Model, Automation differentiation |
| 16 | [Hair variety](final-sprite-pass/16-hair-variety.png) | Visible hair silhouettes |
| 17 | [Skin and clothing variety](final-sprite-pass/17-skin-clothing-variety.png) | Natural skin palettes and structural clothing differences |
| 18 | [Accessory variety](final-sprite-pass/18-accessory-variety.png) | Selective badge/device/accessory treatment |
| 19 | [Seated depth ordering](final-sprite-pass/19-seated-depth-ordering.png) | Chair, character, and table composition |
| 20 | [Character behind glass](final-sprite-pass/20-character-behind-glass.png) | Contained sprite remains readable through cell treatment |
| 21 | [Selected character](final-sprite-pass/21-selected-character.png) | Floor ring without body recolor |
| 22 | [Hover tooltip](final-sprite-pass/22-hover-tooltip.png) | Delayed, concise character tooltip |
| 23 | [Inspector details](final-sprite-pass/23-inspector-details.png) | Domain-sourced role, location, pose, facing, appearance, access |
| 24 | [Reduced motion](final-sprite-pass/24-reduced-motion.png) | Optional idle motion frozen |
| 25 | [Effects off](final-sprite-pass/25-effects-off.png) | Identity remains legible without ambient effects |
| 26 | [Responsive 1366×768](final-sprite-pass/26-responsive-1366x768.png) | Complete-floor fit with responsive product UI |

## Reproduction

1. Check out the reported rendering source SHA.
2. Run `npm ci` and `npm run dev-nolog`.
3. Open `http://127.0.0.1:5173`.
4. Use Fit Floor, department navigation, wheel/controls, Labels, Effects, hover, and selection to reproduce the recorded states.

The evidence run returned HTTP 200, produced no page/console errors, and verified that a camera drag does not create a selection.
