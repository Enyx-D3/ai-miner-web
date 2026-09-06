"use client";

export type Brain2DesktopCompanionEnsureResult = {
  ok: boolean;
  started?: boolean;
  detail?: string;
};

export type Brain2DesktopCompanionBridge = {
  ensureMRSCompanion(input: {
    host: string;
    port: number;
    modelId: string;
  }): Promise<Brain2DesktopCompanionEnsureResult>;
};

declare global {
  interface Window {
    aiMinerDesktop?: Brain2DesktopCompanionBridge;
  }
}

export function getBrain2DesktopCompanionBridge() {
  if (typeof window === "undefined") return undefined;
  return window.aiMinerDesktop;
}
