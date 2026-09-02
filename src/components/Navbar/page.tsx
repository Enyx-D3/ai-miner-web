"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, BrainCircuit, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

const links = [
  { label: "Product", href: "/" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Security", href: "/security" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-4 left-1/2 z-50 w-[94%] max-w-6xl -translate-x-1/2 transition-all duration-300">
      {/* Floating Pill Bar */}
      <div
        className={`flex items-center justify-between rounded-full px-4 py-2 sm:px-6 sm:py-2.5 transition-all duration-300 border ${
          scrolled
            ? "border-white/80 bg-white/75 shadow-[0_12px_40px_rgba(15,30,60,0.1)] backdrop-blur-2xl"
            : "border-white/60 bg-white/45 shadow-[0_8px_32px_rgba(15,30,60,0.04)] backdrop-blur-xl"
        }`}
      >
        {/* Brand */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 active:scale-95 transition-transform"
          onClick={() => setOpen(false)}
        >
          <div className="relative flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <BrainCircuit className="size-4" />
          </div>
          <div className="leading-tight">
            <span className="block text-[13px] font-medium tracking-tight text-slate-900">
              Brain2 Labs
            </span>
            <span className="block text-[8px] font-medium uppercase tracking-wider text-blue-600">
              AI Miner
            </span>
          </div>
        </Link>

        {/* Desktop Links */}
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative rounded-full px-3.5 py-1.5 text-xs tracking-tight transition-all duration-200 ${
                  active
                    ? "bg-slate-900/5 text-blue-600 font-medium"
                    : "text-slate-600 font-normal hover:bg-slate-900/5 hover:text-slate-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/memory"
            className="rounded-full px-3.5 py-1.5 text-xs font-normal text-slate-700 hover:text-blue-600 transition-colors"
          >
            Import history
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-normal text-white shadow-sm hover:bg-blue-600 active:scale-95 transition-all duration-200"
          >
            <span>Open AI Miner</span>
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          className="flex size-8 items-center justify-center rounded-full bg-white/60 text-slate-800 backdrop-blur-md md:hidden border border-white/60 hover:bg-white/80 active:scale-90 transition-all"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation menu"
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {open && (
        <div className="mt-2 overflow-hidden rounded-3xl border border-white/70 bg-white/90 p-4 shadow-[0_16px_40px_rgba(15,30,60,0.12)] backdrop-blur-2xl md:hidden animate-in fade-in zoom-in-95 duration-200">
          <nav className="flex flex-col gap-1">
            {links.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-2xl px-4 py-2.5 text-sm transition-colors ${
                    active
                      ? "bg-blue-50 text-blue-600 font-medium"
                      : "text-slate-700 font-normal hover:bg-slate-50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
              <Link
                href="/memory"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center rounded-xl border border-slate-200/80 bg-white py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
              >
                Import
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1 rounded-xl bg-slate-900 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-600 active:scale-95 transition-all"
              >
                <span>Open Miner</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
