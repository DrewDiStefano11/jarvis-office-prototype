# Floor 1 Sparse Navigation Baseline

Starting SHA: `14ccd4f937c2b0b67d24627e86776ca9373d3af1`

This is a deterministic pre-change audit of PR #27's sparse walk-node/segment authority. It is not a production-approval artifact.

- Sample spacing: 192 source pixels
- Clearance-valid interior samples: 448
- Samples farther than the 620 px snap envelope: 0
- Sparse walk components: 1836
- Largest sparse component: 769 points
- Portal endpoints: 46/47 provisional-valid
- Unsupported portal IDs: D46
- D46: disabled-incomplete; A collision-clear registered walk node was not found for both connected zones.

## Room coverage

| Room | Valid samples | Within 620 px | Outside 620 px | Max support distance |
|---|---:|---:|---:|---:|
| ROOM_AGENT_PLATFORM_AND_MODELS | 29 | 29 | 0 | 256.6 |
| ROOM_CENTRAL_NEXUS | 52 | 52 | 0 | 301.3 |
| ROOM_CONFERENCE_1 | 9 | 9 | 0 | 112.7 |
| ROOM_CONFERENCE_2 | 12 | 12 | 0 | 133.5 |
| ROOM_DATA_MEMORY_KNOWLEDGE | 20 | 20 | 0 | 149.9 |
| ROOM_ENTRANCE | 5 | 5 | 0 | 19.9 |
| ROOM_EXECUTIVE_BOARDROOM | 7 | 7 | 0 | 100.8 |
| ROOM_EXECUTIVE_COMMAND | 16 | 16 | 0 | 199.3 |
| ROOM_FOCUS_A | 3 | 3 | 0 | 71.6 |
| ROOM_FOCUS_B | 3 | 3 | 0 | 57.5 |
| ROOM_FOCUS_C | 4 | 4 | 0 | 48.4 |
| ROOM_FOCUS_D | 4 | 4 | 0 | 70.7 |
| ROOM_MAIN_CONNECTING_WALKWAY | 111 | 111 | 0 | 323.1 |
| ROOM_PLUGINS_AND_AUTOMATION | 25 | 25 | 0 | 188.1 |
| ROOM_PROJECT_AND_RELEASE_MGMT | 24 | 24 | 0 | 138.3 |
| ROOM_RELIABILITY_AND_OPERATIONS | 20 | 20 | 0 | 190.4 |
| ROOM_RM1 | 4 | 4 | 0 | 100.3 |
| ROOM_RM10 | 6 | 6 | 0 | 91.1 |
| ROOM_RM2 | 4 | 4 | 0 | 80.6 |
| ROOM_RM3 | 6 | 6 | 0 | 191.5 |
| ROOM_RM4 | 3 | 3 | 0 | 32.6 |
| ROOM_RM5 | 7 | 7 | 0 | 129.0 |
| ROOM_RM6 | 6 | 6 | 0 | 135.2 |
| ROOM_RM7 | 3 | 3 | 0 | 93.4 |
| ROOM_RM8 | 6 | 6 | 0 | 47.6 |
| ROOM_RM9 | 3 | 3 | 0 | 52.1 |
| ROOM_SANDBOX_1 | 10 | 10 | 0 | 74.4 |
| ROOM_SANDBOX_2 | 12 | 12 | 0 | 141.7 |
| ROOM_SECURITY_A | 9 | 9 | 0 | 93.7 |
| ROOM_SECURITY_AND_GOVERNANCE | 24 | 24 | 0 | 226.7 |
| ROOM_SECURITY_B | 6 | 6 | 0 | 90.5 |
| ROOM_SOFTWARE_ENG | 37 | 37 | 0 | 146.4 |
| ROOM_STAIRS1 | 4 | 4 | 0 | 61.2 |
| ROOM_STAIRS2 | 6 | 6 | 0 | 48.7 |

## Representative failures

- baseline-snap-0001: (3168, 2208) in ROOM_MAIN_CONNECTING_WALKWAY — different-component: The nearby navigation geometry is disconnected from this agent.; nearest node walk:walk-paths-001:path:01:336 at 329.2 px.
- baseline-snap-0002: (3360, 2400) in ROOM_CENTRAL_NEXUS, ROOM_MAIN_CONNECTING_WALKWAY — different-component: The nearby navigation geometry is disconnected from this agent.; nearest node walk:walk-paths-075:path:01:088 at 303.5 px.
- baseline-snap-0003: (3360, 2208) in ROOM_CENTRAL_NEXUS, ROOM_MAIN_CONNECTING_WALKWAY — different-component: The nearby navigation geometry is disconnected from this agent.; nearest node walk:walk-paths-075:path:01:066 at 298.1 px.
- baseline-snap-0004: (2592, 2016) in ROOM_MAIN_CONNECTING_WALKWAY — different-component: The nearby navigation geometry is disconnected from this agent.; nearest node walk:walk-paths-054:path:01:024 at 286.7 px.
- baseline-snap-0005: (4704, 1824) in ROOM_CENTRAL_NEXUS, ROOM_MAIN_CONNECTING_WALKWAY — different-component: The nearby navigation geometry is disconnected from this agent.; nearest node walk:walk-paths-079:path:01:027 at 260.9 px.
- baseline-snap-0006: (3168, 2400) in ROOM_MAIN_CONNECTING_WALKWAY — different-component: The nearby navigation geometry is disconnected from this agent.; nearest node walk:walk-paths-002:path:01:019 at 256.7 px.
- baseline-snap-0007: (2208, 1824) in ROOM_AGENT_PLATFORM_AND_MODELS — transition-unavailable: Door D01 has no nearby approach in the agent's reachable component.; nearest node walk:walk-paths-054:path:03:045 at 256.6 px.
- baseline-snap-0008: (3360, 2016) in ROOM_CENTRAL_NEXUS, ROOM_MAIN_CONNECTING_WALKWAY — different-component: The nearby navigation geometry is disconnected from this agent.; nearest node walk:walk-paths-001:path:01:294 at 254.0 px.
- baseline-snap-0009: (3552, 1824) in ROOM_CENTRAL_NEXUS, ROOM_MAIN_CONNECTING_WALKWAY — different-component: The nearby navigation geometry is disconnected from this agent.; nearest node walk:walk-paths-001:path:01:252 at 253.8 px.
- baseline-snap-0010: (2016, 1440) in ROOM_SECURITY_AND_GOVERNANCE — transition-unavailable: Door D42 has no nearby approach in the agent's reachable component.; nearest node walk:walk-paths-063:path:01:010 at 229.1 px.
- baseline-snap-0011: (4896, 2016) in ROOM_CENTRAL_NEXUS, ROOM_MAIN_CONNECTING_WALKWAY — different-component: The nearby navigation geometry is disconnected from this agent.; nearest node walk:walk-paths-078:path:01:072 at 223.9 px.
- baseline-snap-0012: (4128, 288) in ROOM_EXECUTIVE_COMMAND — transition-unavailable: Door D42 has no nearby approach in the agent's reachable component.; nearest node walk:walk-paths-021:path:01:043 at 199.3 px.
- baseline-snap-0013: (2592, 2784) in ROOM_PLUGINS_AND_AUTOMATION — transition-unavailable: Door D15 has no nearby approach in the agent's reachable component.; nearest node walk:walk-paths-038:path:03:000 at 193.8 px.
- baseline-snap-0014: (480, 3360) in ROOM_RM3 — transition-unavailable: Door D15 has no nearby approach in the agent's reachable component.; nearest node walk:walk-paths-048:path:01:000 at 192.3 px.
- baseline-snap-0015: (6432, 672) in ROOM_RELIABILITY_AND_OPERATIONS — transition-unavailable: Door D34 has no nearby approach in the agent's reachable component.; nearest node walk:walk-paths-087:path:01:195 at 190.4 px.
- baseline-snap-0016: (3936, 4704) in ROOM_DATA_MEMORY_KNOWLEDGE — transition-unavailable: Door D15 has no nearby approach in the agent's reachable component.; nearest node walk:walk-paths-127:path:01:486 at 188.1 px.
- baseline-snap-0017: (1632, 1056) in ROOM_SECURITY_AND_GOVERNANCE — transition-unavailable: Door D42 has no nearby approach in the agent's reachable component.; nearest node walk:walk-paths-061:path:01:090 at 187.0 px.
- baseline-snap-0018: (5280, 2400) in ROOM_MAIN_CONNECTING_WALKWAY — different-component: The nearby navigation geometry is disconnected from this agent.; nearest node walk:walk-paths-006:path:01:080 at 186.9 px.
- baseline-snap-0019: (5088, 2592) in ROOM_MAIN_CONNECTING_WALKWAY — different-component: The nearby navigation geometry is disconnected from this agent.; nearest node walk:walk-paths-126:path:01:036 at 185.2 px.
- baseline-snap-0020: (3936, 4512) in ROOM_DATA_MEMORY_KNOWLEDGE — transition-unavailable: Door D15 has no nearby approach in the agent's reachable component.; nearest node walk:walk-paths-128:path:01:329 at 178.3 px.
- baseline-snap-0021: (3744, 1824) in ROOM_CENTRAL_NEXUS, ROOM_MAIN_CONNECTING_WALKWAY — different-component: The nearby navigation geometry is disconnected from this agent.; nearest node walk:walk-paths-075:path:01:000 at 176.5 px.
- baseline-snap-0022: (4320, 4320) in ROOM_DATA_MEMORY_KNOWLEDGE — transition-unavailable: Door D15 has no nearby approach in the agent's reachable component.; nearest node walk:walk-paths-127:path:01:270 at 175.5 px.
- baseline-snap-0023: (4320, 1056) in ROOM_EXECUTIVE_BOARDROOM — transition-unavailable: Door D38 has no nearby approach in the agent's reachable component.; nearest node walk:walk-paths-014:path:01:423 at 174.2 px.
- baseline-snap-0024: (864, 1632) in ROOM_AGENT_PLATFORM_AND_MODELS — transition-unavailable: Door D01 has no nearby approach in the agent's reachable component.; nearest node walk:walk-paths-056:path:02:000 at 172.2 px.
- baseline-snap-0025: (5664, 2016) in ROOM_MAIN_CONNECTING_WALKWAY — different-component: The nearby navigation geometry is disconnected from this agent.; nearest node walk:walk-paths-007:path:01:066 at 171.8 px.
- baseline-snap-0026: (4896, 1824) in ROOM_CENTRAL_NEXUS, ROOM_MAIN_CONNECTING_WALKWAY — different-component: The nearby navigation geometry is disconnected from this agent.; nearest node walk:walk-paths-008:path:01:045 at 170.8 px.
- baseline-snap-0027: (2976, 1824) in ROOM_MAIN_CONNECTING_WALKWAY — different-component: The nearby navigation geometry is disconnected from this agent.; nearest node walk:walk-paths-001:path:01:336 at 170.7 px.
- baseline-snap-0028: (1824, 3936) in ROOM_CONFERENCE_2 — transition-unavailable: Door D15 has no nearby approach in the agent's reachable component.; nearest node walk:walk-paths-031:path:01:164 at 170.7 px.
- baseline-snap-0029: (864, 3360) in ROOM_RM3 — transition-unavailable: Door D15 has no nearby approach in the agent's reachable component.; nearest node walk:walk-paths-045:path:01:044 at 169.6 px.
- baseline-snap-0030: (3936, 4320) in ROOM_DATA_MEMORY_KNOWLEDGE — transition-unavailable: Door D15 has no nearby approach in the agent's reachable component.; nearest node walk:walk-paths-128:path:01:297 at 165.2 px.
