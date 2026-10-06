"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Archive,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  Cpu,
  Database,
  FileCheck2,
  FileSearch,
  FlaskConical,
  FolderKanban,
  KeyRound,
  ListChecks,
  LockKeyhole,
  Network,
  NotebookTabs,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Kind = "how" | "features" | "docs";
type InfoCard = { icon: LucideIcon; title: string; text: string };
type InfoSection = { title: string; cards: InfoCard[] };
type PageCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  primary: string;
  secondary: string;
  sections: InfoSection[];
};

const copy: Record<Kind, PageCopy> = {
  how: {
    eyebrow: "How it works",
    title: "Keep the context. Continue the work.",
    intro:
      "brain2:inContext turns exported AI conversations into source-backed memory, project state, and continuation surfaces without hiding what came from where.",
    primary: "Open Brain2InContext",
    secondary: "Import AI history",
    sections: [
      {
        title: "The normal flow",
        cards: [
          { icon: Archive, title: "1. Bring in your AI history", text: "Import ChatGPT, Claude, Gemini, or .B2M history into the local web workspace." },
          { icon: Database, title: "2. Turn conversations into context", text: "Normalize messages, preserve source identity, and derive memory objects from the imported archive." },
          { icon: FolderKanban, title: "3. Reconstruct projects", text: "Resolve related conversations into project views with findings, evidence, NOW state, decisions, and open work." },
          { icon: Sparkles, title: "4. Separate truth from history", text: "Current Truth candidates sit beside older source history so latest state does not erase provenance." },
          { icon: Search, title: "5. Find or continue", text: "Search & Recall can look through source text, current candidates, history, evidence, and resurfaced useful work." },
          { icon: BrainCircuit, title: "6. Think with the memory", text: "Ask / B2JOB builds source-backed task context for connected runtimes instead of dumping the whole archive." },
          { icon: ListChecks, title: "7. Remember what happens next", text: "Ticks, decisions, notebooks, reports, and repair records keep later outcomes attached to the same memory." },
          { icon: Network, title: "8. Continue across surfaces", text: "The browser extension, web workspace, and device-sync contracts share the same memory model; production hardening continues where marked." },
        ],
      },
    ],
  },
  features: {
    eyebrow: "Features",
    title: "A source-backed memory workspace for AI work.",
    intro:
      "The public product is brain2:inContext: a local-first way to remember, inspect, continue, and move AI work while keeping unfinished runtime surfaces clearly qualified.",
    primary: "Open Brain2InContext",
    secondary: "Import history",
    sections: [
      { title: "Remember", cards: [{ icon: Archive, title: "AI history import", text: "Bring in supported ChatGPT, Claude, Gemini, and .B2M exports and keep source identity attached." }, { icon: Database, title: "Portable .B2M", text: "Export and restore memory snapshots, with optional passphrase encryption for the package." }] },
      { title: "Understand", cards: [{ icon: FolderKanban, title: "Project reconstruction", text: "Group related conversations into projects with NOW state, findings, evidence, decisions, and open threads." }, { icon: BookOpen, title: "LifeWiki and notebooks", text: "Read project knowledge as generated projections while the underlying source atoms remain inspectable." }] },
      { title: "Find", cards: [{ icon: Search, title: "Search & Recall", text: "Find source text, current candidates, historical versions, evidence, and useful forgotten material." }, { icon: FileSearch, title: "Evidence trails", text: "Trace derived project objects back to the conversations and records that produced them." }] },
      { title: "Continue", cards: [{ icon: Radio, title: "Continue / Handoff", text: "Build resume capsules from current truth, known failures, open ticks, and project context." }, { icon: BrainCircuit, title: "Ask / B2JOB", text: "Compile source-backed task packets for deterministic checks and configured model/runtime execution." }] },
      { title: "Organize", cards: [{ icon: ListChecks, title: "Decisions and ticks", text: "Track choices, things needing attention, and project follow-up without burying them in chat history." }, { icon: CalendarDays, title: "Timeline and conversations", text: "Move between raw conversations, chronology, and project views from the same archive." }] },
      { title: "Think", cards: [{ icon: FlaskConical, title: "Discover, patterns, experiments", text: "Surface patterns, possible experiments, and discovery views as inspectable workspace projections." }, { icon: Target, title: "Missions", text: "Plan and track longer work through Brain2Missions surfaces without claiming unsupported autonomous execution." }] },
      { title: "Run longer work", cards: [{ icon: Cpu, title: "Runtime visibility", text: "Model and operation screens show available, unavailable, and diagnostic states instead of pretending a missing runtime is live." }, { icon: FileCheck2, title: "Outputs & reports", text: "Verify result artifacts against evidence and create repair records when checks fail." }] },
      { title: "Move & sync", cards: [{ icon: Network, title: "Devices & Sync", text: "QR pairing, credentialed signaling, bounded bootstrap, and P2P sync paths exist; physical-device production hardening remains qualified." }, { icon: KeyRound, title: "Encrypted extension queue", text: "The browser extension captures supported AI providers into an encrypted local queue before acknowledged delivery." }] },
      { title: "Private & inspectable", cards: [{ icon: ShieldCheck, title: "Local-first memory", text: "The browser workspace treats the local archive as the authority and keeps provenance visible." }, { icon: LockKeyhole, title: "Technical truth", text: "Partial or unavailable capabilities are labeled that way in the app instead of being marketed as complete." }] },
    ],
  },
  docs: {
    eyebrow: "Docs",
    title: "Start with the memory you already have.",
    intro:
      "This page is the public starting map for brain2:inContext. It points to implemented workspace areas and marks runtime or sync work as qualified where the app does.",
    primary: "Open Brain2InContext",
    secondary: "Import history",
    sections: [
      {
        title: "Getting started",
        cards: [
          { icon: Archive, title: "Importing history", text: "Open Memory / .B2M and import supported AI provider exports or a previous .B2M snapshot." },
          { icon: Database, title: "Memory / .B2M", text: "Use .B2M export/import for portable backups; optional encryption protects exported payloads." },
          { icon: FolderKanban, title: "Projects", text: "Use Projects to inspect reconstructed work, evidence, NOW state, findings, and related records." },
        ],
      },
      {
        title: "Recall and truth",
        cards: [
          { icon: Search, title: "Search & Recall", text: "Search source text, current candidates, historical material, evidence, and discovery results." },
          { icon: Sparkles, title: "Current Truth", text: "Review latest-state candidates separately from older history so changes stay understandable." },
          { icon: FileSearch, title: "Evidence", text: "Follow important claims back to source conversations and generated records." },
        ],
      },
      {
        title: "Continuation surfaces",
        cards: [
          { icon: Radio, title: "Continue / Handoff", text: "Create resume capsules from the state the project needs next." },
          { icon: BrainCircuit, title: "Ask / B2JOB", text: "Compile source-backed task context for deterministic checks and configured model or local runtime work." },
          { icon: NotebookTabs, title: "Live Notebooks", text: "Read project state as notebooks built from the same underlying memory." },
          { icon: BookOpen, title: "LifeWiki", text: "Use wiki-style projections without treating them as a replacement for source evidence." },
        ],
      },
      {
        title: "Work tracking",
        cards: [
          { icon: ListChecks, title: "Decisions", text: "Keep project decisions visible and connected to their evidence." },
          { icon: Activity, title: "Things That Need You / Ticks", text: "Track open attention items and follow-up work from reconstructed context." },
          { icon: FlaskConical, title: "Discover, patterns, experiments", text: "Explore recurring themes, discovery results, and experiment views as workspace projections." },
          { icon: Target, title: "Missions", text: "Use Brain2Missions for longer project organization, with unsupported autonomous execution left unclaimed." },
        ],
      },
      {
        title: "Execution and surfaces",
        cards: [
          { icon: FileCheck2, title: "Outputs & Reports", text: "Inspect result verification, evidence checks, and repair records where output validation is available." },
          { icon: Cpu, title: "Models", text: "Model/runtime availability is shown according to the configured environment." },
          { icon: Network, title: "Devices & Sync", text: "Use QR pairing and sync diagnostics for connected-device work; production certification remains explicit." },
          { icon: KeyRound, title: "Browser Extension", text: "Load the extension for encrypted capture from supported AI chat providers into the web workspace." },
          { icon: ShieldCheck, title: "Privacy / Technical Truth", text: "Local-first memory, provenance, unavailable-state labels, and explicit diagnostics are core product rules." },
        ],
      },
    ],
  },
};

export default function Brain2PublicInfo({ kind }: { kind: Kind }) {
  const page = copy[kind];

  return (
    <main className="bg-white">
      <section className="border-b bg-[linear-gradient(#fff,#fbfdff)]">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
          <div className="refinery-eyebrow">{page.eyebrow}</div>
          <h1 className="mt-4 max-w-4xl font-tight text-5xl font-black tracking-[-.05em]">{page.title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">{page.intro}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild className="btn-blue">
              <Link href="/dashboard">{page.primary} <ArrowRight className="size-4" /></Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/memory">{page.secondary}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14 lg:px-8">
        <div className="space-y-12">
          {page.sections.map((section) => (
            <div key={section.title}>
              <h2 className="font-tight text-2xl font-extrabold tracking-[-.035em]">{section.title}</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {section.cards.map(({ icon: Icon, title, text }) => (
                  <Card key={title} className="gap-0 py-0 shadow-none">
                    <CardContent className="p-6">
                      <Icon className="mb-6 size-5 text-[var(--blue)]" />
                      <h3 className="font-tight text-lg font-extrabold">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
