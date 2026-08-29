"use client";

import { Button } from "@/components/ui/button";
import { RefineryLineChart } from "@/components/common/RefineryCharts";

interface LandingProps {
  onNavigate: (page: string) => void
}

type IconName =
  | "upload"
  | "lock"
  | "scan"
  | "tag"
  | "folder"
  | "cluster"
  | "link"
  | "search"
  | "bolt"
  | "play"
  | "check"

function Icon({ name, size = 18, strokeWidth = 1.9 }: { name: IconName; size?: number; strokeWidth?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  }

  if (name === "upload") {
    return (
      <svg {...common}>
        <path d="M7 18.5H6a4 4 0 0 1-.6-7.95A6.5 6.5 0 0 1 18 8.5v.25A4.75 4.75 0 0 1 18.25 18H17" />
        <path d="M12 17V8" />
        <path d="m8.5 11.5 3.5-3.5 3.5 3.5" />
      </svg>
    )
  }
  if (name === "lock") {
    return (
      <svg {...common}>
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
      </svg>
    )
  }
  if (name === "scan") {
    return (
      <svg {...common}>
        <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
        <path d="M7 12h10" />
      </svg>
    )
  }
  if (name === "tag") {
    return (
      <svg {...common}>
        <path d="M20 13 11 22l-9-9V4a2 2 0 0 1 2-2h9Z" />
        <circle cx="8" cy="8" r="1.5" />
      </svg>
    )
  }
  if (name === "folder") {
    return (
      <svg {...common}>
        <path d="M3 7.5h6l2 2h10v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
        <path d="M3 7.5V6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1.5" />
      </svg>
    )
  }
  if (name === "cluster") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3" />
        <circle cx="5" cy="5" r="2" />
        <circle cx="19" cy="5" r="2" />
        <circle cx="5" cy="19" r="2" />
        <circle cx="19" cy="19" r="2" />
        <path d="m7 7 3 3M17 7l-3 3M7 17l3-3M17 17l-3-3" />
      </svg>
    )
  }
  if (name === "link") {
    return (
      <svg {...common}>
        <path d="M10.5 13.5 13.5 10.5" />
        <path d="M7.25 15.75 5.5 17.5a3.54 3.54 0 0 0 5 5l3.25-3.25a3.54 3.54 0 0 0 0-5" transform="translate(0 -2)" />
        <path d="m16.75 8.25 1.75-1.75a3.54 3.54 0 0 0-5-5L10.25 4.75a3.54 3.54 0 0 0 0 5" transform="translate(0 2)" />
      </svg>
    )
  }
  if (name === "search") {
    return (
      <svg {...common}>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m15.5 15.5 5 5" />
      </svg>
    )
  }
  if (name === "bolt") {
    return (
      <svg {...common}>
        <path d="M13 2 5.5 13H11l-1 9 8.5-12H13Z" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  if (name === "play") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="m10 8 6 4-6 4Z" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="m5 12 4 4L19 6" />
    </svg>
  )
}

const timelineData = [
  { month: "Jan 23", chats: 16 },
  { month: "Mar 23", chats: 24 },
  { month: "Jun 23", chats: 33 },
  { month: "Sep 23", chats: 48 },
  { month: "Dec 23", chats: 56 },
  { month: "Mar 24", chats: 70 },
  { month: "Jun 24", chats: 86 },
  { month: "Sep 24", chats: 93 },
  { month: "Jan 25", chats: 105 },
  { month: "May 25", chats: 119 },
]

const clusters = [
  { name: "Go-to-Market Strategy", pct: 89 },
  { name: "Product Roadmap & Features", pct: 76 },
  { name: "User Research & Insights", pct: 64 },
]

const platforms = [
  { name: "ChatGPT", mark: "◎", color: "#10A37F" },
  { name: "Claude", mark: "✳", color: "#D97745" },
  { name: "Gemini", mark: "✦", color: "#4285F4" },
  { name: "Copilot", mark: "◆", color: "#0B76E0" },
  { name: "Poe", mark: "▣", color: "#7C3AED" },
]

const features: Array<{ icon: IconName; title: string; sub: string }> = [
  { icon: "folder", title: "AUTO-ORGANIZE", sub: "Into projects" },
  { icon: "cluster", title: "CLUSTER", sub: "By topic & intent" },
  { icon: "link", title: "SOURCE-LINK", sub: "Every message" },
  { icon: "search", title: "SEARCH", sub: "Across your archive" },
]

const testimonials = [
  {
    text: "I had 3 years of ChatGPT exports. Brain2 Labs turned it into 28 projects I could actually navigate.",
    author: "Product Manager, SaaS startup",
  },
  {
    text: "The source linking is remarkable. I can trace every insight back to the original conversation.",
    author: "Independent researcher",
  },
  {
    text: "$29 one-time was an easy decision. The organized archive is genuinely useful offline.",
    author: "Freelance writer",
  },
]

const sidebarProjects = [
  { name: "Business & Strategy", dot: "#27C5E8" },
  { name: "Product Ideas", dot: "#F5008F" },
  { name: "Writing & Content", dot: "#7C4DFF" },
  { name: "Learning & Research", dot: "#F5B331" },
  { name: "Personal", dot: "#24B36B" },
]

function NeonBrain() {
  return (
    <svg viewBox="0 0 220 150" className="w-full h-full" aria-hidden="true">
      <defs>
        <filter id="brainGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="brainStroke" x1="10" y1="30" x2="195" y2="125" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3EF3FF" />
          <stop offset="0.42" stopColor="#168BFF" />
          <stop offset="0.72" stopColor="#A04CFF" />
          <stop offset="1" stopColor="#FF3AAE" />
        </linearGradient>
      </defs>
      <g filter="url(#brainGlow)" fill="none" stroke="url(#brainStroke)" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M92 126c-9 3-21-2-24-12-11 1-20-7-20-18-13-2-20-17-13-28-7-13 1-29 15-31 3-14 18-22 31-16 10-12 30-12 40 0 15-6 31 3 33 18 14 4 20 20 13 32 8 12 1 29-13 32-2 12-12 21-24 20-6 12-22 16-33 8-2 8-7 15-15 19" />
        <path d="M92 35c-11 3-18 13-18 24M72 56c11 0 19 7 21 16M92 72c-9 5-12 15-8 24M84 97c9-1 17 5 20 13" />
        <path d="M119 34c10 4 16 14 14 25M134 57c-11 1-19 8-20 18M115 74c10 5 14 15 10 25M126 99c-9-1-17 5-20 13" />
        <path d="M103 25v100M57 79h20M143 79h22M77 109h12M116 110h14" />
      </g>
      <circle cx="46" cy="42" r="2" fill="#fff" opacity=".85" />
      <circle cx="168" cy="30" r="1.6" fill="#fff" opacity=".9" />
      <circle cx="181" cy="112" r="2.3" fill="#FFD7F2" opacity=".9" />
    </svg>
  )
}

export default function LandingScreen({ onNavigate }: LandingProps) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      {/* HERO */}
      <section className="bg-white">
        <div className="max-w-[1180px] mx-auto px-5 lg:px-7 pt-10 lg:pt-12 pb-5">
          <div className="grid lg:grid-cols-[0.96fr_1.04fr] gap-8 lg:gap-12 items-start">
            <div className="fade-in-up pt-1">
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] mb-5"
                style={{ background: "#FFF2F9", color: "var(--pink)", fontWeight: 700 }}
              >
                <span className="text-[12px] leading-none">✦</span>
                NEW — AI Chat-History Refinery
              </div>

              <p className="text-[13px] mb-3" style={{ fontWeight: 650, color: "var(--foreground)" }}>
                Turn messy exports into structured knowledge.
              </p>

              <div
                className="font-tight uppercase"
                style={{
                  fontFamily: "var(--font-inter-tight), sans-serif",
                  fontWeight: 900,
                  lineHeight: 0.88,
                  letterSpacing: "-0.047em",
                  fontSize: "clamp(54px, 6.4vw, 82px)",
                }}
              >
                <div style={{ color: "var(--foreground)" }}>AI CHAT-</div>
                <div style={{ color: "var(--foreground)" }}>HISTORY</div>
                <div className="refinery-gradient">REFINERY</div>
              </div>

              <p
                className="mt-5 text-[14px] leading-[1.55] max-w-[500px]"
                style={{ color: "var(--foreground)", fontWeight: 600 }}
              >
                Upload your exported AI chats and turn them into a beautifully organized, searchable archive.
              </p>
              <p className="mt-2 text-[12px] leading-[1.65] max-w-[510px]" style={{ color: "var(--secondary-text)" }}>
                We analyze, structure, and link your conversations into projects, topics, timelines, and source-linked knowledge—so important ideas never disappear in endless chat history.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button variant="ghost" size="auto"
                  onClick={() => onNavigate("upload")}
                  className="btn-blue px-5 py-3 text-[12px] rounded-[10px] flex items-center gap-2 shadow-blue-cta"
                >
                  <Icon name="bolt" size={14} />
                  START FREE SCAN →
                </Button>
                <Button variant="ghost" size="auto"
                  onClick={() => onNavigate("examples")}
                  className="px-5 py-3 text-[12px] rounded-[10px] border bg-white flex items-center gap-2 transition-all hover:bg-[#FAFBFD]"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)", fontWeight: 650 }}
                >
                  <span style={{ color: "var(--blue)" }}><Icon name="play" size={15} /></span>
                  SEE EXAMPLE
                </Button>
              </div>
            </div>

            <div className="fade-in-up min-w-0" style={{ animationDelay: "0.08s" }}>
              <div className="rounded-[20px] border bg-white p-4 lg:p-5 hero-upload-card">
                <div className="flex items-center mb-4">
                  {["Upload Export", "Free Scan", "See Results"].map((step, i) => (
                    <div key={step} className="flex items-center flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] shrink-0"
                          style={
                            i === 0
                              ? { background: "var(--pink)", color: "white", fontWeight: 800 }
                              : { background: "#F4F5F8", color: "#676D7E", fontWeight: 700 }
                          }
                        >
                          {i + 1}
                        </div>
                        <span
                          className="text-[10px] whitespace-nowrap"
                          style={{ color: i === 0 ? "var(--pink)" : "#6C7282", fontWeight: i === 0 ? 700 : 550 }}
                        >
                          {step}
                        </span>
                      </div>
                      {i < 2 && <div className="h-px flex-1 mx-2 lg:mx-3" style={{ background: "#ECEEF3" }} />}
                    </div>
                  ))}
                </div>

                <Button variant="ghost" size="auto"
                  onClick={() => onNavigate("upload")}
                  className="w-full min-w-0 flex-col gap-0 whitespace-normal rounded-[14px] border-[1.5px] border-dashed px-4 py-7 lg:py-8 text-center transition-colors hover:bg-[#FFF9FC]"
                  style={{ borderColor: "#F23AA5", background: "#FFFDFE" }}
                >
                  <div className="mx-auto mb-3 w-12 h-10 flex items-center justify-center" style={{ color: "var(--pink)" }}>
                    <Icon name="upload" size={42} strokeWidth={2.2} />
                  </div>
                  <div
                    className="font-tight text-[14px] leading-[1.2] max-w-[280px] mx-auto"
                    style={{ color: "var(--foreground)", fontWeight: 800, letterSpacing: "-0.015em" }}
                  >
                    Drag & drop your exported chat history
                    <br />
                    (ZIP)
                  </div>
                  <div className="text-[10px] mt-2" style={{ color: "var(--secondary-text)" }}>
                    Works with ChatGPT, Claude, Gemini, Copilot,
                    <br className="hidden sm:block" /> Poe, and more.
                  </div>
                  <span className="btn-pink inline-flex px-5 py-2.5 mt-4 text-[10px] rounded-[8px] shadow-pink-cta">
                    CHOOSE ZIP FILE
                  </span>
                  <div className="mt-3 flex items-center justify-center gap-1 text-[9px]" style={{ color: "#666C7C" }}>
                    <Icon name="lock" size={11} />
                    Your files are private and encrypted.
                  </div>
                </Button>

                <div className="mt-4 rounded-[14px] px-4 py-3.5 grid sm:grid-cols-[auto_1fr] gap-3 sm:gap-5 items-start" style={{ background: "#FFF0F8" }}>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[10px] font-extrabold" style={{ color: "var(--pink)" }}>FREE SCAN</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full text-white font-bold" style={{ background: "var(--pink)" }}>FREE</span>
                  </div>
                  <div className="grid gap-1.5">
                    {["Counts & estimates", "Project & topic preview", "No payment required"].map((item) => (
                      <div key={item} className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--foreground)", fontWeight: 550 }}>
                        <span style={{ color: "var(--pink)" }}><Icon name="check" size={12} strokeWidth={2.2} /></span>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-y-3" style={{ borderColor: "#F0F1F4" }}>
            {[
              { icon: "lock" as IconName, label: "PRIVATE & ENCRYPTED" },
              { icon: "scan" as IconName, label: "FREE SCAN, NO CARD" },
              { icon: "tag" as IconName, label: "$29 ONE-TIME" },
            ].map((item, i) => (
              <div key={item.label} className="flex items-center">
                {i > 0 && <span className="hidden sm:block w-px h-4 mx-4 lg:mx-5" style={{ background: "#E7E9EF" }} />}
                <div className="flex items-center gap-1.5 text-[9px] tracking-[0.06em]" style={{ color: "#666C7C", fontWeight: 650 }}>
                  <span style={{ color: "var(--pink)" }}><Icon name={item.icon} size={11} /></span>
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Utility features */}
      <section className="bg-white">
        <div className="max-w-[1180px] mx-auto px-5 lg:px-7 py-5 border-y" style={{ borderColor: "#ECEEF3" }}>
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className={`flex items-center gap-3 py-3 ${i % 2 === 1 ? "pl-4" : ""} lg:px-5 ${i > 0 ? "lg:border-l" : ""}`}
                style={{ borderColor: "#ECEEF3" }}
              >
                <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0" style={{ background: "#FFF1F8", color: "var(--pink)" }}>
                  <Icon name={feature.icon} size={17} />
                </div>
                <div>
                  <div className="text-[9px] tracking-[0.025em]" style={{ color: "var(--foreground)", fontWeight: 750 }}>{feature.title}</div>
                  <div className="text-[9px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{feature.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Archive preview */}
      <section className="bg-white py-11 lg:py-14">
        <div className="max-w-[1180px] mx-auto px-5 lg:px-7">
          <div className="text-center mb-7">
            <div className="text-[9px] tracking-[0.16em] mb-2" style={{ color: "var(--blue)", fontWeight: 800 }}>ARCHIVE PREVIEW</div>
            <h2
              className="font-tight uppercase"
              style={{
                fontFamily: "var(--font-inter-tight), sans-serif",
                color: "var(--foreground)",
                fontWeight: 850,
                fontSize: "clamp(30px, 3.8vw, 45px)",
                lineHeight: 0.95,
                letterSpacing: "-0.04em",
              }}
            >
              YOUR CONVERSATIONS,
              <br />
              FINALLY ORGANIZED<span style={{ color: "var(--pink)" }}>.</span>
            </h2>
          </div>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_285px] gap-5 items-stretch">
            <div className="rounded-[16px] border overflow-hidden archive-panel" style={{ borderColor: "var(--border)" }}>
              <div className="h-9 px-4 flex items-center justify-between border-b bg-white" style={{ borderColor: "var(--border)" }}>
                <span className="font-tight text-[11px]" style={{ color: "var(--foreground)", fontWeight: 800 }}>Archive Overview</span>
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#FF2D95" }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#F6B82E" }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#32C765" }} />
                </div>
              </div>

              <div className="flex min-h-[360px] bg-white">
                <aside className="hidden sm:block w-[145px] border-r px-3 py-4 shrink-0" style={{ borderColor: "var(--border)", background: "#FBFCFE" }}>
                  <div className="text-[8px] uppercase tracking-[0.11em] px-2 mb-2" style={{ color: "#8A90A0", fontWeight: 750 }}>OVERVIEW</div>
                  {["Dashboard", "Projects", "Conversations", "Timeline", "Search"].map((item, i) => (
                    <div
                      key={item}
                      className="px-2.5 py-1.5 rounded-[7px] text-[9px] mb-0.5"
                      style={i === 0 ? { color: "#fff", background: "var(--blue)", fontWeight: 650 } : { color: "#50576B", fontWeight: 550 }}
                    >
                      {item}
                    </div>
                  ))}
                  <div className="text-[8px] uppercase tracking-[0.11em] px-2 mt-4 mb-2" style={{ color: "#8A90A0", fontWeight: 750 }}>PROJECTS</div>
                  {sidebarProjects.map((project) => (
                    <div key={project.name} className="flex items-center gap-1.5 px-2 py-1.5 text-[8px]" style={{ color: "#555B6B" }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: project.dot }} />
                      <span className="truncate">{project.name}</span>
                    </div>
                  ))}
                </aside>

                <div className="flex-1 min-w-0 p-3.5 lg:p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-2.5">
                    {[
                      { label: "Word Count", value: "1,248,591" },
                      { label: "Conversations", value: "236" },
                      { label: "Est. Projects", value: "28" },
                      { label: "Date Range", value: "Jan 23 –\nMay 25" },
                    ].map((metric) => (
                      <div key={metric.label} className="rounded-[10px] border px-2.5 py-2.5 bg-white min-h-[58px]" style={{ borderColor: "#ECEEF3" }}>
                        <div className="text-[7px] mb-1" style={{ color: "#858A9B" }}>{metric.label}</div>
                        <div className="font-tight whitespace-pre-line text-[11px] leading-[1.05]" style={{ color: "var(--foreground)", fontWeight: 850, letterSpacing: "-0.02em" }}>
                          {metric.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid md:grid-cols-2 gap-2.5 mb-2.5">
                    <div className="rounded-[10px] border p-2.5 h-[130px]" style={{ borderColor: "#ECEEF3" }}>
                      <div className="text-[8px] mb-1" style={{ color: "var(--foreground)", fontWeight: 750 }}>Project Timeline</div>
                      <RefineryLineChart data={timelineData.map((item) => ({ label: item.month, value: item.chats }))} height={100} compact />
                    </div>
                    <div className="rounded-[10px] border p-2.5 h-[130px]" style={{ borderColor: "#ECEEF3" }}>
                      <div className="text-[8px] mb-2" style={{ color: "var(--foreground)", fontWeight: 750 }}>Top Conversation Clusters</div>
                      {clusters.map((cluster) => (
                        <div key={cluster.name} className="mb-2.5">
                          <div className="flex justify-between text-[7px] mb-1">
                            <span className="truncate pr-2" style={{ color: "#373C4C", fontWeight: 600 }}>{cluster.name}</span>
                            <span style={{ color: cluster.pct === 89 ? "var(--pink)" : "#4A5060", fontWeight: 800 }}>{cluster.pct}%</span>
                          </div>
                          <div className="h-[4px] rounded-full" style={{ background: "#EEF1F6" }}>
                            <div className="h-full rounded-full" style={{ width: `${cluster.pct}%`, background: cluster.pct === 89 ? "linear-gradient(90deg,#075DFF,#F5008F)" : "#075DFF" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[10px] border p-2.5" style={{ borderColor: "#ECEEF3", background: "#FBFCFE" }}>
                    <div className="text-[8px] mb-1.5" style={{ color: "var(--foreground)", fontWeight: 750 }}>Source-Linked Result</div>
                    <div className="flex gap-2.5 items-start">
                      <div className="w-7 h-7 rounded-[8px] flex items-center justify-center text-[8px] shrink-0" style={{ background: "#DDF8EC", color: "#0C9369", fontWeight: 800 }}>GPT</div>
                      <div className="min-w-0">
                        <div className="text-[8px] leading-[1.2]" style={{ color: "var(--foreground)", fontWeight: 700 }}>Positioning strategy for B2B SaaS launch</div>
                        <div className="text-[7px] leading-[1.35] mt-1" style={{ color: "#6D7382" }}>
                          “The primary differentiation should focus on time-to-value rather than feature depth. Enterprise buyers want...”
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1.5 text-[6.5px]">
                          <span style={{ color: "var(--pink)", fontWeight: 700 }}>Go-to-Market</span>
                          <span style={{ color: "#7A8090" }}>ChatGPT · Mar 2024</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[16px] border bg-white p-5 pricing-mini-card" style={{ borderColor: "var(--border)" }}>
              <div className="text-[8px] tracking-[0.1em] mb-3" style={{ color: "var(--blue)", fontWeight: 800 }}>ONE-TIME PROCESSING</div>
              <div className="flex items-end gap-1.5">
                <div className="font-tight text-[48px] leading-none" style={{ color: "var(--foreground)", fontWeight: 900, letterSpacing: "-0.055em" }}>$29</div>
                <div className="text-[8px] pb-1.5" style={{ color: "#666C7C", fontWeight: 600 }}>ONE-TIME</div>
              </div>
              <div className="text-[9px] mt-2 mb-4" style={{ color: "#777D8C" }}>No subscriptions. No hidden fees.</div>
              <div className="space-y-2 mb-5">
                {[
                  "Unlimited exported chats",
                  "Full organized archive",
                  "Project grouping & timelines",
                  "Source links & search index",
                  "HTML / Markdown / CSV exports",
                  "Works offline after delivery",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 text-[8.5px]" style={{ color: "#333847", fontWeight: 550 }}>
                    <span className="mt-px" style={{ color: "var(--pink)" }}><Icon name="check" size={11} strokeWidth={2.2} /></span>
                    {item}
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="auto" onClick={() => onNavigate("upload")} className="btn-pink w-full py-3 rounded-[9px] text-[10px] flex items-center justify-center gap-1.5 shadow-pink-cta">
                <Icon name="bolt" size={12} /> START FREE SCAN
              </Button>
              <div className="text-[8px] mt-2.5 text-center" style={{ color: "#808696" }}>Free scan. Pay only when you're ready.</div>
            </div>
          </div>

          <div className="mt-7 text-center">
            <div className="text-[8px] tracking-[0.14em] mb-3" style={{ color: "var(--blue)", fontWeight: 800 }}>WORKS WITH EXPORTS FROM</div>
            <div className="flex flex-wrap gap-2.5 justify-center">
              {platforms.map((platform) => (
                <div key={platform.name} className="platform-chip flex items-center gap-2 px-3.5 py-2 rounded-full border bg-white text-[10px]" style={{ borderColor: "#E8EAF0", color: "#343949", fontWeight: 650 }}>
                  <span className="text-[15px] leading-none" style={{ color: platform.color }}>{platform.mark}</span>
                  {platform.name}
                </div>
              ))}
              <div className="platform-chip px-3.5 py-2 rounded-full border bg-white text-[10px]" style={{ borderColor: "#E8EAF0", color: "#666C7C", fontWeight: 600 }}>and more</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white pt-4 pb-5">
        <div className="max-w-[1080px] mx-auto px-5 lg:px-7">
          <div className="text-center mb-5">
            <div className="text-[8px] tracking-[0.15em] mb-1.5" style={{ color: "var(--pink)", fontWeight: 850 }}>WHAT PEOPLE SAY</div>
            <h2
              className="font-tight uppercase"
              style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--foreground)", fontWeight: 850, fontSize: "clamp(25px, 3vw, 36px)", letterSpacing: "-0.04em", lineHeight: 1 }}
            >
              REAL ARCHIVES. REAL RESULTS.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-3.5">
            {testimonials.map((testimonial) => (
              <div key={testimonial.author} className="testimonial-card rounded-[13px] border bg-white px-4 py-4" style={{ borderColor: "#ECEEF3" }}>
                <div className="text-[10px] tracking-[0.05em] mb-2" style={{ color: "var(--pink)" }}>★★★★★</div>
                <div className="text-[10px] leading-[1.45] min-h-[58px]" style={{ color: "#222635", fontWeight: 500 }}>
                  “{testimonial.text}”
                </div>
                <div className="text-[8px] mt-2" style={{ color: "#7E8493" }}>— {testimonial.author}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-white pt-3 pb-5">
        <div className="max-w-[1120px] mx-auto px-5 lg:px-7">
          <div className="cta-neon-banner relative overflow-hidden rounded-[18px] px-5 md:px-8 lg:px-10 py-5 md:py-6">
            <div className="cta-grid absolute inset-y-0 right-0 w-[48%] opacity-30 pointer-events-none" />
            <span className="sparkle sparkle-a" />
            <span className="sparkle sparkle-b" />
            <span className="sparkle sparkle-c" />
            <div className="relative grid md:grid-cols-[180px_1fr_auto] gap-4 md:gap-6 items-center">
              <div className="h-[120px] hidden md:block">
                <NeonBrain />
              </div>
              <div>
                <h2
                  className="font-tight text-white"
                  style={{ fontFamily: "var(--font-inter-tight), sans-serif", fontWeight: 800, fontSize: "clamp(25px, 3.1vw, 39px)", lineHeight: 1.02, letterSpacing: "-0.035em" }}
                >
                  Your AI chat history is a
                  <br />
                  knowledge base. Start using it.
                </h2>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[8.5px] text-white/90 tracking-[0.04em]" style={{ fontWeight: 700 }}>
                  <span className="flex items-center gap-1"><Icon name="bolt" size={9} /> FREE SCAN.</span>
                  <span>◉ $29 ONE-TIME.</span>
                  <span className="flex items-center gap-1"><Icon name="bolt" size={9} /> NO SUBSCRIPTION EVER.</span>
                </div>
              </div>
              <Button variant="ghost" size="auto"
                onClick={() => onNavigate("upload")}
                className="bg-white rounded-full px-6 py-3 text-[10px] whitespace-nowrap flex items-center justify-center gap-2 cta-white-button"
                style={{ color: "var(--pink)", fontWeight: 800 }}
              >
                <Icon name="bolt" size={13} /> START FREE SCAN
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Slim footer */}
      <footer className="bg-white">
        <div className="max-w-[1180px] mx-auto px-5 lg:px-7 py-4 border-t flex flex-col md:flex-row items-center justify-between gap-3" style={{ borderColor: "#F0F1F4" }}>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] text-white font-extrabold" style={{ background: "var(--pink)" }}>B2</div>
            <div className="leading-[1.05]">
              <div className="font-tight text-[9px]" style={{ color: "var(--foreground)", fontWeight: 850 }}>Brain2 Labs</div>
              <div className="text-[6px] tracking-[0.08em] mt-0.5" style={{ color: "#8A90A0", fontWeight: 650 }}>AI CHAT REFINERY</div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-5 text-[8px]" style={{ color: "#666C7C", fontWeight: 550 }}>
            <Button variant="ghost" size="auto" className="hover:text-[#075DFF]">Privacy Policy</Button>
            <Button variant="ghost" size="auto" className="hover:text-[#075DFF]">Terms of Service</Button>
            <Button variant="ghost" size="auto" className="hover:text-[#075DFF]">Contact</Button>
            <Button variant="ghost" size="auto" className="hover:text-[#075DFF]">Status</Button>
          </div>
          <div className="text-[7px]" style={{ color: "#858A9A" }}>© 2026 Brain2 Labs. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
