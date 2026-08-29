import fs from 'node:fs';
const src=fs.readFileSync(new URL('../src/lib/brain2/transformersRuntime.ts',import.meta.url),'utf8');
const need=[
  'BRAIN2_WASM_INPUT_TOKEN_BUDGET = 1024',
  'BRAIN2_WASM_EMERGENCY_TOKEN_BUDGET = 512',
  'BRAIN2_WASM_MAX_NEW_TOKENS = 192',
  'clipTextToEstimatedTokens',
  'boundMessages',
  'isMemoryPressureError',
  'std::bad_alloc',
  'MRS_MEMORY_PRESSURE',
  'input.candidates.slice(0,8)',
  'clipTextToEstimatedTokens(input.context,700)',
];
for(const x of need)if(!src.includes(x))throw new Error(`Missing MRS WASM memory guard: ${x}`);
if(src.includes('input.candidates.slice(0,40)'))throw new Error('40-candidate MRS batch restored; unsafe for WASM.');
if(/max_new_tokens:\s*Math\.min\([^\n]*1600/.test(src))throw new Error('Legacy 1600-token generation cap restored.');
console.log('V9.0.12 MRS WASM memory-safety acceptance PASS');
console.log('- primary input budget: 1024 estimated tokens');
console.log('- emergency OOM retry: 512 estimated tokens');
console.log('- max generation: 192 tokens');
console.log('- intelligence review batch: 8 compact candidates');
console.log('- hard residual context is bounded before inference');
