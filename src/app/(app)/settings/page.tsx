import { Check, CircleSlash, Database, HardDrive, KeyRound, Server } from "lucide-react";
import { integrations, agencyName, presenterOptions } from "@/lib/env";
import { Card, SectionHead, StatusPill } from "@/components/ui";
import { DemoControls } from "@/components/demo-controls";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const list = integrations();

  return (
    <div className="space-y-4">
      <div>
        <p className="label">System</p>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-[12.5px] text-dim">
          What is live, what is sandbox, and what to swap before you sell.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {list.map((i) => (
          <Card key={i.key} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[13px] font-semibold">{i.name}</p>
                <p className="text-[10.5px] text-faint">{i.role}</p>
              </div>
              <span
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${
                  i.live
                    ? "border-mint/25 bg-mint/10 text-mint"
                    : "border-line2 bg-panel2 text-faint"
                }`}
              >
                {i.live ? <Check className="h-2.5 w-2.5" /> : <CircleSlash className="h-2.5 w-2.5" />}
                {i.live ? "live" : "fallback"}
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-dim">{i.detail}</p>
            <p className="mt-2 rounded-md border border-line bg-ink px-2 py-1 font-mono text-[10px] text-faint">
              {i.env}
            </p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <SectionHead
          title="Trend presenter options"
          subtitle="Every trend reel can use any of these — pick one per ad in the Ads library"
        />
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {presenterOptions().map((o) => (
            <div key={o.key} className="rounded-lg border border-line bg-panel2 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold">{o.name}</p>
                  <p className="text-[10px] leading-snug text-faint">{o.role}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    o.live
                      ? "border-mint/25 bg-mint/10 text-mint"
                      : "border-amber/25 bg-amber/10 text-amber"
                  }`}
                >
                  {o.live ? "ready" : "needs setup"}
                </span>
              </div>
              <p className="mt-2 text-[10.5px] leading-relaxed text-dim">{o.detail}</p>
              <p className="mt-2 break-words rounded-md border border-line bg-ink px-2 py-1 font-mono text-[9.5px] text-faint">
                {o.env}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10.5px] leading-relaxed text-faint">
          <span className="font-mono text-dim">auto</span> resolves owner clip → HeyGen avatar → stock
          narrator. Owner and avatar carry their own lip-synced audio; the stock path is a narrator, not
          lip-sync, and is labelled that way in the library.
        </p>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-4 xl:col-span-2">
          <SectionHead title="Demo controls" subtitle="Use these before a pitch, never mid-demo" />
          <div className="mt-3">
            <DemoControls />
          </div>

          <div className="mt-4 grid gap-2 border-t border-line pt-3 sm:grid-cols-3">
            {[
              { icon: Database, t: "Database", d: "Prisma · SQLite dev / Postgres prod" },
              { icon: HardDrive, t: "Storage", d: "public/renders → swap to R2" },
              { icon: Server, t: "Renderer", d: "ffmpeg local / Modal T4" },
            ].map((x) => (
              <div key={x.t} className="rounded-lg border border-line bg-panel2 px-2.5 py-2">
                <x.icon className="h-3.5 w-3.5 text-dim" />
                <p className="mt-1 text-[11px] font-semibold">{x.t}</p>
                <p className="text-[9.5px] leading-snug text-faint">{x.d}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <SectionHead title="Workspace" subtitle="Agency identity" />
          <dl className="mt-3 space-y-2 text-[11.5px]">
            {[
              ["Agency", agencyName()],
              ["City", "Kanpur, UP"],
              ["Passcode", "set in .env"],
              ["Session", "30 days · httpOnly"],
              ["Default retainer", "₹9,999 / mo"],
              ["Setup fee", "₹4,999 one-time"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-line/60 pb-1.5 last:border-0">
                <dt className="text-faint">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-faint">
            <KeyRound className="mt-0.5 h-3 w-3 shrink-0" />
            Change AGENCY_PASSCODE before you put this on a public URL. Demo default is{" "}
            <span className="font-mono text-dim">kanpur2026</span>.
          </p>
        </Card>
      </div>

      <Card className="p-4">
        <SectionHead title="Go-live checklist" subtitle="Everything here is real code — these are the keys that switch it on" />
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {[
            ["GEMINI_API_KEY", "Real Hinglish scripts instead of the playbook writer", "aistudio.google.com"],
            ["R2_BUCKET + keys", "Move renders off local disk, zero egress", "dash.cloudflare.com"],
            ["RENDER_DRIVER=modal", "Ship renders to a T4 GPU worker for parallel jobs", "modal.com"],
            ["META_ACCESS_TOKEN", "Publish instead of sandbox", "developers.facebook.com"],
            ["RAZORPAY key", "AutoPay mandates + invoicing", "razorpay.com"],
            ["NEXT_PUBLIC_APP_URL", "Correct QR links on printed standees", "your domain"],
          ].map(([env, why, where]) => (
            <div key={env} className="flex items-start gap-2.5 rounded-lg border border-line bg-panel2 px-2.5 py-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lime/60" />
              <div className="min-w-0">
                <p className="font-mono text-[10.5px] font-semibold text-chalk">{env}</p>
                <p className="text-[10px] leading-snug text-dim">{why}</p>
                <p className="text-[9px] text-faint">{where}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[10.5px] text-faint">
        <span>Growth Engine v0.1 · Next.js 16 · Prisma · ffmpeg</span>
        <StatusPill status="ACTIVE" />
      </div>
    </div>
  );
}
