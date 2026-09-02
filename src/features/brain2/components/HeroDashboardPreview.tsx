"use client";

import { useState } from "react";
import {
  Activity,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Code,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  FlaskConical,
  FolderKanban,
  GitBranch,
  GitPullRequest,
  History,
  Layers,
  LayoutGrid,
  Lightbulb,
  ListChecks,
  Lock,
  LockKeyhole,
  MessagesSquare,
  NotebookTabs,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Terminal,
  TrendingUp,
  Upload,
  Workflow,
  X,
  Zap,
} from "lucide-react";

type NavItemId =
  | "home"
  | "b2job"
  | "search"
  | "projects"
  | "notebooks"
  | "wiki"
  | "conversations"
  | "timeline"
  | "ticks"
  | "decisions"
  | "discover"
  | "patterns"
  | "experiments"
  | "missions"
  | "outputs";

interface NavItem {
  id: NavItemId;
  title: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
}

const memoryItems: NavItem[] = [
  { id: "home", title: "Home", icon: LayoutGrid },
  { id: "b2job", title: "Ask / B2JOB", icon: BrainCircuit },
  { id: "search", title: "Search & Recall", icon: Search },
  { id: "projects", title: "Projects", icon: FolderKanban },
  { id: "notebooks", title: "Live Notebooks", icon: NotebookTabs },
  { id: "wiki", title: "LifeWiki", icon: BookOpen },
  { id: "conversations", title: "Conversations", icon: MessagesSquare },
  { id: "timeline", title: "Timeline", icon: CalendarDays },
];

const intelligenceItems: NavItem[] = [
  { id: "ticks", title: "Things That Need You", icon: ListChecks },
  { id: "decisions", title: "Decisions", icon: Target },
  { id: "discover", title: "Discover", icon: Lightbulb },
  { id: "patterns", title: "Patterns", icon: BrainCircuit },
  { id: "experiments", title: "Experiments", icon: FlaskConical },
  { id: "missions", title: "Brain2Missions", icon: History },
  { id: "outputs", title: "Outputs & Reports", icon: ShieldCheck },
];

// Rich Sample Data for In-Depth Drill-Downs
const sampleConversations = [
  {
    id: "conv-1",
    provider: "ChatGPT",
    providerColor: "bg-emerald-50 text-emerald-700",
    title: "Distributed Vector Memory Architecture & Storage Engine",
    date: "2 days ago",
    messagesCount: 34,
    atomsCount: 12,
    topic: "IndexedDB + Dexie.js Schema Design",
    turns: [
      {
        role: "user",
        text: "How can we structure browser IndexedDB to handle 100,000 conversation messages without UI freezing or huge garbage collection spikes?",
      },
      {
        role: "assistant",
        text: "We should partition storage into two tiers: Volatile Fast Memory (LRU in-memory cache) and IndexedDB Cold Storage with chunked secondary indices on `projectId` and `timestamp`. Use Dexie.js v4 with Web Workers for batch atom extraction.",
      },
      {
        role: "user",
        text: "Agreed. Let's make IndexedDB the authoritative store and make sure passphrases never leave RAM.",
      },
    ],
    atomsExtracted: [
      { kind: "DECISION", text: "IndexedDB partitioned with Dexie.js is authoritative master store." },
      { kind: "CONSTRAINT", text: "Passphrase and derived keys must never touch disk storage." },
      { kind: "TASK", text: "Implement WebAssembly decompression worker in fflate." },
    ],
    hash: "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
  },
  {
    id: "conv-2",
    provider: "Claude",
    providerColor: "bg-purple-50 text-purple-700",
    title: "Autonomous Agent Consensus Protocol & P2P Synchronization",
    date: "3 days ago",
    messagesCount: 22,
    atomsCount: 8,
    topic: "WebRTC Mesh Sync & CRDTs",
    turns: [
      {
        role: "user",
        text: "When synchronizing project deltas between two local laptops without a centralized server, how do we resolve merge conflicts?",
      },
      {
        role: "assistant",
        text: "Use state-based CRDTs (LWW-Element-Set) tied to monotonic sequence hashes. Each mutation turn is signed with a deterministic turn hash. When conflicting ADRs occur, the Truth Engine flags them as `ACTION NEEDED` operator ticks.",
      },
    ],
    atomsExtracted: [
      { kind: "DECISION", text: "LWW-Element-Set CRDTs used for multi-device peer delta merges." },
      { kind: "FACT", text: "Direct WebSockets / WebRTC data channels handle device mesh without intermediaries." },
    ],
    hash: "sha256:3a1b4c9e8d7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b",
  },
  {
    id: "conv-3",
    provider: "Gemini",
    providerColor: "bg-blue-50 text-blue-700",
    title: "Next-Gen Local Inference Pipeline (WASM & ONNX)",
    date: "4 days ago",
    messagesCount: 16,
    atomsCount: 6,
    topic: "4-bit Quantization & Local Tokenizer",
    turns: [
      {
        role: "user",
        text: "Can we run a 0.5B parameter tokenization and proposition extraction model entirely in browser WebAssembly?",
      },
      {
        role: "assistant",
        text: "Yes. Using ONNX Runtime Web with WebGPU / WASM execution backend, Qwen2.5-0.5B runs at ~14.2ms per turn and uses under 380MB volatile RAM.",
      },
    ],
    atomsExtracted: [
      { kind: "FACT", text: "ONNX Runtime Web executes client proposition extraction at 14.2ms latency." },
      { kind: "DECISION", text: "Fallback to regex rule engine when WebGPU is unavailable." },
    ],
    hash: "sha256:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
  },
];

const sampleWikiArticles = [
  {
    id: "wiki-1",
    title: "Local-First Architecture & Provenance Standards",
    category: "Architecture",
    sources: "Compiled from 8 chats · 48 atoms",
    sections: [
      {
        heading: "1. Authoritative Client Storage",
        body: "All conversation memory entities are persisted strictly within browser IndexedDB. Cloud servers act solely as transient computation surfaces with zero retention.",
      },
      {
        heading: "2. Cryptographic Turn Hashes",
        body: "Every atom references a deterministic SHA-256 hash. If an audit is required, 1-click jumps directly to the exact conversation turn with verified quotes.",
      },
      {
        heading: "3. Conflict Reconciliation",
        body: "When decisions evolve over time, older claims are marked as SUPERSEDED while maintaining complete immutable history in the lineage tree.",
      },
    ],
  },
  {
    id: "wiki-2",
    title: "Vault Security: PBKDF2 (200k) + AES-256-GCM",
    category: "Security",
    sources: "Compiled from 6 chats · 32 atoms",
    sections: [
      {
        heading: "1. Key Derivation Standard",
        body: "User passphrases derive master keys via 200,000 PBKDF2 rounds with SHA-256 and unique 128-bit salt buffers.",
      },
      {
        heading: "2. Encrypted .B2M Export Packages",
        body: "All projects, chats, and evidence blocks are packed into a single portable binary file with authenticated AES-GCM tags.",
      },
    ],
  },
];

export function HeroDashboardPreview() {
  const [activeTab, setActiveTab] = useState<NavItemId>("home");
  const [searchFilter, setSearchFilter] = useState("all");
  const [resolvedTicks, setResolvedTicks] = useState<number[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedWikiArticle, setSelectedWikiArticle] = useState<string>("wiki-1");
  const [decisionFilter, setDecisionFilter] = useState<"all" | "approved" | "active" | "superseded">("all");
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<number | null>(null);
  const [revivedGold, setRevivedGold] = useState<number[]>([]);
  const [copiedContext, setCopiedContext] = useState(false);
  const [selectedInspectItem, setSelectedInspectItem] = useState<{
    title: string;
    type: string;
    details: string;
    hash: string;
  } | null>(null);

  const handleResolveTick = (id: number) => {
    if (!resolvedTicks.includes(id)) {
      setResolvedTicks([...resolvedTicks, id]);
    }
  };

  const handleRunBenchmark = () => {
    setIsBenchmarking(true);
    setTimeout(() => {
      setIsBenchmarking(false);
      setBenchmarkResult(14.2);
    }, 700);
  };

  const handleReviveGold = (id: number) => {
    if (!revivedGold.includes(id)) {
      setRevivedGold([...revivedGold, id]);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedContext(true);
    setTimeout(() => setCopiedContext(false), 2000);
  };

  return (
    <div className="relative mx-auto mt-12 w-full max-w-6xl">
      {/* Ambient background soft glow behind preview */}
      <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[32px] bg-gradient-to-tr from-blue-500/15 via-indigo-500/10 to-purple-500/15 blur-2xl" />

      {/* Main Container Mockup Window */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-[26px] border border-slate-200/90 bg-white/95 shadow-[0_25px_70px_-15px_rgba(15,30,60,0.12)] backdrop-blur-xl transition-all duration-300">
        
        {/* Mobile Horizontal Tab Scroller (Visible on small screens) */}
        <div className="md:hidden flex items-center gap-1.5 overflow-x-auto p-2.5 bg-slate-100/80 border-b border-slate-200 scrollbar-none">
          {[...memoryItems, ...intelligenceItems].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSelectedInspectItem(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-blue-600 text-white font-medium shadow-2xs"
                    : "bg-white text-slate-700 border border-slate-200"
                }`}
              >
                <Icon className="size-3" />
                <span>{item.title}</span>
              </button>
            );
          })}
        </div>

        {/* Dashboard Grid Layout (Sidebar + Main Content Pane) */}
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr] min-h-[620px] bg-white">
          {/* ========================================================= */}
          {/* LEFT SIDEBAR (Interactive Switcher)                       */}
          {/* ========================================================= */}
          <aside className="hidden md:flex flex-col justify-between border-r border-slate-200/70 bg-slate-50/50 p-3.5 text-xs select-none">
            <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1 scrollbar-thin">
              {/* Group 1: MEMORY */}
              <div className="space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  MEMORY
                </div>
                {memoryItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setSelectedInspectItem(null);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-all ${
                        isActive
                          ? "bg-blue-50/90 text-blue-700 font-semibold border-l-2 border-blue-600 shadow-2xs"
                          : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 font-normal"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`size-3.5 shrink-0 ${isActive ? "text-blue-600" : "text-slate-500"}`} />
                        <span className="truncate text-[11px]">{item.title}</span>
                      </div>
                      {item.badge && (
                        <span className={`rounded-full px-1.5 py-0.2 text-[9px] ${item.badgeColor || "bg-slate-100 text-slate-600"}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Group 2: INTELLIGENCE */}
              <div className="space-y-1 pt-2 border-t border-slate-200/60">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  INTELLIGENCE
                </div>
                {intelligenceItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setSelectedInspectItem(null);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-all ${
                        isActive
                          ? "bg-blue-50/90 text-blue-700 font-semibold border-l-2 border-blue-600 shadow-2xs"
                          : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 font-normal"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`size-3.5 shrink-0 ${isActive ? "text-blue-600" : "text-slate-500"}`} />
                        <span className="truncate text-[11px]">{item.title}</span>
                      </div>
                      {item.badge && (
                        <span className={`rounded-full px-1.5 py-0.2 text-[9px] ${item.badgeColor || "bg-slate-100 text-slate-600"}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Status Pill */}
            <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Local DB Engine</span>
              </div>
              <span className="font-mono text-slate-400">0.4ms</span>
            </div>
          </aside>

          {/* ========================================================= */}
          {/* MAIN CONTENT WORKSPACE (Rich Interactive Detail Views)     */}
          {/* ========================================================= */}
          <main className="relative p-5 sm:p-7 lg:p-8 bg-white flex flex-col justify-between overflow-y-auto max-h-[620px]">
            
            {/* 1. HOME VIEW */}
            {activeTab === "home" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Authoritative Workspace</span>
                    </div>
                    <h2 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                      Brain2 AI Miner · Mission Control
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500">
                      Canonical local intelligence synthesized from 14,280 messages across ChatGPT, Claude & Gemini.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab("conversations")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      <MessagesSquare className="size-3 text-slate-500" />
                      <span>View Chats</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("b2job")}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
                    >
                      <BrainCircuit className="size-3.5" />
                      <span>Ask AI</span>
                    </button>
                  </div>
                </div>

                {/* Top Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      <span>Total Ingested</span>
                      <MessagesSquare className="size-3 text-slate-400" />
                    </div>
                    <div className="mt-1.5 text-2xl font-bold text-slate-900 font-mono">1,480</div>
                    <div className="mt-1 text-[10px] text-emerald-600 font-medium">100% deduplicated atoms</div>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      <span>Provenance Hash</span>
                      <ShieldCheck className="size-3 text-blue-500" />
                    </div>
                    <div className="mt-1.5 text-2xl font-bold text-slate-900 font-mono">SHA-256</div>
                    <div className="mt-1 text-[10px] text-blue-600 font-medium">Zero unverified claims</div>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      <span>Current Truth</span>
                      <Target className="size-3 text-purple-500" />
                    </div>
                    <div className="mt-1.5 text-2xl font-bold text-slate-900 font-mono">24</div>
                    <div className="mt-1 text-[10px] text-purple-600 font-medium">3 superseding updates</div>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      <span>Store Latency</span>
                      <Zap className="size-3 text-amber-500" />
                    </div>
                    <div className="mt-1.5 text-2xl font-bold text-slate-900 font-mono">0.38ms</div>
                    <div className="mt-1 text-[10px] text-emerald-600 font-medium">IndexedDB local engine</div>
                  </div>
                </div>

                {/* Information Refinery Flow */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Workflow className="size-4 text-blue-600" />
                      <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                        Information Refinery Pipeline
                      </span>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-mono text-blue-600 font-medium">
                      Active Stage: RECONCILE
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-center text-xs">
                    <div
                      onClick={() => setActiveTab("conversations")}
                      className="min-w-0 rounded-xl bg-slate-50 p-2 sm:p-2.5 border border-slate-100 flex flex-col justify-center cursor-pointer hover:border-blue-300 hover:bg-white transition-all"
                    >
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">SOURCE</div>
                      <div className="text-xs sm:text-sm lg:text-base font-bold text-slate-800 truncate">12 Archives</div>
                      <div className="text-[9px] text-slate-500 truncate">14,280 msgs</div>
                    </div>
                    <div
                      onClick={() => setActiveTab("search")}
                      className="min-w-0 rounded-xl bg-slate-50 p-2 sm:p-2.5 border border-slate-100 flex flex-col justify-center cursor-pointer hover:border-blue-300 hover:bg-white transition-all"
                    >
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">ATOMIZE</div>
                      <div className="text-xs sm:text-sm lg:text-base font-bold text-slate-800 truncate">1,480 Atoms</div>
                      <div className="text-[9px] text-slate-500 truncate">Claims & facts</div>
                    </div>
                    <div
                      onClick={() => setActiveTab("decisions")}
                      className="min-w-0 rounded-xl bg-blue-50/90 p-2 sm:p-2.5 border border-blue-200/90 text-blue-900 shadow-2xs flex flex-col justify-center cursor-pointer hover:border-blue-400 transition-all"
                    >
                      <div className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider truncate">RECONCILE</div>
                      <div className="text-xs sm:text-sm lg:text-base font-bold truncate">24 Truths</div>
                      <div className="text-[9px] text-blue-600 font-medium truncate">0 conflicts</div>
                    </div>
                    <div
                      onClick={() => setActiveTab("patterns")}
                      className="min-w-0 rounded-xl bg-slate-50 p-2 sm:p-2.5 border border-slate-100 flex flex-col justify-center cursor-pointer hover:border-blue-300 hover:bg-white transition-all"
                    >
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">PATTERNS</div>
                      <div className="text-xs sm:text-sm lg:text-base font-bold text-slate-800 truncate">8 Signals</div>
                      <div className="text-[9px] text-slate-500 truncate">Cognitive flow</div>
                    </div>
                    <div
                      onClick={() => setActiveTab("outputs")}
                      className="min-w-0 rounded-xl bg-slate-50 p-2 sm:p-2.5 border border-slate-100 col-span-2 sm:col-span-1 lg:col-span-1 flex flex-col justify-center cursor-pointer hover:border-blue-300 hover:bg-white transition-all"
                    >
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">EXPERTISE</div>
                      <div className="text-xs sm:text-sm lg:text-base font-bold text-slate-800 truncate">Portable</div>
                      <div className="text-[9px] text-emerald-600 font-medium truncate">.B2M Verified</div>
                    </div>
                  </div>
                </div>

                {/* Recent Projects Preview */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <span>Living Project Contexts</span>
                    <span className="text-[10px] text-blue-600 cursor-pointer font-normal hover:underline" onClick={() => setActiveTab("projects")}>View all projects →</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 hover:border-blue-300 hover:bg-white transition-all cursor-pointer shadow-2xs" onClick={() => setActiveTab("projects")}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 text-xs">ai-miner-web</span>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-medium text-emerald-700">Authoritative</span>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-600">
                        Local-first conversation intelligence & provenance engine.
                      </p>
                      <div className="mt-3 flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                        <span>12 Chats</span>
                        <span>•</span>
                        <span>840 Atoms</span>
                        <span>•</span>
                        <span>2 Ticks</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 hover:border-blue-300 hover:bg-white transition-all cursor-pointer shadow-2xs" onClick={() => setActiveTab("projects")}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 text-xs">auth-vault-v2</span>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-medium text-blue-700">Encrypted</span>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-600">
                        PBKDF2 + AES-256-GCM client-side vault with zero cloud dependency.
                      </p>
                      <div className="mt-3 flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                        <span>6 Chats</span>
                        <span>•</span>
                        <span>390 Atoms</span>
                        <span>•</span>
                        <span>1 Tick</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. ASK / B2JOB VIEW */}
            {activeTab === "b2job" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                      Ask / B2JOB Compiler & Query Engine
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500">
                      Compile natural language questions into source-backed, cryptographically cited answer packages.
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-mono font-medium text-blue-700">
                    MRS Controller: Ready
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>Query Canonical Intelligence:</span>
                    <span className="text-[10px] text-slate-400 font-normal">Scope: All Memory (14,280 msgs)</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs text-slate-800 font-medium leading-relaxed">
                    &quot;Extract all architectural decisions made regarding the PBKDF2 encryption vault and AES-256-GCM cipher parameters across Claude and ChatGPT exports.&quot;
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600">Projection: auth-vault-v2</span>
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700 font-medium">3 Provenance Citations</span>
                    </div>
                    <button
                      onClick={() => handleCopyText("### B2JOB Context\nADR-002: PBKDF2 (100k) + AES-256-GCM\nConstraint: Zero cloud storage")}
                      className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-2xs"
                    >
                      {copiedContext ? "Copied to Clipboard ✓" : "Compile B2JOB Package"}
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <span>Compiled Provenance Citations</span>
                    <span className="font-mono text-[10px]">Execution Latency: 1.2s</span>
                  </div>

                  {/* Citation 1 */}
                  <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        <span className="text-xs font-semibold text-emerald-900">Decision Candidate #04 · Current Truth</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">99.4% Match</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed pl-6">
                      &quot;The client vault derives encryption keys using PBKDF2 with SHA-256 (100,000 rounds) and executes AES-256-GCM in Web Crypto API.&quot;
                    </p>
                    <div className="pt-2 border-t border-emerald-100 text-[10px] font-mono text-slate-500 flex items-center justify-between pl-6">
                      <span>Source: ChatGPT_export_2024.zip / turn_84</span>
                      <span className="text-slate-400">Hash: sha256:8f4c2e1b...9a03</span>
                    </div>
                  </div>

                  {/* Citation 2 */}
                  <div className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-blue-600" />
                        <span className="text-xs font-semibold text-slate-800">Constraint #18 · Authoritative Store</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-medium">96.8% Match</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed pl-6">
                      &quot;IndexedDB is authoritative for memory states. Cloud runtimes act only as transient execution surfaces with zero data retention.&quot;
                    </p>
                    <div className="pt-2 border-t border-slate-100 text-[10px] font-mono text-slate-500 flex items-center justify-between pl-6">
                      <span>Source: Claude_export_May.zip / turn_19</span>
                      <span className="text-slate-400">Hash: sha256:3a1b4c9e...2f10</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. SEARCH & RECALL */}
            {activeTab === "search" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                    Search & Recall
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-slate-500">
                    Instant full-text index across message turns, current truths, and project assertions.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3 size-4 text-slate-400" />
                    <input
                      type="text"
                      defaultValue="PBKDF2 key derivation"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-blue-600 shadow-2xs font-normal"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {["All (28)", "Current Truth (12)", "Superseded (6)", "Source Atoms (10)"].map((filter, i) => (
                      <button
                        key={filter}
                        onClick={() => setSearchFilter(filter)}
                        className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                          (searchFilter === filter) || (i === 0 && searchFilter === "all")
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>3 TOP RANKED MATCHES</span>
                    <span className="font-mono text-[10px]">Index scan: 0.2ms</span>
                  </div>

                  <div
                    onClick={() => setSelectedInspectItem({
                      title: "PBKDF2 Master Key Derivation Strategy",
                      type: "DECISION",
                      details: "Derived key uses 100,000 iterations of SHA-256 for passphrase stretching before initializing client AES-GCM cipher.",
                      hash: "sha256:8f4c2e1b9a03c4d5e6f7a8b9c0d1e2f3",
                    })}
                    className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-blue-300 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900">PBKDF2 Master Key Derivation Strategy</span>
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">DECISION</span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                      Derived key uses 100,000 iterations of SHA-256 for passphrase stretching before initializing client AES-GCM cipher.
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>ChatGPT_export · turn_84</span>
                      <span className="text-emerald-600 font-semibold">Score: 99.4% · Click to Inspect →</span>
                    </div>
                  </div>

                  <div
                    onClick={() => setSelectedInspectItem({
                      title: "IndexedDB Storage Schema Version 4",
                      type: "SCHEMA",
                      details: "Schema v4 stores raw messages, atomized claims, living project summaries, and resolution ticks in structured IndexedDB stores.",
                      hash: "sha256:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d",
                    })}
                    className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-blue-300 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900">IndexedDB Storage Schema Version 4</span>
                      <span className="rounded bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">SCHEMA</span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                      Schema v4 stores raw messages, atomized claims, living project summaries, and resolution ticks in structured stores.
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Claude_export · turn_12</span>
                      <span className="text-blue-600 font-semibold">Score: 96.7% · Click to Inspect →</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. PROJECTS */}
            {activeTab === "projects" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                      Living Projects
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500">
                      Projects are identity-resolved working contexts built from related conversations over canonical memory.
                    </p>
                  </div>
                  <button className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-600 transition-colors shadow-2xs">
                    <Plus className="size-3.5" />
                    <span>New Project</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3.5">
                  <div
                    onClick={() => setActiveTab("wiki")}
                    className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-blue-300 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold">
                          <FolderKanban className="size-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">ai-miner-web</h4>
                          <span className="text-[10px] text-slate-400 font-mono">Updated 12 mins ago · Health: 100%</span>
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">AUTHORITATIVE</span>
                    </div>
                    <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">
                      Privacy-first AI intelligence workspace that transforms messy chat exports into structured memory and verifiable evidence.
                    </p>
                    <div className="mt-3.5 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2 text-center text-xs">
                      <div>
                        <div className="font-bold text-slate-900 font-mono">12</div>
                        <div className="text-[9px] uppercase text-slate-400">Chats</div>
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 font-mono">840</div>
                        <div className="text-[9px] uppercase text-slate-400">Atoms</div>
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 font-mono">2</div>
                        <div className="text-[9px] uppercase text-slate-400">Open Ticks</div>
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveTab("decisions")}
                    className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-blue-300 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold">
                          <FolderKanban className="size-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">auth-vault-v2</h4>
                          <span className="text-[10px] text-slate-400 font-mono">Updated 2 hours ago · Health: 98%</span>
                        </div>
                      </div>
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">ENCRYPTED</span>
                    </div>
                    <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">
                      PBKDF2-SHA256 and 256-bit AES-GCM snapshot vault encryption contracts.
                    </p>
                    <div className="mt-3.5 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2 text-center text-xs">
                      <div>
                        <div className="font-bold text-slate-900 font-mono">6</div>
                        <div className="text-[9px] uppercase text-slate-400">Chats</div>
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 font-mono">390</div>
                        <div className="text-[9px] uppercase text-slate-400">Atoms</div>
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 font-mono">1</div>
                        <div className="text-[9px] uppercase text-slate-400">Open Ticks</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. LIVE NOTEBOOKS */}
            {activeTab === "notebooks" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                      Live Synthesis Notebooks
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500">
                      Executable documents compiling NOW context, findings, evidence, and decisions.
                    </p>
                  </div>
                  <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600 transition-colors">
                    + New Notebook
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      <NotebookTabs className="size-4 text-blue-600" />
                      <span className="font-semibold text-xs text-slate-900">Architecture-Decisions.b2nb</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-semibold">Live Synced</span>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="rounded-xl bg-white p-3.5 border border-slate-200/70 shadow-2xs">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase text-blue-600">
                        <span>Cell 01 · NOW Context</span>
                        <span className="text-slate-400 font-mono">Deterministic State</span>
                      </div>
                      <p className="mt-1.5 text-slate-700 leading-relaxed">
                        Currently focusing on deterministic provenance hash verification in IndexedDB schema v4. Zero remote dependencies.
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-3.5 border border-slate-200/70 shadow-2xs">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase text-purple-600">
                        <span>Cell 02 · Cryptographic Evidence</span>
                        <span className="text-slate-400 font-mono">100% Provenance</span>
                      </div>
                      <p className="mt-1.5 text-slate-700 leading-relaxed">
                        Reconciled 14 claims from ChatGPT and Claude export archives with verifiable SHA-256 byte hashes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. LIFEWIKI */}
            {activeTab === "wiki" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                      LifeWiki Knowledge Graph
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500">
                      Living knowledge pages automatically compiled and updated from conversation history.
                    </p>
                  </div>
                  {/* Article Tabs */}
                  <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
                    {sampleWikiArticles.map((art) => (
                      <button
                        key={art.id}
                        onClick={() => setSelectedWikiArticle(art.id)}
                        className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                          selectedWikiArticle === art.id
                            ? "bg-white text-blue-600 font-semibold shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {art.category}
                      </button>
                    ))}
                  </div>
                </div>

                {(() => {
                  const art = sampleWikiArticles.find((a) => a.id === selectedWikiArticle) || sampleWikiArticles[0];
                  return (
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">{art.category} Standard</span>
                          <h4 className="font-bold text-base text-slate-900 mt-0.5">{art.title}</h4>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{art.sources}</span>
                      </div>
                      <div className="text-xs text-slate-700 leading-relaxed space-y-3">
                        {art.sections.map((sec) => (
                          <div key={sec.heading} className="rounded-xl bg-slate-50/70 p-3 border border-slate-100">
                            <strong className="text-slate-900">{sec.heading}</strong>
                            <p className="mt-1 text-slate-600">{sec.body}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 7. CONVERSATIONS (Deep Interactive Chat Inspector) */}
            {activeTab === "conversations" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                      Ingested Conversations
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500">
                      Click any conversation below to inspect full turns and extracted atoms.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                    3 Indexed Threads
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {sampleConversations.map((conv) => {
                    const isSelected = selectedConversation === conv.id;
                    return (
                      <div
                        key={conv.id}
                        className={`rounded-2xl border transition-all ${
                          isSelected
                            ? "border-blue-500 bg-blue-50/20 shadow-md ring-1 ring-blue-500/20"
                            : "border-slate-200/80 bg-white hover:border-slate-300 shadow-2xs"
                        }`}
                      >
                        {/* Conversation Card Header */}
                        <div
                          onClick={() => setSelectedConversation(isSelected ? null : conv.id)}
                          className="p-4 flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${conv.providerColor}`}>
                              {conv.provider}
                            </span>
                            <div>
                              <div className="text-xs font-semibold text-slate-900">{conv.title}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                {conv.messagesCount} msgs · {conv.atomsCount} atoms · {conv.topic}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-400">{conv.date}</span>
                            <ChevronDown className={`size-4 text-slate-400 transition-transform ${isSelected ? "rotate-180 text-blue-600" : ""}`} />
                          </div>
                        </div>

                        {/* Expanded Turn-by-Turn Chat Transcript */}
                        {isSelected && (
                          <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Turn History & Provenance
                            </div>
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                              {conv.turns.map((turn, tIdx) => (
                                <div
                                  key={tIdx}
                                  className={`p-3 rounded-xl text-xs ${
                                    turn.role === "user"
                                      ? "bg-slate-100 text-slate-800 ml-4"
                                      : "bg-blue-50/80 border border-blue-100 text-blue-950 mr-4"
                                  }`}
                                >
                                  <div className="text-[9px] font-bold uppercase text-slate-400 mb-1">
                                    {turn.role === "user" ? "You (Operator)" : `${conv.provider} Assistant`}
                                  </div>
                                  <p className="leading-relaxed">{turn.text}</p>
                                </div>
                              ))}
                            </div>

                            {/* Extracted Atoms Chips */}
                            <div className="pt-2 border-t border-slate-100">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                Extracted Knowledge Atoms ({conv.atomsExtracted.length})
                              </div>
                              <div className="space-y-1">
                                {conv.atomsExtracted.map((atom, aIdx) => (
                                  <div key={aIdx} className="flex items-center gap-2 text-[11px] bg-white p-2 rounded-lg border border-slate-200/80">
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                      {atom.kind}
                                    </span>
                                    <span className="text-slate-700 truncate">{atom.text}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 8. TIMELINE (Deep Audit Lineage) */}
            {activeTab === "timeline" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                    Memory Timeline
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-slate-500">
                    Chronological milestone history of insights, exports, and project resolutions.
                  </p>
                </div>

                <div className="space-y-4 pl-3 border-l-2 border-slate-200 ml-2">
                  <div
                    onClick={() => setSelectedInspectItem({
                      title: "Today · Reconstructed Project 'ai-miner-web'",
                      type: "TIMELINE_EVENT",
                      details: "Generated 1,480 message atoms across 12 chat threads with deterministic SHA-256 hashes.",
                      hash: "sha256:7f83b1657ff1fc53b92dc18148a1d65d",
                    })}
                    className="relative pl-4 cursor-pointer group"
                  >
                    <span className="absolute -left-[23px] top-1 size-2.5 rounded-full bg-blue-600 ring-4 ring-blue-50 group-hover:scale-125 transition-transform" />
                    <div className="text-xs font-semibold text-slate-900 group-hover:text-blue-600">Today · Reconstructed Project &quot;ai-miner-web&quot;</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Generated 1,480 message atoms across 12 chat threads with deterministic hashes.</div>
                  </div>
                  <div
                    onClick={() => setSelectedInspectItem({
                      title: "Yesterday · Ingested ChatGPT 2024 Archive",
                      type: "TIMELINE_EVENT",
                      details: "Preserved stable IDs and SHA-256 provenance hashes without remote data leakage.",
                      hash: "sha256:3a1b4c9e8d7f6a5b4c3d2e1f0a9b8c7d",
                    })}
                    className="relative pl-4 cursor-pointer group"
                  >
                    <span className="absolute -left-[23px] top-1 size-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50 group-hover:scale-125 transition-transform" />
                    <div className="text-xs font-semibold text-slate-900 group-hover:text-emerald-600">Yesterday · Ingested ChatGPT 2024 Archive</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Preserved stable IDs and SHA-256 provenance hashes without remote data leakage.</div>
                  </div>
                  <div
                    onClick={() => setSelectedInspectItem({
                      title: "3 Days Ago · Resolved 24 Current Truth Candidates",
                      type: "TIMELINE_EVENT",
                      details: "Operator confirmed PBKDF2-SHA256 vault encryption standard across 6 conversations.",
                      hash: "sha256:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d",
                    })}
                    className="relative pl-4 cursor-pointer group"
                  >
                    <span className="absolute -left-[23px] top-1 size-2.5 rounded-full bg-purple-500 ring-4 ring-purple-50 group-hover:scale-125 transition-transform" />
                    <div className="text-xs font-semibold text-slate-900 group-hover:text-purple-600">3 Days Ago · Resolved 24 Current Truth Candidates</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Operator confirmed PBKDF2-SHA256 vault encryption standard across 6 conversations.</div>
                  </div>
                </div>
              </div>
            )}

            {/* 9. THINGS THAT NEED YOU (Interactive Resolution Ticks) */}
            {activeTab === "ticks" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                      Things That Need You (Operator Ticks)
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500">
                      Active attention items requiring human confirmation or decision reconciliation.
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                    {3 - resolvedTicks.length} Action{3 - resolvedTicks.length === 1 ? "" : "s"} Needed
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Tick 1 */}
                  <div className={`rounded-xl border p-4 shadow-2xs transition-all ${resolvedTicks.includes(1) ? "bg-slate-50/70 border-slate-200 opacity-60" : "bg-amber-50/40 border-amber-200/90"}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-amber-900">Tick #01 · Confirm Encryption Cipher Standard</span>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${resolvedTicks.includes(1) ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-800"}`}>
                        {resolvedTicks.includes(1) ? "RESOLVED" : "ACTION NEEDED"}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-700 leading-relaxed">
                      Confirm AES-256-GCM as authoritative default over ChaCha20-Poly1305 for .B2M export snapshot encryption.
                    </p>
                    {!resolvedTicks.includes(1) ? (
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => handleResolveTick(1)} className="rounded bg-amber-600 px-3 py-1 text-[10px] font-semibold text-white hover:bg-amber-700 transition-colors">
                          Resolve (Accept AES-256-GCM)
                        </button>
                        <button
                          onClick={() => setSelectedInspectItem({
                            title: "Encryption Cipher Lineage Inspection",
                            type: "OPERATOR_TICK",
                            details: "Claude recommended AES-256-GCM due to native hardware acceleration in Web Crypto API.",
                            hash: "sha256:cipher_aes256_lineage",
                          })}
                          className="rounded bg-white border border-slate-200 px-3 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Inspect Lineage
                        </button>
                      </div>
                    ) : (
                      <div className="mt-2 text-[10px] text-emerald-700 font-medium">✓ Resolved by Operator</div>
                    )}
                  </div>

                  {/* Tick 2 */}
                  <div className={`rounded-xl border p-4 shadow-2xs transition-all ${resolvedTicks.includes(2) ? "bg-slate-50/70 border-slate-200 opacity-60" : "bg-slate-50 border-slate-200"}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">Tick #02 · Merge Project Contexts: &quot;miner-ui&quot; → &quot;ai-miner-web&quot;</span>
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 text-[9px] font-bold rounded">
                        {resolvedTicks.includes(2) ? "MERGED" : "PROJECT ALIAS"}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                      4 older conversation turns refer to legacy name &quot;miner-ui&quot;. Reconcile identity into &quot;ai-miner-web&quot;.
                    </p>
                    {!resolvedTicks.includes(2) ? (
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => handleResolveTick(2)} className="rounded bg-slate-900 px-3 py-1 text-[10px] font-semibold text-white hover:bg-blue-600 transition-colors">
                          Merge Project Alias
                        </button>
                      </div>
                    ) : (
                      <div className="mt-2 text-[10px] text-emerald-700 font-medium">✓ Alias Merged Successfully</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 10. DECISIONS (ADR Registry with Filter Tabs) */}
            {activeTab === "decisions" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                      Architectural Decisions (ADR Registry)
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500">
                      Durable architectural decision records synthesized and agreed upon across projects.
                    </p>
                  </div>
                  <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                    {(["all", "approved", "active", "superseded"] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setDecisionFilter(filter)}
                        className={`px-2.5 py-1 rounded-lg capitalize transition-all ${
                          decisionFilter === filter
                            ? "bg-white text-purple-700 font-bold shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {(decisionFilter === "all" || decisionFilter === "approved") && (
                    <div
                      onClick={() => setSelectedInspectItem({
                        title: "ADR-001: Local-First IndexedDB as Sole Truth Store",
                        type: "DECISION_RECORD",
                        details: "Browser client holds authoritative state. Cloud nodes act solely as compute execution surfaces with zero data retention.",
                        hash: "sha256:adr001_indexeddb_sole_truth",
                      })}
                      className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-blue-300 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-900">ADR-001: Local-First IndexedDB as Sole Truth Store</span>
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">APPROVED</span>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                        Browser client holds authoritative state. Cloud nodes act solely as compute execution surfaces.
                      </p>
                      <div className="mt-2.5 text-[10px] text-slate-400 font-mono">Source: turn_12 (Claude export) · Click to view audit lineage →</div>
                    </div>
                  )}

                  {(decisionFilter === "all" || decisionFilter === "approved") && (
                    <div
                      onClick={() => setSelectedInspectItem({
                        title: "ADR-002: PBKDF2-SHA256 Key Derivation (100,000 rounds)",
                        type: "DECISION_RECORD",
                        details: "Passphrase encryption derives 256-bit keys using standard PBKDF2-SHA256 for portable .B2M packages.",
                        hash: "sha256:adr002_pbkdf2_256bit",
                      })}
                      className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-blue-300 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-900">ADR-002: PBKDF2-SHA256 Key Derivation (100,000 rounds)</span>
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">APPROVED</span>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                        Passphrase encryption derives 256-bit keys using standard PBKDF2-SHA256 for portable .B2M packages.
                      </p>
                      <div className="mt-2.5 text-[10px] text-slate-400 font-mono">Source: turn_84 (ChatGPT export) · Click to view audit lineage →</div>
                    </div>
                  )}

                  {(decisionFilter === "all" || decisionFilter === "active") && (
                    <div
                      onClick={() => setSelectedInspectItem({
                        title: "ADR-003: SHA-256 Deterministic Atom Content Hashing",
                        type: "DECISION_RECORD",
                        details: "All decomposed statements receive deterministic SHA-256 hashes to guarantee provenance integrity.",
                        hash: "sha256:adr003_deterministic_hashing",
                      })}
                      className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-blue-300 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-900">ADR-003: SHA-256 Deterministic Atom Content Hashing</span>
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">ACTIVE</span>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                        All decomposed statements receive deterministic SHA-256 hashes to guarantee provenance integrity.
                      </p>
                      <div className="mt-2.5 text-[10px] text-slate-400 font-mono">Source: turn_31 (Gemini export) · Click to view audit lineage →</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 11. DISCOVER (Resurfaced Gold with Interactive Revive) */}
            {activeTab === "discover" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                    Discover · Resurfaced Forgotten Gold
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-slate-500">
                    Resurfaced insights, abandoned breakthroughs, and latent ideas found in your conversation archives.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 via-purple-50/40 to-white p-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                        <Lightbulb className="size-4 text-indigo-600" />
                        <span>Resurfaced Breakthrough #01</span>
                      </div>
                      <span className="rounded bg-indigo-100 px-2 py-0.5 text-[9px] font-bold text-indigo-800">94% Relevance</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-700 leading-relaxed">
                      &quot;You drafted a WebAssembly-powered local ONNX tokenizer in May that achieved 10x faster keyword segmentation without network overhead.&quot;
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 font-mono pt-2 border-t border-indigo-100/80">
                      <span>Found in: Claude_export_May.zip / turn_42</span>
                      <button
                        onClick={() => handleReviveGold(1)}
                        className={`font-semibold transition-colors ${
                          revivedGold.includes(1) ? "text-emerald-600" : "text-indigo-600 hover:underline"
                        }`}
                      >
                        {revivedGold.includes(1) ? "✓ Revived into Project" : "Revive into Project →"}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                        <Flame className="size-4 text-amber-500" />
                        <span>Resurfaced Breakthrough #02</span>
                      </div>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600">88% Relevance</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-700 leading-relaxed">
                      &quot;Zero-Latency Bloom Filter Index specification for instantaneous sub-millisecond local message scans.&quot;
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-100">
                      <span>Found in: ChatGPT_export_2024.zip / turn_18</span>
                      <button
                        onClick={() => handleReviveGold(2)}
                        className={`font-semibold transition-colors ${
                          revivedGold.includes(2) ? "text-emerald-600" : "text-blue-600 hover:underline"
                        }`}
                      >
                        {revivedGold.includes(2) ? "✓ Revived into Project" : "Revive into Project →"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 12. PATTERNS */}
            {activeTab === "patterns" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                    Reasoning & Heuristic Patterns
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-slate-500">
                    Recurring problem-solving heuristics and prompting habits observed across years of chats.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Pattern 01: Zero-Fabrication Verification Loops</span>
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-mono text-blue-700 font-bold">42 Occurrences</span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                      Consistently requesting explicit SHA-256 evidence before accepting generated architecture mutations.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Pattern 02: State Machine Iterative Decomposition</span>
                      <span className="rounded bg-purple-50 px-2 py-0.5 text-[10px] font-mono text-purple-700 font-bold">28 Occurrences</span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                      Breaking complex multi-threaded pipelines into explicit deterministic transition steps.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 13. EXPERIMENTS (Interactive Benchmark Simulator) */}
            {activeTab === "experiments" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                      Intelligence Experiments & Benchmarks
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500">
                      A/B test runs on local tokenizers, ONNX models, and WebRTC mesh sync performance.
                    </p>
                  </div>
                  <button
                    onClick={handleRunBenchmark}
                    disabled={isBenchmarking}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Play className="size-3 fill-current" />
                    <span>{isBenchmarking ? "Running Benchmark..." : "Run Benchmark"}</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900">ONNX WebAssembly Model Latency (Qwen2.5-0.5B)</span>
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        {isBenchmarking ? "BENCHMARKING..." : "ONLINE"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Benchmarking client-side embedding generation with WebAssembly ONNX runtime.
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-center text-xs bg-slate-50 p-2.5 rounded-lg font-mono">
                      <div>
                        <span className="text-slate-400 text-[10px]">Turn Latency:</span>{" "}
                        <b className="text-emerald-700">{benchmarkResult ? `${benchmarkResult}ms` : "14.2ms"}</b>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Memory Envelope:</span>{" "}
                        <b className="text-slate-800">380MB</b>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 14. BRAIN2MISSIONS (Live Pipeline Control) */}
            {activeTab === "missions" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                      Autonomous Brain2Missions
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500">
                      Durable background pipelines for continuous reconciliation, atomization, and proof generation.
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-mono font-bold text-emerald-700">
                    2 Active Lanes
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900">Mission #412: Cognitive Atomization & Reconciliation v2</span>
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">COMMITTED</span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600">
                      Decomposition pass verified against 150 gold standards with 100% hash preservation.
                    </p>
                    <div className="mt-2.5 text-[10px] text-slate-400 font-mono">Checkpoint: verified • 1,480 atoms reconciled</div>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900">Mission #413: Core Mesh Synchronization Engine</span>
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">RUNNING (3/5)</span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600">
                      Deploying DTLS WebRTC replication across local browser instances.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 15. OUTPUTS & REPORTS (Interactive Download Simulation) */}
            {activeTab === "outputs" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                    Outputs & Reports
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-slate-500">
                    Compiled intelligence briefings and cryptographic proofs ready for export or audit.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">Quarterly Intelligence Briefing & Proofs</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">PDF + .B2M portable bundle · 4.2 MB</div>
                    </div>
                    <button
                      onClick={() => handleCopyText("Downloaded Quarterly Intelligence Proof Bundle: ai-miner-web-2026.b2m")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-blue-600 transition-colors"
                    >
                      <Download className="size-3" />
                      <span>{copiedContext ? "Exported ✓" : "Download"}</span>
                    </button>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">Provenance Hash Audit Log (1,480 Atoms)</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">Cryptographic verification CSV · 840 KB</div>
                    </div>
                    <button
                      onClick={() => handleCopyText("Exported CSV Audit Log: 1,480 atoms with verified SHA-256 hashes.")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Download className="size-3" />
                      <span>{copiedContext ? "Exported ✓" : "Export CSV"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE-IN INSPECTOR MODAL DRAWER (When inspecting any item) */}
            {selectedInspectItem && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-md p-6 z-20 flex flex-col justify-between animate-in slide-in-from-right-4 duration-200">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                        {selectedInspectItem.type}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">{selectedInspectItem.title}</h3>
                    </div>
                    <button
                      onClick={() => setSelectedInspectItem(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/70 text-xs text-slate-700 leading-relaxed">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Synthesized Rationale & Provenance
                      </div>
                      {selectedInspectItem.details}
                    </div>

                    <div className="rounded-xl bg-slate-900 p-3 text-[11px] font-mono text-emerald-400 flex items-center justify-between">
                      <div className="truncate pr-2">
                        <span className="text-slate-400">Hash: </span>
                        {selectedInspectItem.hash}
                      </div>
                      <span className="text-[10px] text-emerald-300 font-sans font-semibold bg-emerald-950 px-2 py-0.5 rounded">
                        Verified ✓
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => setSelectedInspectItem(null)}
                    className="rounded-lg bg-slate-900 text-white px-4 py-1.5 text-xs font-semibold hover:bg-blue-600 transition-colors"
                  >
                    Close Inspector
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Footer Details */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-3.5 text-emerald-600" />
                <span>100% Deterministic Provenance Preserved</span>
              </div>
              <div className="font-mono text-[10px]">IndexedDB Schema v4.0.0-stable</div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
