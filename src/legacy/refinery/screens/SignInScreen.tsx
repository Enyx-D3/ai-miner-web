"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { useSocialAuthMutation } from "@/redux/api/authApi";
import { setRefreshToken, setUser } from "@/redux/features/authSlice";
import { useAppDispatch } from "@/redux/hooks";

interface SignInScreenProps { onNavigate: (page: string) => void; }

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
          initialize: (options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: { theme: "outline"; size: "large"; width: number; text: "signin_with"; locale: "en" },
          ) => void;
        };
      };
    };
  }
}

const getAccessToken = (data: SocialAuthResponse): string | undefined =>
  data.token ?? data.access ?? data.accessToken ?? data.data?.token ?? data.data?.access ?? data.data?.accessToken;

const getRefreshToken = (data: SocialAuthResponse): string | undefined =>
  data.refresh_token ?? data.refresh ?? data.refreshToken ?? data.data?.refresh_token ?? data.data?.refresh ?? data.data?.refreshToken;

export default function SignInScreen({ onNavigate }: SignInScreenProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [socialAuth, { isLoading }] = useSocialAuthMutation();
  const dispatch = useAppDispatch();
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

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
          onNavigate("dashboard");
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
  }, [dispatch, googleClientId, onNavigate, scriptReady, socialAuth]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-6">
      <Script src="https://accounts.google.com/gsi/client?hl=en" strategy="afterInteractive" onLoad={() => setScriptReady(true)} />
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-[var(--pink)] font-tight text-lg font-bold text-white">B2</div>
          <div className="text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">Brain2 Labs</div>
          <div className="mb-3 mt-1 text-[11px] font-bold uppercase tracking-[.16em] text-[var(--pink)]">Brain2 AI Miner</div>
          <h1 className="font-tight text-[28px] font-extrabold tracking-[-.03em]">Welcome back.</h1>
        </div>

        <div className="rounded-2xl border bg-white p-8 shadow-[0_8px_24px_rgba(20,25,50,.06)]">
          {googleClientId ? (
            <div className="flex min-h-10 w-full justify-center opacity-100 transition-opacity data-[loading=true]:opacity-60" data-loading={isLoading}>
              <div ref={buttonRef} className="w-full" />
            </div>
          ) : (
            <Button disabled className="h-12 w-full rounded-xl font-bold">Google sign-in unavailable</Button>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">Don&apos;t have an account?</p>
          <Button variant="ghost" size="auto" className="mt-2 text-sm font-bold text-[var(--pink)]" onClick={() => onNavigate("upload")}>Start Free Scan →</Button>
        </div>
      </div>
    </div>
  );
}