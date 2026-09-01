"use client";

import { useState } from "react";
import {
  Activity,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ChevronUp,
  Clock,
  Cpu,
  Download,
  ExternalLink,
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
  Smartphone,
  Sparkles,
  Target,
  Terminal,
  TrendingUp,
  Upload,
  Workflow,
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
  { id: "b2job", title: "Ask / B2JOB", icon: BrainCircuit, badge: "AI", badgeColor: "bg-blue-100 text-blue-700" },
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

export function HeroDashboardPreview() {
  const [activeTab, setActiveTab] = useState<NavItemId>("home");
  const [searchFilter, setSearchFilter] = useState("all");
  const [resolvedTicks, setResolvedTicks] = useState<number[]>([]);

  const handleResolveTick = (id: number) => {
    if (!resolvedTicks.includes(id)) {
      setResolvedTicks([...resolvedTicks, id]);
    }
  };

  return (
    <div className="relative mx-auto mt-12 w-full max-w-6xl">
      {/* Ambient background soft glow behind preview */}
      <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[32px] bg-gradient-to-tr from-blue-500/15 via-indigo-500/10 to-purple-500/15 blur-2xl" />

      {/* Main Container Mockup Window */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-[26px] border border-slate-200/90 bg-white/95 shadow-[0_25px_70px_-15px_rgba(15,30,60,0.12)] backdrop-blur-xl transition-all duration-300">
        {/* Dashboard Grid Layout (Sidebar + Main Content Pane) */}
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr] min-h-[620px] bg-white">
          {/* ========================================================= */}
          {/* LEFT SIDEBAR (Matching Exact User Specification)         */}
          {/* ========================================================= */}
          <aside className="hidden md:flex flex-col justify-between border-r border-slate-200/70 bg-slate-50/50 p-3.5 text-xs select-none">
            <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1 scrollbar-thin">
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
                      onClick={() => setActiveTab(item.id)}
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
                      onClick={() => setActiveTab(item.id)}
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
          </aside>

          {/* ========================================================= */}
          {/* MAIN CONTENT WORKSPACE (Detailed Realistic Dummy Views)   */}
          {/* ========================================================= */}
          <main className="p-5 sm:p-7 lg:p-8 bg-white flex flex-col justify-between overflow-y-auto max-h-[600px]">
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
                    <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs">
                      <RefreshCw className="size-3 text-slate-500" />
                      <span>Sync</span>
                    </button>
                    <button className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-600 transition-colors">
                      <Sparkles className="size-3.5" />
                      <span>Run Synthesis</span>
                    </button>
                  </div>
                </div>

                {/* Top Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      <span>Total Ingested</span>
                      <MessagesSquare className="size-3 text-slate-400" />
                    </div>
                    <div className="mt-1.5 text-2xl font-bold text-slate-900 font-mono">1,480</div>
                    <div className="mt-1 text-[10px] text-emerald-600 font-medium">100% deduplicated atoms</div>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      <span>Provenance Hash</span>
                      <ShieldCheck className="size-3 text-blue-500" />
                    </div>
                    <div className="mt-1.5 text-2xl font-bold text-slate-900 font-mono">SHA-256</div>
                    <div className="mt-1 text-[10px] text-blue-600 font-medium">Zero unverified claims</div>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      <span>Current Truth</span>
                      <Target className="size-3 text-purple-500" />
                    </div>
                    <div className="mt-1.5 text-2xl font-bold text-slate-900 font-mono">24</div>
                    <div className="mt-1 text-[10px] text-purple-600 font-medium">3 superseding updates</div>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
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
                  <div className="mt-4 grid grid-cols-5 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                      <div className="text-[10px] font-semibold text-slate-400">SOURCE</div>
                      <div className="text-base font-bold text-slate-800">12 Archives</div>
                      <div className="text-[9px] text-slate-500">14,280 msgs</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                      <div className="text-[10px] font-semibold text-slate-400">ATOMIZE</div>
                      <div className="text-base font-bold text-slate-800">1,480 Atoms</div>
                      <div className="text-[9px] text-slate-500">Claims & facts</div>
                    </div>
                    <div className="rounded-xl bg-blue-50/90 p-2.5 border border-blue-200/90 text-blue-900 shadow-2xs">
                      <div className="text-[10px] font-semibold text-blue-600">RECONCILE</div>
                      <div className="text-base font-bold">24 Truths</div>
                      <div className="text-[9px] text-blue-600 font-medium">0 conflicts</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                      <div className="text-[10px] font-semibold text-slate-400">PATTERNS</div>
                      <div className="text-base font-bold text-slate-800">8 Signals</div>
                      <div className="text-[9px] text-slate-500">Cognitive flow</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                      <div className="text-[10px] font-semibold text-slate-400">EXPERTISE</div>
                      <div className="text-base font-bold text-slate-800">Portable</div>
                      <div className="text-[9px] text-emerald-600 font-medium">.B2M Verified</div>
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
                    <button className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-2xs">
                      Compile B2JOB Package
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
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-blue-600 shadow-2xs"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {["All (28)", "Current Truth (12)", "Superseded (6)", "Source Atoms (10)"].map((filter, i) => (
                      <button
                        key={filter}
                        onClick={() => setSearchFilter(filter)}
                        className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                          i === 0
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

                  <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-blue-300 transition-all">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900">PBKDF2 Master Key Derivation Strategy</span>
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">DECISION</span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                      Derived key uses 100,000 iterations of SHA-256 for passphrase stretching before initializing client AES-GCM cipher.
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>ChatGPT_export · turn_84</span>
                      <span className="text-emerald-600 font-semibold">Score: 99.4%</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-blue-300 transition-all">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900">IndexedDB Storage Schema Version 4</span>
                      <span className="rounded bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">SCHEMA</span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                      Schema v4 stores raw messages, atomized claims, living project summaries, and resolution ticks in structured stores.
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Claude_export · turn_12</span>
                      <span className="text-blue-600 font-semibold">Score: 96.7%</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-blue-300 transition-all">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900">DTLS-Encrypted WebRTC Mesh Sync</span>
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">FACT</span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                      Direct peer-to-peer memory replication without centralized relay intermediaries.
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Gemini_export · turn_31</span>
                      <span className="text-blue-600 font-semibold">Score: 94.2%</span>
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
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-blue-300 transition-all">
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

                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-blue-300 transition-all">
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
                  <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
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
                <div>
                  <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                    LifeWiki Knowledge Graph
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-slate-500">
                    Living knowledge pages automatically compiled and updated from conversation history.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Article #14</span>
                      <h4 className="font-bold text-sm text-slate-900">Local-First Architecture & Provenance Standards</h4>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Compiled from 8 chats</span>
                  </div>
                  <div className="text-xs text-slate-700 leading-relaxed space-y-3">
                    <div>
                      <strong className="text-slate-900">1. Authoritative Store:</strong>
                      <p className="mt-0.5 text-slate-600">All conversation memory entities are persisted strictly within IndexedDB. The local client holds master state authority.</p>
                    </div>
                    <div>
                      <strong className="text-slate-900">2. Provenance Accounting:</strong>
                      <p className="mt-0.5 text-slate-600">Every synthesized fact and decision links directly back to the original source turn hash.</p>
                    </div>
                    <div>
                      <strong className="text-slate-900">3. Immutable Lineage:</strong>
                      <p className="mt-0.5 text-slate-600">Superceded claims produce immutable prior-version records instead of silent overwrites.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 7. CONVERSATIONS */}
            {activeTab === "conversations" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                      Ingested Conversations
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500">
                      Normalized archives from OpenAI ChatGPT, Anthropic Claude, and Google Gemini.
                    </p>
                  </div>
                  <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
                    Import ZIP
                  </button>
                </div>

                <div className="space-y-2.5">
                  <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs flex items-center justify-between hover:border-blue-300 transition-all cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs">
                        GPT
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900">Distributed Vector Memory Architecture</div>
                        <div className="text-[10px] text-slate-400">34 messages · 12 atoms extracted · IndexedDB</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">2d ago</span>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs flex items-center justify-between hover:border-blue-300 transition-all cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-purple-50 text-purple-700 font-bold text-xs">
                        CLA
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900">Autonomous Agent Consensus Protocol</div>
                        <div className="text-[10px] text-slate-400">22 messages · 8 atoms extracted · P2P</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">3d ago</span>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs flex items-center justify-between hover:border-blue-300 transition-all cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 font-bold text-xs">
                        GEM
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900">Next-Gen Local Inference Pipeline</div>
                        <div className="text-[10px] text-slate-400">16 messages · 6 atoms extracted · ONNX/WASM</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">4d ago</span>
                  </div>
                </div>
              </div>
            )}

            {/* 8. TIMELINE */}
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
                  <div className="relative pl-4">
                    <span className="absolute -left-[23px] top-1 size-2.5 rounded-full bg-blue-600 ring-4 ring-blue-50" />
                    <div className="text-xs font-semibold text-slate-900">Today · Reconstructed Project &quot;ai-miner-web&quot;</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Generated 1,480 message atoms across 12 chat threads with deterministic hashes.</div>
                  </div>
                  <div className="relative pl-4">
                    <span className="absolute -left-[23px] top-1 size-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
                    <div className="text-xs font-semibold text-slate-900">Yesterday · Ingested ChatGPT 2024 Archive</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Preserved stable IDs and SHA-256 provenance hashes without remote data leakage.</div>
                  </div>
                  <div className="relative pl-4">
                    <span className="absolute -left-[23px] top-1 size-2.5 rounded-full bg-purple-500 ring-4 ring-purple-50" />
                    <div className="text-xs font-semibold text-slate-900">3 Days Ago · Resolved 24 Current Truth Candidates</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Operator confirmed PBKDF2-SHA256 vault encryption standard across 6 conversations.</div>
                  </div>
                </div>
              </div>
            )}

            {/* 9. THINGS THAT NEED YOU (TICKS) */}
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
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-amber-900">Tick #01 · Confirm Encryption Cipher Standard</span>
                      </div>
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
                        <button className="rounded bg-white border border-slate-200 px-3 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-50">
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
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 text-[9px] font-bold rounded">PROJECT ALIAS</span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                      4 older conversation turns refer to legacy name &quot;miner-ui&quot;. Reconcile identity into &quot;ai-miner-web&quot;.
                    </p>
                    {!resolvedTicks.includes(2) && (
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => handleResolveTick(2)} className="rounded bg-slate-900 px-3 py-1 text-[10px] font-semibold text-white hover:bg-blue-600 transition-colors">
                          Merge Project Alias
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 10. DECISIONS */}
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
                  <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-mono font-bold text-purple-700">
                    4 Active ADRs
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900">ADR-001: Local-First IndexedDB as Sole Truth Store</span>
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">APPROVED</span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                      Browser client holds authoritative state. Cloud nodes act solely as compute execution surfaces.
                    </p>
                    <div className="mt-2.5 text-[10px] text-slate-400 font-mono">Source: turn_12 (Claude export)</div>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900">ADR-002: PBKDF2-SHA256 Key Derivation (100,000 rounds)</span>
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">APPROVED</span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                      Passphrase encryption derives 256-bit keys using standard PBKDF2-SHA256 for portable .B2M packages.
                    </p>
                    <div className="mt-2.5 text-[10px] text-slate-400 font-mono">Source: turn_84 (ChatGPT export)</div>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900">ADR-003: SHA-256 Deterministic Atom Content Hashing</span>
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">ACTIVE</span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                      All decomposed statements receive deterministic SHA-256 hashes to guarantee provenance integrity.
                    </p>
                    <div className="mt-2.5 text-[10px] text-slate-400 font-mono">Source: turn_31 (Gemini export)</div>
                  </div>
                </div>
              </div>
            )}

            {/* 11. DISCOVER */}
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
                      <button className="text-indigo-600 font-semibold hover:underline">Revive into Project →</button>
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
                    <div className="mt-3 text-[10px] text-slate-400 font-mono">Found in: ChatGPT_export_2024.zip / turn_18</div>
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

            {/* 13. EXPERIMENTS */}
            {activeTab === "experiments" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                    Intelligence Experiments & Benchmarks
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-slate-500">
                    A/B test runs on local tokenizers, ONNX models, and WebRTC mesh sync performance.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900">ONNX WebAssembly Model Latency (Qwen2.5-0.5B)</span>
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">RUNNING</span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                      Benchmarking client-side embedding generation with WebAssembly ONNX runtime.
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs bg-slate-50 p-2 rounded-lg font-mono">
                      <div><span className="text-slate-400 text-[10px]">Turn Latency:</span> <b>14.2ms</b></div>
                      <div><span className="text-slate-400 text-[10px]">Memory Envelope:</span> <b>380MB</b></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 14. BRAIN2MISSIONS */}
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

            {/* 15. OUTPUTS & REPORTS */}
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
                    <button className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-blue-600 transition-colors">
                      <Download className="size-3" />
                      <span>Download</span>
                    </button>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">Provenance Hash Audit Log (1,480 Atoms)</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">Cryptographic verification CSV · 840 KB</div>
                    </div>
                    <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                      <Download className="size-3" />
                      <span>Export CSV</span>
                    </button>
                  </div>
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
