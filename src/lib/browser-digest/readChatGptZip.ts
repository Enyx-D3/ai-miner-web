import { AsyncUnzipInflate, Unzip } from "fflate"
import { languageForFilename, safeCodeContent, safeSourcePath, selectCodeFilesFromLibraryMetadata, type CodeFileMetadata } from "../brain2/codeRegistryCore"

export type BrowserDigestSourceKind = "chatgpt" | "claude" | "gemini"

export type ExtractedConversationJson = {
  bytes: Uint8Array
  jsonFileCount: number
  totalJsonBytes: number
  sourceKind: BrowserDigestSourceKind
  sourceLabel: string
  sourceType: string
  conversationCount: number
  messageCount: number
  attachmentCount: number
  fileCount: number
  dateRangeStart?: string
  dateRangeEnd?: string
  codeFiles?: CodeFileMetadata[]
}

type ClaudeConversation = {
  uuid?: unknown
  name?: unknown
  summary?: unknown
  created_at?: unknown
  updated_at?: unknown
  chat_messages?: unknown
}

type ClaudeMessage = {
  uuid?: unknown
  text?: unknown
  content?: unknown
  sender?: unknown
  created_at?: unknown
  updated_at?: unknown
  attachments?: unknown
  files?: unknown
}

type ChatGptCompatibleConversation = {
  id: string
  title: string
  create_time?: string
  update_time?: string
  messages: Array<{
    message: {
      id: string
      author: { role: string }
      create_time?: string
      content: {
        content_type: "text"
        parts: string[]
      }
    }
  }>
}

const conversationJsonPattern = /(?:^|\/)conversations(?:-[^/\\]+)?\.json$/i
const geminiActivityPattern = /(?:^|\/)Takeout\/My Activity\/Gemini Apps\/MyActivity\.json$/i
const libraryMetadataPattern = /(?:^|\/)library_files\.json$/i

function isConversationJsonPath(path: string): boolean {
  return conversationJsonPattern.test(path.replace(/\\/g, "/"))
}

function isGeminiActivityPath(path: string): boolean {
  return geminiActivityPattern.test(path.replace(/\\/g, "/"))
}

type RelevantZipEntry = { path: string; bytes: Uint8Array }

export const BRAIN2_ARCHIVE_MAX_COMPRESSED_BYTES = 1024 * 1024 * 1024
export const BRAIN2_ARCHIVE_MAX_ENTRIES = 100_000
export const BRAIN2_ARCHIVE_MAX_RELEVANT_ENTRIES = 512
export const BRAIN2_ARCHIVE_MAX_SINGLE_JSON_BYTES = 256 * 1024 * 1024
export const BRAIN2_ARCHIVE_MAX_TOTAL_JSON_BYTES = 512 * 1024 * 1024
export const BRAIN2_ARCHIVE_MIN_EXPANSION_BUDGET_BYTES = 64 * 1024 * 1024
export const BRAIN2_ARCHIVE_MAX_EXPANSION_RATIO = 200

export function brain2ArchiveExpansionLimit(compressedBytes: number): number {
  const size = Math.max(0, Math.trunc(compressedBytes))
  return Math.min(
    BRAIN2_ARCHIVE_MAX_TOTAL_JSON_BYTES,
    Math.max(BRAIN2_ARCHIVE_MIN_EXPANSION_BUDGET_BYTES, size * BRAIN2_ARCHIVE_MAX_EXPANSION_RATIO),
  )
}

export function assertBrain2ArchiveCompressedSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) throw new Error("The archive is empty or has an invalid size.")
  if (size > BRAIN2_ARCHIVE_MAX_COMPRESSED_BYTES) {
    throw new Error(`Archive exceeds Brain2's ${Math.round(BRAIN2_ARCHIVE_MAX_COMPRESSED_BYTES / 1024 / 1024)} MiB compressed-size safety limit.`)
  }
}

export function normalizeBrain2ArchiveEntryPath(rawPath: string): string {
  if (rawPath.includes("\0")) throw new Error("Archive entry contains a NUL byte.")
  const normalized = rawPath.replace(/\\/g, "/")
  if (normalized.startsWith("/") || normalized.startsWith("//") || /^[a-zA-Z]:\//.test(normalized)) {
    throw new Error(`Archive entry uses an absolute path: ${rawPath}`)
  }
  const parts = normalized.split("/").filter((part) => part && part !== ".")
  if (parts.some((part) => part === "..")) {
    throw new Error(`Archive entry attempts parent-directory traversal: ${rawPath}`)
  }
  return parts.join("/")
}

async function extractRelevantZipEntries(file: File): Promise<{ entries: RelevantZipEntry[]; archiveEntryCount: number }> {
  assertBrain2ArchiveCompressedSize(file.size)
  const entries: RelevantZipEntry[] = []
  let archiveEntryCount = 0
  let relevantEntryCount = 0
  let totalRelevantBytes = 0
  const expansionLimit = brain2ArchiveExpansionLimit(file.size)
  let pending = 0
  let inputFinished = false
  let settled = false

  return new Promise((resolve, reject) => {
    const finishIfReady = () => {
      if (!settled && inputFinished && pending === 0) {
        settled = true
        resolve({ entries, archiveEntryCount })
      }
    }
    const fail = (error: unknown) => {
      if (settled) return
      settled = true
      reject(error instanceof Error ? error : new Error(String(error)))
    }

    const unzip = new Unzip((entry) => {
      if (settled) return
      archiveEntryCount += 1
      if (archiveEntryCount > BRAIN2_ARCHIVE_MAX_ENTRIES) {
        fail(new Error(`Archive contains more than ${BRAIN2_ARCHIVE_MAX_ENTRIES} entries.`))
        return
      }
      let path: string
      try {
        path = normalizeBrain2ArchiveEntryPath(entry.name)
      } catch (error) {
        fail(error)
        return
      }
      if (!isConversationJsonPath(path) && !isGeminiActivityPath(path) && !libraryMetadataPattern.test(path)) return
      relevantEntryCount += 1
      if (relevantEntryCount > BRAIN2_ARCHIVE_MAX_RELEVANT_ENTRIES) {
        fail(new Error(`Archive contains more than ${BRAIN2_ARCHIVE_MAX_RELEVANT_ENTRIES} relevant conversation JSON files.`))
        return
      }
      pending += 1
      const chunks: Uint8Array[] = []
      let total = 0
      entry.ondata = (error, chunk, final) => {
        if (settled) return
        if (error) {
          fail(error)
          return
        }
        if (chunk.byteLength) {
          total += chunk.byteLength
          totalRelevantBytes += chunk.byteLength
          if (total > BRAIN2_ARCHIVE_MAX_SINGLE_JSON_BYTES) {
            fail(new Error(`${path} exceeds Brain2's ${Math.round(BRAIN2_ARCHIVE_MAX_SINGLE_JSON_BYTES / 1024 / 1024)} MiB per-JSON safety limit.`))
            return
          }
          if (totalRelevantBytes > expansionLimit) {
            fail(new Error(`Archive decompression exceeded Brain2's safety budget (${Math.round(expansionLimit / 1024 / 1024)} MiB).`))
            return
          }
          chunks.push(chunk)
        }
        if (!final) return
        const bytes = new Uint8Array(total)
        let offset = 0
        for (const part of chunks) {
          bytes.set(part, offset)
          offset += part.byteLength
        }
        entries.push({ path, bytes })
        pending -= 1
        finishIfReady()
      }
      entry.start()
    })
    unzip.register(AsyncUnzipInflate)

    void (async () => {
      try {
        const reader = file.stream().getReader()
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          if (value?.byteLength) unzip.push(value, false)
        }
        inputFinished = true
        unzip.push(new Uint8Array(0), true)
        finishIfReady()
      } catch (error) {
        fail(error)
      }
    })()
  })
}

function stripUtf8Bom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

function jsonArrayInner(text: string, path: string): string {
  const trimmed = stripUtf8Bom(text).trim()
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    throw new Error(`${path} is not a JSON array`)
  }

  return trimmed.slice(1, -1).trim()
}

function combineJsonArrayShards(files: { path: string; bytes: Uint8Array }[]): Uint8Array {
  if (files.length === 1) {
    return files[0].bytes
  }

  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  const parts: string[] = []

  for (const file of files) {
    const inner = jsonArrayInner(decoder.decode(file.bytes), file.path)
    if (inner.length > 0) {
      parts.push(inner)
    }
  }

  return encoder.encode(`[${parts.join(",")}]`)
}

function parseJsonArray(text: string, path: string): unknown[] {
  const parsed = JSON.parse(stripUtf8Bom(text))
  if (!Array.isArray(parsed)) {
    throw new Error(`${path} is not a JSON array`)
  }

  return parsed
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function detectConversationSource(conversations: unknown[]): BrowserDigestSourceKind | null {
  const firstConversation = conversations.find(isRecord)
  if (!firstConversation) {
    return null
  }

  if (isRecord(firstConversation.mapping)) {
    return "chatgpt"
  }

  if (Array.isArray(firstConversation.chat_messages)) {
    return "claude"
  }

  return null
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function dateValue(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value * 1000).toISOString()
  }
  if (typeof value !== "string" || !value) {
    return ""
  }
  const numeric = Number(value)
  if (Number.isFinite(numeric) && numeric > 1000000000) {
    return new Date(numeric * 1000).toISOString()
  }
  return value
}

function updateDateRange(range: { start?: string; end?: string }, value: unknown) {
  const date = dateValue(value)
  if (!date) {
    return
  }
  if (!range.start || date < range.start) {
    range.start = date
  }
  if (!range.end || date > range.end) {
    range.end = date
  }
}

function firstTextFromClaudeContent(content: unknown): string {
  if (typeof content === "string") {
    return content
  }

  if (!Array.isArray(content)) {
    return ""
  }

  return content
    .map((part) => {
      if (typeof part === "string") {
        return part
      }
      if (!isRecord(part)) {
        return ""
      }
      if (part.type && part.type !== "text") {
        return ""
      }
      return stringValue(part.text)
    })
    .filter(Boolean)
    .join("\n")
}

function claudeRoleToChatGptRole(sender: unknown): string {
  if (sender === "human") {
    return "user"
  }
  if (sender === "assistant") {
    return "assistant"
  }
  if (sender === "system") {
    return "system"
  }
  return "unknown"
}

function chatGptMessageNodes(conversation: Record<string, unknown>): Record<string, unknown>[] {
  if (isRecord(conversation.mapping)) {
    return Object.values(conversation.mapping).filter(isRecord)
  }
  if (Array.isArray(conversation.messages)) {
    return conversation.messages.filter(isRecord)
  }
  return []
}

function chatGptMetadata(conversations: unknown[]) {
  const range: { start?: string; end?: string } = {}
  let conversationCount = 0
  let messageCount = 0

  for (const conversation of conversations) {
    if (!isRecord(conversation)) {
      continue
    }
    const nodes = chatGptMessageNodes(conversation)
    if (nodes.length === 0) {
      continue
    }
    conversationCount += 1
    for (const node of nodes) {
      const message = isRecord(node.message) ? node.message : null
      if (!message) {
        continue
      }
      messageCount += 1
      updateDateRange(range, message.create_time)
    }
  }

  return {
    conversationCount,
    messageCount,
    attachmentCount: 0,
    fileCount: 0,
    dateRangeStart: range.start,
    dateRangeEnd: range.end,
  }
}

function claudeMetadata(conversations: unknown[]) {
  const range: { start?: string; end?: string } = {}
  let conversationCount = 0
  let messageCount = 0
  let attachmentCount = 0
  let fileCount = 0

  for (const value of conversations) {
    if (!isRecord(value)) {
      continue
    }
    const conversation = value as ClaudeConversation
    const messages = Array.isArray(conversation.chat_messages) ? conversation.chat_messages.filter(isRecord) : []
    if (messages.length === 0) {
      continue
    }
    conversationCount += 1
    updateDateRange(range, conversation.created_at)
    updateDateRange(range, conversation.updated_at)
    for (const rawMessage of messages) {
      const message = rawMessage as ClaudeMessage
      messageCount += 1
      updateDateRange(range, message.created_at)
      updateDateRange(range, message.updated_at)
      attachmentCount += Array.isArray(message.attachments) ? message.attachments.length : 0
      fileCount += Array.isArray(message.files) ? message.files.length : 0
    }
  }

  return {
    conversationCount,
    messageCount,
    attachmentCount,
    fileCount,
    dateRangeStart: range.start,
    dateRangeEnd: range.end,
  }
}

function normalizeClaudeConversation(value: unknown, conversationIndex: number): ChatGptCompatibleConversation | null {
  if (!isRecord(value)) {
    return null
  }

  const conversation = value as ClaudeConversation
  const rawMessages = Array.isArray(conversation.chat_messages) ? conversation.chat_messages : []
  const id = stringValue(conversation.uuid) || `claude-conversation-${conversationIndex + 1}`
  const title = stringValue(conversation.name) || stringValue(conversation.summary) || `Claude Conversation ${conversationIndex + 1}`
  const messages: ChatGptCompatibleConversation["messages"] = []

  for (let messageIndex = 0; messageIndex < rawMessages.length; ++messageIndex) {
    const rawMessage = rawMessages[messageIndex] as ClaudeMessage
    if (!isRecord(rawMessage)) {
      continue
    }

    const text = stringValue(rawMessage.text) || firstTextFromClaudeContent(rawMessage.content)
    if (!text.trim()) {
      continue
    }

    messages.push({
      message: {
        id: stringValue(rawMessage.uuid) || `${id}-message-${messageIndex + 1}`,
        author: {
          role: claudeRoleToChatGptRole(rawMessage.sender),
        },
        create_time: stringValue(rawMessage.created_at) || stringValue(rawMessage.updated_at),
        content: {
          content_type: "text",
          parts: [text],
        },
      },
    })
  }

  if (messages.length === 0) {
    return null
  }

  return {
    id,
    title,
    create_time: stringValue(conversation.created_at),
    update_time: stringValue(conversation.updated_at),
    messages,
  }
}

function convertClaudeToChatGptBytes(conversations: unknown[]): Uint8Array {
  const normalized = conversations
    .map((conversation, index) => normalizeClaudeConversation(conversation, index))
    .filter((conversation): conversation is ChatGptCompatibleConversation => conversation !== null)

  if (normalized.length === 0) {
    throw new Error("Claude conversations.json did not contain any readable messages.")
  }

  return new TextEncoder().encode(JSON.stringify(normalized))
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
}

function stripHtml(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  )
}

function geminiUrlFromActivity(item: Record<string, unknown>, index: number): string {
  const details = Array.isArray(item.details) ? item.details : []
  for (const detail of details) {
    if (isRecord(detail) && typeof detail.url === "string" && detail.url.includes("gemini.google.com")) {
      return detail.url
    }
    if (isRecord(detail) && typeof detail.name === "string" && detail.name.includes("gemini.google.com")) {
      return detail.name
    }
  }

  return `gemini-activity-${index + 1}`
}

function geminiTitleText(title: unknown): string {
  return stringValue(title)
    .replace(/^Prompted\s+(Gemini Apps\s+)?/i, "")
    .replace(/\s+/g, " ")
    .trim()
}

function dateLabel(value: unknown): string {
  const raw = stringValue(value)
  return raw ? raw.slice(0, 10) : ""
}

function geminiHtmlText(item: Record<string, unknown>): string {
  const safeHtmlItems = Array.isArray(item.safeHtmlItem) ? item.safeHtmlItem : []
  return safeHtmlItems
    .map((entry) => (isRecord(entry) ? stripHtml(stringValue(entry.html)) : ""))
    .filter(Boolean)
    .join("\n\n")
}

function convertGeminiActivityToChatGpt(activityItems: unknown[]) {
  const groups = new Map<string, ChatGptCompatibleConversation>()
  const range: { start?: string; end?: string } = {}
  let messageCount = 0

  for (let itemIndex = 0; itemIndex < activityItems.length; ++itemIndex) {
    const item = activityItems[itemIndex]
    if (!isRecord(item)) {
      continue
    }

    const url = geminiUrlFromActivity(item, itemIndex)
    const title = geminiTitleText(item.title)
    const htmlText = geminiHtmlText(item)
    const text = htmlText || title
    if (!text.trim()) {
      continue
    }

    messageCount += 1
    updateDateRange(range, item.time)
    const conversationNumber = groups.size + 1
    const date = dateLabel(item.time)
    const conversation = groups.get(url) ?? {
      id: url,
      title: date ? `Gemini Conversation ${conversationNumber} (${date})` : `Gemini Conversation ${conversationNumber}`,
      create_time: stringValue(item.time),
      update_time: stringValue(item.time),
      messages: [],
    }

    if (!conversation.create_time || stringValue(item.time) < conversation.create_time) {
      conversation.create_time = stringValue(item.time)
    }
    if (!conversation.update_time || stringValue(item.time) > conversation.update_time) {
      conversation.update_time = stringValue(item.time)
    }

    conversation.messages.push({
      message: {
        id: `${url}:activity-${itemIndex + 1}`,
        author: {
          role: "user",
        },
        create_time: stringValue(item.time),
        content: {
          content_type: "text",
          parts: [text],
        },
      },
    })

    groups.set(url, conversation)
  }

  const conversations = [...groups.values()].filter((conversation) => conversation.messages.length > 0)
  if (conversations.length === 0) {
    throw new Error("Gemini MyActivity.json did not contain any readable activity text.")
  }

  return {
    bytes: new TextEncoder().encode(JSON.stringify(conversations)),
    conversationCount: conversations.length,
    messageCount,
    dateRangeStart: range.start,
    dateRangeEnd: range.end,
  }
}

export async function extractConversationJsonBytes(file: File): Promise<ExtractedConversationJson> {
  const { entries, archiveEntryCount } = await extractRelevantZipEntries(file)
  const decoder = new TextDecoder()
  const geminiActivityFile = entries.find((entry) => isGeminiActivityPath(entry.path))

  if (geminiActivityFile) {
    const { path, bytes } = geminiActivityFile
    const activityItems = parseJsonArray(decoder.decode(bytes), path)
    const converted = convertGeminiActivityToChatGpt(activityItems)
    return {
      bytes: converted.bytes,
      jsonFileCount: 1,
      totalJsonBytes: bytes.byteLength,
      sourceKind: "gemini",
      sourceLabel: "Gemini",
      sourceType: "Google Takeout / My Activity",
      conversationCount: converted.conversationCount,
      messageCount: converted.messageCount,
      attachmentCount: Math.max(0, archiveEntryCount - 1),
      fileCount: Math.max(0, archiveEntryCount - 1),
      dateRangeStart: converted.dateRangeStart,
      dateRangeEnd: converted.dateRangeEnd,
    }
  }

  const conversationFiles = entries
    .filter((entry) => isConversationJsonPath(entry.path))
    .sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }))

  if (conversationFiles.length === 0) {
    throw new Error("No supported ChatGPT, Claude, or Gemini conversation data was found in this export ZIP.")
  }

  const totalJsonBytes = conversationFiles.reduce((total, entry) => total + entry.bytes.byteLength, 0)
  const firstShardConversations = parseJsonArray(decoder.decode(conversationFiles[0].bytes), conversationFiles[0].path)
  const sourceKind = detectConversationSource(firstShardConversations)

  if (sourceKind === "chatgpt") {
    const conversations = conversationFiles.flatMap((entry) => parseJsonArray(decoder.decode(entry.bytes), entry.path))
    const metadata = chatGptMetadata(conversations)
    const libraryMetadata = entries.find((entry) => libraryMetadataPattern.test(entry.path))
    const codeFiles = libraryMetadata ? selectCodeFilesFromLibraryMetadata(parseJsonArray(decoder.decode(libraryMetadata.bytes), libraryMetadata.path)) : []
    return {
      bytes: combineJsonArrayShards(conversationFiles),
      jsonFileCount: conversationFiles.length,
      totalJsonBytes,
      sourceKind,
      sourceLabel: "ChatGPT",
      sourceType: "ChatGPT export",
      ...metadata,
      attachmentCount: codeFiles.length,
      fileCount: codeFiles.length,
      codeFiles,
    }
  }

  if (sourceKind === "claude") {
    const conversations = conversationFiles.flatMap((entry) => parseJsonArray(decoder.decode(entry.bytes), entry.path))
    const metadata = claudeMetadata(conversations)
    return {
      bytes: convertClaudeToChatGptBytes(conversations),
      jsonFileCount: conversationFiles.length,
      totalJsonBytes,
      sourceKind,
      sourceLabel: "Claude",
      sourceType: "Claude export",
      ...metadata,
    }
  }

  throw new Error("The export ZIP contains conversation JSON, but it does not look like a supported ChatGPT or Claude export.")
}

export type ExtractedCodeAttachment = {
  fileId: string
  fileName: string
  sourcePath: string
  conversationExternalId: string
  origin: "ATTACHED_FILE" | "NESTED_ARCHIVE_FILE"
  language: string
  content: string
}

const CODE_IMPORT_MAX_BYTES = 64 * 1024 * 1024
const CODE_IMPORT_MAX_SINGLE_BYTES = 32 * 1024 * 1024

async function* fileChunks(file: File): AsyncGenerator<Uint8Array> {
  const reader = file.stream().getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value?.byteLength) yield value
    }
  } finally {
    reader.releaseLock()
  }
}

async function* byteChunks(bytes: Uint8Array): AsyncGenerator<Uint8Array> {
  for (let offset = 0; offset < bytes.length; offset += 1024 * 1024) {
    yield bytes.subarray(offset, offset + 1024 * 1024)
  }
}

/** Bounded streaming unzip: only selected members are decompressed or retained. */
async function selectedZipMembers(
  chunks: AsyncIterable<Uint8Array>,
  select: (path: string) => boolean,
  maxTotalBytes = CODE_IMPORT_MAX_BYTES,
): Promise<Array<{ path: string; bytes: Uint8Array }>> {
  const found: Array<{ path: string; bytes: Uint8Array }> = []
  let pending = 0
  let finished = false
  let settled = false
  let total = 0
  let entriesSeen = 0
  return await new Promise((resolve, reject) => {
    const finish = () => {
      if (!settled && finished && pending === 0) {
        settled = true
        resolve(found.sort((a, b) => a.path.localeCompare(b.path)))
      }
    }
    const fail = (reason: unknown) => {
      if (settled) return
      settled = true
      reject(reason instanceof Error ? reason : new Error(String(reason)))
    }
    const zip = new Unzip((entry) => {
      if (settled) return
      if (++entriesSeen > BRAIN2_ARCHIVE_MAX_ENTRIES) return fail(new Error("ZIP entry limit exceeded during code discovery."))
      let path: string
      try { path = normalizeBrain2ArchiveEntryPath(entry.name) } catch (error) { fail(error); return }
      if (!select(path)) return
      pending++
      const buffers: Uint8Array[] = []
      let size = 0
      entry.ondata = (error, chunk, final) => {
        if (settled) return
        if (error) return fail(error)
        if (chunk.length) {
          size += chunk.length
          total += chunk.length
          if (size > CODE_IMPORT_MAX_SINGLE_BYTES || total > maxTotalBytes) {
            return fail(new Error("Code attachment exceeded bounded extraction budget."))
          }
          buffers.push(chunk)
        }
        if (!final) return
        const bytes = new Uint8Array(size)
        let offset = 0
        for (const buffer of buffers) { bytes.set(buffer, offset); offset += buffer.length }
        found.push({ path, bytes })
        pending--
        finish()
      }
      entry.start()
    })
    zip.register(AsyncUnzipInflate)
    void (async () => {
      try {
        for await (const chunk of chunks) {
          if (settled) return
          zip.push(chunk, false)
        }
        zip.push(new Uint8Array(0), true)
        finished = true
        finish()
      } catch (error) { fail(error) }
    })()
  })
}

/** Historical ChatGPT ZIP -> actual source attachments, without needing a second user upload. */
export async function extractChatGptCodeAttachments(
  file: File, manifest: CodeFileMetadata[],
): Promise<ExtractedCodeAttachment[]> {
  if (!manifest.length) return []
  const byFileId = new Map(manifest.map((record) => [record.fileId, record]))
  const members = await selectedZipMembers(fileChunks(file), (path) => {
    if (!path.endsWith(".dat")) return false
    const name = path.split("/").pop() ?? ""
    return byFileId.has(name.slice(0, -4))
  })
  const decoder = new TextDecoder("utf-8", { fatal: true })
  const files: ExtractedCodeAttachment[] = []
  for (const member of members) {
    const name = member.path.split("/").pop() ?? ""
    const meta = byFileId.get(name.slice(0, -4))
    if (!meta) continue
    if (meta.isNestedArchive) {
      const nested = await selectedZipMembers(byteChunks(member.bytes), (path) => {
        if (!safeSourcePath(path) || path.endsWith("/")) return false
        if (!languageForFilename(path)) return false
        // Android resource XML is source; generated and build output is not.
        if (path.endsWith(".xml") && !path.startsWith("android/app/src/")) return false
        return true
      }, 24 * 1024 * 1024)
      for (const entry of nested) {
        try {
          const content = decoder.decode(entry.bytes)
          if (!safeCodeContent(content)) continue
          files.push({ fileId: meta.fileId, fileName: entry.path.split("/").pop() ?? meta.fileName,
            sourcePath: `${meta.fileName}:${entry.path}`, conversationExternalId: meta.conversationExternalId,
            origin: "NESTED_ARCHIVE_FILE", language: languageForFilename(entry.path) ?? "unknown", content })
        } catch { /* Invalid UTF-8 is not source text. */ }
      }
      continue
    }
    try {
      const content = decoder.decode(member.bytes)
      if (!safeCodeContent(content)) continue
      files.push({ fileId: meta.fileId, fileName: meta.fileName,
        sourcePath: meta.fileName, conversationExternalId: meta.conversationExternalId,
        origin: "ATTACHED_FILE", language: languageForFilename(meta.fileName) ?? "unknown", content })
    } catch { /* Binary attachments are never rendered as source code. */ }
  }
  return files.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath) || a.fileId.localeCompare(b.fileId))
}
