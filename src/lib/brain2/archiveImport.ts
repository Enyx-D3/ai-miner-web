"use client";

import { extractChatGptCodeAttachments, extractConversationJsonBytes } from "@/lib/browser-digest/readChatGptZip";
import { normalizeArchiveConversation } from "./archiveNormalize";
import { allArchivedCodeMessages, codeFromFences, type CodeCandidate } from "./codeRegistryCore";
import { saveCodeCandidates } from "./codeRegistry";
import { validateArchiveWithContextVault } from "./contextVaultAdapter";
import { runBrain2ForegroundTask } from "./foregroundTaskGate";
import { getBrain2Snapshot, ingestNormalizedConversation, recordContextVaultRun, recordRuntimeResponsiveness, scheduleDeferredDerivations, verifyMemoryStorage } from "./store";
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
    let conversationsAdded=0,messagesAdded=0,atomsAdded=0,codeSourcesIndexed=0;
    let codeIndexError:string|undefined;
    const projectsByConversation=new Map<string,{projectId:string;projectName:string;conversationTitle:string}>();
    let queuedCode:CodeCandidate[]=[];
    const commitCode=async()=>{
      if(!queuedCode.length)return;
      const batch=queuedCode;queuedCode=[];
      if(codeIndexError)return;
      try{codeSourcesIndexed+=await saveCodeCandidates(batch);}
      catch(error){codeIndexError=error instanceof Error?error.message:String(error);}
    };
    for(let index=0;index<decoded.length;index+=1){
      const normalized=normalizeArchiveConversation(decoded[index],index);if(!normalized)continue;
      reportProgress(index,normalized.title);
      const result=await ingestNormalizedConversation({provider,sourceLabel:extracted.sourceLabel,sourceType:extracted.sourceType,...normalized,deferDerivedPatterns:true});
      if(result.messagesAdded>0)conversationsAdded+=1;messagesAdded+=result.messagesAdded;atomsAdded+=result.atomsAdded;
      const project=getBrain2Snapshot().projects.find((entry)=>entry.id===result.projectId);
      const projectName=project?.name??normalized.title;
      projectsByConversation.set(normalized.externalId,{projectId:result.projectId,projectName,conversationTitle:normalized.title});
      queuedCode.push(...codeFromFences({provider,projectId:result.projectId,projectName,
        conversationExternalId:normalized.externalId,conversationTitle:normalized.title,
        messages:provider==="chatgpt"?allArchivedCodeMessages(decoded[index],normalized.messages):normalized.messages}));
      if(queuedCode.length>=200)await commitCode();
      if(index%3===0)await new Promise((resolve)=>setTimeout(resolve,0));
    }
    await commitCode();
    if(!codeIndexError&&provider==="chatgpt"&&extracted.codeFiles?.length){
      reportProgress(decoded.length,"Discovering attached source files from ChatGPT history");
      try{
        const files=await extractChatGptCodeAttachments(file,extracted.codeFiles);
        const candidates:CodeCandidate[]=files.map((source)=>{
          const resolved=projectsByConversation.get(source.conversationExternalId);
          return{...source,provider,projectId:resolved?.projectId??"",projectName:resolved?.projectName??"Unresolved",
            conversationTitle:resolved?.conversationTitle??"Unresolved conversation",sourceMessageId:"",sourceFileId:source.fileId};
        });
        for(let start=0;start<candidates.length;start+=200)codeSourcesIndexed+=await saveCodeCandidates(candidates.slice(start,start+200));
      }catch(error){
        codeIndexError=error instanceof Error?error.message:String(error);
      }
    }
    reportProgress(decoded.length,"Queueing truth, pattern, intelligence, and MRS verification");scheduleDeferredDerivations({delayMs:0,idleTimeoutMs:2500});setTimeout(()=>{void verifyMemoryStorage().catch(()=>undefined);},0);reportProgress(decoded.length,codeIndexError?"History imported · Code Registry attachment scan needs retry":`Complete · ${codeSourcesIndexed} code sources indexed`);
    await recordRuntimeResponsiveness("import.archive_total",((typeof performance!=="undefined"&&typeof performance.now==="function"?performance.now():Date.now())-startedAt),{provider,conversationsAdded,messagesAdded,atomsAdded,totalConversations:decoded.length});
    return{provider,sourceLabel:extracted.sourceLabel,conversationsAdded,messagesAdded,atomsAdded,totalConversations:decoded.length,codeSourcesIndexed,codeIndexError,contextVault:{status:contextVaultRun.status,durationMs:contextVaultRun.durationMs,paragraphs:contextVaultRun.paragraphs,atoms:contextVaultRun.atoms,threads:contextVaultRun.threads}};
  });
}
