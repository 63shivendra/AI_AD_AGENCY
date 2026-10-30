import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enqueueRender } from "@/lib/render";
import { buildBeats, higgsfieldReady } from "@/lib/render/ugc";

export const maxDuration = 900;

/**
 * Create a five-beat AI UGC ad for a client and enqueue generation + render.
 *
 * Paid: two stills + five image-to-video generations on Higgsfield. The clips
 * are cached under public/assets/trend/ugc/<adId>, so re-renders are free.
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (!higgsfieldReady()) {
    return NextResponse.json(
      {
        error:
          "Higgsfield is not configured. Add HIGGSFIELD_API_KEY_ID and HIGGSFIELD_API_KEY_SECRET to .env, then restart.",
      },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => null)) as {
    offer?: string;
    price?: string;
    doctor?: string;
    proof?: string;
  } | null;

  const client = await db.client.findUnique({
    where: { slug },
    include: { offers: { orderBy: { sort: "asc" } } },
  });
  if (!client) return NextResponse.json({ error: "client not found" }, { status: 404 });

  const primary = client.offers.find((o) => o.isPrimary) ?? client.offers[0];
  const offerText = body?.offer?.trim() || primary?.title;
  const price = body?.price?.trim() || primary?.price || undefined;
  const doctor = body?.doctor?.trim() || client.contactName || undefined;
  const proof = body?.proof?.trim() || client.proof || undefined;

  const beats = buildBeats({
    id: "",
    slug: client.slug,
    brandName: client.name,
    area: client.area,
    phone: client.phone,
    niche: client.niche,
    offer: offerText,
    price,
    doctor,
    proof,
  });

  const ad = await db.ad.create({
    data: {
      clientId: client.id,
      title: `AI UGC — ${client.name}`,
      hook: beats[0].line,
      script: JSON.stringify({
        format: "UGC",
        offerText,
        price,
        doctor,
        proof,
        voiceScript: beats.map((b) => b.line).join(" "),
        ugc: { beats },
      }),
      format: "UGC",
      platform: "META",
      status: "DRAFT",
      durationSec: 25,
      thumbTone: "violet",
    },
  });

  const job = await db.job.create({
    data: {
      clientId: client.id,
      type: "RENDER",
      status: "QUEUED",
      progress: 2,
      payload: JSON.stringify({ adId: ad.id, adTitle: ad.title, reason: "ugc" }),
    },
  });

  void enqueueRender(job.id);

  return NextResponse.json({ adId: ad.id, jobId: job.id, beats });
}
