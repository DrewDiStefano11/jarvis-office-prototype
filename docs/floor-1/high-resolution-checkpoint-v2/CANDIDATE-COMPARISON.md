# Candidate C / D / E comparison

Capture SHA: `d574a8b9732760cf84e37b8719615bab4c6ec20e`

This is a direction checkpoint for a representative multi-room suite. It does not convert production Floor 1.

## Measured system comparison

| Measure | Candidate C | Candidate D | Candidate E |
|---|---:|---:|---:|
| Suite dimensions | 1095×652 | 1280×740 | 1500×880 |
| Usable area vs production | +70.0% | +125.5% | +214.3% |
| Area beyond C | — | +32.6% | +84.9% |
| Main / secondary / secure corridor | 108 / 82 / 96 | 136 / 92 / 116 | 140 / 104 / 140 |
| Movement-clearance area | 164,000 | 308,000 | 502,000 |
| Standing / seated source | 64×80 / 64×70 | 80×112 / 80×98 | 112×128 / 112×112 |
| Furniture / architecture source | 80 / 88 | 112 / 128 | 160 / 176 |
| Material / department themes | 12 / 6 | 15 / 10 | 15 / 10 |
| Particle / lighting profiles | 3 / 4 | 7 / 6 | 9 / 8 |
| Rendered objects (isolated suite) | 91 | 149 | 149 |
| Comparison texture cache | 155 across C/D/E | 155 across C/D/E | 155 across C/D/E |
| Approx. generated RGBA source footprint* | ~2.18 MiB | ~2.2 MiB | ~4.1 MiB |
| Expected conversion effort | High | High | High / premium tuning |
| Performance risk | Higher | Higher | Premium |

\*Approximation from generated source dimensions; excludes Phaser/WebGL bookkeeping and GPU padding. It is not a process-memory measurement.

## Quality review

| Surface | Candidate C | Candidate D | Candidate E |
|---|---|---|---|
| Character detail / individuality | Readable but small; role distinction weak at fit | Stronger faces, tailoring, accessories, role palettes | Best close detail and silhouette readability |
| Seated integration | Functional | Better chair/console scale | Best leg, chair, and console separation |
| Desks / chairs / tables | Generic families dominate | Purpose-built engineering, research, security, reception, executive, and technical families | Same broad system at a larger source class with extra shading |
| Storage / consoles | Compact | Clearly constructed and room-specific | Highest close-zoom readability |
| Walls / doors / glass | Serviceable | Taller walls, wider doors, richer glass panels | Deepest trim, glazing, and access-device detail |
| Floors / materials | Six-room palette | Eight-zone material language and clearer transitions | Strongest material legibility |
| Lighting / particles | Limited | Restrained functional ambience | Richer layered ambience; higher cost |
| Department identity | Moderate | Strong | Strongest at medium and close zoom |
| Overview / medium / close | Best raw overview compactness; weakest close detail | Best balance across all three scales | Best medium/close quality; densest overview |
| Movement readiness | Insufficient for the requested future movement system | Clear primary, secondary, and secure lanes with explicit overlays | Most clearance and room to grow |
| Full-floor feasibility | Existing upper bound | Best practical base | Selective showcase-room use is more practical than universal use |
| Future-floor suitability | Limited | Strong | Excellent for executive, boardroom, Operations, and hero spaces |
| Maintainability | Existing typed profile | Reuses typed profiles, palettes, furniture families, and overlay data | Same reusable system, but more asset and performance tuning |

Candidate D strengths: substantial real geometry growth, clear movement lanes, strong visual lift, and manageable whole-floor risk. Weaknesses: less premium at close zoom than E and still needs production animation frames.

Candidate E strengths: highest character, furniture, architecture, and close-zoom ceiling. Weaknesses: largest memory/performance budget and greater risk of over-density if applied indiscriminately.

## Scores (1–5)

| Criterion | C | D | E |
|---|---:|---:|---:|
| Physical spaciousness | 2 | 4 | 5 |
| Movement readiness | 2 | 4 | 5 |
| Character detail | 3 | 4 | 5 |
| Character individuality | 3 | 4 | 5 |
| Seated integration | 3 | 4 | 4 |
| Desk quality | 3 | 4 | 5 |
| Chair quality | 3 | 4 | 5 |
| Table quality | 3 | 4 | 5 |
| Technical-console quality | 3 | 4 | 5 |
| Environmental detail | 3 | 4 | 5 |
| Material quality | 3 | 4 | 5 |
| Color identity | 3 | 4 | 5 |
| Lighting | 3 | 4 | 5 |
| Particle quality | 2 | 4 | 5 |
| Overview clarity | 4 | 5 | 4 |
| Medium-zoom clarity | 3 | 5 | 5 |
| Close-zoom quality | 3 | 4 | 5 |
| Performance | 5 | 4 | 3 |
| Maintainability | 4 | 4 | 4 |
| Whole-floor feasibility | 4 | 5 | 3 |
| Long-term visual potential | 3 | 5 | 5 |
| **Total / 105** | **67** | **91** | **98** |

## Recommendation

RECOMMENDED BASE: Candidate D

RECOMMENDED ROOM SCALE: room-type hybrid — D for standard departments and circulation; E for executive, boardroom, Operations, reception, and other hero rooms.

RECOMMENDED CHARACTER SYSTEM: hybrid — E source dimensions and facial/clothing detail, with D runtime density and animation budgets.

RECOMMENDED FURNITURE SYSTEM: hybrid — D standard furniture footprints; E rendering/detail for hero furniture and technical consoles.

RECOMMENDED COLOR SYSTEM: E.

RECOMMENDED PARTICLE SYSTEM: D by default, with E profiles enabled only for contained hero-room effects.

RECOMMENDED PERFORMANCE STRATEGY: cache profile-scoped textures, pool contained particle emitters, cap active ambience by camera visibility, preserve reduced/off modes, and measure representative full-floor scenes before expanding E density.

RECOMMENDED FULL-FLOOR MIGRATION METHOD: room-cluster migration, one department cluster at a time, validating circulation, occlusion, and runtime budgets before proceeding.

REASON: this hybrid preserves D's whole-floor clarity and movement readiness while using E where its added resolution is visually meaningful. It is the best match for the requested larger, premium office without imposing E's cost uniformly.

Decision requested: Approve Candidate D, Approve Candidate E, or Approve the recommended D/E hybrid. No full-floor conversion should begin before that decision.
