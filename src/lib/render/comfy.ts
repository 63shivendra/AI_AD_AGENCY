import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { basename, dirname } from "node:path";
import ffmpegPath from "ffmpeg-static";

/**
 * ComfyUI client — the open-source generation backend.
 *
 * Replaces the paid Higgsfield calls with a local ComfyUI server:
 *   stills  SDXL text-to-image
 *   clips   LTX-Video image-to-video
 *
 * Set AI_VIDEO_PROVIDER=comfy and run ComfyUI on COMFY_URL (default
 * http://127.0.0.1:8188). No API key, no per-generation cost.
 */

const BASE = (process.env.COMFY_URL || "http://127.0.0.1:8188").replace(/\/$/, "");

const SDXL_FILE = process.env.COMFY_SDXL_MODEL || "sd_xl_base_1.0.safetensors";
const LTX_FILE = process.env.COMFY_LTX_MODEL || "ltx-video-2b-v0.9.5.safetensors";
const T5_FILE = process.env.COMFY_T5_MODEL || "t5xxl_fp8_e4m3fn.safetensors";

const CLIENT_ID = "growth-engine";

export function comfyConfigured() {
  return true;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function ffmpeg() {
  return ffmpegPath as unknown as string;
}

function runFfmpeg(args: string[]) {
  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn(ffmpeg(), args);
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`ffmpeg exited ${code}\n${stderr.slice(-1600)}`));
    });
  });
}

type ComfyFile = { filename: string; subfolder: string; type: string };

async function submit(workflow: Record<string, unknown>): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/prompt`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: workflow, client_id: CLIENT_ID }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new Error(`ComfyUI is not reachable at ${BASE}. Start it and retry.`);
  }
  const json = (await res.json().catch(() => ({}))) as {
    prompt_id?: string;
    error?: unknown;
    node_errors?: unknown;
  };
  if (!res.ok || !json.prompt_id) {
    throw new Error(
      `ComfyUI rejected the workflow: ${res.status} ${JSON.stringify(
        json.error ?? json.node_errors ?? json
      )}`
    );
  }
  return json.prompt_id;
}

async function waitForPrompt(
  promptId: string,
  onProgress?: (note: string) => void,
  timeoutMs = 2_400_000
): Promise<ComfyFile[]> {
  const started = Date.now();
  let ticks = 0;

  while (Date.now() - started < timeoutMs) {
    await sleep(2_000);
    ticks += 1;
    if (ticks % 15 === 0) onProgress?.("running");

    const res = await fetch(`${BASE}/history/${promptId}`, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) continue;

    const json = (await res.json()) as Record<
      string,
      {
        status?: { status_str?: string; messages?: unknown };
        outputs?: Record<string, { images?: ComfyFile[]; gifs?: ComfyFile[]; videos?: ComfyFile[] }>;
      }
    >;
    const entry = json[promptId];
    if (!entry) continue;

    if (entry.status?.status_str === "error") {
      throw new Error(`ComfyUI error: ${JSON.stringify(entry.status.messages ?? entry.status)}`);
    }

    const files = Object.values(entry.outputs ?? {}).flatMap((out) => [
      ...(out.images ?? []),
      ...(out.gifs ?? []),
      ...(out.videos ?? []),
    ]);
    if (files.length) return files;
  }

  throw new Error("ComfyUI generation timed out");
}

async function downloadFile(file: ComfyFile, out: string) {
  const url = `${BASE}/view?filename=${encodeURIComponent(file.filename)}&subfolder=${encodeURIComponent(
    file.subfolder || ""
  )}&type=${encodeURIComponent(file.type || "output")}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(180_000) });
  if (!res.ok) throw new Error(`ComfyUI download failed: ${res.status}`);
  mkdirSync(dirname(out), { recursive: true });
  await writeFile(out, Buffer.from(await res.arrayBuffer()));
  return out;
}

async function uploadImage(file: string): Promise<string> {
  const bytes = readFileSync(file);
  const form = new FormData();
  form.append("image", new Blob([new Uint8Array(bytes)]), basename(file));
  form.append("overwrite", "true");

  const res = await fetch(`${BASE}/upload/image`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  const json = (await res.json().catch(() => ({}))) as { name?: string; error?: string };
  if (!res.ok || !json.name) {
    throw new Error(`ComfyUI image upload failed: ${res.status} ${json.error ?? ""}`);
  }
  return json.name;
}

/** SDXL text-to-image. 768x1344 is the SDXL-native 9:16-ish canvas. */
export async function comfyImage(opts: {
  prompt: string;
  file: string;
  width?: number;
  height?: number;
  steps?: number;
  seed?: number;
}): Promise<{ url: string; file: string }> {
  const seed = opts.seed ?? Math.floor(Math.random() * 1_000_000_000);
  const workflow = {
    "1": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: SDXL_FILE } },
    "2": { class_type: "CLIPTextEncode", inputs: { text: opts.prompt, clip: ["1", 1] } },
    "3": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: "extreme close-up, face only, cropped head, blurry, low quality, deformed face, extra fingers, bad anatomy, text, watermark, logo, cartoon, 3d render",
        clip: ["1", 1],
      },
    },
    "4": {
      class_type: "EmptyLatentImage",
      inputs: { width: opts.width ?? 768, height: opts.height ?? 1344, batch_size: 1 },
    },
    "5": {
      class_type: "KSampler",
      inputs: {
        seed,
        steps: opts.steps ?? 26,
        cfg: 6,
        sampler_name: "dpmpp_2m",
        scheduler: "karras",
        denoise: 1,
        model: ["1", 0],
        positive: ["2", 0],
        negative: ["3", 0],
        latent_image: ["4", 0],
      },
    },
    "6": { class_type: "VAEDecode", inputs: { samples: ["5", 0], vae: ["1", 2] } },
    "7": {
      class_type: "SaveImage",
      inputs: { filename_prefix: "ugc_still", images: ["6", 0] },
    },
  };

  const promptId = await submit(workflow);
  const files = await waitForPrompt(promptId);
  await downloadFile(files[0], opts.file);
  return { url: "", file: opts.file };
}

/** LTX-Video image-to-video, 25fps, 97 frames (~3.9s) by default. */
export async function comfyClip(opts: {
  prompt: string;
  imageFile: string;
  file: string;
  width?: number;
  height?: number;
  frames?: number;
  steps?: number;
  seed?: number;
  onProgress?: (note: string) => void;
}): Promise<{ url: string; file: string }> {
  const width = opts.width ?? (Number(process.env.COMFY_VIDEO_WIDTH) || 512);
  const height = opts.height ?? (Number(process.env.COMFY_VIDEO_HEIGHT) || 896);
  const frames = opts.frames ?? (Number(process.env.COMFY_FRAMES) || 97);
  const seed = opts.seed ?? Math.floor(Math.random() * 1_000_000_000);
  const image = await uploadImage(opts.imageFile);

  const negative =
    "zoom, camera movement, cut, scene change, morphing face, distorted face, low quality, worst quality, deformed, motion smear, motion artifacts, fused fingers, bad anatomy, extra limbs, text, watermark, logo, cartoon, 3d render";

  const workflow = {
    "38": { class_type: "CLIPLoader", inputs: { clip_name: T5_FILE, type: "ltxv", device: "default" } },
    "44": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: LTX_FILE } },
    "6": { class_type: "CLIPTextEncode", inputs: { text: opts.prompt, clip: ["38", 0] } },
    "7": { class_type: "CLIPTextEncode", inputs: { text: negative, clip: ["38", 0] } },
    "78": { class_type: "LoadImage", inputs: { image } },
    "82": { class_type: "LTXVPreprocess", inputs: { image: ["78", 0], img_compression: 40 } },
    "95": {
      class_type: "LTXVImgToVideo",
      inputs: {
        positive: ["6", 0],
        negative: ["7", 0],
        vae: ["44", 2],
        image: ["82", 0],
        width,
        height,
        length: frames,
        batch_size: 1,
        strength: 1,
      },
    },
    "69": {
      class_type: "LTXVConditioning",
      inputs: { positive: ["95", 0], negative: ["95", 1], frame_rate: 25 },
    },
    "71": {
      class_type: "LTXVScheduler",
      inputs: {
        steps: opts.steps ?? (Number(process.env.COMFY_STEPS) || 30),
        max_shift: 2.05,
        base_shift: 0.95,
        stretch: true,
        terminal: 0.1,
        latent: ["95", 2],
      },
    },
    "73": { class_type: "KSamplerSelect", inputs: { sampler_name: "euler" } },
    "72": {
      class_type: "SamplerCustom",
      inputs: {
        model: ["44", 0],
        add_noise: true,
        noise_seed: seed,
        cfg: 3,
        positive: ["69", 0],
        negative: ["69", 1],
        sampler: ["73", 0],
        sigmas: ["71", 0],
        latent_image: ["95", 2],
      },
    },
    "8": { class_type: "VAEDecode", inputs: { samples: ["72", 0], vae: ["44", 2] } },
    "86": {
      class_type: "SaveWEBM",
      inputs: { images: ["8", 0], filename_prefix: "ugc_clip", codec: "vp9", fps: 25, crf: 12 },
    },
  };

  const promptId = await submit(workflow);
  const files = await waitForPrompt(promptId, opts.onProgress);
  const raw = `${opts.file}.raw${files[0].filename.endsWith(".webm") ? ".webm" : ".mp4"}`;
  await downloadFile(files[0], raw);

  // Normalise to the 1080x1920 / 30fps contract used by the trend renderer.
  await runFfmpeg([
    "-y",
    "-i",
    raw,
    "-vf",
    "scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,fps=30,unsharp=5:5:0.5",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-an",
    opts.file,
  ]);
  rmSync(raw, { force: true });

  if (!statSync(opts.file).size) throw new Error("ComfyUI produced an empty clip");
  return { url: "", file: opts.file };
}
