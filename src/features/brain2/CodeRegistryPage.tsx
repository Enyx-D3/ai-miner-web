"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, Code2, Copy, FileCode2, Folder, FolderKanban, RefreshCw, ShieldCheck } from "lucide-react";
import { listCodeRecords, readCodeContent, type CodeRecord } from "@/lib/brain2/codeRegistry";
import { codeRecordTreePath, groupCodeByProject, type RegistryFolder, type RegistryProject } from "@/lib/brain2/codeRegistryTree";

function basename(path: string) {
  return path.split(/[\\/]/).pop() || "source.txt";
}

function FolderContents({ node, selectedId, select, depth = 0 }: {
  node: RegistryFolder; selectedId: string; select: (id: string) => void; depth?: number;
}) {
  return <div className={depth === 0 ? "pl-3" : "pl-4"}>
    {node.folders.map((directory) => <details key={directory.name} className="border-l border-slate-100">
      <summary className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Folder className="size-4 shrink-0 text-amber-600"/><span className="min-w-0 break-all">{directory.name}</span></summary>
      <FolderContents node={directory} selectedId={selectedId} select={select} depth={depth + 1}/>
    </details>)}
    {node.files.map((file) => file.records.length === 1 ? <button key={file.path} onClick={() => select(file.records[0].id)} title={file.path}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-blue-50 ${selectedId === file.records[0].id ? "bg-blue-50 font-bold text-blue-800" : "text-slate-700"}`}>
      <FileCode2 className="size-4 shrink-0 text-[var(--blue)]"/><span className="min-w-0 break-all">{file.name}</span>
    </button> : <details key={file.path} className="rounded-md">
      <summary className="flex cursor-pointer items-center gap-2 px-2 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50"><FileCode2 className="size-4 shrink-0 text-[var(--blue)]"/><span className="min-w-0 break-all">{file.name}</span><span className="shrink-0 text-[10px] text-muted-foreground">{file.records.length} versions</span></summary>
      <div className="border-l pl-4">{file.records.map((item, index) => <button key={item.id} onClick={() => select(item.id)}
        className={`block w-full rounded-md px-2 py-2 text-left text-xs hover:bg-blue-50 ${selectedId === item.id ? "bg-blue-50 font-bold text-blue-800" : "text-muted-foreground"}`}>
        <span className="block truncate">Source {index + 1} · {item.conversationTitle || "Conversation"}</span>
      </button>)}</div>
    </details>)}
  </div>;
}

function ProjectFolder({ group, initiallyOpen, selectedId, select }: {
  group: RegistryProject; initiallyOpen: boolean; selectedId: string; select: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(initiallyOpen);
  return <details open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)} className="border-b">
    <summary className="flex cursor-pointer items-center gap-2 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 hover:bg-blue-50"><FolderKanban className="size-4 shrink-0 text-[var(--blue)]"/><span className="min-w-0 flex-1 break-words">{group.name}</span><span className="shrink-0 text-[11px] text-muted-foreground">{group.count}</span></summary>
    {expanded && <div className="py-1 pr-2"><FolderContents node={group.root} selectedId={selectedId} select={select}/></div>}
  </details>;
}

export function CodeRegistryPage() {
  const [records, setRecords] = useState<CodeRecord[]>([]);
  const [query, setQuery] = useState("");
  const [project, setProject] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [codeCache, setCodeCache] = useState<{hash: string; content: string | null} | null>(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");

  async function refresh() {
    setBusy(true);
    try {
      const rows = await listCodeRecords();
      setRecords(rows);
      setSelectedId((current) => rows.some((item) => item.id === current) ? current : rows[0]?.id ?? "");
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally { setBusy(false); }
  }

  useEffect(() => {
    let active = true;
    void listCodeRecords().then((rows) => {
      if (!active) return;
      setRecords(rows);
      setSelectedId(rows[0]?.id ?? "");
    }).catch((error) => {
      if (active) setMessage(error instanceof Error ? error.message : String(error));
    }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, []);
  const projects = useMemo(() => [...new Set(records.map((item) => item.projectName))].sort(), [records]);
  const filtered = useMemo(() => {
    const needle = query.toLowerCase().trim();
    return records.filter((item) => (!project || item.projectName === project) &&
      (!needle || [item.fileName, item.projectName, item.language, item.conversationTitle, item.sourcePath, item.hash]
        .some((value) => value.toLowerCase().includes(needle))));
  }, [records, project, query]);
  const tree = useMemo(() => groupCodeByProject(filtered), [filtered]);
  const activeId = filtered.some((item) => item.id === selectedId) ? selectedId : filtered[0]?.id ?? "";
  const selected = records.find((item) => item.id === activeId) ?? null;
  const selectedPath = selected ? codeRecordTreePath(selected) : "";
  const selectedName = basename(selectedPath);
  const code = selected && codeCache?.hash === selected.hash ? codeCache.content : null;

  useEffect(() => {
    let active = true;
    if (!selected) return;
    void readCodeContent(selected.hash).then((value) => { if (active) setCodeCache({hash: selected.hash, content: value}); })
      .catch((error) => { if (active) setMessage(error instanceof Error ? error.message : String(error)); });
    return () => { active = false; };
  }, [selected]);

  const download = () => {
    if (!selected || code === null) return;
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = selectedName;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <main className="b2-workspace-view p-4 sm:p-6 lg:p-7">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[.16em] text-[var(--blue)]">Brain2 · Source Evidence</div>
        <h1 className="mt-1 text-2xl font-black">Code Registry</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Browse Project → folders → original filename. Paths come from attached source or explicit filenames in chat; unnamed code stays under Unidentified. Reimport an older history ZIP to recover newly supported filenames. Everything stays local and is never executed or published.</p>
      </div>
      <button onClick={() => void refresh()} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50"><RefreshCw className="size-4"/>{busy ? "Loading…" : "Refresh"}</button>
    </div>
    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border bg-white p-4"><div className="text-xs text-muted-foreground">Source records</div><b className="text-2xl">{records.length.toLocaleString()}</b></div>
      <div className="rounded-xl border bg-white p-4"><div className="text-xs text-muted-foreground">Project groups</div><b className="text-2xl">{projects.length}</b></div>
      <div className="rounded-xl border bg-white p-4"><div className="text-xs text-muted-foreground">Unique source hashes</div><b className="text-2xl">{new Set(records.map((item) => item.hash)).size.toLocaleString()}</b></div>
    </div>
    <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_220px]">
      <input aria-label="Search code registry" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search project, filename, language, conversation…" className="h-10 w-full rounded-lg border bg-white px-3 text-sm"/>
      <select aria-label="Filter project" value={project} onChange={(event) => setProject(event.target.value)} className="h-10 rounded-lg border bg-white px-3 text-sm"><option value="">All projects</option>{projects.map((name) => <option key={name}>{name}</option>)}</select>
    </div>
    {message && <p role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}
    {!busy && !records.length && <section className="rounded-xl border bg-white p-8 text-center"><Code2 className="mx-auto mb-3 size-8 text-[var(--blue)]"/><h2 className="font-bold">No source code indexed yet</h2><p className="mt-2 text-sm text-muted-foreground">Go to Memory, import a ChatGPT/Claude/Gemini history ZIP, and Code Registry will discover code automatically. No separate code upload is required.</p><Link href="/memory" className="mt-4 inline-block rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-bold text-white">Import AI history</Link></section>}
    {!!records.length && <div className="grid min-h-[560px] gap-4 lg:grid-cols-[minmax(260px,0.85fr)_minmax(0,1.6fr)]">
      <section className="max-h-[740px] overflow-y-auto rounded-xl border bg-white">
        <div className="sticky top-0 z-10 border-b bg-white px-4 py-3 text-xs font-bold text-muted-foreground">{filtered.length.toLocaleString()} source matches · {tree.length} project folders</div>
        {tree.map((group, index) => <ProjectFolder key={group.key} group={group} initiallyOpen={index === 0} selectedId={activeId} select={setSelectedId}/>)}
      </section>
      <section className="min-w-0 rounded-xl border bg-white">
        {!selected ? <div className="p-8 text-sm text-muted-foreground">Select a source file to view its content.</div> : <>
          <div className="border-b p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-all font-black">{selectedName}</h2><p className="mt-1 break-all text-xs text-muted-foreground">{selected.projectName} / {selectedPath} · {selected.language} · {selected.bytes.toLocaleString()} bytes</p></div>
              <div className="flex flex-wrap gap-2"><button disabled={code === null} onClick={() => { if (code !== null) void navigator.clipboard.writeText(code).then(() => setMessage("Source copied.")).catch(() => setMessage("Clipboard access denied.")); }} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50"><Copy className="size-3.5"/>Copy</button><button disabled={code === null} onClick={download} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50"><ArrowDownToLine className="size-3.5"/>Download</button></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]"><span className="rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-700"><ShieldCheck className="mr-1 inline size-3"/>{selected.origin === "CHAT_FENCE" ? "Extracted code block" : "Exact attached source"}</span><span className="rounded-md bg-[var(--secondary)] px-2 py-1">SHA-256 {selected.hash.slice(0,16)}…</span></div>
            <div className="mt-3 break-all text-[11px] leading-5 text-muted-foreground">Origin: {selected.conversationTitle || "No linked conversation"} ({selected.conversationExternalId || "unresolved"})<div>{selected.sourcePath ? `Original path: ${selected.sourcePath}` : `No original filename recorded · message: ${selected.sourceMessageId}`}</div></div>
          </div>
          <pre aria-label="Full source code" className="max-h-[590px] min-h-[300px] overflow-auto bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-100"><code>{code ?? "Loading source…"}</code></pre>
        </>}
      </section>
    </div>}
  </main>;
}
