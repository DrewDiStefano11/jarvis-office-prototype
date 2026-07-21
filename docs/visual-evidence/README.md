# Floor 1 Visual Evidence Index

All screenshots were captured directly from the running application on branch `feature/floor-1-visual-foundation-v2` at rendering source SHA `322a4ec885f57439d498829b1e69f596b646f8ac`. Close-ups use the normal wheel-zoom and drag-to-pan controls at a moderate zoom. No screenshot uses developer overlays, manual edits, or defect-concealing crops. `capture-metadata.json` records the viewport, branch, SHA, area, title, render-command count, and browser errors for every image.

| Screenshot | Viewport | Area shown | Requirement evidence |
| --- | --- | --- | --- |
| [Floor 1 overview](floor-1-overview.png) | 1920×1080 | Complete Floor 1 and status panel | Whole floor, all nine department banners, Central Nexus, both expansion seals, consolidated totals, overall density and hierarchy |
| [Executive and Security](security-executive.png) | 1920×1080 | Executive Command, layered Security, north core | 3 Executive offices, Boardroom, Strategy room, 4 Security offices, separate Audit, Vault, Approval Review, passenger elevators, stair, service vestibule |
| [Operations](operations.png) | 1920×1080 | Reliability and Operations | Pods A/B/C, 12 consoles, assigned/vacant/surge states, Incident Command, 2 Operations private offices |
| [Engineering and Project](engineering-project.png) | 1920×1080 | Engineering Bay and Project | Departments 4–6, all 8 engineering functions, collaboration table, GitHub/DevOps adjacency, separate manager office, open Project Coordination, review room |
| [Reception and checkpoint](reception-checkpoint.png) | 1920×1080 | Public entrance sequence and secure split | Public vestibule, reception, intake, 4 gates, equipment side gate, full-width barrier, controlled lobby, three post-checkpoint routes |
| [Quality and Sandbox](quality-sandbox.png) | 1920×1080 | Quality lab and containment suite | Quality stations, glass transfer corridor, locked ends, shared vestibule, lab control, 4 independent cells and occupants |
| [Knowledge and Memory](knowledge-memory.png) | 1920×1080 | Knowledge Center | Public library, manager offices, shelves/search, department layer, locked Decision Archive and retention display |
| [Temporary Launch and support](temporary-support.png) | 1920×1080 | Southwest support areas | 8 temporary desks, 4 focus rooms, Break Room, Restrooms, Utility, Electrical/IT, remote emergency stair |
| [Workspace states](workspace-states.png) | 1920×1080 | Core state context | Assigned green, vacant blue, temporary amber, surge gray, and sandbox purple states; detailed examples are also visible in Operations, Temporary, and Sandbox close-ups |
| [Responsive laptop](responsive-laptop.png) | 1366×768 | Complete Floor 1 | Floor remains usable at laptop size; status panel and controls do not hide the office |

## Reproduction

1. Check out the reported branch SHA.
2. Run `npm ci`.
3. Run `npm run dev-nolog`.
4. Open `http://127.0.0.1:5173`.
5. Use wheel zoom and drag-to-pan for the close-up areas listed above.

The overview is the clean initial camera state. The application renders no temporary developer guides.
