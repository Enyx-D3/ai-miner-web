"use client";

import Link from "next/link";
import {
  Archive,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Database,
  FileCheck2,
  FileSearch,
  FolderKanban,
  KeyRound,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Kind = "how" | "features" | "docs";

const copy = {
  how: {
    eyebrow: "How It Works",
    badge: "Deterministic Pipeline",
    title: "From scattered AI history to source-backed working memory.",
    intro:
      "Brain2 AI Miner keeps ingestion, deterministic structure, human-visible evidence, and runtime execution as clean, separable layers.",
    cards: [
      [
        Archive,
        "1 · MINE",
        "Import ChatGPT, Claude, or Gemini history. Normalize conversations, de-duplicate messages, and preserve stable source identity.",
      ],
      [
        Database,
        "2 · STRUCTURE",
        "Extract deterministic atoms, project identities, Current Truth candidates, decisions, Ticks, and lineage into local memory.",
      ],
      [
        BrainCircuit,
        "3 · MAKE",
        "Use the reconstructed project state as bounded task context for connected AI or local runtimes instead of re-sending an entire life archive.",
      ],
      [
        FileCheck2,
        "4 · VERIFY / REPAIR",
        "Keep output verification and targeted repair explicit. Runtime-backed verification is not shown as available until it is actually connected.",
      ],
    ],
  },
  features: {
    eyebrow: "Features",
    badge: "Local-First Architecture",
    title: "The useful layer is inspectable, portable, and local-first.",
    intro:
      "V4 focuses the web application on functionality that is real in the browser today while retaining contracts for extension, mobile, and runtime expansion.",
    cards: [
      [
        Search,
        "Search & Recall",
        "Find canonical source text, current candidates, superseded history, evidence, and Forgotten Gold with instant full-text filtering.",
      ],
      [
        FolderKanban,
        "Projects & Live Notebooks",
        "Resolve conversations into project identity and compile NOW, findings, evidence, Wiki, Ticks, patterns, and experiments.",
      ],
      [
        BookOpen,
        "LifeWiki",
        "Build readable project knowledge projections without replacing or corrupting the underlying source atoms.",
      ],
      [
        Database,
        "Portable .B2M Vault",
        "Export and restore the Brain2 memory state; optionally encrypt the package client-side with PBKDF2-SHA256 and AES-256-GCM.",
      ],
      [
        ShieldCheck,
        "Technical Truth",
        "Operations screens mark unavailable model, P2P, and mobile runtimes as unavailable rather than simulating fake connectivity.",
      ],
      [
        KeyRound,
        "Encrypted Extension Queue",
        "The included Chrome extension uses an in-memory vault key and persists captured records only as authenticated ciphertext.",
      ],
    ],
  },
  docs: {
    eyebrow: "Documentation",
    badge: "Quickstart Guide",
    title: "Run Brain2 AI Miner locally.",
    intro:
      "The repository is a Next.js application. The canonical web workspace runs without configured external APIs because its memory layer is 100% local-first.",
    cards: [
      [
        Archive,
        "Import History",
        "Open Memory / .B2M and select an exported ZIP from ChatGPT, Claude, or Gemini. The parser normalizes supported provider formats into canonical messages.",
      ],
      [
        FileSearch,
        "Inspect Provenance",
        "Use Conversations, Timeline, Search, Decisions, and project Evidence to trace derived objects back to exact source text and timestamps.",
      ],
      [
        Database,
        "Back Up Memory",
        "Export a .B2M snapshot anytime. Add a passphrase when you want the exported payload encrypted with PBKDF2-SHA256 + AES-256-GCM.",
      ],
      [
        KeyRound,
        "Chrome Extension",
        "Load the /extension directory as an unpacked Chrome extension, unlock its local vault, and set your AI Miner web origin for seamless background ingestion.",
      ],
    ],
  },
} as const;

export default function Brain2PublicInfo({ kind }: { kind: Kind }) {
  const section = copy[kind];

  return (
    <main className="relative overflow-hidden bg-white text-slate-900 selection:bg-blue-600 selection:text-white font-sans">
      {/* Background Ambient Glows */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-gradient-to-b from-sky-400/20 via-purple-400/10 to-transparent blur-[120px]" />
      </div>

      {/* Header Section */}
      <section className="relative border-b border-slate-200/60 px-6 pt-36 pb-20 sm:pt-40 sm:pb-24 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/60 px-4 py-1.5 shadow-[0_4px_20px_rgba(15,30,60,0.04)] backdrop-blur-xl">
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">
              {section.badge}
            </span>
            <span className="text-xs font-medium text-slate-700">
              {section.eyebrow}
            </span>
          </div>

          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-slate-900 leading-[1.15]">
            {section.title}
          </h1>

          <p className="mt-5 max-w-3xl text-base sm:text-lg font-normal leading-relaxed text-slate-600">
            {section.intro}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full bg-slate-900 px-7 text-sm font-medium text-white shadow-md transition-all hover:bg-blue-600 hover:scale-105 active:scale-95"
            >
              <Link href="/dashboard" className="flex items-center gap-2">
                <span>Open AI Miner</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-slate-200/90 bg-white/80 px-7 text-sm font-medium text-slate-800 shadow-sm backdrop-blur-md transition-all hover:bg-white hover:text-blue-600 hover:scale-105 active:scale-95"
            >
              <Link href="/memory">Import history</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Cards Grid */}
      <section className="relative px-6 py-20 lg:px-8">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2">
          {section.cards.map(([Icon, title, text]) => (
            <div
              key={title}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/80 bg-white/60 p-7 shadow-[0_8px_30px_rgba(15,30,60,0.04)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:bg-white/90 hover:shadow-[0_16px_36px_rgba(24,100,255,0.08)]"
            >
              <div>
                <span className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-110">
                  <Icon className="size-5" />
                </span>
                <h2 className="mt-5 text-lg font-medium text-slate-900">
                  {title}
                </h2>
                <p className="mt-2 text-xs font-normal leading-relaxed text-slate-600">
                  {text}
                </p>
              </div>
              <div className="mt-6 flex items-center gap-1.5 text-xs font-medium text-blue-600 opacity-80 group-hover:opacity-100 transition-opacity">
                <span>Verified feature</span>
                <Sparkles className="size-3" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
