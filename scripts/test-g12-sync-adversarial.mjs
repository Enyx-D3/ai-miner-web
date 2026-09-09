import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";

const root=process.cwd();
const dist=join(root,".g12-sync-adversarial-dist");
rmSync(dist,{recursive:true,force:true});
execFileSync(
  process.platform==="win32"?"tsc.cmd":"tsc",
  ["-p","tsconfig.v8-sync-fixtures.json","--pretty","false","--outDir",dist],
  {stdio:"inherit"},
);

const safety=await import(pathToFileURL(join(dist,"lib/brain2/syncSafety.js")));
const server=await import(pathToFileURL(join(dist,"server/brain2/syncServer.js")));

safety.assertBrain2PhysicalMessageSize("x".repeat(100));
let rejected=false;
try{safety.assertBrain2PhysicalMessageSize("x".repeat(safety.BRAIN2_SYNC_PHYSICAL_MESSAGE_MAX_BYTES+1));}catch{rejected=true;}
if(!rejected)throw new Error("oversized physical P2P message accepted");

safety.assertBrain2FrameMetadata({id:"frame-1",index:0,total:1,data:"AA=="});
for(const frame of [
  {id:"",index:0,total:1,data:"AA=="},
  {id:"x".repeat(safety.BRAIN2_SYNC_FRAME_ID_MAX_CHARS+1),index:0,total:1,data:"AA=="},
  {id:"x",index:-1,total:1,data:"AA=="},
  {id:"x",index:1,total:1,data:"AA=="},
  {id:"x",index:0,total:safety.BRAIN2_SYNC_FRAME_MAX_COUNT+1,data:"AA=="},
  {id:"x",index:0,total:1,data:123},
]){
  rejected=false;try{safety.assertBrain2FrameMetadata(frame);}catch{rejected=true;}
  if(!rejected)throw new Error(`invalid transport frame accepted: ${JSON.stringify(frame)}`);
}

safety.assertBrain2DecodedFrameBytes(safety.BRAIN2_SYNC_FRAME_PAYLOAD_MAX_BYTES);
rejected=false;
try{safety.assertBrain2DecodedFrameBytes(safety.BRAIN2_SYNC_FRAME_PAYLOAD_MAX_BYTES+1);}catch{rejected=true;}
if(!rejected)throw new Error("oversized decoded frame accepted");

if(!safety.brain2SequenceRangeMatches([7,8,9],7,9))throw new Error("valid mutation range rejected");
if(safety.brain2SequenceRangeMatches([7,9],7,9))throw new Error("mutation gap accepted");
if(safety.brain2SequenceRangeMatches([7,8],7,9))throw new Error("wrong toSequence accepted");
if(safety.brain2SequenceRangeMatches([],1,1))throw new Error("empty mutation batch accepted");

if(!safety.brain2AckMatchesPending({
  awaiting:true,pendingManifestHash:"abc",pendingToSequence:9,
  ackManifestHash:"abc",ackSequence:9,ackOriginDeviceId:"dev_a",localDeviceId:"dev_a",
}))throw new Error("valid ACK rejected");
if(safety.brain2AckMatchesPending({
  awaiting:true,pendingManifestHash:"abc",pendingToSequence:9,
  ackManifestHash:"evil",ackSequence:999,ackOriginDeviceId:"dev_a",localDeviceId:"dev_a",
}))throw new Error("forged ACK accepted");

const replay=new safety.Brain2ReplayWindow(2);
if(!replay.accept("sig1")||replay.accept("sig1"))throw new Error("signal replay suppression failed");
if(!replay.accept("sig2")||!replay.accept("sig3"))throw new Error("signal replay window failed");
if(!replay.accept("sig1"))throw new Error("bounded replay window did not evict oldest id");

const temp=join(root,".g12-sync-adversarial-data");
rmSync(temp,{recursive:true,force:true});
mkdirSync(temp,{recursive:true});
process.env.BRAIN2_SYNC_DATA_DIR=temp;

rejected=false;
try{await server.registerSyncDevice({deviceId:"../escape",spaceId:"b2m_adv",name:"bad",kind:"web"});}catch{rejected=true;}
if(!rejected)throw new Error("unsafe device id accepted");

const a=await server.registerSyncDevice({deviceId:"dev_adv_a",spaceId:"b2m_adv",name:"A",kind:"web"});
const pair=await server.createPairingToken("dev_adv_a",a.deviceToken);
const b=await server.registerSyncDevice({deviceId:"dev_adv_b",name:"B",kind:"mobile",joinToken:pair.token});

rejected=false;
try{
  await server.postSyncSignal({
    fromDeviceId:"dev_adv_a",
    deviceToken:a.deviceToken,
    toDeviceId:"dev_adv_a",
    kind:"offer",
    payload:{sdp:"self"},
  });
}catch{rejected=true;}
if(!rejected)throw new Error("self-directed signal accepted");

rejected=false;
try{
  await server.postSyncSignal({
    fromDeviceId:"dev_adv_a",
    deviceToken:a.deviceToken,
    toDeviceId:"dev_adv_b",
    kind:"offer",
    payload:{sdp:"x".repeat(server.BRAIN2_SIGNAL_MAX_PAYLOAD_BYTES+1)},
  });
}catch{rejected=true;}
if(!rejected)throw new Error("oversized signaling payload accepted");

await server.postSyncSignal({
  fromDeviceId:"dev_adv_a",
  deviceToken:a.deviceToken,
  toDeviceId:"dev_adv_b",
  kind:"offer",
  payload:{sdp:"ok"},
});
const pulled=await server.pullSyncSignals({deviceId:"dev_adv_b",deviceToken:b.deviceToken});
if(pulled.length!==1)throw new Error("valid signal was not delivered");

console.log("G12.3 sync adversarial PASS: frame/message bounds, contiguous ranges, exact ACKs, replay suppression, signaling caps.");
rmSync(temp,{recursive:true,force:true});
rmSync(dist,{recursive:true,force:true});
