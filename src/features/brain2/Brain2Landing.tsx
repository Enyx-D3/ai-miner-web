"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import {
  Archive,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  Database,
  FileCheck2,
  FolderKanban,
  LockKeyhole,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
  Layers,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroDashboardPreview } from "./components/HeroDashboardPreview";

const capabilities = [
  {
    id: "01",
    title: "Mine your AI history",
    desc: "Import ChatGPT, Claude, and Gemini exports and turn scattered conversations into one source-accounted local memory.",
    badge: "Ingestion",
    icon: Archive,
  },
  {
    id: "02",
    title: "Reconstruct real projects",
    desc: "Resolve related conversations into living project contexts instead of copying the same memory into disconnected folders.",
    badge: "Identity Resolution",
    icon: FolderKanban,
  },
  {
    id: "03",
    title: "Recall with lineage",
    desc: "Search source text, Current Truth candidates, superseded history, evidence, and resurfaced forgotten work.",
    badge: "Provenance",
    icon: Search,
  },
  {
    id: "04",
    title: "Live notebooks & Wiki",
    desc: "Compile NOW, findings, evidence, decisions, patterns, Ticks, and project Wiki views from the same canonical memory.",
    badge: "Synthesis",
    icon: BookOpen,
  },
  {
    id: "05",
    title: "MINE → MAKE → VERIFY → REPAIR",
    desc: "The product is structured around a reusable intelligence loop, with runtime work kept separate from deterministic provenance and state.",
    badge: "Intelligence Loop",
    icon: BrainCircuit,
  },
  {
    id: "06",
    title: "Portable across surfaces",
    desc: "The web app and extension share the same Brain2 contracts today, with mobile and network runtimes able to connect seamlessly.",
    badge: "Portability",
    icon: Network,
  },
];

const guarantees = [
  {
    title: "Local-First Authority",
    desc: "Your browser archive is authoritative. The web workspace stores all Brain2 memory locally in IndexedDB with zero forced cloud storage.",
    icon: LockKeyhole,
  },
  {
    title: "Source-Backed Lineage",
    desc: "Stable IDs, SHA-256 content hashes, and mutation lineage preserve exactly where important claims and facts originated.",
    icon: ShieldCheck,
  },
  {
    title: "Cryptographic Encryption",
    desc: "Optional .B2M export snapshot encryption uses industry-standard PBKDF2-SHA256 key derivation with AES-256-GCM cipher.",
    icon: Database,
  },
  {
    title: "Zero Fabricated Telemetry",
    desc: "Missing model, P2P, or mobile runtime telemetry is displayed as unavailable rather than pretending unfinished infrastructure is active.",
    icon: FileCheck2,
  },
];

const faqs = [
  {
    q: "What is Brain2 AI Miner?",
    a: "Brain2 AI Miner is a privacy-first, local intelligence workspace that ingests your scattered ChatGPT, Claude, and Gemini export archives and turns them into organized project contexts, decisions, evidence lineage, and executable intelligence.",
  },
  {
    q: "Is my AI conversation data uploaded to external servers?",
    a: "No. All ingestion, parsing, atomization, search indexing, and project resolution execute entirely within your browser environment using IndexedDB. Your raw chats and memory never leave your device without your explicit export.",
  },
  {
    q: "How does the .B2M export format work?",
    a: "The .B2M format is a portable, self-contained snapshot of your reconstructed memory. You can optionally protect it with a passphrase, which encrypts the archive locally using PBKDF2-SHA256 and AES-256-GCM before downloading.",
  },
  {
    q: "What formats and AI providers are currently supported?",
    a: "AI Miner natively parses ZIP data exports from OpenAI ChatGPT (conversations.json), Anthropic Claude, and Google Gemini, normalizing them into canonical message trees while retaining all metadata.",
  },
  {
    q: "How does evidence provenance and verification work?",
    a: "Every synthesized candidate, project summary, or extracted decision links directly back to the original source conversation turn, complete with cryptographic hash verification and timestamped evidence.",
  },
];

export default function Brain2Landing() {
  const [activeTab, setActiveTab] = useState<"chat" | "atoms" | "lineage">("chat");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const ctaRef = useRef<HTMLElement>(null);

  const handleCtaMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!ctaRef.current) return;
    const rect = ctaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctaRef.current.style.setProperty("--mouse-x", `${x}px`);
    ctaRef.current.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <main className="relative overflow-hidden bg-white text-slate-900 selection:bg-blue-600 selection:text-white font-sans font-normal">
      {/* Background Ambient Glows */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[750px] w-[1100px] rounded-full bg-gradient-to-b from-sky-400/20 via-purple-400/10 to-transparent blur-[120px]" />
        <div className="absolute top-[800px] -left-40 h-[600px] w-[600px] rounded-full bg-blue-400/10 blur-[130px]" />
        <div className="absolute top-[1600px] -right-40 h-[600px] w-[600px] rounded-full bg-purple-400/10 blur-[140px]" />
      </div>

      {/* ========================================================= */}
      {/* SECTION 1: HERO SECTION                                   */}
      {/* ========================================================= */}
      <section className="relative px-6 pt-24 pb-16 sm:pt-28 sm:pb-20 lg:pt-32 lg:pb-24 lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
          {/* Horizon Eyebrow Badge */}
          <div className="inline-flex items-center gap-2.5 rounded-full border border-white/80 bg-white/60 px-5 py-2 shadow-[0_4px_20px_rgba(15,30,60,0.04)] backdrop-blur-xl transition-transform hover:scale-105">
            <span className="text-sm sm:text-base font-normal text-slate-700">
              Brain2 AI Miner · Local-First Intelligence
            </span>
          </div>

          {/* Main Display Headline */}
          <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl xl:text-[76px] font-normal tracking-tight text-slate-900 leading-[1.12]">
            Turn years of AI conversations into{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent font-normal">
              working intelligence.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 max-w-3xl text-lg sm:text-xl font-normal leading-relaxed text-slate-600">
            AI Miner imports your ChatGPT, Claude, and Gemini history, preserves evidence, reconstructs living project contexts, and gives you a local workspace for recall, decisions, live notebooks, and durable memory.
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="h-13 rounded-full bg-slate-900 px-9 text-base font-normal text-white shadow-sm transition-all hover:bg-blue-600 hover:scale-105 active:scale-95"
            >
              <Link href="/dashboard" className="flex items-center gap-2.5">
                <span>Open AI Miner</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-13 rounded-full border-slate-200/90 bg-white/80 px-9 text-base font-normal text-slate-800 shadow-sm backdrop-blur-md transition-all hover:bg-white hover:text-blue-600 hover:scale-105 active:scale-95"
            >
              <Link href="/memory">Import AI history</Link>
            </Button>
          </div>

          {/* Micro Trust Pills */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-normal text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <LockKeyhole className="size-3.5 text-blue-600" />
              Local-first memory
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-blue-600" />
              Source-backed lineage
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Database className="size-3.5 text-blue-600" />
              Portable .B2M
            </span>
          </div>
        </div>

        {/* Hero Dashboard Preview Mockup */}
        <HeroDashboardPreview />
      </section>

      {/* ========================================================= */}
      {/* SECTION 2: MINIMAL STATEMENT INTERMISSION                 */}
      {/* ========================================================= */}
      <section className="relative border-y border-slate-200/60 bg-gradient-to-b from-slate-50/50 via-white to-slate-50/30 py-28 px-6 text-center">
        <div className="mx-auto max-w-4xl">
          <span className="text-xs font-normal uppercase tracking-[0.2em] text-blue-600">
            Unified Local Memory
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-slate-900 leading-[1.2]">
            Build beyond scattered chats. One canonical memory, infinite projections.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base font-normal leading-relaxed text-slate-600">
            Your intelligence shouldn&apos;t be trapped in isolated web chat tabs. Reconstruct your projects, decisions, and evidence directly inside your browser with zero data loss.
          </p>
        </div>
      </section>

      {/* ========================================================= */}
      {/* SECTION 3: FEATURE 01 SHOWCASE (Horizon Section 3 Style) */}
      {/* ========================================================= */}
      <section className="relative px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[28px] border border-white/80 bg-white/60 shadow-[0_20px_50px_rgba(15,30,60,0.06)] backdrop-blur-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left Content */}
            <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
              <h3 className="text-2xl sm:text-3xl lg:text-[32px] font-normal tracking-tight text-slate-900 leading-tight">
                Mine & Reconstruct your AI history
              </h3>
              <p className="mt-4 text-sm sm:text-base font-normal leading-relaxed text-slate-600">
                Import ChatGPT, Claude, and Gemini exports. Normalize conversations, de-duplicate messages, and preserve stable source identity into one source-accounted local memory.
              </p>
              <div className="mt-8 flex items-center gap-3">
                <Button
                  asChild
                  className="rounded-full bg-slate-900 px-6 font-normal text-white shadow-sm transition-all hover:bg-blue-600 hover:scale-105 active:scale-95"
                >
                  <Link href="/memory" className="flex items-center gap-2">
                    <span>Import history</span>
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="rounded-full px-5 text-sm font-normal text-slate-600 hover:text-blue-600"
                >
                  <Link href="/how-it-works">Learn the pipeline</Link>
                </Button>
              </div>
            </div>

            {/* Right Interactive Preview Card */}
            <div className="relative flex items-center justify-center border-t border-slate-200/60 bg-gradient-to-br from-blue-50/40 via-indigo-50/20 to-slate-50/60 p-6 sm:p-10 lg:border-t-0 lg:border-l">
              <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/90 bg-white/80 p-5 shadow-[0_16px_40px_-12px_rgba(15,30,60,0.1)] backdrop-blur-xl">
                {/* Tabs */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex rounded-full border border-slate-200/70 bg-slate-100/80 p-1">
                    {(["chat", "atoms", "lineage"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`rounded-full px-3 py-1 text-xs capitalize transition-all ${
                          activeTab === tab
                            ? "bg-white text-slate-900 font-normal shadow-sm"
                            : "text-slate-500 font-normal hover:text-slate-900"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-normal uppercase tracking-wider text-blue-600">
                    NORMALIZED
                  </span>
                </div>

                {/* Tab Content Display */}
                <div className="mt-4 space-y-3 text-xs font-normal">
                  {activeTab === "chat" && (
                    <>
                      {/* Simulated Assistant Message */}
                      <div className="flex gap-2.5">
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                          <Sparkles className="size-3" />
                        </div>
                        <div className="flex-1 rounded-2xl rounded-tl-none border border-slate-100 bg-slate-50/80 p-3 leading-relaxed text-slate-700">
                          <div className="font-normal text-slate-900">Brain2 Ingestion Engine</div>
                          Normalized 1,480 message atoms across 12 chat threads. Generated source hashes.
                        </div>
                      </div>

                      {/* Simulated User Message */}
                      <div className="flex flex-row-reverse gap-2.5">
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                          <BrainCircuit className="size-3" />
                        </div>
                        <div className="flex-1 rounded-2xl rounded-tr-none border border-blue-100 bg-blue-50/70 p-3 leading-relaxed text-blue-900">
                          Resolve project context &quot;ai-miner-web&quot; with verified SHA-256 evidence.
                        </div>
                      </div>
                    </>
                  )}

                  {activeTab === "atoms" && (
                    <div className="space-y-2 font-normal">
                      <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs">
                        <div className="flex items-center justify-between text-[11px] font-normal text-slate-800">
                          <span>Current Truth Candidate</span>
                          <span className="text-emerald-600 font-normal">Active</span>
                        </div>
                        <p className="mt-1 text-[11px] font-normal text-slate-500">
                          Auth vault uses PBKDF2-SHA256 with 256-bit AES-GCM encryption.
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs">
                        <div className="flex items-center justify-between text-[11px] font-normal text-slate-800">
                          <span>Project Assertion #412</span>
                          <span className="text-blue-600 font-normal">Deterministic</span>
                        </div>
                        <p className="mt-1 text-[11px] font-normal text-slate-500">
                          IndexedDB schema v4: stores raw messages, atoms, projects, and ticks.
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTab === "lineage" && (
                    <div className="space-y-2 font-mono text-[11px]">
                      <div className="rounded-xl border border-slate-200/80 bg-slate-900 p-3 text-slate-200 font-normal">
                        <div className="text-[10px] text-emerald-400 font-normal"># PROVENANCE HASH</div>
                        <div className="mt-1 truncate text-slate-400">sha256:8f4c2e1b...9a03</div>
                        <div className="mt-2 text-[10px] text-blue-400 font-normal"># SOURCE LOCATION</div>
                        <div className="truncate text-slate-400">ChatGPT_export_2024.zip / turn_84</div>
                      </div>
                    </div>
                  )}

                  {/* Component Preview Bar */}
                  <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200/60 bg-white/90 p-2.5 shadow-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-600" />
                      <span className="text-[11px] font-normal text-slate-800">100% Provenance Preserved</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">0.4ms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* SECTION 4: FEATURE 02 SHOWCASE (Horizon Section 4 Style) */}
      {/* ========================================================= */}
      <section className="relative px-6 py-12 lg:px-8">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[28px] border border-white/80 bg-white/60 shadow-[0_20px_50px_rgba(15,30,60,0.06)] backdrop-blur-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left Content */}
            <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
              <h3 className="text-2xl sm:text-3xl lg:text-[32px] font-normal tracking-tight text-slate-900 leading-tight">
                Deterministic Provenance & Local Runtime
              </h3>
              <p className="mt-4 text-sm sm:text-base font-normal leading-relaxed text-slate-600">
                A local-first architecture engineered for truth. Stable IDs, content hashes, and mutation lineage preserve where important claims originated, with zero fabricated runtime state.
              </p>
              <div className="mt-8 flex items-center gap-3">
                <Button
                  asChild
                  className="rounded-full bg-slate-900 px-6 font-normal text-white shadow-sm transition-all hover:bg-blue-600 hover:scale-105 active:scale-95"
                >
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <span>Open workspace</span>
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="rounded-full px-5 text-sm font-normal text-slate-600 hover:text-blue-600"
                >
                  <Link href="/features">Explore features</Link>
                </Button>
              </div>
            </div>

            {/* Right Horizon Telemetry & Health Dashboard Mockup */}
            <div className="relative flex items-center justify-center border-t border-slate-200/60 bg-gradient-to-br from-indigo-50/40 via-purple-50/20 to-slate-50/60 p-6 sm:p-10 lg:border-t-0 lg:border-l">
              <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/90 bg-white/85 p-6 shadow-[0_16px_40px_-12px_rgba(15,30,60,0.12)] backdrop-blur-xl font-normal">
                {/* Header with Sparkline */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-xs">
                      <Layers className="size-5" />
                    </div>
                    <div>
                      <span className="block text-sm font-normal text-slate-900">
                        Memory Engine
                      </span>
                      <span className="text-[10px] font-normal uppercase tracking-wider text-slate-400">
                        v4.0.0-stable
                      </span>
                    </div>
                  </div>

                  {/* Sparkline Graph */}
                  <div className="flex flex-col items-end gap-0.5">
                    <div className="text-[10px] font-normal uppercase tracking-tight text-slate-400">
                      Health
                    </div>
                    <svg className="h-6 w-16 overflow-visible" viewBox="0 0 60 20">
                      <path
                        d="M0 15 L10 12 L20 18 L30 8 L40 10 L50 4 L60 6"
                        fill="none"
                        stroke="#10b981"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                      />
                    </svg>
                  </div>
                </div>

                {/* Status Progress Bar */}
                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-normal">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      <span className="text-slate-800 font-normal">IndexedDB Local Store</span>
                    </div>
                    <span className="font-mono text-slate-900 font-normal">99.9%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full w-[99.9%] rounded-full bg-gradient-to-r from-blue-600 to-indigo-600" />
                  </div>
                </div>

                {/* Telemetry Status List */}
                <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-4 text-xs font-normal text-slate-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-emerald-600" />
                      <span>PBKDF2 + AES-256-GCM Vault</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">Active</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="size-4 text-emerald-600" />
                      <span>Deterministic atom hash index</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">100%</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="size-4 text-blue-600" />
                      <span>WebAssembly Runtime / ONNX</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">Ready</span>
                  </div>
                </div>

                {/* Live Production Banner */}
                <div className="mt-5 flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 shadow-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span className="text-xs font-normal text-emerald-900">Local-first authoritative</span>
                  </div>
                  <span className="rounded bg-white/80 px-2 py-0.5 font-mono text-[10px] font-normal text-slate-700 shadow-2xs">
                    0.4ms
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* SECTION 5: CORE MODULES SHOWCASE (Horizon Showcase Cards) */}
      {/* ========================================================= */}
      <section className="relative px-6 py-28 lg:px-8 font-normal">
        <div className="mx-auto max-w-6xl text-center">
          <span className="text-xs font-normal uppercase tracking-[0.2em] text-blue-600">
            Core Architecture
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[40px] font-normal tracking-tight text-slate-900 leading-tight">
            Describe the outcome. AI Miner builds the structure.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base font-normal text-slate-600">
            Inspect the modules that transform fragmented conversations into verifiable, living memory.
          </p>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((cap) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/80 bg-white/60 p-7 text-left shadow-[0_10px_30px_rgba(15,30,60,0.04)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:bg-white/90 hover:shadow-[0_20px_40px_rgba(24,100,255,0.08)]"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-110">
                        <Icon className="size-5" />
                      </span>
                      <span className="text-xs font-normal text-slate-400">
                        {cap.id}
                      </span>
                    </div>
                    <div className="mt-4 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-normal uppercase tracking-wider text-slate-600">
                      {cap.badge}
                    </div>
                    <h3 className="mt-3 text-lg font-normal text-slate-900">
                      {cap.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed font-normal text-slate-600">
                      {cap.desc}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-normal text-blue-600">
                    <span>Inspect capability</span>
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* SECTION 6: PRIVACY & TECHNICAL TRUTH GUARANTEES           */}
      {/* ========================================================= */}
      <section className="relative border-y border-slate-200/60 bg-gradient-to-b from-slate-50/60 via-white to-slate-50/40 px-6 py-24 lg:px-8 font-normal">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <span className="text-xs font-normal uppercase tracking-[0.2em] text-blue-600">
              Privacy & Technical Truth
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-normal tracking-tight text-slate-900">
              Move the question, not the memory.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm font-normal leading-relaxed text-slate-600">
              AI Miner is designed so the user archive remains the sole authority. Cloud runtimes can be connected as execution surfaces without turning your source memory into a hidden server-side copy.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            {guarantees.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex gap-4 rounded-2xl border border-white/90 bg-white/80 p-6 shadow-sm backdrop-blur-xl transition-all hover:border-blue-200 hover:shadow-md font-normal"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-normal text-slate-900">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-xs font-normal leading-relaxed text-slate-600">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* SECTION 7: INTERACTIVE FAQ ACCORDION                     */}
      {/* ========================================================= */}
      <section className="relative px-6 py-28 lg:px-8 font-normal">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <span className="text-xs font-normal uppercase tracking-[0.2em] text-blue-600">
              Got questions?
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-normal tracking-tight text-slate-900">
              Frequently asked questions
            </h2>
          </div>

          <div className="mt-12 divide-y divide-slate-200/70 border-y border-slate-200/70">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={faq.q} className="py-5">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="flex w-full items-center justify-between text-left transition-colors hover:text-blue-600 font-normal"
                  >
                    <span className="text-base sm:text-lg font-normal text-slate-900">
                      {faq.q}
                    </span>
                    <span
                      className={`ml-4 flex size-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-transform duration-200 ${
                        isOpen ? "rotate-180 bg-blue-50 text-blue-600 border-blue-200" : ""
                      }`}
                    >
                      <ChevronDown className="size-4" />
                    </span>
                  </button>

                  {isOpen && (
                    <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200 text-sm font-normal leading-relaxed text-slate-600">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* SECTION 8: FINAL CTA                                     */}
      {/* ========================================================= */}
      <section
        className="relative overflow-hidden px-6 py-28 text-center font-normal"
        style={{
          background: "radial-gradient(circle at 50% 50%, #ffffff 0%, #f8fbff 100%)",
        }}
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center font-normal">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md">
            <BrainCircuit className="size-7" />
          </div>

          <h2 className="mt-6 text-4xl sm:text-5xl lg:text-[54px] font-normal tracking-tight leading-tight text-slate-900">
            Let&apos;s build with the memory you already created.
          </h2>

          <p className="mt-5 max-w-2xl text-base sm:text-lg font-normal leading-relaxed text-slate-600">
            Open the local workspace, import an AI history export, and inspect what AI Miner can reconstruct with full provenance before connecting additional runtimes.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-4 font-normal">
            <Button
              asChild
              size="lg"
              className="h-13 rounded-full bg-slate-900 px-8 text-base font-normal text-white shadow-sm transition-all hover:bg-blue-600 hover:scale-105 active:scale-95"
            >
              <Link href="/dashboard" className="flex items-center gap-2.5">
                <span>Open AI Miner Workspace</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-13 rounded-full border-slate-200/90 bg-white/80 px-8 text-base font-normal text-slate-800 shadow-sm backdrop-blur-md transition-all hover:bg-white hover:text-blue-600 hover:scale-105 active:scale-95"
            >
              <Link href="/memory">Import AI history</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
