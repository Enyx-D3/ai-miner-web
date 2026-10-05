"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { compileB2Job } from "@/lib/brain2/jobs";
import {
  buildGlobalContextHandoffReceipt,
  buildGlobalContextPackage,
  buildGlobalContextResumeCapsule,
  findAntiReinvention,
  renderGlobalContextOutbound,
  type AntiReinventionHit,
  type GlobalContextPackage,
  type GlobalContextResumeCapsule,
} from "@/lib/brain2/globalContext";
import { addTransaction, recordDatabox, useBrain2Snapshot } from "@/lib/brain2/store";

export function GlobalContextContinuePage() {
  const snapshot = useBrain2Snapshot();
  const projects = useMemo(
    () => [...snapshot.projects].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),
    [snapshot.projects],
  );
  const [projectId,setProjectId]=useState(projects[0]?.id ?? "");
  const [task,setTask]=useState("");
  const [destination,setDestination]=useState<"chatgpt"|"claude"|"gemini"|"manual">("chatgpt");
  const [capsule,setCapsule]=useState<GlobalContextResumeCapsule|null>(null);
  const [pkg,setPkg]=useState<GlobalContextPackage|null>(null);
  const [anti,setAnti]=useState<AntiReinventionHit[]>([]);
  const [outbound,setOutbound]=useState("");
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    if(!projectId&&projects[0])setProjectId(projects[0].id);
  },[projectId,projects]);

  useEffect(()=>{
    if(!pkg||!outbound){
      window.postMessage({type:"BRAIN2_CONTEXT_PREVIEW_CLEAR"},window.location.origin);
      return;
    }
    window.postMessage({
      type:"BRAIN2_CONTEXT_PREVIEW",
      preview:{
        projectId:pkg.projectId,
        projectName:pkg.projectName,
        task:pkg.task,
        packageHash:pkg.packageHash,
        currentTruthCount:pkg.resumeCapsule.currentTruth.length,
        openTickCount:pkg.resumeCapsule.openTicks.length,
        knownFailureCount:pkg.resumeCapsule.knownFailures.length,
        evidenceCount:pkg.compilerSupplement?.evidenceIds.length??pkg.resumeCapsule.evidenceRefs.length,
        outbound,
        generatedAt:pkg.generatedAt,
      },
    },window.location.origin);
    return()=>window.postMessage({type:"BRAIN2_CONTEXT_PREVIEW_CLEAR"},window.location.origin);
  },[pkg,outbound]);

  const compile=async()=>{
    const project=projects.find((item)=>item.id===projectId);
    if(!project||!task.trim())return;
    setBusy(true);
    try{
      const resume=await buildGlobalContextResumeCapsule(snapshot,project.id);
      const hits=findAntiReinvention(snapshot,task,project.id,6);
      const job=await compileB2Job(snapshot,task,project.id,24);
      await recordDatabox(job.databox);
      await addTransaction("B2JOB",JSON.stringify(job),project.id);
      const next=await buildGlobalContextPackage(snapshot,task,project.id,job);
      const text=renderGlobalContextOutbound(next);
      setCapsule(resume);setAnti(hits);setPkg(next);setOutbound(text);
      toast.success(`Bounded context ready · ${job.evidence.length} selected evidence items`);
    }catch(error){toast.error(error instanceof Error?error.message:String(error));}
    finally{setBusy(false);}
  };

  const approveAndCopy=async()=>{
    if(!pkg||!outbound)return;
    const receipt=await buildGlobalContextHandoffReceipt({pkg,outbound,destination,sourceSurface:"web"});
    await addTransaction("B2REQUEST",JSON.stringify(receipt),pkg.projectId);
    await navigator.clipboard.writeText(outbound);
    toast.success(`Approved bounded context copied for ${destination}`);
  };

  return <div className="b2-workspace-view p-4 sm:p-6 lg:p-7">
    <div className="b2-page-head mb-5">
      <div className="b2-kicker">brain2:inContext · Continue</div>
      <h1 className="font-tight mt-2 text-3xl font-black tracking-[-.04em]">Resume a project without rereading the universe</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--secondary-text)]">Compile the smallest source-backed continuation capsule, surface previous work before reinvention, preview exactly what leaves this device, then explicitly approve the handoff.</p>
    </div>

    <div className="grid gap-5 xl:grid-cols-[.78fr_1.22fr]">
      <Card className="h-fit gap-0 py-0 shadow-none">
        <CardHeader className="border-b"><CardTitle className="font-tight">Resume & handoff</CardTitle></CardHeader>
        <CardContent className="space-y-4 p-5">
          <label className="block text-xs font-bold">Project
            <select value={projectId} onChange={(e)=>setProjectId(e.target.value)} className="mt-2 h-10 w-full rounded-md border bg-white px-3 text-sm font-normal">
              {projects.map((project)=><option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold">What are you continuing?
            <Textarea value={task} onChange={(e)=>setTask(e.target.value)} placeholder="e.g. Continue the implementation from the last verified checkpoint" className="mt-2 min-h-28"/>
          </label>
          <label className="block text-xs font-bold">Destination
            <select value={destination} onChange={(e)=>setDestination(e.target.value as typeof destination)} className="mt-2 h-10 w-full rounded-md border bg-white px-3 text-sm font-normal">
              <option value="chatgpt">ChatGPT</option><option value="claude">Claude</option><option value="gemini">Gemini</option><option value="manual">Manual / other AI</option>
            </select>
          </label>
          <Button className="btn-blue w-full" disabled={busy||!projectId||!task.trim()} onClick={compile}><RotateCcw className="size-4"/>{busy?"Compiling…":"Build bounded continuation"}</Button>
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs leading-5 text-blue-950"><b>Private by default.</b> This flow never injects the full archive. It compiles a bounded B2JOB/Databox supplement and requires an explicit copy action before anything leaves the app.</div>
        </CardContent>
      </Card>

      <div className="space-y-5">
        {capsule&&<Card className="gap-0 py-0 shadow-none"><CardHeader className="border-b"><div className="flex items-center gap-2"><CardTitle className="font-tight">Resume Capsule</CardTitle><span className="ml-auto font-mono text-[9px] text-muted-foreground">{capsule.capsuleHash.slice(0,16)}</span></div></CardHeader><CardContent className="space-y-3 p-5"><div><div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Current goal</div><p className="mt-1 text-sm font-bold">{capsule.goal}</p></div><div><div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Exact next action</div><p className="mt-1 text-sm">{capsule.nextAction.text}</p></div><div className="grid grid-cols-3 gap-2">{[["Current truth",capsule.currentTruth.length],["Open ticks",capsule.openTicks.length],["Known failures",capsule.knownFailures.length]].map(([label,value])=><div key={label} className="rounded-xl bg-[var(--secondary)] p-3 text-center"><b className="font-tight text-xl">{value}</b><div className="text-[9px] uppercase text-muted-foreground">{label}</div></div>)}</div></CardContent></Card>}

        {anti.length>0&&<Card className="gap-0 py-0 shadow-none"><CardHeader className="border-b"><div className="flex items-center gap-2"><Sparkles className="size-4 text-[var(--blue)]"/><CardTitle className="font-tight">Anti-Reinvention</CardTitle></div></CardHeader><CardContent className="space-y-2 p-4">{anti.map((hit)=><div key={hit.id} className="rounded-xl border p-3"><div className="flex items-center gap-2"><b className="text-xs">{hit.title}</b><span className="ml-auto text-[9px] font-black text-[var(--blue)]">{hit.action}</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{hit.detail}</p></div>)}</CardContent></Card>}

        {pkg&&<Card className="gap-0 py-0 shadow-none"><CardHeader className="border-b"><div className="flex items-center gap-2"><ShieldCheck className="size-4 text-emerald-600"/><CardTitle className="font-tight">Inspect before send</CardTitle><span className="ml-auto font-mono text-[9px] text-muted-foreground">{pkg.packageHash.slice(0,16)}</span></div></CardHeader><CardContent className="space-y-4 p-5"><pre className="max-h-[430px] overflow-auto whitespace-pre-wrap rounded-xl bg-[var(--secondary)] p-4 text-[11px] leading-5">{outbound}</pre><Button className="btn-blue w-full" onClick={approveAndCopy}><Copy className="size-4"/>Approve & copy selected context</Button><p className="text-[10px] leading-4 text-muted-foreground">Approval records the package hash + exact outbound hash. Returned model output remains a proposal until provenance verification passes.</p></CardContent></Card>}
      </div>
    </div>
  </div>;
}
