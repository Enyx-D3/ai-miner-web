"use client";

import { useEffect } from "react";
import { bootBrain2, getProjectIntelligenceMRSDebugSummary, getProjectsNeedingIntelligenceRefresh, getProjectsWithPendingMRS, getSyncReplicaSummary, ingestExtensionBatch, registerExtensionConnector, requestPendingProjectIntelligenceMRS, scheduleDeferredDerivations, subscribeBrain2 } from "@/lib/brain2/store";
import { hasActiveBrain2ForegroundTask } from "@/lib/brain2/foregroundTaskGate";
import { startBrain2P2P, stopBrain2P2P } from "@/lib/brain2/p2pSync";
import type { Brain2Provider as Provider, ExtensionCapture } from "@/lib/brain2/types";
import { Brain2ModelStatus } from "@/components/brain2/Brain2ModelStatus";
import { brain2MRSError, brain2MRSLog } from "@/lib/brain2/mrsDebug";
import { autoWarmBrain2TransformersFromCache, getBrain2MRSDebugRuntimeSummary, getBrain2TransformersSnapshot, isBrain2MRSReady, subscribeBrain2Transformers } from "@/lib/brain2/transformersRuntime";

declare global {
  interface Window {
    brain2MRSDebug?: () => unknown;
  }
}

const providers=new Set<Provider>(["chatgpt","claude","gemini","generic"]);
function validCapture(value:unknown):value is ExtensionCapture{
  if(!value||typeof value!=="object")return false;const item=value as Partial<ExtensionCapture>;
  return typeof item.id==="string"&&item.id.length>=8&&providers.has(item.provider as Provider)&&typeof item.conversationExternalId==="string"&&typeof item.conversationTitle==="string"&&typeof item.role==="string"&&typeof item.text==="string"&&item.text.length>=2&&typeof item.url==="string";
}

export function Brain2Provider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.dataset.brain2AiMiner="true";
    window.brain2MRSDebug=()=>({
      runtime:getBrain2MRSDebugRuntimeSummary(),
      projectQueue:getProjectIntelligenceMRSDebugSummary(),
    });
    window.postMessage({type:"BRAIN2_WEBSITE_READY"}, window.location.origin);
    void bootBrain2().then(()=>{
      startBrain2P2P();
      if(getProjectsNeedingIntelligenceRefresh().length) scheduleDeferredDerivations({delayMs:1200,idleTimeoutMs:9000});
    }).catch((error)=>{brain2MRSError("boot.failed",{error:error instanceof Error?error.message:String(error)});});
    return () => { delete document.body.dataset.brain2AiMiner; delete window.brain2MRSDebug; stopBrain2P2P(); };
  }, []);
  useEffect(()=>{
    let cancelled=false;
    let timer:number|undefined;
    let attempts=0;
    const scheduleAutoWarm=()=>{
      if(cancelled)return;
      const runtime=getBrain2TransformersSnapshot();
      if(runtime.state==="READY"||runtime.state==="LOADING"||runtime.state==="CHECKING")return;
      if(hasActiveBrain2ForegroundTask()||getProjectsNeedingIntelligenceRefresh().length){
        if(attempts>=10)return;
        attempts+=1;
        timer=window.setTimeout(scheduleAutoWarm,1500);
        return;
      }
      const idle=(window as typeof window & {requestIdleCallback?:(cb:()=>void,opts?:{timeout:number})=>number}).requestIdleCallback;
      const run=()=>{ if(!cancelled) void autoWarmBrain2TransformersFromCache().catch(()=>undefined); };
      if(idle)idle(run,{timeout:2500});else timer=window.setTimeout(run,300);
    };
    timer=window.setTimeout(scheduleAutoWarm,1800);
    return ()=>{
      cancelled=true;
      if(typeof window!=="undefined"&&timer)window.clearTimeout(timer);
    };
  },[]);
  useEffect(()=>{
    let lastReady=false;
    let lastPendingKey="";
    let timer:number|undefined;
    const schedule=(projectIds:string[])=>{
      if(!projectIds.length)return;
      const nextProjectIds=projectIds.slice(0,1);
      if(typeof window==="undefined"){
        void requestPendingProjectIntelligenceMRS({idle:true,projectIds:nextProjectIds,limit:1});
        return;
      }
      if(timer)window.clearTimeout(timer);
      timer=window.setTimeout(()=>{
        timer=undefined;
        void requestPendingProjectIntelligenceMRS({idle:true,projectIds:nextProjectIds,limit:1});
      },120);
    };
    const maybeAttach=(force=false)=>{
      const runtime=getBrain2TransformersSnapshot();
      if(!isBrain2MRSReady(runtime)){
        brain2MRSLog("attach.scan.skip-runtime", { state: runtime.state, mrsState: runtime.mrsState, force });
        return;
      }
      const projectIds=[...new Set(getProjectsWithPendingMRS())].sort();
      brain2MRSLog("attach.scan", { force, pendingProjects: projectIds.length });
      if(force||projectIds.length===0)brain2MRSLog("attach.scan.detail", getProjectIntelligenceMRSDebugSummary());
      const pendingKey=projectIds.join("|");
      if(!pendingKey){
        lastPendingKey="";
        return;
      }
      if(!force&&pendingKey===lastPendingKey)return;
      lastPendingKey=pendingKey;
      schedule(projectIds);
    };
    const unsubscribeRuntime=subscribeBrain2Transformers((runtime)=>{
      const ready=isBrain2MRSReady(runtime);
      if(!ready){
        lastReady=false;
        return;
      }
      const becameReady=!lastReady;
      lastReady=true;
      maybeAttach(becameReady);
    });
    const unsubscribeStore=subscribeBrain2(()=>{
      if(!isBrain2MRSReady(getBrain2TransformersSnapshot())){
        if(!getProjectsWithPendingMRS().length)lastPendingKey="";
        return;
      }
      maybeAttach(false);
    });
    return ()=>{
      if(typeof window!=="undefined"&&timer)window.clearTimeout(timer);
      unsubscribeRuntime();
      unsubscribeStore();
    };
  },[]);
  useEffect(() => {
    const pending=new Map<string,string>();
    const connected=new Map<string,string>();
    const lastHeartbeat=new Map<string,number>();
    const connectorMeta=new Map<string,{origin:string;queueCount:number;vaultLocked:boolean;version:string}>();
    const websiteInstanceId=crypto.randomUUID?.()??`web_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const requestConnect=async(bridgeNonce:string)=>{
      if(!bridgeNonce)return;const requestId=crypto.randomUUID?.()??`req_${Date.now()}_${Math.random().toString(36).slice(2)}`;pending.set(requestId,bridgeNonce);
      const summary=await getSyncReplicaSummary();
      window.postMessage({type:"BRAIN2_WEBSITE_CONNECT_REQUEST",requestId,bridgeNonce,websiteInstanceId,memoryRoot:summary.memoryRoot,websiteOrigin:window.location.origin,protocolVersion:1},window.location.origin);
    };
    const handler = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin || !event.data) return;
      if(event.data.type==="BRAIN2_EXTENSION_PRESENT"){void requestConnect(String(event.data.bridgeNonce??""));return;}
      if(event.data.type==="BRAIN2_EXTENSION_CONNECT_RESPONSE"){
        const requestId=String(event.data.requestId??""),bridgeNonce=String(event.data.bridgeNonce??""),installId=String(event.data.installId??"");
        if(!requestId||!bridgeNonce||!installId||pending.get(requestId)!==bridgeNonce)return;pending.delete(requestId);connected.set(bridgeNonce,installId);
        const meta={origin:window.location.origin,queueCount:Number(event.data.queueCount)||0,vaultLocked:Boolean(event.data.vaultLocked),version:String(event.data.extensionVersion??"")};connectorMeta.set(installId,meta);lastHeartbeat.set(installId,Date.now());
        void registerExtensionConnector({installId,...meta,connected:true});
        window.postMessage({type:"BRAIN2_WEBSITE_CONNECT_ACK",requestId,bridgeNonce,installId,websiteInstanceId},window.location.origin);return;
      }
      if(event.data.type==="BRAIN2_EXTENSION_STATUS"){
        const bridgeNonce=String(event.data.bridgeNonce??""),installId=String(event.data.installId??"");if(!installId||connected.get(bridgeNonce)!==installId)return;
        const meta={origin:window.location.origin,queueCount:Number(event.data.queueCount)||0,vaultLocked:Boolean(event.data.vaultLocked),version:String(event.data.extensionVersion??"")};connectorMeta.set(installId,meta);lastHeartbeat.set(installId,Date.now());void registerExtensionConnector({installId,...meta,connected:true});return;
      }
      if(event.data.type==="BRAIN2_EXTENSION_DISCONNECTED"){const bridgeNonce=String(event.data.bridgeNonce??"");const installId=connected.get(bridgeNonce);if(installId){connected.delete(bridgeNonce);lastHeartbeat.delete(installId);const meta=connectorMeta.get(installId);if(meta)void registerExtensionConnector({installId,...meta,connected:false});}return;}
      if (event.data.type !== "BRAIN2_EXTENSION_BATCH") return;
      const batchId=String(event.data.batchId??""),bridgeNonce=String(event.data.bridgeNonce??""),installId=String(event.data.connectorInstallId??"");
      if(!batchId||!bridgeNonce||!installId||connected.get(bridgeNonce)!==installId)return;
      const rawRecords: unknown[] = Array.isArray(event.data.records) ? event.data.records : [];
      const records: ExtensionCapture[] = rawRecords.filter(validCapture);
      void (async()=>{
        const result=await ingestExtensionBatch(records.map((record: ExtensionCapture)=>({...record,captureId:record.id,captureUrl:record.url,captureConnectorId:installId})));
        const meta={origin:window.location.origin,queueCount:Math.max(0,(Number(event.data.queueCount)||records.length)-result.acceptedIds.length),vaultLocked:false,version:String(event.data.extensionVersion??"")};connectorMeta.set(installId,meta);lastHeartbeat.set(installId,Date.now());await registerExtensionConnector({installId,...meta,connected:true});
        window.postMessage({type:"BRAIN2_EXTENSION_ACK",batchId,bridgeNonce,connectorInstallId:installId,acceptedIds:result.acceptedIds,error:result.errors.length?result.errors.join("; "):undefined},window.location.origin);
      })();
    };
    const heartbeatTimer=window.setInterval(()=>{const now=Date.now();for(const [installId,seen] of lastHeartbeat){if(now-seen<=7000)continue;lastHeartbeat.delete(installId);const meta=connectorMeta.get(installId);if(meta)void registerExtensionConnector({installId,...meta,connected:false});}},2500);
    window.addEventListener("message", handler);
    window.postMessage({type:"BRAIN2_WEBSITE_READY",websiteInstanceId},window.location.origin);
    return () => {window.clearInterval(heartbeatTimer);window.removeEventListener("message", handler);};
  }, []);
  return <>{children}<Brain2ModelStatus /></>;
}
