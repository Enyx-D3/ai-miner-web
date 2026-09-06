import fs from 'node:fs';
const runtime=fs.readFileSync('src/lib/brain2/transformersRuntime.ts','utf8');
const worker=fs.readFileSync('src/workers/brain2Transformers.worker.ts','utf8');
const status=fs.readFileSync('src/components/brain2/Brain2ModelStatus.tsx','utf8');
const intel=fs.readFileSync('src/lib/brain2/intelligenceLayer.ts','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const runtimeRequired=[
  "onnx-community/granite-4.0-350m-ONNX-web",
  'BRAIN2_TRANSFORMERS_WASM_DTYPE = "q4f16"',
  'preloadBrain2Transformers',
  'retryBrain2Transformers',
  'runBrain2MRSSelfTest',
  'runBrain2HardResidual',
  'reviewBrain2Intelligence',
];
const workerRequired=[
  "onnx-community/granite-4.0-350m-ONNX-web",
  "@huggingface/transformers",
  'pipeline("text-generation"',
  'device: "wasm"',
  "env.useBrowserCache = hasCache",
  "env.useWasmCache = hasCache",
  'progress_callback: progressCallback',
];
for(const x of runtimeRequired)if(!runtime.includes(x))throw new Error(`Transformers runtime missing: ${x}`);
for(const x of workerRequired)if(!worker.includes(x))throw new Error(`Transformers worker missing: ${x}`);
for(const x of ['Browser MRS Runtime','Granite Browser Runtime','MODEL','MRS','Run MRS self-test','DOWNLOADED / READY','Transformers.js'])if(!status.includes(x))throw new Error(`Status UI missing: ${x}`);
if(intel.includes('WEBGPU_UNSUPPORTED')||intel.includes('brain2WebGPUSupported')||runtime.includes("device='webgpu'")||runtime.includes("device:'webgpu'"))throw new Error('WebGPU path remains in active Brain2 model runtime.');
if(pkg.dependencies?.['@mlc-ai/web-llm'])throw new Error('WebLLM dependency still present.');
if(pkg.dependencies?.['@huggingface/transformers']!=='^4.2.0')throw new Error('Transformers.js dependency missing/wrong.');
const all=fs.readdirSync('src/lib/brain2').map(x=>fs.readFileSync(`src/lib/brain2/${x}`,'utf8')).join('\n');
if(all.includes('@mlc-ai/web-llm'))throw new Error('WebLLM import remains in Brain2 library.');
console.log('V9.0.11 Transformers.js / WASM Granite ONNX acceptance PASS');
console.log('- WebLLM dependency removed');
console.log('- Granite 4.0 350M ONNX-web selected');
console.log('- WASM-only q4f16 runtime wired; WebGPU removed');
console.log('- automatic download/progress/self-test retained');
