"use client";

import { Button } from "@/components/ui/button";
import { useV0DigestSnapshot } from "@/legacy/refinery/lib/v0DigestStore";

interface ScanResultsProps {
  onNavigate: (page: string) => void;
}

function formatBytes(bytes: number | undefined): string {
  if (!Number.isFinite(bytes) || !bytes || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatMs(ms: number | undefined): string {
  if (!Number.isFinite(ms) || !ms) {
    return "0 ms";
  }

  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`;
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-white p-4 text-center" style={{ borderColor: "var(--border)" }}>
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </div>
      <div className="font-tight text-lg font-bold" style={{ color: "var(--foreground)" }}>
        {value}
      </div>
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0" style={{ borderColor: "var(--border)" }}>
      <span className="text-sm" style={{ color: "var(--secondary-text)" }}>
        {label}
      </span>
      <strong className="text-right text-sm" style={{ color: "var(--foreground)" }}>
        {value}
      </strong>
    </div>
  );
}

export default function ScanResultsScreen({ onNavigate }: ScanResultsProps) {
  const digest = useV0DigestSnapshot();
  const result = digest.result;
  const stats = result?.stats;
  const summary = result?.summary;
  const preview = result?.preview;

  if (!result || !stats || !summary || !preview) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6" style={{ background: "var(--secondary)" }}>
        <div className="max-w-md rounded-2xl border bg-white p-8 text-center" style={{ borderColor: "var(--border)" }}>
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[var(--pink-soft)] text-[var(--pink)]">!</div>
          <h1 className="font-tight text-2xl font-extrabold tracking-[-0.025em]" style={{ color: "var(--foreground)" }}>
            No scan result yet
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--secondary-text)" }}>
            Choose a ChatGPT, Claude, or Gemini export ZIP and run the local browser scan first.
          </p>
          <Button variant="ghost" size="auto" onClick={() => onNavigate("upload")} className="btn-blue mt-6 w-full rounded-xl py-3 text-sm font-bold">
            Upload Export ZIP
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--secondary)" }}>
      <div className="mx-auto max-w-6xl px-6 py-6 lg:px-8">
        <div className="mb-3">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold" style={{ background: "#dcfce7", color: "#16a34a", borderColor: "#bbf7d0" }}>
              <span className="size-1.5 rounded-full" style={{ background: "#16a34a" }} /> LOCAL DIGEST COMPLETE
            </div>
            <h1 className="font-tight text-[clamp(26px,4vw,40px)] font-extrabold tracking-[-0.025em]" style={{ color: "var(--foreground)" }}>
              Your digest is ready
            </h1>
            <p className="mt-2 text-sm" style={{ color: "var(--secondary-text)" }}>
              Processed locally in your browser. Your conversation contents were not uploaded.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <MetricCard label="Paragraphs" value={summary.paragraphs.toLocaleString()} />
              <MetricCard label="Conversation Items" value={summary.atoms.toLocaleString()} />
              <MetricCard label="Threads" value={summary.threads.toLocaleString()} />
              <MetricCard label="Topic Files" value={(stats.topicFiles ?? 0).toLocaleString()} />
              <MetricCard label="JSON Files" value={stats.jsonFileCount} />
              <MetricCard label="Total Time" value={formatMs(stats.totalTimeMs)} />
            </div>

            <div className="rounded-2xl border bg-white p-6" style={{ borderColor: "var(--border)" }}>
              <h2 className="font-tight mb-4 text-base font-bold" style={{ color: "var(--foreground)" }}>
                Run Metrics
              </h2>
              <div className="grid gap-x-8 sm:grid-cols-2">
                <div>
                  <ResultRow label="Input ZIP" value={formatBytes(stats.inputZipBytes)} />
                  <ResultRow label="Platform" value={stats.sourceLabel} />
                  <ResultRow label="Conversation JSON" value={formatBytes(stats.jsonBytes)} />
                  <ResultRow label="Output ZIP" value={formatBytes(stats.outputZipBytes)} />
                  <ResultRow label="JSON files" value={stats.jsonFileCount} />
                  <ResultRow label="Topic files" value={(stats.topicFiles ?? 0).toLocaleString()} />
                </div>
                <div>
                  <ResultRow label="ZIP read" value={formatMs(stats.zipReadTimeMs)} />
                  <ResultRow label="WASM load" value={formatMs(stats.wasmLoadTimeMs)} />
                  <ResultRow label="WASM processing" value={formatMs(stats.wasmProcessingTimeMs)} />
                  <ResultRow label="Output ZIP time" value={formatMs(stats.outputZipTimeMs)} />
                  <ResultRow label="Total" value={formatMs(stats.totalTimeMs)} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-6" style={{ borderColor: "var(--border)" }}>
              <h2 className="font-tight mb-3 text-base font-bold" style={{ color: "var(--foreground)" }}>
                What V0 Created
              </h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Markdown digest files", "Organized digest content generated by ContextVault WASM."],
                  ["Run summary", "Paragraph, conversation item, thread, topic file, and timing metrics."],
                  ["Portable ZIP", "A downloadable digest.zip created in your browser."],
                ].map(([title, description]) => (
                  <div key={title} className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--secondary)" }}>
                    <h3 className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{title}</h3>
                    <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--secondary-text)" }}>{description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-6" style={{ borderColor: "var(--border)" }}>
              <h2 className="font-tight mb-4 text-base font-bold" style={{ color: "var(--foreground)" }}>
                index.md Preview
              </h2>
              {preview.indexMarkdown ? (
                <pre className="max-h-[640px] overflow-auto whitespace-pre-wrap rounded-xl border p-4 text-xs leading-relaxed" style={{ borderColor: "var(--border)", color: "var(--secondary-text)", background: "var(--secondary)" }}>
                  {preview.indexMarkdown}
                </pre>
              ) : (
                <p className="rounded-xl border p-4 text-sm" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)", background: "var(--secondary)" }}>
                  index.md was not found in this digest output.
                </p>
              )}
            </div>
          </div>

          <div>
            <div className="sticky top-16 rounded-2xl border bg-white p-5" style={{ borderColor: "var(--border)", boxShadow: "0 4px 20px rgba(5,8,23,0.07)" }}>
              <h2 className="font-tight mb-1 text-xl font-bold tracking-[-0.02em]" style={{ color: "var(--foreground)" }}>
                Download Archive
              </h2>
              <p className="mb-5 text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                Download the digest archive and a separate prompt for deeper analysis in your preferred AI tool.
              </p>
              {stats.sourceKind === "gemini" ? (
                <div className="mb-5 rounded-xl border p-4" style={{ borderColor: "#bfdbfe", background: "var(--blue-soft)" }}>
                  <div className="mb-1 text-xs font-bold" style={{ color: "var(--blue)" }}>
                    Gemini Takeout note
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--secondary-text)" }}>
                    Built from Google My Activity / Takeout. V0 extracts activity text and groups it by Gemini conversation URL, so structure may be approximate.
                  </p>
                </div>
              ) : null}
              <div className="mb-5 rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--secondary)" }}>
                <ResultRow label="Archive" value={result.outputFileName} />
                <ResultRow label="Archive size" value={formatBytes(stats.outputZipBytes)} />
                <ResultRow label="Prompt" value={result.analysisPromptFileName} />
              </div>
              <Button asChild variant="ghost" size="auto" className="btn-pink mb-3 w-full rounded-xl py-3.5 text-sm font-bold">
                <a href={result.outputUrl} download={result.outputFileName}>
                  Download {result.outputFileName}
                </a>
              </Button>
              <Button asChild variant="ghost" size="auto" className="mb-3 w-full rounded-xl border py-3 text-sm font-bold transition-all hover:bg-[#f6f8fc]" style={{ borderColor: "var(--border)", color: "var(--secondary-text)" }}>
                <a href={result.analysisPromptUrl} download={result.analysisPromptFileName}>
                  Download analysis_prompt.md
                </a>
              </Button>
              <Button variant="ghost" size="auto" onClick={() => onNavigate("upload")} className="w-full rounded-xl border py-3 text-sm font-bold transition-all hover:bg-[#f6f8fc]" style={{ borderColor: "var(--border)", color: "var(--secondary-text)" }}>
                Process Another Export
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
