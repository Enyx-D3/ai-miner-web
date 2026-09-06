"use strict";

const { contextBridge } = require("electron");
const { ensureCompanion, healthCheck } = require("./companionManager.cjs");

contextBridge.exposeInMainWorld("aiMinerDesktop", {
  async ensureMRSCompanion(input) {
    return ensureCompanion(input || {});
  },
  async getMRSCompanionHealth() {
    const result = await healthCheck();
    return {
      ok: result.ok,
      detail: result.detail,
      body: result.body,
    };
  },
});
