"use strict";

const path = require("path");
const { app, BrowserWindow } = require("electron");
const { ensurePackagedAppServer, stopAppServer } = require("./appServer.cjs");
const { ensureCompanion, stopCompanion } = require("./companionManager.cjs");

async function resolveAppUrl() {
  const explicitUrl = process.env.AI_MINER_DESKTOP_APP_URL;
  if (explicitUrl) return explicitUrl;
  return ensurePackagedAppServer({});
}

function createWindow(appUrl) {
  const win = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 760,
    show: false,
    backgroundColor: "#0b1020",
    webPreferences: {
      contextIsolation: true,
      preload: path.resolve(__dirname, "preload.cjs"),
    },
  });

  win.once("ready-to-show", () => win.show());
  win.loadURL(appUrl);
  return win;
}

app.whenReady().then(async () => {
  const appUrl = await resolveAppUrl();
  await ensureCompanion({});
  createWindow(appUrl);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(appUrl);
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  stopAppServer();
  stopCompanion();
});
