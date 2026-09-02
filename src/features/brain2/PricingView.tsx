"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PricingTier {
  id: string;
  name: string;
  monthlyPrice: string;
  yearlyPrice: string;
  subtext: string;
  hasBillingToggle?: boolean;
  highlight?: boolean;
  ctaText: string;
  ctaLink: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  inheritedText?: string;
  features: string[];
}

const pricingTiers: PricingTier[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: "$0",
    yearlyPrice: "$0",
    subtext: "Free for everyone",
    ctaText: "Get started",
    ctaLink: "/memory",
    features: [
      "Unlimited ChatGPT, Claude & Gemini imports",
      "Sub-millisecond local search in IndexedDB",
      "Automatic project workspace clustering",
      "Typed atom extraction (Decisions, Tasks, Facts)",
      "Automated LifeWiki documentation generator",
      "100% client-side storage with zero cloud telemetry",
    ],
  },
  {
    id: "pro",
    name: "Basic",
    monthlyPrice: "$10",
    yearlyPrice: "$8",
    subtext: "per user/month",
    hasBillingToggle: true,
    ctaText: "Get started",
    ctaLink: "/memory",
    inheritedText: "All Free features +",
    features: [
      "Encrypted .B2M Vault export (PBKDF2 + AES-256)",
      "Chrome Companion Extension live capture",
      "B2JOB AI context compiler (-90% tokens)",
      "Offline Progressive Web App (PWA)",
      "Direct WebRTC peer-to-peer device mesh",
      "Export to Cursor, VS Code, and terminal",
    ],
  },
  {
    id: "business",
    name: "Business",
    monthlyPrice: "$16",
    yearlyPrice: "$14",
    subtext: "per user/month",
    hasBillingToggle: true,
    highlight: true,
    ctaText: "Get started",
    ctaLink: "/memory",
    secondaryCtaText: "Contact sales",
    secondaryCtaLink: "mailto:sales@enyx.ai?subject=Brain2%20Business%20Inquiry",
    inheritedText: "All Basic features +",
    features: [
      "Team Architecture Decision Records (ADRs)",
      "Shared project delta replication",
      "Truth Engine conflict reconciliation",
      "Team LifeWiki workspace synthesis",
      "Cryptographic turn verification & audit lineage",
      "Priority feature roadmap requests",
      "Direct engineer onboarding support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: "Custom",
    yearlyPrice: "Custom",
    subtext: "Annual billing only",
    ctaText: "Contact sales",
    ctaLink: "mailto:enterprise@enyx.ai?subject=Brain2%20Enterprise%20Plan",
    inheritedText: "All Business features +",
    features: [
      "Custom on-premise local deployments",
      "SAML SSO and SCIM directory sync",
      "Granular team access & admin controls",
      "Dedicated cryptographic security review",
      "Advanced custom AI connectors",
      "Migration & onboarding engineering support",
      "Dedicated Slack channel & custom SLA",
    ],
  },
];

export function PricingView() {
  const [isYearly, setIsYearly] = useState(true);

  return (
    <div className="relative min-h-screen bg-[#fafcff] text-slate-900 font-sans selection:bg-blue-600 selection:text-white pt-24 pb-20 overflow-hidden">
      {/* Background ambient radial glows */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[520px] w-[860px] rounded-full bg-gradient-to-b from-blue-400/10 via-indigo-400/5 to-transparent blur-[130px]" />
        <div className="absolute top-[50%] right-[-5%] h-[400px] w-[500px] rounded-full bg-cyan-400/5 blur-[120px]" />
      </div>

      <div className="w-[94%] max-w-6xl mx-auto">
        {/* ========================================================= */}
        {/* 1. HEADER                                                 */}
        {/* ========================================================= */}
        <div className="text-center max-w-3xl mx-auto pt-8 pb-14 sm:pt-12 sm:pb-16">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-[72px] font-normal tracking-tight text-slate-900 leading-[1.12]">
            Plans &{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent font-normal">
              pricing.
            </span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
            Local-first intelligence for individual developers and engineering teams.
          </p>
        </div>

        {/* ========================================================= */}
        {/* 2. LINEAR-STYLE 4-COLUMN PRICING GRID (LIGHT MODE)        */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          {pricingTiers.map((tier) => {
            const price = isYearly ? tier.yearlyPrice : tier.monthlyPrice;

            return (
              <div
                key={tier.id}
                className={`relative flex flex-col justify-between rounded-2xl p-6 transition-all duration-200 ${
                  tier.highlight
                    ? "border-2 border-blue-600 bg-white shadow-[0_12px_40px_rgba(37,99,235,0.1)] z-10"
                    : "border border-white/80 bg-white/70 shadow-[0_8px_30px_rgba(15,30,60,0.04)] backdrop-blur-xl hover:border-blue-200 hover:bg-white/90"
                }`}
              >
                <div>
                  {/* Tier Title */}
                  <h2 className="text-lg font-normal text-slate-900 tracking-tight">
                    {tier.name}
                  </h2>

                  {/* Price */}
                  <div className="mt-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-normal tracking-tight text-slate-900 font-mono">
                        {price}
                      </span>
                      {tier.id !== "free" && tier.id !== "enterprise" && (
                        <span className="text-xs text-slate-500 font-normal">
                          {tier.subtext}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Subtitle / Billing Toggle */}
                  <div className="mt-3 min-h-[28px] flex items-center">
                    {tier.hasBillingToggle ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsYearly(!isYearly)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isYearly ? "bg-blue-600" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              isYearly ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                        <span className="text-xs text-slate-600 font-normal">
                          Billed yearly
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 font-normal">
                        {tier.subtext}
                      </span>
                    )}
                  </div>

                  {/* Divider Line */}
                  <div className="mt-5 mb-5 border-t border-slate-100" />

                  {/* Inherited Line (e.g. All Free features +) */}
                  {tier.inheritedText && (
                    <div className="flex items-center gap-2 mb-3 text-xs font-normal text-slate-900">
                      <Check className="size-3.5 text-blue-600 stroke-[2.5]" />
                      <span>{tier.inheritedText}</span>
                    </div>
                  )}

                  {/* Feature Checklist */}
                  <div className="space-y-3 mb-8">
                    {tier.features.map((feat) => (
                      <div
                        key={feat}
                        className="flex items-start gap-2.5 text-xs text-slate-600"
                      >
                        <div className="mt-0.5 shrink-0 flex items-center justify-center">
                          <Check className="size-3.5 text-slate-400 stroke-[2.5]" />
                        </div>
                        <span className="font-normal leading-relaxed text-slate-600">
                          {feat}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Action Button */}
                <div className="pt-4 mt-auto">
                  {tier.secondaryCtaText ? (
                    <div className="flex items-center gap-2">
                      <Button
                        asChild
                        size="sm"
                        className="flex-1 h-10 rounded-full bg-blue-600 text-white font-normal text-xs hover:bg-blue-700 transition-all active:scale-95 shadow-md shadow-blue-500/20"
                      >
                        <Link href={tier.ctaLink}>{tier.ctaText}</Link>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-10 rounded-full text-xs font-normal text-slate-700 hover:text-slate-900 hover:bg-slate-100 border-slate-200 px-3.5"
                      >
                        <Link href={tier.secondaryCtaLink || "#"}>
                          {tier.secondaryCtaText}
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <Button
                      asChild
                      size="sm"
                      className="w-full h-10 rounded-full bg-slate-900 text-white hover:bg-blue-600 text-xs font-normal transition-all active:scale-95 shadow-sm"
                    >
                      <Link href={tier.ctaLink}>{tier.ctaText}</Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ========================================================= */}
        {/* 3. CALL TO ACTION                                         */}
        {/* ========================================================= */}
        <section
          className="mt-24 text-center max-w-4xl mx-auto mb-10 overflow-hidden rounded-3xl border border-white/80 p-8 sm:p-12 shadow-[0_8px_30px_rgba(15,30,60,0.04)] backdrop-blur-xl"
          style={{
            background: "radial-gradient(circle at 50% 50%, #ffffff 0%, #f8fbff 100%)",
          }}
        >
          <h2 className="text-4xl sm:text-5xl lg:text-[54px] font-normal tracking-tight leading-tight text-slate-900">
            Start exploring all features today.
          </h2>
          <p className="mt-5 max-w-2xl mx-auto text-base sm:text-lg font-normal leading-relaxed text-slate-600">
            Drop your conversation ZIP archive and see your personal intelligence hub come alive with zero cloud setup.
          </p>
          <div className="mt-9 flex justify-center gap-4">
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
        </section>
      </div>
    </div>
  );
}
