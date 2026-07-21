# PR #8 Salvage Audit

PR #8 (`38a8452fae3846f70c955e2ea097bd575874b7d4`) is reference material only. It remains open and unmerged. No commit from its implementation branch is an ancestor of this branch.

| Area | Classification | Decision |
| --- | --- | --- |
| Branded ID types | Reuse concept only | Keep category-specific, namespaced IDs; rewrite factories and add IDs for zones, walls, thresholds, furniture, architecture, and occupants. |
| Building registry | Rewrite before reuse | Keep registration as a concept; remove mutable global state and reject duplicates or cross-building floors. |
| Floor definition | Rewrite before reuse | Replace empty and `any[]` collections with complete typed structural collections and explicit world dimensions. |
| Department definitions | Reuse concept only | Retain the exact nine numbered department names; rewrite IDs, access, and visual metadata. |
| Room definitions | Rewrite before reuse | PR #8 geometry is incomplete, misplaces Project vacancies, and does not model all entrances or visual content. |
| Workspace definitions | Rewrite before reuse | Keep permanent/temporary/operational/surge/sandbox distinctions and exact-count intent; rewrite placement, footprints, and ownership. |
| Permanent-agent roster | Reuse concept only | Retain stable IDs `agent-001` through `agent-024`; rewrite names, roles, typing, and deterministic placement. |
| Validation utilities | Rewrite before reuse | Expand validation to every ID category, reference, capacity, coordinate, footprint, connected space, and populated core collection. |
| Tests | Rewrite before reuse | Preserve exact-count and access-invariant intent; add generic mock-floor rendering and comprehensive reference checks. |
| Route model | Do not reuse | Static Floor 1 does not require routes; PR #8 models only a fragment of the required circulation and uses unsafe casts. |
| Movement engine | Do not reuse | Movement and pathfinding are explicitly deferred. Existing baseline modules remain intact until UI migration is complete. |
| `OfficeScene` renderer | Do not reuse | It branches on Floor 1 IDs, uses raw geometry, draws special Nexus content in code, and does not meet pixel-art acceptance. |
| Control panel | Rewrite before reuse | Route-debug controls and direct Floor 1 imports are inappropriate for the final static visual office. |
| HUD | Rewrite before reuse | Keep the consolidated-count concept; replace hardcoded smooth dashboard styling with source-backed pixel UI. |

## Existing consumer protection

Current `main` routes `App.tsx` through `ControlPanel`, `domain/seed`, `domain/navigation`, and `domain/state`; `OfficeScene` also consumes the seed and navigation graph. Their public modules and 143 baseline tests are preserved while the new data-driven renderer is introduced. Obsolete UI code will be removed only after all imports are migrated and regression tests remain green.
