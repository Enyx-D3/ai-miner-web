"use client";

declare const process: { env: Record<string, string | undefined> };

import {
  adoptMemoryRootIfEmpty,
  applyReplicatedMutations,
  applySyncBootstrapChunk,
  applySyncMergeChunk,
  currentBrain2DeviceId,
  finalizeSyncBootstrap,
  getReplicableMutationsForPeer,
  getSyncBootstrapManifest,
  getSyncPeer,
  getSyncReplicaSummary,
  markPeerAck,
  removeSyncPeer,
  streamSyncBootstrap,
  subscribeBrain2,
  updateSyncPeer,
} from "./store";
import {
  BRAIN2_SYNC_BATCH_LIMIT,
  BRAIN2_SYNC_CHANNEL,
  hashBootstrapChunk,
  hashBootstrapWireChunk,
  hashMutationManifest,
} from "./syncProtocol";
import type { MutationRecord, SyncTableName } from "./types";
import { sha256 } from "./identity";

type Signal = {
  id: string;
  fromDeviceId: string;
  toDeviceId: string;
  kind: "offer" | "answer" | "ice" | "bye";
  payload: unknown;
};

type WireMessage =
  | {
      type: "hello";
      summary: Awaited<ReturnType<typeof getSyncReplicaSummary>>;
    }
  | {
      type: "mutations";
      mutations: MutationRecord[];
      manifestHash: string;
      fromSequence: number;
      toSequence: number;
    }
  | {
      type: "ack";
      sequence: number;
      manifestHash?: string;
      originDeviceId?: string;
    }
  | { type: "bootstrap_request" }
  | {
      type: "bootstrap_begin";
      sessionId: string;
      memoryRoot: string;
      totalRecords: number;
      tableCounts: Record<string, number>;
    }
  | {
      type: "bootstrap_ack";
      ordinal: number;
      appliedRecords?: number;
      appliedBytes?: number;
    }
  | { type: "sync_request"; fromSequence?: number }
  | {
      type: "bootstrap_chunk";
      memoryRoot: string;
      table: SyncTableName | "mutations" | string;
      records?: Array<{ id: string; [key: string]: unknown }>;
      recordsJson?: string;
      hashVersion?: 3;
      ordinal: number;
      chunkHash: string;
    }
  | { type: "bootstrap_complete"; memoryRoot: string }
  | {
      type: "merge_request";
      targetRoot: string;
      localSummary: Awaited<ReturnType<typeof getSyncReplicaSummary>>;
    }
  | { type: "merge_accept"; targetRoot: string }
  | { type: "merge_ready"; targetRoot: string }
  | {
      type: "merge_seed_chunk";
      targetRoot: string;
      table: string;
      ordinal: number;
      recordsJson: string;
      chunkHash: string;
    }
  | { type: "merge_seed_complete"; targetRoot: string }
  | {
      type: "merge_return_chunk";
      targetRoot: string;
      table: string;
      ordinal: number;
      recordsJson: string;
      chunkHash: string;
    }
  | { type: "merge_return_complete"; targetRoot: string }
  | { type: "merge_complete"; targetRoot: string }
  | { type: "ping"; at: number };

const TOKEN_KEY = "brain2-p2p-device-token";
const SERVER_DEVICE_KEY = "brain2-p2p-server-device-id";
const ICE_KEY = "brain2-p2p-ice-servers";
const REQUEST_TIMEOUT_MS = 12_000;

// Keep each physical RTCDataChannel message comfortably below the smallest
// commonly negotiated SCTP max-message-size. Larger logical Brain2 messages
// are transparently fragmented and reassembled by the transport layer.
const BRAIN2_TRANSPORT_FRAME_PAYLOAD_BYTES = 8 * 1024;
const BRAIN2_TRANSPORT_MAX_REASSEMBLED_BYTES = 64 * 1024 * 1024;

type Brain2TransportFrame = {
  __brain2Frame: 1;
  id: string;
  index: number;
  total: number;
  data: string;
};

type Brain2FrameAssembly = {
  total: number;
  parts: Array<Uint8Array | undefined>;
  received: number;
  bytes: number;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1)
    binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

function iceConfig(): RTCConfiguration {
  try {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem(ICE_KEY) : "";
    if (stored) return { iceServers: JSON.parse(stored) };
  } catch {}
  try {
    const raw = process.env.NEXT_PUBLIC_BRAIN2_ICE_SERVERS_JSON;
    if (raw) return { iceServers: JSON.parse(raw) };
  } catch {}
  return { iceServers: [] };
}

function signalingBase() {
  const raw = process.env.NEXT_PUBLIC_BRAIN2_SIGNALING_URL?.trim();
  return raw ? raw.replace(/\/$/, "") : "";
}
function pairingOrigin() {
  const override = process.env.NEXT_PUBLIC_BRAIN2_PAIRING_ORIGIN?.trim();
  if (override) return override.replace(/\/$/, "");
  return typeof window !== "undefined" ? window.location.origin : "";
}
function syncUrl(path: string) {
  return `${signalingBase()}${path}`;
}
function localToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}
function serverDeviceId() {
  return localStorage.getItem(SERVER_DEVICE_KEY) || currentBrain2DeviceId();
}
function clearLocalCredential() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SERVER_DEVICE_KEY);
  localStorage.removeItem(ICE_KEY);
}
function isUnknownDeviceError(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  return /Unknown or revoked Brain2 device/i.test(msg);
}

async function api(path: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const r = await fetch(syncUrl(path), {
      ...init,
      signal: controller.signal,
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok)
      throw new Error(body.error || `Brain2 sync request failed (${r.status})`);
    return body;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Brain2 signaling server did not respond in time.");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

async function postSignal(peerDeviceId: string, kind: string, payload: unknown) {
  const token = localToken();
  if (!token) throw new Error("P2P sync is not enabled on this device.");
  return api("/api/brain2-sync/signals", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Brain2-Device-Token": token,
    },
    body: JSON.stringify({
      fromDeviceId: serverDeviceId(),
      toDeviceId: peerDeviceId,
      kind,
      payload,
    }),
  });
}

async function pullSignals() {
  const token = localToken();
  if (!token) return [];
  const body = await api(
    `/api/brain2-sync/signals?deviceId=${encodeURIComponent(serverDeviceId())}`,
    { headers: { "X-Brain2-Device-Token": token } },
  );
  return (body.signals || []) as Signal[];
}

class PeerSession {
  peerId: string;
  pc: RTCPeerConnection;
  channel: RTCDataChannel | null = null;
  closed = false;
  outboundInFlight = false;
  private pendingIce: RTCIceCandidateInit[] = [];
  private remoteDescriptionReady = false;
  private bootstrapPeerMaxSequence = 0;
  private merging = false;
  private incomingFrames = new Map<string, Brain2FrameAssembly>();
  private frameCounter = 0;
  private remoteLatestSequence = 0;
  private remoteMessageCount = 0;
  private remoteAtomCount = 0;
  private remoteTruthCount = 0;

  private bootstrapAckWaiters = new Map<
    number,
    {
      resolve: (ack: Extract<WireMessage, { type: "bootstrap_ack" }>) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  constructor(peerId: string, initiator: boolean) {
    this.peerId = peerId;
    this.pc = new RTCPeerConnection(iceConfig());
    this.pc.onicecandidate = (event) => {
      if (event.candidate)
        void postSignal(peerId, "ice", event.candidate.toJSON());
    };
    this.pc.onconnectionstatechange = () => {
      const state = this.pc.connectionState;
      if (state === "connected") {
        void updateSyncPeer(peerId, {
          status: "CONNECTED",
          lastSeenAt: new Date().toISOString(),
          transport: "WEBRTC",
        });
      }
      if (["failed", "closed", "disconnected"].includes(state)) {
        void updateSyncPeer(peerId, {
          status: state === "failed" ? "ERROR" : "DISCONNECTED",
          error: state === "failed" ? "WebRTC connection failed" : undefined,
        });
      }
    };
    this.pc.ondatachannel = (event) => this.attach(event.channel);
    if (initiator)
      this.attach(
        this.pc.createDataChannel(BRAIN2_SYNC_CHANNEL, { ordered: true }),
      );
  }

  attach(channel: RTCDataChannel) {
    this.channel = channel;
    channel.binaryType = "arraybuffer";
    channel.bufferedAmountLowThreshold = 128 * 1024;
    channel.onopen = () => void this.onOpen();
    channel.onmessage = (event) => {
      void this.onRawMessage(String(event.data)).catch((error) => {
        void updateSyncPeer(this.peerId, {
          status: "ERROR",
          error: error instanceof Error ? error.message : String(error),
        });
      });
    };
    channel.onclose = () =>
      void updateSyncPeer(this.peerId, { status: "DISCONNECTED" });
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(description);
    this.remoteDescriptionReady = true;
    const queued = this.pendingIce.splice(0);
    for (const candidate of queued) {
      try {
        await this.pc.addIceCandidate(candidate);
      } catch {}
    }
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.remoteDescriptionReady) {
      this.pendingIce.push(candidate);
      return;
    }
    await this.pc.addIceCandidate(candidate);
  }

  async waitDrain() {
    while (this.channel && this.channel.bufferedAmount > 512 * 1024) {
      const channel = this.channel;
      await new Promise<void>((resolve) => {
        const done = () => {
          channel.removeEventListener("bufferedamountlow", done);
          resolve();
        };
        channel.addEventListener("bufferedamountlow", done, { once: true });
        setTimeout(done, 250);
      });
    }
  }

  private async sendBootstrapChunkAndWait(
    message: Extract<WireMessage, { type: "bootstrap_chunk" }>,
  ): Promise<Extract<WireMessage, { type: "bootstrap_ack" }>> {
    if (this.bootstrapAckWaiters.has(message.ordinal)) {
      throw new Error(
        `Duplicate bootstrap ACK waiter for ordinal ${message.ordinal}.`,
      );
    }

    const ackPromise = new Promise<
      Extract<WireMessage, { type: "bootstrap_ack" }>
    >((resolve, reject) => {
      const timer = setTimeout(() => {
        this.bootstrapAckWaiters.delete(message.ordinal);
        reject(
          new Error(`Bootstrap ACK timeout for ordinal ${message.ordinal}.`),
        );
      }, 30_000);

      this.bootstrapAckWaiters.set(message.ordinal, {
        resolve,
        reject,
        timer,
      });
    });

    try {
      await this.send(message);
      return await ackPromise;
    } catch (error) {
      const waiter = this.bootstrapAckWaiters.get(message.ordinal);

      if (waiter) {
        clearTimeout(waiter.timer);
        this.bootstrapAckWaiters.delete(message.ordinal);
      }

      throw error;
    }
  }

  private async sendPhysicalText(text: string) {
    if (!this.channel || this.channel.readyState !== "open") {
      throw new Error("Brain2 P2P data channel is not open.");
    }
    await this.waitDrain();
    this.channel.send(text);
  }

  private async onRawMessage(raw: string) {
    const decoded = JSON.parse(raw) as WireMessage | Brain2TransportFrame;
    if ((decoded as Brain2TransportFrame).__brain2Frame === 1) {
      await this.acceptTransportFrame(decoded as Brain2TransportFrame);
      return;
    }
    await this.onMessage(decoded as WireMessage);
  }

  private async acceptTransportFrame(frame: Brain2TransportFrame) {
    if (
      !frame.id ||
      !Number.isInteger(frame.index) ||
      !Number.isInteger(frame.total)
    ) {
      throw new Error("Invalid Brain2 transport frame.");
    }
    if (
      frame.total < 1 ||
      frame.total > 16_384 ||
      frame.index < 0 ||
      frame.index >= frame.total
    ) {
      throw new Error("Brain2 transport frame bounds rejected.");
    }
    let assembly = this.incomingFrames.get(frame.id);
    if (!assembly) {
      assembly = {
        total: frame.total,
        parts: new Array(frame.total),
        received: 0,
        bytes: 0,
      };
      this.incomingFrames.set(frame.id, assembly);
    }
    if (assembly.total !== frame.total)
      throw new Error("Brain2 transport frame total changed.");
    if (assembly.parts[frame.index]) return;
    const bytes = base64ToBytes(frame.data);
    assembly.parts[frame.index] = bytes;
    assembly.received += 1;
    assembly.bytes += bytes.byteLength;
    if (assembly.bytes > BRAIN2_TRANSPORT_MAX_REASSEMBLED_BYTES) {
      this.incomingFrames.delete(frame.id);
      throw new Error("Brain2 transport message exceeded reassembly limit.");
    }
    if (assembly.received !== assembly.total) return;

    const joined = new Uint8Array(assembly.bytes);
    let offset = 0;
    for (const part of assembly.parts) {
      if (!part)
        throw new Error("Brain2 transport frame missing during reassembly.");
      joined.set(part, offset);
      offset += part.byteLength;
    }
    this.incomingFrames.delete(frame.id);
    const message = JSON.parse(new TextDecoder().decode(joined)) as WireMessage;
    await this.onMessage(message);
  }

  async send(message: WireMessage) {
    const raw = JSON.stringify(message);
    const bytes = new TextEncoder().encode(raw);
    if (bytes.byteLength <= BRAIN2_TRANSPORT_FRAME_PAYLOAD_BYTES) {
      await this.sendPhysicalText(raw);
      return;
    }

    const id = `${this.peerId}-${Date.now().toString(36)}-${(this.frameCounter++).toString(36)}`;
    const total = Math.ceil(
      bytes.byteLength / BRAIN2_TRANSPORT_FRAME_PAYLOAD_BYTES,
    );
    for (let index = 0; index < total; index += 1) {
      const start = index * BRAIN2_TRANSPORT_FRAME_PAYLOAD_BYTES;
      const end = Math.min(
        bytes.byteLength,
        start + BRAIN2_TRANSPORT_FRAME_PAYLOAD_BYTES,
      );
      const frame: Brain2TransportFrame = {
        __brain2Frame: 1,
        id,
        index,
        total,
        data: bytesToBase64(bytes.subarray(start, end)),
      };
      await this.sendPhysicalText(JSON.stringify(frame));
    }
  }

  async onOpen() {
    await updateSyncPeer(this.peerId, {
      status: "SYNCING",
      lastSeenAt: new Date().toISOString(),
      transport: "WEBRTC",
    });
    await this.reconcile();
  }

  async reconcile() {
    if (this.closed || !this.channel || this.channel.readyState !== "open")
      return;
    await this.send({ type: "hello", summary: await getSyncReplicaSummary() });
  }

  async markConvergedIfPossible() {
    const local = await getSyncReplicaSummary();
    const peer = await getSyncPeer(this.peerId);
    const inboundApplied = Number(peer?.lastAppliedPeerSequence || 0);
    const outboundAcked = Number(peer?.lastPushedSequence || 0);
    const inboundOk = inboundApplied >= this.remoteLatestSequence;
    const outboundOk = outboundAcked >= Number(local.latestLocalSequence || 0);
    const countsCompatible =
      local.totalMessages === this.remoteMessageCount &&
      local.totalAtoms === this.remoteAtomCount &&
      local.totalTruths === this.remoteTruthCount;
    await updateSyncPeer(this.peerId, {
      status:
        inboundOk && outboundOk && countsCompatible ? "SYNCED" : "SYNCING",
      syncStage:
        inboundOk && outboundOk && countsCompatible
          ? "SYNCED"
          : "VERIFYING_CONVERGENCE",
      pendingDeltas: Math.max(
        0,
        this.remoteLatestSequence - inboundApplied,
        Number(local.latestLocalSequence || 0) - outboundAcked,
      ),
      lastSeenAt: new Date().toISOString(),
      transport: "WEBRTC",
      transferDirection:
        inboundOk && outboundOk && countsCompatible ? undefined : undefined,
    });
  }

  async sendPending() {
    if (this.merging) return;
    if (
      this.closed ||
      this.outboundInFlight ||
      !this.channel ||
      this.channel.readyState !== "open"
    )
      return;
    const mutations = await getReplicableMutationsForPeer(
      this.peerId,
      BRAIN2_SYNC_BATCH_LIMIT,
    );
    if (!mutations.length) {
      await this.markConvergedIfPossible();
      return;
    }
    this.outboundInFlight = true;
    try {
      const manifestHash = await hashMutationManifest(mutations);
      await this.send({
        type: "mutations",
        mutations,
        manifestHash,
        fromSequence: mutations[0].originSequence ?? mutations[0].sequence ?? 0,
        toSequence:
          mutations.at(-1)?.originSequence ?? mutations.at(-1)?.sequence ?? 0,
      });
    } catch (error) {
      this.outboundInFlight = false;
      throw error;
    }
  }

  async onMessage(message: WireMessage) {
    if (message.type === "hello") {
      const local = await getSyncReplicaSummary();
      if (message.summary.memoryRoot !== local.memoryRoot) {
        await updateSyncPeer(this.peerId, {
          status: "CONFLICT",
          lastSeenAt: new Date().toISOString(),
          error:
            "Different Brain2 memories detected. Mobile can choose Merge both memories.",
        });
        return;
      }
      const remoteMessages = Number(message.summary.totalMessages || 0);
      const remoteLatest = Number(message.summary.latestLocalSequence || 0);
      this.remoteMessageCount = remoteMessages;
      this.remoteAtomCount = Number(message.summary.totalAtoms || 0);
      this.remoteTruthCount = Number(message.summary.totalTruths || 0);
      this.remoteLatestSequence = remoteLatest;
      const peerState = await getSyncPeer(this.peerId);
      const inboundApplied = Number(peerState?.lastAppliedPeerSequence || 0);
      await updateSyncPeer(this.peerId, {
        status: "SYNCING",
        lastSeenAt: new Date().toISOString(),
        pendingDeltas: Math.max(
          0,
          Number(message.summary.latestLocalSequence || 0),
        ),
      });
      if (local.totalMessages === 0 && remoteMessages > 0) {
        await this.send({ type: "bootstrap_request" });
      } else if (remoteMessages === 0 && local.totalMessages > 0) {
        // The empty peer will request bootstrap. Do not flood it with the complete
        // local mutation history before the bootstrap starts.
        return;
      } else {
        if (remoteLatest > inboundApplied) {
          await this.send({
            type: "sync_request",
            fromSequence: inboundApplied + 1,
          });
        }
        await this.sendPending();
      }
      return;
    }

    if (message.type === "sync_request") {
      await this.sendPending();
      return;
    }

    if (message.type === "bootstrap_ack") {
      const waiter = this.bootstrapAckWaiters.get(message.ordinal);

      if (waiter) {
        clearTimeout(waiter.timer);
        this.bootstrapAckWaiters.delete(message.ordinal);
        waiter.resolve(message);
      }

      return;
    }

    if (message.type === "bootstrap_begin") {
      await updateSyncPeer(this.peerId, {
        status: "SYNCING",
        syncStage: "BOOTSTRAPPING",
        transferDirection: "RECEIVING",
        transferAppliedRecords: 0,
        transferAppliedBytes: 0,
        transferTotalRecords: message.totalRecords,
        transferTable: Object.keys(message.tableCounts)[0],
        transport: "WEBRTC",
        error: undefined,
      });
      return;
    }

    if (message.type === "merge_request") {
      const local = await getSyncReplicaSummary();
      // Web is the pairing authority. Its root survives as the trust namespace,
      // but the data merge is a deterministic union, not a web-over-mobile copy.
      if (message.targetRoot !== local.memoryRoot) {
        throw new Error("Merge request targets a different web memory root.");
      }
      this.merging = true;
      await updateSyncPeer(this.peerId, {
        status: "SYNCING",
        error: undefined,
      });
      await this.send({ type: "merge_accept", targetRoot: local.memoryRoot });
      return;
    }

    if (message.type === "merge_ready") {
      const local = await getSyncReplicaSummary();
      if (message.targetRoot !== local.memoryRoot)
        throw new Error("Merge ready root mismatch.");
      let ordinal = 0;
      await streamSyncBootstrap(async (chunk) => {
        if (chunk.table === "mutations") return;
        const recordsJson = JSON.stringify(chunk.records);
        await this.send({
          type: "merge_seed_chunk",
          targetRoot: local.memoryRoot,
          table: chunk.table,
          ordinal: ordinal++,
          recordsJson,
          chunkHash: await sha256(recordsJson),
        });
      });
      await this.send({
        type: "merge_seed_complete",
        targetRoot: local.memoryRoot,
      });
      return;
    }

    if (message.type === "merge_return_chunk") {
      const local = await getSyncReplicaSummary();
      if (message.targetRoot !== local.memoryRoot)
        throw new Error("Merge return root mismatch.");
      if ((await sha256(message.recordsJson)) !== message.chunkHash)
        throw new Error("Brain2 merge return chunk hash mismatch.");
      const records = JSON.parse(message.recordsJson) as Array<{
        id: string;
        [key: string]: unknown;
      }>;
      await applySyncMergeChunk(local.memoryRoot, message.table, records);
      return;
    }

    if (message.type === "merge_return_complete") {
      const local = await getSyncReplicaSummary();
      if (message.targetRoot !== local.memoryRoot)
        throw new Error("Merge completion root mismatch.");
      await finalizeSyncBootstrap();
      this.merging = false;
      await updateSyncPeer(this.peerId, {
        status: "SYNCING",
        error: undefined,
      });
      await this.send({ type: "merge_complete", targetRoot: local.memoryRoot });
      await this.send({
        type: "hello",
        summary: await getSyncReplicaSummary(),
      });
      return;
    }

    if (message.type === "bootstrap_request") {
      await updateSyncPeer(this.peerId, {
        status: "SYNCING",
        syncStage: "BOOTSTRAPPING",
        transferDirection: "SENDING",
        transferAppliedRecords: 0,
        transferAppliedBytes: 0,
        transport: "WEBRTC",
      });
      const summary = await getSyncReplicaSummary();
      const manifest = await getSyncBootstrapManifest();
      let appliedRecords = 0;
      let appliedBytes = 0;
      const sessionId = `boot_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
      await this.send({
        type: "bootstrap_begin",
        sessionId,
        memoryRoot: manifest.memoryRoot,
        totalRecords: manifest.totalRecords,
        tableCounts: manifest.tableCounts,
      });
      await updateSyncPeer(this.peerId, {
        transferTotalRecords: manifest.totalRecords,
      });
      await streamSyncBootstrap(async (chunk) => {
        // Serialize once, hash exactly what will cross the wire, then let the
        // receiver verify that exact text before parsing it. This avoids
        // JS↔Dart canonical-JSON differences (notably undefined/array holes).
        const recordsJson = JSON.stringify(chunk.records);
        const chunkHash = await hashBootstrapWireChunk(
          summary.memoryRoot,
          chunk.table,
          chunk.ordinal,
          recordsJson,
        );
        const ack = await this.sendBootstrapChunkAndWait({
          type: "bootstrap_chunk",
          memoryRoot: summary.memoryRoot,
          table: chunk.table,
          ordinal: chunk.ordinal,
          recordsJson,
          hashVersion: 3,
          chunkHash,
        });
        appliedRecords += ack.appliedRecords ?? chunk.records.length;
        appliedBytes += ack.appliedBytes ?? recordsJson.length;
        await updateSyncPeer(this.peerId, {
          status: "SYNCING",
          syncStage: "BOOTSTRAPPING",
          transferDirection: "SENDING",
          transferTable: chunk.table,
          transferAppliedRecords: appliedRecords,
          transferAppliedBytes: appliedBytes,
          transferTotalRecords: manifest.totalRecords,
          transport: "WEBRTC",
        });
      });
      await this.send({
        type: "bootstrap_complete",
        memoryRoot: summary.memoryRoot,
      });
      return;
    }

    if (message.type === "bootstrap_chunk") {
      let records: Array<{ id: string; [key: string]: unknown }>;
      let actual: string;
      if (
        message.hashVersion === 3 &&
        typeof message.recordsJson === "string"
      ) {
        actual = await hashBootstrapWireChunk(
          message.memoryRoot,
          message.table,
          message.ordinal,
          message.recordsJson,
        );
        records = JSON.parse(message.recordsJson) as Array<{
          id: string;
          [key: string]: unknown;
        }>;
      } else {
        records = message.records ?? [];
        actual = await hashBootstrapChunk(
          message.memoryRoot,
          message.table,
          message.ordinal,
          records,
        );
      }
      if (actual !== message.chunkHash)
        throw new Error("Brain2 bootstrap chunk hash mismatch.");
      if (message.table === "mutations") {
        for (const record of records) {
          if (
            String(record.originDeviceId || record.deviceId || "") !==
            this.peerId
          )
            continue;
          const sequence = Number(
            record.originSequence || record.sequence || 0,
          );
          this.bootstrapPeerMaxSequence = Math.max(
            this.bootstrapPeerMaxSequence,
            sequence,
          );
        }
      }
      await applySyncBootstrapChunk(message.memoryRoot, message.table, records);
      const appliedBytes =
        typeof message.recordsJson === "string"
          ? new TextEncoder().encode(message.recordsJson).byteLength
          : new TextEncoder().encode(JSON.stringify(records)).byteLength;
      const peerState = await getSyncPeer(this.peerId);
      await updateSyncPeer(this.peerId, {
        status: "SYNCING",
        syncStage: "BOOTSTRAPPING",
        transferDirection: "RECEIVING",
        transferTable: message.table,
        transferAppliedRecords:
          Number(peerState?.transferAppliedRecords || 0) + records.length,
        transferAppliedBytes:
          Number(peerState?.transferAppliedBytes || 0) + appliedBytes,
        transport: "WEBRTC",
      });
      await this.send({
        type: "bootstrap_ack",
        ordinal: message.ordinal,
        appliedRecords: records.length,
        appliedBytes,
      });
      return;
    }

    if (message.type === "bootstrap_complete") {
      await finalizeSyncBootstrap();
      if (this.bootstrapPeerMaxSequence > 0) {
        await this.send({
          type: "ack",
          sequence: this.bootstrapPeerMaxSequence,
          originDeviceId: this.peerId,
        });
      }
      this.bootstrapPeerMaxSequence = 0;
      await updateSyncPeer(this.peerId, {
        status: "SYNCING",
        syncStage: "SYNCING_DELTAS",
        transferDirection: undefined,
        transferTable: undefined,
      });
      await this.send({
        type: "hello",
        summary: await getSyncReplicaSummary(),
      });
      return;
    }

    if (message.type === "mutations") {
      const actualManifest = await hashMutationManifest(message.mutations);
      if (actualManifest !== message.manifestHash)
        throw new Error("Brain2 mutation batch manifest mismatch.");
      const result = await applyReplicatedMutations(
        this.peerId,
        message.mutations,
        "WEBRTC",
      );
      await updateSyncPeer(this.peerId, {
        lastManifestHash: message.manifestHash,
      });
      await this.send({
        type: "ack",
        sequence: result.lastAppliedSequence,
        manifestHash: message.manifestHash,
        originDeviceId: this.peerId,
      });
      if (!result.rejected.length) {
        await this.sendPending();
        await this.markConvergedIfPossible();
      }
      return;
    }

    if (message.type === "ack") {
      this.outboundInFlight = false;
      await markPeerAck(this.peerId, message.sequence);
      await updateSyncPeer(this.peerId, {
        lastManifestHash: message.manifestHash,
      });
      await this.sendPending();
      await this.markConvergedIfPossible();
      return;
    }

    if (message.type === "ping") return;
  }

  close() {
    this.closed = true;
    this.outboundInFlight = false;
    try {
      this.channel?.close();
    } catch {}
    try {
      this.pc.close();
    } catch {}
  }
}

const sessions = new Map<string, PeerSession>();
let pollTimer: number | undefined;
let unsubscribeDelta: (() => void) | undefined;
let flushTimer: number | undefined;
let reconcileTimer: number | undefined;
let signalPollInFlight = false;
let lastObservedLocalSequence = -1;

async function consumeSignals() {
  if (signalPollInFlight) return;
  signalPollInFlight = true;
  try {
    for (const signal of await pullSignals()) {
      let session = sessions.get(signal.fromDeviceId);
      if (signal.kind === "offer") {
        // External-device pairing has one deterministic offerer: the joining
        // mobile replica. If the web side was also told to connect manually,
        // both peers can create offers at once (offer glare). Reusing that
        // initiator RTCPeerConnection for the mobile offer can produce the
        // Chromium/WebRTC m-line ordering error.
        //
        // Preserve only a truly empty placeholder session that may contain ICE
        // received before the SDP offer. Any negotiated/initiating session is
        // replaced by a clean answerer connection.
        const reusablePlaceholder =
          session &&
          !session.pc.localDescription &&
          !session.pc.remoteDescription;
        if (!reusablePlaceholder) {
          session?.close();
          session = new PeerSession(signal.fromDeviceId, false);
          sessions.set(signal.fromDeviceId, session);
        }
        if (!session) {
          throw new Error(
            "Failed to create WebRTC session for incoming offer.",
          );
        }
        await session.setRemoteDescription(signal.payload as RTCSessionDescriptionInit);
        const answer = await session.pc.createAnswer();
        await session.pc.setLocalDescription(answer);
        await postSignal(signal.fromDeviceId, "answer", answer);
      } else if (signal.kind === "answer" && session) {
        // Ignore answers left over from a superseded negotiation. An answer is
        // valid only for a session that currently owns a local offer.
        if (session.pc.signalingState !== "have-local-offer") continue;
        await session.setRemoteDescription(signal.payload as RTCSessionDescriptionInit);
      } else if (signal.kind === "ice") {
        if (!session) {
          session = new PeerSession(signal.fromDeviceId, false);
          sessions.set(signal.fromDeviceId, session);
        }
        await session.addIceCandidate(signal.payload as RTCIceCandidateInit);
      } else if (signal.kind === "bye" && session) {
        session.close();
        sessions.delete(signal.fromDeviceId);
      }
    }
  } finally {
    signalPollInFlight = false;
  }
}

function reconcileConnectedPeers(force = false) {
  if (flushTimer) return;
  flushTimer = window.setTimeout(
    () => {
      flushTimer = undefined;
      void (async () => {
        const summary = await getSyncReplicaSummary();
        const sequence = Number(summary.latestLocalSequence || 0);
        if (!force && sequence === lastObservedLocalSequence) return;
        lastObservedLocalSequence = sequence;
        for (const session of sessions.values()) {
          void session.reconcile().catch((error) => {
            void updateSyncPeer(session.peerId, {
              status: "ERROR",
              error: error instanceof Error ? error.message : String(error),
            });
          });
        }
      })();
    },
    force ? 0 : 80,
  );
}

function flushConnectedPeers() {
  reconcileConnectedPeers(false);
}

export function startBrain2P2P() {
  if (typeof window === "undefined" || !localToken()) return;
  if (!pollTimer) {
    void consumeSignals().catch(() => undefined);
    pollTimer = window.setInterval(() => {
      void consumeSignals().catch(() => undefined);
    }, 3000);
  }
  if (!unsubscribeDelta)
    unsubscribeDelta = subscribeBrain2(flushConnectedPeers);
  if (!reconcileTimer) {
    reconcileTimer = window.setInterval(
      () => reconcileConnectedPeers(true),
      5000,
    );
  }
}

export function stopBrain2P2P() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = undefined;
  }
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = undefined;
  }
  if (reconcileTimer) {
    clearInterval(reconcileTimer);
    reconcileTimer = undefined;
  }
  lastObservedLocalSequence = -1;
  unsubscribeDelta?.();
  unsubscribeDelta = undefined;
  for (const session of sessions.values()) session.close();
  sessions.clear();
}

export async function enableBrain2P2P() {
  const summary = await getSyncReplicaSummary();
  const deviceId = currentBrain2DeviceId();
  const body = await api("/api/brain2-sync/devices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceId,
      spaceId: summary.memoryRoot,
      name: "AI Miner Web",
      kind: "web",
    }),
  });
  localStorage.setItem(TOKEN_KEY, body.deviceToken);
  localStorage.setItem(SERVER_DEVICE_KEY, body.deviceId);
  if (Array.isArray(body.iceServers))
    localStorage.setItem(ICE_KEY, JSON.stringify(body.iceServers));
  startBrain2P2P();
  return body;
}

export async function joinBrain2P2P(joinToken: string) {
  const deviceId = currentBrain2DeviceId();
  const body = await api("/api/brain2-sync/devices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceId,
      name: "AI Miner Web",
      kind: "web",
      joinToken,
    }),
  });
  await adoptMemoryRootIfEmpty(body.spaceId);
  localStorage.setItem(TOKEN_KEY, body.deviceToken);
  localStorage.setItem(SERVER_DEVICE_KEY, body.deviceId);
  if (Array.isArray(body.iceServers))
    localStorage.setItem(ICE_KEY, JSON.stringify(body.iceServers));
  startBrain2P2P();
  return body;
}

export async function createBrain2PairingToken() {
  try {
    return await api("/api/brain2-sync/pairing", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Brain2-Device-Token": localToken(),
      },
      body: JSON.stringify({ deviceId: serverDeviceId() }),
    });
  } catch (error) {
    if (!isUnknownDeviceError(error)) throw error;
    clearLocalCredential();
    await enableBrain2P2P();
    return api("/api/brain2-sync/pairing", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Brain2-Device-Token": localToken(),
      },
      body: JSON.stringify({ deviceId: serverDeviceId() }),
    });
  }
}

export async function createBrain2PairingInvite() {
  const pair = await createBrain2PairingToken();
  const origin = pairingOrigin();
  const url = new URL("/devices", origin || "http://localhost");
  url.searchParams.set("v", "2");
  url.searchParams.set("pair", pair.token);
  url.searchParams.set("peer", serverDeviceId());
  url.searchParams.set("expires", pair.expiresAt);
  // When signaling is hosted separately, the mobile app cannot infer it from
  // the website URL. Encode the rendezvous origin in the one-time QR.
  if (signalingBase()) url.searchParams.set("signal", signalingBase());
  return {
    ...pair,
    inviterDeviceId: serverDeviceId(),
    pairingUrl: url.toString(),
  };
}

export function currentBrain2NetworkDeviceId() {
  return serverDeviceId();
}

export async function listBrain2NetworkDevices() {
  if (!localToken()) return [];
  try {
    const body = await api(
      `/api/brain2-sync/devices?deviceId=${encodeURIComponent(serverDeviceId())}`,
      { headers: { "X-Brain2-Device-Token": localToken() } },
    );
    return body.devices || [];
  } catch (error) {
    if (isUnknownDeviceError(error)) {
      clearLocalCredential();
      return [];
    }
    throw error;
  }
}

export async function removeBrain2NetworkDevice(peerDeviceId: string) {
  const target = String(peerDeviceId || "").trim();
  if (!target) throw new Error("Missing Brain2 device id.");
  if (target === serverDeviceId())
    throw new Error("Cannot remove the current web replica from this screen.");
  const token = localToken();
  if (!token) throw new Error("P2P sync is not enabled on this web replica.");
  // Brain2 stale-peer local cleanup:
  // removing a peer must work even when its server registration is already
  // expired, revoked, stale, or temporarily unreachable.
  const existingSession = sessions.get(target);
  existingSession?.close();
  sessions.delete(target);
  await removeSyncPeer(target);

  try {
    await api("/api/brain2-sync/devices", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "X-Brain2-Device-Token": token,
      },
      body: JSON.stringify({
        deviceId: serverDeviceId(),
        targetDeviceId: target,
      }),
    });
  } catch (error) {
    // Local removal already succeeded. A stale/offline server entry must not
    // leave an undeletable ERROR peer in the replication UI.
    console.warn("Brain2 server revoke failed after local removal:", error);
  }
  sessions.get(target)?.close();
  sessions.delete(target);

  return { deviceId: target, revoked: true };
}

export function brain2P2PEnabled() {
  return Boolean(typeof window !== "undefined" && localToken());
}

export async function connectBrain2Peer(peerDeviceId: string) {
  if (peerDeviceId === serverDeviceId())
    throw new Error("Cannot connect a Brain2 device to itself.");
  sessions.get(peerDeviceId)?.close();
  const session = new PeerSession(peerDeviceId, true);
  sessions.set(peerDeviceId, session);
  await updateSyncPeer(peerDeviceId, {
    status: "SIGNALING",
    transport: "WEBRTC",
  });
  const offer = await session.pc.createOffer();
  await session.pc.setLocalDescription(offer);
  await postSignal(peerDeviceId, "offer", offer);
  return session;
}
