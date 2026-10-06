"use client";

import Link from "next/link";
import { Archive, ArrowRight, BookOpen, BrainCircuit, CheckCircle2, Database, FileSearch, FolderKanban, LockKeyhole, Network, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InContextTree } from "@/components/brain2/InContextTree";

const capabilities = [
  { icon: Archive, title: "Bring in your AI history", text: "Import ChatGPT, Claude and Gemini exports and turn scattered conversations into one source-accounted local memory." },
  { icon: FolderKanban, title: "Reconstruct real projects", text: "Resolve related conversations into living project contexts instead of copying the same memory into disconnected folders." },
  { icon: Search, title: "Recall with lineage", text: "Search source text, Current Truth candidates, superseded history, evidence, and resurfaced forgotten work." },
  { icon: BookOpen, title: "Live notebooks & Wiki", text: "Compile NOW, findings, evidence, decisions, patterns, Ticks and project Wiki views from the same canonical memory." },
  { icon: BrainCircuit, title: "Context → task → result → repair", text: "The product is structured around a reusable intelligence loop, with model/runtime work kept separate from deterministic provenance and state." },
  { icon: Network, title: "Portable across surfaces", text: "The web app and extension share the same Brain2 contracts today, with device sync and runtime work exposed honestly where it is still being hardened." },
];

const previewCards = [
  { title: "Current Truth", detail: "Latest candidates", icon: Sparkles, className: "incontext-float-card card-a" },
  { title: "Projects", detail: "Identity-resolved", icon: FolderKanban, className: "incontext-float-card card-b" },
  { title: "Evidence", detail: "Trace to source", icon: FileSearch, className: "incontext-float-card card-c" },
  { title: "Portable Memory", detail: ".B2M export", icon: Database, className: "incontext-float-card card-d" },
];

const guarantees = [
  "Your browser archive is authoritative; the web workspace stores Brain2 memory locally in IndexedDB.",
  "Stable IDs, hashes and mutation lineage preserve where important claims came from.",
  "Optional .B2M export encryption uses PBKDF2-SHA256 plus AES-256-GCM.",
  "Missing model, P2P or mobile runtime telemetry is shown as unavailable rather than fabricated.",
];

export default function Brain2Landing() {
  return <main className="incontext-site overflow-hidden text-[var(--foreground)]">
    <section className="incontext-hero relative border-b">
      <div className="incontext-stars" aria-hidden="true" />
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:min-h-[720px] lg:grid-cols-[.93fr_1.07fr] lg:px-8 lg:py-20">
        <div className="relative z-10 flex flex-col justify-center">
          <div className="incontext-pill mb-7"><Sparkles className="size-3.5" /> Your memories. Your context. Your advantage.</div>
          <h1 className="incontext-display max-w-3xl text-5xl font-medium tracking-[-.052em] sm:text-6xl lg:text-[4.65rem] lg:leading-[.98]">
            Your AI conversations, <span className="incontext-gradient-text">beautifully organized.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-[var(--secondary-text)] sm:text-lg sm:leading-8">brain2:inContext imports your AI history, preserves its evidence, reconstructs projects and current state, and gives you a local workspace for recall, decisions, live notebooks, Ticks, patterns, experiments and durable missions.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="btn-blue rounded-2xl px-7"><Link href="/dashboard">Open Brain2InContext <ArrowRight className="size-4" /></Link></Button>
            <Button asChild size="lg" variant="outline" className="incontext-outline-button rounded-2xl px-7"><Link href="/memory">Import AI history</Link></Button>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-muted-foreground">
            <span className="flex items-center gap-1.5"><LockKeyhole className="size-3.5 text-[var(--blue)]" />Local-first memory</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-[var(--blue)]" />Source-backed lineage</span>
            <span className="flex items-center gap-1.5"><Database className="size-3.5 text-[var(--blue)]" />Portable .B2M</span>
          </div>
        </div>

        <div className="incontext-tree-stage relative min-h-[460px] lg:min-h-0" aria-label="Brain2InContext memory tree visual">
          <div className="incontext-tree-halo" aria-hidden="true" />
          <InContextTree className="incontext-hero-tree" />
          {previewCards.map(({ title, detail, icon: Icon, className }) => <div key={title} className={className}>
            <span className="incontext-float-icon"><Icon className="size-4" /></span>
            <span><b>{title}</b><small>{detail}</small></span>
          </div>)}
          <div className="incontext-memory-badge"><Sparkles className="size-4" /><span><b>One memory</b><small>Many verified projections</small></span></div>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
      <div className="max-w-3xl"><div className="refinery-eyebrow">What the web app does now</div><h2 className="incontext-section-title mt-3 text-4xl font-medium tracking-[-.045em]">A quiet workspace for memory you can inspect.</h2><p className="mt-4 text-base leading-7 text-[var(--secondary-text)]">The current web build keeps the deterministic archive and provenance layer separate from model features that require a real runtime. That makes the product useful now without pretending unfinished infrastructure is live.</p></div>
      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{capabilities.map(({ icon: Icon, title, text }) => <Card key={title} className="incontext-capability-card gap-0 py-0 shadow-none"><CardContent className="p-6"><span className="mb-6 flex size-11 items-center justify-center rounded-2xl bg-[var(--blue-soft)] text-[var(--blue)]"><Icon className="size-5" /></span><h3 className="text-lg font-extrabold tracking-[-.02em]">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></CardContent></Card>)}</div>
    </section>

    <section className="incontext-soft-section border-y"><div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-2 lg:px-8"><div><div className="refinery-eyebrow">Privacy & technical truth</div><h2 className="incontext-section-title mt-3 text-3xl font-medium tracking-[-.04em]">Move the question, not the memory.</h2><p className="mt-4 text-sm leading-7 text-[var(--secondary-text)]">brain2:inContext is designed so the user archive remains the authority. Cloud services can be connected as control or execution surfaces without turning the source memory into a hidden server-side copy.</p></div><div className="space-y-3">{guarantees.map(item => <div key={item} className="incontext-guarantee flex gap-3 rounded-2xl p-4 text-sm leading-6"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" /><span>{item}</span></div>)}</div></div></section>

    <section className="relative mx-auto max-w-5xl px-6 py-20 text-center"><div className="incontext-cta-tree" aria-hidden="true"><InContextTree /></div><div className="relative z-10 mx-auto flex size-14 items-center justify-center rounded-2xl bg-[var(--blue)] text-white shadow-[0_12px_32px_rgba(111,90,232,.25)]"><BrainCircuit className="size-7" /></div><h2 className="incontext-section-title relative z-10 mt-6 text-4xl font-medium tracking-[-.045em]">Start with the memory you already created.</h2><p className="relative z-10 mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">Open the local workspace, import an AI history export, and inspect what brain2:inContext can reconstruct with provenance before connecting additional runtimes.</p><div className="relative z-10 mt-7 flex justify-center gap-3"><Button asChild size="lg" className="btn-blue rounded-2xl"><Link href="/dashboard">Open workspace <ArrowRight className="size-4" /></Link></Button></div></section>
  </main>;
}
