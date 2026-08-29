"use client";

import Link from "next/link";
import { Archive, ArrowRight, BookOpen, BrainCircuit, CheckCircle2, Database, FileSearch, FolderKanban, LockKeyhole, Network, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const capabilities = [
  { icon: Archive, title: "Mine your AI history", text: "Import ChatGPT, Claude and Gemini exports and turn scattered conversations into one source-accounted local memory." },
  { icon: FolderKanban, title: "Reconstruct real projects", text: "Resolve related conversations into living project contexts instead of copying the same memory into disconnected folders." },
  { icon: Search, title: "Recall with lineage", text: "Search source text, Current Truth candidates, superseded history, evidence, and resurfaced forgotten work." },
  { icon: BookOpen, title: "Live notebooks & Wiki", text: "Compile NOW, findings, evidence, decisions, patterns, Ticks and project Wiki views from the same canonical memory." },
  { icon: BrainCircuit, title: "MINE → MAKE → VERIFY → REPAIR", text: "The product is structured around a reusable intelligence loop, with model/runtime work kept separate from deterministic provenance and state." },
  { icon: Network, title: "Portable across surfaces", text: "The web app and extension share the same Brain2 contracts today, with mobile and network runtimes able to connect without redesigning the archive." },
];

const previewCards = [
  { title: "Current Truth", detail: "Latest candidates", icon: Sparkles },
  { title: "Projects", detail: "Identity-resolved", icon: FolderKanban },
  { title: "Evidence", detail: "Trace to source", icon: FileSearch },
  { title: "Portable Memory", detail: ".B2M export", icon: Database },
];

const guarantees = [
  "Your browser archive is authoritative; the web workspace stores Brain2 memory locally in IndexedDB.",
  "Stable IDs, hashes and mutation lineage preserve where important claims came from.",
  "Optional .B2M export encryption uses PBKDF2-SHA256 plus AES-256-GCM.",
  "Missing model, P2P or mobile runtime telemetry is shown as unavailable rather than fabricated.",
];

export default function Brain2Landing() {
  return <main className="overflow-hidden bg-white text-[var(--foreground)]">
    <section className="relative border-b bg-[radial-gradient(circle_at_50%_-10%,rgba(80,120,255,.18),transparent_42%),linear-gradient(#fff,#fbfdff)]">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-28">
        <div className="flex flex-col justify-center">
          <div className="refinery-eyebrow mb-5">Brain2 AI Miner · Brain2 Labs</div>
          <h1 className="font-tight text-5xl font-black tracking-[-.055em] text-[var(--navy)] sm:text-6xl lg:text-7xl">Turn years of AI conversations into working intelligence.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--secondary-text)]">AI Miner imports your AI history, preserves its evidence, reconstructs projects and current state, and gives you a local workspace for recall, decisions, live notebooks, Ticks, patterns, experiments and durable missions.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="btn-blue rounded-xl px-6"><Link href="/dashboard">Open AI Miner <ArrowRight className="size-4"/></Link></Button>
            <Button asChild size="lg" variant="outline" className="rounded-xl px-6"><Link href="/memory">Import AI history</Link></Button>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-muted-foreground">
            <span className="flex items-center gap-1.5"><LockKeyhole className="size-3.5 text-[var(--blue)]"/>Local-first memory</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-[var(--blue)]"/>Source-backed lineage</span>
            <span className="flex items-center gap-1.5"><Database className="size-3.5 text-[var(--blue)]"/>Portable .B2M</span>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-8 rounded-[48px] bg-[linear-gradient(135deg,rgba(45,96,255,.08),rgba(226,47,145,.06))] blur-2xl"/>
          <Card className="relative overflow-hidden rounded-[28px] border bg-white/95 py-0 shadow-[0_24px_80px_rgba(22,42,90,.12)]">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b px-5 py-4"><div><div className="text-[10px] font-black uppercase tracking-[.15em] text-[var(--blue)]">Local intelligence workspace</div><div className="mt-1 font-tight text-lg font-extrabold">One memory, many projections</div></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700">SOURCE-BACKED</span></div>
              <div className="grid gap-3 p-5 sm:grid-cols-2">
                {previewCards.map(({title, detail, icon: Icon}) => <div key={title} className="rounded-2xl border bg-[var(--secondary)] p-4"><Icon className="mb-8 size-5 text-[var(--blue)]"/><div className="font-tight text-base font-extrabold">{title}</div><div className="mt-1 text-xs text-muted-foreground">{detail}</div></div>)}
              </div>
              <div className="border-t px-5 py-4 text-xs leading-5 text-muted-foreground"><b className="text-foreground">No fake runtime state.</b> Qwen/MRS runs locally in-browser through Transformers.js + ONNX Runtime Web/WASM using the q8 model; mobile remains external. P2P mutation sync is implemented with credentialed signaling + WebRTC; production cross-NAT reliability still depends on configured STUN/TURN and real multi-device validation.</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
      <div className="max-w-3xl"><div className="refinery-eyebrow">What the web app does now</div><h2 className="mt-3 font-tight text-4xl font-black tracking-[-.045em]">A control center for memory you can inspect.</h2><p className="mt-4 text-base leading-7 text-[var(--secondary-text)]">The current web build keeps the deterministic archive and provenance layer separate from model features that require a real runtime. That makes the product useful now without pretending unfinished infrastructure is live.</p></div>
      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{capabilities.map(({icon:Icon,title,text}) => <Card key={title} className="gap-0 py-0 shadow-none"><CardContent className="p-6"><span className="mb-6 flex size-10 items-center justify-center rounded-xl bg-[var(--blue-soft)] text-[var(--blue)]"><Icon className="size-5"/></span><h3 className="font-tight text-lg font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></CardContent></Card>)}</div>
    </section>

    <section className="border-y bg-[var(--secondary)]"><div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-2 lg:px-8"><div><div className="refinery-eyebrow">Privacy & technical truth</div><h2 className="mt-3 font-tight text-3xl font-black tracking-[-.04em]">Move the question, not the memory.</h2><p className="mt-4 text-sm leading-7 text-[var(--secondary-text)]">AI Miner is designed so the user archive remains the authority. Cloud services can be connected as control or execution surfaces without turning the source memory into a hidden server-side copy.</p></div><div className="space-y-3">{guarantees.map(item => <div key={item} className="flex gap-3 rounded-xl bg-white p-4 text-sm leading-6"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600"/><span>{item}</span></div>)}</div></div></section>

    <section className="mx-auto max-w-5xl px-6 py-20 text-center"><div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[var(--blue)] text-white"><BrainCircuit className="size-7"/></div><h2 className="mt-6 font-tight text-4xl font-black tracking-[-.045em]">Start with the memory you already created.</h2><p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">Open the local workspace, import an AI history export, and inspect what AI Miner can reconstruct with provenance before connecting additional runtimes.</p><div className="mt-7 flex justify-center gap-3"><Button asChild size="lg" className="btn-blue rounded-xl"><Link href="/dashboard">Open workspace <ArrowRight className="size-4"/></Link></Button></div></section>
  </main>;
}
