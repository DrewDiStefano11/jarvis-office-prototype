const fs = require('fs');
const data = JSON.parse(fs.readFileSync('src/data/floorOne/floor-one-map.json'));

const hasPolicyNav = data.navigationNodes.find(n => n.roomId === 'policy-and-compliance');
if (!hasPolicyNav) {
    data.navigationNodes.push({
      "id": "nav-policy",
      "name": "Policy and Compliance",
      "x": 250,
      "y": 325,
      "roomId": "policy-and-compliance",
      "nodeType": "room-center",
      "enabled": true
    });
    data.navigationEdges.push({
      "id": "edge-nexus-policy",
      "from": "nav-central-nexus",
      "to": "nav-policy",
      "movementCost": 150,
      "bidirectional": true,
      "enabled": true
    });
    fs.writeFileSync('src/data/floorOne/floor-one-map.json', JSON.stringify(data, null, 2));
    console.log("Added Nav Node and Edge for Policy and Compliance.");
}
