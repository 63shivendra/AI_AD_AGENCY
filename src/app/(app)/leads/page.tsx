import Link from "next/link";
import { Inbox, ArrowUpRight } from "lucide-react";
import { getAllLeads, getClients } from "@/lib/data";
import { inr, timeAgo } from "@/lib/format";
import { Card, Empty, SectionHead } from "@/components/ui";
import { LeadStatusSelect } from "@/components/actions";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const [leads, clients] = await Promise.all([getAllLeads(), getClients()]);

  const filtered = leads.filter((l) => {
    const clientOk = !sp.client || l.client.slug === sp.client;
    const statusOk = !sp.status || l.status === sp.status;
    return clientOk && statusOk;
  });

  const newCount = leads.filter((l) => l.status === "NEW").length;
  const won = leads.filter((l) => l.status === "WON");
  const wonValue = won.reduce((a, l) => a + l.value, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">Demand</p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Lead inbox</h1>
          <p className="mt-1 text-[12.5px] text-dim">
            Every WhatsApp tap, call and walk-in — one inbox, every client.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="rounded-xl border border-line bg-panel px-3 py-2">
            <p className="text-[9px] uppercase tracking-wider text-faint">New</p>
            <p className="text-[16px] font-semibold leading-none text-violet">{newCount}</p>
          </div>
          <div className="rounded-xl border border-line bg-panel px-3 py-2">
            <p className="text-[9px] uppercase tracking-wider text-faint">Won value</p>
            <p className="text-[16px] font-semibold leading-none text-mint">{inr(wonValue, true)}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-panel p-0.5">
          <Link
            href="/leads"
            className={`rounded-[9px] px-2.5 py-1.5 text-[11.5px] font-semibold ${
              !sp.client && !sp.status ? "bg-panel2 text-chalk" : "text-faint hover:text-dim"
            }`}
          >
            All
          </Link>
          {clients
            .filter((c) => c.leads30 > 0)
            .map((c) => (
              <Link
                key={c.id}
                href={`/leads?client=${c.slug}${sp.status ? `&status=${sp.status}` : ""}`}
                className={`rounded-[9px] px-2.5 py-1.5 text-[11.5px] font-semibold ${
                  sp.client === c.slug ? "bg-panel2 text-chalk" : "text-faint hover:text-dim"
                }`}
              >
                {c.emoji} {c.area.split(" ")[0]}
              </Link>
            ))}
        </div>

        <div className="ml-auto flex gap-1">
          {["NEW", "CONTACTED", "WON", "LOST"].map((s) => (
            <Link
              key={s}
              href={`/leads?${new URLSearchParams({ ...(sp.client ? { client: sp.client } : {}), ...(sp.status === s ? {} : { status: s }) }).toString()}`}
              className={`rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                sp.status === s ? "border-lime/40 bg-lime/10 text-lime" : "border-line text-faint hover:text-dim"
              }`}
            >
              {s.toLowerCase()}
            </Link>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between p-4 pb-3">
          <SectionHead title={`${filtered.length} leads`} subtitle="Sorted newest first" />
          <span className="pill">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-mint" /> live
          </span>
        </div>
        {filtered.length === 0 ? (
          <div className="p-4">
            <Empty
              title="No leads in this view"
              body="Submit a test enquiry from a funnel to see it land here instantly."
              action={
                <Link href="/clients" className="btn-ghost mt-2 h-8 text-[11.5px]">
                  Open a client
                </Link>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] xl:min-w-[820px]">
              <thead>
                <tr className="border-y border-line bg-panel2/40">
                  <th className="table-head px-4 py-2 text-left">Lead</th>
                  <th className="table-head hidden px-3 py-2 text-left xl:table-cell">Client</th>
                  <th className="table-head px-3 py-2 text-left">Intent</th>
                  <th className="table-head hidden px-3 py-2 text-left xl:table-cell">Source</th>
                  <th className="table-head hidden px-3 py-2 text-left xl:table-cell">When</th>
                  <th className="table-head px-3 py-2 text-left">Value</th>
                  <th className="table-head px-3 py-2 text-right xl:px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-b border-line/60 last:border-0 hover:bg-panel2/40">
                    <td className="px-4 py-2.5">
                      <p className="text-[12px] font-semibold">{l.name}</p>
                      <a
                        href={`https://wa.me/91${l.phone}`}
                        target="_blank"
                        className="text-[10.5px] text-faint hover:text-lime"
                      >
                        +91 {l.phone} ↗
                      </a>
                      <Link
                        href={`/clients/${l.client.slug}?tab=leads`}
                        className="mt-0.5 block truncate text-[10px] text-dim xl:hidden"
                      >
                        {l.client.emoji} {l.client.name}
                      </Link>
                    </td>
                    <td className="hidden px-3 py-2.5 xl:table-cell">
                      <Link
                        href={`/clients/${l.client.slug}?tab=leads`}
                        className="text-[11.5px] font-medium text-dim hover:text-lime"
                      >
                        {l.client.emoji} {l.client.name}
                      </Link>
                    </td>
                    <td className="max-w-[180px] px-3 py-2.5">
                      <p className="truncate text-[11.5px] text-dim">{l.intent}</p>
                    </td>
                    <td className="hidden px-3 py-2.5 xl:table-cell">
                      <span className="pill py-0 text-[9.5px]">{l.source.toLowerCase()}</span>
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-2.5 text-[11px] text-faint xl:table-cell">{timeAgo(l.createdAt)}</td>
                    <td className="px-3 py-2.5 text-[11.5px] tabular-nums">
                      {l.value ? inr(l.value) : <span className="text-faint">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right xl:px-4">
                      <LeadStatusSelect leadId={l.id} status={l.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-panel px-3.5 py-2.5 text-[11px] text-dim">
        <span className="flex items-center gap-1.5">
          <Inbox className="h-3.5 w-3.5 text-lime" />
          Leads are written to Supabase/Postgres the moment the form is submitted — no spreadsheet.
        </span>
        <Link href="/studio" className="flex items-center gap-1 font-semibold text-lime">
          Generate more demand <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
