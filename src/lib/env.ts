export type Integration = {
  key: string;
  name: string;
  role: string;
  live: boolean;
  detail: string;
  env: string;
};

export function integrations(): Integration[] {
  const gemini = Boolean(process.env.GEMINI_API_KEY);
  const modal = Boolean(process.env.MODAL_RENDER_URL && process.env.RENDER_DRIVER === "modal");
  const r2 = Boolean(process.env.R2_BUCKET && process.env.R2_ACCESS_KEY_ID);
  const meta = Boolean(process.env.META_ACCESS_TOKEN);
  const tiktok = Boolean(process.env.TIKTOK_ACCESS_TOKEN);

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
