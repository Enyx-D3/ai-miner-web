"use client";

declare const process: { env: Record<string,string|undefined> };

import { adoptMemoryRootIfEmpty, applyReplicatedMutations, applySyncBootstrapChunk, currentBrain2DeviceId, finalizeSyncBootstrap, getReplicableMutationsForPeer, getSyncReplicaSummary, markPeerAck, streamSyncBootstrap, subscribeBrain2, updateSyncPeer } from "./store";
import { BRAIN2_SYNC_BATCH_LIMIT, BRAIN2_SYNC_CHANNEL, hashBootstrapChunk, hashMutationManifest } from "./syncProtocol";
import type { MutationRecord, SyncTableName } from "./types";

type Signal={id:string;fromDeviceId:string;toDeviceId:string;kind:"offer"|"answer"|"ice"|"bye";payload:any};
type WireMessage=
 | {type:"hello";summary:Awaited<ReturnType<typeof getSyncReplicaSummary>>}
 | {type:"mutations";mutations:MutationRecord[];manifestHash:string;fromSequence:number;toSequence:number}
 | {type:"ack";sequence:number;manifestHash?:string}
 | {type:"bootstrap_request"}
 | {type:"bootstrap_chunk";memoryRoot:string;table:SyncTableName|"mutations";records:Array<{id:string;[key:string]:unknown}>;ordinal:number;chunkHash:string}
 | {type:"bootstrap_complete";memoryRoot:string}
 | {type:"ping";at:number};

const TOKEN_KEY="brain2-p2p-device-token";
const SERVER_DEVICE_KEY="brain2-p2p-server-device-id";

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
  peerId:string; pc:RTCPeerConnection; channel:RTCDataChannel|null=null; closed=false; outboundInFlight=false;
  constructor(peerId:string,initiator:boolean){this.peerId=peerId;this.pc=new RTCPeerConnection(iceConfig());this.pc.onicecandidate=(event)=>{if(event.candidate)void postSignal(peerId,"ice",event.candidate.toJSON());};this.pc.onconnectionstatechange=()=>{const state=this.pc.connectionState;if(state==="connected")void updateSyncPeer(peerId,{status:"CONNECTED",lastSeenAt:new Date().toISOString(),transport:"WEBRTC"});if(["failed","closed","disconnected"].includes(state))void updateSyncPeer(peerId,{status:state==="failed"?"ERROR":"DISCONNECTED",error:state==="failed"?"WebRTC connection failed":undefined});};this.pc.ondatachannel=(event)=>this.attach(event.channel);if(initiator)this.attach(this.pc.createDataChannel(BRAIN2_SYNC_CHANNEL,{ordered:true}));}
  attach(channel:RTCDataChannel){this.channel=channel;channel.binaryType="arraybuffer";channel.bufferedAmountLowThreshold=128*1024;channel.onopen=()=>{void this.onOpen();};channel.onmessage=(event)=>{void this.onMessage(JSON.parse(String(event.data)) as WireMessage);};channel.onclose=()=>{void updateSyncPeer(this.peerId,{status:"DISCONNECTED"});};}
  async waitDrain(){while(this.channel && this.channel.bufferedAmount>512*1024){const channel=this.channel;await new Promise<void>((resolve)=>{const done=()=>{channel.removeEventListener("bufferedamountlow",done);resolve();};channel.addEventListener("bufferedamountlow",done,{once:true});setTimeout(done,250);});}}
  async send(message:WireMessage){if(!this.channel||this.channel.readyState!=="open")throw new Error("Brain2 P2P data channel is not open.");await this.waitDrain();this.channel.send(JSON.stringify(message));}
  async onOpen(){await updateSyncPeer(this.peerId,{status:"SYNCING",lastSeenAt:new Date().toISOString(),transport:"WEBRTC"});await this.send({type:"hello",summary:await getSyncReplicaSummary()});await this.sendPending();}
  async sendPending(){if(this.closed||this.outboundInFlight||!this.channel||this.channel.readyState!=="open")return;const mutations=await getReplicableMutationsForPeer(this.peerId,BRAIN2_SYNC_BATCH_LIMIT);if(!mutations.length)return;this.outboundInFlight=true;try{const manifestHash=await hashMutationManifest(mutations);await this.send({type:"mutations",mutations,manifestHash,fromSequence:mutations[0].originSequence??mutations[0].sequence??0,toSequence:mutations.at(-1)?.originSequence??mutations.at(-1)?.sequence??0});}catch(error){this.outboundInFlight=false;throw error;}}
  async onMessage(message:WireMessage){
    if(message.type==="hello"){const local=await getSyncReplicaSummary();if(message.summary.memoryRoot!==local.memoryRoot){this.close();throw new Error("P2P peer memory-root mismatch.");}await updateSyncPeer(this.peerId,{status:"SYNCING",lastSeenAt:new Date().toISOString(),pendingDeltas:Math.max(0,message.summary.latestLocalSequence)});if(local.totalMessages===0&&message.summary.totalMessages>0)await this.send({type:"bootstrap_request"});else await this.sendPending();return;}
    if(message.type==="bootstrap_request"){const summary=await getSyncReplicaSummary();await streamSyncBootstrap(async(chunk)=>{const chunkHash=await hashBootstrapChunk(summary.memoryRoot,chunk.table,chunk.ordinal,chunk.records);await this.send({type:"bootstrap_chunk",memoryRoot:summary.memoryRoot,...chunk,chunkHash});});await this.send({type:"bootstrap_complete",memoryRoot:summary.memoryRoot});return;}
    if(message.type==="bootstrap_chunk"){const actual=await hashBootstrapChunk(message.memoryRoot,message.table,message.ordinal,message.records);if(actual!==message.chunkHash)throw new Error("Brain2 bootstrap chunk hash mismatch.");await applySyncBootstrapChunk(message.memoryRoot,message.table,message.records);return;}
    if(message.type==="bootstrap_complete"){await finalizeSyncBootstrap();await this.send({type:"hello",summary:await getSyncReplicaSummary()});return;}
    if(message.type==="mutations"){const actualManifest=await hashMutationManifest(message.mutations);if(actualManifest!==message.manifestHash)throw new Error("Brain2 mutation batch manifest mismatch.");const result=await applyReplicatedMutations(this.peerId,message.mutations,"WEBRTC");await updateSyncPeer(this.peerId,{lastManifestHash:message.manifestHash});await this.send({type:"ack",sequence:result.lastAppliedSequence,manifestHash:message.manifestHash});if(!result.rejected.length)await this.sendPending();return;}
    if(message.type==="ack"){this.outboundInFlight=false;await markPeerAck(this.peerId,message.sequence);await updateSyncPeer(this.peerId,{lastManifestHash:message.manifestHash});await this.sendPending();return;}
    if(message.type==="ping")return;
  }
  close(){this.closed=true;this.outboundInFlight=false;try{this.channel?.close();}catch{}try{this.pc.close();}catch{}}
}

const sessions=new Map<string,PeerSession>();let pollTimer:number|undefined;let unsubscribeDelta:(()=>void)|undefined;let flushTimer:number|undefined;
async function consumeSignals(){for(const signal of await pullSignals()){let session=sessions.get(signal.fromDeviceId);if(signal.kind==="offer"){session?.close();session=new PeerSession(signal.fromDeviceId,false);sessions.set(signal.fromDeviceId,session);await session.pc.setRemoteDescription(signal.payload);const answer=await session.pc.createAnswer();await session.pc.setLocalDescription(answer);await postSignal(signal.fromDeviceId,"answer",answer);}else if(signal.kind==="answer"&&session){await session.pc.setRemoteDescription(signal.payload);}else if(signal.kind==="ice"&&session){try{await session.pc.addIceCandidate(signal.payload);}catch{}}else if(signal.kind==="bye"&&session){session.close();sessions.delete(signal.fromDeviceId);}}}
function flushConnectedPeers(){if(flushTimer)return;flushTimer=window.setTimeout(()=>{flushTimer=undefined;for(const session of sessions.values())void session.sendPending().catch((error)=>{void updateSyncPeer(session.peerId,{status:"ERROR",error:error instanceof Error?error.message:String(error)});});},80);}
export function startBrain2P2P(){if(typeof window==="undefined"||!localToken())return;if(!pollTimer){void consumeSignals();pollTimer=window.setInterval(()=>{void consumeSignals();},3000);}if(!unsubscribeDelta)unsubscribeDelta=subscribeBrain2(flushConnectedPeers);}
export function stopBrain2P2P(){if(pollTimer){clearInterval(pollTimer);pollTimer=undefined;}if(flushTimer){clearTimeout(flushTimer);flushTimer=undefined;}unsubscribeDelta?.();unsubscribeDelta=undefined;for(const session of sessions.values())session.close();sessions.clear();}

export async function enableBrain2P2P(){const summary=await getSyncReplicaSummary();const deviceId=currentBrain2DeviceId();const body=await api("/api/brain2-sync/devices",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({deviceId,spaceId:summary.memoryRoot,name:"AI Miner Web",kind:"web"})});localStorage.setItem(TOKEN_KEY,body.deviceToken);localStorage.setItem(SERVER_DEVICE_KEY,body.deviceId);startBrain2P2P();return body;}
export async function joinBrain2P2P(joinToken:string){const deviceId=currentBrain2DeviceId();const body=await api("/api/brain2-sync/devices",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({deviceId,name:"AI Miner Web",kind:"web",joinToken})});await adoptMemoryRootIfEmpty(body.spaceId);localStorage.setItem(TOKEN_KEY,body.deviceToken);localStorage.setItem(SERVER_DEVICE_KEY,body.deviceId);startBrain2P2P();return body;}
export async function createBrain2PairingToken(){try{return await api("/api/brain2-sync/pairing",{method:"POST",headers:{"Content-Type":"application/json","X-Brain2-Device-Token":localToken()},body:JSON.stringify({deviceId:serverDeviceId()})});}catch(error){if(!isUnknownDeviceError(error))throw error;clearLocalCredential();await enableBrain2P2P();return api("/api/brain2-sync/pairing",{method:"POST",headers:{"Content-Type":"application/json","X-Brain2-Device-Token":localToken()},body:JSON.stringify({deviceId:serverDeviceId()})});}}
export async function createBrain2PairingInvite(){const pair=await createBrain2PairingToken();const origin=typeof window!=="undefined"?window.location.origin:"";const url=new URL("/devices",origin||"http://localhost");url.searchParams.set("pair",pair.token);url.searchParams.set("peer",serverDeviceId());url.searchParams.set("expires",pair.expiresAt);return {...pair,inviterDeviceId:serverDeviceId(),pairingUrl:url.toString()};}
export function currentBrain2NetworkDeviceId(){return serverDeviceId();}
export async function listBrain2NetworkDevices(){if(!localToken())return[];try{const body=await api(`/api/brain2-sync/devices?deviceId=${encodeURIComponent(serverDeviceId())}`,{headers:{"X-Brain2-Device-Token":localToken()}});return body.devices||[];}catch(error){if(isUnknownDeviceError(error)){clearLocalCredential();return [];}throw error;}}
export function brain2P2PEnabled(){return Boolean(typeof window!=="undefined"&&localToken());}
export async function connectBrain2Peer(peerDeviceId:string){if(peerDeviceId===serverDeviceId())throw new Error("Cannot connect a Brain2 device to itself.");const session=new PeerSession(peerDeviceId,true);sessions.set(peerDeviceId,session);await updateSyncPeer(peerDeviceId,{status:"SIGNALING",transport:"WEBRTC"});const offer=await session.pc.createOffer();await session.pc.setLocalDescription(offer);await postSignal(peerDeviceId,"offer",offer);return session;}
