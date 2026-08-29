if(typeof importScripts==="function"){try{importScripts("queue_db.js");}catch(error){console.error("Brain2 queue DB load failed",error);}}

const STORE={
  salt:"b2_salt",
  sentinel:"b2_sentinel",
  legacyQueue:"b2_queue",
  origin:"b2_origin",
  lastError:"b2_last_error",
  queueMode:"b2_queue_mode",
  installId:"b2_install_id",
  lastWebsiteSeenAt:"b2_last_website_seen_at",
  lastDeliveredAt:"b2_last_delivered_at",
  vaultMode:"b2_vault_mode",
  deviceKey:"b2_device_key",
  providerHealth:"b2_provider_health"
};
const SESSION={rawKey:"b2_session_raw_key"};
const encoder=new TextEncoder();
const decoder=new TextDecoder();
const manifestVersion=()=>chrome.runtime.getManifest?.().version||"0.8.3";
let vaultKey=null;
let unlockedAt=0;
let knownIds=new Set();
const MAX_BATCH=250;
const QUEUE_WARNING=1500;
const b64=(bytes)=>btoa(String.fromCharCode(...bytes));
const unb64=(value)=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));

async function ensureInstallId(){
  const stored=await chrome.storage.local.get(STORE.installId);
  if(stored[STORE.installId])return stored[STORE.installId];
  const value=crypto.randomUUID?crypto.randomUUID():`ext_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await chrome.storage.local.set({[STORE.installId]:value});
  return value;
}
async function importRawKey(raw){return crypto.subtle.importKey("raw",raw,{name:"AES-GCM"},false,["encrypt","decrypt"]);}
async function deriveRaw(passphrase,salt){
  const base=await crypto.subtle.importKey("raw",encoder.encode(passphrase),"PBKDF2",false,["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt,iterations:200000},base,256));
}
async function vaultMode(){
  const stored=await chrome.storage.local.get([STORE.vaultMode,STORE.sentinel]);
  if(stored[STORE.vaultMode])return stored[STORE.vaultMode];
  if(stored[STORE.sentinel]){await chrome.storage.local.set({[STORE.vaultMode]:"passphrase"});return"passphrase";}
  await chrome.storage.local.set({[STORE.vaultMode]:"device"});
  return"device";
}
async function ensureDeviceKey(){
  const stored=await chrome.storage.local.get(STORE.deviceKey);
  let raw=stored[STORE.deviceKey]?unb64(stored[STORE.deviceKey]):null;
  if(!raw||raw.length!==32){raw=crypto.getRandomValues(new Uint8Array(32));await chrome.storage.local.set({[STORE.deviceKey]:b64(raw)});}
  vaultKey=await importRawKey(raw);unlockedAt=Date.now();return true;
}
async function restoreSessionKey(){
  try{const stored=await chrome.storage.session.get(SESSION.rawKey);const value=stored[SESSION.rawKey];if(!value)return false;const raw=unb64(value);if(raw.length!==32)return false;vaultKey=await importRawKey(raw);unlockedAt=Date.now();return true;}catch{return false;}
}
async function ensureVaultReady(){
  if(vaultKey)return true;
  const mode=await vaultMode();
  if(mode==="device")return ensureDeviceKey();
  return restoreSessionKey();
}
async function encryptJson(value){if(!(await ensureVaultReady()))throw new Error("Vault locked");const iv=crypto.getRandomValues(new Uint8Array(12));const clear=encoder.encode(JSON.stringify(value));const cipher=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},vaultKey,clear));return{iv:b64(iv),data:b64(cipher)};}
async function decryptJson(box){if(!(await ensureVaultReady()))throw new Error("Vault locked");const clear=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(box.iv)},vaultKey,unb64(box.data));return JSON.parse(decoder.decode(clear));}
function idbQueue(){return globalThis.Brain2QueueDB&&typeof globalThis.indexedDB!=="undefined"?globalThis.Brain2QueueDB:null;}
async function legacyGet(){return(await chrome.storage.local.get(STORE.legacyQueue))[STORE.legacyQueue]||[];}
async function legacySet(queue){await chrome.storage.local.set({[STORE.legacyQueue]:queue});}
async function migrateLegacy(){const db=idbQueue();if(!db)return;const legacy=await legacyGet();if(!legacy.length){await chrome.storage.local.set({[STORE.queueMode]:db.kind});return;}for(const box of legacy){try{const item=await decryptJson(box);if(item?.id)await db.add(item.id,box);}catch{}}await legacySet([]);await chrome.storage.local.set({[STORE.queueMode]:db.kind});}
async function queueCount(){const db=idbQueue();return db?db.count():(await legacyGet()).length;}
async function queueIds(){const db=idbQueue();if(db)return db.ids();const ids=[];for(const box of await legacyGet()){try{const item=await decryptJson(box);if(item?.id)ids.push(item.id);}catch{}}return ids;}
async function queueAdd(recordId,box){const db=idbQueue();try{if(db){await db.add(recordId,box);return;}const queue=await legacyGet();queue.push(box);await legacySet(queue);}catch(error){const count=await queueCount().catch(()=>-1);const message=`Encrypted queue persistence failed (${count} records): ${error?.message||String(error)}`;try{await chrome.storage.local.set({[STORE.lastError]:message});}catch{}throw new Error(message);}}
async function queueBatch(limit=MAX_BATCH){const db=idbQueue();if(db)return db.list(limit);const queue=await legacyGet();return queue.slice(0,limit).map((box,seq)=>({recordId:undefined,box,seq}));}
async function queueAck(ids){const accepted=new Set(ids||[]);const db=idbQueue();if(db)return db.remove([...accepted]);const queue=await legacyGet();const kept=[];for(const box of queue){try{const item=await decryptJson(box);if(!accepted.has(item.id))kept.push(box);}catch{kept.push(box);}}await legacySet(kept);return queue.length-kept.length;}
async function clearQueue(){const db=idbQueue();const removed=db&&db.clear?await db.clear():(await legacyGet()).length;await legacySet([]);knownIds.clear();await chrome.storage.local.set({[STORE.lastError]:""});return{ok:true,removed,count:0};}

async function unlock(passphrase){
  if(!passphrase)throw new Error("Passphrase required");
  const mode=await vaultMode();
  if(mode!=="passphrase")throw new Error("This installation uses automatic device-local encryption; no passphrase is required.");
  const stored=await chrome.storage.local.get([STORE.salt,STORE.sentinel]);
  const salt=stored[STORE.salt]?unb64(stored[STORE.salt]):crypto.getRandomValues(new Uint8Array(16));
  const raw=await deriveRaw(passphrase,salt);
  vaultKey=await importRawKey(raw);
  try{
    if(stored[STORE.sentinel]){const value=await decryptJson(stored[STORE.sentinel]);if(value?.kind!=="brain2-vault")throw new Error("Invalid vault sentinel");}
    else{const sentinel=await encryptJson({kind:"brain2-vault",createdAt:new Date().toISOString()});await chrome.storage.local.set({[STORE.salt]:b64(salt),[STORE.sentinel]:sentinel,[STORE.vaultMode]:"passphrase"});}
  }catch{vaultKey=null;throw new Error("Incorrect passphrase");}
  await chrome.storage.session.set({[SESSION.rawKey]:b64(raw)});
  await migrateLegacy();knownIds=new Set(await queueIds());unlockedAt=Date.now();return true;
}
async function lock(){vaultKey=null;unlockedAt=0;knownIds=new Set();try{await chrome.storage.session.remove(SESSION.rawKey);}catch{}}
async function initializeVault(){
  await ensureInstallId();
  const ready=await ensureVaultReady();
  if(ready){await migrateLegacy();knownIds=new Set(await queueIds());}
  return ready;
}
async function pulseOrigin(){const{[STORE.origin]:origin}=await chrome.storage.local.get(STORE.origin);if(!origin)return;const tabs=await chrome.tabs.query({url:`${origin}/*`});for(const tab of tabs)if(tab.id)chrome.tabs.sendMessage(tab.id,{type:"BRAIN2_BRIDGE_PULSE"}).catch(()=>{});}
async function queueCapture(record){
  if(!(await ensureVaultReady()))return{ok:false,locked:true,error:"Capture vault is locked."};
  if(!knownIds.size)knownIds=new Set(await queueIds());
  if(knownIds.has(record.id))return{ok:true,duplicate:true,count:await queueCount()};
  const installId=await ensureInstallId();
  const box=await encryptJson({...record,captureConnectorId:installId,queuedAt:new Date().toISOString()});
  await queueAdd(record.id,box);knownIds.add(record.id);const count=await queueCount();void pulseOrigin();
  return{ok:true,count,warning:count>=QUEUE_WARNING?"QUEUE_HIGH_WATERMARK":undefined,queueMode:idbQueue()?.kind||"legacy-local-v5"};
}
async function getBatch(){if(!(await ensureVaultReady()))return{ok:false,locked:true,records:[]};const entries=await queueBatch(MAX_BATCH);const records=[];for(const entry of entries){try{records.push(await decryptJson(entry.box));}catch{}}const count=await queueCount();return{ok:true,records,queueCount:count,hasMore:count>MAX_BATCH,queueMode:idbQueue()?.kind||"legacy-local-v5"};}
async function acknowledge(ids){if(!(await ensureVaultReady()))return{ok:false,locked:true};const accepted=[...new Set(ids||[])];await queueAck(accepted);for(const id of accepted)knownIds.delete(id);const count=await queueCount();if(accepted.length)await chrome.storage.local.set({[STORE.lastDeliveredAt]:new Date().toISOString()});return{ok:true,count};}
async function configureOrigin(origin,tabId){const url=new URL(origin);if(!/^https?:$/.test(url.protocol))throw new Error("AI Miner origin must be http(s)");const normalized=url.origin;const match=`${url.origin}/*`;try{await chrome.scripting.unregisterContentScripts({ids:["brain2-web-bridge"]});}catch{}await chrome.scripting.registerContentScripts([{id:"brain2-web-bridge",matches:[match],js:["bridge.js"],runAt:"document_idle",persistAcrossSessions:true}]);await chrome.storage.local.set({[STORE.origin]:normalized});await chrome.storage.local.remove([STORE.lastWebsiteSeenAt,STORE.lastError]);if(tabId){let signaled=false;try{await chrome.tabs.sendMessage(tabId,{type:"BRAIN2_BRIDGE_RECONNECT"});signaled=true;}catch{}if(!signaled){try{await chrome.scripting.executeScript({target:{tabId},files:["bridge.js"]});}catch{}try{await chrome.tabs.sendMessage(tabId,{type:"BRAIN2_BRIDGE_RECONNECT"});}catch{}}}void pulseOrigin();return normalized;}
async function connectWebsite(message,sender){const stored=await chrome.storage.local.get(STORE.origin);const configured=stored[STORE.origin]||"";const tabOrigin=sender?.tab?.url?new URL(sender.tab.url).origin:"";if(!configured||tabOrigin!==configured||String(message.websiteOrigin||"")!==configured)throw new Error("Brain2 website origin is not authorized for this extension.");const installId=await ensureInstallId();const seen=new Date().toISOString();await chrome.storage.local.set({[STORE.lastWebsiteSeenAt]:seen});return{ok:true,installId,queueCount:await queueCount(),locked:!(await ensureVaultReady()),extensionVersion:manifestVersion(),capabilities:["encrypted-capture-queue","bounded-batch-ack","dedupe","provider-health","side-panel","chatgpt","claude","gemini"],lastWebsiteSeenAt:seen};}
async function websiteHeartbeat(message,sender){const stored=await chrome.storage.local.get(STORE.origin);const configured=stored[STORE.origin]||"";const tabOrigin=sender?.tab?.url?new URL(sender.tab.url).origin:"";if(!configured||tabOrigin!==configured||String(message.websiteOrigin||"")!==configured)return{ok:false};const seen=new Date().toISOString();await chrome.storage.local.set({[STORE.lastWebsiteSeenAt]:seen});return{ok:true,lastWebsiteSeenAt:seen};}
async function updateProviderHealth(health,sender){const provider=String(health?.provider||"");if(!["chatgpt","claude","gemini"].includes(provider))return{ok:false};const stored=await chrome.storage.local.get(STORE.providerHealth);const all=stored[STORE.providerHealth]||{};all[provider]={...(all[provider]||{}),...health,lastSeenAt:new Date().toISOString(),tabId:sender?.tab?.id};await chrome.storage.local.set({[STORE.providerHealth]:all});return{ok:true};}
async function disconnectWebsite(){
  const stored=await chrome.storage.local.get(STORE.origin);
  const origin=stored[STORE.origin]||"";
  try{await chrome.scripting.unregisterContentScripts({ids:["brain2-web-bridge"]});}catch{}
  if(origin){
    try{
      const tabs=await chrome.tabs.query({url:`${origin}/*`});
      for(const tab of tabs)if(tab.id)chrome.tabs.sendMessage(tab.id,{type:"BRAIN2_BRIDGE_DISCONNECT"}).catch(()=>{});
    }catch{}
    try{
      const url=new URL(origin);
      await chrome.permissions.remove({origins:[`${url.origin}/*`]});
    }catch{}
  }
  await chrome.storage.local.remove([STORE.origin,STORE.lastWebsiteSeenAt]);
  return{ok:true,origin:""};
}
async function captureLatestActive(){
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab?.id||!tab.url)throw new Error("Open ChatGPT, Claude, or Gemini in the active tab first.");
  const host=new URL(tab.url).hostname;
  if(!["chatgpt.com","claude.ai","gemini.google.com"].includes(host))throw new Error("Active tab is not ChatGPT, Claude, or Gemini.");
  try{
    const response=await chrome.tabs.sendMessage(tab.id,{type:"BRAIN2_CAPTURE_LATEST"});
    if(response)return response;
  }catch{}
  await chrome.scripting.executeScript({target:{tabId:tab.id},files:["capture.js"]});
  await new Promise(r=>setTimeout(r,250));
  return chrome.tabs.sendMessage(tab.id,{type:"BRAIN2_CAPTURE_LATEST"});
}
async function status(){const count=await queueCount();const installId=await ensureInstallId();const mode=await vaultMode();const ready=await ensureVaultReady();const stored=await chrome.storage.local.get([STORE.origin,STORE.lastError,STORE.queueMode,STORE.lastWebsiteSeenAt,STORE.lastDeliveredAt,STORE.providerHealth]);const origin=stored[STORE.origin]||"";const lastWebsiteSeenAt=stored[STORE.lastWebsiteSeenAt]||"";const heartbeatFresh=Boolean(lastWebsiteSeenAt)&&Date.now()-Date.parse(lastWebsiteSeenAt)<8000;return{ok:true,installId,extensionVersion:manifestVersion(),locked:!ready,vaultMode:mode,queueCount:count,queueWarning:count>=QUEUE_WARNING,queueMode:idbQueue()?.kind||stored[STORE.queueMode]||"legacy-local-v5",origin,configured:Boolean(origin),connected:Boolean(origin&&heartbeatFresh),connectionState:origin?(heartbeatFresh?"CONNECTED":"CONNECTING"):"DISCONNECTED",unlockedAt,lastWebsiteSeenAt,lastDeliveredAt:stored[STORE.lastDeliveredAt]||"",providerHealth:stored[STORE.providerHealth]||{},lastError:stored[STORE.lastError]||""};}
async function configureSidePanel(){try{await chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true});}catch{}}

async function injectCaptureIntoOpenProviderTabs(){
  const patterns=["https://chatgpt.com/*","https://claude.ai/*","https://gemini.google.com/*"];
  const tabs=await chrome.tabs.query({url:patterns});
  for(const tab of tabs){if(!tab.id)continue;try{await chrome.scripting.executeScript({target:{tabId:tab.id},files:["capture.js"]});}catch{}}
}

chrome.runtime.onInstalled.addListener(()=>{void initializeVault();void configureSidePanel();void injectCaptureIntoOpenProviderTabs();});
chrome.runtime.onStartup.addListener(()=>{void initializeVault();void configureSidePanel();});
chrome.alarms.create("brain2-retry",{periodInMinutes:1});
chrome.alarms.onAlarm.addListener(async({name})=>{if(name!=="brain2-retry")return;if(await ensureVaultReady())void pulseOrigin();});

chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  (async()=>{
    switch(message?.type){
      case"BRAIN2_UNLOCK":return{ok:await unlock(String(message.passphrase||""))};
      case"BRAIN2_LOCK":await lock();return{ok:true};
      case"BRAIN2_CAPTURE":return queueCapture(message.record);
      case"BRAIN2_GET_BATCH":return getBatch();
      case"BRAIN2_ACK":return acknowledge(message.acceptedIds);
      case"BRAIN2_CONFIG_ORIGIN":return{ok:true,origin:await configureOrigin(String(message.origin||""),Number(message.tabId)||undefined)};
      case"BRAIN2_DISCONNECT_WEBSITE":return disconnectWebsite();
      case"BRAIN2_CAPTURE_LATEST_ACTIVE":return captureLatestActive();
      case"BRAIN2_CONNECT_WEBSITE":return connectWebsite(message,sender);
      case"BRAIN2_WEBSITE_HEARTBEAT":return websiteHeartbeat(message,sender);
      case"BRAIN2_PROVIDER_HEALTH":return updateProviderHealth(message.health,sender);
      case"BRAIN2_FLUSH":void pulseOrigin();return{ok:true,count:await queueCount()};
      case"BRAIN2_CLEAR_QUEUE":return clearQueue();
      case"BRAIN2_STATUS":return status();
      default:return{ok:false,error:"Unknown message"};
    }
  })().then(sendResponse).catch(async(error)=>{const msg=error?.message||String(error);try{await chrome.storage.local.set({[STORE.lastError]:msg});}catch{}sendResponse({ok:false,error:msg});});
  return true;
});

void initializeVault();
void configureSidePanel();
