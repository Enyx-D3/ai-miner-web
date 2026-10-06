import Link from "next/link";
import { publicPlans } from "@/server/billing/core";
import { CheckoutButton } from "@/components/billing/BillingActions";

export default function CheckoutPage({ searchParams }: { searchParams?: Promise<{ canceled?: string }> }) {
  void searchParams;
  const plans = publicPlans();
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-tight text-4xl font-black tracking-[-.04em] text-[#161329]">Checkout</h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        Select a plan. If you are not signed in, checkout will ask you to sign in first.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.key} className="rounded-xl border bg-white p-5">
            <div className="font-tight text-lg font-black">{plan.name}</div>
            <div className="mt-1 text-2xl font-black text-[var(--blue)]">{plan.priceLabel}</div>
            <div className="mt-5"><CheckoutButton plan={plan} /></div>
          </div>
        ))}
      </div>
      <Link href="/pricing" className="mt-8 inline-block text-sm font-bold text-[var(--blue)]">Back to pricing</Link>
    </main>
  );
}
