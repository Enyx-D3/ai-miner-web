"use client";
import Link from "next/link";
import { Archive, ArrowRight, BookOpen, BrainCircuit, Database, FileCheck2, FileSearch, FolderKanban, KeyRound, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Kind = "how" | "features" | "docs";
const copy = {
  how: {
    eyebrow: "How it works", title: "From scattered AI history to source-backed working memory.", intro: "Brain2 AI Miner keeps ingestion, deterministic structure, human-visible evidence and future model execution as separable layers.",
    cards: [
      [Archive,"1 · MINE","Import ChatGPT, Claude or Gemini history. Normalize conversations, de-duplicate messages and preserve stable source identity."],
      [Database,"2 · STRUCTURE","Extract deterministic atoms, project identities, Current Truth candidates, decisions, Ticks and lineage into local memory."],
      [BrainCircuit,"3 · MAKE","Use the reconstructed project state as bounded task context for connected AI or local runtimes instead of re-sending an entire life archive."],
      [FileCheck2,"4 · VERIFY / REPAIR","Keep output verification and targeted repair explicit. Runtime-backed verification is not shown as available until it is actually connected."],
    ]
  },
  features: {
    eyebrow: "Features", title: "The useful layer is inspectable, portable and local-first.", intro: "V4 focuses the web application on functionality that is real in the browser today while retaining contracts for extension, mobile and runtime expansion.",
    cards: [
      [Search,"Search & Recall","Find canonical source text, current candidates, superseded history, evidence and Forgotten Gold."],
      [FolderKanban,"Projects & Live Notebooks","Resolve conversations into project identity and compile NOW, findings, evidence, Wiki, Ticks, patterns and experiments."],
      [BookOpen,"LifeWiki","Build readable project knowledge projections without replacing the underlying source atoms."],
      [Database,"Portable .B2M","Export and restore the Brain2 memory state; optionally encrypt the package before it leaves the browser."],
      [ShieldCheck,"Technical truth","Operations screens mark unavailable model, P2P and mobile runtimes as unavailable rather than simulating connectivity."],
      [KeyRound,"Encrypted extension queue","The included Chrome extension uses an in-memory vault key and persists captured records only as ciphertext."],
    ]
  },
  docs: {
    eyebrow: "Start here", title: "Run Brain2 AI Miner locally.", intro: "The repository is a Next.js 16 application. The canonical web workspace can run without a configured external API because its memory layer is local-first.",
    cards: [
      [Archive,"Import","Open Memory / .B2M and select an exported ZIP from ChatGPT, Claude or Gemini. The parser normalizes supported provider formats into canonical messages."],
      [FileSearch,"Inspect provenance","Use Conversations, Timeline, Search, Decisions and project Evidence to trace derived objects back to source text."],
      [Database,"Back up","Export a .B2M snapshot. Add a passphrase when you want the exported payload encrypted with PBKDF2-SHA256 + AES-256-GCM."],
      [KeyRound,"Extension","Load the /extension directory as an unpacked Chrome extension, unlock its local vault, and set your AI Miner web origin so queued ciphertext can be acknowledged into the browser workspace."],
    ]
  }
} as const;

export default function Brain2PublicInfo({kind}:{kind:Kind}) {
  const section=copy[kind];
  return <main className="bg-white"><section className="border-b bg-[linear-gradient(#fff,#fbfdff)]"><div className="mx-auto max-w-5xl px-6 py-16 lg:px-8"><div className="refinery-eyebrow">{section.eyebrow}</div><h1 className="mt-4 max-w-4xl font-tight text-5xl font-black tracking-[-.05em]">{section.title}</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">{section.intro}</p><div className="mt-7 flex gap-3"><Button asChild className="btn-blue"><Link href="/dashboard">Open AI Miner <ArrowRight className="size-4"/></Link></Button><Button asChild variant="outline"><Link href="/memory">Import history</Link></Button></div></div></section><section className="mx-auto grid max-w-5xl gap-4 px-6 py-14 md:grid-cols-2 lg:px-8">{section.cards.map(([Icon,title,text])=><Card key={title} className="gap-0 py-0 shadow-none"><CardContent className="p-6"><Icon className="mb-6 size-5 text-[var(--blue)]"/><h2 className="font-tight text-lg font-extrabold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></CardContent></Card>)}</section></main>;
}
