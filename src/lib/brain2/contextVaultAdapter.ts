"use client";

import { CONTEXTVAULT_ADAPTER_VERSION } from "./contracts";
import type { Brain2Provider, ContextVaultRunRecord } from "./types";
import { canonicalId } from "./identity";
import { digestChatGptJsonSummary, preloadContextVaultWasm } from "@/lib/contextvault-wasm/loadContextVault";

export async function validateArchiveWithContextVault(input: {
  bytes: Uint8Array;
  sourceName: string;
  provider: Brain2Provider;
}): Promise<ContextVaultRunRecord> {
  const started=performance.now();
  const createdAt=new Date().toISOString();
  try {
    await preloadContextVaultWasm();
    const summary=await digestChatGptJsonSummary(input.bytes,input.sourceName);
    return {
      id:await canonicalId("cvrun",input.sourceName,createdAt,summary.paragraphs,summary.atoms,summary.threads),
      sourceName:input.sourceName,provider:input.provider,status:"PASS",createdAt,durationMs:Math.round(performance.now()-started),inputBytes:input.bytes.byteLength,paragraphs:summary.paragraphs,atoms:summary.atoms,threads:summary.threads,adapterVersion:CONTEXTVAULT_ADAPTER_VERSION,
    };
  } catch(error){
    return {
      id:await canonicalId("cvrun",input.sourceName,createdAt,"FAIL"),sourceName:input.sourceName,provider:input.provider,status:"FAIL",createdAt,durationMs:Math.round(performance.now()-started),inputBytes:input.bytes.byteLength,error:error instanceof Error?error.message:String(error),adapterVersion:CONTEXTVAULT_ADAPTER_VERSION,
    };
  }
}
