"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function DocsScreen({ onNavigate }: { onNavigate: (p: string) => void }) {
  const navItems = ['Getting Started', 'Exporting from ChatGPT', 'Exporting from Claude', 'Exporting from Gemini', 'Free Scan', 'Understanding Results', 'Pricing', 'Privacy & Security', 'Delivery Format', 'Troubleshooting', 'FAQ']
  const [activeDoc, setActiveDoc] = useState('Getting Started')

  return (
    <div className="min-h-screen bg-white">
      <section className="py-16 text-center border-b" style={{ borderColor: 'var(--border)', background: 'var(--secondary)' }}>
        <div className="max-w-2xl mx-auto px-6">
          <h1 className="font-tight" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, fontSize: '36px', color: 'var(--foreground)', letterSpacing: '-0.025em', marginBottom: '16px' }}>
            How can we help?
          </h1>
          <div className="relative">
            <Input placeholder="Search documentation..." className="h-12 w-full rounded-2xl bg-white pl-12 pr-4 text-sm shadow-[0_2px_8px_rgba(5,8,23,0.05)]" />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl" style={{ color: 'var(--muted-foreground)' }}>⌕</span>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-12 grid lg:grid-cols-[220px_1fr_220px] gap-8">
        <div>
          <div className="sticky top-24">
            {navItems.map(item => (
              <Button variant="ghost" size="auto" key={item} onClick={() => setActiveDoc(item)}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm mb-0.5 transition-all"
                style={activeDoc === item ? { background: 'var(--blue-soft)', color: 'var(--blue)', fontWeight: 650 } : { color: 'var(--secondary-text)' }}>
                {item}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-tight" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, fontSize: '28px', color: 'var(--foreground)', letterSpacing: '-0.025em', marginBottom: '16px' }}>
            {activeDoc}
          </h2>
          <div className="flex flex-col gap-4 text-sm leading-relaxed" style={{ color: 'var(--secondary-text)' }}>
            <p>Brain2 Labs AI Chat-History Refinery turns your exported AI conversation archives into organized, searchable knowledge bases. This guide will help you get started quickly.</p>
            <h3 className="font-tight font-bold" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', color: 'var(--foreground)', fontSize: '18px' }}>Step 1: Export your conversations</h3>
            <p>Export your conversation history from the AI platforms you use. Each platform has a different export process—see the platform-specific guides in the left navigation for step-by-step instructions.</p>
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--secondary)' }}>
              <div className="font-tight font-bold text-sm mb-2" style={{ color: 'var(--foreground)' }}>Supported platforms</div>
              <div className="flex flex-wrap gap-2">
                {['ChatGPT', 'Claude', 'Gemini', 'Microsoft Copilot', 'Poe'].map(p => (
                  <span key={p} className="text-xs px-2.5 py-1 rounded-full border bg-white" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>{p}</span>
                ))}
              </div>
            </div>
            <h3 className="font-tight font-bold" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', color: 'var(--foreground)', fontSize: '18px' }}>Step 2: Upload and scan</h3>
            <p>Upload your exported ZIP file to Brain2 Labs. The free scan analyzes your archive and shows you what's inside—total word count, conversation count, estimated projects, and top topics—before you pay anything.</p>
            <h3 className="font-tight font-bold" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', color: 'var(--foreground)', fontSize: '18px' }}>Step 3: Review and unlock</h3>
            <p>Review the free scan results. When ready, unlock the full archive for $29 one-time. Processing typically takes 3–10 minutes.</p>
          </div>
        </div>

        <div>
          <div className="sticky top-24 flex flex-col gap-4">
            <div className="rounded-xl border bg-white p-4" style={{ borderColor: 'var(--border)' }}>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--muted-foreground)' }}>Popular Articles</div>
              {['How to export from ChatGPT', 'What does the free scan show?', 'How long does processing take?', 'What formats are included?'].map(a => (
                <div key={a} className="py-2 border-b last:border-b-0 text-xs cursor-pointer hover:text-[#075dff] transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--secondary-text)' }}>{a}</div>
              ))}
            </div>
            <div className="rounded-xl border bg-white p-4" style={{ borderColor: 'var(--border)' }}>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--muted-foreground)' }}>Contact Support</div>
              <p className="text-xs mb-3" style={{ color: 'var(--secondary-text)' }}>Need help? Our team responds within 24 hours.</p>
              <Button variant="ghost" size="auto" className="btn-pink w-full py-2 text-xs rounded-lg font-bold">Contact Us</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
