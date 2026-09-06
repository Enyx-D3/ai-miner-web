import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const standaloneDir = path.resolve(root, ".next", "standalone");
const staticDir = path.resolve(root, ".next", "static");
const publicDir = path.resolve(root, "public");

function assertExists(target, label) {
  if (!fs.existsSync(target)) {
    throw new Error(`${label} is missing: ${target}`);
  }
}

assertExists(standaloneDir, "Next standalone output");
assertExists(staticDir, "Next static output");

const nestedPublicDir = path.resolve(standaloneDir, "public");
const nestedStaticDir = path.resolve(standaloneDir, ".next", "static");

fs.mkdirSync(path.dirname(nestedStaticDir), { recursive: true });

if (fs.existsSync(publicDir) && !fs.existsSync(nestedPublicDir)) {
  fs.cpSync(publicDir, nestedPublicDir, { recursive: true });
}

if (!fs.existsSync(nestedStaticDir)) {
  fs.cpSync(staticDir, nestedStaticDir, { recursive: true });
}

process.stdout.write("Prepared standalone assets for desktop packaging.\n");
