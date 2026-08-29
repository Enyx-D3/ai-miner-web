"use client";

import { Button } from "@/components/ui/button";

export default function ExamplesScreen({ onNavigate }: { onNavigate: (p: string) => void }) {
  const examples = [
    { title: 'Startup Brainstorm Archive', icon: '🚀', convs: 312, projects: 34, words: '1.8M', desc: 'Two years of ChatGPT and Claude conversations about building a B2B SaaS company.' },
    { title: 'Research & Notes Archive', icon: '🔬', convs: 186, projects: 22, words: '960K', desc: 'Academic research conversations, literature review synthesis, and experimental design.' },
    { title: 'Content Strategy Archive', icon: '✏', convs: 98, projects: 15, words: '420K', desc: 'Blog posts, SEO research, editorial calendars, and audience research across three platforms.' },
    { title: 'Personal AI Work Archive', icon: '👤', convs: 247, projects: 28, words: '1.1M', desc: 'Personal productivity, learning, creative projects, and life admin conversations.' },
  ]

  return (
    <div className="min-h-screen bg-white">
      <section className="py-20 text-center bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-[11px] font-bold tracking-widest uppercase mb-4" style={{ color: 'var(--pink)' }}>Examples</p>
          <h1 className="font-tight" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 5vw, 52px)', color: 'var(--foreground)', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
            REAL ARCHIVES.<br />REAL RESULTS.
          </h1>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 gap-6">
          {examples.map(ex => (
            <div key={ex.title} className="rounded-2xl border bg-white p-6 hover:shadow-md transition-shadow" style={{ borderColor: 'var(--border)' }}>
              <div className="text-4xl mb-4">{ex.icon}</div>
              <h2 className="font-tight font-bold text-lg mb-2" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', color: 'var(--foreground)', letterSpacing: '-0.02em' }}>{ex.title}</h2>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--secondary-text)' }}>{ex.desc}</p>
              <div className="grid grid-cols-3 gap-3 mb-5 text-center">
                {[{ label: 'Conversations', value: ex.convs }, { label: 'Projects', value: ex.projects }, { label: 'Words', value: ex.words }].map(s => (
                  <div key={s.label} className="rounded-xl p-3" style={{ background: 'var(--secondary)' }}>
                    <div className="font-tight font-bold text-base" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', color: 'var(--foreground)' }}>{s.value}</div>
                    <div className="text-[10px] uppercase tracking-wide font-bold mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="auto" onClick={() => onNavigate('dashboard')} className="btn-blue w-full py-2.5 text-sm rounded-xl font-bold">View Example</Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// ===== Docs =====
