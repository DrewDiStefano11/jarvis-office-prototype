# Floor 1 browser QA summary

Candidate registration remains unverified; these observations certify candidate navigation behavior only.

## Representative visible checks

- Long cross-office route: accepted and visibly animated through modeled doors.
- Same-side projection: an invalid collider target projected to a clearance-safe route without moving the agent during preview.
- Exterior target: rejected safely while the active agent retained its committed route.
- D46: the repaired aperture was traversed from both sides and the committed route explicitly reported `D46`.
- Debug clearance overlay: aligned with the clean office image at the tested fitted viewport.
- Normal Office Engine: loaded with clean artwork and no development overlay enabled by default.

## Ten-minute 50-agent soak

- Duration: 613 seconds.
- Samples: 11 checkpoints; average checkpoint gap 57.7 seconds; maximum checkpoint gap 67 seconds.
- Final population: 50 active, 5 moving, 40 temporarily waiting under deliberate congestion.
- Planning: 1,839 route requests and 2,859 congestion replans; zero navigation-graph rebuilds during the run.
- Portals: 139 completed transitions; zero portal waits at the final sample.
- Cache: bounded at 256/256 entries throughout saturation.
- Collision traffic: 756,126 checks and 479,998 detected conflicts; conflicts produced waits/replans rather than collision bypass.
- Responsiveness: final steady tick 1.3 ms; recorded maximum tick 353.4 ms; one animation loop remained active.
- Failures: no `route-failed` state, no disappearing agents, and no observed permanent global pause.
- Screenshot: `browser-50-agent-10-minute-soak.png`.

The retained terminal-controlled QA runner records higher-frequency sample counts, average/max sample gaps, long tasks, route outcomes, portal phases, animation direction checks, browser errors, and explicit pass/fail assertions when run against the final candidate.
