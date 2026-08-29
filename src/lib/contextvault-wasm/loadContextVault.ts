export type DigestSummary = {
  source: string
  title: string
  paragraphs: number
  atoms: number
  threads: number
  source_kind: "chatgpt"
}

export type DigestMarkdownFile = {
  path: string
  content: string
}

export type MarkdownDigestResult = {
  files: DigestMarkdownFile[]
  stats: {
    paragraphs: number
    atoms: number
    threads: number
    topic_files: number
  }
}

type ContextVaultModule = {
  HEAPU8: Uint8Array
  HEAPU32: Uint32Array
  _malloc(size: number): number
  _free(ptr: number): void
  _cv_digest_chatgpt_json_summary_out(
    jsonPtr: number,
    jsonSize: number,
    sourceNamePtr: number,
    resultPtr: number,
  ): number
  _cv_digest_chatgpt_json_to_markdown_out(
    jsonPtr: number,
    jsonSize: number,
    optionsJsonPtr: number,
    resultPtr: number,
  ): number
  _cv_free_browser_digest_result_ptr(resultPtr: number): void
}

type ContextVaultFactory = (options?: {
  locateFile?: (path: string, prefix: string) => string
}) => Promise<ContextVaultModule>

const RESULT_STRUCT_BYTES = 16
let modulePromise: Promise<ContextVaultModule> | undefined

function assertDigestSummary(value: unknown): DigestSummary {
  if (typeof value !== "object" || value === null) {
    throw new Error("ContextVault returned a non-object digest summary.")
  }

  const summary = value as Partial<DigestSummary>
  if (
    typeof summary.source !== "string" ||
    typeof summary.title !== "string" ||
    typeof summary.paragraphs !== "number" ||
    typeof summary.atoms !== "number" ||
    typeof summary.threads !== "number" ||
    summary.source_kind !== "chatgpt"
  ) {
    throw new Error("ContextVault returned an invalid digest summary shape.")
  }

  return summary as DigestSummary
}

function assertMarkdownDigestResult(value: unknown): MarkdownDigestResult {
  if (typeof value !== "object" || value === null) {
    throw new Error("ContextVault returned a non-object markdown digest.")
  }

  const result = value as Partial<MarkdownDigestResult>
  if (!Array.isArray(result.files) || typeof result.stats !== "object" || result.stats === null) {
    throw new Error("ContextVault returned an invalid markdown digest shape.")
  }

  for (const file of result.files) {
    if (
      typeof file !== "object" ||
      file === null ||
      typeof (file as Partial<DigestMarkdownFile>).path !== "string" ||
      typeof (file as Partial<DigestMarkdownFile>).content !== "string"
    ) {
      throw new Error("ContextVault returned an invalid markdown file entry.")
    }
  }

  const stats = result.stats as Partial<MarkdownDigestResult["stats"]>
  if (
    typeof stats.paragraphs !== "number" ||
    typeof stats.atoms !== "number" ||
    typeof stats.threads !== "number" ||
    typeof stats.topic_files !== "number"
  ) {
    throw new Error("ContextVault returned invalid markdown digest stats.")
  }

  return result as MarkdownDigestResult
}

async function importPublicEsmModule<T>(specifier: string): Promise<T> {
  const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<T>
  return dynamicImport(specifier)
}

function publicAssetUrl(path: string): string {
  const origin = globalThis.location?.origin
  return origin ? new URL(path, origin).toString() : path
}

async function loadContextVaultModule(): Promise<ContextVaultModule> {
  modulePromise ??= (async () => {
    const imported = await importPublicEsmModule<{ default: ContextVaultFactory }>(publicAssetUrl("/wasm/contextvault.js"))

    return imported.default({
      locateFile(path) {
        return path.endsWith(".wasm") ? publicAssetUrl(`/wasm/${path}`) : path
      },
    })
  })()

  return modulePromise
}

function copyBytesToWasm(module: ContextVaultModule, bytes: Uint8Array): number {
  const ptr = module._malloc(bytes.byteLength || 1)
  if (ptr === 0) {
    throw new Error("Failed to allocate WASM memory.")
  }

  module.HEAPU8.set(bytes, ptr)
  return ptr
}

function copyStringToWasm(module: ContextVaultModule, text: string): number {
  const encoded = new TextEncoder().encode(`${text}\0`)
  return copyBytesToWasm(module, encoded)
}

function readWasmString(module: ContextVaultModule, ptr: number, size: number): string {
  if (ptr === 0 || size === 0) {
    return ""
  }

  return new TextDecoder().decode(module.HEAPU8.subarray(ptr, ptr + size))
}

export async function preloadContextVaultWasm(): Promise<void> {
  await loadContextVaultModule()
}

function readResultFields(module: ContextVaultModule, resultPtr: number) {
  const words = resultPtr >> 2
  return {
    jsonPtr: module.HEAPU32[words],
    jsonSize: module.HEAPU32[words + 1],
    errorPtr: module.HEAPU32[words + 2],
    errorSize: module.HEAPU32[words + 3],
  }
}

async function callContextVaultJsonResult(
  jsonBytes: Uint8Array,
  argumentText: string,
  call: (module: ContextVaultModule, jsonPtr: number, jsonSize: number, argumentPtr: number, resultPtr: number) => number,
): Promise<unknown> {
  const module = await loadContextVaultModule()
  const jsonPtr = copyBytesToWasm(module, jsonBytes)
  const argumentPtr = copyStringToWasm(module, argumentText)
  const resultPtr = module._malloc(RESULT_STRUCT_BYTES)

  if (resultPtr === 0) {
    module._free(jsonPtr)
    module._free(argumentPtr)
    throw new Error("Failed to allocate WASM result memory.")
  }

  try {
    module.HEAPU8.fill(0, resultPtr, resultPtr + RESULT_STRUCT_BYTES)
    call(module, jsonPtr, jsonBytes.byteLength, argumentPtr, resultPtr)

    const result = readResultFields(module, resultPtr)
    if (result.errorPtr !== 0) {
      throw new Error(readWasmString(module, result.errorPtr, result.errorSize))
    }

    const json = readWasmString(module, result.jsonPtr, result.jsonSize)
    return JSON.parse(json)
  } finally {
    module._cv_free_browser_digest_result_ptr(resultPtr)
    module._free(resultPtr)
    module._free(argumentPtr)
    module._free(jsonPtr)
  }
}

export async function digestChatGptJsonSummary(
  jsonBytes: Uint8Array,
  sourceName: string,
): Promise<DigestSummary> {
  return assertDigestSummary(
    await callContextVaultJsonResult(jsonBytes, sourceName, (module, jsonPtr, jsonSize, sourceNamePtr, resultPtr) =>
      module._cv_digest_chatgpt_json_summary_out(jsonPtr, jsonSize, sourceNamePtr, resultPtr),
    ),
  )
}

export async function digestChatGptJsonToMarkdown(
  jsonBytes: Uint8Array,
  options: { max_messages_per_file?: number; include_system?: boolean } = {},
): Promise<MarkdownDigestResult> {
  return assertMarkdownDigestResult(
    await callContextVaultJsonResult(jsonBytes, JSON.stringify(options), (module, jsonPtr, jsonSize, optionsPtr, resultPtr) =>
      module._cv_digest_chatgpt_json_to_markdown_out(jsonPtr, jsonSize, optionsPtr, resultPtr),
    ),
  )
}
