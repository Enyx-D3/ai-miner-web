export const IDENTITY_COMPATIBILITY_VERSION = "NFKC_V10_COMPAT_V1" as const;
export type IdentityCompatibilityState = "NEW" | "CURRENT" | "LEGACY_PRESERVED" | "DUAL_EQUIVALENT" | "REQUIRE_TICK";
export type IdentityCompatibilityMetadata = {
  identityCanonicalId?: string;
  identityLegacyIds?: string[];
  identityStoredId?: string;
  identityCompatibilityVersion?: typeof IDENTITY_COMPATIBILITY_VERSION;
};
export function resolveCompatibleStoredId(input:{canonicalId:string;legacyId:string;canonicalExists:boolean;legacyExists:boolean;semanticallyEquivalent?:boolean}){
  if(input.canonicalId===input.legacyId)return{storedId:input.canonicalId,state:(input.canonicalExists?"CURRENT":"NEW") as IdentityCompatibilityState,aliases:[] as string[]};
  if(input.canonicalExists&&input.legacyExists){
    if(!input.semanticallyEquivalent)return{storedId:null,state:"REQUIRE_TICK" as const,aliases:[input.legacyId]};
    return{storedId:input.canonicalId,state:"DUAL_EQUIVALENT" as const,aliases:[input.legacyId]};
  }
  if(input.canonicalExists)return{storedId:input.canonicalId,state:"CURRENT" as const,aliases:[input.legacyId]};
  if(input.legacyExists)return{storedId:input.legacyId,state:"LEGACY_PRESERVED" as const,aliases:[input.canonicalId]};
  return{storedId:input.canonicalId,state:"NEW" as const,aliases:[input.legacyId]};
}
export function identityCompatibilityMetadata(canonicalId:string,legacyId:string,storedId:string):IdentityCompatibilityMetadata{
  return {identityCanonicalId:canonicalId,identityLegacyIds:legacyId!==canonicalId?[legacyId]:[],identityStoredId:storedId,identityCompatibilityVersion:IDENTITY_COMPATIBILITY_VERSION};
}
export function requireCompatibleStoredId(input:Parameters<typeof resolveCompatibleStoredId>[0],label:string):string{
  const resolved=resolveCompatibleStoredId(input);
  if(!resolved.storedId)throw new Error(`REQUIRE_TICK identity collision: ${label}`);
  return resolved.storedId;
}
