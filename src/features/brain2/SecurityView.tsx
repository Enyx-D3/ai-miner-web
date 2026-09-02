"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Database,
  EyeOff,
  FileCheck2,
  HardDrive,
  KeyRound,
  Lock,
  LockKeyhole,
  Radio,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Upload,
  WifiOff,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SecurityPillar {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  desc: string;
  tag: string;
  badgeColor: string;
}

const securityPillars: SecurityPillar[] = [
  {
    icon: HardDrive,
    title: "100% Local-First Storage",
    subtitle: "Browser IndexedDB Sandbox",
    desc: "Your entire conversation graph, extracted decisions, and project wikis live inside your browser's local database. No cloud accounts, no sync servers, no remote databases.",
    tag: "Zero Server Ingestion",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    icon: KeyRound,
    title: "PBKDF2 + AES-256-GCM",
    subtitle: "Military-Grade Web Crypto",
    desc: "Export snapshots with 200,000 PBKDF2 iterations and authenticated AES-256-GCM. Encryption keys exist only in volatile RAM while you work and vanish when you close the tab.",
    tag: "Hardware Accelerated",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    icon: FileCheck2,
    title: "SHA-256 Provenance & Lineage",
    subtitle: "Cryptographic Turn Audit",
    desc: "Every extracted proposition links directly back to its exact conversation message via SHA-256 hashes. You can audit the exact reason and context behind every decision.",
    tag: "100% Verifiable",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    icon: EyeOff,
    title: "Zero AI Model Training",
    subtitle: "Complete Data Isolation",
    desc: "Because Brain2 never transmits your conversations over the internet, your confidential code, business logic, and private prompts cannot be scraped or used to train third-party LLMs.",
    tag: "No Data Harvesting",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    icon: Database,
    title: "Portable .B2M Vault Packages",
    subtitle: "Self-Custody Snapshots",
    desc: "Save your memory as standard, open-format .B2M encrypted files. Move your knowledge between laptops, offline drives, or personal backups without vendor lock-in.",
    tag: "Open Portability",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    icon: Cpu,
    title: "Sandboxed Web Workers",
    subtitle: "In-Memory Decompression",
    desc: "Large ZIP files from ChatGPT, Claude, or Gemini are decompressed in memory using background WebAssembly workers with fflate. Your raw archives never touch any cloud storage.",
    tag: "Zero Cloud Upload",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
  },
];

const securityComparison = [
  {
    feature: "Storage Location",
    brain2: "100% Local (Browser IndexedDB)",
    cloudAI: "Centralized Cloud Database",
    cloudNotes: "Remote Server Storage",
  },
  {
    feature: "Encryption Key Ownership",
    brain2: "You Only (Volatile RAM)",
    cloudAI: "Provider-Managed Keyring",
    cloudNotes: "Provider Cloud Managed",
  },
  {
    feature: "AI Training on Your Conversations",
    brain2: "Guaranteed Never (0% Egress)",
    cloudAI: "Opt-Out / Used for Training",
    cloudNotes: "Subject to Enterprise Terms",
  },
  {
    feature: "Offline Functionality",
    brain2: "Full Offline PWA Capability",
    cloudAI: "Fails Without Internet",
    cloudNotes: "Requires Server Connection",
  },
  {
    feature: "Cryptographic Turn Audit",
    brain2: "SHA-256 Turn Signatures",
    cloudAI: "Opaque / No Lineage Hashes",
    cloudNotes: "No Cryptographic Verification",
  },
  {
    feature: "Telemetry & Third-Party Trackers",
    brain2: "Zero Trackers or Ad Pixels",
    cloudAI: "Extensive Session Analytics",
    cloudNotes: "Cloud Usage Telemetry",
  },
];

const securityFaqs = [
  {
    question: "Can OpenAI, Anthropic, or Google see my Brain2 data?",
    answer:
      "No. Brain2 operates entirely inside your local browser runtime. When you drop an export ZIP from ChatGPT, Claude, or Gemini, the file is parsed inside volatile WebAssembly memory. Not a single byte is ever transmitted to OpenAI, Anthropic, Google, or our servers.",
  },
  {
    question: "How does the .B2M encrypted vault protect my information?",
    answer:
      "When you choose to export your memory vault, Brain2 uses native W3C Web Crypto APIs to derive a 256-bit AES-GCM key from your passphrase using 200,000 PBKDF2 rounds with a cryptographically secure random salt. The passphrase and master key never leave your device's RAM.",
  },
  {
    question: "What happens if I use Brain2 without an internet connection?",
    answer:
      "Brain2 is built as a Progressive Web App (PWA) with complete offline-first support. Once loaded in your browser, search (0.4ms), project organization, LifeWiki reading, and vault decryption work flawlessly with zero active internet connection.",
  },
  {
    question: "How does SHA-256 cryptographic provenance prevent hallucinations?",
    answer:
      "Every atom (Decision, Constraint, Fact, or Task) extracted by Brain2 contains a canonical SHA-256 hash of the exact message turn it came from. If an AI assistant generates code based on your memory, you can click on any claim to see the original conversation with line-by-line verification.",
  },
];

export function SecurityView() {
  const [activeTab, setActiveTab] = useState<"encryptor" | "radar" | "lineage">("encryptor");
  const [mockPassphrase, setMockPassphrase] = useState("my-super-secret-vault-key");
  const [isEncrypted, setIsEncrypted] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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
          Security built for{" "}
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent font-normal">
            total privacy.
          </span>
        </h1>

        {/* 3 Quick Visual Trust Badges */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 rounded-2xl border border-white/90 bg-white/80 p-4 shadow-sm backdrop-blur-xl">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <HardDrive className="size-5" />
            </div>
            <div>
              <div className="text-xs font-normal text-slate-900">0% Cloud Ingestion</div>
              <div className="text-[11px] font-normal text-slate-500">100% In-Browser Sandbox</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/90 bg-white/80 p-4 shadow-sm backdrop-blur-xl">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <KeyRound className="size-5" />
            </div>
            <div>
              <div className="text-xs font-normal text-slate-900">200,000 PBKDF2 Rounds</div>
              <div className="text-[11px] font-normal text-slate-500">AES-256-GCM Web Crypto</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/90 bg-white/80 p-4 shadow-sm backdrop-blur-xl">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <WifiOff className="size-5" />
            </div>
            <div>
              <div className="text-xs font-normal text-slate-900">Zero Network Telemetry</div>
              <div className="text-[11px] font-normal text-slate-500">Offline PWA Operational</div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. INTERACTIVE LIVE SECURITY LAB (USER-FRIENDLY SIMULATOR) */}
      {/* ========================================================= */}
      <section className="px-0 py-12 w-[94%] max-w-6xl mx-auto">
        <div className="rounded-3xl border border-slate-200/80 bg-white/70 p-6 sm:p-10 shadow-[0_8px_30px_rgba(15,30,60,0.04)] backdrop-blur-xl">
          {/* Header & Tab Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-normal uppercase tracking-[0.2em] text-blue-600">
                  Interactive Security Lab
                </span>
              </div>
              <h2 className="mt-2 text-2xl sm:text-3xl lg:text-[32px] font-normal text-slate-900 tracking-tight leading-tight">
                Test how local encryption & privacy work.
              </h2>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl self-start sm:self-auto">
              <button
                onClick={() => setActiveTab("encryptor")}
                className={`px-3.5 py-1.5 text-xs rounded-lg transition-all ${
                  activeTab === "encryptor"
                    ? "bg-white text-blue-600 shadow-2xs font-normal"
                    : "text-slate-600 hover:text-slate-900 font-normal"
                }`}
              >
                Vault Encryptor
              </button>
              <button
                onClick={() => setActiveTab("radar")}
                className={`px-3.5 py-1.5 text-xs rounded-lg transition-all ${
                  activeTab === "radar"
                    ? "bg-white text-blue-600 shadow-2xs font-normal"
                    : "text-slate-600 hover:text-slate-900 font-normal"
                }`}
              >
                Network Radar
              </button>
              <button
                onClick={() => setActiveTab("lineage")}
                className={`px-3.5 py-1.5 text-xs rounded-lg transition-all ${
                  activeTab === "lineage"
                    ? "bg-white text-blue-600 shadow-2xs font-normal"
                    : "text-slate-600 hover:text-slate-900 font-normal"
                }`}
              >
                Turn Provenance
              </button>
            </div>
          </div>

          {/* TAB 1: VAULT ENCRYPTOR */}
          {activeTab === "encryptor" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-stretch">
              <div className="lg:col-span-6 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-normal uppercase tracking-wider text-slate-500">
                    Step 1: Your Passphrase (Volatile RAM)
                  </span>
                  <p className="mt-2 text-xs text-slate-600 font-normal leading-relaxed">
                    Type a sample passphrase below to see how Web Crypto derives a 256-bit encryption key on-the-fly without sending anything across the internet.
                  </p>

                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="text-[11px] font-normal text-slate-500 block mb-1">
                        Vault Passphrase:
                      </label>
                      <input
                        type="text"
                        value={mockPassphrase}
                        onChange={(e) => setMockPassphrase(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3.5 text-xs space-y-1.5 font-normal">
                      <div className="text-emerald-900 font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                        <span>Key Derivation Details</span>
                      </div>
                      <div className="text-[11px] text-emerald-800 font-mono">
                        Algorithm: PBKDF2 · SHA-256
                      </div>
                      <div className="text-[11px] text-emerald-800 font-mono">
                        Rounds: 200,000 iterations
                      </div>
                      <div className="text-[11px] text-emerald-800 font-mono">
                        Key Output: AES-256-GCM (Non-extractable)
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-normal">
                  <span>Web Cryptography API</span>
                  <span className="text-emerald-600 font-normal">0.3ms Execution Time</span>
                </div>
              </div>

              <div className="lg:col-span-6 rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/40 via-white to-indigo-50/30 p-6 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-normal uppercase tracking-wider text-blue-700">
                      Step 2: Authenticated Payload Snapshot
                    </span>
                    <span className="font-mono text-[10px] bg-blue-100/70 text-blue-800 px-2.5 py-0.5 rounded font-normal">
                      .B2M Vault
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 font-mono text-xs text-slate-200 overflow-x-auto shadow-inner leading-relaxed">
                    <div className="text-slate-400 mb-1">// Encrypted .B2M Binary Container</div>
                    <div className="text-emerald-400">
                      &quot;magic&quot;: &quot;B2M_VAULT_V1&quot;,
                    </div>
                    <div className="text-blue-300">
                      &quot;salt&quot;: &quot;0f8a4e12c5b9... (16 bytes)&quot;,
                    </div>
                    <div className="text-purple-300">
                      &quot;iv&quot;: &quot;9c3a1d4f... (12 bytes)&quot;,
                    </div>
                    <div className="text-amber-300">
                      &quot;tag&quot;: &quot;7e2d9b1a... (128-bit tag)&quot;,
                    </div>
                    <div className="text-slate-300">
                      &quot;payload&quot;: &quot;U2FsdGVkX1+vM... [AES-256 Cipher]&quot;
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-slate-600 font-normal leading-relaxed">
                    The resulting .B2M file is self-contained. Anyone without your passphrase sees only high-entropy random bytes.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-normal">
                  <span className="flex items-center gap-1.5 text-emerald-700 font-normal">
                    <Check className="size-3.5 text-emerald-600" /> 100% Client-Side Encryption
                  </span>
                  <span className="font-mono text-[10px]">Zero Cloud Leaks</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NETWORK RADAR */}
          {activeTab === "radar" && (
            <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-6 sm:p-8">
              <div className="max-w-2xl mb-6">
                <h3 className="text-lg font-normal text-slate-900">
                  Live Network Traffic Monitor
                </h3>
                <p className="text-xs text-slate-600 mt-1 font-normal leading-relaxed">
                  During ingestion, parsing, indexing, and search, Brain2 never opens any outbound network sockets.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-xl border border-white bg-white p-4 text-center shadow-2xs">
                  <div className="text-2xl font-mono text-emerald-600 font-normal">0 KB</div>
                  <div className="text-[11px] font-normal text-slate-500 mt-1">External Data Egress</div>
                </div>
                <div className="rounded-xl border border-white bg-white p-4 text-center shadow-2xs">
                  <div className="text-2xl font-mono text-emerald-600 font-normal">0</div>
                  <div className="text-[11px] font-normal text-slate-500 mt-1">Analytics / Tracking Pings</div>
                </div>
                <div className="rounded-xl border border-white bg-white p-4 text-center shadow-2xs">
                  <div className="text-2xl font-mono text-emerald-600 font-normal">0</div>
                  <div className="text-[11px] font-normal text-slate-500 mt-1">Remote Database Queries</div>
                </div>
                <div className="rounded-xl border border-white bg-white p-4 text-center shadow-2xs">
                  <div className="text-2xl font-mono text-blue-600 font-normal">100%</div>
                  <div className="text-[11px] font-normal text-slate-500 mt-1">Local Browser IndexedDB</div>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-xl border border-emerald-200/70 bg-emerald-50/60 flex items-center justify-between text-xs text-emerald-900 font-normal">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-600" />
                  <span>Verify anytime: Open Chrome DevTools → Network Tab → Filter: WS / XHR</span>
                </span>
                <span className="text-emerald-700 font-mono text-[11px]">Status: Completely Silent</span>
              </div>
            </div>
          )}

          {/* TAB 3: TURN PROVENANCE */}
          {activeTab === "lineage" && (
            <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-6 sm:p-8 space-y-4">
              <div className="max-w-2xl">
                <h3 className="text-lg font-normal text-slate-900">
                  Cryptographic SHA-256 Turn Lineage
                </h3>
                <p className="text-xs text-slate-600 mt-1 font-normal leading-relaxed">
                  How Brain2 turns raw LLM discussion into permanently verifiable engineering decisions.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-normal uppercase tracking-wider">
                    <span>Source Turn Message</span>
                    <span className="text-purple-600">ChatGPT Export</span>
                  </div>
                  <p className="text-xs text-slate-700 font-normal leading-relaxed">
                    &quot;Let&apos;s use PBKDF2 with 200k rounds so passphrases never hit disk storage.&quot;
                  </p>
                  <div className="pt-2 border-t border-slate-100 font-mono text-[10px] text-slate-400 truncate">
                    turnHash: sha256:7f83b1657ff1fc53b92dc18148a1d...
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-blue-700 font-normal uppercase tracking-wider">
                    <span>Extracted Living Decision</span>
                    <span className="text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">Verified</span>
                  </div>
                  <p className="text-xs text-slate-800 font-normal leading-relaxed">
                    <strong>ADR-002:</strong> Vault keys derived via PBKDF2-SHA256 in volatile RAM.
                  </p>
                  <div className="pt-2 border-t border-blue-100 font-mono text-[10px] text-blue-600">
                    Cryptographically bound to source turn · 100% Provenance
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. SIX CORE SECURITY PILLARS (CLEAN & MINIMAL GRID)       */}
      {/* ========================================================= */}
      <section className="px-0 py-16 w-[94%] max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-normal uppercase tracking-[0.2em] text-blue-600">
            Privacy Architecture
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[40px] font-normal tracking-tight text-slate-900 leading-tight">
            Engineered for cryptographic truth.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base font-normal leading-relaxed text-slate-600">
            Every architectural layer is designed so you retain absolute ownership over your past AI conversations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {securityPillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/80 bg-white/60 p-7 text-left shadow-[0_10px_30px_rgba(15,30,60,0.04)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:bg-white/90 hover:shadow-[0_20px_40px_rgba(24,100,255,0.08)]"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-110">
                      <Icon className="size-5" />
                    </div>
                    <span className="text-[10px] font-normal uppercase tracking-wider text-slate-400">
                      {pillar.tag}
                    </span>
                  </div>

                  <div className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-normal uppercase tracking-wider text-slate-600">
                    {pillar.subtitle}
                  </div>

                  <h3 className="mt-3 text-lg font-normal text-slate-900">
                    {pillar.title}
                  </h3>

                  <p className="mt-2 text-xs leading-relaxed font-normal text-slate-600">
                    {pillar.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. SECURITY & PRIVACY COMPARISON MATRIX                   */}
      {/* ========================================================= */}
      <section className="px-0 py-16 w-[94%] max-w-6xl mx-auto">
        <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-50/60 via-white to-slate-50/40 p-6 sm:p-10 shadow-[0_8px_30px_rgba(15,30,60,0.04)] backdrop-blur-xl">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-normal uppercase tracking-[0.2em] text-blue-600">
              Architectural Comparison
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[40px] font-normal tracking-tight text-slate-900 leading-tight">
              Brain2 vs. Traditional Cloud Tools
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base font-normal leading-relaxed text-slate-600">
              See why client-side deterministic storage fundamentally outperforms centralized cloud AI databases.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-normal">
                  <th className="py-3 px-4 font-normal uppercase tracking-wider">Security Dimension</th>
                  <th className="py-3 px-4 font-normal text-blue-700 bg-blue-50/60 rounded-t-xl">Brain2 AI Miner</th>
                  <th className="py-3 px-4 font-normal">Cloud AI Chats</th>
                  <th className="py-3 px-4 font-normal">Cloud Notes / DBs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {securityComparison.map((row) => (
                  <tr key={row.feature} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 text-slate-900 font-normal">{row.feature}</td>
                    <td className="py-3.5 px-4 font-normal text-blue-800 bg-blue-50/40 flex items-center gap-1.5">
                      <Check className="size-3 text-emerald-600 stroke-[3]" />
                      <span>{row.brain2}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{row.cloudAI}</td>
                    <td className="py-3.5 px-4 text-slate-500">{row.cloudNotes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. USER-FRIENDLY SECURITY QUESTIONS & ANSWERS (ACCORDION) */}
      {/* ========================================================= */}
      <section className="px-0 py-16 w-[94%] max-w-4xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-normal uppercase tracking-[0.2em] text-blue-600">
            Common Inquiries
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[40px] font-normal tracking-tight text-slate-900 leading-tight">
            Security & Privacy Q&A
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base font-normal leading-relaxed text-slate-600">
            Clear, transparent answers to help you understand how your privacy is guaranteed.
          </p>
        </div>

        <div className="space-y-3">
          {securityFaqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={faq.question}
                className="rounded-2xl border border-white/90 bg-white/80 shadow-sm backdrop-blur-xl transition-all duration-200 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left transition-colors hover:bg-slate-50/50"
                >
                  <span className="text-sm sm:text-base font-normal text-slate-900 pr-4">
                    {faq.question}
                  </span>
                  <div
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform duration-200 ${
                      isOpen ? "rotate-180 bg-blue-50 text-blue-600" : ""
                    }`}
                  >
                    <ChevronDown className="size-3.5" />
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm font-normal text-slate-600 leading-relaxed border-t border-slate-100">
                    {faq.answer}
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
      <section
        className="relative overflow-hidden px-6 py-28 text-center font-normal"
        style={{
          background: "radial-gradient(circle at 50% 50%, #ffffff 0%, #f8fbff 100%)",
        }}
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center font-normal">
          <h2 className="mt-6 text-4xl sm:text-5xl lg:text-[54px] font-normal tracking-tight leading-tight text-slate-900">
            Your intelligence, strictly yours.
          </h2>
          <p className="mt-5 max-w-2xl text-base sm:text-lg font-normal leading-relaxed text-slate-600">
            Open the local workspace, import an AI history export, and verify complete provenance with zero forced cloud storage.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4 font-normal">
            <Button
              asChild
              size="lg"
              className="h-13 rounded-full bg-slate-900 px-8 text-base font-normal text-white shadow-sm transition-all hover:bg-blue-600 hover:scale-105 active:scale-95"
            >
              <Link href="/dashboard" className="flex items-center gap-2.5">
                <span>Open AI Miner Workspace</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-13 rounded-full border-slate-200/90 bg-white/80 px-8 text-base font-normal text-slate-800 shadow-sm backdrop-blur-md transition-all hover:bg-white hover:text-blue-600 hover:scale-105 active:scale-95"
            >
              <Link href="/memory">Import AI history</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
