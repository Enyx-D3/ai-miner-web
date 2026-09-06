"use client";

import { extractConversationJsonBytes } from "@/lib/browser-digest/readChatGptZip";
import { normalizeArchiveConversation } from "./archiveNormalize";
import { validateArchiveWithContextVault } from "./contextVaultAdapter";
import { runBrain2ForegroundTask } from "./foregroundTaskGate";
import { ingestNormalizedConversation, recordContextVaultRun, recordRuntimeResponsiveness, scheduleDeferredDerivations, verifyMemoryStorage } from "./store";
import type { Brain2Provider } from "./types";

export async function importArchiveIntoBrain2(file:File,onProgress?:(done:number,total:number,label:string)=>void){
  return runBrain2ForegroundTask("ARCHIVE_IMPORT",async()=>{
    const startedAt=typeof performance!=="undefined"&&typeof performance.now==="function"?performance.now():Date.now();
    const extracted=await extractConversationJsonBytes(file);const provider=extracted.sourceKind as Brain2Provider;
    const total=Math.max(1,extracted.conversationCount);
    let lastProgressAt=0;
    let lastProgressLabel="";
    const reportProgress=(done:number,label:string)=>{
      const nowAt=typeof performance!=="undefined"&&typeof performance.now==="function"?performance.now():Date.now();
      if(label!==lastProgressLabel||done===0||done>=total||nowAt-lastProgressAt>=120){
        lastProgressAt=nowAt;
        lastProgressLabel=label;
        onProgress?.(done,total,label);
      }
    };
    reportProgress(0,"ContextVault structural validation");
    const contextVaultRun=await validateArchiveWithContextVault({bytes:extracted.bytes,sourceName:file.name,provider});await recordContextVaultRun(contextVaultRun);
    if(contextVaultRun.status!=="PASS")throw new Error(`ContextVault validation failed: ${contextVaultRun.error ?? "unknown error"}`);
    const decoded=JSON.parse(new TextDecoder().decode(extracted.bytes));if(!Array.isArray(decoded))throw new Error("The normalized archive is not a conversation array.");
    let conversationsAdded=0,messagesAdded=0,atomsAdded=0;
    for(let index=0;index<decoded.length;index+=1){const normalized=normalizeArchiveConversation(decoded[index],index);if(!normalized)continue;reportProgress(index,normalized.title);const result=await ingestNormalizedConversation({provider,sourceLabel:extracted.sourceLabel,sourceType:extracted.sourceType,...normalized,deferDerivedPatterns:true});if(result.messagesAdded>0)conversationsAdded+=1;messagesAdded+=result.messagesAdded;atomsAdded+=result.atomsAdded;if(index%3===0)await new Promise((resolve)=>setTimeout(resolve,0));}
    reportProgress(decoded.length,"Queueing truth, pattern, intelligence, and MRS verification");scheduleDeferredDerivations({delayMs:0,idleTimeoutMs:2500});setTimeout(()=>{void verifyMemoryStorage().catch(()=>undefined);},0);reportProgress(decoded.length,"Complete · intelligence and MRS verification queued");
    await recordRuntimeResponsiveness("import.archive_total",((typeof performance!=="undefined"&&typeof performance.now==="function"?performance.now():Date.now())-startedAt),{provider,conversationsAdded,messagesAdded,atomsAdded,totalConversations:decoded.length});
    return{provider,sourceLabel:extracted.sourceLabel,conversationsAdded,messagesAdded,atomsAdded,totalConversations:decoded.length,contextVault:{status:contextVaultRun.status,durationMs:contextVaultRun.durationMs,paragraphs:contextVaultRun.paragraphs,atoms:contextVaultRun.atoms,threads:contextVaultRun.threads}};
  });
}
