import fs from 'node:fs';
const runtime=fs.readFileSync('src/lib/brain2/transformersRuntime.ts','utf8');
const status=fs.readFileSync('src/components/brain2/Brain2ModelStatus.tsx','utf8');
const intel=fs.readFileSync('src/lib/brain2/intelligenceLayer.ts','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const required=[
  "onnx-community/Qwen2.5-0.5B-Instruct",
  "@huggingface/transformers",
  "pipeline('text-generation'",
  "BRAIN2_TRANSFORMERS_WASM_DTYPE = 'q8'",
  "device:'wasm'",
  "transformers.env.useBrowserCache=true",
  "transformers.env.useWasmCache=true",
  'progress_callback:progressCallback',
  'preloadBrain2Transformers',
  'retryBrain2Transformers',
  'runBrain2MRSSelfTest',
  'runBrain2HardResidual',
  'reviewBrain2Intelligence',
];
for(const x of required)if(!runtime.includes(x))throw new Error(`Transformers runtime missing: ${x}`);
for(const x of ['Brain2 AI Runtime','MODEL','MRS','Run MRS self-test','Retry model download','DOWNLOADED / READY','Transformers.js'])if(!status.includes(x))throw new Error(`Status UI missing: ${x}`);
if(intel.includes('WEBGPU_UNSUPPORTED')||intel.includes('brain2WebGPUSupported')||runtime.includes("device='webgpu'")||runtime.includes("device:'webgpu'"))throw new Error('WebGPU path remains in active Brain2 model runtime.');
if(pkg.dependencies?.['@mlc-ai/web-llm'])throw new Error('WebLLM dependency still present.');
if(pkg.dependencies?.['@huggingface/transformers']!=='^4.2.0')throw new Error('Transformers.js dependency missing/wrong.');
const all=fs.readdirSync('src/lib/brain2').map(x=>fs.readFileSync(`src/lib/brain2/${x}`,'utf8')).join('\n');
if(all.includes('@mlc-ai/web-llm'))throw new Error('WebLLM import remains in Brain2 library.');
console.log('V9.0.11 Transformers.js / WASM Qwen ONNX acceptance PASS');
console.log('- WebLLM dependency removed');
console.log('- Qwen2.5-0.5B-Instruct ONNX selected');
console.log('- WASM-only q8 runtime wired; WebGPU removed');
console.log('- automatic download/progress/self-test retained');
