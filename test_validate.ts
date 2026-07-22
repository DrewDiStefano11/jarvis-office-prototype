import { floorOneLoader } from './src/data/floorOne/floorOneLoader.ts';
import * as fs from 'fs';

const data = fs.readFileSync('src/data/floorOne/floor-one-map.json', 'utf8');
const errs = floorOneLoader.importMapData(data);
console.log(errs);
