"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  FolderTree,
  Lock,
  Search,
  ShieldCheck,
  Target,
  Upload,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Interactive Simulator Sample Scenarios
interface Scenario {
  id: string;
  title: string;
  provider: "ChatGPT" | "Claude" | "Gemini";
  badgeColor: string;
  rawSample: {
    user: string;
    assistant: string;
  };
  minedOutput: {
    project: string;
    decisions: string[];
    constraints: string[];
    tasks: string[];
    wikiSummary: string;
  };
}

const demoScenarios: Scenario[] = [
  {
    id: "saas",
    title: "Web App Architecture",
    provider: "ChatGPT",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rawSample: {
      user: "I need to build a local-first memory vault in Next.js using IndexedDB and Web Crypto AES-GCM. What's the exact key derivation strategy?",
      assistant:
        "Here's the recommended approach: use PBKDF2 with SHA-256 (200,000 iterations) to derive a 256-bit AES-GCM key from the user's passphrase. Do not store the passphrase or derived key in persistent storage. Store only the salt and IV alongside the encrypted payload in IndexedDB.",
    },
    minedOutput: {
      project: "ai-miner-web",
      decisions: ["Vault key derivation standardized on PBKDF2-SHA256 (200,000 rounds) + AES-256-GCM."],
      constraints: ["Zero cloud storage. Passphrases must remain strictly in volatile memory."],
      tasks: ["Implement client-side export/restore worker in fflate."],
      wikiSummary:
        "Standardized on browser-native Web Crypto for client-side vault encryption. All user chat data is kept strictly inside local IndexedDB with zero cloud telemetry.",
    },
  },
  {
    id: "ai-research",
    title: "AI Model Fine-Tuning",
    provider: "Claude",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    rawSample: {
      user: "Should we use LoRA or full parameter fine-tuning for our domain extraction parser on 8GB VRAM cards?",
      assistant:
        "Given the 8GB VRAM constraint, QLoRA 4-bit quantization with rank r=16 and alpha=32 is the only viable setup. It reduces memory from 16GB to 5.4GB with negligible performance loss.",
    },
    minedOutput: {
      project: "parser-tuning-v2",
      decisions: ["Selected QLoRA 4-bit quantization over full fine-tuning."],
      constraints: ["Hardware budget fixed to 8GB VRAM consumer GPUs."],
      tasks: ["Set LoRA hyperparameters: r=16, alpha=32, target_modules=['q_proj','v_proj']."],
      wikiSummary:
        "Domain extraction model training adopts QLoRA 4-bit quantization to operate smoothly within 8GB VRAM constraints.",
    },
  },
  {
    id: "startup",
    title: "Product Launch Strategy",
    provider: "Gemini",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    rawSample: {
      user: "Let's plan our beta launch pricing. Should we do a $29 one-time lifetime license or a $9/month SaaS?",
      assistant:
        "For a developer utility tool with local-first privacy, a $29 one-time license converted 3.4x higher in benchmarks and completely removes recurring server overhead. Offer direct .B2M license keys.",
    },
    minedOutput: {
      project: "growth-strategy-2026",
      decisions: ["Adopted $29 one-time license pricing model over recurring subscription."],
      constraints: ["Zero server hosting cost required to keep margins at 100%."],
      tasks: ["Set up automated license key validation via client-side signatures."],
      wikiSummary:
        "Product launch adopts a transparent one-time purchase model to appeal to privacy-conscious developers while maintaining zero server overhead.",
    },
  },
];

// 4 Interactive Steps
const steps = [
  {
    num: "01",
    stepName: "Step 1",
    title: "Export & Drop Your Chats",
    tagline: "Compatible with ChatGPT, Claude, and Gemini",
    desc: "Download your conversation history ZIP from your AI provider and drag it into Brain2. Everything is unpacked in memory in under a second.",
    icon: UploadCloud,
    badge: "Instant Ingestion",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    keyPoints: [
      "Works with ChatGPT, Claude, and Gemini export ZIPs",
      "Also captures live conversations via our Chrome Extension",
      "100% in-browser parsing with zero server uploads",
    ],
  },
  {
    num: "02",
    stepName: "Step 2",
    title: "Automated Smart Organization",
    tagline: "Turn chaotic chats into structured knowledge",
    desc: "Brain2 analyzes your turns, extracts architectural decisions, technical constraints, and tasks, and clusters conversations into organized project workspaces.",
    icon: FolderTree,
    badge: "Auto-Clustering",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    keyPoints: [
      "Extracts Decisions, Constraints, Ideas, Tasks, and Facts",
      "Clusters related conversations into cohesive project hubs",
      "Reconciles outdated decisions with active current consensus",
    ],
  },
  {
    num: "03",
    stepName: "Step 3",
    title: "Search & LifeWiki Synthesis",
    tagline: "Find any past solution in 0.4 milliseconds",
    desc: "Search years of AI conversations instantly. Browse auto-generated LifeWiki pages and discover forgotten gold—valuable ideas buried in old threads.",
    icon: Search,
    badge: "Sub-Millisecond Search",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    keyPoints: [
      "Blazing fast local search across all past conversations",
      "Auto-generates clean, structured LifeWiki documentation",
      "Highlights high-value forgotten solutions from months ago",
    ],
  },
  {
    num: "04",
    stepName: "Step 4",
    title: "Private Vault & AI Context",
    tagline: "100% client-side encrypted and portable",
    desc: "Export your entire personal brain into encrypted .B2M snapshot bundles (PBKDF2 + AES-256) or feed compact context packets to AI without token waste.",
    icon: ShieldCheck,
    badge: "Encrypted .B2M Vault",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    keyPoints: [
      "Client-side PBKDF2-SHA256 (200k rounds) + AES-256-GCM encryption",
      "Cuts AI prompt token size by 90% using compact B2JOB context",
      "Zero cloud storage—your brain remains 100% yours forever",
    ],
  },
];

// Quick Export Guides by Platform
const exportGuides = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    icon: "/images/chatgpt.png",
    steps: [
      "Click your Profile picture in bottom-left → Settings",
      "Go to 'Data Controls' and click 'Export data'",
      "Confirm export in your email and download the ZIP file",
      "Drop the ZIP into Brain2 (no unpacking needed!)",
    ],
  },
  {
    id: "claude",
    name: "Claude",
    icon: "/images/claude.png",
    steps: [
      "Click your Account icon in the bottom-left corner",
      "Select 'Account Settings' → navigate to 'Data Controls'",
      "Click 'Export Data' to receive your JSON / ZIP archive",
      "Drop the file directly into Brain2 for instant analysis",
    ],
  },
  {
    id: "gemini",
    name: "Google Gemini",
    icon: "/images/gemini.png",
    steps: [
      "Visit Google Takeout (takeout.google.com)",
      "Deselect all and check only 'Gemini / Bard'",
      "Click 'Next step' → 'Create export' to download your archive",
      "Drop the downloaded ZIP directly into Brain2",
    ],
  },
];

export function HowItWorksView() {
  const [activeScenarioId, setActiveScenarioId] = useState("saas");
  const [activeGuideTab, setActiveGuideTab] = useState("chatgpt");
  const [copiedText, setCopiedText] = useState(false);

  const activeScenario =
    demoScenarios.find((s) => s.id === activeScenarioId) || demoScenarios[0];
  const activeGuide =
    exportGuides.find((g) => g.id === activeGuideTab) || exportGuides[0];

  const handleCopySample = () => {
    navigator.clipboard.writeText(activeScenario.minedOutput.wikiSummary);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
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
      <section className="w-[94%] max-w-6xl mx-auto pt-24 pb-8 sm:pt-32 sm:pb-10 text-left">
        {/* Main Display Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-[72px] font-normal tracking-tight text-slate-900 leading-[1.12] max-w-4xl">
          From chats to{" "}
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent font-normal">
            living memory.
          </span>
        </h1>
      </section>

      {/* ========================================================= */}
      {/* 2. INTERACTIVE LIVE SIMULATOR ("SEE IT IN ACTION")         */}
      {/* ========================================================= */}
      <section className="px-0 py-10 w-[94%] max-w-6xl mx-auto">
        <div className="rounded-3xl border border-slate-200/80 bg-white/70 p-5 sm:p-8 shadow-[0_8px_30px_rgba(15,30,60,0.04)] backdrop-blur-xl">
          {/* Header & Scenario Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-normal uppercase tracking-[0.2em] text-blue-600">
                  Interactive Simulator
                </span>
              </div>
              <h2 className="mt-2 text-2xl sm:text-3xl lg:text-[32px] font-normal text-slate-900 tracking-tight leading-tight">
                See how raw chat turns into structured memory.
              </h2>
            </div>

            {/* Scenario Pills */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl self-start sm:self-auto">
              {demoScenarios.map((scenario) => {
                const isActive = activeScenarioId === scenario.id;
                return (
                  <button
                    key={scenario.id}
                    onClick={() => setActiveScenarioId(scenario.id)}
                    className={`px-3 py-1 text-xs rounded-lg transition-all ${
                      isActive
                        ? "bg-white text-blue-600 shadow-2xs font-normal"
                        : "text-slate-600 hover:text-slate-900 font-normal"
                    }`}
                  >
                    {scenario.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Split View (Raw vs Mined) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5 items-stretch">
            {/* Left Box: Raw Chat Export */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] font-normal uppercase tracking-wider text-slate-500">
                    Input: Raw Conversation Turn
                  </span>
                  <span
                    className={`text-[10px] font-normal px-2.5 py-0.5 rounded-full border ${activeScenario.badgeColor}`}
                  >
                    {activeScenario.provider} Export
                  </span>
                </div>

                {/* User Bubble */}
                <div className="rounded-xl bg-white border border-slate-200/70 p-3.5 mb-2.5 shadow-2xs">
                  <div className="text-[10px] font-normal text-blue-600 mb-1">YOU</div>
                  <p className="text-xs text-slate-700 leading-relaxed font-normal">
                    {activeScenario.rawSample.user}
                  </p>
                </div>

                {/* AI Bubble */}
                <div className="rounded-xl bg-white border border-slate-200/70 p-3.5 shadow-2xs">
                  <div className="text-[10px] font-normal text-purple-600 mb-1">
                    {activeScenario.provider.toUpperCase()}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {activeScenario.rawSample.assistant}
                  </p>
                </div>
              </div>

              <div className="mt-3.5 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400 font-normal">
                <span>Unstructured Chat Text</span>
                <span>120 words</span>
              </div>
            </div>

            {/* Middle Arrow Connector */}
            <div className="hidden lg:flex lg:col-span-1 items-center justify-center">
              <div className="size-8 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-2xs">
                <ArrowRight className="size-3.5" />
              </div>
            </div>

            {/* Right Box: Brain2 Structured Output */}
            <div className="lg:col-span-6 rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/40 via-white to-indigo-50/30 p-4 sm:p-5 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-normal uppercase tracking-wider text-blue-700">
                      Brain2 Auto-Extracted Intelligence
                    </span>
                  </div>
                  <span className="font-mono text-[10px] bg-blue-100/70 text-blue-800 px-2.5 py-0.5 rounded font-normal">
                    Project: {activeScenario.minedOutput.project}
                  </span>
                </div>

                {/* Decisions Tag */}
                <div className="space-y-2">
                  <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3 shadow-2xs">
                    <div className="flex items-center gap-1 text-[10px] font-normal text-emerald-800 uppercase tracking-wider mb-0.5">
                      <Target className="size-3 text-emerald-600" />
                      <span>Extracted Architectural Decision</span>
                    </div>
                    <p className="text-xs font-normal text-emerald-950 leading-relaxed">
                      {activeScenario.minedOutput.decisions[0]}
                    </p>
                  </div>

                  {/* Constraints Tag */}
                  <div className="rounded-xl border border-rose-200/80 bg-rose-50/60 p-3 shadow-2xs">
                    <div className="flex items-center gap-1 text-[10px] font-normal text-rose-800 uppercase tracking-wider mb-0.5">
                      <Lock className="size-3 text-rose-600" />
                      <span>Hard Constraint</span>
                    </div>
                    <p className="text-xs font-normal text-rose-950 leading-relaxed">
                      {activeScenario.minedOutput.constraints[0]}
                    </p>
                  </div>

                  {/* LifeWiki Summary Box */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1 text-[10px] font-normal text-slate-700 uppercase tracking-wider">
                        <FileText className="size-3 text-blue-600" />
                        <span>LifeWiki Summary</span>
                      </div>
                      <button
                        onClick={handleCopySample}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-normal flex items-center gap-0.5"
                      >
                        {copiedText ? (
                          <span className="text-emerald-600 flex items-center gap-0.5 font-normal">
                            <Check className="size-2.5" /> Copied
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 font-normal">
                            <Copy className="size-2.5" /> Copy
                          </span>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      {activeScenario.minedOutput.wikiSummary}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-normal">
                <span className="flex items-center gap-1 text-emerald-700 font-normal">
                  <CheckCircle2 className="size-3" /> Ready for Search & B2JOB
                </span>
                <span className="font-mono text-[10px]">0.4ms Local Parse</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. FOUR CLEAR STEPS (CLEAN & MINIMAL CARDS)               */}
      {/* ========================================================= */}
      <section className="px-0 py-16 w-[94%] max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-normal uppercase tracking-[0.2em] text-blue-600">
            Simple 4-Step Process
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[40px] font-normal tracking-tight text-slate-900 leading-tight">
            How your memory is structured.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base font-normal leading-relaxed text-slate-600">
            Clear, transparent, and respectful of your privacy from start to finish.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/80 bg-white/60 p-7 shadow-[0_10px_30px_rgba(15,30,60,0.04)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:bg-white/90 hover:shadow-[0_20px_40px_rgba(24,100,255,0.08)]"
              >
                <div>
                  {/* Top Bar with Number and Icon */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-normal text-slate-400">
                      STEP {step.num}
                    </span>
                    <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-110">
                      <Icon className="size-5" />
                    </div>
                  </div>

                  <div className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-normal uppercase tracking-wider text-slate-600">
                    {step.badge}
                  </div>

                  {/* Title & Tagline */}
                  <h3 className="mt-3 text-lg font-normal text-slate-900">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-xs font-normal text-blue-600">
                    {step.tagline}
                  </p>

                  {/* Description */}
                  <p className="mt-2 text-xs leading-relaxed font-normal text-slate-600">
                    {step.desc}
                  </p>
                </div>

                {/* Key Points */}
                <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
                  {step.keyPoints.map((point) => (
                    <div key={point} className="flex items-start gap-2 text-xs text-slate-700">
                      <div className="mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="size-2 stroke-[3]" />
                      </div>
                      <span className="font-normal text-slate-600">{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. STEP-BY-STEP EXPORT GUIDES (CHATGPT, CLAUDE, GEMINI)   */}
      {/* ========================================================= */}
      <section className="px-0 py-16 w-[94%] max-w-6xl mx-auto">
        <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-50/60 via-white to-slate-50/40 p-6 sm:p-10 shadow-[0_8px_30px_rgba(15,30,60,0.04)] backdrop-blur-xl">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-xs font-normal uppercase tracking-[0.2em] text-blue-600">
              Quick Export Instructions
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[40px] font-normal tracking-tight text-slate-900 leading-tight">
              How to export your AI history.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base font-normal leading-relaxed text-slate-600">
              Exporting takes less than 30 seconds. Choose your primary AI assistant below:
            </p>
          </div>

          {/* Platform Switcher */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {exportGuides.map((guide) => {
              const isActive = activeGuideTab === guide.id;
              return (
                <button
                  key={guide.id}
                  onClick={() => setActiveGuideTab(guide.id)}
                  className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs transition-all ${
                    isActive
                      ? "bg-slate-900 text-white shadow-sm font-normal"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 font-normal"
                  }`}
                >
                  <div
                    className={`flex size-5 shrink-0 items-center justify-center rounded-md p-0.5 transition-colors ${
                      isActive
                        ? "bg-white shadow-xs"
                        : "bg-slate-100/90 border border-slate-200/60"
                    }`}
                  >
                    <Image
                      src={guide.icon}
                      alt={guide.name}
                      width={16}
                      height={16}
                      className="size-3.5 object-contain"
                    />
                  </div>
                  <span>{guide.name}</span>
                </button>
              );
            })}
          </div>

          {/* Guide Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeGuide.steps.map((s, idx) => (
              <div
                key={s}
                className="flex items-start gap-3 rounded-2xl border border-white/90 bg-white/80 p-4 shadow-sm backdrop-blur-xl font-normal"
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-mono text-xs font-normal">
                  {idx + 1}
                </div>
                <p className="text-xs font-normal leading-relaxed text-slate-600">
                  {s}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. MINIMAL & FRIENDLY CALL TO ACTION                      */}
      {/* ========================================================= */}
      <section
        className="relative overflow-hidden px-6 py-28 text-center font-normal"
        style={{
          background: "radial-gradient(circle at 50% 50%, #ffffff 0%, #f8fbff 100%)",
        }}
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center font-normal">
          <h2 className="mt-6 text-4xl sm:text-5xl lg:text-[54px] font-normal tracking-tight leading-tight text-slate-900">
            Start exploring your AI knowledge.
          </h2>
          <p className="mt-5 max-w-2xl text-base sm:text-lg font-normal leading-relaxed text-slate-600">
            Drop your conversation ZIP archive and see your personal intelligence hub come alive with zero cloud setup.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4 font-normal">
            <Button
              asChild
              size="lg"
              className="h-13 rounded-full bg-slate-900 px-8 text-base font-normal text-white shadow-sm transition-all hover:bg-blue-600 hover:scale-105 active:scale-95"
            >
              <Link href="/memory" className="flex items-center gap-2.5">
                <Upload className="size-4" />
                <span>Import AI history</span>
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
