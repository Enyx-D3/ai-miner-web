import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PortalButton } from "@/components/billing/BillingActions";

export default function SubscribePage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-4 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] text-[var(--blue)]">Access required</div>
      <h1 className="font-tight text-4xl font-black tracking-[-.04em] text-[#161329]">Subscription required</h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
        Your Google account is signed in, but this Brain2 product workspace requires an active paid entitlement. Access remains fail-closed until Stripe confirms payment by webhook.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild className="btn-blue rounded-xl font-bold"><Link href="/pricing">View plans</Link></Button>
        <PortalButton />
        <Button asChild variant="outline" className="rounded-xl font-bold"><Link href="/support">Contact support</Link></Button>
      </div>
    </main>
  );
}
