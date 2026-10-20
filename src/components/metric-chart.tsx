"use client";

import { useState } from "react";
import { AreaChart } from "@/components/charts";
import { inr, num } from "@/lib/format";
import { cn } from "@/lib/utils";

type Point = { date: string; leads: number; spend: number; revenue: number };
type Metric = "leads" | "spend" | "revenue";

const CONFIG: Record<Metric, { label: string; color: string; format: (n: number) => string }> = {
  leads: { label: "Leads", color: "#c8f751", format: (n) => num(n) },
  spend: { label: "Ad spend", color: "#ffb020", format: (n) => (n >= 1000 ? `₹${Math.round(n / 1000)}k` : `₹${n}`) },
  revenue: { label: "Revenue", color: "#43e0a0", format: (n) => (n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${Math.round(n / 1000)}k` : `₹${n}`) },
};

export function MetricChart({ series }: { series: Point[] }) {
  const [metric, setMetric] = useState<Metric>("leads");
  const cfg = CONFIG[metric];
  const total = series.reduce((a, s) => a + s[metric], 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">
            {cfg.label} · last 30 days
          </p>
          <p className="mt-1 text-[30px] font-semibold leading-none tracking-tight tabular-nums">
            {metric === "leads" ? num(total) : inr(total)}
          </p>
        </div>
        <div className="flex rounded-lg border border-line bg-ink p-0.5">
          {(Object.keys(CONFIG) as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={cn(
                "rounded-[6px] px-2.5 py-1 text-[11px] font-semibold transition-colors",
                metric === m ? "bg-panel2 text-chalk shadow-sm" : "text-faint hover:text-dim"
              )}
            >
              {CONFIG[m].label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3">
        <AreaChart series={series} metric={metric} color={cfg.color} format={cfg.format} />
      </div>
    </div>
  );
}
