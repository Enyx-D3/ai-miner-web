import { BRAIN2_IDENTITY_VERSION } from "./contracts";

const encoder = new TextEncoder();

function rightRotate(value: number, amount: number) {
  return (value >>> amount) | (value << (32 - amount));
}

function sha256Fallback(value: string): string {
  const bytes = encoder.encode(value);
  const bitLength = bytes.length * 8;
  const paddedLength = (((bytes.length + 9 + 63) >> 6) << 6);
  const buffer = new Uint8Array(paddedLength);
  buffer.set(bytes);
  buffer[bytes.length] = 0x80;
  const view = new DataView(buffer.buffer);
  view.setUint32(buffer.length - 4, bitLength >>> 0, false);
  view.setUint32(buffer.length - 8, Math.floor(bitLength / 0x100000000), false);

  const initial = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const round = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const words = new Uint32Array(64);

  for (let offset = 0; offset < buffer.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) words[i] = view.getUint32(offset + (i * 4), false);
    for (let i = 16; i < 64; i += 1) {
      const s0 = rightRotate(words[i - 15], 7) ^ rightRotate(words[i - 15], 18) ^ (words[i - 15] >>> 3);
      const s1 = rightRotate(words[i - 2], 17) ^ rightRotate(words[i - 2], 19) ^ (words[i - 2] >>> 10);
      words[i] = (((words[i - 16] + s0) >>> 0) + ((words[i - 7] + s1) >>> 0)) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = initial;
    for (let i = 0; i < 64; i += 1) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (((((h + s1) >>> 0) + ch) >>> 0) + ((round[i] + words[i]) >>> 0)) >>> 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    initial[0] = (initial[0] + a) >>> 0;
    initial[1] = (initial[1] + b) >>> 0;
    initial[2] = (initial[2] + c) >>> 0;
    initial[3] = (initial[3] + d) >>> 0;
    initial[4] = (initial[4] + e) >>> 0;
    initial[5] = (initial[5] + f) >>> 0;
    initial[6] = (initial[6] + g) >>> 0;
    initial[7] = (initial[7] + h) >>> 0;
  }

  return [...initial].map((part) => part.toString(16).padStart(8, "0")).join("");
}

export function normalizeText(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

export function normalizeIdentityPart(value: string | number | undefined | null): string {
  return normalizeText(String(value ?? "")).toLocaleLowerCase("en-US");
}

export async function sha256(value: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle && typeof crypto.subtle.digest === "function") {
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return sha256Fallback(value);
}

export async function canonicalId(prefix: string, ...parts: Array<string | number | undefined | null>): Promise<string> {
  const stable = [BRAIN2_IDENTITY_VERSION, ...parts].map(normalizeIdentityPart).join("\u241f");
  return `${prefix}_${(await sha256(stable)).slice(0, 24)}`;
}

export async function canonicalMessageId(input: {
  provider: string;
  conversationId: string;
  providerMessageId?: string;
  providerNodeId?: string;
  parentProviderNodeId?: string;
  branchId?: string;
  sequence?: number;
  role: string;
  text: string;
}): Promise<string> {
  const nativeIdentity = normalizeIdentityPart(input.providerMessageId || input.providerNodeId);
  if (nativeIdentity) {
    return canonicalId("msg", input.provider, input.conversationId, "native", nativeIdentity);
  }
  // Sequence + parent/branch identity prevents repeated identical turns from collapsing.
  return canonicalId(
    "msg",
    input.provider,
    input.conversationId,
    "structural",
    input.branchId,
    input.parentProviderNodeId,
    input.sequence ?? -1,
    input.role,
    normalizeText(input.text),
  );
}

export function slugify(value: string): string {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72) || "untitled";
}

export function words(value: string): string[] {
  return normalizeText(value).toLowerCase().match(/[a-z0-9][a-z0-9'-]{2,}/g) ?? [];
}

const stopWords = new Set(["the","and","for","with","that","this","from","have","will","your","you","are","was","were","into","about","what","when","where","which","would","could","should","can","just","not","but","our","out","all","has","had","then","than","use","using","its","it's","they","them","their","there","here","how","why","who","one","two","new","now","chat","conversation","assistant","user"]);

export function keywords(value: string, limit = 10): string[] {
  const counts = new Map<string, number>();
  for (const word of words(value)) {
    if (stopWords.has(word) || word.length < 4) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([word]) => word);
}

export function indexTerms(value: string, limit = 96): string[] {
  const seen = new Set<string>();
  for (const word of words(value)) {
    if (word.length >= 3) seen.add(word);
    if (seen.size >= limit) break;
  }
  return [...seen];
}

export function wordCount(value: string): number {
  const normalized = normalizeText(value);
  return normalized ? normalized.split(" ").length : 0;
}

export function tokenOverlap(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const aa = new Set(a);
  const bb = new Set(b);
  let overlap = 0;
  for (const value of aa) if (bb.has(value)) overlap += 1;
  return overlap / Math.max(aa.size, bb.size);
}

export function jaccard(a: string[], b: string[]): number {
  const aa = new Set(a);
  const bb = new Set(b);
  if (!aa.size || !bb.size) return 0;
  let intersection = 0;
  for (const value of aa) if (bb.has(value)) intersection += 1;
  return intersection / (aa.size + bb.size - intersection);
}
