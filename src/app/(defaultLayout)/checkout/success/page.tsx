import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CheckoutSuccessPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-4 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] text-[var(--blue)]">Payment submitted</div>
      <h1 className="font-tight text-4xl font-black tracking-[-.04em] text-[#161329]">Waiting for Stripe verification.</h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        This page never unlocks access by itself. Brain2 unlocks after the verified Stripe webhook writes your active entitlement.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild className="btn-blue rounded-xl font-bold"><Link href="/dashboard">Try dashboard</Link></Button>
        <Button asChild variant="outline" className="rounded-xl font-bold"><Link href="/subscribe">Check status</Link></Button>
      </div>
    </main>
  );
}
