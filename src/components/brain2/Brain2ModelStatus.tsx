"use client";

import { useEffect, useState } from "react";
import {
  getBrain2ResidualBudget,
  getBrain2RuntimeAvailabilityHint,
  BRAIN2_TRANSFORMERS_MODEL_ID,
  getBrain2TransformersSnapshot,
  preloadBrain2Transformers,
  retryBrain2Transformers,
  resetBrain2ResidualBudget,
  runBrain2MRSSelfTest,
  subscribeBrain2Transformers,
  type Brain2TransformersSnapshot,
} from "@/lib/brain2/transformersRuntime";

export function Brain2ModelStatus() {
  const [model, setModel] = useState<Brain2TransformersSnapshot>(() => getBrain2TransformersSnapshot());
  const [dismissed, setDismissed] = useState(false);
  const [hint] = useState(() => getBrain2RuntimeAvailabilityHint());

  useEffect(() => subscribeBrain2Transformers(setModel), []);

  const pct = Math.round(model.progress * 100);
  const ready = model.state === "READY";
  const loading = model.state === "LOADING" || model.state === "CHECKING";
  const failed = Boolean(model.error) || model.mrsState === "ERROR";
  const mrsActive=model.mrsState==="ACTIVE";
  const selfTesting=model.mrsState==="SELF_TESTING";
  const idle = model.state === "UNINITIALIZED" && model.mrsState === "INACTIVE";
  const budget = model.budget ?? getBrain2ResidualBudget();
  const coolingDown = Boolean(budget.coolingDownUntil && Date.parse(budget.coolingDownUntil) > Date.now());
  const coolUntil = budget.coolingDownUntil ? new Date(budget.coolingDownUntil).toLocaleTimeString() : undefined;
  const shouldRecommendDownload = idle && !hint.hasCachedRuntime;
  const shouldOfferCachedRestore = idle && hint.hasCachedRuntime;

  if(dismissed && ready)return null;
  if(dismissed && shouldRecommendDownload)return null;
  if(dismissed && shouldOfferCachedRestore)return null;

  if(shouldRecommendDownload){
    return <div className="fixed bottom-4 right-4 z-[2147483000] w-[min(28rem,calc(100vw-2rem))] rounded-3xl border bg-background p-4 shadow-2xl"><div className="flex items-start gap-3"><span className="mt-1 size-3 shrink-0 rounded-full bg-amber-500" aria-hidden="true" /><div className="min-w-0 flex-1"><div className="text-sm font-bold">Local MRS is optional</div><div className="mt-1 text-xs leading-5 text-muted-foreground">You can keep using Brain2 normally. Download the local Qwen model for optimal low-confidence residual handling.</div></div><button className="rounded-lg border px-2 py-1 text-xs" onClick={()=>setDismissed(true)}>Hide</button></div><div className="mt-3 flex flex-wrap gap-2"><button className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background" onClick={()=>void preloadBrain2Transformers().catch(()=>{})}>Download local MRS</button><button className="rounded-xl border px-4 py-2 text-sm font-semibold" onClick={()=>setDismissed(true)}>Later</button></div><div className="mt-3 text-[10px] text-muted-foreground">{BRAIN2_TRANSFORMERS_MODEL_ID}</div></div>;
  }
  if(shouldOfferCachedRestore){
    return <div className="fixed bottom-4 right-4 z-[2147483000] w-[min(28rem,calc(100vw-2rem))] rounded-3xl border bg-background p-4 shadow-2xl"><div className="flex items-start gap-3"><span className="mt-1 size-3 shrink-0 rounded-full bg-cyan-500" aria-hidden="true" /><div className="min-w-0 flex-1"><div className="text-sm font-bold">Cached local MRS is available</div><div className="mt-1 text-xs leading-5 text-muted-foreground">Brain2 found a previously downloaded local model. It will stay idle until you explicitly restore it or a later feature asks for it.</div></div><button className="rounded-lg border px-2 py-1 text-xs" onClick={()=>setDismissed(true)}>Hide</button></div><div className="mt-3 flex flex-wrap gap-2"><button className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background" onClick={()=>void preloadBrain2Transformers().catch(()=>{})}>Restore cached MRS</button><button className="rounded-xl border px-4 py-2 text-sm font-semibold" onClick={()=>setDismissed(true)}>Later</button></div><div className="mt-3 text-[10px] text-muted-foreground">{BRAIN2_TRANSFORMERS_MODEL_ID}</div></div>;
  }

  const modelLabel = ready
    ? model.cacheState==="READY_CACHED" ? "CACHED / READY" : "DOWNLOADED / READY"
    : failed ? "UNAVAILABLE"
    : model.cacheState==="CHECKING_CACHE" ? "CHECKING CACHE"
    : model.cacheState==="INITIALIZING_CACHE" ? "INITIALIZING CACHE"
    : `DOWNLOADING ${pct}%`;
  const mrsLabel = selfTesting ? "SELF-TESTING" : mrsActive ? "READY IN TAB" : failed||model.mrsState==="ERROR" ? "UNAVAILABLE" : model.activationMode==="AUTO_ON_DEMAND" ? "ON DEMAND" : "ACTIVATING";
  const progressLabel = model.cacheState==="DOWNLOADING" ? "Model download progress" : "Model initialization progress";

  return (
    <div className="fixed bottom-4 right-4 z-[2147483000] w-[min(32rem,calc(100vw-2rem))]" role="status" aria-live="polite" aria-label="Brain2 AI runtime activation">
      <div className="rounded-3xl border bg-background p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className={`mt-1 size-3 shrink-0 rounded-full ${ready&&mrsActive?"bg-emerald-500":failed?"bg-red-500":"animate-pulse bg-amber-500"}`} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="text-base font-bold">Brain2 AI Runtime</div>
            <div className="mt-1 text-sm text-muted-foreground">{model.text}</div>
          </div>
          <button className="rounded-lg border px-2 py-1 text-xs" onClick={()=>setDismissed(true)}>{ready?"Close":"Hide"}</button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl border p-3"><div className="text-muted-foreground">MODEL</div><div className="mt-1 font-semibold">{modelLabel}</div></div>
          <div className="rounded-xl border p-3"><div className="text-muted-foreground">MRS</div><div className="mt-1 font-semibold">{mrsLabel}</div></div>
        </div>

        {loading && <div className="mt-4"><div className="mb-1 flex justify-between text-xs"><span>{progressLabel}</span><span className="font-mono">{pct}%</span></div><div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full bg-foreground transition-[width] duration-300" style={{width:`${Math.max(1,pct)}%`}} /></div></div>}

        <div className="mt-3 rounded-xl bg-muted/60 p-3 text-xs leading-5">
          <div>{model.detail ?? "Preparing browser AI runtime…"}</div>
          {model.backend && <div className="mt-1 text-muted-foreground">Backend: Transformers.js / {model.backend?.toUpperCase()} · {model.dtype}</div>}
          {mrsActive && <div className="mt-1 text-muted-foreground">This confirms local MRS inference works in this tab. Wiki and notebook screens only show MRS as attached after a project review actually completes.</div>}
        </div>

        <div className="mt-3 break-all font-mono text-[10px] text-muted-foreground">{BRAIN2_TRANSFORMERS_MODEL_ID}</div>
        {model.error && <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-600">{model.error}</div>}
        {model.lastSelfTest && <div className={`mt-3 rounded-xl border p-3 text-xs ${model.lastSelfTest.ok?"border-emerald-500/30":"border-red-500/30"}`}><strong>MRS self-test:</strong> {model.lastSelfTest.ok?"PASS":"FAIL"}<div className="mt-1 font-mono text-[10px]">{model.lastSelfTest.text}</div></div>}
        <div className="mt-3 rounded-xl border p-3 text-xs"><div className="font-semibold">Residual budget</div><div className="mt-1 text-muted-foreground">{budget.residualCalls}/{budget.residualLimit} residual calls used in this tab session.</div>{coolingDown&&<div className="mt-2 text-amber-700">Cooling down after memory pressure until {coolUntil}.</div>}</div>

        <div className="mt-4 flex flex-wrap gap-2">
          {failed && <button className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background" onClick={()=>void retryBrain2Transformers().catch(()=>{})}>Retry model download</button>}
          {!ready && !failed && <button className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background" onClick={()=>void preloadBrain2Transformers().catch(()=>{})}>{hint.hasCachedRuntime?"Restore cached MRS":"Enable local MRS"}</button>}
          {ready && <button className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-50" disabled={selfTesting} onClick={()=>void runBrain2MRSSelfTest()}>{selfTesting?"Running MRS self-test…":"Run MRS self-test"}</button>}
          {ready && <button className="rounded-xl border px-4 py-2 text-sm font-semibold" onClick={()=>void retryBrain2Transformers().catch(()=>{})}>Reload model</button>}
          <button className="rounded-xl border px-4 py-2 text-sm font-semibold" onClick={()=>{resetBrain2ResidualBudget();}}>Reset residual budget</button>
        </div>

        {!ready && !failed && <div className="mt-4 text-xs text-muted-foreground">{hint.hasCachedRuntime?"Brain2 found a downloaded local model, but it stays idle until you explicitly restore it.":"Local MRS is optional. You can continue working now and download the model later for better residual results."}</div>}
      </div>
    </div>
  );
}
