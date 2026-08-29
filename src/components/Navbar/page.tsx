"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  { label: "Product", href: "/" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Features", href: "/features" },
  { label: "Docs", href: "/docs" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur">
    <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 lg:px-8">
      <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}><span className="flex size-7 items-center justify-center rounded-full bg-[var(--blue)] font-tight text-[10px] font-black text-white">B2</span><span className="leading-none"><span className="block font-tight text-[13px] font-extrabold tracking-[-0.02em]">Brain2 Labs</span><span className="mt-0.5 block text-[7px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Brain2 AI Miner</span></span></Link>
      <nav className="hidden items-center lg:flex">{links.map(link => { const active=link.href==="/"?pathname==="/":pathname.startsWith(link.href); return <Button key={link.href} asChild variant="ghost" size="sm" className={active?"text-[var(--blue)]":"text-[var(--secondary-text)]"}><Link href={link.href}>{link.label}</Link></Button>; })}</nav>
      <div className="hidden items-center gap-2 lg:flex"><Button asChild variant="ghost" size="sm"><Link href="/memory">Import history</Link></Button><Button asChild size="sm" className="btn-blue rounded-lg px-4"><Link href="/dashboard">Open AI Miner</Link></Button></div>
      <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setOpen(v=>!v)} aria-label="Toggle menu">{open?<X/>:<Menu/>}</Button>
    </div>
    {open&&<div className="border-t border-border bg-white px-5 py-4 lg:hidden"><nav className="flex flex-col gap-1">{links.map(link=><Button key={link.href} asChild variant="ghost" className="justify-start" onClick={()=>setOpen(false)}><Link href={link.href}>{link.label}</Link></Button>)}<div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-3"><Button asChild variant="outline" onClick={()=>setOpen(false)}><Link href="/memory">Import</Link></Button><Button asChild className="btn-blue" onClick={()=>setOpen(false)}><Link href="/dashboard">Open AI Miner</Link></Button></div></nav></div>}
  </header>;
}
