const fs = require('fs');
const data = JSON.parse(fs.readFileSync('src/data/floorOne/floor-one-map.json'));

const additionalRooms = [
    { id: "left-security-checkpoint", name: "Left Security Checkpoint", department: "security", category: "support", description: "Security checkpoint.", polygon: [{x:450,y:900},{x:550,y:900},{x:550,y:950},{x:450,y:950}], enabled: true },
    { id: "right-security-checkpoint", name: "Right Security Checkpoint", department: "security", category: "support", description: "Security checkpoint.", polygon: [{x:950,y:900},{x:1050,y:900},{x:1050,y:950},{x:950,y:950}], enabled: true },
    { id: "elevator", name: "Elevator", department: "support", category: "support", description: "Main elevator.", polygon: [{x:700,y:10},{x:830,y:10},{x:830,y:70},{x:700,y:70}], enabled: true },
    { id: "upper-left-stairs", name: "Upper-Left Stairs", department: "support", category: "support", description: "Stairs to upper level.", polygon: [{x:20,y:20},{x:100,y:20},{x:100,y:100},{x:20,y:100}], enabled: true },
    { id: "upper-right-stairs", name: "Upper-Right Stairs", department: "support", category: "support", description: "Stairs to upper level.", polygon: [{x:1430,y:20},{x:1510,y:20},{x:1510,y:100},{x:1430,y:100}], enabled: true },
    { id: "conference-room-2", name: "Conference Room 2", department: "plugins-and-automation", category: "support", description: "Meeting room.", polygon: [{x:420,y:750},{x:520,y:750},{x:520,y:850},{x:420,y:850}], enabled: true },
    { id: "conference-room-3", name: "Conference Room 3", department: "project-and-release-management", category: "support", description: "Meeting room.", polygon: [{x:980,y:750},{x:1080,y:750},{x:1080,y:850},{x:980,y:850}], enabled: true },
    { id: "focus-room-a", name: "Focus Room A", department: "agent-platform-and-models", category: "support", description: "Quiet room.", polygon: [{x:420,y:450},{x:520,y:450},{x:520,y:520},{x:420,y:520}], enabled: true },
    { id: "focus-room-b", name: "Focus Room B", department: "agent-platform-and-models", category: "support", description: "Quiet room.", polygon: [{x:420,y:540},{x:520,y:540},{x:520,y:610},{x:420,y:610}], enabled: true },
    { id: "focus-room-e", name: "Focus Room E", department: "software-engineering", category: "support", description: "Quiet room.", polygon: [{x:980,y:450},{x:1080,y:450},{x:1080,y:520},{x:980,y:520}], enabled: true },
    { id: "focus-room-f", name: "Focus Room F", department: "software-engineering", category: "support", description: "Quiet room.", polygon: [{x:980,y:540},{x:1080,y:540},{x:1080,y:610},{x:980,y:610}], enabled: true },
    { id: "sandbox-cell-2", name: "Sandbox Cell 2", department: "security-and-governance", category: "support", description: "Secure cell.", polygon: [{x:420,y:150},{x:520,y:150},{x:520,y:250},{x:420,y:250}], enabled: true },
    { id: "sandbox-cell-3", name: "Sandbox Cell 3", department: "reliability-and-operations", category: "support", description: "Secure cell.", polygon: [{x:980,y:150},{x:1080,y:150},{x:1080,y:250},{x:980,y:250}], enabled: true }
];

data.rooms.push(...additionalRooms);
fs.writeFileSync('src/data/floorOne/floor-one-map.json', JSON.stringify(data, null, 2));
