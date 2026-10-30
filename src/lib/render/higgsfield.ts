import { mkdirSync, existsSync, statSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * Higgsfield API client.
 *
 * One authenticated, asynchronous API for image + video models. Submit to a
 * model endpoint, then poll `status_url` until a terminal state.
 *
 * Auth:  Authorization: Key <API_KEY_ID>:<API_KEY_SECRET>
 * Docs:  https://docs.higgsfield.ai
 *
 * Default models are the confirmed public endpoints:
 *   image  /higgsfield-ai/soul/standard
 *   video  /kling-video/v2.5-turbo/pro/image-to-video
 *
 * Seedance / Nano Banana are exposed per-account in the Higgsfield console.
 * Point HIGGSFIELD_IMAGE_MODEL / HIGGSFIELD_VIDEO_MODEL at the path shown
 * there to use them without a code change.
 */

const BASE = process.env.HIGGSFIELD_BASE_URL || "https://api.higgsfield.ai";

const IMAGE_MODEL = process.env.HIGGSFIELD_IMAGE_MODEL || "/higgsfield-ai/soul/standard";
const VIDEO_MODEL =
  process.env.HIGGSFIELD_VIDEO_MODEL || "/kling-video/v2.5-turbo/pro/image-to-video";

export function higgsfieldConfigured() {
  return Boolean(process.env.HIGGSFIELD_API_KEY_ID && process.env.HIGGSFIELD_API_KEY_SECRET);
}

function authHeader() {
  const id = process.env.HIGGSFIELD_API_KEY_ID;
  const secret = process.env.HIGGSFIELD_API_KEY_SECRET;
  if (!id || !secret) throw new Error("Higgsfield is not configured");
  return `Key ${id}:${secret}`;
}

type SubmitResponse = {
  status?: string;
  request_id?: string;
  status_url?: string;
  detail?: string;
};

type MediaOutput = { url?: string };

type StatusResponse = {
  status: "queued" | "in_progress" | "nsfw" | "failed" | "completed" | "canceled";
  request_id: string;
  error?: string | null;
  images?: MediaOutput[];
  video?: MediaOutput;
  audio?: MediaOutput;
  audios?: MediaOutput[];
  expires_at?: string | null;
};

const TERMINAL_BAD = new Set(["failed", "nsfw", "canceled"]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function submit(endpoint: string, body: unknown): Promise<SubmitResponse> {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: "POST",
    headers: {
      authorization: authHeader(),
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  const json = (await res.json().catch(() => ({}))) as SubmitResponse;
  if (!res.ok) {
    throw new Error(`Higgsfield submit failed: ${res.status} ${json.detail ?? "unknown error"}`);
  }
  if (!json.status_url) throw new Error("Higgsfield submit returned no status_url");
  return json;
}

async function waitForResult(
  statusUrl: string,
  onProgress?: (status: string) => void,
  timeoutMs = 420_000
): Promise<StatusResponse> {
  const started = Date.now();
  let delay = 2_000;

  while (Date.now() - started < timeoutMs) {
    const res = await fetch(statusUrl, {
      headers: { authorization: authHeader() },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Higgsfield status failed: ${res.status}`);

    const json = (await res.json()) as StatusResponse;
    onProgress?.(json.status);

    if (json.status === "completed") return json;
    if (TERMINAL_BAD.has(json.status)) {
      throw new Error(
        `Higgsfield ${json.status}${json.error ? `: ${json.error}` : ""} (request ${json.request_id})`
      );
    }

    await sleep(delay);
    delay = Math.min(Math.round(delay * 1.35), 10_000);
  }

  throw new Error("Higgsfield request timed out");
}

async function download(url: string, file: string) {
  mkdirSync(dirname(file), { recursive: true });
  if (existsSync(file) && statSync(file).size > 50_000) return file;

  const res = await fetch(url, { signal: AbortSignal.timeout(180_000) });
  if (!res.ok) throw new Error(`Higgsfield download failed: ${res.status}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

export type GeneratedImage = { url: string; file: string };
export type GeneratedClip = { url: string; file: string };

/** Text-to-image. Soul defaults to 9:16 so the still can drive vertical video. */
export async function generateImage(opts: {
  prompt: string;
  file: string;
  aspectRatio?: string;
  resolution?: "2K" | "4K";
  onProgress?: (status: string) => void;
}): Promise<GeneratedImage> {
  const submitted = await submit(IMAGE_MODEL, {
    prompt: opts.prompt,
    aspect_ratio: opts.aspectRatio ?? "9:16",
    resolution: opts.resolution ?? "2K",
    num_images: 1,
  });
  const done = await waitForResult(submitted.status_url!, opts.onProgress);
  const url = done.images?.[0]?.url;
  if (!url) throw new Error("Higgsfield image completed without an output URL");
  await download(url, opts.file);
  return { url, file: opts.file };
}

/** Image-to-video. 5s or 10s per generation. */
export async function generateVideo(opts: {
  prompt: string;
  imageUrl: string;
  file: string;
  duration?: 5 | 10;
  negativePrompt?: string;
  onProgress?: (status: string) => void;
}): Promise<GeneratedClip> {
  const submitted = await submit(VIDEO_MODEL, {
    prompt: opts.prompt,
    image_url: opts.imageUrl,
    duration: opts.duration ?? 5,
    cfg_scale: 0.5,
    negative_prompt:
      opts.negativePrompt ??
      "blurry, distorted face, extra fingers, deformed hands, text, watermark, logo, cartoon, 3d render",
  });
  const done = await waitForResult(submitted.status_url!, opts.onProgress);
  const url = done.video?.url;
  if (!url) throw new Error("Higgsfield video completed without an output URL");
  await download(url, opts.file);
  return { url, file: opts.file };
}
