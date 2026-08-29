"use client";

import { useEffect } from "react";
import { bootBrain2, getProjectsNeedingIntelligenceRefresh, getProjectsWithPendingMRS, getSyncReplicaSummary, ingestExtensionBatch, registerExtensionConnector, requestPendingProjectIntelligenceMRS, scheduleDeferredDerivations } from "@/lib/brain2/store";
import { startBrain2P2P, stopBrain2P2P } from "@/lib/brain2/p2pSync";
import type { Brain2Provider as Provider, ExtensionCapture } from "@/lib/brain2/types";
import { Brain2ModelStatus } from "@/components/brain2/Brain2ModelStatus";
import { isBrain2MRSReady, subscribeBrain2Transformers } from "@/lib/brain2/transformersRuntime";

const providers=new Set<Provider>(["chatgpt","claude","gemini","generic"]);
function validCapture(value:unknown):value is ExtensionCapture{
  if(!value||typeof value!=="object")return false;const item=value as Partial<ExtensionCapture>;
  return typeof item.id==="string"&&item.id.length>=8&&providers.has(item.provider as Provider)&&typeof item.conversationExternalId==="string"&&typeof item.conversationTitle==="string"&&typeof item.role==="string"&&typeof item.text==="string"&&item.text.length>=2&&typeof item.url==="string";
}

export function Brain2Provider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.dataset.brain2AiMiner="true";
    window.postMessage({type:"BRAIN2_WEBSITE_READY"}, window.location.origin);
    void bootBrain2().then(()=>{
      startBrain2P2P();
      if(getProjectsNeedingIntelligenceRefresh().length) scheduleDeferredDerivations({delayMs:1200,idleTimeoutMs:9000});
    }).catch((error)=>{console.error("Brain2 boot failed",error);});
    return () => { delete document.body.dataset.brain2AiMiner; stopBrain2P2P(); };
  }, []);
  useEffect(()=>{
    let lastReady=false;
    return subscribeBrain2Transformers((runtime)=>{
      const ready=isBrain2MRSReady(runtime);
      if(!ready||lastReady===ready)return;
      lastReady=ready;
      if(!getProjectsWithPendingMRS().length)return;
      void requestPendingProjectIntelligenceMRS({idle:true});
    });
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
