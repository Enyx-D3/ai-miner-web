"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, ArrowLeft, BookOpen, BrainCircuit, CalendarDays, Cpu, Database, FlaskConical, FolderKanban, History,
  LayoutDashboard, Lightbulb, ListChecks, MessagesSquare, Network, NotebookTabs, Radio, Search, ShieldCheck, Target,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail,
} from "@/components/ui/sidebar";
import { getBrain2RuntimeAvailabilityHint, subscribeBrain2Transformers } from "@/lib/brain2/transformersRuntime";

const coreItems = [
  { title: "Home", url: "/dashboard", icon: LayoutDashboard },
  { title: "Ask / B2JOB", url: "/ask", icon: BrainCircuit },
  { title: "Search & Recall", url: "/search", icon: Search },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Live Notebooks", url: "/live-notebooks", icon: NotebookTabs },
  { title: "LifeWiki", url: "/wiki", icon: BookOpen },
  { title: "Conversations", url: "/conversations", icon: MessagesSquare },
  { title: "Timeline", url: "/timeline", icon: CalendarDays },
];

const intelligenceItems = [
  { title: "Things That Need You", url: "/ticks", icon: ListChecks },
  { title: "Decisions", url: "/decisions", icon: Target },
  { title: "Discover", url: "/discover", icon: Lightbulb },
  { title: "Patterns", url: "/patterns", icon: BrainCircuit },
  { title: "Experiments", url: "/experiments", icon: FlaskConical },
  { title: "Brain2Missions", url: "/missions", icon: History },
  { title: "Outputs & Reports", url: "/outputs", icon: ShieldCheck },
];

const systemItems = [
  { title: "Memory / .B2M", url: "/memory", icon: Database },
  { title: "Models", url: "/models", icon: Cpu },
  { title: "Devices & Sync", url: "/devices", icon: Network },
  { title: "Operations", url: "/operations", icon: Activity },
];

function MenuGroup({ label, items, pathname }: { label: string; items: typeof coreItems; pathname: string }) {
  return <SidebarGroup>
    <SidebarGroupLabel>{label}</SidebarGroupLabel>
    <SidebarGroupContent><SidebarMenu>{items.map((item) => {
      const active = pathname === item.url || (item.url === "/projects" && pathname.startsWith("/projects/"));
      return <SidebarMenuItem key={item.url}><SidebarMenuButton asChild isActive={active} className="font-semibold data-[active=true]:text-white"><Link href={item.url}><item.icon />{item.title}</Link></SidebarMenuButton></SidebarMenuItem>;
    })}</SidebarMenu></SidebarGroupContent>
  </SidebarGroup>;
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const [modelDownloaded,setModelDownloaded]=useState(()=>getBrain2RuntimeAvailabilityHint().hasCachedRuntime);
  useEffect(()=>subscribeBrain2Transformers(()=>setModelDownloaded(getBrain2RuntimeAvailabilityHint().hasCachedRuntime)),[]);
  const modelBadgeClass=modelDownloaded?"border-emerald-200 bg-emerald-50 text-emerald-700":"border-amber-200 bg-amber-50 text-amber-700";
  return <Sidebar {...props} className="border-r border-border bg-white/90">
    <SidebarHeader className="border-b border-border p-4"><Link href="/dashboard" className="flex items-center gap-2.5"><span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-blue-600 to-violet-600 font-tight text-xs font-black text-white shadow-[0_8px_22px_rgba(37,99,235,.2)]">B2</span><span className="leading-none"><span className="block font-tight text-xs font-extrabold tracking-[-.02em]">Brain2 Labs</span><span className="mt-1 block text-[9px] font-semibold text-muted-foreground">AI Miner · Mission Control</span></span></Link></SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupContent>
          <Link href="/models" className={`mx-2 mt-2 flex items-center gap-3 rounded-xl border p-3 ${modelBadgeClass}`}>
            <span className="flex size-8 items-center justify-center rounded-lg bg-white/70"><Cpu className="size-4"/></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[9px] font-black uppercase tracking-[.12em]">Model</span>
              <span className="block text-xs font-extrabold">{modelDownloaded?"Downloaded":"Not downloaded"}</span>
            </span>
            <Radio className="size-3.5"/>
          </Link>
        </SidebarGroupContent>
      </SidebarGroup>
      <MenuGroup label="Memory" items={coreItems} pathname={pathname}/><MenuGroup label="Intelligence" items={intelligenceItems} pathname={pathname}/><MenuGroup label="System" items={systemItems} pathname={pathname}/>
    </SidebarContent>
    <SidebarFooter className="border-t border-border p-3"><div className="mb-2 rounded-xl border border-blue-100 bg-white/75 p-3"><div className="text-[9px] font-black uppercase tracking-[.12em] text-cyan-600">Control room</div><div className="mt-1 text-[10px] leading-4 text-muted-foreground">Source-backed state. Unknown runtime signals stay unknown.</div></div><SidebarMenu><SidebarMenuItem><SidebarMenuButton asChild><Link href="/"><ArrowLeft />Back to site</Link></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarFooter><SidebarRail />
  </Sidebar>;
}
