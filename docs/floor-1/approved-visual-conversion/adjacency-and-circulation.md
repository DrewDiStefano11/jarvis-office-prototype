# Adjacency, circulation, and security graph

## Primary adjacency

| Area | Required neighbors |
|---|---|
| Executive | Nexus, Executive Boardroom, Strategy and Architecture |
| Security | checkpoint observation, Security Review, restricted route |
| Reliability/Operations | Nexus, Incident Command, technical equipment route |
| Agent Platform | Engineering, Quality, authorized Sandbox observation |
| Engineering | Agent Platform, Plugins, Project, Quality |
| Plugins | Engineering, Project, near Operations |
| Project | Engineering, Quality, Agent and Release Review, Knowledge |
| Knowledge | Project, Quality, archive/research spaces |
| Quality | Engineering, Agent Platform, Project, controlled Sandbox evaluation |

## Public-to-internal route

`exterior entrance → public vestibule → reception/navigation → waiting → visitor intake → full-width checkpoint → controlled lobby`

No alternate exterior door connects to a controlled, restricted, or containment space. The controlled lobby branches to the elevator, stairs, Nexus loop, general route, and escorted route.

## Internal circulation graph

`controlled lobby → Nexus south node → Nexus loop → {Executive, Security, Operations, Platform, Engineering, Plugins, Project, Knowledge, Quality}`

Each department node branches to its private offices and associated meeting/focus rooms. Corridor widths target 136 main, 104 secondary, and 140 containment world units.

## Containment graph

`controlled lobby → restricted evaluation checkpoint → transfer corridor → controlled vestibule → {cell-new-agent, cell-plugin, cell-model, cell-automation}`

All containment edges require escorted-containment access. There is no edge from a cell to Project, a conference room, exterior, or general circulation.

## Expansion graph

West and east expansion nodes are reachable from internal circulation but terminate at locked construction barriers. They have no outgoing walkable edge.

## Validation obligations

- Every room has a real door and room-entry graph node.
- Every workspace and conference seat has an approach node.
- Furniture-blocking bounds cannot intersect door-clearance polygons.
- Public routes cannot reach the internal graph without crossing the checkpoint edge.
- Sandbox cells can only be reached from the containment vestibule.
- Elevator and both stairs remain inside the building envelope and connected to controlled circulation.
