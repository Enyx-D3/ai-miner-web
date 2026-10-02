(() => {
  const adapters = {
    chatgpt: { id: "chatgpt", hosts: ["chatgpt.com"], capabilities: ["live-capture","native-message-id","generation-state"] },
    claude: { id: "claude", hosts: ["claude.ai"], capabilities: ["live-capture","native-node-id","generation-state"] },
    gemini: { id: "gemini", hosts: ["gemini.google.com"], capabilities: ["live-capture","native-node-id","generation-state"] },
  };
  function resolve(hostname) { const host=String(hostname||"").toLowerCase(); return Object.values(adapters).find(adapter=>adapter.hosts.some(item=>host===item||host.endsWith(`.${item}`))) ?? null; }
  globalThis.Brain2ProviderAdapters = Object.freeze({ version: 1, adapters: Object.freeze(adapters), resolve });
})();
