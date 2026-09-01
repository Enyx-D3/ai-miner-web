"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Activity,
  Archive,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Cpu,
  Database,
  Download,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Flame,
  FlaskConical,
  FolderKanban,
  Gauge,
  HelpCircle,
  Laptop,
  Lightbulb,
  ListChecks,
  Lock,
  MessagesSquare,
  Network,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Terminal,
  Upload,
  Waypoints,
  Workflow,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { importArchiveIntoBrain2 } from "@/lib/brain2/archiveImport";
import {
  discoverForgottenGold,
  memoryHealth,
  resolveTick,
  useBrain2Snapshot,
  verifyMemoryStorage,
} from "@/lib/brain2/store";
import type {
  AtomRecord,
  Brain2Snapshot,
  MissionRecord,
  ProjectRecord,
  TickRecord,
  TruthRecord,
} from "@/lib/brain2/types";
import { loadSampleDemoDataset } from "@/lib/brain2/sampleData";

const kindBadgeStyles: Record<string, { bg: string; text: string; border: string }> = {
  decision: { bg: "bg-violet-500/10", text: "text-violet-600", border: "border-violet-200" },
  constraint: { bg: "bg-rose-500/10", text: "text-rose-600", border: "border-rose-200" },
  question: { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-200" },
  idea: { bg: "bg-cyan-500/10", text: "text-cyan-600", border: "border-cyan-200" },
  task: { bg: "bg-blue-500/10", text: "text-blue-600", border: "border-blue-200" },
  fact: { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-200" },
  statement: { bg: "bg-slate-500/10", text: "text-slate-600", border: "border-slate-200" },
};

function formatDate(value?: string) {
  if (!value) return "Just now";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value.slice(0, 16)
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function latestBy<T>(items: T[], field: (item: T) => string | undefined) {
  return [...items].sort((a, b) => (field(b) || "").localeCompare(field(a) || ""))[0];
}

function freshState(lastSeenAt?: string) {
  if (!lastSeenAt) return { label: "UNKNOWN", age: "—", className: "unknown" };
  const ms = Date.now() - new Date(lastSeenAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return { label: "UNKNOWN", age: "—", className: "unknown" };
  const sec = Math.round(ms / 1000);
  return {
    label: sec <= 10 ? "LIVE" : sec <= 25 ? "SUSPECT" : sec <= 60 ? "STALE" : "OFFLINE",
    age: sec < 60 ? `${sec}s ago` : `${Math.round(sec / 60)}m ago`,
    className: sec <= 10 ? "live" : sec <= 25 ? "suspect" : sec <= 60 ? "stale" : "unknown",
  };
}

type BillboardItem = {
  label: string;
  title: string;
  detail: string;
  reporter: string;
  tone: "cyan" | "violet" | "green" | "amber" | "red" | "blue";
  href: string;
  metric?: string;
  metricLabel?: string;
};

export function Brain2Dashboard() {
  const router = useRouter();
  const snapshot = useBrain2Snapshot();
  const health = memoryHealth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [truthFilter, setTruthFilter] = useState<string>("ALL");
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState("");
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [demoProgress, setDemoProgress] = useState("");
  const [activeBillboardIdx, setActiveBillboardIdx] = useState(0);

  // Sorting & Slicing data
  const recentProjects = useMemo(
    () => [...snapshot.projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6),
    [snapshot.projects]
  );
  const recentTruth = useMemo(
    () =>
      [...snapshot.truths]
        .filter((truth) => truth.status === "CURRENT")
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [snapshot.truths]
  );
  const filteredTruths = useMemo(() => {
    if (truthFilter === "ALL") return recentTruth.slice(0, 6);
    return recentTruth.filter((t) => t.kind.toLowerCase() === truthFilter.toLowerCase()).slice(0, 6);
  }, [recentTruth, truthFilter]);

  const openTicks = useMemo(
    () => snapshot.ticks.filter((tick) => tick.status === "OPEN").slice(0, 5),
    [snapshot.ticks]
  );

  const latestPattern = latestBy(snapshot.patterns, (item) => item.updatedAt);
  const latestExperiment = latestBy(snapshot.experiments, (item) => item.updatedAt);
  const latestMission = latestBy(snapshot.missions, (item) => item.updatedAt);
  const latestProject = recentProjects[0];

  // Billboard data compilation
  const billboardItems: BillboardItem[] = useMemo(() => {
    const items: BillboardItem[] = [];
    if (recentTruth[0]) {
      items.push({
        label: "CURRENT TRUTH",
        title: recentTruth[0].text,
        detail: `${recentTruth[0].kind.toUpperCase()} candidate · Reconciled from source-backed multi-turn history with cryptographic verification.`,
        reporter: "Verified provenance candidate. Ready for high-confidence agent execution.",
        tone: "green",
        href: "/wiki",
        metric: `${Math.round(recentTruth[0].confidence * 100)}%`,
        metricLabel: "Confidence",
      });
    }
    if (latestPattern) {
      items.push({
        label: "ACTIVE PATTERN",
        title: latestPattern.label,
        detail: `${latestPattern.evidenceCount} supporting observations · ${latestPattern.counterexamples} counterexamples · Status: ${latestPattern.status}`,
        reporter:
          latestPattern.status === "VERIFIED"
            ? "Passed the automated verification gate and falsification check."
            : "Active emerging signal under empirical observation.",
        tone: "violet",
        href: "/patterns",
        metric: latestPattern.status,
        metricLabel: "Validation",
      });
    }
    if (latestExperiment) {
      items.push({
        label: "ACTIVE EXPERIMENT",
        title: latestExperiment.title,
        detail: `Hypothesis: ${latestExperiment.hypothesis || "Recorded in experiment ledger."}`,
        reporter: `Current ledger status: ${latestExperiment.status}. Automated evaluation running.`,
        tone: "cyan",
        href: "/experiments",
        metric: latestExperiment.status,
        metricLabel: "Status",
      });
    }
    if (latestMission) {
      items.push({
        label: "DURABLE MISSION",
        title: latestMission.title,
        detail: `${latestMission.checkpointIds.length} durable committed checkpoints · Objective: ${latestMission.objective}`,
        reporter: "Advancing canonical progress through immutable checkpoint trees.",
        tone: "blue",
        href: "/missions",
        metric: `${latestMission.checkpointIds.length} CP`,
        metricLabel: "Checkpoints",
      });
    }
    if (openTicks[0]) {
      items.push({
        label: "OPERATOR BLOCKER",
        title: openTicks[0].title,
        detail: openTicks[0].detail,
        reporter: "Requires operator guidance or consensus resolution before dependent tasks proceed.",
        tone: "red",
        href: "/ticks",
        metric: openTicks[0].priority,
        metricLabel: "Priority",
      });
    }
    if (latestProject) {
      items.push({
        label: "ACTIVE HORIZON",
        title: latestProject.name,
        detail:
          latestProject.summary ||
          `${latestProject.conversationIds.length} conversations and ${(
            latestProject.atomCount ?? latestProject.atomIds.length
          ).toLocaleString()} atoms indexed.`,
        reporter: "Dynamic projection over unified canonical memory.",
        tone: "amber",
        href: `/projects/${latestProject.slug}`,
        metric: `${latestProject.conversationIds.length}`,
        metricLabel: "Conversations",
      });
    }
    if (!items.length) {
      items.push({
        label: "SYSTEM READY",
        title: "Brain2 AI Miner Engine Online",
        detail:
          "Connect the Chrome extension, import ChatGPT/Claude/Gemini chat archives, or load sample data to power up the intelligence deck.",
        reporter:
          "Local memory is primed in your browser with IndexedDB and WebRTC P2P mesh support. No external tracking.",
        tone: "cyan",
        href: "/memory",
        metric: "STANDBY",
        metricLabel: "State",
      });
    }
    return items;
  }, [recentTruth, latestPattern, latestExperiment, latestMission, openTicks, latestProject]);

  // Billboard auto-rotation
  useEffect(() => {
    if (billboardItems.length <= 1) return;
    const timer = setInterval(() => {
      setActiveBillboardIdx((prev) => (prev + 1) % billboardItems.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [billboardItems.length]);

  const activeBillboard = billboardItems[activeBillboardIdx] || billboardItems[0];

  // Quick Action Handlers
  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/ask?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setImportProgress("Reading archive bytes…");
    try {
      const res = await importArchiveIntoBrain2(file, (done, total, label) => {
        setImportProgress(`${label} (${done}/${total})`);
      });
      toast.success(
        `Imported ${res.conversationsAdded} chats, ${res.messagesAdded.toLocaleString()} messages, ${res.atomsAdded.toLocaleString()} atoms!`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setIsImporting(false);
      setImportProgress("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleLoadDemo = async () => {
    setIsDemoLoading(true);
    setDemoProgress("Initializing sample dataset…");
    try {
      await loadSampleDemoDataset((msg) => setDemoProgress(msg));
      toast.success("Sample AI intelligence dataset loaded!");
    } catch (err) {
      toast.error(`Failed to load demo: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsDemoLoading(false);
      setDemoProgress("");
    }
  };

  const handleResolveTick = async (id: string) => {
    try {
      await resolveTick(id, "Resolved via Mission Control Quick Deck");
      toast.success("Tick resolved!");
    } catch (err) {
      toast.error("Failed to resolve tick");
    }
  };

  // Stage calculations
  const missionCounts = { READY: 0, RUNNING: 0, VERIFYING: 0, BLOCKED: 0, COMPLETED: 0 };
  snapshot.missions.forEach((m) => {
    const status = m.status.toUpperCase();
    if (status.includes("BLOCK")) missionCounts.BLOCKED++;
    else if (status.includes("COMPLETE")) missionCounts.COMPLETED++;
    else if (status.includes("VERIF")) missionCounts.VERIFYING++;
    else if (status.includes("RUN")) missionCounts.RUNNING++;
    else missionCounts.READY++;
  });
  const totalMissions = snapshot.missions.length;
  const committedCheckpoints = snapshot.missions.reduce((n, m) => n + m.checkpointIds.length, 0);

  const acceptedTruths = snapshot.truths.filter((t) => t.status === "CURRENT").length;
  const conflictTruths = snapshot.truths.filter((t) => t.status === "CONFLICTING").length;

  return (
    <div className="b2-mission-page min-h-screen p-3 sm:p-5 lg:p-7 space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,.json,.b2m"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* ── TOP MISSION CONTROL HEADER ─────────────────────────────── */}
      <div className="glass-deck rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative flex size-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-violet-600 text-white shadow-lg shadow-blue-500/20">
            <BrainCircuit className="size-6 animate-pulse" />
            <span className="absolute -top-1 -right-1 size-3 rounded-full bg-emerald-400 border-2 border-white ring-2 ring-emerald-400/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600">
                Brain2 AI Miner · Mission Control
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-600 border border-emerald-200">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                V9 ENGINE ACTIVE
              </span>
            </div>
            <h1 className="font-tight text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Living Intelligence Operations Deck
            </h1>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Status Pill */}
          <div
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold border transition-colors ${
              snapshot.storage.retrievalIndexStatus === "READY"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            <span
              className={`size-2 rounded-full ${
                snapshot.storage.retrievalIndexStatus === "READY"
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                  : "bg-amber-500 animate-pulse"
              }`}
            />
            <span>
              {snapshot.storage.retrievalIndexStatus === "READY" ? "LOCAL MEMORY LIVE" : "INDEXING IN PROGRESS"}
            </span>
          </div>

          {/* Quick Demo Loader */}
          {!snapshot.storage.totalMessages && (
            <Button
              size="sm"
              variant="outline"
              disabled={isDemoLoading}
              onClick={handleLoadDemo}
              className="border-violet-200 bg-violet-50/70 text-violet-700 hover:bg-violet-100 hover:text-violet-800 text-xs font-bold gap-1.5 shadow-sm"
            >
              <Sparkles className="size-3.5" />
              {isDemoLoading ? demoProgress || "Loading demo…" : "Load Demo Dataset"}
            </Button>
          )}

          {/* Import Archive Button */}
          <Button
            size="sm"
            disabled={isImporting}
            onClick={() => fileInputRef.current?.click()}
            className="btn-blue text-xs font-bold gap-1.5 shadow-md"
          >
            <Upload className="size-3.5" />
            {isImporting ? importProgress || "Importing…" : "Import AI Archive"}
          </Button>

          {/* Instant Ask Button */}
          <Button
            asChild
            size="sm"
            className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white text-xs font-bold gap-1.5 shadow-md shadow-blue-500/20"
          >
            <Link href="/ask">
              <Zap className="size-3.5" />
              Ask / B2JOB
            </Link>
          </Button>
        </div>
      </div>

      {/* ── INTERACTIVE SEARCH / COMMAND BAR ────────────────────────── */}
      <form onSubmit={handleQuickSubmit} className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
          <Search className="size-5" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Ask your local intelligence or search indexed conversations, truths, and patterns… (Press Enter)"
          className="w-full h-13 pl-12 pr-28 rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-md text-sm font-medium text-slate-800 placeholder-slate-400 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
        <div className="absolute inset-y-0 right-1.5 flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/search${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ""}`)}
            className="h-9 px-3 text-xs font-bold text-slate-500 hover:text-slate-900"
          >
            Search
          </Button>
          <Button
            type="submit"
            size="sm"
            className="h-9 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1 shadow-sm"
          >
            Execute <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </form>

      {/* ── HERO INTELLIGENCE BEACON & ORBIT ────────────────────────── */}
      <section className={`b2-billboard tone-${activeBillboard.tone} relative overflow-hidden transition-all duration-500`}>
        <div className="b2-billboard-grid" />
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.4fr_.6fr] items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="b2-live-dot" />
              <span className="b2-billboard-label font-extrabold tracking-wider">{activeBillboard.label}</span>
              {activeBillboard.metric && (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-0.5 text-[10px] font-black text-slate-700 shadow-xs">
                  {activeBillboard.metricLabel && (
                    <span className="text-slate-400 font-semibold">{activeBillboard.metricLabel}:</span>
                  )}
                  {activeBillboard.metric}
                </span>
              )}
            </div>

            <h2 className="mt-3.5 max-w-4xl font-tight text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 line-clamp-2">
              {activeBillboard.title}
            </h2>

            <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-slate-600 line-clamp-3">
              {activeBillboard.detail}
            </p>

            <div className="b2-reporter mt-4 p-3.5 rounded-xl border border-slate-200/70 bg-white/80 backdrop-blur-sm shadow-xs">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-violet-600 mb-1">
                <ShieldCheck className="size-3.5" /> Provenance & Reporter Note
              </div>
              <p className="text-xs text-slate-600 leading-normal">{activeBillboard.reporter}</p>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button asChild size="sm" className="btn-blue text-xs font-bold shadow-md">
                <Link href={activeBillboard.href}>
                  Inspect Evidence <ArrowRight className="size-3.5" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="text-xs font-bold bg-white/80">
                <Link href="/search">Explore Memory Graph</Link>
              </Button>
            </div>
          </div>

          {/* Interactive Gyro / Orbit Visualizer */}
          <div className="b2-billboard-side flex flex-col items-center justify-center p-4">
            <div className="b2-signal-orbit">
              <div className="b2-orbit-ring ring-a" />
              <div className="b2-orbit-ring ring-b" />
              <div className="b2-orbit-core shadow-xl">
                <BrainCircuit className="size-9 animate-pulse" />
              </div>
            </div>

            {/* Slider Switcher Dots */}
            <div className="mt-5 flex items-center gap-1.5">
              {billboardItems.map((entry, idx) => (
                <button
                  key={`${entry.label}-${idx}`}
                  type="button"
                  onClick={() => setActiveBillboardIdx(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === activeBillboardIdx
                      ? "w-8 bg-gradient-to-r from-cyan-500 to-violet-500 shadow-sm"
                      : "w-2 bg-slate-300 hover:bg-slate-400"
                  }`}
                  aria-label={`Show ${entry.label}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TELEMETRY MATRIX: 6 METRIC CARDS ───────────────────────── */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Memory Health */}
        <Card className="glass-deck glass-deck-hover p-4 rounded-2xl gap-0">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Memory Health</span>
              <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <ShieldCheck className="size-4" />
              </span>
            </div>
            <div className="font-tight text-3xl font-black text-slate-900 tracking-tight flex items-baseline gap-1.5">
              {health.score}%
              <span className="text-[11px] font-bold text-emerald-600">Integrity</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-400 to-teal-500 h-1.5 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, health.score)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">Cryptographically verifiable</p>
          </CardContent>
        </Card>

        {/* Total Messages */}
        <Card className="glass-deck glass-deck-hover p-4 rounded-2xl gap-0">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Source Messages</span>
              <span className="flex size-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <MessagesSquare className="size-4" />
              </span>
            </div>
            <div className="font-tight text-3xl font-black text-slate-900 tracking-tight">
              {snapshot.storage.totalMessages.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600">
              <Flame className="size-3 text-orange-500" />
              {snapshot.storage.hotMessages} hot in memory
            </div>
            <p className="text-[11px] text-slate-500">Full persistent index</p>
          </CardContent>
        </Card>

        {/* Active Missions */}
        <Card className="glass-deck glass-deck-hover p-4 rounded-2xl gap-0">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Active Missions</span>
              <span className="flex size-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600 border border-violet-100">
                <Target className="size-4" />
              </span>
            </div>
            <div className="font-tight text-3xl font-black text-slate-900 tracking-tight">
              {missionCounts.RUNNING + missionCounts.READY}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-600">
              <CheckCircle2 className="size-3" />
              {committedCheckpoints} checkpoints
            </div>
            <p className="text-[11px] text-slate-500">Durable progress lanes</p>
          </CardContent>
        </Card>

        {/* Projects & Atoms */}
        <Card className="glass-deck glass-deck-hover p-4 rounded-2xl gap-0">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Projects & Graph</span>
              <span className="flex size-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                <FolderKanban className="size-4" />
              </span>
            </div>
            <div className="font-tight text-3xl font-black text-slate-900 tracking-tight">
              {snapshot.projects.length}
            </div>
            <div className="text-[11px] font-semibold text-amber-700">
              {snapshot.storage.totalAtoms.toLocaleString()} atomized nodes
            </div>
            <p className="text-[11px] text-slate-500">Project projections</p>
          </CardContent>
        </Card>

        {/* Needs You (Ticks) */}
        <Card className="glass-deck glass-deck-hover p-4 rounded-2xl gap-0">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Needs Operator</span>
              <span className="flex size-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                <ListChecks className="size-4" />
              </span>
            </div>
            <div className="font-tight text-3xl font-black text-slate-900 tracking-tight">
              {openTicks.length}
            </div>
            <div className="text-[11px] font-semibold text-rose-600">
              {openTicks.length ? "Action required" : "All systems clear"}
            </div>
            <p className="text-[11px] text-slate-500">Open control points</p>
          </CardContent>
        </Card>

        {/* Portable Expertise */}
        <Card className="glass-deck glass-deck-hover p-4 rounded-2xl gap-0">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Portable Expertise</span>
              <span className="flex size-8 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100">
                <Sparkles className="size-4" />
              </span>
            </div>
            <div className="font-tight text-3xl font-black text-slate-900 tracking-tight">
              {snapshot.portableExpertise.length}
            </div>
            <div className="text-[11px] font-semibold text-cyan-600">
              {snapshot.patternTests.length} tested patterns
            </div>
            <p className="text-[11px] text-slate-500">Reusable capabilities</p>
          </CardContent>
        </Card>
      </div>

      {/* ── ZERO-STATE ONBOARDING BANNER (If 0 messages) ───────────── */}
      {!snapshot.storage.totalMessages && (
        <Card className="rounded-2xl border-2 border-dashed border-blue-200 bg-gradient-to-br from-blue-50/70 via-white to-violet-50/70 p-6 sm:p-8 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 mb-4">
            <Archive className="size-7" />
          </div>
          <h3 className="font-tight text-xl sm:text-2xl font-black text-slate-900">
            Welcome to Brain2 AI Miner Workspace
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
            Your private, local-first intelligence control center. Import your chat history from ChatGPT, Claude, or
            Gemini, or load our realistic sample dataset to explore the full dashboard capabilities immediately.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              disabled={isDemoLoading}
              onClick={handleLoadDemo}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md gap-2"
            >
              <Sparkles className="size-4" />
              {isDemoLoading ? demoProgress || "Loading demo…" : "Load Instant Demo Dataset"}
            </Button>
            <Button
              disabled={isImporting}
              onClick={() => fileInputRef.current?.click()}
              className="btn-blue text-xs font-bold px-5 py-2.5 rounded-xl shadow-md gap-2"
            >
              <Upload className="size-4" />
              {isImporting ? importProgress || "Importing…" : "Upload ChatGPT / Claude / Gemini Zip"}
            </Button>
            <Button asChild variant="outline" className="text-xs font-bold px-4 py-2.5 rounded-xl bg-white">
              <Link href="/memory">Open Memory Manager</Link>
            </Button>
          </div>
        </Card>
      )}

      {/* ── OPERATIONAL PIPELINES & REFINERY GRID ──────────────────── */}
      <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr_.9fr]">
        {/* 1. Mission Pipeline */}
        <Card className="glass-deck rounded-2xl gap-0 overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-slate-100/80 flex flex-row items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-blue-600">Mission Pipeline</div>
              <CardTitle className="font-tight text-base font-extrabold text-slate-900">Durable Work Lanes</CardTitle>
            </div>
            <Badge variant="outline" className="font-bold text-xs bg-slate-50">
              {totalMissions} missions
            </Badge>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 text-center min-w-0">
                <div className="font-tight text-xl font-black text-slate-700">{missionCounts.READY}</div>
                <div className="text-[9px] font-bold uppercase text-slate-500">READY</div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-2.5 text-center min-w-0">
                <div className="font-tight text-xl font-black text-blue-700">{missionCounts.RUNNING}</div>
                <div className="text-[9px] font-bold uppercase text-blue-600">RUNNING</div>
              </div>
              <div className="rounded-xl border border-violet-200 bg-violet-50/80 p-2.5 text-center min-w-0">
                <div className="font-tight text-xl font-black text-violet-700">{missionCounts.VERIFYING}</div>
                <div className="text-[9px] font-bold uppercase text-violet-600">VERIFYING</div>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-2.5 text-center min-w-0">
                <div className="font-tight text-xl font-black text-rose-700">{missionCounts.BLOCKED}</div>
                <div className="text-[9px] font-bold uppercase text-rose-600">BLOCKED</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-2.5 text-center min-w-0 col-span-2 sm:col-span-1 lg:col-span-1">
                <div className="font-tight text-xl font-black text-emerald-700">{missionCounts.COMPLETED}</div>
                <div className="text-[9px] font-bold uppercase text-emerald-600">COMMITTED</div>
              </div>
            </div>

            {/* Visual Workgraph */}
            <div className="rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50/70 to-slate-100/50 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-black text-slate-600 uppercase tracking-wider">
                <span>Phase Progress</span>
                <span>Lineage Tree</span>
              </div>
              <div className="space-y-1.5 text-[10px] font-bold text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-16">RESEARCH</span>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full w-4/5" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-16">BUILD</span>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full w-3/5" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-16">VERIFY</span>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full w-2/4" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-16">COMMIT</span>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-full" />
                  </div>
                </div>
              </div>
            </div>

            <Button asChild variant="ghost" size="sm" className="w-full justify-between text-xs font-bold">
              <Link href="/missions">
                Open Mission Control <ChevronRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* 2. Information Refinery Flow */}
        <Card className="glass-deck rounded-2xl gap-0 overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-slate-100/80 flex flex-row items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-cyan-600">Information Refinery</div>
              <CardTitle className="font-tight text-base font-extrabold text-slate-900">
                Evidence → Reusable Intelligence
              </CardTitle>
            </div>
            {conflictTruths > 0 ? (
              <Badge variant="outline" className="text-[10px] font-bold border-amber-300 bg-amber-50 text-amber-700">
                {conflictTruths} conflicts
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] font-bold border-emerald-300 bg-emerald-50 text-emerald-700">
                0 conflicts
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 items-center">
              <div className="rounded-xl border border-slate-200 bg-white p-2 text-center min-w-0">
                <span className="text-[8px] font-black text-slate-400 uppercase">SOURCE</span>
                <b className="block text-xs font-bold text-slate-900 mt-0.5 truncate">
                  {snapshot.storage.totalMessages.toLocaleString()}
                </b>
                <small className="text-[8px] text-slate-400">messages</small>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-2 text-center min-w-0">
                <span className="text-[8px] font-black text-slate-400 uppercase">ATOMIZE</span>
                <b className="block text-xs font-bold text-slate-900 mt-0.5 truncate">
                  {snapshot.storage.totalAtoms.toLocaleString()}
                </b>
                <small className="text-[8px] text-slate-400">atoms</small>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-2 text-center min-w-0">
                <span className="text-[8px] font-black text-emerald-600 uppercase">TRUTH</span>
                <b className="block text-xs font-bold text-emerald-700 mt-0.5 truncate">{acceptedTruths}</b>
                <small className="text-[8px] text-emerald-600">current</small>
              </div>
              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-2 text-center min-w-0">
                <span className="text-[8px] font-black text-violet-600 uppercase">PATTERNS</span>
                <b className="block text-xs font-bold text-violet-700 mt-0.5 truncate">{snapshot.patterns.length}</b>
                <small className="text-[8px] text-violet-600">signals</small>
              </div>
              <div className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-2 text-center min-w-0 col-span-2 sm:col-span-1 lg:col-span-1">
                <span className="text-[8px] font-black text-cyan-600 uppercase">EXPERTISE</span>
                <b className="block text-xs font-bold text-cyan-700 mt-0.5 truncate">{snapshot.portableExpertise.length}</b>
                <small className="text-[8px] text-cyan-600">portable</small>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
                <span className="block text-[9px] font-black uppercase text-slate-400">Databoxes</span>
                <b className="text-sm font-black text-slate-800">{snapshot.databoxes.length}</b>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
                <span className="block text-[9px] font-black uppercase text-slate-400">Verifications</span>
                <b className="text-sm font-black text-slate-800">{snapshot.verifications.length}</b>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
                <span className="block text-[9px] font-black uppercase text-slate-400">B2 Ledger Tx</span>
                <b className="text-sm font-black text-slate-800">{snapshot.transactions.length}</b>
              </div>
            </div>

            <Button asChild variant="ghost" size="sm" className="w-full justify-between text-xs font-bold">
              <Link href="/operations">
                Open Operations & Telemetry <ChevronRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* 3. Live Worker & Sync Topology */}
        <Card className="glass-deck rounded-2xl gap-0 overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-slate-100/80 flex flex-row items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-violet-600">Sync Topology</div>
              <CardTitle className="font-tight text-base font-extrabold text-slate-900">
                Nodes & Mesh Peers
              </CardTitle>
            </div>
            <Radio className="size-4 text-cyan-500 animate-pulse" />
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3">
            {snapshot.devices.length ? (
              snapshot.devices.slice(0, 3).map((device) => {
                const fresh = freshState(device.lastSeenAt);
                return (
                  <div
                    key={device.id}
                    className="rounded-xl border border-slate-100 bg-white/90 p-3 space-y-2 hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`size-2.5 rounded-full ${
                            fresh.className === "live"
                              ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                              : fresh.className === "suspect"
                              ? "bg-amber-500"
                              : "bg-slate-300"
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-slate-900">{device.name}</div>
                          <div className="text-[10px] text-slate-400 capitalize">
                            {device.kind} · {device.pendingDeltas} pending
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                          fresh.className === "live"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {fresh.label}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-center">
                <p className="text-xs font-bold text-slate-700">Local Browser Replica Active</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Pair mobile devices or Chrome extension to expand the mesh.
                </p>
              </div>
            )}

            <Button asChild variant="ghost" size="sm" className="w-full justify-between text-xs font-bold">
              <Link href="/devices">
                Devices & P2P Mesh <ChevronRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── INTELLIGENCE FEED & OPERATOR QUEUE ──────────────────────── */}
      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        {/* Left: Reconciled Truth Stream */}
        <Card className="glass-deck rounded-2xl gap-0 overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-slate-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                Current Intelligence
              </div>
              <CardTitle className="font-tight text-lg font-extrabold text-slate-900">
                Reconciled Truth Stream
              </CardTitle>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1">
              {["ALL", "decision", "fact", "constraint", "idea", "task"].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTruthFilter(k)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                    truthFilter.toLowerCase() === k.toLowerCase()
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {k}
                </button>
              ))}
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs font-bold text-blue-600 ml-1">
                <Link href="/wiki">LifeWiki →</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-0">
            {filteredTruths.length ? (
              filteredTruths.map((truth) => {
                const badge = kindBadgeStyles[truth.kind.toLowerCase()] || kindBadgeStyles.statement;
                return (
                  <div key={truth.id} className="p-4 hover:bg-slate-50/70 transition-colors space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500 shadow-xs" />
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        {truth.kind}
                      </span>
                      <span className="text-[10px] font-black text-emerald-600">CURRENT TRUTH</span>
                      <span className="ml-auto text-[10px] font-bold text-slate-400">
                        {Math.round(truth.confidence * 100)}% confidence · {formatDate(truth.updatedAt)}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-800 font-medium">{truth.text}</p>
                    {truth.supersedes && (
                      <p className="text-[10px] text-slate-400 font-semibold">
                        ↳ Supersedes earlier truth candidate
                      </p>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-400 text-sm">
                No current truth candidates for this category yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Operator Attention ("Things That Need You") */}
        <Card className="glass-deck rounded-2xl gap-0 overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-slate-100/80 flex flex-row items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-rose-600">Operator Queue</div>
              <CardTitle className="font-tight text-lg font-extrabold text-slate-900">
                Things That Need You
              </CardTitle>
            </div>
            <CircleAlert className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {openTicks.length ? (
              openTicks.map((tick) => (
                <div
                  key={tick.id}
                  className="rounded-xl border border-slate-200/80 bg-white/90 p-3.5 space-y-2 hover:border-amber-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-amber-500" />
                      <h4 className="text-xs font-bold text-slate-900">{tick.title}</h4>
                    </div>
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                        tick.priority === "HIGH"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {tick.priority}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600 line-clamp-2">{tick.detail}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[9px] text-slate-400">{formatDate(tick.createdAt)}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleResolveTick(tick.id)}
                      className="h-6 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2"
                    >
                      <Check className="size-3 mr-1" /> Mark Resolved
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-6 text-center space-y-2">
                <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <Check className="size-5" />
                </div>
                <h4 className="text-xs font-extrabold text-emerald-900">No Open Ticks</h4>
                <p className="text-[11px] text-emerald-700/80">
                  Independent agent tasks are moving forward with zero human blockers.
                </p>
              </div>
            )}

            <Button asChild variant="ghost" size="sm" className="w-full justify-between text-xs font-bold mt-2">
              <Link href="/ticks">
                View All Ticks Queue <ChevronRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── ACTIVE CONTEXTS & INTERPRETATION FIREWALL ──────────────── */}
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        {/* Active Contexts / Project Horizons */}
        <Card className="glass-deck rounded-2xl gap-0 overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-slate-100/80 flex flex-row items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-violet-600">Active Horizons</div>
              <CardTitle className="font-tight text-base font-extrabold text-slate-900">
                Project Knowledge Lanes
              </CardTitle>
            </div>
            <Waypoints className="size-4 text-violet-500" />
          </CardHeader>
          <CardContent className="p-4 grid gap-2.5 sm:grid-cols-2">
            {recentProjects.length ? (
              recentProjects.map((project) => (
                <Link
                  href={`/projects/${project.slug}`}
                  key={project.id}
                  className="rounded-xl border border-slate-100 bg-white/90 p-3 flex items-center gap-3 hover:border-blue-300 hover:shadow-xs transition-all"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 text-blue-600 border border-blue-100">
                    <FolderKanban className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-bold text-slate-900">{project.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {project.conversationIds.length} chats ·{" "}
                      {(project.atomCount ?? project.atomIds.length).toLocaleString()} atoms
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-slate-300" />
                </Link>
              ))
            ) : (
              <div className="col-span-2 p-6 text-center text-xs text-slate-400">
                No active projects indexed yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Interpretation Firewall */}
        <Card className="glass-deck rounded-2xl gap-0 overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-slate-100/80 flex flex-row items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                Interpretation Firewall
              </div>
              <CardTitle className="font-tight text-base font-extrabold text-slate-900">
                Activity ≠ Canonical Progress
              </CardTitle>
            </div>
            <ShieldCheck className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="p-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-100 bg-white/90 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-cyan-600 font-bold text-xs">
                <Radio className="size-3.5" /> Liveness
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                Node freshness shows recently seen heartbeats. Not progress.
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white/90 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs">
                <Zap className="size-3.5" /> Work Delta
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                State transitions, verification checks and provenance deltas.
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white/90 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-violet-600 font-bold text-xs">
                <Gauge className="size-3.5" /> Canonical
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                Only durable committed checkpoint advancement counts as progress.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── STICKY / FLOATING OPERATOR CONSOLE DOCK ─────────────────── */}
      <div className="b2-operator-console sticky bottom-3 z-30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-blue-200/80 bg-white/90 backdrop-blur-xl shadow-xl shadow-slate-900/5">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md shadow-blue-500/20">
            <BrainCircuit className="size-5" />
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-wider text-cyan-600">Operator Command Deck</div>
            <div className="text-xs font-bold text-slate-800">
              Deterministic Controller & V9 Intelligence Core active.
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline" className="text-xs font-bold bg-white">
            <Link href="/ticks">Needs You ({openTicks.length})</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="text-xs font-bold bg-white">
            <Link href="/missions">Missions</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5 shadow-sm"
          >
            <Link href="/ask">
              Task Compiler <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
