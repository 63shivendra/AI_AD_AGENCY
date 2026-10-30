import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type Integration = {
  key: string;
  name: string;
  role: string;
  live: boolean;
  detail: string;
  env: string;
};

function hasOwnerClip() {
  const dir = join(process.cwd(), "public", "assets", "presenters");
  try {
    if (!existsSync(dir)) return false;
    return readdirSync(dir, { recursive: true }).some((file) => String(file).endsWith(".mp4"));
  } catch {
    return false;
  }
}

export function integrations(): Integration[] {
  const gemini = Boolean(process.env.GEMINI_API_KEY);
  const modal = Boolean(process.env.MODAL_RENDER_URL && process.env.RENDER_DRIVER === "modal");
  const r2 = Boolean(process.env.R2_BUCKET && process.env.R2_ACCESS_KEY_ID);
  const meta = Boolean(process.env.META_ACCESS_TOKEN);
  const tiktok = Boolean(process.env.TIKTOK_ACCESS_TOKEN);
  const heygen = Boolean(
    process.env.HEYGEN_API_KEY && process.env.HEYGEN_AVATAR_ID && process.env.HEYGEN_VOICE_ID
  );
  const owner = hasOwnerClip();
  const higgsfield = Boolean(
    process.env.HIGGSFIELD_API_KEY_ID && process.env.HIGGSFIELD_API_KEY_SECRET
  );

  return [
    {
      key: "gemini",
      name: "Gemini Flash",
      role: "Hinglish scripts, hooks, review copy",
      live: gemini,
      detail: gemini ? "Live — generating with your key" : "Fallback copywriter (no key needed)",
      env: "GEMINI_API_KEY",
    },
    {
      key: "render",
      name: modal ? "Modal GPU" : "Local FFmpeg",
      role: "1080p vertical video synthesis",
      live: true,
      detail: modal ? "Modal serverless T4 worker" : "Rendering on this machine",
      env: modal ? "MODAL_RENDER_URL" : "RENDER_DRIVER=local",
    },
    {
      key: "presenter",
      name: owner ? "Owner presenter" : heygen ? "HeyGen avatar" : "Stock presenter",
      role: "Trend reel hook + CTA",
      live: true,
      detail: owner
        ? "Owner clip found — real audio, real person"
        : heygen
          ? "Avatar + Hindi voice configured — lip-synced, with b-roll PiP"
          : "Stock actor + Hinglish narrator — no lip-sync",
      env: owner ? "public/assets/presenters/" : heygen ? "HEYGEN_AVATAR_ID" : "HEYGEN_API_KEY",
    },
    {
      key: "higgsfield",
      name: "Higgsfield UGC",
      role: "AI actor + image-to-video ads",
      live: higgsfield,
      detail: higgsfield
        ? "Key connected — 5-beat UGC generation enabled"
        : "Add an API key ID + secret to generate AI UGC ads",
      env: "HIGGSFIELD_API_KEY_ID · HIGGSFIELD_API_KEY_SECRET",
    },
    {
      key: "heygen",
      name: "HeyGen avatar",
      role: "Lip-synced AI presenter",
      live: heygen,
      detail: heygen
        ? "Avatar and voice IDs connected"
        : "Optional — add key, avatar ID and Hindi voice ID",
      env: "HEYGEN_API_KEY",
    },
    {
      key: "storage",
      name: r2 ? "Cloudflare R2" : "Local storage",
      role: "Zero-egress video + proxy storage",
      live: true,
      detail: r2 ? `Bucket: ${process.env.R2_BUCKET}` : "Serving from /public/renders",
      env: "R2_BUCKET",
    },
    {
      key: "meta",
      name: "Meta Ads",
      role: "Publish + ROAS webhooks",
      live: meta,
      detail: meta ? "Ad account connected" : "Sandbox mode — publish is simulated",
      env: "META_ACCESS_TOKEN",
    },
    {
      key: "tiktok",
      name: "TikTok Ads",
      role: "Reels distribution",
      live: tiktok,
      detail: tiktok ? "Advertiser connected" : "Sandbox mode",
      env: "TIKTOK_ACCESS_TOKEN",
    },
    {
      key: "whatsapp",
      name: "WhatsApp deep links",
      role: "Lead capture without API fees",
      live: true,
      detail: "wa.me links — always free, always on",
      env: "—",
    },
  ];
}

export type PresenterOption = {
  key: "owner" | "avatar" | "stock";
  name: string;
  role: string;
  live: boolean;
  detail: string;
  env: string;
};

export function ownerClipSlugs(): string[] {
  const dir = join(process.cwd(), "public", "assets", "presenters");
  try {
    if (!existsSync(dir)) return [];
    return readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((slug) => existsSync(join(dir, slug, "owner.mp4")));
  } catch {
    return [];
  }
}

/**
 * The three trend-reel presenter paths, most realistic first. `auto` on a reel
 * resolves owner → avatar → stock; each reel also has an explicit picker in the
 * ad library.
 */
export function presenterOptions(): PresenterOption[] {
  const slugs = ownerClipSlugs();
  const heygen = Boolean(
    process.env.HEYGEN_API_KEY && process.env.HEYGEN_AVATAR_ID && process.env.HEYGEN_VOICE_ID
  );
  return [
    {
      key: "owner",
      name: "Owner clip",
      role: "Real person, real voice — most realistic",
      live: slugs.length > 0,
      detail:
        slugs.length > 0
          ? `Found: ${slugs.join(", ")} — renderer uses the owner's own face and audio`
          : "Drop a vertical, 15–30s clip to switch this on for a client",
      env: "public/assets/presenters/<client-slug>/owner.mp4",
    },
    {
      key: "avatar",
      name: "AI avatar · HeyGen",
      role: "Synthetic lip-synced presenter + b-roll PiP",
      live: heygen,
      detail: heygen
        ? "Avatar + Hindi voice connected — lip-synced, with circular PiP over b-roll"
        : "Add key, avatar ID and a Hindi voice ID to switch this on",
      env: "HEYGEN_API_KEY · HEYGEN_AVATAR_ID · HEYGEN_VOICE_ID",
    },
    {
      key: "stock",
      name: "Stock narrator",
      role: "Offline fallback — real footage, no lip-sync",
      live: true,
      detail: "Always available; labelled honestly as a narrator, never as the client's staff",
      env: "public/assets/trend/<client>/stock/*.mp4",
    },
  ];
}

/** Which presenter options are usable right now (owner is per-client). */
export function presenterAvailability(slug?: string) {
  const heygen = Boolean(
    process.env.HEYGEN_API_KEY && process.env.HEYGEN_AVATAR_ID && process.env.HEYGEN_VOICE_ID
  );
  const owner = slug ? ownerClipSlugs().includes(slug) : ownerClipSlugs().length > 0;
  return { owner, avatar: heygen, stock: true };
}

export const agencyName = () => process.env.NEXT_PUBLIC_AGENCY_NAME || "Growth Engine";
