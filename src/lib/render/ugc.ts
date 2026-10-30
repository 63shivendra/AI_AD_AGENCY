import { spawn } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { generateImage, generateVideo, higgsfieldConfigured } from "./higgsfield";
import { renderTrendVideo, type TrendRenderResult } from "./trend";

/**
 * AI UGC ad pipeline.
 *
 * 1. Generate one consistent actor still + one product/clinic still (Higgsfield Soul).
 * 2. Animate each of the five beats from those stills (Kling / Seedance via Higgsfield).
 * 3. Synthesize the Hinglish voiceover (Edge TTS, no key).
 * 4. Write a UGC manifest and hand it to the trend renderer for the edit.
 *
 * Beats follow the reference structure: hook → problem → product → proof → CTA.
 * Generated clips and stills are cached on disk, so a re-render only pays for
 * the edit, not a second set of generations.
 */

export type UgcRole = "hook" | "problem" | "product" | "proof" | "cta";

export type UgcBeat = {
  role: UgcRole;
  /** What the voice says on this beat. */
  line: string;
  /** One or two short on-screen captions. */
  captions: [string, string] | [string];
  /** Visual action for the video model. */
  visual: string;
};

export type UgcInput = {
  id: string;
  slug: string;
  brandName: string;
  brandColor?: string;
  area: string;
  phone: string;
  niche: string;
  offer?: string;
  price?: string;
  doctor?: string;
  proof?: string;
  /** Reuse beats stored on the ad instead of deriving them. */
  beats?: UgcBeat[];
  /** Override the actor description (keeps the same face across all beats). */
  actorPrompt?: string;
  voice?: string;
  force?: boolean;
  onProgress?: (progress: number) => void;
};

export type UgcResult = TrendRenderResult & { engine: string };

type CachedMeta = { actorUrl?: string; clinicUrl?: string };

const TREND_ROOT = join(process.cwd(), "public", "assets", "trend");

function ffmpeg() {
  return ffmpegPath as unknown as string;
}

function probeDuration(file: string): Promise<number> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(ffmpeg(), ["-hide_banner", "-i", file], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", () => {
      const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (!m) {
        reject(new Error(`Could not read duration of ${file}`));
        return;
      }
      resolvePromise(Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]));
    });
  });
}

export function higgsfieldReady() {
  return higgsfieldConfigured();
}

function tidy(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

/** Grounded five-beat script. Never invents proof the client hasn't supplied. */
export function buildBeats(input: UgcInput): UgcBeat[] {
  const area = input.area || "Kanpur";
  const offer = input.offer || "aaj hi appointment";
  const price = input.price;
  const proof = input.proof?.trim();
  const doctor = input.doctor?.trim();

  const proofHasDoctor =
    Boolean(proof && doctor) && proof!.toLowerCase().includes(doctor!.toLowerCase());
  const proofLine = proof
    ? proofHasDoctor
      ? proof
      : `${doctor ? `${doctor}, ` : ""}${proof}`
    : doctor
      ? `${doctor} se khud baat karo.`
      : "Wahi clinic, wahi team, bina rush.";

  const proofCaptions: [string, string] = proof
    ? [
        doctor || "TRUSTED",
        proofHasDoctor ? proof.replace(doctor!, "").replace(/^[,·\s]+/, "") || proof : proof,
      ]
    : ["TRUSTED IN", area.toUpperCase()];

  return [
    {
      role: "hook",
      line: `${area} walo, ek minute ruko.`,
      captions: ["EK MINUTE", "RUKO"],
      visual: "she looks straight into the camera and starts talking naturally, small head movement",
    },
    {
      role: "problem",
      line: "Sensitivity, bleeding, ya lagatar dard? Ignore mat karo.",
      captions: ["SENSITIVITY?", "BLEEDING?"],
      visual: "she touches her jaw and winces slightly, then looks back into the camera",
    },
    {
      role: "product",
      line: price
        ? `${price} mein full checkup, X-ray free.`
        : `Full checkup, X-ray free — ${offer}.`,
      captions: price ? [price, "CHECKUP + FREE X-RAY"] : ["FULL CHECKUP", "X-RAY FREE"],
      visual:
        "slow push in on a clean modern dental chair and equipment, soft daylight, no people, no text",
    },
    {
      role: "proof",
      line: proofLine,
      captions: proofCaptions,
      visual: "she smiles confidently and nods at the camera, relaxed shoulders",
    },
    {
      role: "cta",
      line: "WhatsApp karo, slot book karo. Aaj hi.",
      captions: ["WHATSAPP KARO", "AAJ HI"],
      visual: "she gestures toward the camera with one hand and smiles warmly",
    },
  ];
}

function actorPromptFor(input: UgcInput) {
  if (input.actorPrompt) return input.actorPrompt;
  const n = input.niche.toLowerCase();

  const setting = /dental|clinic|ivf/.test(n)
    ? "a bright modern dental clinic with soft daylight"
    : /bridal|jewel|banquet/.test(n)
      ? "an elegant boutique interior with warm light"
      : /coaching|academy|school/.test(n)
        ? "a bright classroom with bookshelves behind her"
        : "a clean modern local business interior";

  return tidy(`a friendly Indian woman in her early 30s, ${setting},
    candid selfie video framing, natural window light, realistic skin texture, subtle makeup,
    shot on an iPhone front camera, vertical 9:16, no text, no logo, no watermark`);
}

function clinicPromptFor(input: UgcInput) {
  const n = input.niche.toLowerCase();
  if (/dental|clinic|ivf/.test(n)) {
    return "a clean modern dental treatment room, dental chair and equipment, soft daylight from a window, shallow depth of field, vertical 9:16, photorealistic, no people, no text";
  }
  return `a clean modern ${input.niche} business interior in ${input.area}, warm daylight, photorealistic, vertical 9:16, no people, no text`;
}

/** Edge TTS — free, no key. Writes the synthesized audio to `outFile`. */
async function synthesizeVoice(text: string, outFile: string, voice: string) {
  const { MsEdgeTTS, OUTPUT_FORMAT } = await import("msedge-tts");
  const dir = dirname(outFile);
  mkdirSync(dir, { recursive: true });

  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioFilePath } = await tts.toFile(dir, text, { rate: "+8%", pitch: "+0Hz" });
    if (audioFilePath !== outFile) {
      rmSync(outFile, { force: true });
      copyFileSync(audioFilePath, outFile);
      rmSync(audioFilePath, { force: true });
    }
  } finally {
    tts.close();
  }
  return outFile;
}

function buildManifest(opts: { beats: UgcBeat[]; duration: number; musicStart: number }) {
  const { beats, duration } = opts;
  const n = beats.length;
  const xfade = 0.18;
  const pad = 0.35;
  const shotDur = (duration + pad + (n - 1) * xfade) / n;
  const moves = ["push-in", "handheld", "pan-right", "pull-out", "push-in"] as const;

  return {
    version: 2,
    name: "ugc-5-beat",
    bpm: 96,
    xfade,
    transitions: ["fade", "smoothleft", "fade", "circleopen"],
    music: "../../music/hiphop-02.mp3",
    musicStart: opts.musicStart,
    musicVolume: 0.22,
    edit: {
      grade: "clean",
      grain: 0,
      bloom: 0.02,
      chroma: false,
      vignette: false,
      sfx: false,
      riser: false,
      flashCuts: [],
    },
    presenter: {
      clip: "beat-0.mp4",
      voice: "vo.mp3",
      voiceGain: 1.12,
      pip: "none",
      stock: {
        start: 0,
        ctaStart: 0,
        focusX: 0.5,
        vertical: true,
        voiceGain: 1.12,
        delay: 120,
      },
    },
    shots: beats.map((beat, i) => ({
      id: beat.role,
      role: i === 0 ? "hook" : i === n - 1 ? "cta" : "broll",
      source: `beat-${i}.mp4`,
      start: 0,
      dur: Number(shotDur.toFixed(3)),
      focusX: 0.5,
      move: moves[i % moves.length],
      captions: beat.captions.map((text, j) => ({
        text,
        x: 64,
        y: 1218 + j * 112,
        size: j === 0 ? 86 : 70,
        color: j === 0 ? "white" : "brand",
        start: j === 0 ? 0.12 : Math.min(Math.max(0.9, shotDur - 1.6), 1.05),
        end: j === 0 ? Math.min(Math.max(0.9, shotDur - 0.9), 1.15) : Math.max(1.2, shotDur - 0.12),
        in: "slide-up",
        weight: "body",
      })),
      footer: i === n - 1,
    })),
  };
}

export async function renderUgcAd(input: UgcInput): Promise<UgcResult> {
  const started = Date.now();
  if (!higgsfieldConfigured()) {
    throw new Error(
      "Higgsfield is not configured. Set HIGGSFIELD_API_KEY_ID and HIGGSFIELD_API_KEY_SECRET."
    );
  }

  const dir = join(TREND_ROOT, "ugc", input.id);
  mkdirSync(dir, { recursive: true });

  const beats = input.beats?.length === 5 ? input.beats : buildBeats(input);
  const script = beats.map((b) => b.line).join(" ");
  const metaFile = join(dir, "meta.json");
  let meta: CachedMeta = {};
  try {
    meta = JSON.parse(readFileSync(metaFile, "utf8")) as CachedMeta;
  } catch {
    meta = {};
  }

  const clipFiles = beats.map((_, i) => join(dir, `beat-${i}.mp4`));
  const missing = clipFiles.filter(
    (f) => input.force || !existsSync(f) || statSync(f).size < 200_000
  );

  // Only pay for stills when a clip actually needs generating.
  if (missing.length > 0) {
    input.onProgress?.(24);

    if (input.force || !meta.actorUrl) {
      const still = await generateImage({
        prompt: actorPromptFor(input),
        file: join(dir, "actor.jpg"),
        aspectRatio: "9:16",
      });
      meta.actorUrl = still.url;
    }

    const needsProduct = beats.some((b) => b.role === "product");
    if (needsProduct && (input.force || !meta.clinicUrl)) {
      const clinic = await generateImage({
        prompt: clinicPromptFor(input),
        file: join(dir, "clinic.jpg"),
        aspectRatio: "9:16",
      });
      meta.clinicUrl = clinic.url;
    }

    writeFileSync(metaFile, JSON.stringify(meta), "utf8");
    input.onProgress?.(38);

    for (let i = 0; i < beats.length; i++) {
      const file = clipFiles[i];
      if (input.force || !existsSync(file) || statSync(file).size < 200_000) {
        const beat = beats[i];
        const imageUrl =
          beat.role === "product" && meta.clinicUrl ? meta.clinicUrl : meta.actorUrl;
        if (!imageUrl) throw new Error("Higgsfield image URL missing; re-run with force");

        await generateVideo({
          prompt: tidy(beat.visual),
          imageUrl,
          file,
          duration: 5,
        });
      }
      input.onProgress?.(38 + Math.round(((i + 1) / beats.length) * 26));
    }
  }

  const voiceFile = join(dir, "vo.mp3");
  if (input.force || !existsSync(voiceFile) || statSync(voiceFile).size < 5_000) {
    await synthesizeVoice(
      script,
      voiceFile,
      input.voice || process.env.UGC_VOICE || "hi-IN-SwaraNeural"
    );
  }
  const voiceDur = await probeDuration(voiceFile);
  input.onProgress?.(72);

  const manifest = buildManifest({ beats, duration: voiceDur, musicStart: 30 });
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  input.onProgress?.(80);

  const rendered = await renderTrendVideo({
    id: input.id,
    slug: input.slug,
    brandName: input.brandName,
    brandColor: input.brandColor,
    area: input.area,
    phone: input.phone,
    niche: input.niche,
    manifest: `ugc/${input.id}`,
    offer: input.offer,
    price: input.price,
    doctor: input.doctor,
    proof: input.proof,
    voiceScript: script,
    presenterMode: "stock",
  });

  return {
    ...rendered,
    engine: `Higgsfield UGC · 5 beats · stock edit · ${((Date.now() - started) / 1000).toFixed(1)}s`,
  };
}
