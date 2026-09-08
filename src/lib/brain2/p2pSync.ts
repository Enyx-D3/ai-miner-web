"use client";

declare const process: { env: Record<string,string|undefined> };

import { adoptMemoryRootIfEmpty, applyReplicatedMutations, applySyncBootstrapChunk, applySyncMergeChunk, currentBrain2DeviceId, finalizeSyncBootstrap, finalizeSyncMemoryMerge, getReplicableMutationsForPeer, getSyncReplicaSummary, markPeerAck, streamSyncBootstrap, streamSyncMergeSnapshot, subscribeBrain2, updateSyncPeer } from "./store";
import { sha256 } from "./identity";
import { BRAIN2_SYNC_BATCH_LIMIT, BRAIN2_SYNC_CHANNEL, hashBootstrapChunk, hashMutationManifest } from "./syncProtocol";
import type { MutationRecord, SyncTableName } from "./types";

type Signal={id:string;fromDeviceId:string;toDeviceId:string;kind:"offer"|"answer"|"ice"|"bye";payload:any};
type WireMessage =
 | {type:"hello";summary:Awaited<ReturnType<typeof getSyncReplicaSummary>>}
 | {type:"mutations";mutations:MutationRecord[];manifestHash:string;fromSequence:number;toSequence:number;originDeviceId?:string}
 | {type:"ack";sequence:number;manifestHash?:string;originDeviceId?:string}
 | {type:"bootstrap_request"}
 | {type:"bootstrap_chunk";memoryRoot:string;table:SyncTableName|"mutations";records?:Array<{id:string;[key:string]:unknown}>;recordsJson?:string;hashVersion?:number;ordinal:number;chunkHash:string}
 | {type:"bootstrap_complete";memoryRoot:string}
 | {type:"merge_request";targetRoot:string;localSummary?:Record<string,unknown>}
 | {type:"merge_accept";targetRoot:string}
 | {type:"merge_ready";targetRoot:string}
 | {type:"merge_seed_chunk";targetRoot:string;table:SyncTableName;ordinal:number;recordsJson:string;chunkHash:string}
 | {type:"merge_seed_complete";targetRoot:string}
 | {type:"merge_return_chunk";targetRoot:string;table:string;ordinal:number;recordsJson:string;chunkHash:string}
 | {type:"merge_return_complete";targetRoot:string}
 | {type:"merge_complete";targetRoot:string}
 | {type:"ping";at:number};

const TOKEN_KEY="brain2-p2p-device-token";
const SERVER_DEVICE_KEY="brain2-p2p-server-device-id";
const BRAIN2_TRANSPORT_FRAME_PAYLOAD_BYTES=8*1024;
const BRAIN2_TRANSPORT_MAX_REASSEMBLED_BYTES=64*1024*1024;
const transportEncoder=new TextEncoder();
const transportDecoder=new TextDecoder();

type Brain2TransportFrame={__brain2Frame:1;id:string;index:number;total:number;data:string};
type Brain2FrameAssembly={total:number;parts:Array<Uint8Array|null>;received:number;bytes:number};

function bytesToBase64(bytes:Uint8Array){let binary="";for(let i=0;i<bytes.length;i++)binary+=String.fromCharCode(bytes[i]);return btoa(binary);}
function base64ToBytes(value:string){const binary=atob(value);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes;}

function iceConfig():RTCConfiguration{try{const raw=process.env.NEXT_PUBLIC_BRAIN2_ICE_SERVERS_JSON;if(raw)return{iceServers:JSON.parse(raw)};}catch{}return{iceServers:[]};}
function signalingBase(){const raw=process.env.NEXT_PUBLIC_BRAIN2_SIGNALING_URL?.trim();return raw?raw.replace(/\/$/,""):"";}
function syncUrl(path:string){return `${signalingBase()}${path}`;}
function localToken(){return localStorage.getItem(TOKEN_KEY)||"";}
function serverDeviceId(){return localStorage.getItem(SERVER_DEVICE_KEY)||currentBrain2DeviceId();}
function clearLocalCredential(){localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(SERVER_DEVICE_KEY);}
function isUnknownDeviceError(error:unknown){const msg=error instanceof Error?error.message:String(error);return /Unknown or revoked Brain2 device|Invalid Brain2 device sync credential|Brain2 device is not trusted/i.test(msg);}
async function api(path:string,init?:RequestInit){const r=await fetch(syncUrl(path),init);const body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(body.error||`Brain2 sync request failed (${r.status})`);return body;}
async function postSignal(peerDeviceId:string,kind:string,payload:any){const token=localToken();if(!token)throw new Error("P2P sync is not enabled on this device.");return api("/api/brain2-sync/signals",{method:"POST",headers:{"Content-Type":"application/json","X-Brain2-Device-Token":token},body:JSON.stringify({fromDeviceId:serverDeviceId(),toDeviceId:peerDeviceId,kind,payload})});}
async function pullSignals(){const token=localToken();if(!token)return[];try{const body=await api(`/api/brain2-sync/signals?deviceId=${encodeURIComponent(serverDeviceId())}`,{headers:{"X-Brain2-Device-Token":token}});return (body.signals||[]) as Signal[];}catch(error){if(isUnknownDeviceError(error)){clearLocalCredential();return[];}throw error;}}

class PeerSession{
  peerId:string; pc:RTCPeerConnection; channel:RTCDataChannel|null=null; closed=false; outboundInFlight=false; rootVerified=false; merging=false;
  incomingFrames=new Map<string,Brain2FrameAssembly>(); incomingWork:Promise<void>=Promise.resolve(); frameCounter=0;
  constructor(peerId:string,initiator:boolean){this.peerId=peerId;this.pc=new RTCPeerConnection(iceConfig());this.pc.onicecandidate=(event)=>{if(event.candidate)void postSignal(peerId,"ice",event.candidate.toJSON());};this.pc.onconnectionstatechange=()=>{const state=this.pc.connectionState;if(state==="connected")void updateSyncPeer(peerId,{status:"CONNECTED",lastSeenAt:new Date().toISOString(),transport:"WEBRTC"});if(["failed","closed","disconnected"].includes(state))void updateSyncPeer(peerId,{status:state==="failed"?"ERROR":"DISCONNECTED",error:state==="failed"?"WebRTC connection failed":undefined});};this.pc.ondatachannel=(event)=>this.attach(event.channel);if(initiator)this.attach(this.pc.createDataChannel(BRAIN2_SYNC_CHANNEL,{ordered:true}));}
  attach(channel:RTCDataChannel){
    this.channel=channel;
    channel.binaryType="arraybuffer";
    channel.bufferedAmountLowThreshold=128*1024;
    channel.onopen=()=>{void this.onOpen().catch((error)=>{void updateSyncPeer(this.peerId,{status:"ERROR",error:error instanceof Error?error.message:String(error)});});};
    channel.onmessage=(event)=>{
      const raw=String(event.data);
      this.incomingWork=this.incomingWork
        .then(()=>this.onRawText(raw))
        .catch((error)=>{void updateSyncPeer(this.peerId,{status:"ERROR",error:error instanceof Error?error.message:String(error)});});
    };
    channel.onclose=()=>{this.rootVerified=false;void updateSyncPeer(this.peerId,{status:"DISCONNECTED"});};
  }
  async waitDrain(){while(this.channel && this.channel.bufferedAmount>512*1024){const channel=this.channel;await new Promise<void>((resolve)=>{const done=()=>{channel.removeEventListener("bufferedamountlow",done);resolve();};channel.addEventListener("bufferedamountlow",done,{once:true});setTimeout(done,250);});}}
  async sendPhysical(text:string){if(!this.channel||this.channel.readyState!=="open")throw new Error("Brain2 P2P data channel is not open.");await this.waitDrain();this.channel.send(text);}
  async send(message:WireMessage){
    const raw=JSON.stringify(message);
    const bytes=transportEncoder.encode(raw);
    if(bytes.byteLength<=BRAIN2_TRANSPORT_FRAME_PAYLOAD_BYTES){await this.sendPhysical(raw);return;}
    const id=`${serverDeviceId()}-${Date.now()}-${this.frameCounter++}`;
    const total=Math.ceil(bytes.byteLength/BRAIN2_TRANSPORT_FRAME_PAYLOAD_BYTES);
    for(let index=0;index<total;index++){
      const start=index*BRAIN2_TRANSPORT_FRAME_PAYLOAD_BYTES;
      const end=Math.min(bytes.byteLength,start+BRAIN2_TRANSPORT_FRAME_PAYLOAD_BYTES);
      const frame:Brain2TransportFrame={__brain2Frame:1,id,index,total,data:bytesToBase64(bytes.subarray(start,end))};
      await this.sendPhysical(JSON.stringify(frame));
    }
  }
  async onRawText(raw:string){
    const decoded=JSON.parse(raw) as WireMessage|Brain2TransportFrame;
    if((decoded as Brain2TransportFrame).__brain2Frame===1){await this.acceptFrame(decoded as Brain2TransportFrame);return;}
    await this.onMessage(decoded as WireMessage);
  }
  async acceptFrame(frame:Brain2TransportFrame){
    if(!frame.id||frame.total<1||frame.total>16384||frame.index<0||frame.index>=frame.total)throw new Error("Invalid Brain2 transport frame.");
    const key=frame.id;
    let assembly=this.incomingFrames.get(key);
    if(!assembly){assembly={total:frame.total,parts:Array<Uint8Array|null>(frame.total).fill(null),received:0,bytes:0};this.incomingFrames.set(key,assembly);}
    if(assembly.total!==frame.total){this.incomingFrames.delete(key);throw new Error("Brain2 transport frame total changed.");}
    if(assembly.parts[frame.index])return;
    const bytes=base64ToBytes(frame.data);
    assembly.parts[frame.index]=bytes;assembly.received+=1;assembly.bytes+=bytes.byteLength;
    if(assembly.bytes>BRAIN2_TRANSPORT_MAX_REASSEMBLED_BYTES){this.incomingFrames.delete(key);throw new Error("Brain2 transport message exceeded reassembly limit.");}
    if(assembly.received!==assembly.total)return;
    const merged=new Uint8Array(assembly.bytes);let offset=0;
    for(const part of assembly.parts){if(!part){this.incomingFrames.delete(key);throw new Error("Brain2 transport frame missing during reassembly.");}merged.set(part,offset);offset+=part.byteLength;}
    this.incomingFrames.delete(key);
    await this.onMessage(JSON.parse(transportDecoder.decode(merged)) as WireMessage);
  }
  async onOpen(){this.rootVerified=false;await updateSyncPeer(this.peerId,{status:"SYNCING",lastSeenAt:new Date().toISOString(),transport:"WEBRTC"});await this.send({type:"hello",summary:await getSyncReplicaSummary()});}
  async sendPending(){if(this.closed||this.merging||!this.rootVerified||this.outboundInFlight||!this.channel||this.channel.readyState!=="open")return;const mutations=await getReplicableMutationsForPeer(this.peerId,BRAIN2_SYNC_BATCH_LIMIT);if(!mutations.length)return;this.outboundInFlight=true;try{const manifestHash=await hashMutationManifest(mutations);await this.send({type:"mutations",mutations,manifestHash,fromSequence:mutations[0].originSequence??mutations[0].sequence??0,toSequence:mutations.at(-1)?.originSequence??mutations.at(-1)?.sequence??0});}catch(error){this.outboundInFlight=false;throw error;}}
  async onMessage(message:WireMessage){
    if(message.type==="hello"){
      const local=await getSyncReplicaSummary();
      if(message.summary.memoryRoot!==local.memoryRoot){
        this.rootVerified=false;
        await updateSyncPeer(this.peerId,{status:"CONFLICT",lastSeenAt:new Date().toISOString(),transport:"WEBRTC",error:"Different Brain2 memory roots. Merge is required before delta sync."});
        return;
      }
      this.rootVerified=true;
      await updateSyncPeer(this.peerId,{status:"SYNCING",lastSeenAt:new Date().toISOString(),pendingDeltas:Math.max(0,message.summary.latestLocalSequence),transport:"WEBRTC",error:undefined});
      if(local.totalMessages===0&&message.summary.totalMessages>0)await this.send({type:"bootstrap_request"});
      else await this.sendPending();
      return;
    }
    if(message.type==="merge_request"){
      const local=await getSyncReplicaSummary();
      if(message.targetRoot!==local.memoryRoot)throw new Error("Unexpected Brain2 merge target.");
      this.merging=true;this.rootVerified=false;this.outboundInFlight=false;
      await updateSyncPeer(this.peerId,{status:"SYNCING",lastSeenAt:new Date().toISOString(),transport:"WEBRTC",error:undefined});
      await this.send({type:"merge_accept",targetRoot:local.memoryRoot});
      return;
    }
    if(message.type==="merge_ready"){
      const local=await getSyncReplicaSummary();
      if(message.targetRoot!==local.memoryRoot)throw new Error("Brain2 merge-ready root mismatch.");
      this.merging=true;
      await streamSyncMergeSnapshot(async(chunk)=>{
        const recordsJson=JSON.stringify(chunk.records);
        const chunkHash=await sha256(recordsJson);
        await this.send({type:"merge_seed_chunk",targetRoot:local.memoryRoot,table:chunk.table,ordinal:chunk.ordinal,recordsJson,chunkHash});
      });
      await this.send({type:"merge_seed_complete",targetRoot:local.memoryRoot});
      return;
    }
    if(message.type==="merge_return_chunk"){
      const local=await getSyncReplicaSummary();
      if(message.targetRoot!==local.memoryRoot)throw new Error("Brain2 merge return root mismatch.");
      const actual=await sha256(message.recordsJson);
      if(actual!==message.chunkHash)throw new Error("Brain2 merge return chunk hash mismatch.");
      const decoded=JSON.parse(message.recordsJson) as unknown;
      if(!Array.isArray(decoded))throw new Error("Brain2 merge return chunk is not a record list.");
      const records=decoded.map((item)=>item as {id:string;[key:string]:unknown});
      await applySyncMergeChunk(local.memoryRoot,message.table,records);
      return;
    }
    if(message.type==="merge_return_complete"){
      const local=await getSyncReplicaSummary();
      if(message.targetRoot!==local.memoryRoot)throw new Error("Brain2 merge return completion root mismatch.");
      await finalizeSyncMemoryMerge();
      this.merging=false;this.rootVerified=false;this.outboundInFlight=false;
      await updateSyncPeer(this.peerId,{status:"SYNCING",lastSeenAt:new Date().toISOString(),transport:"WEBRTC",error:undefined});
      await this.send({type:"merge_complete",targetRoot:message.targetRoot});
      await this.send({type:"hello",summary:await getSyncReplicaSummary()});
      return;
    }
    if(message.type==="bootstrap_request"){const summary=await getSyncReplicaSummary();await streamSyncBootstrap(async(chunk)=>{const chunkHash=await hashBootstrapChunk(summary.memoryRoot,chunk.table,chunk.ordinal,chunk.records);await this.send({type:"bootstrap_chunk",memoryRoot:summary.memoryRoot,...chunk,chunkHash});});await this.send({type:"bootstrap_complete",memoryRoot:summary.memoryRoot});return;}
    if(message.type==="bootstrap_chunk"){
      let records:Array<{id:string;[key:string]:unknown}>;
      let actual:string;
      if(message.hashVersion===3&&typeof message.recordsJson==="string"){
        actual=await sha256(`B2BOOTSTRAP3\u0000${message.memoryRoot}\u0000${message.table}\u0000${message.ordinal}\u0000${message.recordsJson}`);
        const decoded=JSON.parse(message.recordsJson) as unknown;
        if(!Array.isArray(decoded))throw new Error("Brain2 bootstrap recordsJson is not a list.");
        records=decoded.map((item)=>item as {id:string;[key:string]:unknown});
      }else{
        records=message.records??[];
        actual=await hashBootstrapChunk(message.memoryRoot,message.table,message.ordinal,records);
      }
      if(actual!==message.chunkHash)throw new Error("Brain2 bootstrap chunk hash mismatch.");
      await applySyncBootstrapChunk(message.memoryRoot,message.table,records);
      return;
    }
    if(message.type==="bootstrap_complete"){await finalizeSyncBootstrap();await this.send({type:"hello",summary:await getSyncReplicaSummary()});return;}
    if(message.type==="mutations"){const actualManifest=await hashMutationManifest(message.mutations);if(actualManifest!==message.manifestHash)throw new Error("Brain2 mutation batch manifest mismatch.");const result=await applyReplicatedMutations(this.peerId,message.mutations,"WEBRTC");await updateSyncPeer(this.peerId,{lastManifestHash:message.manifestHash});await this.send({type:"ack",sequence:result.lastAppliedSequence,manifestHash:message.manifestHash});if(!result.rejected.length)await this.sendPending();return;}
    if(message.type==="ack"){this.outboundInFlight=false;await markPeerAck(this.peerId,message.sequence);await updateSyncPeer(this.peerId,{lastManifestHash:message.manifestHash});await this.sendPending();return;}
    if(message.type==="ping")return;
  }
  close(){this.closed=true;this.rootVerified=false;this.merging=false;this.outboundInFlight=false;this.incomingFrames.clear();try{this.channel?.close();}catch{}try{this.pc.close();}catch{}}
}

const sessions=new Map<string,PeerSession>();let pollTimer:number|undefined;let unsubscribeDelta:(()=>void)|undefined;let flushTimer:number|undefined;
async function consumeSignals(){for(const signal of await pullSignals()){let session=sessions.get(signal.fromDeviceId);if(signal.kind==="offer"){session?.close();session=new PeerSession(signal.fromDeviceId,false);sessions.set(signal.fromDeviceId,session);await session.pc.setRemoteDescription(signal.payload);const answer=await session.pc.createAnswer();await session.pc.setLocalDescription(answer);await postSignal(signal.fromDeviceId,"answer",answer);}else if(signal.kind==="answer"&&session){if(session.pc.signalingState==="have-local-offer")await session.pc.setRemoteDescription(signal.payload);}else if(signal.kind==="ice"&&session){try{await session.pc.addIceCandidate(signal.payload);}catch{}}else if(signal.kind==="bye"&&session){session.close();sessions.delete(signal.fromDeviceId);}}}
function flushConnectedPeers(){if(flushTimer)return;flushTimer=window.setTimeout(()=>{flushTimer=undefined;for(const session of sessions.values())void session.sendPending().catch((error)=>{void updateSyncPeer(session.peerId,{status:"ERROR",error:error instanceof Error?error.message:String(error)});});},80);}
export function startBrain2P2P(){if(typeof window==="undefined"||!localToken())return;if(!pollTimer){void consumeSignals();pollTimer=window.setInterval(()=>{void consumeSignals();},3000);}if(!unsubscribeDelta)unsubscribeDelta=subscribeBrain2(flushConnectedPeers);}
export function stopBrain2P2P(){if(pollTimer){clearInterval(pollTimer);pollTimer=undefined;}if(flushTimer){clearTimeout(flushTimer);flushTimer=undefined;}unsubscribeDelta?.();unsubscribeDelta=undefined;for(const session of sessions.values())session.close();sessions.clear();}

export async function enableBrain2P2P(){const summary=await getSyncReplicaSummary();const deviceId=currentBrain2DeviceId();const body=await api("/api/brain2-sync/devices",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({deviceId,spaceId:summary.memoryRoot,name:"AI Miner Web",kind:"web"})});localStorage.setItem(TOKEN_KEY,body.deviceToken);localStorage.setItem(SERVER_DEVICE_KEY,body.deviceId);startBrain2P2P();return body;}
export async function joinBrain2P2P(joinToken:string){const deviceId=currentBrain2DeviceId();const body=await api("/api/brain2-sync/devices",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({deviceId,name:"AI Miner Web",kind:"web",joinToken})});await adoptMemoryRootIfEmpty(body.spaceId);localStorage.setItem(TOKEN_KEY,body.deviceToken);localStorage.setItem(SERVER_DEVICE_KEY,body.deviceId);startBrain2P2P();return body;}
export async function createBrain2PairingToken(){try{return await api("/api/brain2-sync/pairing",{method:"POST",headers:{"Content-Type":"application/json","X-Brain2-Device-Token":localToken()},body:JSON.stringify({deviceId:serverDeviceId()})});}catch(error){if(!isUnknownDeviceError(error))throw error;clearLocalCredential();await enableBrain2P2P();return api("/api/brain2-sync/pairing",{method:"POST",headers:{"Content-Type":"application/json","X-Brain2-Device-Token":localToken()},body:JSON.stringify({deviceId:serverDeviceId()})});}}
async function physicalPairingOrigin(){const configured=signalingBase();if(configured)return configured;const response=await api("/api/brain2-sync/origin");const origin=String(response.origin??"").replace(/\/$/,"");if(!origin)throw new Error(response.error||"Brain2 could not determine a LAN-reachable signaling origin.");return origin;}
export async function createBrain2PairingInvite(){const pair=await createBrain2PairingToken();const signalOrigin=await physicalPairingOrigin();const url=new URL("/devices",signalOrigin);url.searchParams.set("pair",pair.token);url.searchParams.set("peer",serverDeviceId());url.searchParams.set("expires",pair.expiresAt);url.searchParams.set("v","2");url.searchParams.set("signal",signalOrigin);return {...pair,inviterDeviceId:serverDeviceId(),signalingOrigin:signalOrigin,pairingUrl:url.toString()};}
export function currentBrain2NetworkDeviceId(){return serverDeviceId();}
export async function listBrain2NetworkDevices(){if(!localToken())return[];try{const body=await api(`/api/brain2-sync/devices?deviceId=${encodeURIComponent(serverDeviceId())}`,{headers:{"X-Brain2-Device-Token":localToken()}});return body.devices||[];}catch(error){if(isUnknownDeviceError(error)){clearLocalCredential();return [];}throw error;}}
export function brain2P2PEnabled(){return Boolean(typeof window!=="undefined"&&localToken());}
export async function connectBrain2Peer(peerDeviceId:string){if(peerDeviceId===serverDeviceId())throw new Error("Cannot connect a Brain2 device to itself.");const session=new PeerSession(peerDeviceId,true);sessions.set(peerDeviceId,session);await updateSyncPeer(peerDeviceId,{status:"SIGNALING",transport:"WEBRTC"});const offer=await session.pc.createOffer();await session.pc.setLocalDescription(offer);await postSignal(peerDeviceId,"offer",offer);return session;}
