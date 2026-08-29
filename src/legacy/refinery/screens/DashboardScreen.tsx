"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from 'react'
import { RefineryDonutChart, RefineryHorizontalBars, RefineryLineChart } from "@/components/common/RefineryCharts";

interface DashboardProps {
  onNavigate: (page: string) => void
}

const timelineData = [
  { month: 'Jan 23', chats: 8 }, { month: 'Apr 23', chats: 14 },
  { month: 'Jul 23', chats: 19 }, { month: 'Oct 23', chats: 26 },
  { month: 'Jan 24', chats: 38 }, { month: 'Apr 24', chats: 47 },
  { month: 'Jul 24', chats: 58 }, { month: 'Oct 24', chats: 71 },
  { month: 'Jan 25', chats: 82 }, { month: 'May 25', chats: 96 },
]

const sourceData = [
  { name: 'ChatGPT', value: 124, color: '#10a37f' },
  { name: 'Claude', value: 58, color: '#d97b4f' },
  { name: 'Gemini', value: 31, color: '#4285f4' },
  { name: 'Copilot', value: 14, color: '#0078d4' },
  { name: 'Poe', value: 9, color: '#8b5cf6' },
]

const projectData = [
  { name: 'Go-to-Market', convs: 24 },
  { name: 'Product Roadmap', convs: 18 },
  { name: 'User Research', convs: 16 },
  { name: 'Content Strategy', convs: 13 },
  { name: 'Marketing', convs: 11 },
  { name: 'Competitive', convs: 9 },
]

const recentConvs = [
  { title: 'Q3 pricing model review', source: 'ChatGPT', sourceColor: '#10a37f', project: 'Go-to-Market', date: 'May 14, 2025', words: 3840 },
  { title: 'UX friction points — onboarding flow', source: 'Claude', sourceColor: '#d97b4f', project: 'User Research', date: 'May 9, 2025', words: 2910 },
  { title: 'Newsletter content ideas — Q2', source: 'Gemini', sourceColor: '#4285f4', project: 'Content Strategy', date: 'Apr 28, 2025', words: 1650 },
  { title: 'Competitive landscape: Notion vs Linear', source: 'ChatGPT', sourceColor: '#10a37f', project: 'Competitive Research', date: 'Apr 22, 2025', words: 4120 },
  { title: 'Product spec: AI search integration', source: 'Claude', sourceColor: '#d97b4f', project: 'Product Roadmap', date: 'Apr 10, 2025', words: 5230 },
]

const insights = [
  { text: '"The primary differentiation should focus on time-to-value rather than feature depth."', source: 'ChatGPT', project: 'Go-to-Market', date: 'Mar 2024' },
  { text: '"Across 24 user interviews, onboarding complexity was the dominant friction point."', source: 'Claude', project: 'User Research', date: 'Jul 2024' },
  { text: '"A 70/20/10 content mix has shown the strongest engagement among technical audiences."', source: 'Gemini', project: 'Content Strategy', date: 'Nov 2024' },
]

const projects = [
  { name: 'Business & Strategy', count: 24, icon: '📊' },
  { name: 'Product Ideas', count: 18, icon: '💡' },
  { name: 'Writing & Content', count: 16, icon: '✏' },
  { name: 'Learning & Research', count: 11, icon: '📚' },
  { name: 'Personal', count: 8, icon: '👤' },
  { name: 'Unassigned', count: 14, icon: '📂' },
]

const navItems = [
  { label: 'Dashboard', page: 'dashboard', icon: '⊞' },
  { label: 'Projects', page: 'projects', icon: '📁' },
  { label: 'Conversations', page: 'conversations', icon: '💬' },
  { label: 'Timeline', page: 'timeline', icon: '📅' },
  { label: 'Search', page: 'search', icon: '⌕' },
]

interface SidebarProps {
  activePage: string
  onNavigate: (page: string) => void
  onClose?: () => void
}

function Sidebar({ activePage, onNavigate, onClose }: SidebarProps) {
  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--secondary)' }}>
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0" style={{ background: 'var(--pink)', color: '#fff' }}>B²</div>
          <div>
            <div className="text-xs font-bold" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--navy)' }}>Brain2 Labs</div>
            <div className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>AI Chat Refinery</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <Button variant="ghost" size="auto"
          onClick={() => { onNavigate('search'); onClose?.() }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm border bg-white transition-all hover:shadow-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
          <span>⌕</span>
          <span>Search archive...</span>
        </Button>
      </div>

      {/* Nav */}
      <div className="px-3 py-3 flex-1 overflow-y-auto">
        <div className="text-[10px] font-semibold uppercase tracking-wider px-2 mb-2" style={{ color: 'var(--muted-foreground)' }}>Overview</div>
        {navItems.map(item => (
          <Button variant="ghost" size="auto"
            key={item.page}
            onClick={() => { onNavigate(item.page); onClose?.() }}
            className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5 transition-all"
            style={activePage === item.page
              ? { background: 'var(--blue)', color: '#fff' }
              : { color: 'var(--muted-foreground)', background: 'transparent' }}>
            <span style={{ fontSize: '14px' }}>{item.icon}</span>
            {item.label}
          </Button>
        ))}

        <div className="text-[10px] font-semibold uppercase tracking-wider px-2 mt-5 mb-2" style={{ color: 'var(--muted-foreground)' }}>Projects</div>
        {projects.map(p => (
          <Button variant="ghost" size="auto"
            key={p.name}
            onClick={() => { onNavigate('project-detail'); onClose?.() }}
            className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-0.5 transition-all hover:bg-white group"
            style={{ color: 'var(--muted-foreground)' }}>
            <span style={{ fontSize: '12px' }}>{p.icon}</span>
            <span className="flex-1 truncate">{p.name}</span>
            <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'var(--muted)', borderRadius: '9999px', padding: '1px 6px', color: 'var(--muted-foreground)' }}>
              {p.count}
            </span>
          </Button>
        ))}
      </div>

      {/* Bottom */}
      <div className="px-3 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <Button variant="ghost" size="auto"
          onClick={() => onNavigate('landing')}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg hover:bg-white transition-all"
          style={{ color: 'var(--muted-foreground)' }}>
          ← Back to site
        </Button>
      </div>
    </div>
  )
}

export default function DashboardScreen({ onNavigate }: DashboardProps) {
  const [activePage, setActivePage] = useState('dashboard')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const navigate = (page: string) => {
    if (['dashboard', 'projects', 'conversations', 'timeline', 'search', 'project-detail', 'conversation-detail'].includes(page)) {
      setActivePage(page)
    } else {
      onNavigate(page)
    }
  }

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard': return <DashboardMain onNavigate={navigate} />
      case 'projects': return <ProjectsView onNavigate={navigate} />
      case 'conversations': return <ConversationsView onNavigate={navigate} />
      case 'timeline': return <TimelineView />
      case 'search': return <SearchView onNavigate={navigate} />
      case 'project-detail': return <ProjectDetailView onNavigate={navigate} />
      case 'conversation-detail': return <ConversationDetailView onNavigate={navigate} />
      default: return <DashboardMain onNavigate={navigate} />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col w-56 shrink-0 border-r h-full" style={{ borderColor: 'var(--border)' }}>
        <Sidebar activePage={activePage} onNavigate={navigate} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-64 h-full border-r shadow-xl" style={{ borderColor: 'var(--border)' }}>
            <Sidebar activePage={activePage} onNavigate={navigate} onClose={() => setMobileNavOpen(false)} />
          </div>
          <div className="flex-1 bg-black/30" onClick={() => setMobileNavOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--background)' }}>
          <Button variant="ghost" size="auto" onClick={() => setMobileNavOpen(true)} className="p-2 rounded-lg transition-colors" style={{ background: 'transparent' }}>
            <div className="w-5 flex flex-col gap-1">
              {[0,1,2].map(i => <span key={i} className="block h-0.5" style={{ background: 'var(--foreground)' }} />)}
            </div>
          </Button>
          <span className="text-sm font-bold" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--navy)' }}>Archive</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

// ===== Dashboard Main =====
export function DashboardMain({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, fontSize: '24px', color: 'var(--navy)', letterSpacing: '-0.025em' }}>Archive Overview</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Jan 2023 – May 2025</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="auto" className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all"
            style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
            📥 Export
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Words', value: '1,248,591', change: '+12.4%', icon: '📝' },
          { label: 'Conversations', value: '236', change: '+8', icon: '💬' },
          { label: 'Projects', value: '28', change: 'discovered', icon: '📁' },
          { label: 'Sources', value: '5', change: 'platforms', icon: '🔗' },
        ].map(m => (
          <div key={m.label} className="rounded-xl border bg-white p-5 hover:shadow-md transition-shadow" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{m.label}</span>
              <span className="text-base">{m.icon}</span>
            </div>
            <div className="text-2xl font-bold mb-0.5" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--navy)' }}>{m.value}</div>
            <div className="text-xs" style={{ color: 'var(--success)' }}>{m.change}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Timeline */}
        <div className="lg:col-span-2 rounded-2xl border bg-white p-5" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--navy)' }}>Conversation Activity</h2>
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Jan 2023 – May 2025</span>
          </div>
          <RefineryLineChart data={timelineData.map((item) => ({ label: item.month, value: item.chats }))} height={180} />
        </div>

        {/* Sources */}
        <div className="rounded-2xl border bg-white p-5" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-bold mb-4" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--navy)' }}>Source Breakdown</h2>
          <RefineryDonutChart data={sourceData} size={120} />
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* Top clusters */}
        <div className="rounded-2xl border bg-white p-5" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--navy)' }}>Top Conversation Clusters</h2>
            <Button variant="ghost" size="auto" onClick={() => onNavigate('projects')} className="text-xs font-semibold" style={{ color: 'var(--blue)' }}>View all →</Button>
          </div>
          <RefineryHorizontalBars data={projectData.map((item) => ({ name: item.name, value: item.convs }))} />
        </div>

        {/* Recent insights */}
        <div className="rounded-2xl border bg-white p-5" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-bold mb-4" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--navy)' }}>Recently Found Insights</h2>
          <div className="flex flex-col gap-3">
            {insights.map((ins, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl border hover:shadow-sm transition-shadow cursor-default"
                style={{ borderColor: 'var(--border)', background: 'var(--secondary)' }}>
                <div>
                  <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--navy)' }}>{ins.text}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--pink-soft)', color: 'var(--pink)' }}>{ins.project}</span>
                    <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>{ins.source} · {ins.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent conversations */}
      <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-bold" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--navy)' }}>Recent Conversations</h2>
          <Button variant="ghost" size="auto" onClick={() => onNavigate('conversations')} className="text-xs font-semibold" style={{ color: 'var(--blue)' }}>View all →</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--secondary)' }}>
                {['Title', 'Source', 'Project', 'Date', 'Words'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentConvs.map((c, i) => (
                <tr key={i} className="border-t cursor-pointer transition-colors hover:bg-[var(--secondary)]" style={{ borderColor: 'var(--border)' }}
                  onClick={() => onNavigate('conversation-detail')}>
                  <td className="px-5 py-3.5 font-medium" style={{ color: 'var(--navy)' }}>{c.title}</td>
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.sourceColor }} />
                      {c.source}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--pink-soft)', color: 'var(--pink)' }}>{c.project}</span>
                  </td>
                  <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>{c.date}</td>
                  <td className="px-5 py-3.5 text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>{c.words.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ===== Projects View =====
const allProjects = [
  { name: 'Go-to-Market Strategy', count: 24, sources: 4, dateRange: 'May 2024 – May 2026', words: '187K', confidence: 89, desc: 'Positioning, pricing, launch strategy, and competitive differentiation discussions.', topics: ['positioning', 'pricing', 'launch'], icon: '📊' },
  { name: 'Product Roadmap & Features', count: 18, sources: 3, dateRange: 'Jan 2024 – Apr 2026', words: '142K', confidence: 76, desc: 'Feature ideation, prioritization frameworks, and technical specification discussions.', topics: ['features', 'roadmap', 'specs'], icon: '🗺' },
  { name: 'User Research & Insights', count: 16, sources: 2, dateRange: 'Mar 2023 – Mar 2025', words: '98K', confidence: 64, desc: 'Interview synthesis, usability findings, and persona development.', topics: ['user research', 'UX', 'interviews'], icon: '🔬' },
  { name: 'Content Strategy', count: 13, sources: 3, dateRange: 'Jun 2023 – May 2025', words: '76K', confidence: 58, desc: 'Content planning, editorial frameworks, SEO strategy, and copy development.', topics: ['content', 'SEO', 'editorial'], icon: '✏' },
  { name: 'Competitive Research', count: 11, sources: 4, dateRange: 'Feb 2024 – Apr 2026', words: '62K', confidence: 52, desc: 'Market analysis, competitor teardowns, and differentiation opportunities.', topics: ['market analysis', 'competitors'], icon: '🔍' },
  { name: 'Personal Learning', count: 8, sources: 2, dateRange: 'Jan 2023 – May 2025', words: '34K', confidence: 44, desc: 'Courses, book summaries, skill development conversations.', topics: ['learning', 'skills'], icon: '📚' },
]

export function ProjectsView({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [search, setSearch] = useState('')
  const filtered = allProjects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, fontSize: '24px', color: 'var(--navy)', letterSpacing: '-0.025em' }}>Projects</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>28 discovered across 5 sources</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="h-10 w-full rounded-xl pl-9 pr-4 text-sm" />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--muted-foreground)' }}>⌕</span>
        </div>
        {['Sort: Relevance', 'Source', 'Date', 'Confidence'].map(f => (
          <Button variant="ghost" size="auto" key={f} className="px-3 py-2.5 rounded-xl border text-xs font-medium transition-all hover:bg-[var(--secondary)]"
            style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>{f}</Button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(p => (
          <div key={p.name} className="rounded-2xl border bg-white p-5 cursor-pointer hover:shadow-md transition-all group" style={{ borderColor: 'var(--border)' }}
            onClick={() => onNavigate('project-detail')}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'var(--pink-soft)' }}>
                {p.icon}
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: `rgba(59,130,246,${p.confidence / 200})`, color: 'var(--blue)' }}>
                {p.confidence}%
              </span>
            </div>
            <h3 className="font-bold text-sm mb-1 group-hover:text-[#075dff] transition-colors" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--navy)' }}>{p.name}</h3>
            <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--muted-foreground)' }}>{p.desc}</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {p.topics.map(t => (
                <span key={t} className="text-[10px] px-2 py-0.5 rounded-full border" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>{t}</span>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 pt-3 border-t text-center" style={{ borderColor: 'var(--border)' }}>
              <div>
                <div className="text-sm font-bold" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--navy)' }}>{p.count}</div>
                <div className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>convs</div>
              </div>
              <div>
                <div className="text-sm font-bold" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--navy)' }}>{p.words}</div>
                <div className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>words</div>
              </div>
              <div>
                <div className="text-sm font-bold" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--navy)' }}>{p.sources}</div>
                <div className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>sources</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== Project Detail View =====
export function ProjectDetailView({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [activeTab, setActiveTab] = useState('overview')
  const tabs = ['Overview', 'Conversations', 'Timeline', 'Topics', 'Sources']

  return (
    <div className="p-6 lg:p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--muted-foreground)' }}>
        <Button variant="ghost" size="auto" onClick={() => onNavigate('projects')} className="hover:text-[#075dff] transition-colors">Projects</Button>
        <span>/</span>
        <span style={{ color: 'var(--navy)' }}>Go-to-Market Strategy</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, fontSize: '28px', color: 'var(--navy)', letterSpacing: '-0.025em' }}>
            Go-to-Market Strategy
          </h1>
          <div className="flex flex-wrap gap-4 mt-2">
            {[
              { label: '24 conversations' },
              { label: '4 sources' },
              { label: 'May 2024 – May 2026' },
              { label: '187K words' },
            ].map(m => (
              <span key={m.label} className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{m.label}</span>
            ))}
          </div>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-full font-bold" style={{ background: 'var(--pink-soft)', color: 'var(--pink)' }}>89% match</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6" style={{ borderColor: 'var(--border)' }}>
        {tabs.map(tab => (
          <Button variant="ghost" size="auto"
            key={tab}
            onClick={() => setActiveTab(tab.toLowerCase())}
            className="px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px"
            style={{
              borderColor: activeTab === tab.toLowerCase() ? 'var(--blue)' : 'transparent',
              color: activeTab === tab.toLowerCase() ? 'var(--blue)' : 'var(--muted-foreground)',
            }}>
            {tab}
          </Button>
        ))}
      </div>

      {/* Overview content */}
      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        <div className="flex flex-col gap-5">
          {/* Summary */}
          <div className="rounded-2xl border bg-white p-6" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-bold mb-3" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--navy)' }}>Project Summary</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              This project clusters 24 conversations about market positioning, pricing strategy, launch execution, and competitive differentiation. The earliest conversation dates to May 2024, when initial GTM hypotheses were being formed. The most recent content reflects refined launch sequencing for Q3 2026.
            </p>
          </div>

          {/* Key conversations */}
          <div className="rounded-2xl border bg-white p-6" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-bold mb-4" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--navy)' }}>Key Conversations</h2>
            {[
              { title: 'Positioning strategy for B2B SaaS launch', source: 'ChatGPT', sourceColor: '#10a37f', date: 'Mar 14, 2024', words: 3840 },
              { title: 'Q3 pricing model review', source: 'Claude', sourceColor: '#d97b4f', date: 'May 14, 2025', words: 2910 },
              { title: 'ICP definition and segmentation', source: 'ChatGPT', sourceColor: '#10a37f', date: 'Jun 2, 2024', words: 4120 },
            ].map((c, i) => (
              <div key={i} className="flex items-center gap-3 py-3 border-b last:border-b-0 cursor-pointer -mx-6 px-6 transition-colors hover:bg-[var(--secondary)]" style={{ borderColor: 'var(--border)' }}
                onClick={() => onNavigate('conversation-detail')}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c.sourceColor }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--navy)' }}>{c.title}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{c.source} · {c.date} · {c.words.toLocaleString()} words</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Major topics */}
          <div className="rounded-2xl border bg-white p-5" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-bold mb-3" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--navy)' }}>Major Topics</h2>
            <div className="flex flex-wrap gap-2">
              {['positioning', 'pricing', 'launch', 'ICP', 'messaging', 'competitive', 'distribution'].map(t => (
                <span key={t} className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--pink-soft)', color: 'var(--pink)' }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Source distribution */}
          <div className="rounded-2xl border bg-white p-5" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-bold mb-3" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--navy)' }}>Sources</h2>
            {[
              { name: 'ChatGPT', count: 14, color: '#10a37f' },
              { name: 'Claude', count: 6, color: '#d97b4f' },
              { name: 'Gemini', count: 3, color: '#4285f4' },
              { name: 'Copilot', count: 1, color: '#0078d4' },
            ].map(s => (
              <div key={s.name} className="flex items-center gap-2 py-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="flex-1 text-sm" style={{ color: 'var(--navy)' }}>{s.name}</span>
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{s.count}</span>
              </div>
            ))}
          </div>

          {/* Related projects */}
          <div className="rounded-2xl border bg-white p-5" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-bold mb-3" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--navy)' }}>Related Projects</h2>
            {['Product Roadmap & Features', 'Competitive Research', 'Content Strategy'].map(p => (
              <Button variant="ghost" size="auto" key={p} onClick={() => onNavigate('project-detail')} className="w-full text-left py-2 text-sm hover:text-[#075dff] transition-colors flex items-center gap-2" style={{ color: 'var(--muted-foreground)' }}>
                <span>↗</span> {p}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ===== Conversations View =====
const convRows = [
  { title: 'Q3 pricing model review', source: 'ChatGPT', sourceColor: '#10a37f', project: 'Go-to-Market', date: 'May 14, 2025', topics: ['pricing', 'Q3'], words: 3840 },
  { title: 'UX friction points — onboarding flow', source: 'Claude', sourceColor: '#d97b4f', project: 'User Research', date: 'May 9, 2025', topics: ['UX', 'onboarding'], words: 2910 },
  { title: 'Newsletter content ideas — Q2', source: 'Gemini', sourceColor: '#4285f4', project: 'Content Strategy', date: 'Apr 28, 2025', topics: ['content', 'newsletter'], words: 1650 },
  { title: 'Competitive landscape: Notion vs Linear', source: 'ChatGPT', sourceColor: '#10a37f', project: 'Competitive Research', date: 'Apr 22, 2025', topics: ['competitive', 'tools'], words: 4120 },
  { title: 'Product spec: AI search integration', source: 'Claude', sourceColor: '#d97b4f', project: 'Product Roadmap', date: 'Apr 10, 2025', topics: ['product', 'search', 'AI'], words: 5230 },
  { title: 'ICP definition and segmentation', source: 'ChatGPT', sourceColor: '#10a37f', project: 'Go-to-Market', date: 'Mar 28, 2025', topics: ['ICP', 'segmentation'], words: 3100 },
  { title: 'Blog post draft: developer-led growth', source: 'Gemini', sourceColor: '#4285f4', project: 'Content Strategy', date: 'Mar 15, 2025', topics: ['content', 'growth', 'PLG'], words: 2480 },
  { title: 'Retention analysis — power users', source: 'Claude', sourceColor: '#d97b4f', project: 'User Research', date: 'Mar 5, 2025', topics: ['retention', 'analytics'], words: 1870 },
]

export function ConversationsView({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [search, setSearch] = useState('')
  const filtered = convRows.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, fontSize: '24px', color: 'var(--navy)', letterSpacing: '-0.025em' }}>Conversations</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>236 total · 5 platforms</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations..."
            className="h-10 w-full rounded-xl pl-9 pr-4 text-sm" />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--muted-foreground)' }}>⌕</span>
        </div>
        {['Platform', 'Project', 'Date', 'Topic'].map(f => (
          <Button variant="ghost" size="auto" key={f} className="px-3 py-2.5 rounded-xl border text-xs font-medium hover:bg-[#f8faff]" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>{f}</Button>
        ))}
      </div>

      <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--secondary)' }}>
                {['Title', 'Source', 'Project', 'Date', 'Topics', 'Words'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={i} className="border-t cursor-pointer transition-colors hover:bg-[var(--secondary)]" style={{ borderColor: 'var(--border)' }}
                  onClick={() => onNavigate('conversation-detail')}>
                  <td className="px-5 py-4 font-medium max-w-xs">
                    <span className="block truncate" style={{ color: 'var(--navy)' }}>{c.title}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.sourceColor }} />
                      {c.source}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: 'var(--pink-soft)', color: 'var(--pink)' }}>{c.project}</span>
                  </td>
                  <td className="px-5 py-4 text-xs whitespace-nowrap" style={{ color: 'var(--muted-foreground)' }}>{c.date}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {c.topics.slice(0, 2).map(t => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded border" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>{t}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>{c.words.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ===== Conversation Detail =====
export function ConversationDetailView({ onNavigate }: { onNavigate: (p: string) => void }) {
  const messages = [
    { role: 'user', text: 'I\'m planning a B2B SaaS launch and need to think through the positioning strategy. The product is an AI-powered workflow tool that helps engineering teams reduce meeting overhead. How should I approach differentiation?' },
    { role: 'assistant', text: 'Great framing. For B2B SaaS positioning, especially in the engineering tools space, I\'d focus on a specific problem pain rather than broad capability claims.\n\nThe primary differentiation should focus on time-to-value rather than feature depth. Enterprise buyers want to see ROI within the first 30 days—your positioning should make that concrete and measurable.\n\nThree angles worth exploring: (1) Meeting cost quantification — frame the product in terms of recovered engineering hours, which are easy to convert to dollar value. (2) Async-first workflow — position against synchronous collaboration tools like Slack or Teams, not other AI tools. (3) Integration depth — enterprise buyers care deeply about how new tools fit existing workflows.' },
    { role: 'user', text: 'That\'s helpful. What about ICP definition? We\'re torn between mid-market and enterprise.' },
    { role: 'assistant', text: 'For an engineering productivity tool, I\'d recommend starting with mid-market (200–2,000 employees) rather than enterprise for the initial GTM motion. Here\'s why:\n\nEnterprise sales cycles are 9–18 months for new categories, which burns runway without validation. Mid-market gives you faster signal on product-market fit, real NPS data, and case studies to use when you do move upstream.\n\nThe ideal ICP profile I\'d target: Engineering-led companies (not IT-led), Series B–D funded, 15–100 engineers, remote or hybrid teams, and a CTO or VP Engineering who is active on technical communities (GitHub, HN, Substack). That profile correlates strongly with early adopter behavior and word-of-mouth in engineering communities.' },
  ]

  return (
    <div className="p-6 lg:p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--muted-foreground)' }}>
        <Button variant="ghost" size="auto" onClick={() => onNavigate('conversations')} className="hover:text-[#075dff] transition-colors">Conversations</Button>
        <span>/</span>
        <span style={{ color: 'var(--navy)' }}>Positioning strategy for B2B SaaS launch</span>
      </div>

      <div className="grid lg:grid-cols-[1fr_260px] gap-6">
        {/* Main */}
        <div>
          {/* Header */}
          <div className="rounded-2xl border bg-white p-6 mb-5" style={{ borderColor: 'var(--border)' }}>
            <h1 style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, fontSize: '20px', color: 'var(--navy)', letterSpacing: '-0.025em', marginBottom: '12px' }}>
              Positioning strategy for B2B SaaS launch
            </h1>
            <div className="flex flex-wrap gap-3 mb-4">
              <span className="flex items-center gap-1.5 text-xs"><span className="w-2 h-2 rounded-full" style={{ background: '#10a37f' }} /> ChatGPT</span>
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Mar 14, 2024</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--pink-soft)', color: 'var(--pink)' }}>Go-to-Market Strategy</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['positioning', 'B2B', 'ICP', 'launch', 'differentiation'].map(t => (
                <span key={t} className="text-xs px-2 py-0.5 rounded-full border" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex flex-col gap-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 font-bold`}
                  style={m.role === 'user'
                    ? { background: 'var(--pink-soft)', color: 'var(--pink)' }
                    : { background: '#d1fae5', color: '#065f46' }}>
                  {m.role === 'user' ? 'U' : 'AI'}
                </div>
                <div className={`rounded-2xl p-4 max-w-2xl text-sm leading-relaxed whitespace-pre-line`}
                  style={m.role === 'user'
                    ? { background: 'var(--pink-soft)', color: 'var(--foreground)', borderRadius: '16px 4px 16px 16px' }
                    : { background: 'var(--secondary)', color: 'var(--navy)', border: '1px solid var(--border)', borderRadius: '4px 16px 16px 16px' }}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-5">
            <Button variant="ghost" size="auto" className="px-4 py-2 rounded-xl border text-sm font-semibold transition-all hover:bg-[var(--secondary)]"
              style={{ borderColor: 'var(--border)', color: 'var(--navy)', fontFamily: 'Inter' }}>View Original</Button>
            <Button variant="ghost" size="auto" className="px-4 py-2 rounded-xl border text-sm font-semibold transition-all hover:bg-[var(--secondary)]"
              style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>Copy Source Reference</Button>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border bg-white p-5" style={{ borderColor: 'var(--border)' }}>
            <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--muted-foreground)' }}>Project</div>
            <Button variant="ghost" size="auto" onClick={() => onNavigate('project-detail')} className="text-sm font-semibold hover:text-[#075dff] transition-colors" style={{ color: 'var(--navy)', fontFamily: 'Inter' }}>
              Go-to-Market Strategy →
            </Button>
          </div>

          <div className="rounded-2xl border bg-white p-5" style={{ borderColor: 'var(--border)' }}>
            <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--muted-foreground)' }}>Topics</div>
            <div className="flex flex-wrap gap-1.5">
              {['positioning', 'B2B', 'ICP', 'launch', 'differentiation'].map(t => (
                <span key={t} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--pink-soft)', color: 'var(--pink)' }}>{t}</span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5" style={{ borderColor: 'var(--border)' }}>
            <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--muted-foreground)' }}>Metadata</div>
            {[
              { label: 'Platform', value: 'ChatGPT' },
              { label: 'Date', value: 'Mar 14, 2024' },
              { label: 'Words', value: '3,840' },
              { label: 'Messages', value: '8' },
              { label: 'Conversation ID', value: 'conv_8a4f2b1...' },
            ].map(m => (
              <div key={m.label} className="flex justify-between py-2 border-b last:border-b-0 text-xs" style={{ borderColor: 'var(--border)' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>{m.label}</span>
                <span style={{ color: 'var(--navy)', fontFamily: m.label === 'Conversation ID' ? 'monospace' : undefined }}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ===== Timeline View =====
const timelineEvents = [
  { date: 'May 14, 2025', title: 'Q3 pricing model review', project: 'Go-to-Market', source: 'ChatGPT', sourceColor: '#10a37f', desc: 'Reviewed three pricing tiers and CAC implications for mid-market segment.' },
  { date: 'May 9, 2025', title: 'UX friction — onboarding flow', project: 'User Research', source: 'Claude', sourceColor: '#d97b4f', desc: 'Mapped 12 friction points across the 7-step onboarding funnel.' },
  { date: 'Apr 28, 2025', title: 'Newsletter content ideas', project: 'Content Strategy', source: 'Gemini', sourceColor: '#4285f4', desc: 'Brainstormed 24 newsletter topics for Q2 editorial calendar.' },
  { date: 'Apr 22, 2025', title: 'Competitive landscape analysis', project: 'Competitive Research', source: 'ChatGPT', sourceColor: '#10a37f', desc: 'Compared Notion, Linear, and Coda on 14 product dimensions.' },
  { date: 'Apr 10, 2025', title: 'AI search integration spec', project: 'Product Roadmap', source: 'Claude', sourceColor: '#d97b4f', desc: 'Detailed technical spec for embedding-based semantic search.' },
  { date: 'Mar 28, 2025', title: 'ICP definition and segmentation', project: 'Go-to-Market', source: 'ChatGPT', sourceColor: '#10a37f', desc: 'Defined three ICP tiers with scoring criteria and outreach prioritization.' },
  { date: 'Mar 15, 2025', title: 'Developer-led growth blog post', project: 'Content Strategy', source: 'Gemini', sourceColor: '#4285f4', desc: 'Draft for 2,500-word PLG strategy post targeting engineering leaders.' },
  { date: 'Feb 21, 2025', title: 'Retention analysis — power users', project: 'User Research', source: 'Claude', sourceColor: '#d97b4f', desc: 'Analyzed cohort retention curves and identified top 10% usage patterns.' },
]

export function TimelineView() {
  const [zoom, setZoom] = useState('Month')

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, fontSize: '24px', color: 'var(--navy)', letterSpacing: '-0.025em' }}>Timeline</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Jan 2023 – May 2025</p>
        </div>
        <div className="flex gap-1 p-1 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--secondary)' }}>
          {['Month', 'Quarter', 'Year', 'All'].map(z => (
            <Button variant="ghost" size="auto" key={z} onClick={() => setZoom(z)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
              style={zoom === z ? { background: '#fff', color: 'var(--navy)', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } : { color: 'var(--muted-foreground)' }}>
              {z}
            </Button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8">
        {['All Projects', 'Source', 'Date Range'].map(f => (
          <Button variant="ghost" size="auto" key={f} className="px-3 py-2 rounded-xl border text-xs font-medium hover:bg-[var(--secondary)]" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>{f}</Button>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[148px] top-0 bottom-0 w-px hidden lg:block" style={{ background: 'var(--border)' }} />

        <div className="flex flex-col gap-0">
          {timelineEvents.map((ev, i) => (
            <div key={i} className="flex gap-6 group">
              {/* Date */}
              <div className="hidden lg:block w-36 shrink-0 text-right pt-4 pb-4">
                <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>{ev.date}</span>
              </div>

              {/* Dot */}
              <div className="hidden lg:flex flex-col items-center shrink-0">
                <div className="w-3 h-3 rounded-full border-2 mt-[18px] z-10 relative transition-all group-hover:scale-125" style={{ borderColor: ev.sourceColor, background: '#fff' }} />
              </div>

              {/* Card */}
              <div className="flex-1 pb-4">
                <div className="rounded-xl border bg-white p-4 hover:shadow-md transition-shadow cursor-pointer" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--navy)' }}>{ev.title}</span>
                    <div className="flex items-center gap-1.5 text-xs shrink-0">
                      <span className="w-2 h-2 rounded-full" style={{ background: ev.sourceColor }} />
                      <span style={{ color: 'var(--muted-foreground)' }}>{ev.source}</span>
                    </div>
                  </div>
                  <p className="text-xs mb-2 leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>{ev.desc}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--pink-soft)', color: 'var(--pink)' }}>{ev.project}</span>
                    <span className="text-xs lg:hidden" style={{ color: 'var(--muted-foreground)' }}>{ev.date}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ===== Search View =====
const searchResults = [
  { title: 'Positioning strategy for B2B SaaS launch', snippet: 'The primary <mark>differentiation</mark> should focus on time-to-value rather than feature depth. Enterprise buyers want to see ROI within the first 30 days...', source: 'ChatGPT', sourceColor: '#10a37f', project: 'Go-to-Market', date: 'Mar 14, 2024', topics: ['positioning', 'B2B'] },
  { title: 'ICP definition and segmentation', snippet: 'The ideal ICP profile for an engineering productivity tool targeting <mark>mid-market</mark> starts with Series B–D funded companies with 15–100 engineers...', source: 'ChatGPT', sourceColor: '#10a37f', project: 'Go-to-Market', date: 'Jun 2, 2024', topics: ['ICP', 'segmentation'] },
  { title: 'Q2 competitive teardown — Notion', snippet: 'Notion\'s recent AI integration announcement signals a shift from <mark>productivity</mark> to knowledge management. Their pricing structure creates a clear opening...', source: 'Gemini', sourceColor: '#4285f4', project: 'Competitive Research', date: 'Apr 5, 2024', topics: ['competitive', 'Notion'] },
]

export function SearchView({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [query, setQuery] = useState('positioning strategy')
  const [hasSearched, setHasSearched] = useState(true)

  return (
    <div className="p-6 lg:p-8">
      <h1 style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, fontSize: '24px', color: 'var(--navy)', letterSpacing: '-0.025em', marginBottom: '20px' }}>
        Search Archive
      </h1>

      {/* Search field */}
      <div className="relative mb-4">
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && setHasSearched(true)}
          placeholder="Search your entire AI history..."
          className="h-14 w-full rounded-2xl pl-12 pr-32 text-[15px] shadow-[0_2px_8px_rgba(0,0,0,0.04)]" />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl" style={{ color: 'var(--muted-foreground)' }}>⌕</span>
        <Button variant="ghost" size="auto" onClick={() => setHasSearched(true)} className="btn-blue absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 text-sm rounded-xl">Search</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['All Projects', 'All Sources', 'All Topics', 'All Dates'].map(f => (
          <Button variant="ghost" size="auto" key={f} className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-[var(--secondary)]" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>{f}</Button>
        ))}
      </div>

      {hasSearched && (
        <div>
          <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
            <span className="font-semibold" style={{ color: 'var(--navy)' }}>3 results</span> for "{query}"
          </p>

          <div className="flex flex-col gap-3">
            {searchResults.map((r, i) => (
              <div key={i} className="rounded-2xl border bg-white p-5 hover:shadow-md transition-shadow cursor-pointer" style={{ borderColor: 'var(--border)' }}
                onClick={() => onNavigate('conversation-detail')}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-base" style={{ fontFamily: 'var(--font-inter-tight), sans-serif', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--navy)' }}>{r.title}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: 'var(--pink-soft)', color: 'var(--pink)' }}>{r.project}</span>
                </div>
                <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--muted-foreground)' }}
                  dangerouslySetInnerHTML={{ __html: r.snippet }} />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: r.sourceColor }} />
                      {r.source}
                    </span>
                    <span>{r.date}</span>
                    {r.topics.map(t => <span key={t} className="px-1.5 py-0.5 rounded border" style={{ borderColor: 'var(--border)' }}>{t}</span>)}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="auto" className="text-xs font-semibold" style={{ color: 'var(--pink)' }}>Open Conversation</Button>
                    <Button variant="ghost" size="auto" className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Open Project</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
