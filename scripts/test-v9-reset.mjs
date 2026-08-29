import fs from 'node:fs';
const store=fs.readFileSync('src/lib/brain2/store.ts','utf8');
const ui=fs.readFileSync('src/features/brain2/Brain2Workspace.tsx','utf8');
const reset=store.match(/export async function resetBrain2\(\):Promise<void>\{([\s\S]*?)\n\}/)?.[1]??'';
const required=[
 ['lifecycle epoch increments',/storageLifecycleEpoch\s*\+=\s*1/],
 ['runtime index invalidated',/invalidateRuntimeIndex\(\)/],
 ['active DB connection closed',/closeBrain2DatabaseConnection/],
 ['entire IndexedDB database deleted',/indexedDB\.deleteDatabase\(DB_NAME\)/],
 ['blocked deletion has explicit error',/database reset was blocked/i],
 ['fresh memory root created',/canonicalId\("b2m", crypto\.randomUUID\(\), Date\.now\(\)\)/],
 ['fresh local device created',/ensureWebDevice\(memoryRoot\)/],
 ['loaded replica published',/loaded: true/],
 ['Reader state EMPTY',/retrievalIndexStatus: "EMPTY"/],
 ['failure publishes ERROR',/retrievalIndexStatus: "ERROR"/],
];
for(const [label,re] of required){if(!re.test(store)&&!re.test(reset))throw new Error(`V9.0.2 reset regression FAIL: ${label}`)}
if(!/Reset failed:/.test(ui)||!/Force-reset local memory/.test(ui)||!/s\.storage\.lastError/.test(ui))throw new Error('V9.0.2 reset regression FAIL: reset/boot failure is not recoverable from UI');
if(!/bootBrain2\(\)\.then\(\(\)=>startBrain2P2P\(\)\)\.catch/.test(fs.readFileSync('src/components/brain2/Brain2Provider.tsx','utf8')))throw new Error('V9.0.2 reset regression FAIL: provider boot rejection is unhandled');
console.log('V9.0.2 reset regression PASS: full DB deletion, visible failure state, and force-reset recovery are wired.');
