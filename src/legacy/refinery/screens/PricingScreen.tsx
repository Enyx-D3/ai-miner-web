"use client";

import { Button } from "@/components/ui/button";
import { useState } from 'react'

interface PricingProps {
  onNavigate: (page: string) => void
}

const faqs = [
  { q: 'What does "24-hour processing access" mean?', a: 'After payment, you have a 24-hour window to upload, process, and download your archive. A complimentary 12-hour extension is automatically provided if needed.' },
  { q: 'What happens after the access period?', a: 'Your processed archive file is yours to keep and works offline. The access period governs when we process and host the interactive version.' },
  { q: 'Can I upload exports from multiple platforms?', a: 'Yes. You can include exports from ChatGPT, Claude, Gemini, Copilot, Poe, and other supported platforms.' },
  { q: 'Is there any subscription or recurring charge?', a: 'No. $29 is a one-time payment. No monthly fees, annual renewals, or hidden charges.' },
  { q: 'What export formats are included?', a: 'HTML (interactive archive), Markdown (portable structured text), and CSV (spreadsheet data). All formats included.' },
  { q: 'Is my data used to train AI models?', a: 'No. Your conversation data is processed only to produce your archive and is never used for model training or shared with third parties.' },
]

export default function PricingScreen({ onNavigate }: PricingProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <section className="py-20 text-center bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-[11px] font-bold tracking-widest uppercase mb-4" style={{ color: 'var(--blue)' }}>Pricing</p>
          <h1 className="font-tight" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, fontSize: 'clamp(30px, 5vw, 56px)', color: 'var(--foreground)', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
            ONE SIMPLE PRICE.<br />EVERYTHING INCLUDED.
          </h1>
          <p className="mt-4 text-lg" style={{ color: 'var(--secondary-text)' }}>No subscriptions. No tiers. No hidden fees.</p>
        </div>
      </section>

      {/* Main card */}
      <section className="pb-20 px-6">
        <div className="max-w-lg mx-auto">
          <div className="rounded-3xl border bg-white overflow-hidden" style={{ borderColor: 'var(--border)', boxShadow: '0 8px 40px rgba(5,8,23,0.1)' }}>
            {/* Top — dark with price */}
            <div className="p-8 bg-[#050817]">
              <div className="text-white/50 text-[10px] font-bold tracking-widest uppercase mb-4">One-Time Access</div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-tight font-black" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontSize: '72px', color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>$29</span>
                <span className="text-white/50 text-sm">USD</span>
              </div>
              <p className="text-white/60 text-sm">Pay once. No subscription. No renewal.</p>
            </div>

            <div className="p-8">
              {/* Access period */}
              <div className="rounded-xl p-4 mb-5 border" style={{ background: 'var(--blue-soft)', borderColor: '#c0d5ff' }}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl" style={{ color: 'var(--blue)' }}>⏱</span>
                  <div>
                    <div className="font-tight font-bold text-sm" style={{ color: 'var(--foreground)' }}>24 Hours of Processing Access</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--secondary-text)' }}>Start, process, and download during your access period.</div>
                  </div>
                </div>
              </div>

              {/* Extension */}
              <div className="rounded-xl p-4 mb-6 border" style={{ background: 'var(--pink-soft)', borderColor: '#f5c0df' }}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl" style={{ color: 'var(--pink)' }}>+</span>
                  <div>
                    <div className="font-tight font-bold text-sm" style={{ color: 'var(--foreground)' }}>Complimentary 12-Hour Extension</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--secondary-text)' }}>Automatically included when needed.</div>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 mb-7">
                {['Unlimited exported chats','Full organized archive','Project grouping & timelines','Source links & traceability','Full-text search index','HTML export','Markdown export','CSV export','Works offline after delivery','No model training on your data'].map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <span className="font-bold" style={{ color: 'var(--pink)' }}>✓</span>
                    <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>{f}</span>
                  </div>
                ))}
              </div>

              <Button variant="ghost" size="auto" onClick={() => onNavigate('upload')} className="btn-pink w-full py-4 text-sm rounded-xl mb-3 font-bold">START FREE SCAN</Button>
              <p className="text-xs text-center" style={{ color: 'var(--muted-foreground)' }}>Free scan first. Pay only when you're ready to unlock.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-16 border-t border-b" style={{ borderColor: 'var(--border)', background: 'var(--secondary)' }}>
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="font-tight text-center mb-8" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, fontSize: '28px', color: 'var(--foreground)', letterSpacing: '-0.025em' }}>
            Why customers choose us
          </h2>
          <div className="rounded-2xl border overflow-hidden bg-white" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--secondary)' }}>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Feature</th>
                  <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--blue)' }}>Brain2 Labs</th>
                  <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Typical subscription</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Pricing', '$29 one-time', '$15–40/month'],
                  ['Subscription', 'None ever', 'Required'],
                  ['Hidden fees', 'None', 'Overages common'],
                  ['Data ownership', 'Fully yours', 'Vendor-dependent'],
                  ['Offline archive', 'Included', 'Rarely available'],
                  ['Export formats', 'HTML + Markdown + CSV', 'Limited or locked'],
                ].map(([feature, us, them], i) => (
                  <tr key={feature} className={`border-t ${i % 2 !== 0 ? 'bg-[#fafbfd]' : ''}`} style={{ borderColor: 'var(--border)' }}>
                    <td className="px-6 py-4 font-medium" style={{ color: 'var(--foreground)' }}>{feature}</td>
                    <td className="px-6 py-4 text-center text-sm font-bold" style={{ color: 'var(--success)' }}>{us}</td>
                    <td className="px-6 py-4 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>{them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* What you receive */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-tight text-center mb-8" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, fontSize: '28px', color: 'var(--foreground)', letterSpacing: '-0.025em' }}>What you receive</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { icon: '📁', color: 'var(--pink)', bg: 'var(--pink-soft)', title: 'Organized Archive', desc: 'Projects, topics, and conversations grouped by semantic similarity and chronology.' },
              { icon: '⌕', color: 'var(--blue)', bg: 'var(--blue-soft)', title: 'Full-Text Search', desc: 'Every word indexed. Find any insight across your entire conversation history instantly.' },
              { icon: '⌁', color: 'var(--pink)', bg: 'var(--pink-soft)', title: 'Source Links', desc: 'Every extracted result links back to its original conversation for full traceability.' },
              { icon: '📅', color: 'var(--blue)', bg: 'var(--blue-soft)', title: 'Project Timelines', desc: 'See how your thinking evolved over time, project by project.' },
              { icon: '📄', color: 'var(--pink)', bg: 'var(--pink-soft)', title: 'Three Export Formats', desc: 'HTML, Markdown, and CSV — use your archive any way you need.' },
              { icon: '🔒', color: 'var(--blue)', bg: 'var(--blue-soft)', title: 'Private Processing', desc: 'Encrypted. No model training. Deleted after delivery per your request.' },
            ].map(f => (
              <div key={f.title} className="rounded-2xl border bg-white p-5 hover:shadow-md transition-shadow" style={{ borderColor: 'var(--border)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3" style={{ background: f.bg, color: f.color }}>{f.icon}</div>
                <div className="font-tight font-bold text-sm mb-2" style={{ color: 'var(--foreground)' }}>{f.title}</div>
                <div className="text-xs leading-relaxed" style={{ color: 'var(--secondary-text)' }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 border-t px-6" style={{ borderColor: 'var(--border)', background: 'var(--secondary)' }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="font-tight text-center mb-8" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, fontSize: '28px', color: 'var(--foreground)', letterSpacing: '-0.025em' }}>Frequently asked questions</h2>
          <div className="flex flex-col gap-2">
            {faqs.map((f, i) => (
              <div key={i} className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <Button variant="ghost" size="auto" className="w-full text-left px-5 py-4 flex items-center justify-between" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span className="font-tight font-bold text-sm pr-4" style={{ color: 'var(--foreground)' }}>{f.q}</span>
                  <span style={{ color: 'var(--muted-foreground)', transform: openFaq === i ? 'rotate(180deg)' : '', display: 'block', flexShrink: 0, transition: 'transform 0.2s' }}>↓</span>
                </Button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm leading-relaxed border-t" style={{ color: 'var(--secondary-text)', borderColor: 'var(--border)' }}>
                    <div className="pt-4">{f.a}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 text-center px-6" style={{ background: 'linear-gradient(100deg, #064bfa 0%, #312bea 36%, #9120dc 64%, #fa008e 100%)' }}>
        <h2 className="font-tight" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, fontSize: 'clamp(24px, 4vw, 40px)', color: '#fff', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
          Your first step is free.
        </h2>
        <p className="mt-3 mb-8 text-base text-white/70">Upload and scan at no cost. See exactly what's inside before paying anything.</p>
        <Button variant="ghost" size="auto" onClick={() => onNavigate('upload')} className="px-8 py-4 text-sm font-bold rounded-xl bg-white transition-all hover:shadow-2xl hover:-translate-y-0.5"
          style={{ color: 'var(--pink)' }}>
          START FREE SCAN
        </Button>
      </section>
    </div>
  )
}
