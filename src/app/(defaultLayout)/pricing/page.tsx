import Link from "next/link";
import { CheckoutButton } from "@/components/billing/BillingActions";
import { publicPlans } from "@/server/billing/core";

export default function PricingPage() {
  const plans = publicPlans();
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="max-w-2xl">
        <div className="mb-3 text-[10px] font-black uppercase tracking-[.16em] text-[var(--blue)]">brain2:inContext</div>
        <h1 className="font-tight text-4xl font-black tracking-[-.04em] text-[#161329]">Choose access.</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Private AI continuity for ChatGPT, Claude, Gemini, and your Brain2 workspace. Checkout unlocks only after Stripe confirms payment by webhook.
        </p>
      </div>
      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <article key={plan.key} className="rounded-xl border bg-white p-6 shadow-[0_8px_24px_rgba(20,25,50,.06)]">
            <h2 className="font-tight text-xl font-black text-[#161329]">{plan.name}</h2>
            <p className="mt-2 text-3xl font-black text-[var(--blue)]">{plan.priceLabel}</p>
            <p className="mt-4 min-h-16 text-sm leading-6 text-muted-foreground">
              {plan.key === "founder_lifetime" ? "One-time verified lifetime license." : "Recurring paid entitlement with access through the paid period."}
            </p>
            <div className="mt-6"><CheckoutButton plan={plan} /></div>
          </article>
        ))}
      </section>
      <p className="mt-8 text-sm text-muted-foreground">
        Already paid? <Link className="font-bold text-[var(--blue)]" href="/subscribe">Check billing status</Link>.
      </p>
    </main>
  );
}
