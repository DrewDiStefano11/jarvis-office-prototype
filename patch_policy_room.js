const fs = require('fs');
const data = JSON.parse(fs.readFileSync('src/data/floorOne/floor-one-map.json'));

const hasPolicy = data.rooms.find(r => r.id === 'policy-and-compliance');
if (!hasPolicy) {
    data.rooms.push({
      "id": "policy-and-compliance",
      "name": "Policy and Compliance",
      "department": "security-and-governance",
      "category": "department",
      "description": "Compliance area near security.",
      "polygon": [
        { "x": 100, "y": 250 },
        { "x": 400, "y": 250 },
        { "x": 400, "y": 400 },
        { "x": 100, "y": 400 }
      ],
      "enabled": true
    });
    fs.writeFileSync('src/data/floorOne/floor-one-map.json', JSON.stringify(data, null, 2));
    console.log("Added Policy and Compliance room.");
} else {
    console.log("Room already exists.");
}

console.log("Total rooms:", data.rooms.length);
