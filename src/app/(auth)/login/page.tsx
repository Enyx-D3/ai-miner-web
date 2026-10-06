"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

function internalCallback(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export default function Page() {
  const searchParams = useSearchParams();
  const callbackUrl = internalCallback(searchParams.get("callbackUrl"));
  const error = searchParams.get("error");
  const href = `/api/v1/auth/google?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary px-6">
      <section className="w-full max-w-sm rounded-2xl border bg-white p-8 text-center shadow-[0_8px_24px_rgba(20,25,50,.06)]">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-[var(--blue)] font-tight text-lg font-bold text-white">b2</div>
        <div className="text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">Brain2 Labs</div>
        <div className="mb-3 mt-1 text-[11px] font-bold uppercase tracking-[.16em] text-[var(--blue)]">brain2:inContext</div>
        <h1 className="font-tight text-[28px] font-extrabold tracking-[-.03em]">Sign in securely.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Use Google to create or load your Brain2 account. Paid access is checked after sign-in.
        </p>
        {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-left text-xs font-semibold text-red-700">{error.replace(/_/g, " ")}</p> : null}
        <Button asChild className="btn-blue mt-6 h-11 w-full rounded-xl font-bold">
          <a href={href}>Continue with Google</a>
        </Button>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Password login and local demo access are disabled for production safety.
        </p>
      </section>
    </main>
  );
}
