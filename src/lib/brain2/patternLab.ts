import { BRAIN2_SCHEMA_VERSION } from "./contracts";
import { canonicalId, normalizeText, sha256 } from "./identity";
import type { PatternRecord, PatternTestRecord, PortableExpertiseRecord } from "./types";

export type PatternEvaluation = {
  status: PatternRecord["status"];
  maturity: NonNullable<PatternRecord["maturity"]>;
  verificationStatus: NonNullable<PatternRecord["verificationStatus"]>;
  falsificationStatus: NonNullable<PatternRecord["falsificationStatus"]>;
  transferTestIds: string[];
  boundaryConditions: string[];
  supportScore: number;
};

export function evaluatePattern(pattern: PatternRecord, tests: PatternTestRecord[]): PatternEvaluation {
  const relevant=tests.filter((test)=>test.patternId===pattern.id);
  const pass=relevant.filter((test)=>test.status==="PASS");
  const fail=relevant.filter((test)=>test.status==="FAIL");
  const transferPass=pass.filter((test)=>test.kind==="TRANSFER");
  const domains=new Set(transferPass.map((test)=>normalizeText(test.domain||test.projectId||"")).filter(Boolean));
  const replicationPass=pass.filter((test)=>test.kind==="REPLICATION").length;
  const falsificationPass=pass.filter((test)=>test.kind==="FALSIFICATION").length;
  const counterexampleFailures=fail.filter((test)=>test.kind==="COUNTEREXAMPLE"||test.kind==="FALSIFICATION");
  const boundaries=[...(pattern.boundaryConditions??[])];
  for(const test of fail) if(test.domain) boundaries.push(`Failed transfer/falsification in ${normalizeText(test.domain)}`);
  let status=pattern.status;let maturity:NonNullable<PatternRecord["maturity"]>=pattern.maturity??"L1_OBSERVATION";let verificationStatus:NonNullable<PatternRecord["verificationStatus"]>=pattern.verificationStatus??"UNTESTED";let falsificationStatus:NonNullable<PatternRecord["falsificationStatus"]>="UNTESTED";
  if(pattern.evidenceCount>=3)maturity="L2_CANDIDATE";
  if(pattern.evidenceCount>=7)maturity="L3_HYPOTHESIS";
  if(replicationPass>=1&&fail.length===0)maturity="L4_SUPPORTED";
  if(replicationPass>=2&&fail.length===0)maturity="L5_REPLICATED";
  if(relevant.some((test)=>test.kind==="FALSIFICATION")) falsificationStatus=counterexampleFailures.length?"FAILED":falsificationPass?"SURVIVED":"ACTIVE";
  if(counterexampleFailures.length){status="TESTING";verificationStatus="COUNTEREXAMPLE_FOUND";}
  else if(domains.size>=2&&replicationPass>=1&&falsificationPass>=1){status="VERIFIED";maturity="L6_GENERALIZED";verificationStatus="VERIFIED_EXTERNAL";falsificationStatus="SURVIVED";}
  else if(pattern.evidenceCount>=7||relevant.length){status="TESTING";verificationStatus="NEEDS_TRANSFER_TEST";}
  const supportScore=Math.max(0,Math.min(1,(pattern.strength*.45)+(Math.min(1,pass.length/4)*.35)+(Math.min(1,domains.size/2)*.2)-(fail.length*.2)));
  return{status,maturity,verificationStatus,falsificationStatus,transferTestIds:transferPass.map((test)=>test.id),boundaryConditions:[...new Set(boundaries)],supportScore};
}

export async function createPatternTest(input:Omit<PatternTestRecord,"id"|"createdAt"|"hash"|"schemaVersion">):Promise<PatternTestRecord>{
  const createdAt=new Date().toISOString();const hash=await sha256(JSON.stringify({...input,createdAt}));const id=await canonicalId("pattern-test",input.patternId,input.kind,input.projectId,input.domain,createdAt,hash);
  return{...input,id,createdAt,hash,schemaVersion:BRAIN2_SCHEMA_VERSION};
}

export async function createPortableExpertise(pattern:PatternRecord,tests:PatternTestRecord[],input:{title?:string;triggerConditions:string[];procedure:string[];verifier:string}):Promise<PortableExpertiseRecord>{
  const evaluation=evaluatePattern(pattern,tests);if(evaluation.status!=="VERIFIED"||evaluation.maturity!=="L6_GENERALIZED")throw new Error("Portable Expertise requires a pattern that survived replication, falsification, and transfer in at least two domains.");
  const relevant=tests.filter((test)=>test.patternId===pattern.id);const domains=[...new Set(relevant.filter((test)=>test.kind==="TRANSFER"&&test.status==="PASS").map((test)=>normalizeText(test.domain||test.projectId||"")).filter(Boolean))];const counterexamples=relevant.filter((test)=>test.status==="FAIL").map((test)=>test.result);
  const createdAt=new Date().toISOString();const id=await canonicalId("portable-expertise",pattern.id,input.title||pattern.label);const payload={id,patternId:pattern.id,title:input.title||pattern.label,triggerConditions:input.triggerConditions,operatingBoundaries:evaluation.boundaryConditions,counterexamples,procedure:input.procedure,verifier:input.verifier,provenanceAtomIds:pattern.atomIds,transferDomains:domains,confidence:evaluation.supportScore,createdAt,updatedAt:createdAt,version:1};const hash=await sha256(JSON.stringify(payload));return{...payload,hash};
}
