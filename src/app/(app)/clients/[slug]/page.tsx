import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Inbox,
  Star,
  Radio,
  Wand2,
  MapPin,
  Phone,
  Calendar,
  Sparkles,
} from "lucide-react";
import { getClientDetail } from "@/lib/data";
import { inr, dateShort, timeAgo, scoreTone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AreaChart } from "@/components/charts";
import { AdFrame, Avatar, Card, HealthBar, SectionHead, StatusPill, LiveLink, Empty } from "@/components/ui";
import { CopyButton, LeadStatusSelect, MarkPostedButton, PublishButton } from "@/components/actions";
import { PresenterPicker } from "@/components/presenter-picker";
import { presenterAvailability } from "@/lib/env";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "ads", label: "Ads" },
  { key: "leads", label: "Leads" },
  { key: "reviews", label: "Reviews" },
  { key: "setup", label: "Setup" },
];

export default async function ClientDetail({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab = "overview" } = await searchParams;
  const c = await getClientDetail(slug);
  if (!c) notFound();

  const series = c.series;

  const config = {
    client: {
      id: c.slug,
      name: c.name,
      niche: c.niche,
      phone: c.phone,
      address: c.address,
      area: c.area,
      brandColor: c.brandColor,
      whatsappCta: `Namaste ${c.name}! Mujhe ${c.offers[0]?.title ?? "offer"} ke baare mein jaankari chahiye.`,
      offers: c.offers.map((o) => ({
        title: o.title,
        price: o.price,
        tag: o.tag,
        description: o.description,
      })),
    },
  };

  return (
    <div className="space-y-5">
      <Link href="/clients" className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-faint hover:text-chalk">
        <ArrowLeft className="h-3 w-3" /> All clients
      </Link>

      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Avatar name={c.name} emoji={c.emoji} color={c.brandColor} size={48} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[24px] font-semibold leading-tight tracking-tight">{c.name}</h1>
              <StatusPill status={c.status} />
              <span className="pill">{c.plan}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-dim">
              <span>{c.niche}</span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {c.area}, {c.city}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> {c.phone}
              </span>
              {c.contactName && <span>· {c.contactName}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/f/${c.slug}`} target="_blank" className="btn-ghost h-9 px-3 text-[12px]">
            <Inbox className="h-3.5 w-3.5" /> Funnel
          </Link>
          <Link href={`/studio?client=${c.id}`} className="btn-primary h-9 px-3 text-[12px]">
            <Wand2 className="h-3.5 w-3.5" /> Generate ads
          </Link>
        </div>
      </div>

      {/* stats */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { l: "Monthly retainer", v: c.status === "PROSPECT" ? "—" : inr(c.monthlyFee), s: `setup ${inr(c.setupFee)}` },
          { l: "Leads · 30d", v: String(c.leads30), s: `${c.won30} won · ${inr(c.wonValue30, true)} booked` },
          { l: "Cost per lead", v: c.cpl ? inr(c.cpl) : "—", s: `${inr(c.spend30, true)} spend` },
          { l: "ROAS", v: c.roas ? `${c.roas}x` : "—", s: `${inr(c.revenue30, true)} revenue` },
        ].map((s) => (
          <Card key={s.l} className="p-3.5">
            <p className="label">{s.l}</p>
            <p className="mt-1.5 text-[22px] font-semibold leading-none tracking-tight tabular-nums">{s.v}</p>
            <p className="mt-1 text-[10.5px] text-faint">{s.s}</p>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex w-full overflow-x-auto rounded-xl border border-line bg-panel p-0.5 no-scrollbar sm:w-auto">
          {TABS.map((t) => {
            const count =
              t.key === "ads" ? c.ads.length : t.key === "leads" ? c.leads.length : t.key === "reviews" ? c.reviews.length : null;
            return (
              <Link
                key={t.key}
                href={`/clients/${c.slug}${t.key === "overview" ? "" : `?tab=${t.key}`}`}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  tab === t.key ? "bg-panel2 text-chalk" : "text-faint hover:text-dim"
                )}
              >
                {t.label}
                {count !== null && <span className="text-[10px] tabular-nums text-faint">{count}</span>}
              </Link>
            );
          })}
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <span className="text-[10.5px] text-faint">health</span>
          <HealthBar value={c.health} />
        </div>
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="p-4 xl:col-span-2">
            <SectionHead title="Lead trend" subtitle="Last 30 days · WhatsApp enquiries" />
            <div className="mt-3">
              {series.length ? (
                <AreaChart series={series} metric="leads" color={c.brandColor} format={(n) => String(n)} />
              ) : (
                <Empty title="No metrics yet" body="Deploy the funnel and this chart fills within 24 hours." />
              )}
            </div>
            <div className="mt-2 grid grid-cols-3 divide-x divide-line border-t border-line pt-3">
              <div className="px-2">
                <p className="text-[9.5px] uppercase tracking-wider text-faint">Impressions</p>
                <p className="text-[13px] font-semibold tabular-nums">
                  {c.metrics.reduce((a, m) => a + m.impressions, 0).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="px-2">
                <p className="text-[9.5px] uppercase tracking-wider text-faint">Clicks</p>
                <p className="text-[13px] font-semibold tabular-nums">
                  {c.metrics.reduce((a, m) => a + m.clicks, 0).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="px-2">
                <p className="text-[9.5px] uppercase tracking-wider text-faint">Ad spend</p>
                <p className="text-[13px] font-semibold tabular-nums">{inr(c.spend30)}</p>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-4">
              <SectionHead title="Offers" subtitle="Used by the AI when writing hooks" />
              <div className="mt-3 space-y-2">
                {c.offers.map((o) => (
                  <div key={o.id} className="rounded-lg border border-line bg-panel2 px-2.5 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[12px] font-semibold">{o.title}</p>
                      {o.price && <span className="shrink-0 text-[11px] font-bold text-lime">{o.price}</span>}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[10.5px] text-faint">{o.description}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <SectionHead title="Client links" subtitle="Everything is already live" />
              <div className="mt-3 space-y-2">
                <LiveLink href={`/f/${c.slug}`} label="WhatsApp funnel" hint={`/f/${c.slug}`} />
                <LiveLink href={`/r/${c.slug}`} label="Review booster" hint={`/r/${c.slug}`} />
                <LiveLink href={`/portal/${c.slug}`} label="Owner portal" hint={`/portal/${c.slug}`} />
              </div>
            </Card>

            {c.notes && (
              <Card className="border-amber/20 bg-amber/[0.04] p-4">
                <p className="label text-amber">Agency notes</p>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-chalk/90">{c.notes}</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {tab === "ads" && (
        <div className="space-y-3">
          <SectionHead
            title="Creative library"
            subtitle={`${c.ads.length} ads · ${c.ads.filter((a) => a.status === "PUBLISHED").length} live`}
            action={
              <Link href={`/studio?client=${c.id}`} className="btn-primary h-8 px-2.5 text-[11.5px]">
                <Sparkles className="h-3 w-3" /> New concept
              </Link>
            }
          />
          {c.ads.length === 0 ? (
            <Empty
              title="No ads yet"
              body="Generate the first batch of Hinglish hooks for this client."
              action={
                <Link href={`/studio?client=${c.id}`} className="btn-primary mt-2 h-8 text-[11.5px]">
                  Open studio
                </Link>
              }
            />
          ) : (
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {c.ads.map((ad) => {
                const script = JSON.parse(ad.script || "{}") as {
                  angle?: string;
                  presenterKind?: string;
                  presenterMode?: string;
                };
                const presenter =
                  script.presenterKind === "owner"
                    ? "owner clip"
                    : script.presenterKind === "avatar"
                      ? "AI avatar"
                      : "stock narrator";
                return (
                  <Card key={ad.id} className="overflow-hidden p-2.5">
                    <AdFrame
                      hook={ad.hook}
                      brand={c.name}
                      area={c.area}
                      color={c.brandColor}
                      video={ad.videoUrl}
                      poster={ad.posterUrl}
                      score={ad.hitScore}
                    />
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <StatusPill status={ad.status} />
                          {ad.format === "TREND" && (
                            <>
                              <span className="rounded-full border border-violet/25 bg-violet/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet">
                                trend
                              </span>
                              <span className="rounded-full border border-lime/25 bg-lime/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-lime">
                                pro edit
                              </span>
                            </>
                          )}
                        </div>
                        <span className={cn("text-[10.5px] font-bold", scoreTone(ad.hitScore))}>
                          CTR {ad.predictedCtr}%
                        </span>
                      </div>
                      <p className="line-clamp-2 text-[11.5px] font-semibold leading-snug">{ad.hook}</p>
                      <p className="text-[10px] text-faint">
                        {script.angle ?? ad.platform} · {dateShort(ad.createdAt)} · {ad.variants.length} hooks
                        {ad.format === "TREND" && ` · ${presenter}`}
                      </p>
                      <div className="flex items-center justify-between border-t border-line pt-1.5">
                        <span className="text-[10px] text-faint">
                          {ad.leads} leads · {ad.views.toLocaleString("en-IN")} views
                        </span>
                        <PublishButton adId={ad.id} status={ad.status} />
                      </div>
                      {ad.format === "TREND" && (
                        <PresenterPicker
                          adId={ad.id}
                          mode={script.presenterMode ?? "auto"}
                          resolved={presenter}
                          availability={presenterAvailability(c.slug)}
                        />
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "leads" && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between p-4 pb-3">
            <SectionHead title="Lead inbox" subtitle="Every WhatsApp tap lands here in real time" />
            <span className="pill">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-mint" /> live
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-y border-line bg-panel2/40">
                  <th className="table-head px-4 py-2 text-left">Name</th>
                  <th className="table-head px-3 py-2 text-left">Intent</th>
                  <th className="table-head px-3 py-2 text-left">Source</th>
                  <th className="table-head px-3 py-2 text-left">When</th>
                  <th className="table-head px-3 py-2 text-left">Value</th>
                  <th className="table-head px-4 py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {c.leads.map((l) => (
                  <tr key={l.id} className="border-b border-line/60 last:border-0 hover:bg-panel2/40">
                    <td className="px-4 py-2.5">
                      <p className="text-[12px] font-semibold">{l.name}</p>
                      <a
                        href={`https://wa.me/91${l.phone}`}
                        target="_blank"
                        className="text-[10.5px] text-faint hover:text-lime"
                      >
                        +91 {l.phone}
                      </a>
                    </td>
                    <td className="max-w-[220px] px-3 py-2.5">
                      <p className="truncate text-[11.5px] text-dim">{l.intent}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="pill py-0">{l.source.toLowerCase()}</span>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-faint">{timeAgo(l.createdAt)}</td>
                    <td className="px-3 py-2.5 text-[11.5px] tabular-nums">
                      {l.value ? inr(l.value) : <span className="text-faint">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <LeadStatusSelect leadId={l.id} status={l.status} />
                    </td>
                  </tr>
                ))}
                {c.leads.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[12px] text-faint">
                      No leads yet. Open the funnel and submit a test enquiry.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "reviews" && (
        <div className="grid gap-3 md:grid-cols-2">
          {c.reviews.map((r) => {
            const tags = JSON.parse(r.tags || "[]") as string[];
            return (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar name={r.customer} size={30} color={c.brandColor} emoji={r.customer.slice(0, 1)} />
                    <div>
                      <p className="text-[12px] font-semibold">{r.customer}</p>
                      <p className="text-[10px] text-faint">{timeAgo(r.createdAt)} · via QR standee</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 text-mint">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="mt-2.5 text-[12px] leading-relaxed text-chalk/90">{r.text}</p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {tags.slice(0, 3).map((t) => (
                    <span key={t} className="pill py-0 text-[10px]">
                      {t}
                    </span>
                  ))}
                  <div className="ml-auto flex items-center gap-2">
                    <CopyButton text={r.text} label="Copy" className="h-7 px-2 text-[10.5px]" />
                    <MarkPostedButton reviewId={r.id} posted={r.status === "POSTED"} />
                  </div>
                </div>
              </Card>
            );
          })}
          {c.reviews.length === 0 && (
            <Empty title="No reviews yet" body="Print the QR standee from the demo kit and place it at the counter." />
          )}
        </div>
      )}

      {tab === "setup" && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="p-4">
            <SectionHead title="client_config.json" subtitle="The only file that changes per client" />
            <pre className="mt-3 max-h-[420px] overflow-auto rounded-xl border border-line bg-ink p-3 text-[10.5px] leading-relaxed text-dim">
              {JSON.stringify(config, null, 2)}
            </pre>
            <div className="mt-2 flex justify-end">
              <CopyButton text={JSON.stringify(config, null, 2)} label="Copy config" className="h-7 px-2 text-[10.5px]" />
            </div>
          </Card>
          <div className="space-y-4">
            <Card className="p-4">
              <SectionHead title="Client facts" subtitle="Used across funnel, ads and reports" />
              <dl className="mt-3 space-y-2 text-[12px]">
                {[
                  ["Owner", c.contactName ?? "—"],
                  ["Address", c.address],
                  ["Google review link", c.googleReviewUrl ? "Connected" : "Not set"],
                  ["Map listing", c.mapUrl ? "Linked" : "Not set"],
                  ["Onboarded", new Date(c.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })],
                  ["Plan", `${c.plan} · ${inr(c.monthlyFee)}/mo`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-6 border-b border-line/60 pb-2 last:border-0">
                    <dt className="text-faint">{k}</dt>
                    <dd className="text-right font-medium text-chalk">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <Card className="p-4">
              <SectionHead title="Automation state" subtitle="What runs for this account" />
              <div className="mt-3 space-y-1.5">
                {[
                  ["Funnel deployed", true],
                  ["Review QR active", true],
                  ["Weekly WhatsApp report", true],
                  ["UPI AutoPay mandate", c.status === "ACTIVE"],
                  ["Meta account linked", false],
                ].map(([label, ok]) => (
                  <div key={String(label)} className="flex items-center justify-between rounded-lg border border-line bg-panel2 px-2.5 py-1.5">
                    <span className="text-[11.5px]">{label}</span>
                    <span className={cn("text-[10px] font-bold uppercase", ok ? "text-mint" : "text-faint")}>
                      {ok ? "on" : "off"}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[10.5px] text-faint">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3" /> Next report: Friday 6:00 PM on WhatsApp
        </span>
        <span className="flex items-center gap-3">
          <Link href={`/r/${c.slug}`} target="_blank" className="hover:text-lime">
            Review QR <ArrowUpRight className="inline h-2.5 w-2.5" />
          </Link>
          <Link href={`/portal/${c.slug}`} target="_blank" className="hover:text-lime">
            Owner portal <ArrowUpRight className="inline h-2.5 w-2.5" />
          </Link>
          <span className="flex items-center gap-1">
            <Radio className="h-3 w-3" /> id {c.slug}
          </span>
        </span>
      </div>
    </div>
  );
}
