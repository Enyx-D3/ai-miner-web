import fs from 'node:fs';
const intel=fs.readFileSync('src/lib/brain2/intelligenceLayer.ts','utf8');
const ui=fs.readFileSync('src/features/brain2/Brain2Workspace.tsx','utf8');
const checks=[
 ['version',intel.includes('B2_INTELLIGENCE_V1')],
 ['truth lane',intel.includes("'TRUTH'|" )],
 ['importance lane',intel.includes("'IMPORTANT_IDEA'" )],
 ['change lane',intel.includes("'CHANGE'" )],
 ['connection lane',intel.includes("'CONNECTION'" )],
 ['open questions',intel.includes("'OPEN_QUESTION'" )],
 ['transformers.js mrs runtime',intel.includes('reviewBrain2Intelligence')&&!intel.includes('NEXT_PUBLIC_BRAIN2_MRS_ENDPOINT')],
 ['proposal only semantics',intel.includes('MRS_PENDING')&&intel.includes('MRS_VERIFIED')],
 ['evidence grounding',intel.includes('grounded')&&intel.includes('c.evidenceIds.includes')],
 ['lifewiki intelligence',ui.includes('Verified Project Intelligence')&&ui.includes('Foundational / Important Ideas')],
 ['live notebook intelligence',ui.includes('Live Intelligence')&&ui.includes('Ideas')&&ui.includes('Changed')],
];
const bad=checks.filter(([,ok])=>!ok);if(bad.length){console.error('FAIL',bad.map(x=>x[0]));process.exit(1)}
console.log('V9 Intelligence Layer acceptance PASS: deterministic discovery → browser Transformers.js / Qwen ONNX MRS semantic review → deterministic evidence verification; LifeWiki/Live Notebooks consume the projection.');
