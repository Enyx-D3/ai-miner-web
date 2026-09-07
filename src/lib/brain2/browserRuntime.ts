"use client";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const DEFAULT_WASM_URL = "/brain2-runtime/core.wasm";

export type Brain2BrowserRuntimeCapabilities = {
  wasm: boolean;
  indexedDB: boolean;
  opfs: boolean;
  worker: boolean;
  webgpu: boolean;
  llm: false;
};

export type Brain2BrowserRuntimeStatus = {
  version: "1.0.0";
  events: number;
  capabilities: Brain2BrowserRuntimeCapabilities;
};

export type Brain2RuntimeSearchItem = {
  id: string;
  text: string;
  kind?: string;
  [key: string]: unknown;
};

type RuntimeEvent = { t: number; type: string; data: Record<string, unknown> };
type RuntimeState = { events: RuntimeEvent[]; version: 1 };

function bytesToBase64(bytes: Uint8Array) {
  let value = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    value += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(value);
}

function base64ToBytes(value: string) {
  const raw = atob(value);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

class WasmCore {
  private mem: Uint8Array;
  private baseA = 65536;
  private baseB = 1048576;
  private baseOut = 2097152;

  private constructor(private exports: WebAssembly.Exports) {
    const memory = exports.memory;
    if (!(memory instanceof WebAssembly.Memory)) throw new Error("Brain2 Runtime WASM memory export is missing.");
    this.mem = new Uint8Array(memory.buffer);
  }

  static async load(url = DEFAULT_WASM_URL) {
    const bytes = await fetch(url).then((response) => {
      if (!response.ok) throw new Error(`Brain2 Runtime WASM load failed: ${response.status}`);
      return response.arrayBuffer();
    });
    const { instance } = await WebAssembly.instantiate(bytes, {});
    return new WasmCore(instance.exports);
  }

  private fn(name: string) {
    const value = this.exports[name];
    if (typeof value !== "function") throw new Error(`Brain2 Runtime WASM export ${name} is missing.`);
    return value as (...args: number[]) => number;
  }

  private write(offset: number, bytes: Uint8Array): [number, number] {
    if (offset + bytes.length > this.mem.length) throw new Error("Brain2 Runtime WASM input exceeds memory.");
    this.mem.set(bytes, offset);
    return [offset, bytes.length];
  }

  hashBytes(bytes: Uint8Array) {
    const [ptr, len] = this.write(this.baseA, bytes);
    return this.fn("b2_hash")(ptr, len) >>> 0;
  }

  hashText(text: string) {
    return this.hashBytes(encoder.encode(text));
  }

  deltaText(a: string, b: string) {
    const left = encoder.encode(a);
    const right = encoder.encode(b);
    const [leftPtr, leftLen] = this.write(this.baseA, left);
    const [rightPtr, rightLen] = this.write(this.baseB, right);
    return this.fn("b2_delta_count")(leftPtr, leftLen, rightPtr, rightLen) >>> 0;
  }

  findText(haystack: string, needle: string) {
    const haystackBytes = encoder.encode(haystack);
    const needleBytes = encoder.encode(needle);
    const [haystackPtr, haystackLen] = this.write(this.baseA, haystackBytes);
    const [needlePtr, needleLen] = this.write(this.baseB, needleBytes);
    return this.fn("b2_find")(haystackPtr, haystackLen, needlePtr, needleLen);
  }

  compress(bytes: Uint8Array) {
    const [ptr, len] = this.write(this.baseA, bytes);
    const cap = Math.min(this.mem.length - this.baseOut, Math.max(2, len * 2 + 16));
    const outLen = this.fn("b2_rle_compress")(ptr, len, this.baseOut, cap) >>> 0;
    if (outLen === 0xffffffff) throw new Error("Brain2 Runtime WASM compression buffer overflow.");
    return this.mem.slice(this.baseOut, this.baseOut + outLen);
  }

  decompress(bytes: Uint8Array, expectedMax = 65536) {
    const [ptr, len] = this.write(this.baseA, bytes);
    const cap = Math.min(this.mem.length - this.baseOut, expectedMax);
    const outLen = this.fn("b2_rle_decompress")(ptr, len, this.baseOut, cap) >>> 0;
    if (outLen === 0xffffffff) throw new Error("Brain2 Runtime WASM decompression buffer overflow.");
    return this.mem.slice(this.baseOut, this.baseOut + outLen);
  }
}

class WorkerClient {
  private worker: Worker;
  private nextId = 1;
  private pending = new Map<number, { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }>();

  constructor() {
    this.worker = new Worker(new URL("../../workers/brain2BrowserRuntime.worker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = ({ data }: MessageEvent<{ id: number; ok: boolean; result?: unknown; error?: string }>) => {
      const pending = this.pending.get(data.id);
      if (!pending) return;
      this.pending.delete(data.id);
      if (data.ok) pending.resolve(data.result);
      else pending.reject(new Error(data.error ?? "Brain2 Runtime worker failed."));
    };
    this.worker.onerror = (event) => {
      const error = event.error instanceof Error ? event.error : new Error(event.message);
      for (const pending of this.pending.values()) pending.reject(error);
      this.pending.clear();
    };
  }

  call<T>(op: string, payload: unknown) {
    return new Promise<T>((resolve, reject) => {
      const id = this.nextId;
      this.nextId += 1;
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
      this.worker.postMessage({ id, op, payload });
    });
  }
}

export class Brain2BrowserRuntime {
  private core?: WasmCore;
  private worker?: WorkerClient;
  private state: RuntimeState = { events: [], version: 1 };
  private capabilities: Brain2BrowserRuntimeCapabilities = {
    wasm: false,
    indexedDB: false,
    opfs: false,
    worker: false,
    webgpu: false,
    llm: false,
  };

  async boot() {
    if (typeof window === "undefined") throw new Error("Brain2 Browser Runtime is only available in the browser.");
    this.core = await WasmCore.load();
    this.worker = typeof Worker !== "undefined" ? new WorkerClient() : undefined;
    this.capabilities = {
      wasm: true,
      indexedDB: typeof indexedDB !== "undefined",
      opfs: Boolean(navigator.storage?.getDirectory),
      worker: Boolean(this.worker),
      webgpu: "gpu" in navigator,
      llm: false,
    };
    await this.event("boot", { hash: this.hashText("brain2-v1") });
    return this;
  }

  private requireCore() {
    if (!this.core) throw new Error("Brain2 Browser Runtime has not booted.");
    return this.core;
  }

  private async event(type: string, data: Record<string, unknown> = {}) {
    this.state.events.push({ t: Date.now(), type, data });
    if (this.state.events.length > 200) this.state.events = this.state.events.slice(-200);
  }

  status(): Brain2BrowserRuntimeStatus {
    return { version: "1.0.0", events: this.state.events.length, capabilities: this.capabilities };
  }

  hashText(text: string) {
    return this.requireCore().hashText(text);
  }

  deltaText(a: string, b: string) {
    return this.requireCore().deltaText(a, b);
  }

  compressText(text: string) {
    const raw = encoder.encode(text);
    const packed = this.requireCore().compress(raw);
    const usePacked = packed.length < raw.length;
    return {
      format: "ASIF-BROWSER-V1" as const,
      codec: usePacked ? "rle-wasm-v1" as const : "raw" as const,
      rawBytes: raw.length,
      hash: this.requireCore().hashBytes(raw),
      payload: bytesToBase64(usePacked ? packed : raw),
    };
  }

  decompressText(envelope: ReturnType<Brain2BrowserRuntime["compressText"]>) {
    const body = base64ToBytes(envelope.payload);
    const raw = envelope.codec === "rle-wasm-v1"
      ? this.requireCore().decompress(body, Math.max(envelope.rawBytes + 1024, 65536))
      : body;
    if ((this.requireCore().hashBytes(raw) >>> 0) !== (envelope.hash >>> 0)) {
      throw new Error("Brain2 Runtime snapshot hash mismatch.");
    }
    return decoder.decode(raw);
  }

  async searchDocuments<T extends Brain2RuntimeSearchItem>(query: string, items: T[], limit = 32): Promise<T[]> {
    const q = query.trim();
    if (!q || !items.length) return items.slice(0, limit);
    const core = this.requireCore();
    const exact = items.filter((item) => core.findText(item.text, q) >= 0);
    const ranked = this.worker
      ? await this.worker.call<Array<T & { score?: number }>>("rank", { query: q, items, limit: Math.max(limit, 32) })
      : items.filter((item) => item.text.toLowerCase().includes(q.toLowerCase()));
    const merged = [...exact, ...ranked];
    const seen = new Set<string>();
    const out: T[] = [];
    for (const item of merged) {
      const key = `${item.kind ?? ""}:${item.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
      if (out.length >= limit) break;
    }
    await this.event("search", { queryHash: this.hashText(q), candidates: items.length, results: out.length });
    return out;
  }
}

let runtimePromise: Promise<Brain2BrowserRuntime> | null = null;

export async function bootBrain2BrowserRuntime() {
  if (runtimePromise) return runtimePromise;
  runtimePromise = new Brain2BrowserRuntime().boot().catch((error) => {
    runtimePromise = null;
    throw error;
  });
  return runtimePromise;
}

export async function getBrain2BrowserRuntimeIfAvailable() {
  if (typeof window === "undefined") return null;
  try {
    return await bootBrain2BrowserRuntime();
  } catch {
    return null;
  }
}
