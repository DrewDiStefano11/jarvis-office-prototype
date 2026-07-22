const fs = require('fs');
const data = JSON.parse(fs.readFileSync('src/data/floorOne/floor-one-map.json'));

const masks = [
    {
        id: "mask-nexus-console",
        name: "Central Nexus Front Console",
        rect: { x: 700, y: 550, width: 140, height: 60 },
        enabled: true,
        purpose: "Hide character when behind front central nexus desk."
    },
    {
        id: "mask-exec-front-wall",
        name: "Executive Command Front Wall",
        rect: { x: 600, y: 300, width: 330, height: 40 },
        enabled: true,
        purpose: "Hide character when walking behind the lower exec wall."
    },
    {
        id: "mask-reception-desk",
        name: "Reception Desk",
        rect: { x: 720, y: 980, width: 100, height: 30 },
        enabled: true,
        purpose: "Hide character behind front reception counter."
    }
];

data.foregroundMasks = masks;
fs.writeFileSync('src/data/floorOne/floor-one-map.json', JSON.stringify(data, null, 2));
