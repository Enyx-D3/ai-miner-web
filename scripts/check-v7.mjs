import fs from "node:fs";
import { execFileSync } from "node:child_process";
const required=[
  "src/lib/brain2/databox.ts","src/lib/brain2/reasoning.ts","src/lib/brain2/retrievalRouter.ts","src/lib/brain2/patternLab.ts",
  "src/lib/brain2/retrievalIndex.ts","extension/queue_db.js","scripts/test-v7-regressions.mjs","scripts/bench-v7-million.mjs"
];
for(const file of required)if(!fs.existsSync(file))throw new Error(`Missing V7 artifact: ${file}`);
const contracts=fs.readFileSync("src/lib/brain2/contracts.ts","utf8");
for(const invariant of ["BRAIN2_SCHEMA_VERSION = 7","B2_RETRIEVAL_V7","B2_STORAGE_V7_BOUNDED_HOT_SET","B2_SEARCH_DOC_V1","B2_EVIDENCE_BLOCK_V1"])
  if(!contracts.includes(invariant))throw new Error(`V7 contract missing ${invariant}`);
const store=fs.readFileSync("src/lib/brain2/store.ts","utf8");
for(const invariant of ["const DB_VERSION = 7","HOT_MESSAGE_LIMIT = 600","HOT_ATOM_LIMIT = 1200","evidenceBlocks","searchDocs","byConversationSequence","byProjectCreatedAt","rebuildPersistentSearchIndex","searchBrain2Async","loadConversationMessages","loadProjectAtoms","verifyMemoryStorage","derivedExcluded:[\"searchDocs\"]"])
  if(!store.includes(invariant))throw new Error(`V7 storage invariant missing ${invariant}`);
const boot=store.slice(store.indexOf("export async function bootBrain2"),store.indexOf("async function buildMutation"));
if(boot.includes('all<MessageRecord>("messages")')||boot.includes('all<AtomRecord>("atoms")'))throw new Error("V7 boot regressed to whole-corpus message/atom loading");
const workspace=fs.readFileSync("src/features/brain2/Brain2Workspace.tsx","utf8");
for(const invariant of ["loadConversationMessages","loadProjectTruthSummary","loadProjectAtoms","searchBrain2Async","verifyB2ResultAsync","Memory Health","Repair search","Older history stays on disk until requested"])
  if(!workspace.includes(invariant))throw new Error(`V7 UX/parity invariant missing ${invariant}`);
const jobs=fs.readFileSync("src/lib/brain2/jobs.ts","utf8");
if(!jobs.includes("brain2-persistent-selective-v7")||!jobs.includes("B2DATABOX"))throw new Error("V7 persistent B2JOB/Databox binding missing");
const queue=fs.readFileSync("extension/queue_db.js","utf8");
if(!queue.includes("indexedDB.open")||!queue.includes("byRecordId"))throw new Error("Durable extension queue missing");
execFileSync("tsc",["-p","tsconfig.v7-core.json","--pretty","false"],{stdio:"inherit"});
execFileSync(process.execPath,["scripts/check-ui-syntax.mjs"],{stdio:"inherit"});
execFileSync(process.execPath,["scripts/check-brain2.mjs"],{stdio:"inherit"});
execFileSync(process.execPath,["scripts/check-extension.mjs"],{stdio:"inherit"});
console.log("Brain2 AI Miner V7 static acceptance PASS: bounded hot boot + persistent retrieval/index + lazy full-history UX + B2 provenance + durable extension queue.");
