"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

const routeMap: Record<string, string> = {
  landing: "/",
  upload: "/upload",
  "file-selected": "/upload/file-selected",
  "scan-processing": "/scan/processing",
  "scan-results": "/scan/results",
  checkout: "/checkout",
  "payment-success": "/checkout/success",
  processing: "/processing",
  "archive-complete": "/archive-complete",
  dashboard: "/dashboard",
  pricing: "/pricing",
  signin: "/login",
  "how-it-works": "/how-it-works",
  features: "/features",
  examples: "/examples",
  docs: "/docs",
  projects: "/projects",
  conversations: "/conversations",
  timeline: "/timeline",
  search: "/search",
  "project-detail": "/projects/go-to-market",
  "conversation-detail": "/conversations/example",
};

export function useRefineryNavigation() {
  const router = useRouter();
  return useCallback((page: string) => {
    router.push(routeMap[page] ?? page);
  }, [router]);
}
