import type { Ad, Client } from "@prisma/client";
import { renderVideo, type RenderResult, type RenderScene } from "./video";
import { renderTrendVideo, type PresenterMode } from "./trend";
import { renderUgcAd, type UgcBeat } from "./ugc";

export type AdWithClient = Ad & { client: Client };

export type AdRenderResult = RenderResult & { presenterKind?: string };

type StoredScript = {
  scenes?: RenderScene[];
  trend?: string;
  manifest?: string;
  voiceScript?: string;
  offerText?: string;
  price?: string;
  doctor?: string;
  proof?: string;
  presenterMode?: PresenterMode;
  ugc?: {
    beats?: UgcBeat[];
    actorPrompt?: string;
    voice?: string;
  };
};

export type RenderOptions = { onProgress?: (progress: number) => void };

/**
 * One entry point for all three pipelines.
 *
 * REEL    → the cinematic photo/ffmpeg renderer.
 * TREND   → beat-cut stock/clinic footage with a hook/CTA presenter.
 * UGC     → AI-generated five-beat ad (Higgsfield stills + image-to-video).
 *
 * A missing trend manifest or a failed avatar call falls back to the cinematic
 * renderer so a demo never ends with a broken ad. UGC failures are surfaced
 * instead of silently downgrading, because those generations cost money.
 */
export async function renderAd(ad: AdWithClient, opts: RenderOptions = {}): Promise<AdRenderResult> {
  const script = JSON.parse(ad.script || "{}") as StoredScript;

  if (ad.format === "UGC") {
    return renderUgcAd({
      id: ad.id,
      slug: ad.client.slug,
      brandName: ad.client.name,
      brandColor: ad.client.brandColor,
      area: ad.client.area,
      phone: ad.client.phone,
      niche: ad.client.niche,
      offer: script.offerText,
      price: script.price,
      doctor: script.doctor,
      proof: script.proof,
      beats: script.ugc?.beats,
      actorPrompt: script.ugc?.actorPrompt,
      voice: script.ugc?.voice,
      onProgress: opts.onProgress,
    });
  }

  if (ad.format === "TREND") {
    try {
      return await renderTrendVideo({
        id: ad.id,
        slug: ad.client.slug,
        brandName: ad.client.name,
        brandColor: ad.client.brandColor,
        area: ad.client.area,
        phone: ad.client.phone,
        niche: ad.client.niche,
        manifest: script.trend || script.manifest,
        offer: script.offerText,
        price: script.price,
        doctor: script.doctor,
        proof: script.proof,
        voiceScript: script.voiceScript,
        presenterMode: script.presenterMode,
        durationSec: ad.durationSec,
      });
    } catch (err) {
      console.error("[render] trend render failed; falling back to cinematic", ad.id, err);
    }
  }

  const scenes: RenderScene[] = script.scenes?.length
    ? script.scenes
    : [
        { label: "Hook", text: ad.hook, sub: ad.client.area },
        { label: "Offer", text: "Aaj hi visit karo", sub: ad.client.address },
        { label: "CTA", text: "WhatsApp karo", sub: ad.client.phone },
      ];

  return renderVideo({
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
}
