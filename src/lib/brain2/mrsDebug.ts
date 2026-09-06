"use client";

export type Brain2MRSDebugEvent = {
  id: string;
  at: string;
  level: "info" | "error";
  event: string;
  detail?: Record<string, unknown>;
};

let lastSnapshotText = "";
let lastSnapshotState = "";
let lastSnapshotAt = 0;
let lastDownloadBucket = -1;
let lastAttachScanKey = "";
let lastAttachScanAt = 0;
let sequence = 0;
let events: Brain2MRSDebugEvent[] = [];
const subscribers = new Set<(events: Brain2MRSDebugEvent[]) => void>();

function publish(level: Brain2MRSDebugEvent["level"], event: string, detail?: Record<string, unknown>) {
  const item: Brain2MRSDebugEvent = {
    id: `mrs_event_${++sequence}_${Date.now()}`,
    at: new Date().toISOString(),
    level,
    event,
    detail,
  };
  events = [item, ...events].slice(0, 300);
  subscribers.forEach((subscriber) => subscriber(events));
  return item;
}

export function getBrain2MRSDebugEvents() {
  return events;
}

export function subscribeBrain2MRSDebugEvents(subscriber: (events: Brain2MRSDebugEvent[]) => void) {
  subscribers.add(subscriber);
  subscriber(events);
  return () => {
    subscribers.delete(subscriber);
  };
}

function shouldLog(event: string, detail?: Record<string, unknown>) {
  if (event === "attach.scan") {
    const key = JSON.stringify(detail ?? {});
    const now = Date.now();
    if (key !== lastAttachScanKey || now - lastAttachScanAt > 3000) {
      lastAttachScanKey = key;
      lastAttachScanAt = now;
      return true;
    }
    return false;
  }
  if (event !== "worker.snapshot") return true;
  const rawText = String(detail?.text ?? "");
  const text = rawText.replace(/\d+%/g, "%");
  const state = `${detail?.state ?? ""}:${detail?.mrsState ?? ""}`;
  const progress = Number(detail?.progress ?? 0);
  const bucket = Number.isFinite(progress) ? Math.min(4, Math.max(0, Math.floor(progress * 4))) : -1;
  const now = Date.now();
  const isDownload = /Downloading AI model/i.test(rawText);
  if (!isDownload && (state !== lastSnapshotState || text !== lastSnapshotText || now - lastSnapshotAt > 3000)) {
    lastSnapshotState = state;
    lastSnapshotText = text;
    lastSnapshotAt = now;
    return true;
  }
  if (isDownload && (state !== lastSnapshotState || text !== lastSnapshotText)) {
    lastSnapshotState = state;
    lastSnapshotText = text;
    lastDownloadBucket = -1;
  }
  if (isDownload && (bucket > lastDownloadBucket || progress >= 1 || now - lastSnapshotAt > 5000)) {
    lastDownloadBucket = progress >= 1 ? 4 : bucket;
    lastSnapshotAt = now;
    return true;
  }
  return false;
}

export function brain2MRSLog(event: string, detail?: Record<string, unknown>) {
  if (!shouldLog(event, detail)) return;
  publish("info", event, detail);
}

export function brain2MRSError(event: string, detail?: Record<string, unknown>) {
  publish("error", event, detail);
}
