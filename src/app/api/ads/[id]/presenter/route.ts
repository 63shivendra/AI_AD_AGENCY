import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enqueueRender } from "@/lib/render";
import { presenterAvailability } from "@/lib/env";

export const maxDuration = 120;

const MODES = ["auto", "owner", "avatar", "stock"] as const;
type Mode = (typeof MODES)[number];

/**
 * Set the presenter path for a trend reel and re-render it.
 *
 * auto   → owner clip > HeyGen avatar > stock narrator
 * owner  → the client's own recording (most realistic)
 * avatar → HeyGen lip-synced presenter + b-roll PiP
 * stock  → the offline narrator fallback
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { mode?: string } | null;
  const mode = body?.mode as Mode | undefined;

  if (!mode || !MODES.includes(mode)) {
    return NextResponse.json({ error: "mode must be auto | owner | avatar | stock" }, { status: 400 });
  }

  const ad = await db.ad.findUnique({ where: { id }, include: { client: true } });
  if (!ad) return NextResponse.json({ error: "ad not found" }, { status: 404 });
  if (ad.format !== "TREND") {
    return NextResponse.json({ error: "Presenter options apply to trend reels only" }, { status: 400 });
  }

  const availability = presenterAvailability(ad.client.slug);
  if (mode === "owner" && !availability.owner) {
    return NextResponse.json(
      {
        error: `No owner clip yet. Add public/assets/presenters/${ad.client.slug}/owner.mp4`,
      },
      { status: 400 }
    );
  }
  if (mode === "avatar" && !availability.avatar) {
    return NextResponse.json(
      { error: "HeyGen is not configured. Set HEYGEN_API_KEY, HEYGEN_AVATAR_ID and HEYGEN_VOICE_ID." },
      { status: 400 }
    );
  }

  const script = JSON.parse(ad.script || "{}") as Record<string, unknown>;
  script.presenterMode = mode;
  await db.ad.update({ where: { id }, data: { script: JSON.stringify(script) } });

  const job = await db.job.create({
    data: {
      clientId: ad.clientId,
      type: "RENDER",
      status: "QUEUED",
      progress: 4,
      payload: JSON.stringify({
        adId: ad.id,
        adTitle: ad.title,
        reason: `presenter:${mode}`,
        engine: process.env.RENDER_DRIVER === "modal" ? "modal" : "ffmpeg",
      }),
    },
  });

  // Fire-and-forget: the queue updates progress in the DB; the client polls /api/jobs/[id].
  void enqueueRender(job.id);

  return NextResponse.json({ jobId: job.id, adId: ad.id, mode });
}
