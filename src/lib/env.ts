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

export const agencyName = () => process.env.NEXT_PUBLIC_AGENCY_NAME || "Growth Engine";
