# High-Resolution Candidate Comparison

## Recommendation

Use **Candidate B as the production base**, with a controlled hybrid treatment:

- Keep Candidate B's 48x64 standing characters, 48x56 seated characters, 64 px furniture, 72 px architecture, and +44.8% representative room area.
- Borrow Candidate C's extra spacing and prop richness only for showcase spaces: the Central Nexus, Executive Boardroom, Operations pods, reception/checkpoint, and sandbox containment.
- Keep Candidate A's restraint for labels, repeated desks, support spaces, and distant overview elements.

This gives the full office a meaningful detail increase without forcing Candidate C's +70% footprint across all rooms. It is the best balance between close-up readability, overview density, laptop fit, implementation cost, and performance risk.

## Measured profiles

| Profile | Suite | Area delta | Standing | Seated | Furniture | Architecture | Migration | Risk |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Baseline | 840x500 | 0% | 24x34 | 24x30 | 32 px | 40 px | Existing | Existing |
| Candidate A | 940x560 | +25.3% | 32x48 | 32x42 | 48 px | 56 px | Low | Low |
| Candidate B | 1010x602 | +44.8% | 48x64 | 48x56 | 64 px | 72 px | Medium | Moderate |
| Candidate C | 1095x652 | +70% | 64x80 | 64x70 | 80 px | 88 px | High | Higher |

Candidate differences are authored geometry and source texture changes. They are not camera-only scaling.

## Decision matrix (1 = weak, 5 = strong)

| Criterion | A | B | C | Finding |
| --- | ---: | ---: | ---: | --- |
| Character readability | 3.4 | 4.5 | 4.8 | C has the clearest face/clothing separation; B is already clearly readable. |
| Furniture construction | 3.6 | 4.5 | 4.8 | B resolves monitor planes, chair backs, table edges, glass frames, and access hardware. |
| Overview readability | 4.5 | 4.4 | 3.8 | A and B preserve useful density; C begins to enlarge the total floor excessively. |
| Reference quality direction | 3.5 | 4.4 | 4.7 | C is closest in raw scale; B is closer to the target's balance at full-room viewing distance. |
| Laptop fit | 4.6 | 4.3 | 3.8 | All fit 1366x768; C requires the smallest camera fit and loses more close detail. |
| Migration practicality | 4.7 | 3.9 | 2.7 | A is cheapest, B manageable, C materially expands every room and asset. |
| Performance confidence | 4.7 | 4.3 | 3.7 | All were responsive in the lab; C carries the largest texture and floor-footprint risk. |
| Overall | 4.1 | **4.4** | 4.0 | B is the strongest base; use C selectively. |

## Visual findings

### Candidate A

Candidate A is a credible minimum upgrade. Silhouettes are cleaner and 48 px furniture gains construction detail, but faces, seated poses, and small office props still approach their resolution ceiling at close zoom. It is the lowest-risk option but may underdeliver against the detailed room reference.

### Candidate B

Candidate B is the first option where hair, face, jacket/shirt separation, limbs, badges, seating posture, desk fronts, console banks, plants, shelving, glass, readers, and floor materials all remain legible without an extreme zoom. The suite still reads as a compact management-game space at 1920x1080 and 1366x768.

### Candidate C

Candidate C establishes a useful upper boundary. Its characters and props have the strongest close-up presence, but the full-floor consequence is significant: a uniform +70% room-area expansion would either enlarge the total world substantially or require more aggressive overview zooming, reducing the visible benefit. It is best reserved for high-value spaces and unique props.

## Labels and interaction

- Default candidate titles are hidden until hover or selection; small physical wall signs remain.
- Hover reveals one department title without persistent obstruction.
- Selection holds the title and opens the inspector.
- Minimal and On modes remain available.
- Pan, pointer-centered zoom, Fit Prototype, Reset View, hover, selection, inspector, labels, effects, and presentation mode were exercised in the final recording.
- Reduced-motion and effects-off modes preserve core legibility.

## Performance observations

- Four-way view: 355 Phaser display objects, 132 cached textures after all profiles were visited, and no continuing active tweens once effects were disabled.
- Single Candidate B view: 87 display objects, one optional ambient tween with effects on.
- Approximate texture-pixel upper bounds before engine overhead, assuming all 20 role/facing character textures and 72 furniture/palette variants are present: A 0.75 MiB, B 1.41 MiB, C 2.18 MiB. Actual cache use depends on which variants are requested.
- Candidate/profile switch captures settled in roughly 0.55-0.59 seconds, including the harness's deliberate wait for stable screenshots.
- Fresh 1440x900 loads at DPR 1, 1.25, 1.5, and 2 returned HTTP 200 in 0.96-1.53 seconds with zero console errors.
- Camera pan and pointer-centered zoom remained responsive in all tested modes.

## Scope boundary

This checkpoint does not authorize or perform the full Floor 1 conversion. The current production floor remains unchanged by default. Production conversion should begin only after the user approves A, B, C, the recommended hybrid, a revision, or rejects all directions.
