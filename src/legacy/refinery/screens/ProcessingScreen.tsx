"use client";

import { Button } from "@/components/ui/button";
import { useState, useEffect } from 'react'

interface ProcessingProps {
  onNavigate: (page: string) => void
}

const stages = [
  { label: 'Import', detail: 'Reading archive structure' },
  { label: 'Parse', detail: 'Extracting conversation data' },
  { label: 'Normalize', detail: 'Standardizing formats across sources' },
  { label: 'Detect relationships', detail: 'Identifying connected conversations' },
  { label: 'Build projects', detail: 'Clustering into project groups' },
  { label: 'Create topic structure', detail: 'Mapping semantic topics' },
  { label: 'Reconstruct timelines', detail: 'Ordering by chronology' },
  { label: 'Create source links', detail: 'Linking every result to its origin' },
  { label: 'Build search index', detail: 'Indexing full-text content' },
  { label: 'Generate archive', detail: 'Assembling the knowledge base' },
  { label: 'Create exports', detail: 'Rendering HTML, Markdown, CSV' },
  { label: 'Validate', detail: 'Final quality checks' },
]

export default function ProcessingScreen({ onNavigate }: ProcessingProps) {
  const [current, setCurrent] = useState(0)
  const [progress, setProgress] = useState(0)
  const [stats, setStats] = useState({ words: 0, convs: 0, projects: 0, sources: 0 })
  const [logs, setLogs] = useState<string[]>([])
  const [done, setDone] = useState(false)

  useEffect(() => {
    const totalTime = 12000
    const stageTime = totalTime / stages.length
    stages.forEach((_, i) => setTimeout(() => setCurrent(i), i * stageTime))
    setTimeout(() => { setDone(true); setTimeout(() => onNavigate('archive-complete'), 1000) }, totalTime)
    const pIv = setInterval(() => setProgress(p => Math.min(p + 100 / (totalTime / 80), 99)), 80)
    const sIv = setInterval(() => setStats(s => ({ words: Math.min(s.words + 8473, 1248591), convs: Math.min(s.convs + 2, 236), projects: Math.min(s.projects + 1, 28), sources: Math.min(s.sources + 1, 5) })), 150)
    const msgs = ['Parsing ChatGPT export...','Found 124 conversations from ChatGPT','Parsing Claude export...','Found 58 conversations from Claude','Parsing Gemini export...','Found 31 conversations from Gemini','Topic detection running...','Identified "go-to-market" cluster: 24 conversations','Identified "product roadmap" cluster: 18 conversations','Building timeline for Jan 2023 – May 2025...','Source-linking 236 conversations...','Generating search index...','Writing HTML export...','Writing Markdown export...','Writing CSV export...','Archive validation complete.']
    msgs.forEach((msg, i) => setTimeout(() => setLogs(l => [msg, ...l].slice(0, 10)), i * 750))
    return () => { clearInterval(pIv); clearInterval(sIv) }
  }, [])

  return (
    <div className="min-h-screen px-6 py-12" style={{ background: 'var(--secondary)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-tight" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, fontSize: '32px', color: 'var(--foreground)', letterSpacing: '-0.025em' }}>
            {done ? 'Processing complete!' : 'Building your archive...'}
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--secondary-text)' }}>
            {done ? 'Your knowledge archive is ready.' : 'This typically takes 3–10 minutes.'}
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs bg-white" style={{ borderColor: 'var(--border)', color: 'var(--secondary-text)' }}>
            <span style={{ color: 'var(--blue)' }}>💡</span> You can safely leave this page. Your progress is saved.
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          <div className="rounded-2xl border bg-white p-6" style={{ borderColor: 'var(--border)' }}>
            {/* Progress */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-tight font-bold" style={{ color: 'var(--foreground)' }}>{stages[current]?.label || 'Complete'}</span>
                <span className="font-tight font-black" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', color: 'var(--pink)', fontSize: '16px' }}>{Math.round(progress)}%</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}>
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, var(--blue), var(--pink))' }} />
              </div>
              {stages[current] && <div className="text-xs mt-1.5" style={{ color: 'var(--muted-foreground)' }}>{stages[current].detail}</div>}
            </div>

            {/* Pipeline grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
              {stages.map((stage, i) => {
                const done_ = i < current
                const curr = i === current
                return (
                  <div key={stage.label} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs"
                    style={{ background: done_ ? '#dcfce7' : curr ? 'var(--pink-soft)' : 'var(--surface)', color: done_ ? '#166534' : curr ? 'var(--pink)' : 'var(--muted-foreground)' }}>
                    <span className="font-bold">{done_ ? '✓' : curr ? '⟳' : `${i+1}`}</span>
                    <span className={curr ? 'font-bold' : ''}>{stage.label}</span>
                  </div>
                )
              })}
            </div>

            {/* Activity log */}
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)', background: 'var(--secondary)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} />
                <span className="text-xs font-tight font-bold" style={{ color: 'var(--foreground)' }}>Activity Log</span>
              </div>
              <div className="p-4 h-40 overflow-y-auto flex flex-col gap-1.5">
                {logs.length === 0
                  ? <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Starting processing pipeline...</div>
                  : logs.map((log, i) => (
                    <div key={i} className="text-xs flex items-start gap-2">
                      <span className="text-[10px] mt-0.5 shrink-0 font-mono" style={{ color: 'var(--muted-foreground)' }}>{String(logs.length - i).padStart(2, '0')}</span>
                      <span style={{ color: i === 0 ? 'var(--foreground)' : 'var(--muted-foreground)' }}>{log}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border bg-white p-5" style={{ borderColor: 'var(--border)' }}>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--muted-foreground)' }}>Live Counts</div>
              {[
                { label: 'Words Processed', value: stats.words.toLocaleString() },
                { label: 'Conversations', value: `${stats.convs} / 236` },
                { label: 'Projects Discovered', value: `${stats.projects}` },
                { label: 'Sources Indexed', value: `${stats.sources}` },
              ].map(s => (
                <div key={s.label} className="py-3 border-b last:border-b-0 flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{s.label}</span>
                  <span className="font-tight font-bold text-sm" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', color: 'var(--foreground)' }}>{s.value}</span>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border bg-white p-5" style={{ borderColor: 'var(--border)' }}>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--muted-foreground)' }}>You'll receive</div>
              {[
                { icon: '📁', label: 'Organized archive', c: 'var(--pink)' },
                { icon: '⌕', label: 'Full-text search', c: 'var(--blue)' },
                { icon: '⌁', label: 'Source links', c: 'var(--pink)' },
                { icon: '📅', label: 'Project timelines', c: 'var(--blue)' },
                { icon: '📄', label: 'HTML export', c: 'var(--pink)' },
                { icon: '✏', label: 'Markdown export', c: 'var(--blue)' },
                { icon: '📊', label: 'CSV export', c: 'var(--pink)' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 py-1.5 text-sm">
                  <span style={{ color: item.c }}>{item.icon}</span>
                  <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
