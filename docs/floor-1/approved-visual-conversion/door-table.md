# Door-system plan

Every stable room keeps at least one data-backed door. Existing IDs remain valid; the conversion adds explicit wall segment, clearance bounds, state, and interaction metadata.

| Door family | Use | Width | Access | Proof example |
|---|---|---:|---|---|
| standard office | focus/support/general offices | 40 | general/department | focus-room-1 |
| glass office | executive/meeting rooms | 48 | department/restricted | jarvis-command-office |
| secure badge | Security/technical rooms | 48 | restricted/highly restricted | Engineering secure lab edge |
| checkpoint gate | public transition | 52 per lane | controlled | four-lane checkpoint |
| containment | Sandbox vestibule/cells | 56 | escorted containment | cell-new-agent |
| elevator | internal floor transition | 84 | controlled | main elevator |
| expansion barrier | sealed future interface | 120 | blocked | west/east expansion |

Door placement rules:

- The door center lies on the declared wall segment.
- A minimum 48-unit room-side and corridor-side clearance polygon remains unobstructed.
- Doors never open through desks, chairs, tables, walls, or another security boundary.
- Conference doors avoid table and chair pull-back zones.
- Containment doors include reader, warning light, observation glass, and a dedicated authorized node.
