import fs from 'fs';

const filePath = 'src/office/floor1/navigation/candidateNavigation.ts';
let content = fs.readFileSync(filePath, 'utf-8');

// Also update the `CandidateNavigationGraph` type
content = content.replace(
    'unavailableReason?: string;',
    'unavailableReason?: string;\n    verificationMode?: \'reviewed\' | \'unverified-sandbox\';'
);

fs.writeFileSync(filePath, content);
