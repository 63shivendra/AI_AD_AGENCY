import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Phone, Star, Clock, ShieldCheck, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { waLink } from "@/lib/format";
import { LeadForm } from "@/components/lead-form";

export const dynamic = "force-dynamic";

/** Stable server-side window for the demo counters. */
function daysAgo(days: number) {
  return new Date(Date.now() - days * 86400000);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await db.client.findUnique({ where: { slug } });
  return {
    title: client ? `${client.name} — ${client.area}, Kanpur` : "Local business",
    robots: { index: false },
  };
}

export default async function FunnelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await db.client.findUnique({
    where: { slug },
    include: { offers: { orderBy: { sort: "asc" } } },
  });
  if (!client) notFound();

  const [leadCount, reviewCount, ratingAgg] = await Promise.all([
    db.lead.count({
      where: { clientId: client.id, createdAt: { gte: daysAgo(7) } },
    }),
    db.review.count({ where: { clientId: client.id } }),
    db.review.aggregate({ where: { clientId: client.id }, _avg: { rating: true } }),
  ]);
  const rating = ((ratingAgg._avg.rating ?? 5) as number).toFixed(1);
  const hasReviews = reviewCount > 0;
  const accent = client.brandColor;

  return (
    <div className="min-h-screen bg-[#F7F7F3] pb-10 text-[#14161A]">
      <div className="mx-auto w-full max-w-[440px]">
        {/* hero */}
        <div
          className="relative overflow-hidden px-5 pb-6 pt-5"
          style={{ background: `linear-gradient(160deg, ${accent}22, #F7F7F3 78%)` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[18px] shadow-sm">
                {client.emoji}
              </span>
              <div>
                <p className="text-[13.5px] font-bold leading-tight">{client.name}</p>
                <p className="text-[10px] text-black/50">
                  {client.area}, {client.city}
                </p>
              </div>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-bold shadow-sm">
              <Star className="h-3 w-3 fill-[#F5B301] text-[#F5B301]" /> {hasReviews ? rating : "New"}
            </span>
          </div>

          <div className="mt-6">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider"
              style={{ background: `${accent}22`, color: "#111" }}
            >
              <span className="h-1 w-1 rounded-full" style={{ background: accent }} />
              {client.area} ka trusted {client.niche}
            </span>
            <h1 className="mt-2.5 text-balance text-[26px] font-extrabold leading-[1.12] tracking-tight">
              {client.area} mein {client.niche} — booking ab{" "}
              <span style={{ color: accent === "#C8F751" ? "#5B7A00" : accent }}>seedha WhatsApp</span> pe.
            </h1>
            <p className="mt-2 text-[12.5px] leading-relaxed text-black/55">
              {leadCount > 0 ? `${leadCount} logon ne is hafte enquiry ki. ` : ""}
              WhatsApp par seedha baat karein, koi formality nahi.
            </p>
          </div>

          <div className="mt-4 flex gap-2">
            <div className="flex-1 rounded-xl border border-black/5 bg-white/80 px-2.5 py-2 backdrop-blur">
              <p className="text-[9px] uppercase tracking-wider text-black/40">Experience</p>
              <p className="text-[11.5px] font-bold">{reviewCount} reviews</p>
            </div>
            <div className="flex-1 rounded-xl border border-black/5 bg-white/80 px-2.5 py-2 backdrop-blur">
              <p className="text-[9px] uppercase tracking-wider text-black/40">Aaj</p>
              <p className="text-[11.5px] font-bold">{client.hours ?? "Open today"}</p>
            </div>
          </div>
        </div>

        {/* offers */}
        <div className="space-y-2 px-4">
          {client.offers.map((o, i) => (
            <div
              key={o.id}
              className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-3 shadow-sm"
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[12px] font-black"
                style={{ background: `${accent}22`, color: "#111" }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-bold leading-tight">{o.title}</p>
                <p className="mt-0.5 line-clamp-1 text-[10.5px] text-black/45">{o.description}</p>
              </div>
              {o.price && (
                <span className="shrink-0 rounded-lg bg-[#14161A] px-2 py-1 text-[10.5px] font-bold text-white">
                  {o.price}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* form */}
        <div className="mt-3 px-4">
          <LeadForm
            clientId={client.id}
            clientName={client.name}
            accent={accent === "#C8F751" ? "#1A1C16" : accent}
            offers={client.offers.map((o) => ({ id: o.id, title: o.title, price: o.price }))}
          />
        </div>

        {/* quick whatsapp */}
        <div className="px-4 pt-2">
          <a
            href={waLink(client.phone, `Namaste ${client.name}! Mujhe details chahiye.`)}
            className="flex items-center justify-center gap-1.5 py-2 text-[11.5px] font-semibold text-black/50"
          >
            Ya seedha WhatsApp karein <ChevronRight className="h-3 w-3" />
          </a>
        </div>

        {/* trust */}
        <div className="mt-2 grid grid-cols-3 gap-2 px-4">
          {[
            { icon: ShieldCheck, t: "Verified", d: "Google listing" },
            { icon: Clock, t: "Same day", d: "Reply on WhatsApp" },
            { icon: Star, t: hasReviews ? `${rating} ★` : "New", d: hasReviews ? `${reviewCount} reviews` : "be the first" },
          ].map((x) => (
            <div key={x.t} className="rounded-xl border border-black/5 bg-white/60 p-2 text-center">
              <x.icon className="mx-auto h-3.5 w-3.5 text-black/40" />
              <p className="mt-1 text-[10px] font-bold">{x.t}</p>
              <p className="text-[8.5px] text-black/40">{x.d}</p>
            </div>
          ))}
        </div>

        {/* visit */}
        <div className="mt-4 px-4">
          <div className="rounded-2xl border border-black/10 bg-white p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-black/35">Visit us</p>
            <p className="mt-1.5 flex items-start gap-1.5 text-[11.5px] leading-snug">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-black/40" />
              {client.address}
            </p>
            <div className="mt-2 flex gap-2">
              {client.mapUrl && (
                <a
                  href={client.mapUrl}
                  target="_blank"
                  className="flex-1 rounded-lg border border-black/10 py-2 text-center text-[11px] font-semibold"
                >
                  Google Maps
                </a>
              )}
              <a
                href={`tel:+91${client.phone}`}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-semibold text-white"
                style={{ background: "#14161A" }}
              >
                <Phone className="h-3 w-3" /> Call
              </a>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 px-4 text-[9px] text-black/30">
          <span>Powered by</span>
          <Link href="/" className="font-bold text-black/45">
            Growth Engine
          </Link>
          <span>·</span>
          <Link href={`/r/${client.slug}`} className="hover:text-black/60">
            Leave a review
          </Link>
        </div>
      </div>
    </div>
  );
}
