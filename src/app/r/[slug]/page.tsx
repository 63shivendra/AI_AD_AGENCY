import Link from "next/link";
import { notFound } from "next/navigation";
import { QrCode, Star, ShieldCheck, Clock } from "lucide-react";
import { db } from "@/lib/db";
import { ReviewFlow } from "@/components/review-flow";

export const dynamic = "force-dynamic";

const TAGS: Record<string, string[]> = {
  dental: ["Painless treatment", "Polite staff", "Clean clinic", "On-time appointment", "Fair pricing", "Doctor explained well"],
  bridal: ["Great collection", "Helpful staff", "Fair pricing", "Perfect fitting", "No rush", "Beautiful designs"],
  coaching: ["Experienced teachers", "Good study material", "Doubt clearing", "Regular tests", "Parent updates", "Disciplined"],
  leather: ["Export quality", "On-time delivery", "Professional team", "Good packing", "Clear communication", "Fair pricing"],
  jewellery: ["Best designs", "Trustworthy", "No hidden charges", "Polite staff", "Hallmarked", "Good exchange"],
  banquet: ["Beautiful venue", "Great food", "Smooth management", "Ample parking", "Polite staff", "Fair pricing"],
  cnc: ["Precision quality", "On-time delivery", "Clear communication", "Good packing", "Fair pricing", "Easy vendor process"],
  ivf: ["Confidential", "Caring staff", "Clear explanation", "Clean clinic", "No pressure", "Supportive"],
  sweets: ["Fresh mithai", "Good packaging", "Fair pricing", "Polite staff", "Fast service", "Clean shop"],
};

function tagsFor(niche: string) {
  const n = niche.toLowerCase();
  const key = Object.keys(TAGS).find((k) => n.includes(k));
  return TAGS[key ?? "dental"];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await db.client.findUnique({ where: { slug } });
  return { title: client ? `Review ${client.name}` : "Leave a review", robots: { index: false } };
}

export default async function ReviewLanding({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await db.client.findUnique({
    where: { slug },
    include: { reviews: { orderBy: { createdAt: "desc" }, take: 3 } },
  });
  if (!client) notFound();

  const reviewAgg = await db.review.aggregate({
    where: { clientId: client.id },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const reviewCount = reviewAgg._count._all;
  const hasReviews = reviewCount > 0;
  const rating = (reviewAgg._avg.rating ?? 0).toFixed(1);

  const accent = client.brandColor === "#C8F751" ? "#C8F751" : client.brandColor;

  return (
    <div className="min-h-screen bg-[#F7F7F3] pb-12 text-[#14161A]">
      <div className="mx-auto w-full max-w-[440px] px-4 pt-6">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[24px] shadow-sm">
            {client.emoji}
          </span>
          <h1 className="mt-3 text-[21px] font-extrabold leading-tight tracking-tight">
            {client.name}
          </h1>
          <p className="mt-1 flex items-center justify-center gap-1 text-[11px] text-black/45">
            {hasReviews ? (
              <>
                <Star className="h-3 w-3 fill-[#F5B301] text-[#F5B301]" />
                {rating} · {client.area}, {client.city}
              </>
            ) : (
              <>{client.area}, {client.city}</>
            )}
          </p>
        </div>

        <div className="mt-5">
          <ReviewFlow
            clientId={client.id}
            clientName={client.name}
            area={client.area}
            accent={accent}
            googleReviewUrl={client.googleReviewUrl}
            tagOptions={tagsFor(client.niche)}
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { icon: Clock, t: "2 minute", d: "max" },
            { icon: Star, t: "5 star", d: "AI-written" },
            { icon: ShieldCheck, t: "100% free", d: "no login here" },
          ].map((x) => (
            <div key={x.t} className="rounded-xl border border-black/5 bg-white/70 p-2 text-center">
              <x.icon className="mx-auto h-3.5 w-3.5 text-black/35" />
              <p className="mt-1 text-[10px] font-bold">{x.t}</p>
              <p className="text-[8.5px] text-black/35">{x.d}</p>
            </div>
          ))}
        </div>

        {client.reviews.length > 0 && (
          <div className="mt-6">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-black/35">
              Recent reviews
            </p>
            <div className="mt-2 space-y-2">
              {client.reviews.map((r) => (
                <div key={r.id} className="rounded-xl border border-black/5 bg-white/80 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10.5px] font-bold">{r.customer}</p>
                    <div className="flex">
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <Star key={i} className="h-2.5 w-2.5 fill-[#F5B301] text-[#F5B301]" />
                      ))}
                    </div>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-black/55">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-1.5 text-[9px] text-black/30">
          <QrCode className="h-3 w-3" />
          <span>Review standee · powered by</span>
          <Link href="/" className="font-bold text-black/45">
            Growth Engine
          </Link>
        </div>
      </div>
    </div>
  );
}
