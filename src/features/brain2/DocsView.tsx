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
  ChevronRight,
  Clock,
  Code2,
  Copy,
  Cpu,
  Database,
  ExternalLink,
  FileCheck2,
  FileCode2,
  FileJson,
  FileSpreadsheet,
  FileText,
  Filter,
  FolderKanban,
  FolderTree,
  HelpCircle,
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
  Shield,
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

interface DocArticle {
  id: string;
  category: string;
  title: string;
  summary: string;
  badge?: string;
  content: {
    overview: string;
    steps?: string[];
    codeBlock?: {
      language: string;
      filename: string;
      code: string;
    };
    callout?: {
      type: "tip" | "security" | "note";
      text: string;
    };
    keyTakeaways?: string[];
  };
}

const docCategories = [
  { id: "getting-started", label: "Getting Started", icon: Sparkles },
  { id: "core-engine", label: "Memory Engine & Atoms", icon: Atom },
  { id: "projects", label: "Living Projects & Wiki", icon: FolderKanban },
  { id: "security", label: "Security & Encryption", icon: ShieldCheck },
  { id: "b2job", label: "B2JOB & AI Context", icon: BrainCircuit },
];

const docArticles: DocArticle[] = [
  {
    id: "quickstart",
    category: "getting-started",
    title: "Quickstart: From Chat Export to Working Memory",
    summary: "Learn how to import conversation archives from ChatGPT, Claude, or Gemini without creating an account.",
    badge: "Essential",
    content: {
      overview:
        "Brain2 AI Miner is designed to turn fragmented chat histories into a permanent, local-first knowledge base. Getting started requires zero cloud accounts, zero API keys, and zero telemetry configuration.",
      steps: [
        "Export your conversation history ZIP from ChatGPT (Data Controls), Claude (Account Settings), or Gemini (Google Takeout).",
        "Navigate to the Brain2 Memory page in your browser.",
        "Drop the ZIP file into the upload zone. Brain2 decompressess and extracts decisions, constraints, and tasks in under a second.",
        "Open your Search dashboard (Cmd/Ctrl + K) to immediately query years of AI discussions in 0.4ms.",
      ],
      callout: {
        type: "tip",
        text: "You do not need to unzip files before dropping them. Brain2's WebAssembly decompression worker processes raw ZIP archives directly inside volatile browser memory.",
      },
      keyTakeaways: [
        "Zero server ingestion: All processing is 100% client-side.",
        "Compatible with all major AI providers simultaneously.",
        "Automatic schema recognition (ChatGPT JSON, Claude JSON, Gemini Takeout).",
      ],
    },
  },
  {
    id: "chrome-extension",
    category: "getting-started",
    title: "Chrome Extension Real-Time Capture",
    summary: "Automatically index conversations as you chat with AI assistants in your browser tabs.",
    content: {
      overview:
        "Instead of waiting for periodic bulk exports, the Brain2 Companion Extension intercepts active conversation turns in real time from ChatGPT, Claude, and Gemini web interfaces.",
      steps: [
        "Install the Brain2 Companion Extension from the Chrome Web Store.",
        "Open any conversation in ChatGPT or Claude web tabs.",
        "The extension silently streams turn deltas to your local Brain2 IndexedDB store via standard BroadcastChannel APIs.",
      ],
      codeBlock: {
        language: "json",
        filename: "broadcast-payload-schema.json",
        code: `{
  "source": "chatgpt-web",
  "turnId": "turn-94812",
  "author": "assistant",
  "timestamp": 1788283200000,
  "turnHash": "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069"
}`,
      },
      callout: {
        type: "note",
        text: "The extension operates with minimal permissions (`activeTab` only) and never connects to any third-party telemetry server.",
      },
    },
  },
  {
    id: "typed-atoms",
    category: "core-engine",
    title: "Understanding Typed Atoms & Cryptographic Lineage",
    summary: "How Brain2 breaks unstructured chat text into immutable, verifiable units of knowledge.",
    badge: "Core Architecture",
    content: {
      overview:
        "An 'Atom' is the atomic unit of structured memory in Brain2. Rather than storing whole 20,000-word conversation dumps, Brain2 classifies distinct propositions into strongly-typed knowledge atoms.",
      keyTakeaways: [
        "DECISION: Architectural, technical, or design consensus reached in a chat.",
        "CONSTRAINT: Hardware limitations, budget bounds, or strict negative requirements.",
        "TASK: Action items, implementation TODOs, and follow-up directives.",
        "FACT: Permanent domain knowledge, API schemas, and mathematical proofs.",
        "IDEA: Open-ended creative directions and candidate hypotheses.",
      ],
      codeBlock: {
        language: "typescript",
        filename: "atom-types.ts",
        code: `export interface MemoryAtom {
  id: string;                  // e.g. "atom-dec-042"
  kind: "DECISION" | "CONSTRAINT" | "TASK" | "FACT" | "IDEA";
  text: string;                // Concise proposition
  sourceTurnHash: string;      // Cryptographic SHA-256 turn hash
  status: "CURRENT" | "SUPERSEDED";
  supersededBy?: string;       // Lineage pointer to newer decision
  projectId: string;           // Living project assignment
}`,
      },
      callout: {
        type: "security",
        text: "Each atom references a `sourceTurnHash`. If you ever need to verify why a decision was made, 1-click jumps directly to the original conversation turn with exact line highlights.",
      },
    },
  },
  {
    id: "truth-stream",
    category: "core-engine",
    title: "Truth Engine: Resolving Contradictory Decisions",
    summary: "Automated chronological consensus tracking and superseded decision reconciliation.",
    content: {
      overview:
        "Over months of development, team architectures evolve. A library chosen in January might be replaced in June. The Truth Engine prevents AI hallucinations by managing decision consensus over time.",
      steps: [
        "Brain2 constructs a chronological timeline of all decisions within a project workspace.",
        "When a newer conversation overturns an older decision, the previous atom is flagged as `SUPERSEDED`.",
        "The newer consensus is marked as `CURRENT`, maintaining a complete audit trail without destroying historical context.",
      ],
      callout: {
        type: "tip",
        text: "When compiling context for AI assistants via B2JOB, superseded decisions are excluded by default, preventing LLMs from generating code using outdated libraries.",
      },
    },
  },
  {
    id: "project-workspaces",
    category: "projects",
    title: "Living Projects & Auto-Clustering",
    summary: "How Brain2 organizes conversations into project hubs with active NOW priorities.",
    content: {
      overview:
        "Conversations rarely exist in isolation. You might have 15 different chats discussing database indexing, API routing, and UI design for the same SaaS application. Living Projects group them automatically.",
      keyTakeaways: [
        "NOW Focus: Pinned decisions and active sprint blockers.",
        "Timeline View: Chronological progression of project milestones.",
        "Artifact Matrix: Associated code snippets, diagrams, and schema files.",
        "Evidence Map: Direct links back to original chat turn sources.",
      ],
      callout: {
        type: "note",
        text: "You can drag and reassign conversations between projects at any time. Brain2 updates atom assignments instantly in local IndexedDB.",
      },
    },
  },
  {
    id: "lifewiki",
    category: "projects",
    title: "LifeWiki Synthesis: Auto-Generated Documentation",
    summary: "Generate clean, structured project documentation directly from your conversation history.",
    content: {
      overview:
        "LifeWiki is an automated documentation compiler. It reads all active atoms within a project and produces clean, human-readable markdown summaries containing Architecture Decision Records (ADRs), constraints, and key milestones.",
      steps: [
        "Open any project workspace in the Brain2 Dashboard.",
        "Click on the 'LifeWiki' tab to view auto-generated documentation.",
        "Export documentation directly as clean `.md` files or copy to your clipboard.",
      ],
      codeBlock: {
        language: "markdown",
        filename: "ai-miner-web-lifewiki.md",
        code: `# Project LifeWiki: ai-miner-web

## Architecture Decision Records (ADRs)
- **ADR-001**: Local-first storage using browser IndexedDB.
- **ADR-002**: Cryptographic vault using PBKDF2-SHA256 (200k) + AES-256-GCM.

## Hard Constraints
- Zero cloud storage. Passphrases must never leave volatile memory.`,
      },
    },
  },
  {
    id: "vault-encryption",
    category: "security",
    title: "Vault Architecture: Client-Side PBKDF2 + AES-256",
    summary: "Deep dive into Brain2's cryptographic security model and .B2M vault packaging.",
    badge: "Security Standard",
    content: {
      overview:
        "Brain2 uses browser-native Web Crypto APIs to ensure military-grade security for your personal intelligence. All data remains encrypted at rest, and encryption keys are derived strictly in volatile RAM.",
      keyTakeaways: [
        "PBKDF2 with SHA-256 and 200,000 iterations for key derivation.",
        "256-bit AES-GCM encryption with unique initialization vectors (IVs).",
        "Zero persistent storage of passphrases or derived master keys.",
        "Cryptographically signed snapshots prevent tampering.",
      ],
      codeBlock: {
        language: "typescript",
        filename: "webcrypto-derivation.ts",
        code: `// Derive 256-bit AES-GCM Key using Web Crypto
const keyMaterial = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(userPassphrase),
  { name: "PBKDF2" },
  false,
  ["deriveKey"]
);

const derivedKey = await crypto.subtle.deriveKey(
  {
    name: "PBKDF2",
    salt: saltBuffer,
    iterations: 200000,
    hash: "SHA-256"
  },
  keyMaterial,
  { name: "AES-GCM", length: 256 },
  false,
  ["encrypt", "decrypt"]
);`,
      },
      callout: {
        type: "security",
        text: "Because Brain2 has zero cloud backend, there is no password reset mechanism. Always store your vault passphrase in a reliable password manager.",
      },
    },
  },
  {
    id: "b2job-context",
    category: "b2job",
    title: "B2JOB: Compacting AI Context by 90%",
    summary: "How to feed verified project constraints to LLMs without token waste or hallucinations.",
    badge: "Token Optimization",
    content: {
      overview:
        "When asking AI assistants to write new features, uploading entire past conversation histories wastes thousands of prompt tokens and often confuses the model with outdated context. B2JOB solves this by creating high-density context packets.",
      steps: [
        "Select your active project in Brain2.",
        "Click 'Export B2JOB Context' to generate a bounded context block.",
        "Paste the context into ChatGPT, Claude, Cursor, or your terminal assistant.",
      ],
      codeBlock: {
        language: "markdown",
        filename: "sample-b2job-context.txt",
        code: `### B2JOB Context [Project: ai-miner-web]
Current ADRs:
- Storage: Browser IndexedDB (dexie.js)
- Vault Encryption: PBKDF2-SHA256 (200,000 rounds) + AES-256-GCM
Active Constraints:
- Zero cloud servers. Passphrase strictly kept in volatile RAM.
Active Task:
- Implement client-side export worker in fflate.`,
      },
      callout: {
        type: "tip",
        text: "B2JOB context blocks fit easily within 300 tokens while providing more precision than a 50,000-token raw chat transcript.",
      },
    },
  },
];

export function DocsView() {
  const [activeCategory, setActiveCategory] = useState("getting-started");
  const [activeArticleId, setActiveArticleId] = useState("quickstart");
  const [searchFilter, setSearchFilter] = useState("");
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Filter articles based on category and search query
  const visibleArticles = docArticles.filter((article) => {
    const matchesCategory =
      searchFilter.trim() !== "" || article.category === activeCategory;
    const matchesSearch =
      searchFilter.trim() === "" ||
      article.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      article.summary.toLowerCase().includes(searchFilter.toLowerCase()) ||
      article.content.overview.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const activeArticle =
    docArticles.find((a) => a.id === activeArticleId) || visibleArticles[0] || docArticles[0];

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="relative min-h-screen bg-[#fafcff] text-slate-900 selection:bg-blue-600 selection:text-white font-sans overflow-hidden">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[520px] w-[860px] rounded-full bg-gradient-to-b from-blue-400/10 via-indigo-400/5 to-transparent blur-[130px]" />
        <div className="absolute top-[50%] right-[-5%] h-[400px] w-[500px] rounded-full bg-cyan-400/5 blur-[120px]" />
      </div>

      {/* ========================================================= */}
      {/* 1. HERO SECTION (CLEAN & COMPACT)                         */}
      {/* ========================================================= */}
      <section className="px-6 pt-28 pb-8 sm:pt-36 sm:pb-10 text-center max-w-3xl mx-auto">
        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-normal tracking-tight text-slate-900 leading-[1.18]">
          Documentation &{" "}
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent font-normal">
            knowledge guides.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-3.5 max-w-2xl mx-auto text-sm sm:text-base font-normal leading-relaxed text-slate-600">
          Everything you need to master Brain2: from 1-click chat ingestion and living project hubs to client-side PBKDF2 encryption.
        </p>

        {/* Interactive Search Filter Bar */}
        <div className="mt-6 max-w-lg mx-auto relative">
          <Search className="size-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search guides, atoms, encryption, or B2JOB..."
            className="w-full pl-9.5 pr-4 py-2 text-xs bg-white border border-slate-200/90 rounded-full text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs font-normal"
          />
          {searchFilter && (
            <button
              onClick={() => setSearchFilter("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. INTERACTIVE DOCUMENTATION WORKSPACE                    */}
      {/* ========================================================= */}
      <section className="px-6 py-6 max-w-6xl mx-auto mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT SIDEBAR: CATEGORIES & ARTICLE LIST */}
          <div className="lg:col-span-4 space-y-4">
            {/* Category Pills */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-2 shadow-[0_8px_30px_rgba(15,30,60,0.04)] backdrop-blur-xl flex flex-col gap-1">
              {docCategories.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id && searchFilter === "";
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setSearchFilter("");
                      const firstArticleInCat = docArticles.find((a) => a.category === cat.id);
                      if (firstArticleInCat) setActiveArticleId(firstArticleInCat.id);
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all text-left ${
                      isActive
                        ? "bg-blue-600 text-white font-medium shadow-sm shadow-blue-500/20"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-normal"
                    }`}
                  >
                    <Icon className="size-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Articles List in Selected Category */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-3 shadow-[0_8px_30px_rgba(15,30,60,0.04)] backdrop-blur-xl space-y-1.5">
              <div className="px-2 py-1 text-[10px] font-normal uppercase tracking-wider text-slate-400">
                {searchFilter ? `Search Results (${visibleArticles.length})` : "Topic Articles"}
              </div>

              {visibleArticles.length > 0 ? (
                visibleArticles.map((article) => {
                  const isSelected = activeArticle.id === article.id;
                  return (
                    <button
                      key={article.id}
                      onClick={() => setActiveArticleId(article.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                        isSelected
                          ? "bg-blue-50/80 border border-blue-200/90 text-blue-900 shadow-2xs"
                          : "hover:bg-slate-50 text-slate-700 border border-transparent"
                      }`}
                    >
                      <div className="text-xs font-medium leading-snug line-clamp-2 pr-2">
                        {article.title}
                      </div>
                      {isSelected && (
                        <ChevronRight className="size-3.5 text-blue-600 shrink-0" />
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">
                  No articles matched your search.
                </div>
              )}
            </div>
          </div>

          {/* RIGHT MAIN PANEL: ARTICLE CONTENT READER */}
          <div className="lg:col-span-8">
            <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 sm:p-9 shadow-[0_8px_30px_rgba(15,30,60,0.04)] backdrop-blur-xl space-y-6">
              {/* Article Header */}
              <div className="pb-5 border-b border-slate-100">
                {activeArticle.badge && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                      {activeArticle.badge}
                    </span>
                  </div>
                )}
                <h2 className="text-xl sm:text-2xl font-normal text-slate-900 tracking-tight leading-snug">
                  {activeArticle.title}
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  {activeArticle.summary}
                </p>
              </div>

              {/* Overview Paragraph */}
              <div className="space-y-2">
                <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Overview
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                  {activeArticle.content.overview}
                </p>
              </div>

              {/* Step-by-Step Walkthrough (if applicable) */}
              {activeArticle.content.steps && (
                <div className="space-y-3">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Step-by-Step Instructions
                  </h3>
                  <div className="space-y-2.5">
                    {activeArticle.content.steps.map((step, idx) => (
                      <div
                        key={step}
                        className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/50 p-3.5"
                      >
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 font-mono text-xs font-medium">
                          {idx + 1}
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 font-normal leading-relaxed">
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Takeaways / Capabilities (if applicable) */}
              {activeArticle.content.keyTakeaways && (
                <div className="space-y-2.5">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Key Architectural Points
                  </h3>
                  <div className="space-y-2">
                    {activeArticle.content.keyTakeaways.map((point) => (
                      <div
                        key={point}
                        className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700"
                      >
                        <div className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                          <Check className="size-2.5 stroke-[3]" />
                        </div>
                        <span className="font-normal">{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interactive Code Snippet Box (if applicable) */}
              {activeArticle.content.codeBlock && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-500">
                      {activeArticle.content.codeBlock.filename}
                    </span>
                    <button
                      onClick={() => handleCopyCode(activeArticle.content.codeBlock!.code)}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-normal flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs"
                    >
                      {copiedSnippet ? (
                        <>
                          <Check className="size-2.5 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-2.5" />
                          <span>Copy Snippet</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 font-mono text-xs text-slate-200 overflow-x-auto shadow-inner">
                    <pre className="leading-relaxed">
                      <code>{activeArticle.content.codeBlock.code}</code>
                    </pre>
                  </div>
                </div>
              )}

              {/* Callout Notice */}
              {activeArticle.content.callout && (
                <div
                  className={`rounded-2xl border p-4 flex items-start gap-3 ${
                    activeArticle.content.callout.type === "security"
                      ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                      : activeArticle.content.callout.type === "tip"
                      ? "bg-blue-50/60 border-blue-200 text-blue-900"
                      : "bg-amber-50/60 border-amber-200 text-amber-900"
                  }`}
                >
                  <ShieldCheck className="size-4 shrink-0 mt-0.5 text-blue-600" />
                  <p className="text-xs leading-relaxed font-normal">
                    {activeArticle.content.callout.text}
                  </p>
                </div>
              )}

              {/* Bottom Quick Navigation */}
              <div className="pt-5 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-normal">
                  Brain2 Knowledge Base · v0.9.13
                </span>
                <Link
                  href="/memory"
                  className="text-xs font-normal text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <span>Open Memory Importer</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. CLEAN CALL TO ACTION                                   */}
      {/* ========================================================= */}
      <section className="px-6 py-14 text-center max-w-4xl mx-auto mb-14">
        <div className="rounded-3xl border border-blue-200/80 bg-gradient-to-br from-blue-50 via-white to-indigo-50/60 p-6 sm:p-10 shadow-[0_8px_30px_rgba(15,30,60,0.04)] backdrop-blur-xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-0.5 text-xs font-normal text-blue-700 mb-3">
            <Sparkles className="size-3" />
            <span>Ready in 30 Seconds</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-normal text-slate-900 tracking-tight leading-[1.2]">
            Ready to structure your AI conversations?
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
