# Floor 1 Continuous Reachability Certification

Candidate registration remains unverified; this certifies navigation behavior only.

- Navigation revision: `nav-b08b92ce`
- Source geometry revision: `floor1-ccf7e515`
- Adaptive samples: 55,748
- Clearance-valid authoritative samples: 15,901
- Expected-component samples: 15,901
- Coverage: 100.000%
- Interior cells: 7,467
- Reversible interior doors: 40
- Non-reversible interior doors: none

## Explicit exclusions

| Component | Classification | Cells | Rooms | Evidence |
|---:|---|---:|---|---|
| 1 | exterior-isolated | 110 | ROOM_RM5 | Positive geometry belongs only to a room whose modeled doorway leads to nonexistent exterior/service space. |
| 2 | collision-enclosed | 1 | ROOM_EXECUTIVE_COMMAND | Positive geometry is enclosed from the expected interior component by collision geometry and is excluded from authoritative walkable space. |
| 3 | collision-enclosed | 1 | ROOM_EXECUTIVE_BOARDROOM | Positive geometry is enclosed from the expected interior component by collision geometry and is excluded from authoritative walkable space. |
| 4 | collision-enclosed | 2 | ROOM_EXECUTIVE_COMMAND | Positive geometry is enclosed from the expected interior component by collision geometry and is excluded from authoritative walkable space. |
| 5 | exterior-isolated | 148 | ROOM_RM8 | Positive geometry belongs only to a room whose modeled doorway leads to nonexistent exterior/service space. |

## Representative reversible routes

| Case | Status | Forward px | Reverse px | Turns | Smoothed | Expanded cells | Doors |
|---|---|---:|---:|---:|---:|---:|---|
| representative-01 | valid | 3056.5 | 3064.7 | 6 | 6.5% | 261 | none |
| representative-02 | valid | 4832.6 | 4921.6 | 12 | 2.7% | 1222 | D02, D06 |
| representative-03 | valid | 4261.6 | 4233.4 | 9 | 4.4% | 957 | D42 |
| representative-04 | valid | 5719.7 | 5694.0 | 14 | 5.1% | 2514 | D42, D28 |
| representative-05 | valid | 4758.0 | 4753.4 | 10 | 4.3% | 1534 | D42 |
| representative-06 | valid | 2268.7 | 2314.3 | 4 | 6.6% | 430 | none |
| representative-07 | valid | 7069.5 | 7104.3 | 19 | 3.5% | 4773 | D01, D28, D18 |
| representative-08 | valid | 3772.6 | 3792.2 | 6 | 5.7% | 986 | D01 |
| representative-09 | valid | 2855.5 | 2867.5 | 12 | 4.5% | 1001 | D28, D19 |
| representative-10 | valid | 2699.4 | 2712.2 | 3 | 5.6% | 435 | none |
| representative-11 | valid | 686.5 | 716.5 | 1 | 6.0% | 35 | none |
| representative-12 | valid | 4114.8 | 4134.0 | 10 | 5.6% | 1534 | D28 |
| representative-13 | valid | 3012.4 | 2995.9 | 8 | 4.6% | 503 | D15 |
| representative-14 | valid | 5301.4 | 5319.2 | 18 | 4.6% | 918 | D19, D28, D35 |
| representative-15 | valid | 2968.5 | 2948.5 | 8 | 3.7% | 444 | D28 |
| representative-16 | valid | 2235.9 | 2260.8 | 6 | 4.7% | 220 | D18 |
