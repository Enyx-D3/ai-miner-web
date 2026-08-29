import fs from "node:fs";
import { execFileSync } from "node:child_process";
const required=[
  "src/lib/brain2/contracts.ts","src/lib/brain2/archiveNormalize.ts","src/lib/brain2/contextVaultAdapter.ts","src/lib/brain2/projectResolver.ts","src/lib/brain2/truthEngine.ts","src/lib/brain2/patternEngine.ts","src/lib/brain2/retrievalIndex.ts","src/lib/brain2/store.ts","scripts/test-v5-regressions.mjs","src/legacy/refinery/README.md"
];
for(const file of required)if(!fs.existsSync(file))throw new Error(`Missing V5 artifact: ${file}`);
const store=fs.readFileSync("src/lib/brain2/store.ts","utf8");
for(const invariant of ["const DB_VERSION = 5","atomicPut(","journals","contextVaultRuns","indexedMessages","B2M\",version:3"]){if(!store.includes(invariant))throw new Error(`V5 store invariant missing: ${invariant}`);}
const archive=fs.readFileSync("src/lib/brain2/archiveImport.ts","utf8");if(!archive.includes("validateArchiveWithContextVault"))throw new Error("ContextVault is not active in archive import");
const normalizer=fs.readFileSync("src/lib/brain2/archiveNormalize.ts","utf8");if(!normalizer.includes("current_node")||!normalizer.includes("cursor=currentNode.parent"))throw new Error("Selected branch lineage reconstruction missing");
const jobs=fs.readFileSync("src/lib/brain2/jobs.ts","utf8");if(!jobs.includes("outsideJobEvidenceIds")||!jobs.includes("allowed.has(id)"))throw new Error("B2RESULT job-membership provenance gate missing");
const sw=fs.readFileSync("extension/service_worker.js","utf8");if(sw.includes("slice(-MAX_QUEUE)")||sw.includes("MAX_QUEUE = 2000"))throw new Error("Legacy lossy 2,000-record queue cap remains");
const provider=fs.readFileSync("src/components/brain2/Brain2Provider.tsx","utf8");if(!provider.includes("event.origin !== window.location.origin")||!provider.includes("bridgeNonce"))throw new Error("Web bridge origin/nonce gate missing");
execFileSync(process.execPath,["scripts/check-brain2.mjs"],{stdio:"inherit"});execFileSync(process.execPath,["scripts/check-extension.mjs"],{stdio:"inherit"});
console.log(`Brain2 AI Miner V5 static acceptance PASS: ${required.length} V5 integration artifacts + core invariants.`);
