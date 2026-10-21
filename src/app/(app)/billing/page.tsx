import Link from "next/link";
import { Wallet, ArrowUpRight, CreditCard, TrendingDown, Check } from "lucide-react";
import { getBillingData } from "@/lib/data";
import { inr } from "@/lib/format";
import { Card, SectionHead, StatusPill, Kpi } from "@/components/ui";
import { Sparkline } from "@/components/charts";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Next debit is a demo rhythm, stable for a single render pass. */
function nextDebitDate(index: number) {
  return new Date(Date.now() + ((index % 4) + 2) * 86400000).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

const PLANS = [
  {
    name: "Local Growth",
    price: 9999,
    tag: "Kanpur shops & clinics",
    features: ["4 AI video ads / month", "WhatsApp funnel + QR standee", "Google review booster", "Weekly WhatsApp report"],
    highlight: true,
  },
  {
    name: "Multi-Outlet",
    price: 24999,
    tag: "4–10 locations",
    features: ["12 ads / month", "Per-outlet funnels", "Competitor radar", "Priority render queue"],
    highlight: false,
  },
  {
    name: "White-label",
    price: 41999,
    tag: "Agencies",

    features: ["Unlimited sub-accounts", "Your logo on the portal", "API + webhook access", "₹4,099 per client sub-account"],
    highlight: false,
  },
];

export default async function BillingPage() {
  const { clients, spend, revenue } = await getBillingData();
  const active = clients.filter((c) => c.status === "ACTIVE");
  const mrr = active.reduce((a, c) => a + c.monthlyFee, 0);
  const setup = clients.filter((c) => c.status !== "PROSPECT").length * 4999;
  const infra = 450 * active.length;
  const margin = mrr > 0 ? Math.round(((mrr - infra) / mrr) * 100) : 0;
  const atRisk = clients.filter((c) => c.status === "PAUSED" || (c.status === "ACTIVE" && c.health < 60));
  const paused = clients.filter((c) => c.status === "PAUSED").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">Business</p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Revenue</h1>
          <p className="mt-1 text-[12.5px] text-dim">
            {active.length} active retainers ·{" "}
            {paused > 0 ? `${paused} payment needs attention` : "all AutoPay mandates healthy"}
          </p>
        </div>
        <Link href="/clients" className="btn-ghost h-9 px-3 text-[12px]">
          <Wallet className="h-3.5 w-3.5" /> Manage accounts
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="MRR" value={inr(mrr)} sub={`${active.length} × avg ${inr(active.length ? Math.round(mrr / active.length) : 0)}`} delta={12}>
          <div className="mt-3">
            <Sparkline data={[mrr * 0.55, mrr * 0.62, mrr * 0.7, mrr * 0.78, mrr * 0.86, mrr * 0.93, mrr]} color="#c8f751" width={220} height={32} />
          </div>
        </Kpi>
        <Kpi label="Setup fees" value={inr(setup)} sub="one-time · ₹4,999 per onboarding" />
        <Kpi label="Gross margin" value={`${margin}%`} sub={`infra ${inr(infra)} / month`} delta={2} />
        <Kpi label="Ad spend managed" value={inr(spend, true)} sub={`${inr(revenue, true)} attributed revenue`} delta={9} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between p-4 pb-3">
            <SectionHead title="Retainers" subtitle="Auto-debit every 30 days" />
            <span className="pill">
              <CreditCard className="h-3 w-3" /> Razorpay UPI AutoPay
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-y border-line bg-panel2/40">
                  <th className="table-head px-4 py-2 text-left">Client</th>
                  <th className="table-head px-3 py-2 text-left">Plan</th>
                  <th className="table-head px-3 py-2 text-right">MRR</th>
                  <th className="table-head px-3 py-2 text-left">Next debit</th>
                  <th className="table-head px-4 py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c, i) => (
                  <tr key={c.id} className="border-b border-line/60 last:border-0 hover:bg-panel2/40">
                    <td className="px-4 py-2.5">
                      <Link href={`/clients/${c.slug}`} className="flex items-center gap-2">
                        <span className="text-[13px]">{c.emoji}</span>
                        <span className="text-[12px] font-semibold hover:text-lime">{c.name}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusPill status={c.plan} />
                    </td>
                    <td className="px-3 py-2.5 text-right text-[12px] tabular-nums">
                      {c.status === "PROSPECT" ? "—" : inr(c.monthlyFee)}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-faint">
                      {c.status === "PROSPECT"
                        ? "not onboarded"
                        : nextDebitDate(i)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <StatusPill status={c.status === "ACTIVE" ? "ACTIVE" : c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-3">
          <Card className="p-4">
            <SectionHead title="Margin math" subtitle="Per ₹9,999 retainer" />
            <div className="mt-3 space-y-2">
              {[
                ["Retainer", inr(9999), "text-chalk"],
                ["GPU + render", "₹0 – ₹12", "text-dim"],
                ["Infra + storage", "₹450", "text-dim"],
                ["Funnel + report", "₹0", "text-dim"],
                ["Net margin", "96%", "text-mint"],
              ].map(([k, v, tone], i) => (
                <div
                  key={k}
                  className={cn(
                    "flex items-center justify-between text-[11.5px]",
                    i === 4 && "border-t border-line pt-2"
                  )}
                >
                  <span className="text-faint">{k}</span>
                  <span className={cn("font-semibold tabular-nums", tone)}>{v}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <SectionHead title="Churn watch" subtitle="Before it costs you" action={<TrendingDown className="h-4 w-4 text-amber" />} />
            <div className="mt-3 space-y-2">
              {atRisk.length === 0 && <p className="text-[11px] text-faint">No accounts at risk.</p>}
              {atRisk.map((c) => (
                <Link key={c.id} href={`/clients/${c.slug}`} className="block rounded-lg border border-amber/20 bg-amber/[0.05] px-2.5 py-2">
                  <p className="text-[11.5px] font-semibold">{c.emoji} {c.name}</p>
                  <p className="text-[10px] text-dim">
                    {c.status === "PAUSED" ? "Payment failed · funnel offline" : `Health ${c.health} · engagement falling`}
                  </p>
                </Link>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <SectionHead title="Next 30 days" subtitle="Projected" />
            <div className="mt-2 space-y-1.5 text-[11.5px]">
              <div className="flex justify-between">
                <span className="text-faint">Retainers</span>
                <span className="font-semibold tabular-nums">{inr(mrr)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-faint">New setups (est. 3)</span>
                <span className="font-semibold tabular-nums">{inr(14997)}</span>
              </div>
              <div className="flex justify-between border-t border-line pt-1.5">
                <span className="text-dim">Total</span>
                <span className="font-semibold text-mint tabular-nums">{inr(mrr + 14997)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div>
        <SectionHead title="Plans you can sell" subtitle="Productised pricing — never hourly, never custom quotes" />
        <div className="mt-2 grid gap-3 md:grid-cols-3">
          {PLANS.map((p) => (
            <Card key={p.name} className={cn("p-4", p.highlight && "border-lime/30 bg-lime/[0.03]")}>
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold">{p.name}</p>
                {p.highlight && <span className="pill border-lime/30 bg-lime/10 text-lime">most sold</span>}
              </div>
              <p className="mt-0.5 text-[10.5px] text-faint">{p.tag}</p>
              <p className="mt-2 text-[22px] font-semibold tracking-tight">
                {inr(p.price)}
                <span className="text-[11px] font-normal text-faint">/mo</span>
              </p>
              <div className="mt-2.5 space-y-1">
                {p.features.map((f) => (
                  <p key={f} className="flex items-start gap-1.5 text-[10.5px] text-dim">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-mint" /> {f}
                  </p>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-2 p-3.5">
        <p className="text-[11.5px] text-dim">
          <span className="font-semibold text-chalk">Guardrail:</span> campaigns never launch on verbal
          promises. AutoPay mandate first, then the funnel goes live.
        </p>
        <Link href="/settings" className="flex items-center gap-1 text-[11.5px] font-semibold text-lime">
          Payment settings <ArrowUpRight className="h-3 w-3" />
        </Link>
      </Card>
    </div>
  );
}
