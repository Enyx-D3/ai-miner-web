export const BRAIN2_SYNC_PHYSICAL_MESSAGE_MAX_BYTES = 16 * 1024;
export const BRAIN2_SYNC_FRAME_PAYLOAD_MAX_BYTES = 8 * 1024;
export const BRAIN2_SYNC_REASSEMBLED_MAX_BYTES = 64 * 1024 * 1024;
export const BRAIN2_SYNC_FRAME_MAX_COUNT =
  BRAIN2_SYNC_REASSEMBLED_MAX_BYTES / BRAIN2_SYNC_FRAME_PAYLOAD_MAX_BYTES;
export const BRAIN2_SYNC_FRAME_ID_MAX_CHARS = 192;
export const BRAIN2_SYNC_FRAME_MAX_ASSEMBLIES = 16;
export const BRAIN2_SYNC_FRAME_TTL_MS = 30_000;
export const BRAIN2_SYNC_SIGNAL_REPLAY_WINDOW = 2048;
export const BRAIN2_SYNC_MUTATION_BATCH_MAX = 128;

const WIRE_MESSAGE_TYPES = new Set([
  "hello",
  "sync_request",
  "mutations",
  "ack",
  "bootstrap_request",
  "bootstrap_chunk",
  "bootstrap_ack",
  "bootstrap_complete",
  "merge_request",
  "merge_accept",
  "merge_ready",
  "merge_seed_chunk",
  "merge_seed_complete",
  "merge_return_chunk",
  "merge_return_complete",
  "merge_complete",
  "ping",
]);

export function brain2Utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function assertBrain2PhysicalMessageSize(raw: string): void {
  if (brain2Utf8Bytes(raw) > BRAIN2_SYNC_PHYSICAL_MESSAGE_MAX_BYTES) {
    throw new Error("Brain2 physical P2P message exceeded the 16 KiB transport limit.");
  }
}

export function assertBrain2WireObject(
  value: unknown,
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Brain2 P2P message is not an object.");
  }
}

export function assertBrain2WireMessageType(type: unknown): void {
  if (typeof type !== "string" || !WIRE_MESSAGE_TYPES.has(type)) {
    throw new Error(`Unsupported Brain2 P2P message type: ${String(type)}`);
  }
}

export function assertBrain2FrameMetadata(frame: Record<string, unknown>): void {
  const id = frame.id;
  const index = Number(frame.index);
  const total = Number(frame.total);
  if (
    typeof id !== "string" ||
    id.length < 1 ||
    id.length > BRAIN2_SYNC_FRAME_ID_MAX_CHARS ||
    !Number.isSafeInteger(index) ||
    !Number.isSafeInteger(total) ||
    total < 1 ||
    total > BRAIN2_SYNC_FRAME_MAX_COUNT ||
    index < 0 ||
    index >= total ||
    typeof frame.data !== "string"
  ) {
    throw new Error("Invalid Brain2 transport frame.");
  }
}

export function assertBrain2DecodedFrameBytes(bytes: number): void {
  if (
    !Number.isSafeInteger(bytes) ||
    bytes < 0 ||
    bytes > BRAIN2_SYNC_FRAME_PAYLOAD_MAX_BYTES
  ) {
    throw new Error("Brain2 transport frame payload exceeded the 8 KiB limit.");
  }
}

export function brain2SequenceRangeMatches(
  sequences: number[],
  fromSequence: number,
  toSequence: number,
): boolean {
  if (
    !sequences.length ||
    sequences.length > BRAIN2_SYNC_MUTATION_BATCH_MAX ||
    !Number.isSafeInteger(fromSequence) ||
    !Number.isSafeInteger(toSequence) ||
    fromSequence < 1 ||
    toSequence < fromSequence
  ) return false;
  if (sequences[0] !== fromSequence || sequences.at(-1) !== toSequence) return false;
  for (let index = 0; index < sequences.length; index += 1) {
    if (!Number.isSafeInteger(sequences[index]) || sequences[index] < 1) return false;
    if (index > 0 && sequences[index] !== sequences[index - 1] + 1) return false;
  }
  return true;
}

export function brain2AckMatchesPending(input: {
  awaiting: boolean;
  pendingManifestHash: string;
  pendingToSequence: number;
  ackManifestHash?: string;
  ackSequence: number;
  ackOriginDeviceId?: string;
  localDeviceId: string;
}): boolean {
  if (!input.awaiting) return false;
  if (!input.pendingManifestHash) return false;
  if (input.ackManifestHash !== input.pendingManifestHash) return false;
  if (input.ackSequence !== input.pendingToSequence) return false;
  if (
    input.ackOriginDeviceId &&
    input.ackOriginDeviceId !== input.localDeviceId
  ) return false;
  return true;
}

export class Brain2ReplayWindow {
  private readonly seen = new Set<string>();
  constructor(private readonly limit = BRAIN2_SYNC_SIGNAL_REPLAY_WINDOW) {}

  accept(id: string): boolean {
    if (!id) return true;
    if (this.seen.has(id)) return false;
    this.seen.add(id);
    while (this.seen.size > this.limit) {
      const oldest = this.seen.values().next().value as string | undefined;
      if (!oldest) break;
      this.seen.delete(oldest);
    }
    return true;
  }

  clear(): void {
    this.seen.clear();
  }
}
