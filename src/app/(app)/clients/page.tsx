import Link from "next/link";
import { ArrowUpRight, Inbox, Star, Radio, ChevronRight } from "lucide-react";
import { getClients } from "@/lib/data";
import { inr } from "@/lib/format";
import { Avatar, Card, HealthBar, StatusPill, Empty } from "@/components/ui";
import { AddClient } from "@/components/add-client";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "PAUSED", label: "Paused" },
  { key: "PROSPECT", label: "Prospects" },
];

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status ?? "ALL";
  const q = (sp.q ?? "").toLowerCase();
  const all = await getClients();

  const clients = all.filter((c) => {
    const statusOk = status === "ALL" || c.status === status;
    const qOk =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.niche.toLowerCase().includes(q) ||
      c.area.toLowerCase().includes(q);
    return statusOk && qOk;
  });

  const mrr = all.filter((c) => c.status === "ACTIVE").reduce((a, c) => a + c.monthlyFee, 0);
  const atRisk = all.filter(
    (c) => c.status === "PAUSED" || (c.status === "ACTIVE" && c.health < 60)
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">Workspace</p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Clients</h1>
          <p className="mt-1 text-[12.5px] text-dim">
            {all.length} accounts · {inr(mrr)} MRR · {atRisk} at risk
          </p>
        </div>
        <AddClient />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-line bg-panel p-0.5">
          {TABS.map((t) => {
            const count = t.key === "ALL" ? all.length : all.filter((c) => c.status === t.key).length;
            const active = status === t.key;
            return (
              <Link
                key={t.key}
                href={t.key === "ALL" ? "/clients" : `/clients?status=${t.key}`}
                className={cn(
                  "flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  active ? "bg-panel2 text-chalk" : "text-faint hover:text-dim"
                )}
              >
                {t.label}
                <span className={cn("text-[10px] tabular-nums", active ? "text-lime" : "text-faint")}>{count}</span>
              </Link>
            );
          })}
        </div>
        {q && (
          <span className="pill">
            “{sp.q}” <Link href="/clients" className="text-dim hover:text-chalk">✕</Link>
          </span>
        )}
      </div>

      {clients.length === 0 ? (
        <Empty title="No clients match" body="Try a different filter or add a new client." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {clients.map((c) => (
            <Card key={c.id} className="card-hover group relative p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <Avatar name={c.name} emoji={c.emoji} color={c.brandColor} />
                  <div className="min-w-0">
                    <Link href={`/clients/${c.slug}`} className="line-clamp-2 min-h-[32px] text-[13.5px] font-semibold leading-snug group-hover:text-lime" title={c.name}>
                      {c.name}
                    </Link>
                    <p className="truncate text-[10.5px] text-faint">
                      {c.niche} · {c.area}
                    </p>
                  </div>
                </div>
                <div className="shrink-0">
                  <StatusPill status={c.status} />
                </div>
              </div>

              <div className="mt-3.5 grid grid-cols-3 divide-x divide-line rounded-lg border border-line bg-ink/50">
                <div className="px-2.5 py-2">
                  <p className="text-[9px] uppercase tracking-wider text-faint">Leads 30d</p>
                  <p className="mt-0.5 text-[14px] font-semibold tabular-nums">{c.leads30}</p>
                </div>
                <div className="px-2.5 py-2">
                  <p className="text-[9px] uppercase tracking-wider text-faint">ROAS</p>
                  <p className={cn("mt-0.5 text-[14px] font-semibold tabular-nums", c.roas >= 3 ? "text-mint" : "text-chalk")}>
                    {c.roas ? `${c.roas}x` : "—"}
                  </p>
                </div>
                <div className="px-2.5 py-2">
                  <p className="text-[9px] uppercase tracking-wider text-faint">MRR</p>
                  <p className="mt-0.5 text-[14px] font-semibold tabular-nums">
                    {c.status === "PROSPECT" ? "—" : inr(c.monthlyFee, true)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <HealthBar value={c.health} />
                <span className="text-[10px] text-faint">
                  {c.liveAds} live ad{c.liveAds === 1 ? "" : "s"}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-1.5 border-t border-line pt-2.5">
                <Link
                  href={`/f/${c.slug}`}
                  target="_blank"
                  className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10.5px] font-semibold text-dim hover:bg-panel2 hover:text-chalk"
                >
                  <Inbox className="h-3 w-3" /> Funnel
                </Link>
                <Link
                  href={`/r/${c.slug}`}
                  target="_blank"
                  className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10.5px] font-semibold text-dim hover:bg-panel2 hover:text-chalk"
                >
                  <Star className="h-3 w-3" /> Review QR
                </Link>
                <Link
                  href={`/portal/${c.slug}`}
                  target="_blank"
                  className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10.5px] font-semibold text-dim hover:bg-panel2 hover:text-chalk"
                >
                  <Radio className="h-3 w-3" /> Portal
                </Link>
                <Link
                  href={`/clients/${c.slug}`}
                  className="ml-auto flex items-center gap-0.5 text-[10.5px] font-semibold text-faint group-hover:text-lime"
                >
                  Open <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="flex flex-wrap items-center justify-between gap-2 p-3.5">
        <p className="text-[11.5px] text-dim">
          <span className="font-semibold text-chalk">Tip:</span> open a client and hit
          <span className="mx-1 text-lime">Generate ads</span>—every concept is saved to their account automatically.
        </p>
        <Link href="/studio" className="flex items-center gap-1 text-[11.5px] font-semibold text-lime">
          Ad Studio <ArrowUpRight className="h-3 w-3" />
        </Link>
      </Card>
    </div>
  );
}
