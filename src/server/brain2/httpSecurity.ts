export const BRAIN2_SYNC_DEVICE_BODY_MAX = 16 * 1024;
export const BRAIN2_SYNC_PAIRING_BODY_MAX = 8 * 1024;
export const BRAIN2_SYNC_SIGNAL_BODY_MAX = 96 * 1024;

export async function readBrain2BoundedJson<T = Record<string, unknown>>(
  request: Request,
  maxBytes: number,
): Promise<T> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new Error("Invalid Brain2 request-body limit.");
  }

  const contentType = (request.headers.get("content-type") ?? "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (contentType && contentType !== "application/json") {
    throw new Error("Brain2 API requires application/json.");
  }

  const declared = request.headers.get("content-length");
  if (declared) {
    const size = Number(declared);
    if (!Number.isSafeInteger(size) || size < 0 || size > maxBytes) {
      throw new Error(`Brain2 API request body exceeds ${maxBytes} bytes.`);
    }
  }

  if (!request.body) return {} as T;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        try { await reader.cancel(); } catch {}
        throw new Error(`Brain2 API request body exceeds ${maxBytes} bytes.`);
      }
      chunks.push(value);
    }
  } finally {
    try { reader.releaseLock(); } catch {}
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const raw = new TextDecoder("utf-8", { fatal: true }).decode(merged);
  if (!raw.trim()) return {} as T;
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Brain2 API JSON body must be an object.");
  }
  return parsed as T;
}
