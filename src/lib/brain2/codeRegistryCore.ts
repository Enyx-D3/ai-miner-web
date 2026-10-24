/** Pure, versioned discovery rules. They do not use an LLM or runtime clock. */
export const CODE_REGISTRY_RULE_VERSION = "B2_CODE_REGISTRY_V2";

export type CodeOrigin = "CHAT_FENCE" | "ATTACHED_FILE" | "NESTED_ARCHIVE_FILE";

export type CodeCandidate = {
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
  content: string;
};

export type FencedMessage = { externalId: string; role: string; text: string };

/** Index all archived branches, not only the active lineage used for chat display. */
export function allArchivedCodeMessages(value: unknown, fallback: FencedMessage[]): FencedMessage[] {
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Record<string, unknown>;
  if (!raw.mapping || typeof raw.mapping !== "object") return fallback;
  const result: FencedMessage[] = [];
  for (const [nodeId, node] of Object.entries(raw.mapping as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))) {
    if (!node || typeof node !== "object") continue;
    const message = (node as Record<string, unknown>).message;
    if (!message || typeof message !== "object") continue;
    const m = message as Record<string, unknown>;
    const contents = m.content && typeof m.content === "object" ? m.content as Record<string, unknown> : {};
    const parts = Array.isArray(contents.parts) ? contents.parts.filter((part): part is string => typeof part === "string") : [];
    const text = parts.join("\n") || (typeof contents.text === "string" ? contents.text : "");
    if (!text.includes("```")) continue;
    const author = m.author && typeof m.author === "object" ? m.author as Record<string, unknown> : {};
    result.push({externalId: typeof m.id === "string" ? m.id : nodeId,
      role: typeof author.role === "string" ? author.role : "unknown", text});
  }
  return result;
}

export type CodeFileMetadata = {
  fileId: string;
  fileName: string;
  extension: string;
  conversationExternalId: string;
  sizeBytes: number;
  isNestedArchive: boolean;
};

const EXT_LANG: Record<string, string> = {
  dart: "dart", kt: "kotlin", kts: "kotlin", cpp: "cpp", cc: "cpp", c: "c", h: "c",
  hpp: "cpp", py: "python", js: "javascript", jsx: "jsx", ts: "typescript", tsx: "tsx",
  java: "java", swift: "swift", go: "go", rs: "rust", rb: "ruby", php: "php",
  sh: "shell", bash: "shell", ps1: "powershell", sql: "sql", css: "css", scss: "scss",
  html: "html", xml: "xml", gradle: "groovy", json: "json", yaml: "yaml", yml: "yaml",
};
const CODE_EXTENSIONS = new Set(Object.keys(EXT_LANG));
const EXCLUDED_CODE_PATH = /(?:^|\/)(?:node_modules|\.git|\.gradle|build|dist|vendor|__macosx)(?:\/|$)/i;
const SECRET_FILE = /(?:^|\/)(?:\.env(?:\.|$)|key\.properties$|[^/]*\.(?:jks|keystore|p12|pfx|pem|key)$|id_rsa$|credentials?\.[^/]+$)/i;
const CODE_SHAPE = /\b(?:class|interface|function|const|let|var|import|export|return|def|async|await|public|private|static|SELECT|CREATE|package|fun|void|#include)\b|[{};]\s*$/m;
const FENCE = /```([^\r\n`]*)\r?\n([\s\S]*?)\r?\n?```/g;

function confirmedCodePath(value: string): string | null {
  const name = value.trim().replace(/^[`"']+|[`"']+$/g, "").replace(/^\.\//, "");
  if (name.length > 240 || /[<>\u0000-\u001f]/.test(name)) return null;
  return name.includes(".") && safeSourcePath(name) && languageForFilename(name) ? name.replace(/\\/g, "/") : null;
}

/** A chat excerpt is a named file only with explicit, nearby path evidence. */
export function sourcePathForFence(header: string, precedingText: string, code: string): string | null {
  const attribute = header.match(/(?:^|\s|\{)(?:file(?:name)?|path|title)\s*=\s*(?:"([^"]+)"|'([^']+)'|`([^`]+)`|([^\s}\]]+))/i);
  if (attribute) {
    const path = confirmedCodePath(attribute[1] || attribute[2] || attribute[3] || attribute[4]);
    if (path) return path;
  }
  const headerToken = header.trim().split(/\s+/)[0] ?? "";
  const direct = confirmedCodePath(headerToken) || confirmedCodePath(headerToken.replace(/^[a-z+#]+:/i, ""));
  if (direct) return direct;

  // Do not borrow a filename from an unrelated paragraph or a previous fence.
  const lines = precedingText.slice(-400).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const nearby = (lines.at(-1) || "").replace(/^#{1,6}\s*/, "").replace(/\*\*/g, "").replace(/^[-*]\s*/, "").trim();
  const labeled = nearby.match(/^(?:file(?:name|\s+path)?|path|source)\s*[:=]\s*(?:`([^`]+)`|"([^"]+)"|'([^']+)'|([^\s]+))\s*[:.]?$/i);
  if (labeled) {
    const path = confirmedCodePath(labeled[1] || labeled[2] || labeled[3] || labeled[4]);
    if (path) return path;
  }
  const standalone = nearby.match(/^`([^`]+)`\s*:?$/);
  if (standalone) {
    const path = confirmedCodePath(standalone[1]);
    if (path) return path;
  }
  const plainHeadingPath = confirmedCodePath(nearby.replace(/:$/, ""));
  if (plainHeadingPath) return plainHeadingPath;

  const firstLine = code.split(/\r?\n/, 1)[0] ?? "";
  const comment = firstLine.match(/^\s*(?:\/\/|#|\/\*|<!--)\s*(?:file(?:name)?|path)\s*[:=]\s*(\S+?)(?:\s*\*\/|\s*-->)?\s*$/i);
  return comment ? confirmedCodePath(comment[1]) : null;
}

export function safeSourcePath(name: string): boolean {
  const normalized = name.replace(/\\/g, "/").trim();
  return Boolean(normalized) && !normalized.startsWith("/") && !/^[a-z]:\//i.test(normalized)
    && !normalized.split("/").includes("..") && !EXCLUDED_CODE_PATH.test(normalized)
    && !SECRET_FILE.test(normalized);
}

export function safeCodeContent(content: string): boolean {
  return Boolean(content.trim()) && content.length <= 5 * 1024 * 1024
    && !/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content);
}

export function languageForFilename(fileName: string): string | null {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  return CODE_EXTENSIONS.has(ext) ? EXT_LANG[ext] : null;
}

export function selectCodeFilesFromLibraryMetadata(records: unknown): CodeFileMetadata[] {
  if (!Array.isArray(records)) return [];
  const selected: CodeFileMetadata[] = [];
  for (const entry of records) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const fileId = typeof row.file_id === "string" ? row.file_id : "";
    const fileName = typeof row.file_name === "string" ? row.file_name : "";
    const extension = typeof row.file_extension === "string" ? row.file_extension.toLowerCase() : fileName.split(".").pop()?.toLowerCase() ?? "";
    const sizeBytes = typeof row.file_size_bytes === "number" ? row.file_size_bytes : 0;
    const isNestedArchive = extension === "zip" && /^(?:android(?:\(\d+\))?|source|src|code)\.zip$/i.test(fileName);
    if (!fileId || !safeSourcePath(fileName) || (!CODE_EXTENSIONS.has(extension) && !isNestedArchive)) continue;
    if (sizeBytes > (isNestedArchive ? 32 : 5) * 1024 * 1024) continue;
    selected.push({
      fileId, fileName, extension, conversationExternalId: typeof row.origination_thread_id === "string" ? row.origination_thread_id : "",
      sizeBytes, isNestedArchive,
    });
  }
  return selected.sort((a, b) => a.fileId.localeCompare(b.fileId));
}

export function codeFromFences(input: {
  provider: string; projectId: string; projectName: string; conversationExternalId: string;
  conversationTitle: string; messages: FencedMessage[];
}): CodeCandidate[] {
  const result: CodeCandidate[] = [];
  for (const message of input.messages) {
    let index = 0;
    for (const match of message.text.matchAll(FENCE)) {
      const ordinal = ++index;
      const rawHeader = match[1].trim();
      const header = (rawHeader.split(/\s+/)[0] || "").toLowerCase();
      const content = match[2].trim();
      if (!safeCodeContent(content) || ["mermaid", "text", "plaintext", "markdown", "md"].includes(header)) continue;
      if (!header && !CODE_SHAPE.test(content)) continue;
      const sourcePath = sourcePathForFence(rawHeader, message.text.slice(0, match.index), content);
      const language = (sourcePath ? languageForFilename(sourcePath) : null) ?? EXT_LANG[header] ?? ({ typescript: "typescript", javascript: "javascript", python: "python", kotlin: "kotlin", rust: "rust", shell: "shell", bash: "shell", jsonc: "json" } as Record<string, string>)[header] ?? (header || "unknown");
      const extension = Object.entries(EXT_LANG).find(([, lang]) => lang === language)?.[0] ?? "txt";
      result.push({
        origin: "CHAT_FENCE", provider: input.provider, projectId: input.projectId,
        projectName: input.projectName, conversationExternalId: input.conversationExternalId,
        conversationTitle: input.conversationTitle, sourceMessageId: message.externalId,
        sourceFileId: "", sourcePath: sourcePath || "", fileName: sourcePath?.split("/").pop() || `unnamed-${ordinal}.${extension}`,
        language, content,
      });
    }
  }
  return result;
}
