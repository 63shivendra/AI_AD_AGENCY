import Link from "next/link";
import {
  ArrowUpRight,
  Inbox,
  Star,
  Wand2,
  Film,
  TriangleAlert,
  Radio,
  ChevronRight,
  Zap,
  PauseCircle,
  Sparkles,
} from "lucide-react";
import { getOverview, rangeStart } from "@/lib/data";
import { inr, num, timeAgo, scoreTone } from "@/lib/format";
import { Avatar, Card, Delta, HealthBar, Kpi, SectionHead, StatusPill, Empty } from "@/components/ui";
import { Sparkline } from "@/components/charts";
import { MetricChart } from "@/components/metric-chart";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const EVENT_ICON = {
  LEAD: Inbox,
  REVIEW: Star,
  AD: Wand2,
  RENDER: Film,
  ALERT: TriangleAlert,
  SYSTEM: Radio,
} as const;

export default async function OverviewPage() {
  const o = await getOverview();
  const demoClient = o.active[0] ?? o.clients[0];
  const newClients = o.clients.filter((c) => new Date(c.createdAt) >= rangeStart(30));
  const setupRevenue = newClients.length * 4999;
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11.5px] font-medium text-faint">{today}</p>
          <h1 className="mt-0.5 text-[27px] font-semibold leading-tight tracking-tight">
            Namaste. <span className="text-dim">Sab kuch chalu hai.</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/billing" className="btn-ghost h-9 px-3 text-[12.5px]">
            <ArrowUpRight className="h-3.5 w-3.5" />
            Client report
          </Link>
          <Link href="/studio" className="btn-primary h-9 px-3 text-[12.5px]">
            <Sparkles className="h-3.5 w-3.5" />
            Generate ads
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Monthly recurring"
          value={inr(o.mrr)}
          sub={`${o.active.length} active · ${inr(setupRevenue)} setup this month`}
          delta={12}
        >
          <div className="mt-3 text-lime/90">
            <Sparkline data={o.series.map((s) => s.revenue)} color="#c8f751" width={220} height={34} />
          </div>
        </Kpi>
        <Kpi
          label="WhatsApp leads · 30d"
          value={num(o.leads30)}
          sub={`${o.won30} won · ${inr(o.wonValue, true)} booked`}
          delta={o.deltaLeads}
        >
          <div className="mt-3">
            <Sparkline data={o.series.map((s) => s.leads)} color="#7c6bff" width={220} height={34} />
          </div>
        </Kpi>
        <Kpi
          label="Cost per lead"
          value={inr(o.cpl)}
          sub={`${inr(o.spend, true)} ad spend managed`}
          delta={-8}
          invert
        >
          <div className="mt-3">
            <Sparkline data={o.series.map((s) => s.spend)} color="#ffb020" width={220} height={34} />
          </div>
        </Kpi>
        <Kpi label="Blended ROAS" value={`${o.roas}x`} sub={`${inr(o.revenue, true)} attributed revenue`} delta={17}>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-gradient-to-r from-lime to-mint"
                style={{ width: `${Math.min((o.roas / 6) * 100, 100)}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-mint">target 4x</span>
          </div>
        </Kpi>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* chart */}
        <Card className="p-4 xl:col-span-2">
          <SectionHead
            title="Lead engine"
            subtitle="Every WhatsApp enquiry traced to the ad that created it"
            action={
              <span className="pill">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-lime" />
                live
              </span>
            }
          />
          <div className="mt-4">
            <MetricChart series={o.series} />
          </div>
        </Card>

        {/* autopilot */}
        <Card className="flex flex-col p-4">
          <SectionHead
            title="Autopilot"
            subtitle="What ran without you"
            action={<Zap className="h-4 w-4 text-lime" />}
          />
          <div className="mt-4 flex-1 space-y-2.5">
            {[
              { t: "Competitor scrape", d: "Meta Ad Library · 42 brands", meta: "2h ago", ok: true },
              { t: "Creative refresh", d: `${o.fatigued.length} fatigued ads queued`, meta: "auto", ok: true },
              { t: "Review velocity", d: `${o.reviews} Google reviews posted`, meta: "live", ok: true },
              { t: "Friday report", d: `WhatsApp to ${o.active.length} owners`, meta: "Fri 6 PM", ok: true },
              { t: "R2 cleanup", d: "Raw clips older than 7 days", meta: "nightly", ok: true },
            ].map((row) => (
              <div key={row.t} className="flex items-center gap-2.5 rounded-lg border border-line/70 bg-panel2/60 px-2.5 py-2">
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    row.ok ? "bg-mint" : "bg-amber"
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] font-semibold text-chalk">{row.t}</p>
                  <p className="truncate text-[10px] text-faint">{row.d}</p>
                </div>
                <span className="shrink-0 text-[9.5px] uppercase tracking-wider text-faint">{row.meta}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[10.5px] text-faint">
            <span>
              last render{" "}
              <span className="font-semibold text-dim">{o.lastRender !== null ? `${o.lastRender}s` : "—"}</span>
            </span>
            <span>
              queue <span className="font-semibold text-dim">{o.queue}</span>
            </span>
            <span>
              engine <span className="font-semibold text-dim">ffmpeg</span>
            </span>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* clients */}
        <Card className="overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between p-4 pb-3">
            <SectionHead title="Clients" subtitle={`${o.clients.length} accounts · Kanpur`} />
            <Link href="/clients" className="flex items-center gap-1 text-[11.5px] font-semibold text-dim hover:text-lime">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead>
                <tr className="border-y border-line bg-panel2/40">
                  <th className="table-head px-4 py-2 text-left">Client</th>
                  <th className="table-head px-2 py-2 text-left">Health</th>
                  <th className="table-head px-2 py-2 text-right">Leads 30d</th>
                  <th className="table-head px-2 py-2 text-right">ROAS</th>
                  <th className="table-head px-2 py-2 text-right">MRR</th>
                  <th className="table-head px-4 py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {o.clients.map((c) => (
                  <tr key={c.id} className="group border-b border-line/60 last:border-0 hover:bg-panel2/50">
                    <td className="px-4 py-2.5">
                      <Link href={`/clients/${c.slug}`} className="flex items-center gap-2.5">
                        <Avatar name={c.name} emoji={c.emoji} color={c.brandColor} size={30} />
                        <span className="min-w-0">
                          <span className="block truncate text-[12.5px] font-semibold text-chalk group-hover:text-lime">
                            {c.name}
                          </span>
                          <span className="block truncate text-[10.5px] text-faint">
                            {c.niche} · {c.area}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-2 py-2.5">
                      <HealthBar value={c.health} />
                    </td>
                    <td className="px-2 py-2.5 text-right text-[12px] tabular-nums text-chalk">{c.leads30}</td>
                    <td className="px-2 py-2.5 text-right text-[12px] tabular-nums">
                      <span className={c.roas >= 3 ? "text-mint" : c.roas >= 2 ? "text-lime" : "text-dim"}>
                        {c.roas ? `${c.roas}x` : "—"}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right text-[12px] tabular-nums text-chalk">
                      {c.status === "PROSPECT" ? "—" : inr(c.monthlyFee)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <StatusPill status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* right rail */}
        <div className="space-y-4">
          <Card className="p-4">
            <SectionHead title="Client-facing links" subtitle="Open these in the demo" />
            <div className="mt-3 space-y-2">
              {demoClient && (
                <>
                  <Link
                    href={`/f/${demoClient.slug}`}
                    target="_blank"
                    className="group flex items-center gap-3 rounded-xl border border-line bg-panel2 p-2.5 transition-colors hover:border-lime/30"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime/10 text-lime">
                      <Inbox className="h-4 w-4" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-[12px] font-semibold">WhatsApp funnel</span>
                      <span className="block text-[10px] text-faint">/f/{demoClient.slug}</span>
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-faint group-hover:text-lime" />
                  </Link>
                  <Link
                    href={`/r/${demoClient.slug}`}
                    target="_blank"
                    className="group flex items-center gap-3 rounded-xl border border-line bg-panel2 p-2.5 transition-colors hover:border-lime/30"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint/10 text-mint">
                      <Star className="h-4 w-4" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-[12px] font-semibold">Review QR</span>
                      <span className="block text-[10px] text-faint">/r/{demoClient.slug}</span>
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-faint group-hover:text-lime" />
                  </Link>
                  <Link
                    href={`/portal/${demoClient.slug}`}
                    target="_blank"
                    className="group flex items-center gap-3 rounded-xl border border-line bg-panel2 p-2.5 transition-colors hover:border-lime/30"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet/10 text-violet">
                      <Radio className="h-4 w-4" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-[12px] font-semibold">Owner portal</span>
                      <span className="block text-[10px] text-faint">/portal/{demoClient.slug}</span>
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-faint group-hover:text-lime" />
                  </Link>
                </>
              )}
            </div>
            <Link href="/demo" className="mt-3 flex items-center justify-center gap-1 rounded-lg border border-dashed border-line2 py-2 text-[11px] font-semibold text-dim hover:border-lime/40 hover:text-lime">
              Printable QR standee <ArrowUpRight className="h-3 w-3" />
            </Link>
          </Card>

          <Card className="p-4">
            <SectionHead
              title="Needs attention"
              subtitle="Sorted by revenue at risk"
              action={<TriangleAlert className="h-4 w-4 text-amber" />}
            />
            <div className="mt-3 space-y-2">
              {o.fatigued.map((f) => (
                <Link
                  key={f.id}
                  href={`/clients/${f.client.slug}?tab=ads`}
                  className="block rounded-xl border border-rose/20 bg-rose/[0.05] p-2.5 transition-colors hover:border-rose/40"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-rose">Creative fatigue</p>
                    <span className={cn("text-[11px] font-bold", scoreTone(f.hitScore))}>{f.hitScore}</span>
                  </div>
                  <p className="mt-1 text-[11.5px] font-medium text-chalk">
                    {f.client.emoji} {f.title}
                  </p>
                  <p className="text-[10px] text-dim">CTR {f.ctr}% · replacements ready</p>
                </Link>
              ))}
              <Link
                href="/radar"
                className="block rounded-xl border border-violet/20 bg-violet/[0.05] p-2.5 transition-colors hover:border-violet/40"
              >
                <p className="text-[11px] font-bold uppercase tracking-wider text-violet">Competitor moved</p>
                <p className="mt-1 text-[11.5px] font-medium text-chalk">
                  Smile Care Dental · same ad 47 days
                </p>
                <p className="text-[10px] text-dim">Counter-ad hook is ready to render</p>
              </Link>
              {o.clients.filter((c) => c.status === "PAUSED").map((c) => (
                <Link
                  key={c.id}
                  href={`/clients/${c.slug}`}
                  className="block rounded-xl border border-line bg-panel2 p-2.5"
                >
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-faint">
                    <PauseCircle className="h-3 w-3" /> Subscription paused
                  </p>
                  <p className="mt-1 text-[11.5px] font-medium text-chalk">{c.name}</p>
                  <p className="text-[10px] text-dim">Payment failed · funnel offline</p>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* activity */}
      <Card className="p-4">
        <SectionHead
          title="Activity"
          subtitle="Live across all clients"
          action={
            <span className="pill">
              <span className="h-1.5 w-1.5 rounded-full bg-mint" /> streaming
            </span>
          }
        />
        <div className="mt-3 grid gap-1 md:grid-cols-2">
          {o.events.map((e) => {
            const Icon = EVENT_ICON[e.type as keyof typeof EVENT_ICON] ?? Radio;
            return (
              <div key={e.id} className="flex items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-panel2/60">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-panel2 text-dim">
                  <Icon className="h-3 w-3" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11.5px] font-semibold text-chalk">
                    {e.title}
                    {e.client && <span className="ml-1.5 font-normal text-faint">· {e.client.name}</span>}
                  </p>
                  <p className="truncate text-[10.5px] text-dim">{e.detail}</p>
                </div>
                <span className="shrink-0 text-[9.5px] text-faint">{timeAgo(e.createdAt)}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {o.ads.length === 0 && (
        <Empty title="No campaigns yet" body="Generate your first Hinglish ad in the studio." />
      )}
    </div>
  );
}
