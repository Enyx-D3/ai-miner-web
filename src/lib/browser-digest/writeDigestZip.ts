import { zipSync } from "fflate"
import type { DigestMarkdownFile } from "../contextvault-wasm/loadContextVault"

export async function writeDigestZip(files: DigestMarkdownFile[]): Promise<Blob> {
  const encoder = new TextEncoder()
  const entries: Record<string, Uint8Array> = {}

  for (const file of files) {
    const normalizedPath = file.path.replace(/\\/g, "/").replace(/^\/+/, "")
    if (!normalizedPath || normalizedPath.includes("..")) {
      throw new Error(`Unsafe digest file path: ${file.path}`)
    }
    entries[normalizedPath] = encoder.encode(file.content)
  }

  return new Blob([zipSync(entries)], { type: "application/zip" })
}
