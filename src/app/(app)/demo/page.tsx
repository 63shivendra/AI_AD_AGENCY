import Link from "next/link";
import { notFound } from "next/navigation";
import os from "node:os";
import QRCode from "qrcode";
import { ArrowUpRight, QrCode, Smartphone, Wifi, Star, Inbox, Radio, Check } from "lucide-react";
import { getClients } from "@/lib/data";
import { Card, Avatar, SectionHead } from "@/components/ui";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

function lanOrigin() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  for (const iface of Object.values(os.networkInterfaces())) {
    for (const net of iface ?? []) {
      if (net.family === "IPv4" && !net.internal) return `http://${net.address}:3000`;
    }
  }
  return "http://localhost:3000";
}

async function qr(url: string) {
  return QRCode.toString(url, {
    type: "svg",
    margin: 0,
    width: 240,
    color: { dark: "#0B0B0F", light: "#FFFFFF" },
    errorCorrectionLevel: "M",
  });
}

const SCRIPT = [
  {
    t: "0:00",
    title: "Open the workspace",
    body: "Land on Overview. Let them read the numbers — MRR, WhatsApp leads, blended ROAS — before you say anything.",
  },
  {
    t: "0:30",
    title: "Generate a live ad",
    body: "Ad Studio → pick their business → Generate → point at the Hit Score. 'Ye score batata hai kaunsa hook paisa banayega, spend se pehle.'",
  },
  {
    t: "1:00",
    title: "Render it",
    body: "Hit Render. The progress bar moves, then a real MP4 with photo scenes and music plays in the dashboard. Usually 10–20 seconds. This is the moment that closes.",
  },
  {
    t: "1:40",
    title: "Scan the review QR",
    body: "Open /r/[client] on your phone, hand it to them. Three taps → an AI review in their voice → straight to Google.",
  },
  {
    t: "2:20",
    title: "Show their own funnel",
    body: "Open /f/[client]. Every button opens WhatsApp with a pre-filled message. 'Aapke counter pe ye QR lagega.'",
  },
  {
    t: "2:50",
    title: "Close",
    body: "₹4,999 setup + ₹9,999/month, 100% upfront on UPI AutoPay. First 4 ads go live within 90 minutes of onboarding.",
  },
];

export default async function DemoKit({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const sp = await searchParams;
  const clients = await getClients();
  const active = clients.filter((c) => c.status === "ACTIVE");
  const client = active.find((c) => c.slug === sp.client) ?? active[0];
  if (!client) notFound();

  const origin = lanOrigin();
  const links = [
    { key: "funnel", label: "WhatsApp funnel", href: `/f/${client.slug}`, icon: Inbox, note: "Put this on the shop's Instagram bio" },
    { key: "review", label: "Review booster", href: `/r/${client.slug}`, icon: Star, note: "Counter QR standee — 3 taps to a 5-star" },
    { key: "portal", label: "Owner portal", href: `/portal/${client.slug}`, icon: Radio, note: "Send this to the owner every Friday" },
  ];

  const qrs = await Promise.all(links.map((l) => qr(`${origin}${l.href}`)));
  const reviewQr = qrs[1];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 no-print">
        <div>
          <p className="label">Showcase</p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Demo kit</h1>
          <p className="mt-1 text-[12.5px] text-dim">
            Scannable links, a printable standee and the exact 3-minute script.
          </p>
        </div>
        <PrintButton />
      </div>

      <Card className="flex flex-wrap items-center gap-3 border-lime/20 bg-lime/[0.04] p-3 no-print">
        <Smartphone className="h-4 w-4 text-lime" />
        <p className="flex-1 text-[11.5px] text-dim">
          QR codes point to <span className="font-mono text-chalk">{origin}</span>. For a phone demo,
          your laptop and phone must be on the same Wi-Fi.
        </p>
        <span className="pill">
          <Wifi className="h-3 w-3" /> same network
        </span>
      </Card>

      <div className="flex flex-wrap gap-1.5 no-print">
        {active.map((c) => (
          <Link
            key={c.id}
            href={`/demo?client=${c.slug}`}
            className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-semibold ${
              c.id === client.id
                ? "border-lime/40 bg-lime/10 text-lime"
                : "border-line bg-panel text-dim hover:text-chalk"
            }`}
          >
            <span>{c.emoji}</span> {c.name.split(" ")[0]}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2 no-print">
          <div className="grid gap-3 sm:grid-cols-3">
            {links.map((l, i) => (
              <Card key={l.key} className="flex flex-col p-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11.5px] font-semibold">
                    <l.icon className="h-3.5 w-3.5 text-lime" /> {l.label}
                  </span>
                </div>
                <div
                  className="mx-auto mt-2.5 w-[112px] rounded-lg bg-white p-1.5 [&_svg]:h-full [&_svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: qrs[i] }}
                />
                <p className="mt-2 text-center text-[9.5px] leading-snug text-faint">{l.note}</p>
                <Link
                  href={l.href}
                  target="_blank"
                  className="mt-2 flex items-center justify-center gap-1 rounded-lg border border-line py-1.5 text-[10.5px] font-semibold text-dim hover:border-lime/40 hover:text-lime"
                >
                  Open <ArrowUpRight className="h-3 w-3" />
                </Link>
              </Card>
            ))}
          </div>

          <Card className="p-4">
            <SectionHead title="3-minute demo script" subtitle="Say less. Click more." />
            <div className="mt-3 space-y-2.5">
              {SCRIPT.map((s, i) => (
                <div key={s.t} className="flex gap-3">
                  <div className="flex w-10 shrink-0 flex-col items-center">
                    <span className="rounded-md bg-panel2 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-lime">
                      {s.t}
                    </span>
                    {i < SCRIPT.length - 1 && <span className="mt-1 h-full w-px flex-1 bg-line" />}
                  </div>
                  <div className="pb-1">
                    <p className="text-[12px] font-semibold">{s.title}</p>
                    <p className="mt-0.5 text-[10.5px] leading-relaxed text-dim">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <SectionHead title="Before you walk in" subtitle="Five minutes of prep saves the meeting" />
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {[
                "Run the demo once end-to-end on the laptop you'll carry",
                "Pre-render 2 ads for the client you're visiting",
                "Check phone + laptop are on the same Wi-Fi",
                "Print one standee with their name on it",
                "Keep the price slide ready: ₹4,999 + ₹9,999/mo",
              ].map((t) => (
                <p key={t} className="flex items-start gap-1.5 text-[10.5px] text-dim">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-mint" /> {t}
                </p>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-3 no-print">
          <Card className="p-4">
            <SectionHead title="What you're selling" subtitle="Not a website. Not a video editor." />
            <div className="mt-2.5 space-y-2">
              {[
                ["Footfall", "WhatsApp enquiries from a 5km geo-fence"],
                ["Bhaukaal", "Top-3 on Google Maps in their area"],
                ["Proof", "Review velocity on the counter QR"],
                ["Retention", "Weekly ads, auto-refreshed before fatigue"],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="w-14 shrink-0 text-[9.5px] font-bold uppercase tracking-wider text-lime">{k}</span>
                  <span className="text-[10.5px] leading-snug text-dim">{v}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <SectionHead title="Say this at the counter" />
            <p className="mt-2 text-[11px] leading-relaxed text-chalk/85">
              “Aapka competitor Google Maps pe top 3 mein hai aur roz 2–3 WhatsApp enquiry le raha
              hai. Hum aapko wahi system dete hain — ads, funnel aur reviews — ₹9,999 mahine mein.
              Pehla ad aaj hi ready ho jayega.”
            </p>
            <p className="mt-2 text-[9.5px] text-faint">
              Never open with “website banwana hai?” — that&apos;s a ₹2,500 race to the bottom.
            </p>
          </Card>
          <Card className="p-4">
            <SectionHead title="Objection: too expensive" />
            <p className="mt-2 text-[11px] leading-relaxed text-dim">
              “Ek patient ya ek student admission aapko ₹8,000–₹85,000 deta hai. Mahine mein ek
              extra customer bhi aa gaya to system free hai.”
            </p>
          </Card>
        </div>
      </div>

      {/* printable standee */}
      <div className="print-area">
        <div className="mx-auto max-w-[520px] rounded-3xl border border-black/10 bg-white p-8 text-center text-[#14161A] shadow-sm print:border-0 print:shadow-none">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">
            {client.area} · {client.city}
          </p>
          <h2 className="mt-2 text-[26px] font-extrabold leading-tight tracking-tight">{client.name}</h2>
          <p className="mt-1 text-[13px] text-black/50">Aapka experience kisne banaya?</p>

          <div
            className="mx-auto mt-5 w-[240px] rounded-2xl border border-black/10 bg-white p-3 [&_svg]:h-full [&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: reviewQr }}
          />

          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#14161A] px-4 py-2 text-[12px] font-bold text-white">
            <QrCode className="h-4 w-4" /> Scan karo · 2 minute
          </div>
          <p className="mx-auto mt-3 max-w-[320px] text-[11.5px] leading-relaxed text-black/50">
            Camera se QR scan karein → 3 cheezein chunein → AI aapka review likh dega →
            Google pe paste karein.
          </p>
          <div className="mt-5 flex items-center justify-center gap-1 border-t border-black/10 pt-4 text-[9px] text-black/35">
            <span>Powered by</span>
            <span className="font-bold text-black/55">Growth Engine</span>
            <span>· Kanpur</span>
          </div>
        </div>
        <div className="mt-3 text-center text-[10px] text-black/40 no-print">
          A5 print · laminate it · place at the billing counter
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10.5px] text-faint no-print">
        <Avatar name={client.name} emoji={client.emoji} color={client.brandColor} size={26} />
        Showing {client.name}. Switch client with the chips above.
      </div>
    </div>
  );
}
