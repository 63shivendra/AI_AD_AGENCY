import { db } from "@/lib/db";
import { renderVideo, type RenderScene } from "./video";

type JobResult = { videoUrl: string | null; posterUrl: string | null; ms: number; engine: string };

let chain: Promise<unknown> = Promise.resolve();

/** Single-process FIFO worker. Swap for Upstash/BullMQ in production. */
export function enqueueRender(jobId: string) {
  chain = chain
    .then(() => processRender(jobId))
    .catch((err) => console.error("[render-queue]", err));
  return chain;
}

async function processRender(jobId: string) {
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) return;

  const payload = JSON.parse(job.payload || "{}") as { adId?: string };
  if (!payload.adId) return;

  const ad = await db.ad.findUnique({
    where: { id: payload.adId },
    include: { client: true },
  });
  if (!ad) return;

  await db.job.update({ where: { id: jobId }, data: { status: "RUNNING", progress: 18 } });
  await db.ad.update({ where: { id: ad.id }, data: { status: "RENDERING" } });

  const script = JSON.parse(ad.script || "{}") as { scenes?: RenderScene[] };
  const scenes: RenderScene[] =
    script.scenes?.length
      ? script.scenes
      : [
          { label: "Hook", text: ad.hook, sub: ad.client.area },
          { label: "Offer", text: "Aaj hi visit karo", sub: ad.client.address },
          { label: "CTA", text: "WhatsApp karo", sub: ad.client.phone },
        ];

  await db.job.update({ where: { id: jobId }, data: { progress: 42 } });

  let result: JobResult;
  try {
    if (process.env.RENDER_DRIVER === "modal" && process.env.MODAL_RENDER_URL) {
      result = await renderOnModal({
        id: ad.id,
        brandColor: ad.client.brandColor,
        brandName: ad.client.name,
        area: ad.client.area,
        phone: ad.client.phone,
        slug: ad.client.slug,
        niche: ad.client.niche,
        scenes,
        durationSec: ad.durationSec,
      });
    } else {
      const local = await renderVideo({
        id: ad.id,
        brandColor: ad.client.brandColor,
        brandName: ad.client.name,
        area: ad.client.area,
        phone: ad.client.phone,
        slug: ad.client.slug,
        niche: ad.client.niche,
        scenes,
        durationSec: ad.durationSec,
      });
      result = {
        videoUrl: local.videoUrl,
        posterUrl: local.posterUrl,
        ms: local.ms,
        engine: local.engine,
      };
    }
  } catch (err) {
    await db.job.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        progress: 100,
        error: err instanceof Error ? err.message : "render failed",
        finishedAt: new Date(),
      },
    });
    await db.ad.update({ where: { id: ad.id }, data: { status: "DRAFT" } });
    return;
  }

  await db.job.update({ where: { id: jobId }, data: { progress: 88 } });

  await db.ad.update({
    where: { id: ad.id },
    data: {
      status: "READY",
      videoUrl: result.videoUrl,
      posterUrl: result.posterUrl,
      thumbTone: ad.thumbTone,
    },
  });

  await db.job.update({
    where: { id: jobId },
    data: {
      status: "DONE",
      progress: 100,
      result: JSON.stringify({
        ...result,
        poster: result.posterUrl,
        sizeMb: result.videoUrl ? Number((result.ms / 1000).toFixed(1)) : 0,
      }),
      finishedAt: new Date(),
    },
  });

  await db.event.create({
    data: {
      clientId: ad.clientId,
      type: "RENDER",
      title: "Ad rendered",
      detail: `${ad.title} — ${(result.ms / 1000).toFixed(1)}s on ${
        process.env.RENDER_DRIVER === "modal" ? "Modal GPU" : "local ffmpeg"
      }`,
    },
  });
}

async function renderOnModal(input: {
  id: string;
  brandColor: string;
  brandName: string;
  area: string;
  phone: string;
  slug?: string;
  niche?: string;
  scenes: RenderScene[];
  durationSec: number;
}): Promise<JobResult> {
  const started = Date.now();
  const res = await fetch(process.env.MODAL_RENDER_URL!, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) throw new Error(`Modal render failed: ${res.status}`);
  const data = (await res.json()) as { videoUrl: string; posterUrl?: string; seconds?: number };
  return {
    videoUrl: data.videoUrl,
    posterUrl: data.posterUrl ?? null,
    ms: Date.now() - started,
    engine: "Modal T4 GPU",
  };
}
