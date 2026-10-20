import Link from "next/link";
import { Radar, ArrowUpRight, Clock, TrendingUp, TriangleAlert, Crosshair } from "lucide-react";
import { getClients } from "@/lib/data";
import { inr } from "@/lib/format";
import { Card, SectionHead, StatusPill } from "@/components/ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const COMPETITORS = [
  {
    name: "Smile Care Dental",
    area: "Swaroop Nagar",
    niche: "Dental Clinic",
    hook: "Kanpur ka sabse sasta implant — ₹18,999 only",
    daysRunning: 47,
    ads: 9,
    estSpend: 84000,
    platforms: ["META", "INSTAGRAM"],
    insight:
      "Price war on implants. They cut price twice in 6 weeks — margin is bleeding. Don't match it; counter with 'painless + warranty'.",
    brief: "Counter Smile Care's cheap implant ad. Don't discount. Lead with painless treatment, 5-year warranty and same-day consultation.",
  },
  {
    name: "Meena Bridal Studio",
    area: "Birhana Road",
    niche: "Bridal Boutique",
    hook: "Shaadi ka lehenga sirf ₹9,999 se — 2 din mein ready",
    daysRunning: 31,
    ads: 14,
    estSpend: 132000,
    platforms: ["META", "TIKTOK"],
    insight:
      "Volume play at ₹9,999. Their reviews complain about fitting quality. Counter with '3-day fitting guarantee' at a higher ticket.",
    brief: "Counter Meena Bridal's ₹9,999 volume ad. Target brides with ₹25k+ budget. Emphasise fitting quality, 3-day alterations and free trial.",
  },
  {
    name: "Apex NEET Classes",
    area: "Kakadeo",
    niche: "NEET Coaching",
    hook: "NEET 2027 dropper batch — fees ₹45,000 only",
    daysRunning: 12,
    ads: 6,
    estSpend: 96000,
    platforms: ["META", "YOUTUBE"],
    insight:
      "New entrant undercutting on fees. Parents still ask for selection proof — your 42 selections is the stronger asset.",
    brief: "Counter Apex NEET's ₹45,000 fee ad. Do not discount. Lead with 42 selections, the physics HOD and a free Sunday demo class.",
  },
  {
    name: "Kanpur Leather Works",
    area: "Jajmau",
    niche: "Leather Manufacturer",
    hook: "Export quality leather — MOQ 100 pcs, 15 din dispatch",
    daysRunning: 58,
    ads: 3,
    estSpend: 42000,
    platforms: ["META", "LINKEDIN"],
    insight:
      "Low MOQ is their only edge. Buyers who scale past 500 pcs hit quality issues. Counter on REACH compliance and container capacity.",
    brief: "Counter Kanpur Leather Works' low-MOQ ad. Target serious exporters. Lead with EU REACH compliance, 500 pcs MOQ and 21-day container dispatch.",
  },
  {
    name: "Shubh Jewellers",
    area: "Civil Lines",
    niche: "Jewellery",
    hook: "Dhanteras pe gold coin free — ₹1,00,000 ki shopping par",
    daysRunning: 22,
    ads: 8,
    estSpend: 168000,
    platforms: ["META", "INSTAGRAM"],
    insight:
      "Gift-with-purchase promotion. Works for footfall but attracts deal hunters. Your 0% making charges is cleaner and easier to verify.",
    brief: "Counter Shubh Jewellers' free gold coin offer. Position 0% making charges as transparent pricing, no gimmicks, hallmarked 22K.",
  },
];

export default async function RadarPage() {
  const clients = await getClients();
  const active = clients.filter((c) => c.status === "ACTIVE");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">Intelligence</p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Competitor radar</h1>
          <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-dim">
            <Radar className="h-3.5 w-3.5 text-violet" />
            Meta Ad Library + landing page scan · every 6 hours
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="pill">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-violet" /> 42 brands tracked
          </span>
          <span className="pill">last scan 2h ago</span>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {COMPETITORS.map((c) => {
            const match = active.find((x) => x.niche.toLowerCase().includes(c.niche.toLowerCase().split(" ")[0]));
            const fatigue = c.daysRunning >= 30;
            return (
              <Card key={c.name} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[13.5px] font-semibold">{c.name}</p>
                      {fatigue ? (
                        <span className="flex items-center gap-1 rounded-full border border-rose/25 bg-rose/10 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-rose">
                          <TriangleAlert className="h-2.5 w-2.5" /> fatigued
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full border border-mint/25 bg-mint/10 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-mint">
                          <TrendingUp className="h-2.5 w-2.5" /> scaling
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[10.5px] text-faint">
                      {c.niche} · {c.area}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-[10.5px] text-dim">
                    <Clock className="h-3 w-3" /> {c.daysRunning} days live
                  </span>
                </div>

                <div className="mt-3 flex gap-3">
                  <div className="w-[92px] shrink-0">
                    <div className="flex aspect-[9/16] flex-col justify-between rounded-lg border border-line bg-gradient-to-b from-[#12140F] to-[#1B1F14] p-2">
                      <p className="text-[6px] font-bold uppercase tracking-wider text-chalk/40">{c.name}</p>
                      <p className="text-[9px] font-bold leading-[1.15] text-chalk">{c.hook}</p>
                      <p className="text-[6px] font-semibold text-lime">Learn more</p>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        ["Ad copies", String(c.ads)],
                        ["Est. spend", inr(c.estSpend, true)],
                        ["Platforms", c.platforms.join(" + ")],
                      ].map(([k, v]) => (
                        <div key={k} className="rounded-md border border-line bg-panel2 px-1.5 py-1">
                          <p className="text-[8px] uppercase tracking-wider text-faint">{k}</p>
                          <p className="truncate text-[10px] font-semibold">{v}</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-dim">{c.insight}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {match ? (
                        <Link
                          href={`/studio?client=${match.id}&brief=${encodeURIComponent(c.brief)}`}
                          className="btn-primary h-7 px-2.5 text-[10.5px]"
                        >
                          <Crosshair className="h-3 w-3" /> Generate counter-ad
                        </Link>
                      ) : (
                        <span className="pill py-1 text-[9.5px]">no matching client</span>
                      )}
                      <span className="text-[9.5px] text-faint">
                        {match ? `for ${match.name}` : "add this niche to counter"}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="space-y-3">
          <Card className="p-4">
            <SectionHead title="What the radar does" subtitle="Every 6 hours, automatically" />
            <ol className="mt-3 space-y-2">
              {[
                "Scrapes competitor ads from the Meta Ad Library by area + category.",
                "Flags any ad running longer than 30 days as validated (and now fatiguing).",
                "Pulls the landing page and price points to find the weak spot.",
                "Writes a counter-brief in your client's voice — one click to render.",
              ].map((t, i) => (
                <li key={t} className="flex gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet/15 text-[8.5px] font-bold text-violet">
                    {i + 1}
                  </span>
                  <span className="text-[11px] leading-relaxed text-dim">{t}</span>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="p-4">
            <SectionHead title="This week" subtitle="Signals worth acting on" />
            <div className="mt-3 space-y-2">
              {[
                ["3 competitors", "raised prices or cut offers — room to hold margin", "mint"],
                ["2 new entrants", "in Kakadeo coaching, both undercutting on fees", "amber"],
                ["1 ad fatigue", "Smile Care has run the same creative 47 days", "rose"],
              ].map(([t, d, tone]) => (
                <div key={t} className="rounded-lg border border-line bg-panel2 px-2.5 py-2">
                  <p
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider",
                      tone === "mint" ? "text-mint" : tone === "amber" ? "text-amber" : "text-rose"
                    )}
                  >
                    {t}
                  </p>
                  <p className="mt-0.5 text-[10.5px] leading-snug text-dim">{d}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-line2 p-4">
            <p className="label">Data source</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-dim">
              Live scraping needs a Meta Ad Library token or Apify actor. This board ships with a
              seeded Kanpur snapshot so the demo runs offline.
            </p>
            <Link href="/settings" className="mt-2 flex items-center gap-1 text-[10.5px] font-semibold text-lime">
              Connect live data <ArrowUpRight className="h-3 w-3" />
            </Link>
          </Card>
        </div>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-2 p-3.5">
        <p className="text-[11.5px] text-dim">
          <span className="font-semibold text-chalk">Rule:</span> never counter a competitor by matching
          their discount — counter the weakness their ad reveals.
        </p>
        <StatusPill status="ACTIVE" />
      </Card>
    </div>
  );
}
