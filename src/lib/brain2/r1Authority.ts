import { sha256 } from "./identity";
import { canonicalJson } from "./syncProtocol";

export type R1Signal = "ALLOW" | "DENY" | "PAUSE" | "REVOKE" | "REQUIRE_TICK" | "LIMIT_CHANGED";
export type R1AuthorityVersion = 1 | 2;
export type R1AuthoritySource = "EXPLICIT_USER_ACTION" | "INDEPENDENT_VERIFIER" | "POLICY";

export type R1AuthorityReceipt = {
  format: "B2_R1_AUTHORITY";
  version: R1AuthorityVersion;
  signal: R1Signal;
  action: string;
  scope: string;
  authoritySource: R1AuthoritySource;
  reason: string;
  evidenceRefs: string[];
  issuedAt: string;
  hash: string;
};

const SIGNALS = new Set<R1Signal>(["ALLOW","DENY","PAUSE","REVOKE","REQUIRE_TICK","LIMIT_CHANGED"]);
const SOURCES = new Set<R1AuthoritySource>(["EXPLICIT_USER_ACTION","INDEPENDENT_VERIFIER","POLICY"]);

function refs(values: Iterable<string>): string[] {
  return [...new Set([...values].map((item)=>String(item).trim()).filter(Boolean))].sort();
}

function assertCore(receipt: R1AuthorityReceipt): void {
  if(receipt.format !== "B2_R1_AUTHORITY") throw new Error("Unsupported R1 authority format.");
  if(receipt.version !== 1 && receipt.version !== 2) throw new Error("Unsupported R1 authority version.");
  if(!SIGNALS.has(receipt.signal)) throw new Error("Invalid R1 signal.");
  if(!SOURCES.has(receipt.authoritySource)) throw new Error("Invalid R1 authority source.");
  if(!receipt.action.trim()) throw new Error("R1 action is required.");
  if(!receipt.scope.trim()) throw new Error("R1 scope is required.");
  if(!receipt.reason.trim()) throw new Error("R1 reason is required.");
  if(!receipt.issuedAt.trim() || !Number.isFinite(Date.parse(receipt.issuedAt))) throw new Error("R1 issuedAt is invalid.");
  if(!receipt.hash.trim()) throw new Error("R1 receipt hash is required.");
}

export function r1StableMaterial(receipt: Omit<R1AuthorityReceipt,"hash">): Record<string,unknown> {
  const stable: Record<string,unknown> = {
    format: receipt.format,
    version: receipt.version,
    signal: receipt.signal,
    action: receipt.action,
    scope: receipt.scope,
    authoritySource: receipt.authoritySource,
    reason: receipt.reason,
    evidenceRefs: refs(receipt.evidenceRefs),
  };
  // v1 remains readable exactly as historically issued: issuedAt was outside
  // the signed material. v2 binds time and is required for every NEW canonical write.
  if(receipt.version >= 2) stable.issuedAt = receipt.issuedAt;
  return stable;
}

export async function computeR1AuthorityHash(receipt: Omit<R1AuthorityReceipt,"hash">): Promise<string> {
  return sha256(canonicalJson(r1StableMaterial(receipt)));
}

async function issue(input: {
  version?: R1AuthorityVersion;
  signal: R1Signal;
  action: string;
  scope: string;
  authoritySource: R1AuthoritySource;
  reason: string;
  evidenceRefs?: Iterable<string>;
}): Promise<R1AuthorityReceipt> {
  const version = input.version ?? 2;
  const issuedAt = new Date().toISOString();
  const unsigned: Omit<R1AuthorityReceipt,"hash"> = {
    format: "B2_R1_AUTHORITY",
    version,
    signal: input.signal,
    action: input.action.trim(),
    scope: input.scope.trim(),
    authoritySource: input.authoritySource,
    reason: input.reason.trim(),
    evidenceRefs: refs(input.evidenceRefs ?? []),
    issuedAt,
  };
  if(!unsigned.action || !unsigned.scope || !unsigned.reason) throw new Error("R1 action, scope and reason are required.");
  return {...unsigned, hash: await computeR1AuthorityHash(unsigned)};
}

export async function issueUserR1Allow(input:{action:string;scope:string;reason?:string;evidenceRefs?:string[]}): Promise<R1AuthorityReceipt> {
  return issue({signal:"ALLOW",action:input.action,scope:input.scope,authoritySource:"EXPLICIT_USER_ACTION",reason:input.reason ?? "Explicit user approval",evidenceRefs:input.evidenceRefs ?? []});
}

export async function issuePolicyR1Allow(input:{action:string;scope:string;reason:string;evidenceRefs?:string[]}): Promise<R1AuthorityReceipt> {
  return issue({signal:"ALLOW",action:input.action,scope:input.scope,authoritySource:"POLICY",reason:input.reason,evidenceRefs:input.evidenceRefs ?? []});
}

export async function issueVerifierR1(input:{signal?:unknown;action:string;scope:string;reason:string;evidenceRefs?:string[]}): Promise<R1AuthorityReceipt> {
  const signal=String(input.signal ?? "").toUpperCase() as R1Signal;
  if(!SIGNALS.has(signal)) throw new Error("Independent verifier did not return a valid R1 signal.");
  return issue({signal,action:input.action,scope:input.scope,authoritySource:"INDEPENDENT_VERIFIER",reason:input.reason,evidenceRefs:input.evidenceRefs ?? []});
}

/** Historical compatibility only. This performs structural checks, not crypto verification. */
export function requireR1Allow(receipt:R1AuthorityReceipt|undefined|null,expectedAction?:string,expectedScope?:string): R1AuthorityReceipt {
  if(!receipt) throw new Error("R1 authority receipt is required.");
  if(receipt.signal!=="ALLOW") throw new Error(`R1 blocked action with ${receipt.signal}.`);
  if(expectedAction && receipt.action!==expectedAction) throw new Error("R1 action scope mismatch.");
  if(expectedScope && receipt.scope!==expectedScope) throw new Error("R1 authority scope mismatch.");
  if(!receipt.hash) throw new Error("R1 receipt hash is required.");
  return receipt;
}

export async function verifyR1AuthorityReceipt(receipt:R1AuthorityReceipt|undefined|null): Promise<R1AuthorityReceipt> {
  if(!receipt) throw new Error("R1 authority receipt is required.");
  assertCore(receipt);
  const unsigned: Omit<R1AuthorityReceipt,"hash"> = {
    format: receipt.format,
    version: receipt.version,
    signal: receipt.signal,
    action: receipt.action,
    scope: receipt.scope,
    authoritySource: receipt.authoritySource,
    reason: receipt.reason,
    evidenceRefs: receipt.evidenceRefs,
    issuedAt: receipt.issuedAt,
  };
  const expected = await computeR1AuthorityHash(unsigned);
  if(expected !== receipt.hash) throw new Error("R1 receipt hash verification failed.");
  return receipt;
}

export async function requireVerifiedR1Allow(
  receipt:R1AuthorityReceipt|undefined|null,
  input:{action?:string;scope?:string;minVersion?:R1AuthorityVersion;authoritySource?:R1AuthoritySource} = {},
): Promise<R1AuthorityReceipt> {
  const verified = await verifyR1AuthorityReceipt(receipt);
  if(verified.signal !== "ALLOW") throw new Error(`R1 blocked action with ${verified.signal}.`);
  if(input.action && verified.action !== input.action) throw new Error("R1 action mismatch.");
  if(input.scope && verified.scope !== input.scope) throw new Error("R1 authority scope mismatch.");
  if(input.minVersion && verified.version < input.minVersion) throw new Error(`R1 v${input.minVersion}+ is required for this canonical write.`);
  if(input.authoritySource && verified.authoritySource !== input.authoritySource) throw new Error("R1 authority source mismatch.");
  return verified;
}
