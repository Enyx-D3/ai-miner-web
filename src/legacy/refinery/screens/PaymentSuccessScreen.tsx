"use client";

import { Button } from "@/components/ui/button";
import { useState, useEffect } from 'react'

interface PaymentSuccessProps {
  onNavigate: (page: string) => void
}

export default function PaymentSuccessScreen({ onNavigate }: PaymentSuccessProps) {
  const [hours, setHours] = useState(23)
  const [minutes, setMinutes] = useState(59)
  const [seconds, setSeconds] = useState(47)

  useEffect(() => {
    const iv = setInterval(() => {
      setSeconds(s => {
        if (s > 0) return s - 1
        setMinutes(m => { if (m > 0) return m - 1; setHours(h => h - 1); return 59 })
        return 59
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [])

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--secondary)' }}>
      <div className="w-full max-w-lg text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center text-4xl" style={{ background: '#dcfce7', color: 'var(--success)' }}>✓</div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-4 border" style={{ background: '#dcfce7', color: '#16a34a', borderColor: '#bbf7d0' }}>Payment successful</div>
        <h1 className="font-tight" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, fontSize: 'clamp(24px, 4vw, 40px)', color: 'var(--foreground)', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
          You're ready to build your archive.
        </h1>
        <p className="mt-4 text-base" style={{ color: 'var(--secondary-text)' }}>Your processing access is now active. Start when you're ready.</p>

        {/* Timer */}
        <div className="mt-8 mx-auto max-w-sm rounded-2xl border bg-white p-6" style={{ borderColor: 'var(--border)' }}>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--muted-foreground)' }}>Processing Access Remaining</div>
          <div className="flex items-center justify-center gap-3 font-tight font-black" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontSize: '44px', letterSpacing: '-0.03em', color: 'var(--foreground)' }}>
            <div className="text-center"><div>{pad(hours)}</div><div className="text-[10px] font-bold mt-1 tracking-widest" style={{ color: 'var(--muted-foreground)' }}>HRS</div></div>
            <div style={{ color: 'var(--muted-foreground)' }}>:</div>
            <div className="text-center"><div>{pad(minutes)}</div><div className="text-[10px] font-bold mt-1 tracking-widest" style={{ color: 'var(--muted-foreground)' }}>MIN</div></div>
            <div style={{ color: 'var(--muted-foreground)' }}>:</div>
            <div className="text-center"><div>{pad(seconds)}</div><div className="text-[10px] font-bold mt-1 tracking-widest" style={{ color: 'var(--muted-foreground)' }}>SEC</div></div>
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--muted-foreground)' }}>Complimentary 12-hour extension available if needed.</p>
        </div>

        {/* File */}
        <div className="mt-4 mx-auto max-w-sm rounded-xl border bg-white p-4 flex items-center gap-3" style={{ borderColor: 'var(--border)' }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0" style={{ background: 'var(--pink-soft)', color: 'var(--pink)' }}>🗜</div>
          <div className="flex-1 text-left">
            <div className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>chatgpt_export_2026-08-01.zip</div>
            <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>47.2 MB · ChatGPT</div>
          </div>
          <Button variant="ghost" size="auto" className="text-xs font-bold" style={{ color: 'var(--blue)' }} onClick={() => onNavigate('upload')}>Replace</Button>
        </div>

        <div className="mt-6 max-w-sm mx-auto w-full">
          <Button variant="ghost" size="auto" onClick={() => onNavigate('processing')} className="btn-pink py-4 text-base rounded-xl w-full font-bold">Start Full Processing</Button>
          <p className="text-xs mt-3" style={{ color: 'var(--muted-foreground)' }}>Full processing takes 3–10 minutes depending on archive size.</p>
        </div>
      </div>
    </div>
  )
}
