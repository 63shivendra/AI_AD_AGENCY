import { cn } from "@/lib/utils";

type Point = { date: string; leads: number; spend: number; revenue: number };

function smoothPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function Sparkline({
  data,
  color = "#c8f751",
  width = 104,
  height = 30,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const pts = data.map((v, i) => ({
    x: (i / Math.max(data.length - 1, 1)) * width,
    y: height - ((v - min) / Math.max(max - min, 1)) * (height - 4) - 2,
  }));
  const id = `sp-${color.replace("#", "")}`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${smoothPath(pts)} L ${width} ${height} L 0 ${height} Z`} fill={`url(#${id})`} />
      <path d={smoothPath(pts)} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="2.4" fill={color} />
    </svg>
  );
}

/** Evenly-spaced, human-readable axis ticks (0, 20, 40 … instead of 0, 3, 5, 8). */
function niceScale(rawMax: number, integer = false) {
  const safeMax = Math.max(rawMax, 1);
  const rough = safeMax / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  let step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  if (integer) step = Math.max(step, 1);
  const top = Math.ceil(safeMax / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step * 0.001; v += step) ticks.push(Number(v.toFixed(6)));
  return { top, ticks };
}

export function AreaChart({
  series,
  metric,
  color = "#c8f751",
  format = (n: number) => String(n),
  className,
}: {
  series: Point[];
  metric: "leads" | "spend" | "revenue";
  color?: string;
  format?: (n: number) => string;
  className?: string;
}) {
  const w = 760;
  const h = 240;
  const pad = { top: 16, right: 12, bottom: 26, left: 40 };
  const values = series.map((s) => s[metric]);
  const { top: max, ticks } = niceScale(Math.max(...values, 1), metric === "leads");
  const x = (i: number) => pad.left + (i / Math.max(series.length - 1, 1)) * (w - pad.left - pad.right);
  const y = (v: number) => pad.top + (1 - v / max) * (h - pad.top - pad.bottom);

  const pts = series.map((s, i) => ({ x: x(i), y: y(s[metric]) }));
  const line = smoothPath(pts);
  const area = `${line} L ${x(series.length - 1)} ${h - pad.bottom} L ${pad.left} ${h - pad.bottom} Z`;
  const id = `area-${metric}`;
  const labelEvery = Math.ceil(series.length / 5);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("w-full", className)} role="img" aria-label={`${metric} trend`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.left} x2={w - pad.right} y1={y(t)} y2={y(t)} stroke="#1b202a" strokeDasharray="3 5" />
          <text x={pad.left - 8} y={y(t) + 3.5} textAnchor="end" fontSize="9.5" fill="#5b6275">
            {format(t)}
          </text>
        </g>
      ))}
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {series.map((s, i) =>
        i % labelEvery === 0 || i === series.length - 1 ? (
          <text key={s.date} x={x(i)} y={h - 8} textAnchor="middle" fontSize="9.5" fill="#5b6275">
            {new Date(s.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </text>
        ) : null
      )}
      <circle cx={x(series.length - 1)} cy={y(values[values.length - 1])} r="3.5" fill={color} />
      <circle cx={x(series.length - 1)} cy={y(values[values.length - 1])} r="7" fill={color} opacity="0.18" />
    </svg>
  );
}

export function MiniBars({ data, color = "#7c6bff" }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex h-10 items-end gap-[3px]">
      {data.map((v, i) => (
        <div
          key={i}
          className="w-full rounded-sm transition-all"
          style={{ height: `${Math.max((v / max) * 100, 6)}%`, background: color, opacity: 0.35 + (v / max) * 0.65 }}
        />
      ))}
    </div>
  );
}
