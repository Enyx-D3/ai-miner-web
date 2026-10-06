import fs from "node:fs";
import crypto from "node:crypto";
const fixture=JSON.parse(fs.readFileSync("spec/v1/gc-cp001-fixture.json","utf8"));
const normalize=(v)=>String(v??"").normalize("NFKC").replace(/\s+/g," ").trim().toLocaleLowerCase("en-US");
const canonicalId=(prefix,parts)=>{const stable=[fixture.identityVersion,...parts].map(normalize).join("\u241f");return `${prefix}_${crypto.createHash("sha256").update(stable).digest("hex").slice(0,24)}`};
const sort=(v)=>Array.isArray(v)?v.map(sort):v&&typeof v==="object"?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])])):v;
const hash=(v)=>crypto.createHash("sha256").update(JSON.stringify(sort(v))).digest("hex");
for(const vector of fixture.unicodeIdentityVectors){const actual=canonicalId(vector.prefix,vector.parts);if(actual!==vector.expected)throw new Error(`Identity vector mismatch: ${actual} != ${vector.expected}`)}
if(hash(fixture.resumeStablePayload)!==fixture.resumeStableHash)throw new Error("Resume stable hash mismatch");
if(hash(fixture.contextStablePayload)!==fixture.contextStableHash)throw new Error("Context stable hash mismatch");
for(const family of ["mrsRuns","intelligenceSnapshots","wikiSnapshots","notebookSnapshots"])if(!fixture.sharedStateFamilies.includes(family))throw new Error(`Missing shared family ${family}`);
if(fixture.handoffPolicy.requiredR1Signal!=="ALLOW"||fixture.handoffPolicy.fullArchiveIncluded!==false)throw new Error("Unsafe handoff fixture");
console.log("GC-CP001 Web deterministic fixture PASS");
