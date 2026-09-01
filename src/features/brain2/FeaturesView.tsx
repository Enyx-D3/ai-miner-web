"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Atom,
  Binary,
  BookOpen,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Cpu,
  Database,
  ExternalLink,
  FileCheck2,
  FileCode2,
  FileSearch,
  FileText,
  Filter,
  Flame,
  FolderKanban,
  FolderTree,
  KeyRound,
  Layers,
  Lightbulb,
  ListChecks,
  Lock,
  LockKeyhole,
  MessageSquare,
  Network,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Terminal,
  Upload,
  UploadCloud,
  Workflow,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface InteractiveFeature {
  id: string;
  name: string;
  tagline: string;
  icon: React.ElementType;
  badge: string;
  color: string;
  description: string;
  previewType: "search" | "projects" | "wiki" | "vault";
}

const interactiveFeatures: InteractiveFeature[] = [
  {
    id: "search",
    name: "Instant Search & Recall",
    tagline: "Find any past answer in 0.4 milliseconds",
    icon: Search,
    badge: "0.4ms Local Filter",
    color: "text-blue-600 bg-blue-50 border-blue-200",
    description:
      "Search through thousands of past conversations from ChatGPT, Claude, and Gemini in real time. Indexed locally in browser IndexedDB with zero latency and zero cloud uploads.",
    previewType: "search",
  },
  {
    id: "projects",
    name: "Living Projects & Context",
    tagline: "Automatic multi-chat project clustering",
    icon: FolderKanban,
    badge: "Auto-Clustering",
    color: "text-indigo-600 bg-indigo-50 border-indigo-200",
    description:
      "Brain2 groups fragmented chat turns across months into unified living project hubs. Track current NOW priorities, technical constraints, and chronological timelines effortlessly.",
    previewType: "projects",
  },
  {
    id: "wiki",
    name: "LifeWiki Synthesis",
    tagline: "Automated project documentation",
    icon: BookOpen,
    badge: "Auto-Generated Docs",
    color: "text-purple-600 bg-purple-50 border-purple-200",
    description:
      "Synthesizes clean markdown documentation from your conversations. Captures decisions, milestones, and architectural patterns so you never have to write project wikis from scratch.",
    previewType: "wiki",
  },
  {
    id: "vault",
    name: "Encrypted .B2M Vault",
    tagline: "Military-grade client-side encryption",
    icon: LockKeyhole,
    badge: "PBKDF2 + AES-256",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    description:
      "Protect your personal intelligence with 200,000 rounds of PBKDF2-SHA256 and AES-256-GCM. Passphrases are never sent over the network or stored in persistent files.",
    previewType: "vault",
  },
];

const featureGrid = [
  {
    icon: UploadCloud,
    title: "Multi-Provider Ingestion",
    subtitle: "ChatGPT · Claude · Gemini · Chrome",
    desc: "Import ZIP archives from any AI provider with 1-click in-memory decompression. Also captures live conversations through our lightweight Chrome Extension.",
    tag: "Zero Setup",
  },
  {
    icon: Atom,
    title: "Deterministic Atom Extraction",
    subtitle: "Decisions · Constraints · Tasks · Facts",
    desc: "Extracts typed, immutable atoms with cryptographic SHA-256 turn hashes, preserving a 100% verifiable provenance trail back to the source text.",
    tag: "Cryptographic Lineage",
  },
  {
    icon: Target,
    title: "Truth Engine & Conflict Resolution",
    subtitle: "Current vs. Superseded Consensus",
    desc: "Automatically resolves contradictory choices made months apart. Flags outdated approaches as SUPERSEDED while keeping active consensus CURRENT.",
    tag: "Audit-Backed",
  },
  {
    icon: BrainCircuit,
    title: "B2JOB Bounded AI Context",
    subtitle: "90% Token Reduction for LLMs",
    desc: "Extracts compact, high-density context slices to feed external AI models without bloating token budgets or triggering 'lost in the middle' hallucinations.",
    tag: "Token Efficient",
  },
  {
    icon: Sparkles,
    title: "Forgotten Gold Discovery",
    subtitle: "Unearth Buried Solutions",
    desc: "Surfaces high-leverage ideas, architectural breakthroughs, and complex bug resolutions that were previously lost inside forgotten chat threads.",
    tag: "Intelligence Mining",
  },
  {
    icon: Network,
    title: "Zero-Cloud P2P Mesh Sync",
    subtitle: "Direct WebRTC Device Pairing",
    desc: "Replicates Global Delta memory state directly between your laptop and mobile PWA via peer-to-peer WebRTC without any intermediary cloud databases.",
    tag: "Zero Server Storage",
  },
];

const sampleSearchResults = [
  {
    title: "ADR-002: PBKDF2 Master Key Derivation Strategy",
    project: "ai-miner-web",
    provider: "ChatGPT",
    date: "Aug 2026",
    snippet: "Standardized on PBKDF2-SHA256 (200,000 iterations) with AES-256-GCM for all .B2M vault exports.",
    tag: "Decision",
    tagColor: "bg-emerald-50 text-emerald-700",
  },
  {
    title: "Browser-Digest Streaming Decompression Worker",
    project: "browser-digest",
    provider: "Claude",
    date: "Jul 2026",
    snippet: "Decompresses multi-megabyte ZIPs using client-side fflate and web workers without main thread freezing.",
    tag: "Fact",
    tagColor: "bg-blue-50 text-blue-700",
  },
  {
    title: "QLoRA 4-bit Quantization on 8GB Consumer GPUs",
    project: "parser-tuning-v2",
    provider: "Gemini",
    date: "Jun 2026",
    snippet: "Configured rank r=16 and alpha=32 to train domain extraction models within hardware constraints.",
    tag: "Constraint",
    tagColor: "bg-purple-50 text-purple-700",
  },
];

const faqs = [
  {
    q: "How does the search engine work without a cloud database?",
    a: "Brain2 builds a high-performance local inverted index directly in browser IndexedDB. When you search, queries execute in a background Web Worker in under a millisecond with zero network roundtrips.",
  },
  {
    q: "Can I use Brain2 offline?",
    a: "Yes! Once loaded, Brain2 is a Progressive Web App that works completely offline. All your imported conversations, atoms, and projects are stored safely in your browser's persistent storage.",
  },
  {
    q: "How does Brain2 resolve conflicting decisions across conversations?",
    a: "The Truth Engine inspects chronological turn timestamps and semantic lineage. When you confirm a newer architecture decision, the older choice is marked 'SUPERSEDED' with full audit history.",
  },
  {
    q: "What makes the B2JOB context compiler different from regular prompting?",
    a: "Instead of uploading 50 pages of raw chat transcripts, B2JOB compiles only the verified atoms, active project constraints, and current goals. This reduces prompt token usage by up to 90% while improving reasoning accuracy.",
  },
];

export function FeaturesView() {
  const [activeTab, setActiveTab] = useState("search");
  const [searchQuery] = useState("PBKDF2");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [copiedContext, setCopiedContext] = useState(false);

  const activeFeature =
    interactiveFeatures.find((f) => f.id === activeTab) || interactiveFeatures[0];

  const filteredResults = sampleSearchResults.filter(
    (r) =>
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.snippet.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.project.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(
      "### B2JOB Project Context: [ai-miner-web]\n- Vault standard: PBKDF2-SHA256 (200k) + AES-256-GCM\n- Authority: 100% Local IndexedDB"
    );
    setCopiedContext(true);
    setTimeout(() => setCopiedContext(false), 2000);
  };

  return (
    <div className="relative min-h-screen bg-[#fafcff] text-slate-900 selection:bg-blue-600 selection:text-white font-sans overflow-hidden">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[520px] w-[860px] rounded-full bg-gradient-to-b from-blue-400/10 via-indigo-400/5 to-transparent blur-[130px]" />
        <div className="absolute top-[50%] right-[-5%] h-[400px] w-[500px] rounded-full bg-cyan-400/5 blur-[120px]" />
      </div>

      {/* ========================================================= */}
      {/* 1. HERO SECTION                                           */}
      {/* ========================================================= */}
      <section className="px-6 pt-28 pb-12 sm:pt-36 sm:pb-14 text-center max-w-3xl mx-auto">
        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-normal tracking-tight text-slate-900 leading-[1.18]">
          Powerful intelligence features, built for{" "}
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent font-normal">
            local-first privacy.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-4 max-w-2xl mx-auto text-sm sm:text-base font-normal leading-relaxed text-slate-600">
          Everything you need to turn thousands of conversations into searchable, structured, and permanent working memory without cloud lock-in.
        </p>

        {/* Value Badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 text-xs text-slate-600 font-normal">
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-3 py-1 shadow-2xs">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            <span>Sub-Millisecond Search</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-3 py-1 shadow-2xs">
            <ShieldCheck className="size-3.5 text-blue-600" />
            <span>Client-Side WebCrypto</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-3 py-1 shadow-2xs">
            <BookOpen className="size-3.5 text-purple-600" />
            <span>Automated LifeWiki</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-3 py-1 shadow-2xs">
            <LockKeyhole className="size-3.5 text-amber-500" />
            <span>Encrypted .B2M Vaults</span>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. INTERACTIVE FEATURE PLAYGROUND                         */}
      {/* ========================================================= */}
      <section className="px-0 py-10 w-[94%] max-w-6xl mx-auto">
        <div className="rounded-3xl border border-slate-200/80 bg-white/70 p-5 sm:p-8 shadow-[0_8px_30px_rgba(15,30,60,0.04)] backdrop-blur-xl">
          {/* Header */}
          <div className="text-center max-w-xl mx-auto mb-7">
            <span className="text-[10px] font-normal uppercase tracking-wider text-blue-600">
              Interactive Explorer
            </span>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-normal text-slate-900 mt-1 tracking-tight">
              Test core capabilities in real time.
            </h2>
          </div>

          {/* Feature Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
            {interactiveFeatures.map((feat) => {
              const Icon = feat.icon;
              const isActive = activeTab === feat.id;
              return (
                <button
                  key={feat.id}
                  onClick={() => setActiveTab(feat.id)}
                  className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all duration-200 ${
                    isActive
                      ? "bg-white border-blue-500 shadow-sm ring-1 ring-blue-500/20"
                      : "bg-white/60 border-slate-200/80 hover:bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div
                      className={`size-7 rounded-lg flex items-center justify-center ${
                        isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 font-normal">
                      {feat.badge}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-medium truncate w-full ${
                      isActive ? "text-slate-900" : "text-slate-700"
                    }`}
                  >
                    {feat.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Live Preview Display Box */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 sm:p-6">
            {/* Feature Description Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-200/60">
              <div>
                <h3 className="text-base font-medium text-slate-900">
                  {activeFeature.name}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 font-normal">
                  {activeFeature.description}
                </p>
              </div>
              <span className={`text-[10px] font-normal px-2.5 py-1 rounded-full border self-start sm:self-auto ${activeFeature.color}`}>
                {activeFeature.badge}
              </span>
            </div>

            {/* PREVIEW 1: SEARCH SIMULATOR */}
            {activeTab === "search" && (
              <div className="space-y-3">
                {/* Result Items */}
                <div className="space-y-2 mt-2">
                  {filteredResults.length > 0 ? (
                    filteredResults.map((res) => (
                      <div
                        key={res.title}
                        className="rounded-xl border border-slate-200/70 bg-white p-3 shadow-2xs hover:border-blue-200 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-medium text-slate-900 truncate">
                            {res.title}
                          </span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-normal ${res.tagColor}`}>
                            {res.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-normal leading-relaxed">
                          {res.snippet}
                        </p>
                        <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-400 font-normal">
                          <span>Project: {res.project}</span>
                          <span>Source: {res.provider}</span>
                          <span>{res.date}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No matching records found for &quot;{searchQuery}&quot;.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PREVIEW 2: LIVING PROJECTS */}
            {activeTab === "projects" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-900">Project: ai-miner-web</span>
                    <span className="text-[9px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                      Active NOW
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-normal leading-relaxed">
                    Local-first memory mining interface with PBKDF2 Web Crypto vault and full-text IndexedDB index.
                  </p>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                    <span>14 Conversations · 1,480 Atoms</span>
                    <span className="text-blue-600 font-normal">Updated 12m ago</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-900">Project: parser-tuning-v2</span>
                    <span className="text-[9px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                      Research Hub
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-normal leading-relaxed">
                    QLoRA 4-bit quantization benchmarks for domain extraction model running on 8GB consumer hardware.
                  </p>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                    <span>8 Conversations · 820 Atoms</span>
                    <span className="text-blue-600 font-normal">Updated 2d ago</span>
                  </div>
                </div>
              </div>
            )}

            {/* PREVIEW 3: LIFEWIKI SYNTHESIS */}
            {activeTab === "wiki" && (
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-purple-600" />
                    <span className="text-xs font-medium text-slate-900">
                      LifeWiki / Project: ai-miner-web.md
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Auto-Compiled</span>
                </div>
                <div className="space-y-2 text-[11px] text-slate-600 font-normal leading-relaxed">
                  <p>
                    <strong className="text-slate-800 font-medium">Overview:</strong> Client-side AI history reconstruction engine. Operates with zero cloud servers.
                  </p>
                  <p>
                    <strong className="text-slate-800 font-medium">Core ADRs:</strong> ADR-002 enforces PBKDF2-SHA256 key derivation. ADR-005 handles streaming fflate ZIP extraction.
                  </p>
                  <p>
                    <strong className="text-slate-800 font-medium">Verified Constraints:</strong> No telemetry trackers. Passphrases are stored strictly in volatile RAM.
                  </p>
                </div>
              </div>
            )}

            {/* PREVIEW 4: ENCRYPTED VAULT & B2JOB */}
            {activeTab === "vault" && (
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="size-4 text-emerald-600" />
                    <span className="text-xs font-medium text-slate-900">
                      .B2M Encrypted Snapshot Package
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    AES-256-GCM Locked
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 font-normal leading-relaxed">
                  Passphrase derives a 256-bit encryption key using 200,000 PBKDF2 rounds. Your complete conversation graph, atoms, and wikis are saved into a single portable backup file.
                </p>
                <div className="pt-2 flex flex-wrap gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[10px] font-normal hover:bg-blue-600 transition-colors flex items-center gap-1.5"
                  >
                    {copiedContext ? (
                      <>
                        <Check className="size-3 text-emerald-400" />
                        <span>Copied B2JOB Context</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        <span>Copy Compact AI Context (-90% Tokens)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. CORE FEATURE CARDS (CLEAN & MINIMAL GRID)              */}
      {/* ========================================================= */}
      <section className="px-0 py-12 w-[94%] max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-normal uppercase tracking-[0.2em] text-blue-600">
            Feature Breakdown
          </span>
          <h2 className="mt-2 text-2xl sm:text-3xl lg:text-[34px] font-normal tracking-tight text-slate-900 leading-[1.2]">
            Engineered for clarity and speed.
          </h2>
          <p className="mt-2 text-sm sm:text-base font-normal text-slate-600">
            A comprehensive suite of local-first tools designed to give you permanent mastery over your AI conversations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {featureGrid.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white/70 p-6 shadow-[0_8px_30px_rgba(15,30,60,0.04)] backdrop-blur-xl hover:border-blue-300 transition-all duration-300"
              >
                <div>
                  {/* Top Icon & Tag */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
                      <Icon className="size-5" />
                    </div>
                    <span className="text-[10px] font-normal text-slate-400 bg-slate-100/70 px-2 py-0.5 rounded-full">
                      {feat.tag}
                    </span>
                  </div>

                  {/* Title & Subtitle */}
                  <h3 className="text-base font-normal text-slate-900 tracking-tight">
                    {feat.title}
                  </h3>
                  <p className="mt-0.5 text-xs font-normal text-blue-600">
                    {feat.subtitle}
                  </p>

                  {/* Description */}
                  <p className="mt-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    {feat.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. PRIVACY BLUEPRINT STRIP                                */}
      {/* ========================================================= */}
      <section className="px-0 py-12 w-[94%] max-w-6xl mx-auto">
        <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-50/60 via-white to-slate-50/40 p-6 sm:p-9 shadow-[0_8px_30px_rgba(15,30,60,0.04)] backdrop-blur-xl">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-xs font-normal uppercase tracking-[0.2em] text-blue-600">
              Zero-Cloud Privacy Guarantee
            </span>
            <h2 className="text-xl sm:text-2xl font-normal text-slate-900 mt-1.5 tracking-tight">
              Why local-first architecture matters.
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-600 font-normal">
              Your conversations are private intellectual property. We keep them that way.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 mb-2.5">
                <Cpu className="size-4" />
              </div>
              <h4 className="text-xs font-medium text-slate-900">On-Device Processing</h4>
              <p className="mt-1 text-[11px] text-slate-600 font-normal leading-relaxed">
                Decompression, parsing, and search execute entirely within your browser runtime.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 mb-2.5">
                <ShieldCheck className="size-4" />
              </div>
              <h4 className="text-xs font-medium text-slate-900">Zero Model Training</h4>
              <p className="mt-1 text-[11px] text-slate-600 font-normal leading-relaxed">
                Your private prompts and proprietary code snippets are never fed to remote training sets.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <div className="flex size-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 mb-2.5">
                <Database className="size-4" />
              </div>
              <h4 className="text-xs font-medium text-slate-900">No Vendor Lock-In</h4>
              <p className="mt-1 text-[11px] text-slate-600 font-normal leading-relaxed">
                Export clean markdown, JSON, or encrypted .B2M packages anytime with one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. FREQUENTLY ASKED QUESTIONS (ACCORDION)                 */}
      {/* ========================================================= */}
      <section className="px-0 py-12 w-[94%] max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <span className="text-xs font-normal uppercase tracking-[0.2em] text-blue-600">
            Questions & Answers
          </span>
          <h2 className="text-2xl sm:text-3xl font-normal text-slate-900 tracking-tight mt-1.5">
            Frequently asked questions.
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 font-normal">
            Everything you need to know about Brain2 features and capabilities.
          </p>
        </div>

        <div className="space-y-2.5">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={faq.q}
                className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs transition-all"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between p-4 sm:p-4.5 text-left hover:bg-slate-50/50 transition-colors"
                >
                  <span className="text-sm font-normal text-slate-900 pr-3">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`size-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-blue-600" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 sm:px-4.5 sm:pb-4.5 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal border-t border-slate-100 pt-2.5">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. CALL TO ACTION                                         */}
      {/* ========================================================= */}
      <section className="px-0 py-14 text-center w-[94%] max-w-6xl mx-auto mb-14">
        <div className="rounded-3xl border border-blue-200/80 bg-gradient-to-br from-blue-50 via-white to-indigo-50/60 p-6 sm:p-10 shadow-[0_8px_30px_rgba(15,30,60,0.04)] backdrop-blur-xl">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-normal text-slate-900 tracking-tight leading-[1.2]">
            Start exploring all features today.
          </h2>
          <p className="mt-2.5 text-xs sm:text-sm text-slate-600 max-w-lg mx-auto font-normal">
            Drop your conversation ZIP archive and see your personal intelligence hub come alive with zero cloud setup.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="h-11 rounded-full bg-slate-900 px-7 text-xs sm:text-sm font-normal text-white hover:bg-blue-600 shadow-sm transition-all hover:scale-105 active:scale-95"
            >
              <Link href="/memory" className="flex items-center gap-2">
                <Upload className="size-3.5" />
                <span>Import Chat History</span>
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
