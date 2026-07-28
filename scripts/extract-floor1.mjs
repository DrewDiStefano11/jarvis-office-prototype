import { auditAll, extractAll } from './floor1/core.mjs';
auditAll();
console.log(JSON.stringify(extractAll(), null, 2));
