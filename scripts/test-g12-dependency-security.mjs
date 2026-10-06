import { spawnSync, execFileSync } from "node:child_process";
import fs from "node:fs";

const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.dependencies?.next!=="16.3.4")throw new Error("Next.js is not pinned to 16.3.4");
if(pkg.devDependencies?.["eslint-config-next"]!=="16.3.4")throw new Error("eslint-config-next is not aligned to 16.3.4");
if(pkg.overrides?.["adm-zip"]!=="0.6.0")throw new Error("adm-zip override missing");
if(pkg.overrides?.sharp!=="0.35.4")throw new Error("sharp 0.35.4 override missing");
if(pkg.overrides?.postcss!=="8.5.28")throw new Error("postcss override missing");

function tuple(v){
  const m=String(v??"").match(/^(\d+)\.(\d+)\.(\d+)/);
  if(!m)return null;
  return m.slice(1).map(Number);
}
function cmp(a,b){
  const x=tuple(a),y=tuple(b);
  if(!x||!y)return null;
  for(let i=0;i<3;i++){
    if(x[i]>y[i])return 1;
    if(x[i]<y[i])return -1;
  }
  return 0;
}
function gte(v,min){const c=cmp(v,min);return c!==null&&c>=0;}
function gt(v,min){const c=cmp(v,min);return c!==null&&c>0;}

const raw=execFileSync(
  "npm",
  ["ls","next","adm-zip","sharp","postcss","--all","--omit=dev","--json"],
  {encoding:"utf8",stdio:["ignore","pipe","pipe"]},
);
const tree=JSON.parse(raw);
const found=new Map();

function walk(node){
  for(const [name,value] of Object.entries(node?.dependencies??{})){
    if(["next","adm-zip","sharp","postcss"].includes(name)){
      if(!found.has(name))found.set(name,[]);
      found.get(name).push(value?.version??"unknown");
    }
    walk(value);
  }
}
walk(tree);

const nextVersions=found.get("next")??[];
const zipVersions=found.get("adm-zip")??[];
const sharpVersions=found.get("sharp")??[];
const postcssVersions=found.get("postcss")??[];

if(!nextVersions.length||nextVersions.some(v=>!gte(v,"16.3.4"))){
  throw new Error(`unsafe Next.js production versions: ${nextVersions.join(", ")}`);
}
if(!zipVersions.length||zipVersions.some(v=>!gte(v,"0.6.0"))){
  throw new Error(`unsafe adm-zip production versions: ${zipVersions.join(", ")}`);
}
if(!sharpVersions.length||sharpVersions.some(v=>!gte(v,"0.35.4"))){
  throw new Error(`unsafe sharp production versions: ${sharpVersions.join(", ")}`);
}
if(postcssVersions.some(v=>!gt(v,"8.5.22"))){
  throw new Error(`unsafe postcss production versions: ${postcssVersions.join(", ")}`);
}

const grep=spawnSync(
  "git",
  ["grep","-n","-E","(from|require\\().*adm-zip","--","src","scripts","desktop"],
  {encoding:"utf8"},
);
if(grep.status===0 && grep.stdout.trim()){
  throw new Error(`Brain2 source directly imports adm-zip:\n${grep.stdout.trim()}`);
}
if(grep.status!==1){
  throw new Error(
    `git grep failed unexpectedly with status ${grep.status}: ${String(grep.stderr??"").trim()}`,
  );
}

console.log("G12.4 dependency security PASS");
console.log("  next:",[...new Set(nextVersions)].join(", "));
console.log("  adm-zip:",[...new Set(zipVersions)].join(", "));
console.log("  sharp:",[...new Set(sharpVersions)].join(", "));
console.log("  postcss:",[...new Set(postcssVersions)].join(", ")||"not in production tree");
console.log("  direct adm-zip imports: none");
