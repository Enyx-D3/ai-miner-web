import Link from "next/link";
import { BrainCircuit, Lock, Shield } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative w-full border-t border-slate-200/60 bg-gradient-to-b from-transparent to-slate-50/50 py-12 text-slate-600 font-sans">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          {/* Brand */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
                <BrainCircuit className="size-3.5" />
              </div>
              <span className="text-sm font-medium tracking-tight text-slate-900">
                Brain2 AI Miner
              </span>
            </Link>
            <p className="text-xs font-normal text-slate-500 text-center md:text-left">
              Turn years of AI conversations into local, source-backed intelligence.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-normal text-slate-600">
            <Link href="/" className="hover:text-blue-600 transition-colors">
              Product
            </Link>
            <Link href="/how-it-works" className="hover:text-blue-600 transition-colors">
              How It Works
            </Link>
            <Link href="/features" className="hover:text-blue-600 transition-colors">
              Features
            </Link>
            <Link href="/pricing" className="hover:text-blue-600 transition-colors">
              Pricing
            </Link>
            <Link href="/security" className="hover:text-blue-600 transition-colors">
              Security
            </Link>
            <Link href="/memory" className="hover:text-blue-600 transition-colors">
              Import History
            </Link>
            <Link href="/dashboard" className="hover:text-blue-600 transition-colors">
              Open Workspace
            </Link>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 text-[11px] font-medium text-emerald-700 shadow-sm backdrop-blur-md">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Local IndexedDB 100% Active</span>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-slate-200/50 pt-6 text-[11px] font-normal text-slate-400 sm:flex-row">
          <div>
            © {new Date().getFullYear()} Brain2 Labs. Built for deterministic, privacy-first AI intelligence.
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1">
              <Lock className="size-3 text-slate-400" /> Client-side encrypted
            </span>
            <span className="inline-flex items-center gap-1">
              <Shield className="size-3 text-slate-400" /> Source-accounted provenance
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
