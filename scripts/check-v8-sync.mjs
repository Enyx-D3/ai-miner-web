import { readFileSync, existsSync } from "node:fs";
const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),"utf8");
const required=[
  "src/lib/brain2/syncProtocol.ts","src/lib/brain2/p2pSync.ts","src/lib/brain2/qrCode.ts","src/server/brain2/syncServer.ts","src/components/brain2/Brain2PairingQr.tsx","src/components/brain2/Brain2Provider.tsx",
  "src/app/api/brain2-sync/devices/route.ts","src/app/api/brain2-sync/pairing/route.ts","src/app/api/brain2-sync/signals/route.ts",
  "extension/bridge.js","extension/service_worker.js","extension/popup.js",
  "brain2-network/repeater-go/internal/api/server.go","brain2-network/fabric-sdk-go/fabric.go","brain2-network/fabric-sdk-go/planner.go"
];
for(const p of required)if(!existsSync(new URL(`../${p}`,import.meta.url)))throw new Error(`Missing V8 sync artifact: ${p}`);
const types=read("src/lib/brain2/types.ts"),store=read("src/lib/brain2/store.ts"),p2p=read("src/lib/brain2/p2pSync.ts"),server=read("src/server/brain2/syncServer.ts"),contracts=read("src/lib/brain2/contracts.ts"),ui=read("src/features/brain2/Brain2Workspace.tsx"),bridge=read("extension/bridge.js"),worker=read("extension/service_worker.js"),qr=read("src/lib/brain2/qrCode.ts"),provider=read("src/components/brain2/Brain2Provider.tsx");
if(!/BRAIN2_SCHEMA_VERSION = (8|9)/.test(contracts))throw new Error("Missing compatible sync schema invariant");
if(!contracts.includes("B2_STORAGE_V8_SYNC_BOUNDED_HOT_SET")&&!contracts.includes("B2_STORAGE_V9_ASIF_READER_BOUNDED_HOT_SET"))throw new Error("Missing compatible sync storage invariant");
for(const invariant of ["payloadHash","originDeviceId","originSequence","parentMutationIds","beforeHash","afterHash","SyncConflictRecord","SyncPeerRecord","connectorInstallId","connectorStatus"])if(!types.includes(invariant))throw new Error(`Missing mutation/connector field ${invariant}`);
for(const invariant of ["verifyMutationEnvelope","applyReplicatedMutations","concurrent mutation conflict preserved","streamSyncBootstrap","lastAppliedPeerSequence","byOriginSequence","registerExtensionConnector","captureConnectorId"])if(!store.includes(invariant))throw new Error(`Missing Global Delta behavior ${invariant}`);
for(const invariant of ["hashBootstrapChunk","hashMutationManifest","RTCPeerConnection","createDataChannel(BRAIN2_SYNC_CHANNEL","bootstrap_request","bootstrap_chunk","type:\"mutations\"","type:\"ack\"","NEXT_PUBLIC_BRAIN2_SIGNALING_URL","outboundInFlight","createBrain2PairingInvite"])if(!p2p.includes(invariant))throw new Error(`Missing P2P behavior ${invariant}`);
for(const invariant of ["pairing_tokens","single-use","secret_hash","authorized replica of this Brain2 memory","signals"])if(!server.includes(invariant))throw new Error(`Missing signaling security behavior ${invariant}`);
for(const invariant of ["makeQrMatrix","error correction L","versions 1-10"])if(!qr.includes(invariant))throw new Error(`QR implementation missing ${invariant}`);
for(const invariant of ["Add device with QR","Scan with the new device","QR invitation detected","Browser connectors","Connect this Brain2 tab"])if(!ui.includes(invariant)&&!read("extension/popup.html").includes(invariant))throw new Error(`Devices/connector UI missing ${invariant}`);
for(const invariant of ["BRAIN2_EXTENSION_PRESENT","BRAIN2_WEBSITE_CONNECT_REQUEST","connectorInstallId","BRAIN2_EXTENSION_STATUS"])if(!bridge.includes(invariant))throw new Error(`Extension bridge handshake missing ${invariant}`);
for(const invariant of ["BRAIN2_CONNECT_WEBSITE","ensureInstallId","configured","lastWebsiteSeenAt"])if(!worker.includes(invariant))throw new Error(`Extension service worker binding missing ${invariant}`);
for(const invariant of ["BRAIN2_EXTENSION_CONNECT_RESPONSE","registerExtensionConnector","captureConnectorId"])if(!provider.includes(invariant))throw new Error(`Website connector receiver missing ${invariant}`);
console.log(`Inherited V8 sync acceptance PASS: ${required.length} implementation artifacts + QR external-device pairing + ACK-gated Global Delta + browser-bound extension connector.`);
