import { existsSync, mkdirSync, statSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * HeyGen avatar adapter.
 *
 * This is the only presenter path that gives us a synthetic person with real
 * lip-sync without an owner recording. It is intentionally optional: without
 * all three env vars the trend renderer falls back to the stock presenter.
 *
 * Docs: https://docs.heygen.com/reference/create-an-avatar-video-v2
 */
export function avatarConfigured() {
  return Boolean(
    process.env.HEYGEN_API_KEY && process.env.HEYGEN_AVATAR_ID && process.env.HEYGEN_VOICE_ID
  );
}

type HeyGenCreate = {
  error?: { message?: string } | null;
  data?: { video_id?: string };
};

type HeyGenStatus = {
  code?: number;
  message?: string;
  data?: {
    status?: "waiting" | "pending" | "processing" | "completed" | "failed";
    video_url?: string;
    duration?: number;
    error?: { message?: string } | null;
  };
};

export type AvatarVideo = {
  file: string;
  ms: number;
  cached: boolean;
};

/** Generate (or reuse) a 1080×1920 lip-synced avatar clip for the full voice script. */
export async function generateAvatarVideo(id: string, script: string): Promise<AvatarVideo> {
  if (!avatarConfigured()) throw new Error("HeyGen is not configured");
  const key = process.env.HEYGEN_API_KEY!;
  const avatarId = process.env.HEYGEN_AVATAR_ID!;
  const voiceId = process.env.HEYGEN_VOICE_ID!;

  const out = join(process.cwd(), "public", "renders", `avatar-${id}.mp4`);
  if (existsSync(out) && statSync(out).size > 100_000) {
    return { file: out, ms: 0, cached: true };
  }
  mkdirSync(join(process.cwd(), "public", "renders"), { recursive: true });

  const started = Date.now();
  const create = await fetch("https://api.heygen.com/v2/video/generate", {
    method: "POST",
    headers: { "x-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({
      video_inputs: [
        {
          character: { type: "avatar", avatar_id: avatarId, avatar_style: "normal" },
          voice: {
            type: "text",
            input_text: script.slice(0, 1500),
            voice_id: voiceId,
            speed: Number(process.env.HEYGEN_VOICE_SPEED || 1),
          },
        },
      ],
      dimension: { width: 1080, height: 1920 },
    }),
    signal: AbortSignal.timeout(120_000),
  });

  const created = (await create.json().catch(() => ({}))) as HeyGenCreate;
  if (!create.ok || created.error || !created.data?.video_id) {
    throw new Error(
      `HeyGen create failed: ${create.status} ${created.error?.message ?? created.error ?? "no video_id"}`
    );
  }
  const videoId = created.data.video_id;

  // HeyGen typically takes 1–3 minutes for a 13s clip. The render queue is
  // fire-and-forget, so we can wait without holding the HTTP request.
  for (let i = 0; i < 36; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const res = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`,
      {
        headers: { "x-api-key": key },
        signal: AbortSignal.timeout(30_000),
      }
    );
    const status = (await res.json().catch(() => ({}))) as HeyGenStatus;
    const data = status.data;
    if (data?.status === "completed" && data.video_url) {
      const file = await fetch(data.video_url, { signal: AbortSignal.timeout(120_000) });
      if (!file.ok) throw new Error(`HeyGen download failed: ${file.status}`);
      const bytes = Buffer.from(await file.arrayBuffer());
      await writeFile(out, bytes);
      return { file: out, ms: Date.now() - started, cached: false };
    }
    if (data?.status === "failed") {
      throw new Error(`HeyGen render failed: ${data.error?.message ?? status.message ?? "unknown"}`);
    }
  }

  throw new Error("HeyGen render timed out after 3 minutes");
}
