import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { scoreTone } from "@/lib/format";

const STATUS: Record<string, string> = {
  ACTIVE: "border-lime/25 bg-lime/10 text-lime",
  PUBLISHED: "border-mint/25 bg-mint/10 text-mint",
  READY: "border-line2 bg-panel2 text-chalk",
  DRAFT: "border-line2 bg-panel2 text-dim",
  RENDERING: "border-amber/30 bg-amber/10 text-amber",
  PAUSED: "border-amber/25 bg-amber/10 text-amber",
  FATIGUED: "border-rose/25 bg-rose/10 text-rose",
  PROSPECT: "border-violet/30 bg-violet/10 text-violet",
  CHURNED: "border-rose/25 bg-rose/10 text-rose",
  NEW: "border-violet/30 bg-violet/10 text-violet",
  CONTACTED: "border-amber/25 bg-amber/10 text-amber",
  WON: "border-mint/25 bg-mint/10 text-mint",
  LOST: "border-line2 bg-panel2 text-faint",
  GENERATED: "border-line2 bg-panel2 text-dim",
  POSTED: "border-mint/25 bg-mint/10 text-mint",
  DONE: "border-mint/25 bg-mint/10 text-mint",
  RUNNING: "border-amber/30 bg-amber/10 text-amber",
  QUEUED: "border-line2 bg-panel2 text-dim",
  FAILED: "border-rose/25 bg-rose/10 text-rose",
  LOCAL: "border-line2 bg-panel2 text-dim",
  GROWTH: "border-violet/25 bg-violet/10 text-violet",
  SCALE: "border-lime/25 bg-lime/10 text-lime",
  AGENCY: "border-amber/25 bg-amber/10 text-amber",
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider",
        STATUS[status] ?? "border-line2 bg-panel2 text-dim",
        className
      )}
    >
      {(status === "PUBLISHED" || status === "ACTIVE" || status === "RUNNING") && (
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {status.toLowerCase()}
    </span>
  );
}

export function Card({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
}) {
  const Tag = as;
  return <Tag className={cn("card", className)}>{children}</Tag>;
}

export function SectionHead({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight text-chalk">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[12.5px] text-dim">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Delta({ value, invert = false }: { value: number; invert?: boolean }) {
  if (!value) return <span className="text-[11px] font-semibold text-faint">—</span>;
  const good = invert ? value < 0 : value > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold",
        good ? "bg-mint/10 text-mint" : "bg-rose/10 text-rose"
      )}
    >
      {value > 0 ? "↑" : "↓"} {Math.abs(value)}%
    </span>
  );
}

export function ScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const fill = (score / 100) * c;
  const color = score >= 85 ? "#43e0a0" : score >= 70 ? "#c8f751" : score >= 55 ? "#ffb020" : "#ff5f6d";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#222834" strokeWidth={4} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={`${fill} ${c}`}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[12px] font-bold tabular-nums"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}

export function HealthBar({ value }: { value: number }) {
  const color = value >= 80 ? "bg-mint" : value >= 60 ? "bg-lime" : value >= 40 ? "bg-amber" : "bg-rose";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-line">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[11px] font-semibold tabular-nums text-dim">{value}</span>
    </div>
  );
}

export function Avatar({
  name,
  emoji,
  color,
  size = 36,
}: {
  name: string;
  emoji?: string;
  color?: string;
  size?: number;
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-xl border text-[15px]"
      style={{
        width: size,
        height: size,
        background: `${color ?? "#C8F751"}14`,
        borderColor: `${color ?? "#C8F751"}30`,
      }}
    >
      {emoji ?? name.slice(0, 1)}
    </div>
  );
}

export function Kpi({
  label,
  value,
  sub,
  delta,
  invert,
  accent,
  children,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: number;
  invert?: boolean;
  accent?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div className="flex items-start justify-between">
        <p className="label">{label}</p>
        {delta !== undefined && <Delta value={delta} invert={invert} />}
      </div>
      <p className="mt-2 text-[26px] font-semibold leading-none tracking-tight tabular-nums">{value}</p>
      {sub && <p className="mt-1.5 text-[11.5px] text-dim">{sub}</p>}
      {accent}
      {children}
    </Card>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line2 px-6 py-10 text-center">
      <p className="text-[13px] font-semibold text-chalk">{title}</p>
      <p className="max-w-xs text-[12px] text-dim">{body}</p>
      {action}
    </div>
  );
}

/** Reel-style preview used everywhere an ad is shown. */
export function AdFrame({
  hook,
  brand,
  area,
  color = "#C8F751",
  poster,
  video,
  score,
  className,
  small,
}: {
  hook: string;
  brand: string;
  area: string;
  color?: string;
  poster?: string | null;
  video?: string | null;
  score?: number;
  className?: string;
  small?: boolean;
}) {
  if (video) {
    return (
      <div className={cn("relative aspect-[9/16] overflow-hidden rounded-xl bg-ink", className)}>
        <video
          src={video}
          poster={poster ?? undefined}
          className="h-full w-full object-cover"
          controls
          playsInline
          preload="metadata"
        />
        <div className="pointer-events-none absolute left-2 top-2 z-10 flex items-center gap-1 rounded-md bg-ink/75 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-lime backdrop-blur">
          <span className="text-[7px] leading-none">▶</span> Reel
        </div>
        {score !== undefined && (
          <div className="absolute right-2 top-2">
            <span className={cn("rounded-md bg-ink/80 px-1.5 py-0.5 text-[10px] font-bold backdrop-blur", scoreTone(score))}>
              {score}
            </span>
          </div>
        )}
      </div>
    );
  }

  if (poster) {
    return (
      <div className={cn("relative aspect-[9/16] overflow-hidden rounded-xl bg-ink", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={poster} alt={hook} className="h-full w-full object-cover" />
        {score !== undefined && (
          <div className="absolute right-2 top-2">
            <span className={cn("rounded-md bg-ink/80 px-1.5 py-0.5 text-[10px] font-bold backdrop-blur", scoreTone(score))}>
              {score}
            </span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-ink/90 to-transparent p-2 pt-6 text-[9px] font-semibold uppercase tracking-wider text-chalk/60">
          <span className="h-1 w-1 rounded-full bg-chalk/40" /> Cover
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("relative flex aspect-[9/16] flex-col overflow-hidden rounded-xl", className)}
      style={{ background: `linear-gradient(155deg, #080A07 30%, ${color}28 100%)` }}
    >
      <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: color }} />
      <div className={cn("flex flex-col p-3", small && "p-2")}>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-0.5 rounded-full" style={{ background: color }} />
          <span className="text-[7px] font-bold uppercase tracking-[0.18em] text-chalk/90">{brand}</span>
        </div>
        <span className="mt-0.5 text-[6px] uppercase tracking-[0.14em] text-chalk/40">{area}</span>
      </div>
      <div className="flex flex-1 items-center px-3">
        <p className={cn("font-bold leading-[1.08] text-[#F4F7EE]", small ? "text-[13px]" : "text-[16px]")}>
          {hook}
        </p>
      </div>
      <div className="px-3 pb-3">
        <div className="h-0.5 w-8 rounded-full" style={{ background: color }} />
        <p className="mt-1.5 text-[7px] font-semibold uppercase tracking-[0.12em]" style={{ color }}>
          Aaj hi WhatsApp karo
        </p>
      </div>
      {score !== undefined && (
        <div className="absolute right-2 top-2">
          <span className={cn("rounded-md bg-ink/70 px-1.5 py-0.5 text-[10px] font-bold", scoreTone(score))}>
            {score}
          </span>
        </div>
      )}
    </div>
  );
}

export function LiveLink({
  href,
  label,
  hint,
}: {
  href: string;
  label: string;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      className="group flex items-center justify-between rounded-xl border border-line bg-panel2 px-3 py-2.5 transition-colors hover:border-lime/30 hover:bg-[#161B12]"
    >
      <span>
        <span className="block text-[12.5px] font-semibold text-chalk">{label}</span>
        {hint && <span className="block text-[10.5px] text-dim">{hint}</span>}
      </span>
      <span className="text-dim transition-transform group-hover:-translate-y-0.5 group-hover:text-lime">↗</span>
    </Link>
  );
}
