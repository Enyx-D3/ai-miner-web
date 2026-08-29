"use client";

type LineDatum = { label: string; value: number };
type DonutDatum = { name: string; value: number; color: string };
type BarDatum = { name: string; value: number };

export function RefineryLineChart({ data, height = 180, compact = false }: { data: LineDatum[]; height?: number; compact?: boolean }) {
  const width = 640;
  const padX = compact ? 12 : 28;
  const padY = compact ? 10 : 24;
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const span = Math.max(max - min, 1);
  const points = data.map((d, i) => {
    const x = padX + (i * (width - padX * 2)) / Math.max(data.length - 1, 1);
    const y = height - padY - ((d.value - min) / span) * (height - padY * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Conversation timeline chart">
        {!compact && [0.25, 0.5, 0.75].map((ratio) => (
          <line key={ratio} x1={padX} x2={width-padX} y1={padY+(height-padY*2)*ratio} y2={padY+(height-padY*2)*ratio} stroke="#e9eaf0" strokeDasharray="4 5" />
        ))}
        <polyline points={points} fill="none" stroke="#075dff" strokeWidth={compact ? 4 : 3} strokeLinecap="round" strokeLinejoin="round" />
        {!compact && data.map((d, i) => {
          const [x,y] = points.split(" ")[i].split(",").map(Number);
          return <circle key={d.label} cx={x} cy={y} r="3.3" fill="#075dff" />;
        })}
      </svg>
      {!compact && (
        <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
          {data.filter((_, i) => i === 0 || i === data.length - 1 || i % Math.max(Math.ceil(data.length/4),1) === 0).map((d) => <span key={d.label}>{d.label}</span>)}
        </div>
      )}
    </div>
  );
}

export function RefineryDonutChart({ data, size = 130 }: { data: DonutDatum[]; size?: number }) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  let current = 0;
  const stops = data.map((item) => {
    const start = (current / total) * 100;
    current += item.value;
    const end = (current / total) * 100;
    return `${item.color} ${start}% ${end}%`;
  }).join(", ");

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative rounded-full" style={{ width: size, height: size, background: `conic-gradient(${stops})` }}>
        <div className="absolute inset-[27%] rounded-full bg-white" />
        <div className="absolute inset-0 flex items-center justify-center font-tight text-sm font-extrabold text-foreground">{total}</div>
      </div>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {data.map((item) => <span key={item.name} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><i className="size-2 rounded-full" style={{ background:item.color }} />{item.name}</span>)}
      </div>
    </div>
  );
}

export function RefineryHorizontalBars({ data }: { data: BarDatum[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2.5">
      {data.map((item) => (
        <div key={item.name} className="grid grid-cols-[96px_1fr_24px] items-center gap-2 text-[10px]">
          <span className="truncate text-[var(--secondary-text)]">{item.name}</span>
          <span className="h-2 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-[var(--blue)]" style={{ width:`${(item.value/max)*100}%` }} /></span>
          <span className="text-right font-bold text-muted-foreground">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
