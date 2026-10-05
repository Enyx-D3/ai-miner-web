import Link from "next/link";
import { ArrowRight, FileText, LifeBuoy, LockKeyhole, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type Kind = "privacy" | "terms" | "security" | "support";

const pages: Record<Kind, { eyebrow: string; title: string; intro: string; icon: typeof ShieldCheck; sections: Array<{ title: string; body: string }> }> = {
  privacy: {
    eyebrow: "Privacy",
    title: "Local-first memory with explicit outbound context.",
    intro: "This draft describes the current product architecture. Legal review is required before public paid launch.",
    icon: LockKeyhole,
    sections: [
      { title: "What stays local", body: "Imported AI history, reconstructed memory, Current Truth candidates, evidence, notebooks, and .B2M data live in the user's browser or device unless the user exports, syncs, or sends a bounded context package." },
      { title: "What may leave the device", body: "Context packages, provider handoffs, sync signaling metadata, billing metadata, auth metadata, diagnostics, and support messages may leave the device when those features are configured and used." },
      { title: "Exports and deletion", body: "Users can export .B2M memory and clear local browser/device data. Account deletion and provider revocation require the production auth/control-plane implementation before they can be marked complete." },
    ],
  },
  terms: {
    eyebrow: "Terms",
    title: "Use brain2:inContext as a continuity tool, not an authority substitute.",
    intro: "This draft is operational product language, not final legal advice. Legal review is required before paid launch.",
    icon: FileText,
    sections: [
      { title: "Product purpose", body: "brain2:inContext helps users preserve, inspect, search, and continue AI-assisted work from source-backed memory." },
      { title: "User responsibility", body: "Users remain responsible for reviewing generated context, provider outputs, and any decisions made from reconstructed memory." },
      { title: "Beta limits", body: "Closed beta may include unavailable runtimes, physical sync gates, provider-review limitations, and external service setup still marked in the release report." },
    ],
  },
  security: {
    eyebrow: "Security",
    title: "Truthful security boundaries for the release candidate.",
    intro: "Security claims here match implemented architecture and known blockers.",
    icon: ShieldCheck,
    sections: [
      { title: "Implemented protections", body: "The web app includes security headers, bounded sync request parsing, device-token sync APIs, hash-checked mutation/bootstrap protocols, local-first memory, and optional encrypted .B2M export." },
      { title: "Extension protections", body: "The browser extension uses exact-origin authorization, nonce handshakes, AES-GCM encrypted queue storage, stable dedupe IDs, and ACK-gated deletion." },
      { title: "Not yet production-complete", body: "Production auth, billing webhooks, per-user cloud tenancy, server-side entitlements, rate limits, and provider publication remain release blockers until configured and tested." },
    ],
  },
  support: {
    eyebrow: "Support",
    title: "Closed beta support path.",
    intro: "Use this page as the beta support placeholder until a real ticketing/contact channel is configured.",
    icon: LifeBuoy,
    sections: [
      { title: "For beta users", body: "Report the exact route, browser/device, import type, sync state, and whether the issue affects local memory, provider capture, MCP, billing, or Android sync." },
      { title: "Before sharing data", body: "Do not send raw AI-history archives through support unless an explicit secure support process exists. Prefer screenshots, logs with secrets removed, and exported diagnostics." },
      { title: "Production requirement", body: "A real support email or ticketing system must be configured before public launch." },
    ],
  },
};

export function Brain2TrustPage({ kind }: { kind: Kind }) {
  const page = pages[kind];
  const Icon = page.icon;
  return (
    <main className="bg-white">
      <section className="border-b bg-[linear-gradient(#fff,#fbfdff)]">
        <div className="mx-auto max-w-5xl px-6 py-16 lg:px-8">
          <div className="refinery-eyebrow">{page.eyebrow}</div>
          <h1 className="mt-4 max-w-4xl font-tight text-5xl font-black tracking-[-.05em]">{page.title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">{page.intro}</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-5xl gap-4 px-6 py-14 md:grid-cols-3 lg:px-8">
        {page.sections.map((section) => (
          <Card key={section.title} className="gap-0 py-0 shadow-none">
            <CardContent className="p-6">
              <Icon className="mb-6 size-5 text-[var(--blue)]" />
              <h2 className="font-tight text-lg font-extrabold">{section.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.body}</p>
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="mx-auto max-w-5xl px-6 pb-16 lg:px-8">
        <Link href="/docs" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--blue)]">
          Read product docs <ArrowRight className="size-4" />
        </Link>
      </section>
    </main>
  );
}
