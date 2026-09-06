"use strict";

const fs = require("fs");
const path = require("path");

function firstExisting(paths) {
  return paths.find((candidate) => candidate && fs.existsSync(candidate));
}

function repoRoot() {
  return path.resolve(__dirname, "..", "..");
}

function resourcesRoot() {
  return process.resourcesPath || "";
}

function packagedNodeModulesPath() {
  return firstExisting([
    path.resolve(resourcesRoot(), "app.asar", "node_modules"),
    path.resolve(resourcesRoot(), "app.asar.unpacked", "node_modules"),
    path.resolve(repoRoot(), "node_modules"),
  ]);
}

function standaloneServerEntryPath() {
  const explicit = process.env.AI_MINER_STANDALONE_SERVER_PATH;
  if (explicit && fs.existsSync(explicit)) return explicit;
  return firstExisting([
    path.resolve(repoRoot(), ".next", "standalone", "server.js"),
    path.resolve(resourcesRoot(), "app.asar.unpacked", ".next", "standalone", "server.js"),
    path.resolve(resourcesRoot(), ".next", "standalone", "server.js"),
  ]);
}

function daemonEntryPath() {
  const explicit = process.env.AI_MINER_MRS_DAEMON_PATH;
  if (explicit && fs.existsSync(explicit)) return explicit;
  return firstExisting([
    path.resolve(repoRoot(), "scripts", "brain2-mrs-daemon.mjs"),
    path.resolve(resourcesRoot(), "app.asar.unpacked", "scripts", "brain2-mrs-daemon.mjs"),
    path.resolve(resourcesRoot(), "scripts", "brain2-mrs-daemon.mjs"),
  ]);
}

module.exports = {
  daemonEntryPath,
  packagedNodeModulesPath,
  repoRoot,
  standaloneServerEntryPath,
};
