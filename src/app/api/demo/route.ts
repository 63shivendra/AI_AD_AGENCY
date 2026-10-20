import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { db } from "@/lib/db";
import { renderVideo } from "@/lib/render/video";

export const maxDuration = 120;

const run = promisify(execFile);

/**
 * Render any ad that is missing media, in the background.
 * Every ad gets a real MP4 + poster — a reel is a video, not a still.
 */
async function queueWarmup() {
  const ads = await db.ad.findMany({
    where: {
      status: { not: "DRAFT" },
      OR: [{ videoUrl: null }, { posterUrl: null }],
    },
    include: { client: true },
    take: 40,
    orderBy: { hitScore: "desc" },
  });

  void (async () => {
    for (const ad of ads) {
      const script = JSON.parse(ad.script || "{}") as {
        scenes?: { label: string; text: string; sub?: string }[];
      };
      try {
        const out = await renderVideo({
          id: ad.id,
          brandColor: ad.client.brandColor,
          brandName: ad.client.name,
          area: ad.client.area,
          phone: ad.client.phone,
          slug: ad.client.slug,
          niche: ad.client.niche,
          scenes: script.scenes ?? [],
          durationSec: ad.durationSec,
        });
        if (out.videoUrl || out.posterUrl) {
          await db.ad.update({
            where: { id: ad.id },
            data: {
              videoUrl: out.videoUrl,
              posterUrl: out.posterUrl,
            },
          });
        }
      } catch (err) {
        console.error("[warmup]", ad.id, err);
      }
    }
  })();

  return ads.length;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { action?: string };

  if (body.action === "reset") {
    const { stdout } = await run("node", [join(process.cwd(), "scripts", "seed.mjs")], {
      cwd: process.cwd(),
      timeout: 60_000,
    });
    // Fresh IDs have no media. Re-render so the demo never falls back to stills.
    const queued = await queueWarmup();
    return NextResponse.json({
      ok: true,
      queued,
      output: stdout.trim().split("\n").slice(-2),
    });
  }

  if (body.action === "warmup") {
    const queued = await queueWarmup();
    return NextResponse.json({ ok: true, queued });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
