import Link from "next/link";
import Image from "next/image";
import { BrainCircuit } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative w-full border-t border-slate-200/70 bg-gradient-to-b from-[#fafcff] to-slate-50/80 pt-16 pb-12 text-slate-600 font-sans">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-slate-200/60">
          {/* Brand & Mission Statement (5 Columns) */}
          <div className="md:col-span-5 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/20">
                <BrainCircuit className="size-4" />
              </div>
              <div>
                <span className="block text-sm font-medium tracking-tight text-slate-900 leading-tight">
                  Brain2 Labs
                </span>
                <span className="block text-[9px] font-medium uppercase tracking-wider text-blue-600 leading-tight">
                  AI Miner
                </span>
              </div>
            </Link>

            <p className="text-xs font-normal text-slate-500 leading-relaxed max-w-sm">
              Turn unstructured conversations across ChatGPT, Claude, and Gemini into verifiable, source-backed working memory. 100% browser-native with zero cloud dependencies.
            </p>

            <div className="flex items-center gap-2 pt-1 text-[11px] font-normal text-slate-500">
              <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Local-First Architecture · Volatile WebCrypto</span>
            </div>
          </div>

          {/* Navigation Links Columns (7 Columns) */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {/* Column 1: Core Product */}
            <div className="space-y-3">
              <div className="text-xs font-normal uppercase tracking-wider text-slate-900">
                Product
              </div>
              <ul className="space-y-2.5 text-xs font-normal">
                <li>
                  <Link href="/" className="text-slate-600 hover:text-blue-600 transition-colors">
                    Overview
                  </Link>
                </li>
                <li>
                  <Link href="/how-it-works" className="text-slate-600 hover:text-blue-600 transition-colors">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="/features" className="text-slate-600 hover:text-blue-600 transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-slate-600 hover:text-blue-600 transition-colors">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 2: Workspace & Security */}
            <div className="space-y-3">
              <div className="text-xs font-normal uppercase tracking-wider text-slate-900">
                Workspace
              </div>
              <ul className="space-y-2.5 text-xs font-normal">
                <li>
                  <Link href="/memory" className="text-slate-600 hover:text-blue-600 transition-colors">
                    Import History
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="text-slate-600 hover:text-blue-600 transition-colors">
                    AI Miner Workspace
                  </Link>
                </li>
                <li>
                  <Link href="/security" className="text-slate-600 hover:text-blue-600 transition-colors">
                    Security & Privacy
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Supported Providers */}
            <div className="space-y-3">
              <div className="text-xs font-normal uppercase tracking-wider text-slate-900">
                Integrations
              </div>
              <ul className="space-y-2.5 text-xs font-normal text-slate-600">
                <li className="flex items-center gap-2">
                  <div className="flex size-4 shrink-0 items-center justify-center rounded-sm overflow-hidden">
                    <Image
                      src="/images/chatgpt.png"
                      alt="ChatGPT"
                      width={16}
                      height={16}
                      className="size-3.5 object-contain"
                    />
                  </div>
                  <span>ChatGPT (OpenAI)</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="flex size-4 shrink-0 items-center justify-center rounded-sm overflow-hidden">
                    <Image
                      src="/images/claude.png"
                      alt="Claude"
                      width={16}
                      height={16}
                      className="size-3.5 object-contain"
                    />
                  </div>
                  <span>Claude (Anthropic)</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="flex size-4 shrink-0 items-center justify-center rounded-sm overflow-hidden">
                    <Image
                      src="/images/gemini.png"
                      alt="Gemini"
                      width={16}
                      height={16}
                      className="size-3.5 object-contain"
                    />
                  </div>
                  <span>Gemini (Google)</span>
                </li>
                <li className="flex items-center gap-2 text-slate-500">
                  <div className="flex size-4 shrink-0 items-center justify-center">
                    <span className="text-xs">⚡</span>
                  </div>
                  <span>Chrome Extension</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="mt-8 flex flex-col items-center justify-center text-[11px] font-normal text-slate-400 text-center">
          <div>
            © {new Date().getFullYear()} Brain2 Labs. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
