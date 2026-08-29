"use client";

import { Button } from "@/components/ui/button";

export default function HowItWorksScreen({ onNavigate }: { onNavigate: (p: string) => void }) {
  const steps = [
    { num: '01', title: 'Export Your Chats', icon: '📤', stepColor: 'var(--blue)', desc: 'Download your conversation export from the AI platforms you use.', platforms: ['ChatGPT', 'Claude', 'Gemini', 'Copilot', 'Poe'] },
    { num: '02', title: 'Upload ZIP & Free Scan', icon: '☁', stepColor: 'var(--pink)', desc: 'We securely inspect your export, calculate coverage, estimate projects, and build a preview. No payment needed.', note: 'Free — no card required' },
    { num: '03', title: 'Review Preview & Pay Once', icon: '🔍', stepColor: 'var(--blue)', desc: 'See exactly what was discovered before paying. Total word count, conversation count, estimated projects, and topic clusters.', price: '$29 one-time' },
    { num: '04', title: 'Get Organized Archive', icon: '⚡', stepColor: 'var(--pink)', desc: 'Receive your complete organized archive with projects, topics, timelines, source links, and full-text search.', formats: ['HTML', 'Markdown', 'CSV'] },
  ]
  const pipeline = ['Parse Conversations', 'Detect Topics', 'Group Into Projects', 'Link Sources', 'Build Timelines', 'Build Search Index', 'Generate Archive', 'Export']

  return (
    <div className="min-h-screen bg-white">
      <section className="py-20 text-center bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-[11px] font-bold tracking-widest uppercase mb-4" style={{ color: 'var(--blue)' }}>How It Works</p>
          <h1 className="font-tight" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 5vw, 52px)', color: 'var(--foreground)', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
            HOW AI CHAT-HISTORY<br />REFINERY WORKS
          </h1>
          <p className="mt-4 text-base" style={{ color: 'var(--secondary-text)' }}>From messy chat exports to organized, searchable knowledge in four simple steps.</p>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-6">
            {steps.map((step, i) => (
              <div key={step.num} className="rounded-2xl border p-8 hover:shadow-md transition-shadow bg-white" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full" style={{ background: step.stepColor === 'var(--pink)' ? 'var(--pink-soft)' : 'var(--blue-soft)', color: step.stepColor }}>STEP {step.num}</span>
                  <span className="text-3xl">{step.icon}</span>
                </div>
                <h2 className="font-tight font-bold mb-3" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontSize: '22px', color: 'var(--foreground)', letterSpacing: '-0.02em' }}>{step.title}</h2>
                <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--secondary-text)' }}>{step.desc}</p>
                {step.platforms && <div className="flex flex-wrap gap-2">{step.platforms.map(p => <span key={p} className="text-xs px-3 py-1 rounded-full border bg-white" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>{p}</span>)}</div>}
                {step.note && <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: '#dcfce7', color: '#166534' }}>{step.note}</span>}
                {step.price && <span className="font-tight font-black text-xl" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', color: 'var(--foreground)', letterSpacing: '-0.02em' }}>{step.price}</span>}
                {step.formats && <div className="flex gap-2">{step.formats.map(f => <span key={f} className="text-xs px-3 py-1 rounded-full border" style={{ borderColor: '#f5c0df', background: 'var(--pink-soft)', color: 'var(--pink)' }}>{f}</span>)}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 border-t px-6" style={{ borderColor: 'var(--border)', background: 'var(--secondary)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-tight" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, fontSize: '24px', color: 'var(--foreground)', letterSpacing: '-0.025em', marginBottom: '32px' }}>
            What happens during processing
          </h2>
          <div className="flex flex-wrap justify-center items-center gap-2">
            {pipeline.map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <span className="text-sm font-medium px-3 py-2 rounded-lg bg-white border" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>{step}</span>
                {i < pipeline.length - 1 && <span style={{ color: 'var(--blue)' }}>→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-tight" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, fontSize: '24px', color: 'var(--foreground)', letterSpacing: '-0.025em', marginBottom: '8px' }}>Privacy & Security</h2>
          <p className="text-sm mb-8" style={{ color: 'var(--secondary-text)' }}>Your conversations are private. We take that seriously.</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: '🔒', color: 'var(--blue)', bg: 'var(--blue-soft)', title: 'Encrypted in transit', desc: 'All uploads and data transfers use TLS encryption.' },
              { icon: '🛡', color: 'var(--pink)', bg: 'var(--pink-soft)', title: 'No model training', desc: 'Your data is never used to train AI models or shared externally.' },
              { icon: '🗑', color: 'var(--blue)', bg: 'var(--blue-soft)', title: 'Controlled deletion', desc: 'Request deletion at any time. Your data is yours.' },
            ].map(f => (
              <div key={f.title} className="rounded-2xl border bg-white p-5" style={{ borderColor: 'var(--border)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3" style={{ background: f.bg, color: f.color }}>{f.icon}</div>
                <div className="font-tight font-bold text-sm mb-1" style={{ color: 'var(--foreground)' }}>{f.title}</div>
                <div className="text-xs" style={{ color: 'var(--secondary-text)' }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 text-center px-6" style={{ background: 'linear-gradient(100deg, #064bfa 0%, #312bea 36%, #9120dc 64%, #fa008e 100%)' }}>
        <h2 className="font-tight" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, fontSize: '36px', color: '#fff', letterSpacing: '-0.025em' }}>Ready to start?</h2>
        <p className="mt-2 mb-6 text-white/70">Free scan. No card required.</p>
        <Button variant="ghost" size="auto" onClick={() => onNavigate('upload')} className="px-8 py-4 text-sm font-bold rounded-xl bg-white" style={{ color: 'var(--pink)' }}>START FREE SCAN</Button>
      </section>
    </div>
  )
}

// ===== Features =====
