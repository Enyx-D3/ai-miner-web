"use client";

import { Button } from "@/components/ui/button";
interface ArchiveCompleteProps {
  onNavigate: (page: string) => void
}

export default function ArchiveCompleteScreen({ onNavigate }: ArchiveCompleteProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--secondary)' }}>
      <div className="w-full max-w-2xl text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center text-4xl text-white"
          style={{ background: 'linear-gradient(135deg, var(--blue), var(--pink))' }}>⚡</div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-4 border" style={{ background: '#dcfce7', color: '#16a34a', borderColor: '#bbf7d0' }}>
          Archive Generated
        </div>
        <h1 className="font-tight" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 5vw, 52px)', color: 'var(--foreground)', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
          Your archive is ready.
        </h1>
        <p className="mt-4 text-base" style={{ color: 'var(--secondary-text)' }}>1,248,591 words organized across 28 projects and 5 sources.</p>

        <div className="mt-8 grid grid-cols-3 sm:grid-cols-5 gap-3">
          {[
            { label: 'Words organized', value: '1.25M' },
            { label: 'Conversations', value: '236' },
            { label: 'Projects', value: '28' },
            { label: 'Sources', value: '5' },
            { label: 'Major topics', value: '12' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border bg-white p-4 text-center" style={{ borderColor: 'var(--border)' }}>
              <div className="font-tight font-black text-xl mb-0.5" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', color: 'var(--foreground)' }}>{s.value}</div>
              <div className="text-[10px] uppercase tracking-wide font-bold" style={{ color: 'var(--muted-foreground)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {['Processing completed','Archive generated','Source links preserved'].map(s => (
            <div key={s} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border" style={{ background: '#dcfce7', borderColor: '#bbf7d0', color: '#166534' }}>
              <span>✓</span>{s}
            </div>
          ))}
        </div>

        <div className="mt-8">
          <Button variant="ghost" size="auto" onClick={() => onNavigate('dashboard')} className="btn-blue px-8 py-4 text-base rounded-xl font-bold inline-flex items-center gap-2">
            Open Archive →
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {[
            { icon: '🌐', label: 'Download HTML', bg: 'var(--blue-soft)', border: '#c0d5ff', c: 'var(--blue)' },
            { icon: '✏', label: 'Download Markdown', bg: 'var(--pink-soft)', border: '#f5c0df', c: 'var(--pink)' },
            { icon: '📊', label: 'Download CSV', bg: '#f0fdf4', border: '#bbf7d0', c: 'var(--success)' },
          ].map(btn => (
            <Button variant="ghost" size="auto" key={btn.label} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-bold transition-all hover:shadow-md"
              style={{ background: btn.bg, borderColor: btn.border, color: btn.c }}>
              <span>{btn.icon}</span>{btn.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
