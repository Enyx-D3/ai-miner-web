import { sha256 } from "./identity";
import { canonicalJson } from "./syncProtocol";

export type R1Signal = "ALLOW" | "DENY" | "PAUSE" | "REVOKE" | "REQUIRE_TICK" | "LIMIT_CHANGED";

export type R1AuthorityReceipt = {
  format: "B2_R1_AUTHORITY";
  version: 1;
  signal: R1Signal;
  action: string;
  scope: string;
  authoritySource: "EXPLICIT_USER_ACTION" | "INDEPENDENT_VERIFIER" | "POLICY";
  reason: string;
  evidenceRefs: string[];
  issuedAt: string;
  hash: string;
};

async function issue(input: Omit<R1AuthorityReceipt,"format"|"version"|"issuedAt"|"hash">): Promise<R1AuthorityReceipt> {
  const issuedAt = new Date().toISOString();
  const stable = {
    format: "B2_R1_AUTHORITY" as const,
    version: 1 as const,
    signal: input.signal,
    action: input.action,
    scope: input.scope,
    authoritySource: input.authoritySource,
    reason: input.reason,
    evidenceRefs: [...new Set(input.evidenceRefs)].sort(),
  };
  return { ...stable, issuedAt, hash: await sha256(canonicalJson(stable)) };
}

export async function issueUserR1Allow(input:{action:string;scope:string;reason?:string;evidenceRefs?:string[]}): Promise<R1AuthorityReceipt> {
  return issue({signal:"ALLOW",action:input.action,scope:input.scope,authoritySource:"EXPLICIT_USER_ACTION",reason:input.reason ?? "Explicit user approval",evidenceRefs:input.evidenceRefs ?? []});
}

export async function issueVerifierR1(input:{signal?:unknown;action:string;scope:string;reason:string;evidenceRefs?:string[]}): Promise<R1AuthorityReceipt> {
  const signal=String(input.signal ?? "").toUpperCase() as R1Signal;
  if(!["ALLOW","DENY","PAUSE","REVOKE","REQUIRE_TICK","LIMIT_CHANGED"].includes(signal)) throw new Error("Independent verifier did not return a valid R1 signal.");
  return issue({signal,action:input.action,scope:input.scope,authoritySource:"INDEPENDENT_VERIFIER",reason:input.reason,evidenceRefs:input.evidenceRefs ?? []});
}

export function requireR1Allow(receipt:R1AuthorityReceipt|undefined|null,expectedAction?:string,expectedScope?:string): R1AuthorityReceipt {
  if(!receipt) throw new Error("R1 authority receipt is required.");
  if(receipt.signal!=="ALLOW") throw new Error(`R1 blocked action with ${receipt.signal}.`);
  if(expectedAction && receipt.action!==expectedAction) throw new Error("R1 action scope mismatch.");
  if(expectedScope && receipt.scope!==expectedScope) throw new Error("R1 authority scope mismatch.");
  if(!receipt.hash) throw new Error("R1 receipt hash is required.");
  return receipt;
}
