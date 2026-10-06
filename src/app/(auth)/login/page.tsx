"use client";

import Script from "next/script";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSocialAuthMutation } from "@/redux/api/authApi";
import { setRefreshToken, setUser } from "@/redux/features/authSlice";
import { useAppDispatch } from "@/redux/hooks";

type GoogleCredentialResponse = { credential?: string };
type SocialAuthResponse = {
  token?: string;
  access?: string;
  accessToken?: string;
  refresh?: string;
  refresh_token?: string;
  refreshToken?: string;
  data?: SocialAuthResponse;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
          renderButton: (parent: HTMLElement, options: { theme: "outline"; size: "large"; width: number; text: "signin_with"; locale: "en" }) => void;
        };
      };
    };
  }
}

const getAccessToken = (data: SocialAuthResponse): string | undefined =>
  data.token ?? data.access ?? data.accessToken ?? data.data?.token ?? data.data?.access ?? data.data?.accessToken;

const getRefreshToken = (data: SocialAuthResponse): string | undefined =>
  data.refresh_token ?? data.refresh ?? data.refreshToken ?? data.data?.refresh_token ?? data.data?.refresh ?? data.data?.refreshToken;

export default function Page() {
  const buttonRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [socialAuth, { isLoading }] = useSocialAuthMutation();
  const dispatch = useAppDispatch();
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  function goApp() {
    window.location.assign(callbackUrl);
  }

  useEffect(() => {
    if (!scriptReady || !googleClientId || !buttonRef.current || !window.google) return;

    buttonRef.current.innerHTML = "";
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: async ({ credential }) => {
        if (!credential) return;
        try {
          const result = await socialAuth({ provider: "google", credential }).unwrap() as SocialAuthResponse;
          const token = getAccessToken(result);
          const refreshToken = getRefreshToken(result);
          if (token) dispatch(setUser({ token }));
          if (refreshToken) dispatch(setRefreshToken({ refresh_token: refreshToken }));
          goApp();
        } catch {
          toast.error("Google sign-in failed");
        }
      },
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      width: Math.min(320, buttonRef.current.clientWidth || 320),
      text: "signin_with",
      locale: "en",
    });
  }, [dispatch, googleClientId, scriptReady, socialAuth]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/local-auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) throw new Error("Invalid email or password");
      goApp();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary px-6">
      {googleClientId ? <Script src="https://accounts.google.com/gsi/client?hl=en" strategy="afterInteractive" onLoad={() => setScriptReady(true)} /> : null}
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border bg-white p-8 shadow-[0_8px_24px_rgba(20,25,50,.06)]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-[var(--blue)] font-tight text-lg font-bold text-white">b2</div>
          <div className="text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">Brain2 Labs</div>
          <div className="mb-3 mt-1 text-[11px] font-bold uppercase tracking-[.16em] text-[var(--blue)]">brain2:inContext</div>
          <h1 className="font-tight text-[28px] font-extrabold tracking-[-.03em]">Welcome back.</h1>
        </div>

        <label className="block text-xs font-bold text-muted-foreground">
          Email
          <Input className="mt-2" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label className="mt-4 block text-xs font-bold text-muted-foreground">
          Password
          <Input className="mt-2" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>

        <Button type="submit" className="btn-blue mt-6 h-11 w-full rounded-xl font-bold" disabled={busy}>
          {busy ? "Signing in..." : "Sign in"}
        </Button>

        <div className="my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        {googleClientId ? (
          <div className="flex min-h-10 w-full justify-center opacity-100 transition-opacity data-[loading=true]:opacity-60" data-loading={isLoading}>
            <div ref={buttonRef} className="w-full" />
          </div>
        ) : (
          <Button type="button" disabled variant="outline" className="h-11 w-full rounded-xl font-bold">Google sign-in unavailable</Button>
        )}
      </form>
    </main>
  );
}
