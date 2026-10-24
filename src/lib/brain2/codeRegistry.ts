import { CODE_REGISTRY_RULE_VERSION, type CodeCandidate, type CodeOrigin } from "./codeRegistryCore";

const DB_NAME = "brain2-private-code-registry";
const DB_VERSION = 1;

export type CodeRecord = {
  id: string;
  hash: string;
  ruleVersion: string;
  origin: CodeOrigin;
  provider: string;
  projectId: string;
  projectName: string;
  conversationExternalId: string;
  conversationTitle: string;
  sourceMessageId: string;
  sourceFileId: string;
  sourcePath: string;
  fileName: string;
  language: string;
  bytes: number;
};

type CodeBlob = { hash: string; content: string };

async function accountScopedDatabaseName(): Promise<string> {
  // The code vault must not expose one account's recovered source to another
  // account signing in on the same browser/device.
  const response = await fetch("/api/v1/auth/session", {credentials:"same-origin",cache:"no-store"});
  if (!response.ok) throw new Error("Sign in to access your private Code Registry.");
  const session: unknown = await response.json();
  const owner = session && typeof session === "object" && "user" in session ? session.user : null;
  const id = owner && typeof owner === "object" && "id" in owner ? owner.id : null;
  if (typeof id !== "string" || !id) throw new Error("Code Registry account identity is unavailable.");
  return `${DB_NAME}:${id}`;
}

async function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("Code Registry requires browser IndexedDB."));
  const databaseName = await accountScopedDatabaseName();
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("records")) {
        const store = db.createObjectStore("records", { keyPath: "id" });
        store.createIndex("byProjectId", "projectId", { unique: false });
        store.createIndex("byHash", "hash", { unique: false });
      }
      if (!db.objectStoreNames.contains("blobs")) db.createObjectStore("blobs", { keyPath: "hash" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open Code Registry."));
  });
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function buildCodeRecord(candidate: CodeCandidate): Promise<{ record: CodeRecord; blob: CodeBlob }> {
  const hash = await sha256(candidate.content);
  const id = await sha256(JSON.stringify([
    CODE_REGISTRY_RULE_VERSION, candidate.provider, candidate.conversationExternalId,
    candidate.sourceMessageId, candidate.sourceFileId, candidate.sourcePath,
    candidate.fileName, candidate.origin, hash,
  ]));
  return {
    record: {
      id, hash, ruleVersion: CODE_REGISTRY_RULE_VERSION,
      origin: candidate.origin, provider: candidate.provider,
      projectId: candidate.projectId, projectName: candidate.projectName,
      conversationExternalId: candidate.conversationExternalId,
      conversationTitle: candidate.conversationTitle,
      sourceMessageId: candidate.sourceMessageId, sourceFileId: candidate.sourceFileId,
      sourcePath: candidate.sourcePath, fileName: candidate.fileName,
      language: candidate.language, bytes: new TextEncoder().encode(candidate.content).byteLength,
    },
    blob: { hash, content: candidate.content },
  };
}

/** Idempotent, atomic source and blob upsert. Different provenance may share one code blob. */
export async function saveCodeCandidates(candidates: CodeCandidate[]): Promise<number> {
  if (!candidates.length) return 0;
  const prepared = await Promise.all(candidates.map(buildCodeRecord));
  prepared.sort((a, b) => a.record.id.localeCompare(b.record.id));
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(["records", "blobs"], "readwrite");
      const records = transaction.objectStore("records");
      const blobs = transaction.objectStore("blobs");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Code Registry write failed."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Code Registry write was aborted."));
      for (const { record, blob } of prepared) {
        blobs.put(blob);
        records.put(record);
      }
    });
    return prepared.length;
  } finally {
    db.close();
  }
}

export async function listCodeRecords(): Promise<CodeRecord[]> {
  const db = await openDatabase();
  try {
    return await new Promise<CodeRecord[]>((resolve, reject) => {
      const request = db.transaction("records", "readonly").objectStore("records").getAll();
      request.onsuccess = () => resolve((request.result as CodeRecord[]).sort((a, b) =>
        a.projectName.localeCompare(b.projectName) || a.fileName.localeCompare(b.fileName) || a.id.localeCompare(b.id)));
      request.onerror = () => reject(request.error ?? new Error("Could not list code records."));
    });
  } finally {
    db.close();
  }
}

export async function readCodeContent(hash: string): Promise<string | null> {
  const db = await openDatabase();
  try {
    return await new Promise<string | null>((resolve, reject) => {
      const request = db.transaction("blobs", "readonly").objectStore("blobs").get(hash);
      request.onsuccess = () => resolve((request.result as CodeBlob | undefined)?.content ?? null);
      request.onerror = () => reject(request.error ?? new Error("Could not open source file."));
    });
  } finally {
    db.close();
  }
}

/** Keep Code Registry within the same user-visible destructive reset boundary as Brain2 memory. */
export async function clearCodeRegistry(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const databaseName = await accountScopedDatabaseName();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(databaseName);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Could not clear private Code Registry."));
    request.onblocked = () => reject(new Error("Close other Code Registry tabs before clearing memory."));
  });
}
