const fs = require('fs');
const data = JSON.parse(fs.readFileSync('src/data/floorOne/floor-one-map.json'));

// Make sure we connect ALL major departments for the test routes required.
// We need nodes for central nexus, sw eng, exec command, etc.
const extraNodes = [
    { id: "nav-exec-command", name: "Exec Command", x: 768, y: 200, roomId: "executive-command", nodeType: "room-center", enabled: true },
    { id: "nav-security", name: "Security", x: 300, y: 250, roomId: "security-and-governance", nodeType: "room-center", enabled: true },
    { id: "nav-reliability", name: "Reliability", x: 1300, y: 250, roomId: "reliability-and-operations", nodeType: "room-center", enabled: true },
    { id: "nav-agent-platform", name: "Agent Platform", x: 250, y: 550, roomId: "agent-platform-and-models", nodeType: "room-center", enabled: true },
    { id: "nav-software", name: "Software Eng", x: 1280, y: 590, roomId: "software-engineering", nodeType: "room-center", enabled: true },
    { id: "nav-plugins", name: "Plugins", x: 250, y: 800, roomId: "plugins-and-automation", nodeType: "room-center", enabled: true },
    { id: "nav-project", name: "Project", x: 1280, y: 840, roomId: "project-and-release-management", nodeType: "room-center", enabled: true },
    { id: "nav-data", name: "Data", x: 768, y: 850, roomId: "data-memory-and-knowledge", nodeType: "room-center", enabled: true },
    { id: "nav-conf-2", name: "Conf 2", x: 470, y: 800, roomId: "conference-room-2", nodeType: "room-center", enabled: true },
    { id: "nav-conf-3", name: "Conf 3", x: 1030, y: 800, roomId: "conference-room-3", nodeType: "room-center", enabled: true }
];

const extraEdges = [
    { id: "edge-nexus-exec", from: "nav-central-nexus", to: "nav-exec-command", movementCost: 200, bidirectional: true, enabled: true },
    { id: "edge-nexus-security", from: "nav-central-nexus", to: "nav-security", movementCost: 200, bidirectional: true, enabled: true },
    { id: "edge-nexus-reliability", from: "nav-central-nexus", to: "nav-reliability", movementCost: 200, bidirectional: true, enabled: true },
    { id: "edge-nexus-agent", from: "nav-central-nexus", to: "nav-agent-platform", movementCost: 200, bidirectional: true, enabled: true },
    { id: "edge-nexus-software", from: "nav-central-nexus", to: "nav-software", movementCost: 200, bidirectional: true, enabled: true },
    { id: "edge-nexus-plugins", from: "nav-central-nexus", to: "nav-plugins", movementCost: 200, bidirectional: true, enabled: true },
    { id: "edge-nexus-project", from: "nav-central-nexus", to: "nav-project", movementCost: 200, bidirectional: true, enabled: true },
    { id: "edge-nexus-data", from: "nav-central-nexus", to: "nav-data", movementCost: 200, bidirectional: true, enabled: true },
    { id: "edge-plugins-conf2", from: "nav-plugins", to: "nav-conf-2", movementCost: 50, bidirectional: true, enabled: true },
    { id: "edge-project-conf3", from: "nav-project", to: "nav-conf-3", movementCost: 50, bidirectional: true, enabled: true }
];

data.navigationNodes.push(...extraNodes);
data.navigationEdges.push(...extraEdges);
fs.writeFileSync('src/data/floorOne/floor-one-map.json', JSON.stringify(data, null, 2));
