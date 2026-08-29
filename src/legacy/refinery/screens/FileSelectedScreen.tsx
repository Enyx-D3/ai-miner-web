"use client";

import { Button } from "@/components/ui/button";
interface FileSelectedProps {
  file: { name: string; size: string; source: string }
  onNavigate: (page: string) => void
  onReset: () => void
}

function Stepper({ active }: { active: number }) {
  return (
    <div className="flex items-center gap-0 mb-10 max-w-md mx-auto">
      {['Upload Export', 'Free Scan', 'See Results'].map((step, i) => (
        <div key={step} className="flex items-center gap-2 flex-1">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={i === active ? { background: 'var(--pink)', color: '#fff' } : i < active ? { background: 'var(--blue)', color: '#fff' } : { border: '1.5px solid var(--border)', color: 'var(--muted-foreground)', background: '#fff' }}>
            {i < active ? '✓' : i + 1}
          </div>
          <span className="text-sm" style={{ fontWeight: i === active ? 650 : 500, color: i === active ? 'var(--pink)' : i < active ? 'var(--blue)' : 'var(--muted-foreground)' }}>{step}</span>
          {i < 2 && <div className="flex-1 h-px mx-1" style={{ background: i < active ? 'var(--blue)' : 'var(--border)' }} />}
        </div>
      ))}
    </div>
  )
}

export default function FileSelectedScreen({ file, onNavigate, onReset }: FileSelectedProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--secondary)' }}>
      <div className="w-full max-w-lg">
        <Stepper active={0} />
        <div className="rounded-2xl border bg-white p-8" style={{ borderColor: 'var(--border)', boxShadow: '0 4px 24px rgba(5,8,23,0.07)' }}>
          <h1 className="font-tight" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, fontSize: '26px', color: 'var(--foreground)', letterSpacing: '-0.025em', marginBottom: '6px' }}>
            File ready to scan
          </h1>
          <p className="text-sm mb-7" style={{ color: 'var(--secondary-text)' }}>Review your file, then start the free scan.</p>

          {/* File card */}
          <div className="rounded-xl border p-5 mb-5 flex items-start gap-4" style={{ borderColor: 'var(--border)', background: 'var(--secondary)' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: 'var(--pink-soft)', color: 'var(--pink)' }}>🗜</div>
            <div className="flex-1 min-w-0">
              <div className="font-tight font-bold text-base truncate mb-1" style={{ color: 'var(--foreground)' }}>{file.name}</div>
              <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                <span>{file.size}</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} />
                  Source: <strong style={{ color: 'var(--foreground)' }}>{file.source}</strong>
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <Button variant="ghost" size="auto" onClick={onReset} className="text-xs font-bold px-3 py-1.5 rounded-lg border hover:bg-[#f6f8fc] transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--secondary-text)' }}>Remove</Button>
              <Button variant="ghost" size="auto" onClick={() => onNavigate('upload')} className="text-xs font-bold px-3 py-1.5 rounded-lg border hover:bg-[#f6f8fc] transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--secondary-text)' }}>Replace</Button>
            </div>
          </div>

          {/* Privacy */}
          <div className="flex items-start gap-3 rounded-xl p-4 mb-7 border" style={{ background: 'var(--blue-soft)', borderColor: '#c0d5ff' }}>
            <span style={{ color: 'var(--blue)', fontSize: '18px' }}>🔒</span>
            <div>
              <div className="text-sm font-tight font-bold mb-0.5" style={{ color: 'var(--foreground)' }}>Your data is private</div>
              <div className="text-xs" style={{ color: 'var(--secondary-text)' }}>Processed locally in your browser for V0. Your conversation contents are not uploaded.</div>
            </div>
          </div>

          <Button variant="ghost" size="auto" onClick={() => onNavigate('scan-processing')} className="btn-blue w-full py-4 text-base rounded-xl font-bold">
            Start Free Scan →
          </Button>
          <p className="text-xs text-center mt-3" style={{ color: 'var(--muted-foreground)' }}>No payment required. Takes about 30–90 seconds.</p>
        </div>
      </div>
    </div>
  )
}
