import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";
const root=process.cwd(),dist=join(root,".v8-qr-test-dist");rmSync(dist,{recursive:true,force:true});mkdirSync(dist,{recursive:true});
execFileSync(process.platform==="win32"?"tsc.cmd":"tsc",["src/lib/brain2/qrCode.ts","--target","ES2022","--module","NodeNext","--moduleResolution","NodeNext","--skipLibCheck","--outDir",dist,"--pretty","false"],{stdio:"inherit"});
const {makeQrMatrix}=await import(pathToFileURL(join(dist,"qrCode.js")));
const value="https://brain2.example/devices?pair=pair_abcdefghijklmnopqrstuvwxyz123456&peer=dev_a&expires=2026-08-21T03%3A00%3A00Z";
const a=makeQrMatrix(value),b=makeQrMatrix(value);if(a.size<21||a.size!==a.modules.length||a.modules.some(r=>r.length!==a.size))throw new Error("QR matrix shape invalid");if(JSON.stringify(a)!==JSON.stringify(b))throw new Error("QR matrix is not deterministic");
const finder=(cx,cy)=>a.modules[cy][cx]&&a.modules[cy-3][cx-3]&&a.modules[cy+3][cx+3]&&!a.modules[cy-2][cx-2];if(!finder(3,3)||!finder(a.size-4,3)||!finder(3,a.size-4))throw new Error("QR finder patterns missing");
// G11.4 regression: real LAN pairing URLs cross into QR version 7+.
const longValue="http://192.168.1.103:3000/devices?pair=ABCDEFGHIJKLMNOPQRSTUVWXYZ123456&peer=dev_02eb12e451fcae2f60b7a630&expires=2026-09-08T14%3A31%3A36.258Z&v=2&signal=http%3A%2F%2F192.168.1.103%3A3000";
const q=makeQrMatrix(longValue);
if(q.size<45)throw new Error(`G11.4 fixture did not exercise QR version 7+: size=${q.size}`);
const alignment=(matrix,cx,cy)=>{
  const m=matrix.modules;
  if(!m[cy]?.[cx])return false;
  for(let d=-2;d<=2;d++){
    if(!m[cy-2]?.[cx+d]||!m[cy+2]?.[cx+d]||!m[cy+d]?.[cx-2]||!m[cy+d]?.[cx+2])return false;
  }
  return !m[cy-1]?.[cx]&&!m[cy+1]?.[cx]&&!m[cy]?.[cx-1]&&!m[cy]?.[cx+1];
};
const version=(q.size-17)/4;
const positions=version===7?[6,22,38]:version===8?[6,24,42]:version===9?[6,26,46]:version===10?[6,28,50]:[];
if(positions.length<3)throw new Error(`Unsupported G11.4 version fixture: ${version}`);
if(!alignment(q,6,positions[1])||!alignment(q,positions[1],6))throw new Error("QR version 7+ timing-axis alignment patterns missing");
console.log(`V8 QR smoke PASS: base ${a.size}x${a.size}; G11.4 long pairing QR v${version} ${q.size}x${q.size} has required timing-axis alignment patterns.`);
rmSync(dist,{recursive:true,force:true});
