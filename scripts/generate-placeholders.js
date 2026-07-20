const fs = require('fs');
const path = require('path');

// A 1x1 transparent pixel encoded as base64.
// For placeholders, we will just use a tiny transparent PNG to fulfill file presence.
const transparent1x1 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAANSURBVBhXY3jP4PgfAAWpA31/wBwMAAAAASUVORK5CYII=";

// Alternatively, a solid red 1x1 pixel:
const red1x1 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAANSURBVBhXY/jP4PgfAAWpA33261GqAAAAAElFTkSuQmCC";

const assetsToGenerate = [
    { file: 'public/assets/office/agents/jarvis-placeholder.png', data: red1x1 },
    { file: 'public/assets/office/agents/atlas-placeholder.png', data: red1x1 },
    { file: 'public/assets/office/agents/scout-placeholder.png', data: red1x1 },
    { file: 'public/assets/office/agents/archive-placeholder.png', data: red1x1 },
    { file: 'public/assets/office/agents/sentinel-placeholder.png', data: red1x1 },
    { file: 'public/assets/office/furniture/desk-placeholder.png', data: red1x1 },
    { file: 'public/assets/office/furniture/meeting-table-placeholder.png', data: red1x1 },
    { file: 'public/assets/office/furniture/filing-cabinet-placeholder.png', data: red1x1 },
    { file: 'public/assets/office/environment/door-placeholder.png', data: red1x1 },
    { file: 'public/assets/office/decoration/plant-placeholder.png', data: red1x1 },
    { file: 'public/assets/office/indicators/status-marker-placeholder.png', data: red1x1 },
    { file: 'public/assets/office/tiles/floor-tile-placeholder.png', data: transparent1x1 }
];

assetsToGenerate.forEach(asset => {
    const fullPath = path.resolve(__dirname, '..', asset.file);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const buffer = Buffer.from(asset.data, 'base64');
    fs.writeFileSync(fullPath, buffer);
    console.log(`Generated: ${asset.file}`);
});
