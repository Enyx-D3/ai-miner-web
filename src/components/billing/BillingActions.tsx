"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Plan = {
  key: string;
  name: string;
  priceLabel: string;
  mode: string;
  configured: boolean;
};

export function CheckoutButton({ plan }: { plan: Plan }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function startCheckout() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v1/billing/checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: plan.key }),
      });
      const data = await response.json().catch(() => ({})) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Checkout unavailable");
      window.location.assign(data.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Checkout unavailable");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button className="btn-blue h-11 w-full rounded-xl font-bold" disabled={!plan.configured || busy} onClick={startCheckout}>
        {busy ? "Opening checkout..." : plan.mode === "payment" ? "Buy lifetime" : "Subscribe"}
      </Button>
      {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}
      {!plan.configured ? <p className="text-xs text-muted-foreground">Stripe price not configured.</p> : null}
    </div>
  );
}

export function PortalButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function openPortal() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v1/billing/portal", { method: "POST", credentials: "same-origin" });
      const data = await response.json().catch(() => ({})) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Billing portal unavailable");
      window.location.assign(data.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Billing portal unavailable");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" className="rounded-xl font-bold" disabled={busy} onClick={openPortal}>
        {busy ? "Opening..." : "Manage billing"}
      </Button>
      {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}
