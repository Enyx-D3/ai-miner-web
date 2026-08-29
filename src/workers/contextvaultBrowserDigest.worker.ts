/// <reference lib="webworker" />

import { extractConversationJsonBytes, type BrowserDigestSourceKind } from "../lib/browser-digest/readChatGptZip"
import { writeDigestZip } from "../lib/browser-digest/writeDigestZip"
import {
  digestChatGptJsonSummary,
  digestChatGptJsonToMarkdown,
  preloadContextVaultWasm,
  type DigestMarkdownFile,
  type DigestSummary,
  type MarkdownDigestResult,
} from "../lib/contextvault-wasm/loadContextVault"

export type BrowserDigestStage =
  | "reading_zip"
  | "extracting_json"
  | "loading_wasm"
  | "processing_wasm"
  | "writing_zip"
  | "completed"
  | "failed"

export type BrowserDigestStats = {
  sourceKind: BrowserDigestSourceKind
  sourceLabel: string
  sourceType: string
  conversationCount: number
  messageCount: number
  attachmentCount: number
  fileCount: number
  dateRangeStart?: string
  dateRangeEnd?: string
  inputZipBytes: number
  jsonBytes: number
  jsonFileCount: number
  zipReadTimeMs: number
  wasmLoadTimeMs: number
  wasmProcessingTimeMs: number
  outputZipTimeMs?: number
  outputZipBytes?: number
  totalTimeMs: number
  paragraphs?: number
  atoms?: number
  threads?: number
  topicFiles?: number
}

export type DigestOutputPreview = {
  indexMarkdown: string
}

export type WorkerRequest =
  | { type: "start"; file: File }
  | { type: "cancel" }

export type WorkerEvent =
  | { type: "progress"; stage: BrowserDigestStage; message: string; percent?: number }
  | {
      type: "done"
      summary: DigestSummary
      stats: BrowserDigestStats
      outputZip: Blob
      outputFileName: string
      preview: DigestOutputPreview
    }
  | { type: "error"; error: string }

const ctx = self as unknown as DedicatedWorkerGlobalScope

let cancelled = false

function formatDateRange(start?: string, end?: string): string {
  if (!start && !end) {
    return "Not available"
  }
  const first = start ? start.slice(0, 10) : "Unknown"
  const last = end ? end.slice(0, 10) : "Unknown"
  return first === last ? first : `${first} to ${last}`
}

function replaceIndexOverview(content: string, digest: MarkdownDigestResult, maxMessagesPerFile: number, stats: BrowserDigestStats): string {
  const topicsStart = content.indexOf("## Topics")
  const topicsSection = topicsStart >= 0
    ? content.slice(topicsStart).trim().replace(/(\d+) atoms, /g, "$1 conversation items, ")
    : "## Topics\n"
  const howToUse = [
    "1. Open `index.md` to see the archive map.",
    "2. Open any file in `topics/` to read grouped conversation content.",
    "3. Download and use `analysis_prompt.md` with your preferred AI tool for deeper analysis.",
  ]

  if (stats.sourceKind === "gemini") {
    howToUse.push("4. Treat Gemini results as activity-based groups from Google Takeout, not perfect chat threads.")
  }

  return [
    `# ${stats.sourceLabel} Export Digest`,
    "",
    "## Overview",
    "",
    `- Platform: ${stats.sourceLabel}`,
    `- Source type: ${stats.sourceType}`,
    `- Conversation/activity files scanned: ${stats.jsonFileCount}`,
    `- Conversations or groups: ${stats.conversationCount}`,
    `- Messages or activity items: ${stats.messageCount}`,
    `- Paragraphs: ${digest.stats.paragraphs}`,
    `- Conversation Items: ${digest.stats.atoms}`,
    `- Topic files written: ${digest.stats.topic_files}`,
    `- Attachments detected: ${stats.attachmentCount}`,
    `- Files detected: ${stats.fileCount}`,
    `- Date range: ${formatDateRange(stats.dateRangeStart, stats.dateRangeEnd)}`,
    `- Max messages per file: ${maxMessagesPerFile}`,
    "",
    "## How to Use This Archive",
    "",
    ...howToUse,
    "",
    topicsSection,
    "",
  ].join("\n")
}

function prepareDigestFiles(digest: MarkdownDigestResult, maxMessagesPerFile: number, stats: BrowserDigestStats): DigestMarkdownFile[] {
  return digest.files
    .filter((entry) => entry.path.replace(/\\/g, "/").toLowerCase() !== "stats/browser_processing_stats.md")
    .map((entry) => {
      if (entry.path.replace(/\\/g, "/").toLowerCase() !== "index.md") {
        return {
          ...entry,
          content: entry.content.replaceAll("Atoms in topic part", "Conversation items in topic part"),
        }
      }

      return {
        ...entry,
        content: replaceIndexOverview(entry.content, digest, maxMessagesPerFile, stats),
      }
    })
}

function postProgress(stage: BrowserDigestStage, message: string, percent?: number) {
  ctx.postMessage({ type: "progress", stage, message, percent } satisfies WorkerEvent)
}

function elapsedSince(start: number): number {
  return Math.round(performance.now() - start)
}

async function runDigest(file: File) {
  cancelled = false
  const totalStartedAt = performance.now()
  let zipReadTimeMs = 0
  let wasmLoadTimeMs = 0
  let wasmProcessingTimeMs = 0
  let outputZipTimeMs = 0

  try {
    postProgress("reading_zip", "Reading export ZIP", 5)
    postProgress("extracting_json", "Detecting export source and extracting conversation JSON", 20)
    const zipStartedAt = performance.now()
    const extracted = await extractConversationJsonBytes(file)
    zipReadTimeMs = elapsedSince(zipStartedAt)

    if (cancelled) {
      return
    }

    postProgress("loading_wasm", "Loading ContextVault WASM", 45)
    const wasmLoadStartedAt = performance.now()
    await preloadContextVaultWasm()
    wasmLoadTimeMs = elapsedSince(wasmLoadStartedAt)

    if (cancelled) {
      return
    }

    postProgress("processing_wasm", `Importing ${extracted.sourceLabel} conversations`, 65)
    const wasmProcessingStartedAt = performance.now()
    const summary = await digestChatGptJsonSummary(extracted.bytes, file.name)
    const maxMessagesPerFile = 100
    const markdownDigest = await digestChatGptJsonToMarkdown(extracted.bytes, {
      max_messages_per_file: maxMessagesPerFile,
      include_system: false,
    })
    const stats: BrowserDigestStats = {
      sourceKind: extracted.sourceKind,
      sourceLabel: extracted.sourceLabel,
      sourceType: extracted.sourceType,
      conversationCount: extracted.conversationCount,
      messageCount: extracted.messageCount,
      attachmentCount: extracted.attachmentCount,
      fileCount: extracted.fileCount,
      dateRangeStart: extracted.dateRangeStart,
      dateRangeEnd: extracted.dateRangeEnd,
      inputZipBytes: file.size,
      jsonBytes: extracted.bytes.byteLength,
      jsonFileCount: extracted.jsonFileCount,
      zipReadTimeMs,
      wasmLoadTimeMs,
      wasmProcessingTimeMs: 0,
      totalTimeMs: 0,
      paragraphs: summary.paragraphs,
      atoms: summary.atoms,
      threads: summary.threads,
      topicFiles: markdownDigest.stats.topic_files,
    }
    const digestFiles = prepareDigestFiles(markdownDigest, maxMessagesPerFile, stats)
    wasmProcessingTimeMs = elapsedSince(wasmProcessingStartedAt)
    stats.wasmProcessingTimeMs = wasmProcessingTimeMs

    if (cancelled) {
      return
    }

    postProgress("writing_zip", "Packaging markdown digest ZIP", 88)
    const outputZipStartedAt = performance.now()
    const outputZip = await writeDigestZip(digestFiles)
    outputZipTimeMs = elapsedSince(outputZipStartedAt)

    if (cancelled) {
      return
    }

    stats.outputZipTimeMs = outputZipTimeMs
    stats.outputZipBytes = outputZip.size
    stats.totalTimeMs = elapsedSince(totalStartedAt)

    postProgress("completed", "Markdown digest ZIP completed", 100)
    const indexFile = digestFiles.find((entry) => entry.path.replace(/\\/g, "/").toLowerCase().endsWith("index.md"))
    ctx.postMessage({
      type: "done",
      summary,
      stats,
      outputZip,
      outputFileName: `digest-${extracted.sourceLabel}.zip`,
      preview: {
        indexMarkdown: indexFile?.content ?? "",
      },
    } satisfies WorkerEvent)
  } catch (error) {
    postProgress("failed", "Browser digest failed")
    ctx.postMessage({
      type: "error",
      error: error instanceof Error ? error.message : String(error),
    } satisfies WorkerEvent)
  }
}

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  if (event.data.type === "cancel") {
    cancelled = true
    postProgress("failed", "Digest cancelled")
    return
  }

  void runDigest(event.data.file)
}
