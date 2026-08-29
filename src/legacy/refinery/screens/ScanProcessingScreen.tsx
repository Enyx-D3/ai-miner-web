"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  cancelV0DigestRun,
  startV0DigestRun,
  useV0DigestSnapshot,
  type V0DigestLogEntry,
} from "@/legacy/refinery/lib/v0DigestStore";
import type { BrowserDigestStage } from "@/workers/contextvaultBrowserDigest.worker";

interface ScanProcessingProps {
  onNavigate: (page: string) => void;
}

const stages: Array<{ key: BrowserDigestStage; label: string; detail: string }> = [
  { key: "reading_zip", label: "Reading ZIP", detail: "Reading your export locally" },
  { key: "extracting_json", label: "Extracting JSON", detail: "Finding conversations in the archive" },
  { key: "loading_wasm", label: "Loading Engine", detail: "Starting the ContextVault WASM engine" },
  { key: "processing_wasm", label: "Building Digest", detail: "Creating summary data and markdown files" },
  { key: "writing_zip", label: "Packaging ZIP", detail: "Packaging digest.zip in the browser" },
  { key: "completed", label: "Completed", detail: "Digest is ready to download" },
];

const stageIndex = new Map(stages.map((stage, index) => [stage.key, index]));

function LogRow({ entry }: { entry: V0DigestLogEntry }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="mt-0.5 shrink-0 font-mono text-[10px]" style={{ color: "var(--muted-foreground)" }}>
        {entry.percent ?? "--"}%
      </span>
      <span style={{ color: "var(--foreground)" }}>{entry.message}</span>
    </div>
  );
}

export default function ScanProcessingScreen({ onNavigate }: ScanProcessingProps) {
  const digest = useV0DigestSnapshot();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!digest.file) {
      onNavigate("upload");
      return;
    }

    if (!startedRef.current && !digest.running && !digest.result && !digest.error) {
      startedRef.current = true;
      startV0DigestRun();
    }
  }, [digest.error, digest.file, digest.result, digest.running, onNavigate]);

  useEffect(() => {
    if (digest.result) {
      const timer = window.setTimeout(() => onNavigate("scan-results"), 700);
      return () => window.clearTimeout(timer);
    }
  }, [digest.result, onNavigate]);

  const currentIndex = digest.stage ? stageIndex.get(digest.stage) ?? 0 : 0;
  const currentStage = stages[currentIndex] ?? stages[0];
  const logs = digest.logs.slice(-8).reverse();

  return (
    <div className="flex min-h-screen items-center justify-center px-6" style={{ background: "var(--secondary)" }}>
      <div className="w-full max-w-xl">
        <div className="mx-auto mb-10 flex max-w-md items-center gap-0">
          {["Upload Export", "Scan", "See Results"].map((step, i) => (
            <div key={step} className="flex flex-1 items-center gap-2">
              <div
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                style={i === 1 ? { background: "var(--pink)", color: "#fff" } : i === 0 ? { background: "var(--blue)", color: "#fff" } : { border: "1.5px solid var(--border)", color: "var(--muted-foreground)", background: "#fff" }}
              >
                {i === 0 ? "✓" : i + 1}
              </div>
              <span className="text-sm" style={{ fontWeight: i === 1 ? 650 : 500, color: i === 1 ? "var(--pink)" : i === 0 ? "var(--blue)" : "var(--muted-foreground)" }}>
                {step}
              </span>
              {i < 2 && <div className="mx-1 h-px flex-1" style={{ background: i < 1 ? "var(--blue)" : "var(--border)" }} />}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border bg-white p-8" style={{ borderColor: "var(--border)", boxShadow: "0 4px 24px rgba(5,8,23,0.07)" }}>
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl text-3xl" style={{ background: "var(--pink-soft)", color: "var(--pink)" }}>
              ⚡
            </div>
            <h1 className="font-tight text-[28px] font-extrabold tracking-[-0.025em]" style={{ color: "var(--foreground)" }}>
              {digest.result ? "Scan complete!" : digest.error ? "Scan failed" : "Scanning your archive..."}
            </h1>
            <p className="mt-2 text-sm" style={{ color: "var(--secondary-text)" }}>
              {digest.result ? "Preparing your results..." : digest.error ? digest.error : currentStage.detail}
            </p>
            {digest.fileMeta ? (
              <p className="mt-2 truncate text-xs" style={{ color: "var(--muted-foreground)" }}>
                {digest.fileMeta.name} · {digest.fileMeta.size} · processed locally in your browser
              </p>
            ) : null}
          </div>

          <div className="mb-6">
            <div className="mb-2 flex justify-between text-xs">
              <span style={{ fontWeight: 600, color: "var(--secondary-text)" }}>{currentStage.label}</span>
              <span className="font-tight text-[15px] font-bold" style={{ color: "var(--pink)" }}>
                {Math.round(digest.progress)}%
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full" style={{ background: "var(--surface)" }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${digest.progress}%`, background: "linear-gradient(90deg, var(--blue), var(--pink))" }} />
            </div>
          </div>

          <div className="mb-6 flex flex-col gap-2">
            {stages.map((stage, i) => {
              const done = i < currentIndex || digest.stage === "completed";
              const current = i === currentIndex && digest.stage !== "completed" && !digest.error;
              return (
                <div key={stage.key} className="flex items-center gap-3 py-1">
                  <div
                    className="flex size-5 shrink-0 items-center justify-center rounded-full text-xs transition-all"
                    style={{ background: done ? "var(--success)" : current ? "var(--pink-soft)" : "var(--surface)", color: done ? "#fff" : current ? "var(--pink)" : "var(--muted-foreground)" }}
                  >
                    {done ? "✓" : current ? "·" : `${i + 1}`}
                  </div>
                  <span className="text-sm transition-all" style={{ fontWeight: current ? 650 : 450, color: done ? "var(--success)" : current ? "var(--foreground)" : "var(--muted-foreground)" }}>
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>

          {logs.length > 0 ? (
            <div className="mb-6 rounded-xl border p-4" style={{ background: "var(--secondary)", borderColor: "var(--border)" }}>
              <div className="mb-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
                Activity log
              </div>
              <div className="flex max-h-40 flex-col gap-1.5 overflow-auto">
                {logs.map((entry) => (
                  <LogRow key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          ) : null}

          {digest.error ? (
            <div className="flex gap-3">
              <Button variant="ghost" size="auto" onClick={() => onNavigate("upload")} className="w-full rounded-xl border py-3 text-sm font-bold" style={{ borderColor: "var(--border)", color: "var(--secondary-text)" }}>
                Choose another file
              </Button>
              <Button variant="ghost" size="auto" onClick={() => startV0DigestRun()} className="btn-blue w-full rounded-xl py-3 text-sm font-bold">
                Try again
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="auto" disabled={!digest.running} onClick={cancelV0DigestRun} className="w-full rounded-xl border py-3 text-sm font-bold" style={{ borderColor: "var(--border)", color: "var(--secondary-text)" }}>
              Cancel scan
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
