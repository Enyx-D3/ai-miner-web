"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, CheckCircle2, LoaderCircle, TriangleAlert } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function statusTone(ready:boolean, failed:boolean){
  if(failed)return {dot:"bg-red-500",text:"text-red-600",icon:TriangleAlert};
  if(ready)return {dot:"bg-emerald-500",text:"text-emerald-600",icon:CheckCircle2};
  return {dot:"bg-amber-500",text:"text-amber-700",icon:LoaderCircle};
}

export function Brain2ModelPanel() {
  const [model, setModel] = useState<Brain2TransformersSnapshot>(() => getBrain2TransformersSnapshot());
  const hint = getBrain2RuntimeAvailabilityHint();

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
  const tone=statusTone(ready&&mrsActive,failed);
  const ToneIcon=tone.icon;
  const modelLabel = ready
    ? model.cacheState==="READY_CACHED" ? "CACHED / READY" : "DOWNLOADED / READY"
    : failed ? "UNAVAILABLE"
    : model.cacheState==="CHECKING_CACHE" ? "CHECKING CACHE"
    : model.cacheState==="INITIALIZING_CACHE" ? "INITIALIZING CACHE"
    : `DOWNLOADING ${pct}%`;
  const mrsLabel = selfTesting ? "SELF-TESTING" : mrsActive ? "READY IN WORKER" : failed||model.mrsState==="ERROR" ? "UNAVAILABLE" : model.activationMode==="AUTO_ON_DEMAND" ? "ON DEMAND" : "ACTIVATING";
  const progressLabel = model.cacheState==="DOWNLOADING" ? "Model download progress" : "Model initialization progress";

  return (
    <div className="b2-workspace-view p-4 sm:p-6 lg:p-7">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="refinery-eyebrow mb-2">Browser MRS Runtime</div>
          <h1 className="font-tight text-3xl font-extrabold tracking-[-.035em] text-[var(--navy)]">Models</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--secondary-text)]">Brain2 uses a browser-worker model lane so deterministic intelligence stays first and MRS work runs off the main UI thread. Downloads initialize automatically after completion and cached models restore in the background on later visits.</p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black ${ready&&mrsActive?"border-emerald-200 bg-emerald-50 text-emerald-700":failed?"border-red-200 bg-red-50 text-red-600":"border-amber-200 bg-amber-50 text-amber-700"}`}>
          <span className={`size-2.5 rounded-full ${tone.dot}`}/>
          {ready&&mrsActive?"MODEL ACTIVE":failed?"MODEL NEEDS ATTENTION":"MODEL PREPARING"}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className="border-b">
            <div className="flex items-start gap-3">
              <span className={`mt-1 flex size-10 items-center justify-center rounded-2xl ${ready&&mrsActive?"bg-emerald-50 text-emerald-600":failed?"bg-red-50 text-red-600":"bg-amber-50 text-amber-700"}`}>
                <ToneIcon className={`size-5 ${!ready&&!failed?"animate-spin":""}`}/>
              </span>
              <div className="min-w-0 flex-1">
                <CardTitle className="font-tight text-xl">Granite Browser Runtime</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{model.text}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border p-3"><div className="text-muted-foreground">MODEL</div><div className="mt-1 font-semibold">{modelLabel}</div></div>
              <div className="rounded-xl border p-3"><div className="text-muted-foreground">MRS</div><div className="mt-1 font-semibold">{mrsLabel}</div></div>
            </div>

            {loading && <div><div className="mb-1 flex justify-between text-xs"><span>{progressLabel}</span><span className="font-mono">{pct}%</span></div><div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full bg-foreground transition-[width] duration-300" style={{width:`${Math.max(1,pct)}%`}} /></div></div>}

            <div className="rounded-xl bg-muted/60 p-4 text-sm leading-6">
              <div>{model.detail ?? "Preparing browser AI runtime…"}</div>
              <div className="mt-2 text-xs text-muted-foreground">Backend: Browser worker · Transformers.js / WASM {model.dtype?`· ${model.dtype}`:""}</div>
              <div className="mt-2 text-xs text-muted-foreground">Model: {BRAIN2_TRANSFORMERS_MODEL_ID}</div>
            </div>

            {shouldRecommendDownload && <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-4 text-sm"><div className="font-semibold text-[var(--navy)]">Local browser model is not downloaded yet.</div><p className="mt-1 text-xs leading-5 text-muted-foreground">Download once and Brain2 will initialize it automatically. Later visits restore it quietly from cache when the page is idle enough.</p></div>}
            {shouldOfferCachedRestore && <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-4 text-sm"><div className="font-semibold text-[var(--navy)]">Cached browser model detected.</div><p className="mt-1 text-xs leading-5 text-muted-foreground">Brain2 will auto-restore it in the background. You can also force restore immediately from this page.</p></div>}
            {model.error && <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-600">{model.error}</div>}
            {model.lastSelfTest && <div className={`rounded-xl border p-3 text-xs ${model.lastSelfTest.ok?"border-emerald-500/30":"border-red-500/30"}`}><strong>MRS self-test:</strong> {model.lastSelfTest.ok?"PASS":"FAIL"}<div className="mt-1 font-mono text-[10px]">{model.lastSelfTest.text}</div></div>}

            <div className="flex flex-wrap gap-2">
              {failed && <Button className="btn-blue" onClick={()=>void retryBrain2Transformers().catch(()=>{})}>Retry browser MRS</Button>}
              {!ready && !failed && <Button className="btn-blue" onClick={()=>void preloadBrain2Transformers().catch(()=>{})}>{hint.hasCachedRuntime?"Restore cached MRS":"Download & initialize model"}</Button>}
              {ready && <Button className="btn-blue" disabled={selfTesting} onClick={()=>void runBrain2MRSSelfTest()}>{selfTesting?"Running MRS self-test…":"Run MRS self-test"}</Button>}
              {ready && <Button variant="outline" onClick={()=>void retryBrain2Transformers().catch(()=>{})}>Reload model</Button>}
              <Button variant="outline" onClick={()=>{resetBrain2ResidualBudget();}}>Reset residual budget</Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="gap-0 py-0 shadow-none">
            <CardHeader className="border-b">
              <CardTitle className="font-tight text-base">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-5 text-sm leading-6 text-[var(--secondary-text)]">
              <div className="flex gap-3"><span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--blue-soft)] text-[var(--blue)]">1</span><div><b>Deterministic first</b><br/>Truth, ranking, grouping, and project intelligence stay on deterministic lanes first.</div></div>
              <div className="flex gap-3"><span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--blue-soft)] text-[var(--blue)]">2</span><div><b>Worker-backed MRS</b><br/>When semantic review or residual reasoning is needed, Brain2 runs the model in a browser worker instead of the visible UI thread.</div></div>
              <div className="flex gap-3"><span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--blue-soft)] text-[var(--blue)]">3</span><div><b>Auto-initialize after download</b><br/>Once the model finishes downloading, Brain2 immediately initializes and verifies it automatically. No separate restore step is required.</div></div>
              <div className="flex gap-3"><span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--blue-soft)] text-[var(--blue)]">4</span><div><b>Background restore later</b><br/>On later page loads, cached models warm back up quietly when the page is idle enough.</div></div>
            </CardContent>
          </Card>

          <Card className="gap-0 py-0 shadow-none">
            <CardHeader className="border-b">
              <CardTitle className="font-tight text-base">Session Budget</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-5 text-sm">
              <div className="rounded-xl border p-4">
                <div className="text-xs text-muted-foreground">Residual calls used</div>
                <div className="mt-1 font-tight text-2xl font-black">{budget.residualCalls}/{budget.residualLimit}</div>
              </div>
              {coolingDown && <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">Cooling down after memory pressure until {coolUntil}.</div>}
              {!coolingDown && <div className="rounded-xl border bg-[var(--secondary)] p-3 text-xs text-muted-foreground">Budget and cooldown stay per tab session so one runaway residual pass does not keep freezing the page.</div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function Brain2ModelStatus() {
  return null;
}
