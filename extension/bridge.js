(() => {
  if (globalThis.__brain2WebsiteBridgeV083) return;
  globalThis.__brain2WebsiteBridgeV083 = true;
  let inFlight=false,activeBatch=null,connectorInstallId=null,connected=false;
  const bridgeNonce=crypto.randomUUID?crypto.randomUUID():`nonce_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const targetOrigin=location.origin;const extensionVersion=chrome.runtime.getManifest().version;
  function announce(){window.postMessage({type:"BRAIN2_EXTENSION_PRESENT",bridgeNonce,protocolVersion:1,extensionVersion},targetOrigin);}
  async function sendStatus(){if(!connectorInstallId)return;const s=await chrome.runtime.sendMessage({type:"BRAIN2_STATUS"});window.postMessage({type:"BRAIN2_EXTENSION_STATUS",bridgeNonce,installId:connectorInstallId,extensionVersion,queueCount:s?.queueCount||0,vaultLocked:Boolean(s?.locked)},targetOrigin);}
  async function push(){if(!connected||!connectorInstallId||inFlight||activeBatch)return;inFlight=true;try{const response=await chrome.runtime.sendMessage({type:"BRAIN2_GET_BATCH"});if(!response?.ok){await sendStatus();return;}if(!response.records?.length){await sendStatus();return;}activeBatch=`batch_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;window.postMessage({type:"BRAIN2_EXTENSION_BATCH",batchId:activeBatch,bridgeNonce,connectorInstallId,extensionVersion,records:response.records,queueCount:response.queueCount||response.records.length,hasMore:Boolean(response.hasMore)},targetOrigin);}finally{inFlight=false;}}
  window.addEventListener("message",async(event)=>{
    if(event.source!==window||event.origin!==targetOrigin||!event.data)return;
    if(event.data.type==="BRAIN2_WEBSITE_READY"){announce();return;}
    if(event.data.type==="BRAIN2_WEBSITE_CONNECT_REQUEST"){
      if(String(event.data.bridgeNonce||"")!==bridgeNonce)return;
      const response=await chrome.runtime.sendMessage({type:"BRAIN2_CONNECT_WEBSITE",requestId:String(event.data.requestId||""),websiteOrigin:targetOrigin,websiteInstanceId:String(event.data.websiteInstanceId||""),memoryRoot:String(event.data.memoryRoot||"")});
      if(!response?.ok)return;
      connectorInstallId=response.installId;connected=true;
      window.postMessage({type:"BRAIN2_EXTENSION_CONNECT_RESPONSE",requestId:String(event.data.requestId||""),bridgeNonce,installId:response.installId,extensionVersion,queueCount:response.queueCount||0,vaultLocked:Boolean(response.locked),capabilities:response.capabilities||[]},targetOrigin);
      setTimeout(push,100);return;
    }
    if(event.data.type==="BRAIN2_WEBSITE_CONNECT_ACK"&&String(event.data.bridgeNonce||"")===bridgeNonce&&String(event.data.installId||"")===connectorInstallId){connected=true;setTimeout(push,50);return;}
    if(event.data.type!=="BRAIN2_EXTENSION_ACK"||event.data.batchId!==activeBatch||event.data.bridgeNonce!==bridgeNonce||event.data.connectorInstallId!==connectorInstallId)return;
    const ack=await chrome.runtime.sendMessage({type:"BRAIN2_ACK",acceptedIds:Array.isArray(event.data.acceptedIds)?event.data.acceptedIds:[]});activeBatch=null;
    window.postMessage({type:"BRAIN2_EXTENSION_STATUS",bridgeNonce,installId:connectorInstallId,extensionVersion,queueCount:ack?.count||0,vaultLocked:false},targetOrigin);setTimeout(push,120);
  });
  chrome.runtime.onMessage.addListener((message)=>{if(message?.type==="BRAIN2_BRIDGE_PULSE")void push();if(message?.type==="BRAIN2_BRIDGE_RECONNECT"){connected=false;connectorInstallId=null;activeBatch=null;announce();setTimeout(announce,250);return;}if(message?.type==="BRAIN2_BRIDGE_DISCONNECT"){connected=false;connectorInstallId=null;activeBatch=null;window.postMessage({type:"BRAIN2_EXTENSION_DISCONNECTED",bridgeNonce},targetOrigin);}});
  announce();let announces=0;const timer=setInterval(()=>{announce();if(++announces>=5)clearInterval(timer);},1000);setInterval(()=>{if(connected&&connectorInstallId){chrome.runtime.sendMessage({type:"BRAIN2_WEBSITE_HEARTBEAT",installId:connectorInstallId,websiteOrigin:targetOrigin}).catch(()=>{});void sendStatus();}},2000);
})();
