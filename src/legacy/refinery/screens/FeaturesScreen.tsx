"use client";

import { Button } from "@/components/ui/button";

export default function FeaturesScreen({ onNavigate }: { onNavigate: (p: string) => void }) {
  const groups = [
    { title: 'Organization', icon: '📁', iconColor: 'var(--pink)', iconBg: 'var(--pink-soft)', features: ['Auto-organize into projects', 'Cluster by topic & intent', 'Multi-source ingestion', 'Chronological reconstruction'] },
    { title: 'Discovery', icon: '🔬', iconColor: 'var(--blue)', iconBg: 'var(--blue-soft)', features: ['Recover forgotten ideas', 'Counts & coverage', 'Topic preview', 'Similar conversation detection'] },
    { title: 'Search & Source Links', icon: '⌕', iconColor: 'var(--blue)', iconBg: 'var(--blue-soft)', features: ['Search across archive', 'Source-link every result', 'Trace back to original conversations', 'Relevance scoring'] },
    { title: 'Timeline & Archive Intelligence', icon: '📅', iconColor: 'var(--blue)', iconBg: 'var(--blue-soft)', features: ['Project timelines', 'Conversation evolution', 'Chronological reconstruction', 'Activity analysis'] },
    { title: 'Export & Delivery', icon: '📄', iconColor: 'var(--pink)', iconBg: 'var(--pink-soft)', features: ['HTML interactive archive', 'Markdown portable text', 'CSV spreadsheet data', 'Offline usage after delivery'] },
    { title: 'Privacy & Security', icon: '🔒', iconColor: 'var(--blue)', iconBg: 'var(--blue-soft)', features: ['Encrypted files', 'Private processing', 'No model training on your data', 'Controlled deletion'] },
  ]

  return (
    <div className="min-h-screen bg-white">
      <section className="py-20 text-center bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-[11px] font-bold tracking-widest uppercase mb-4" style={{ color: 'var(--blue)' }}>Features</p>
          <h1 className="font-tight" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 5vw, 52px)', color: 'var(--foreground)', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
            POWERFUL FEATURES FOR<br />ORGANIZED INSIGHT
          </h1>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map(g => (
            <div key={g.title} className="rounded-2xl border bg-white p-6 hover:shadow-md transition-shadow" style={{ borderColor: 'var(--border)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4" style={{ background: g.iconBg, color: g.iconColor }}>{g.icon}</div>
              <h2 className="font-tight font-bold text-base mb-4" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', color: 'var(--foreground)' }}>{g.title}</h2>
              <div className="flex flex-col gap-2">
                {g.features.map(f => (
                  <div key={f} className="flex items-start gap-2 text-sm">
                    <span className="font-bold mt-0.5" style={{ color: g.iconColor }}>✓</span>
                    <span style={{ color: 'var(--secondary-text)' }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 text-center px-6" style={{ background: 'linear-gradient(100deg, #064bfa 0%, #312bea 36%, #9120dc 64%, #fa008e 100%)' }}>
        <h2 className="font-tight" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, fontSize: '36px', color: '#fff', letterSpacing: '-0.025em' }}>See it in action</h2>
        <p className="mt-2 mb-6 text-white/70">Upload your export. Free scan. No card required.</p>
        <Button variant="ghost" size="auto" onClick={() => onNavigate('upload')} className="px-8 py-4 text-sm font-bold rounded-xl bg-white" style={{ color: 'var(--pink)' }}>START FREE SCAN</Button>
      </section>
    </div>
  )
}

// ===== Examples =====
