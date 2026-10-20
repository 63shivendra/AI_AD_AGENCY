import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enqueueRender } from "@/lib/render";

export const maxDuration = 120;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { adId?: string } | null;
  if (!body?.adId) return NextResponse.json({ error: "adId is required" }, { status: 400 });

  const ad = await db.ad.findUnique({ where: { id: body.adId }, include: { client: true } });
  if (!ad) return NextResponse.json({ error: "ad not found" }, { status: 404 });

  const job = await db.job.create({
    data: {
      clientId: ad.clientId,
      type: "RENDER",
      status: "QUEUED",
      progress: 4,
      payload: JSON.stringify({
        adId: ad.id,
        adTitle: ad.title,
        engine: process.env.RENDER_DRIVER === "modal" ? "modal" : "ffmpeg",
      }),
    },
  });

  // Fire-and-forget: the queue keeps the process alive and updates progress in the DB.
  void enqueueRender(job.id);

  return NextResponse.json({ jobId: job.id, adId: ad.id });
}
