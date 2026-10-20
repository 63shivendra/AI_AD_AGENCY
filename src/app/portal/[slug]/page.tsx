import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone, MessageCircle, Star, TrendingUp, Eye, ArrowUpRight, BadgeCheck } from "lucide-react";
import { db } from "@/lib/db";
import { inr, waLink, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await db.client.findUnique({ where: { slug } });
  return { title: client ? `${client.name} · growth portal` : "Client portal", robots: { index: false } };
}

export default async function PortalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await db.client.findUnique({
    where: { slug },
    include: {
      leads: { orderBy: { createdAt: "desc" }, take: 8 },
      reviews: { orderBy: { createdAt: "desc" }, take: 3 },
      ads: { orderBy: { createdAt: "desc" }, take: 3 },
    },
  });
  if (!client) notFound();

  const since = new Date(Date.now() - 30 * 86400000);
  const [leads30, reviews30, won, viewsAgg] = await Promise.all([
    db.lead.count({ where: { clientId: client.id, createdAt: { gte: since } } }),
    db.review.count({ where: { clientId: client.id, createdAt: { gte: since } } }),
    db.lead.count({ where: { clientId: client.id, createdAt: { gte: since }, status: "WON" } }),
    db.ad.aggregate({ where: { clientId: client.id }, _sum: { views: true } }),
  ]);
  const views = viewsAgg._sum.views ?? 0;
  const accent = client.brandColor;
  const month = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-[#F7F7F3] pb-10 text-[#14161A]">
      <div className="mx-auto w-full max-w-[460px]">
        <div
          className="px-5 pb-5 pt-6"
          style={{ background: `linear-gradient(160deg, ${accent}26, #F7F7F3 85%)` }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[20px] shadow-sm">
                {client.emoji}
              </span>
              <div>
                <p className="text-[14px] font-extrabold leading-tight">{client.name}</p>
                <p className="text-[10px] text-black/45">
                  {client.area} · {month}
                </p>
              </div>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[9.5px] font-bold shadow-sm">
              <BadgeCheck className="h-3 w-3 text-[#1D9BF0]" /> Growth Engine
            </span>
          </div>

          <div className="mt-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/35">
              This month, so far
            </p>
            <p className="mt-1 text-[24px] font-extrabold leading-tight tracking-tight">
              {leads30} nayi enquiry, {reviews30} naye reviews.
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-black/50">
              {won > 0 ? `${won} customer${won === 1 ? "" : "s"} already booked. ` : ""}
              {client.status === "PAUSED"
                ? "Plan paused hai — payment clear hote hi funnel wapas live ho jayega."
                : "Sab kuch neeche live hai — koi report ka wait nahi."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 px-4">
          {[
            { icon: MessageCircle, v: String(leads30), l: "WhatsApp leads" },
            { icon: Star, v: String(reviews30), l: "New reviews" },
            { icon: Eye, v: views > 999 ? `${(views / 1000).toFixed(1)}k` : String(views), l: "Ad views" },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl border border-black/5 bg-white p-2.5 shadow-sm">
              <s.icon className="h-3.5 w-3.5 text-black/40" />
              <p className="mt-1.5 text-[18px] font-extrabold leading-none tabular-nums">{s.v}</p>
              <p className="mt-1 text-[8.5px] uppercase tracking-wider text-black/35">{s.l}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 px-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-black/40">Latest leads</p>
            <span className="flex items-center gap-1 text-[9.5px] font-semibold text-mint">
              <span className="h-1 w-1 rounded-full bg-mint" /> live
            </span>
          </div>
          <div className="mt-2 space-y-1.5">
            {client.leads.map((l) => (
              <div key={l.id} className="flex items-center gap-2.5 rounded-xl border border-black/5 bg-white p-2.5 shadow-sm">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{ background: `${accent}2A` }}
                >
                  {l.name.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] font-bold">{l.name}</p>
                  <p className="truncate text-[9.5px] text-black/40">
                    {l.intent} · {timeAgo(l.createdAt)}
                  </p>
                </div>
                <a
                  href={waLink(l.phone, `Namaste ${l.name}, ${client.name} se baat kar rahe hain.`)}
                  target="_blank"
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#25D366]/10 text-[#128C7E]"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                </a>
                <a
                  href={`tel:+91${l.phone}`}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/5 text-black/50"
                >
                  <Phone className="h-3.5 w-3.5" />
                </a>
              </div>
            ))}
            {client.leads.length === 0 && (
              <p className="rounded-xl border border-dashed border-black/10 p-4 text-center text-[11px] text-black/40">
                Abhi koi lead nahi. Funnel link share karein.
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 px-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-black/40">Aapke ads</p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {client.ads.map((ad) => (
              <div key={ad.id} className="w-[126px] shrink-0">
                <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-[#0B0D09]">
                  {ad.videoUrl ? (
                    <video
                      src={ad.videoUrl}
                      poster={ad.posterUrl ?? undefined}
                      className="h-full w-full object-cover"
                      muted
                      loop
                      playsInline
                      controls
                      preload="metadata"
                    />
                  ) : ad.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ad.posterUrl} alt={ad.hook} className="h-full w-full object-cover" />
                  ) : (
                    <div
                      className="flex h-full flex-col justify-between p-2.5"
                      style={{ background: `linear-gradient(160deg, #0B0D09, ${accent}35)` }}
                    >
                      <p className="text-[6.5px] font-bold uppercase tracking-wider text-white/70">{client.name}</p>
                      <p className="text-[11px] font-bold leading-[1.15] text-white">{ad.hook}</p>
                      <p className="text-[6.5px] font-semibold" style={{ color: accent }}>
                        WhatsApp karo
                      </p>
                    </div>
                  )}
                </div>
                <p className="mt-1 truncate text-[9px] text-black/40">
                  {ad.views.toLocaleString("en-IN")} views
                </p>
              </div>
            ))}
            {client.ads.length === 0 && (
              <p className="text-[11px] text-black/40">Pehla ad is hafte aa raha hai.</p>
            )}
          </div>
        </div>

        <div className="mt-4 px-4">
          <div className="rounded-2xl border border-black/5 bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-black/35">Aapka plan</p>
                <p className="mt-0.5 text-[13px] font-extrabold">
                  {client.plan} · {inr(client.monthlyFee)}/mo
                </p>
              </div>
              <span
                className={
                  client.status === "ACTIVE"
                    ? "rounded-full bg-mint/10 px-2 py-1 text-[9px] font-bold text-[#0F8A5F]"
                    : "rounded-full bg-amber/10 px-2 py-1 text-[9px] font-bold text-[#9A6B00]"
                }
              >
                {client.status === "ACTIVE" ? "AutoPay active" : client.status === "PAUSED" ? "Payment due" : "Prospect"}
              </span>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-black/45">
              <TrendingUp className="h-3 w-3" />
              {client.status === "ACTIVE" ? (
                <>
                  Next debit {inr(client.monthlyFee)} on{" "}
                  {new Date(Date.now() + 12 * 86400000).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </>
              ) : client.status === "PAUSED" ? (
                <>Funnel paused — clear AutoPay to resume</>
              ) : (
                <>Not onboarded yet</>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 px-4">
          <a
            href={waLink("9876500000", `Namaste! ${client.name} ke portal se aa raha hoon.`)}
            className="flex items-center justify-between rounded-2xl bg-[#14161A] px-4 py-3.5 text-white"
          >
            <div>
              <p className="text-[12px] font-bold">Aur ads chahiye?</p>
              <p className="text-[10px] text-white/50">WhatsApp your growth manager</p>
            </div>
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-[9px] text-black/30">
          <Link href={`/f/${client.slug}`} className="hover:text-black/50">
            Funnel
          </Link>
          <span>·</span>
          <Link href={`/r/${client.slug}`} className="hover:text-black/50">
            Review QR
          </Link>
          <span>·</span>
          <span>Growth Engine, Kanpur</span>
        </div>
      </div>
    </div>
  );
}
