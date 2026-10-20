import { spawn } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";

export type RenderScene = {
  label: string;
  text: string;
  sub?: string;
};

export type RenderInput = {
  id: string;
  brandColor?: string;
  brandName: string;
  area: string;
  phone: string;
  scenes: RenderScene[];
  durationSec?: number;
};

export type RenderResult = {
  videoUrl: string | null;
  posterUrl: string | null;
  ms: number;
  bytes: number;
  engine: string;
};

const OUT_DIR = join(process.cwd(), "public", "renders");

/* ── fonts ─────────────────────────────────────────────────────── */
function firstExisting(paths: string[]) {
  return paths.find((p) => existsSync(p));
}

const BOLD_FONT = firstExisting([
  "C:/Windows/Fonts/arialbd.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
  "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
]);

const REG_FONT = firstExisting([
  "C:/Windows/Fonts/arial.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/dejavu/DejaVuSans.ttf",
  "/System/Library/Fonts/Supplemental/Arial.ttf",
]);

/** ffmpeg needs Windows drive colons escaped, even inside quotes. */
const fontArg = (p?: string) => (p ? `fontfile='${p.replace(/:/g, "\\:")}'` : "");

/* ── colour helpers ────────────────────────────────────────────── */
function parseHex(hex: string) {
  const clean = hex.replace("#", "").trim();
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const n = Number.parseInt(full || "C8F751", 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

const toFf = (hex: string) => {
  const { r, g, b } = parseHex(hex);
  return `0x${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
};

function tint(hex: string, amount: number) {
  const { r, g, b } = parseHex(hex);
  const base = { r: 0x07, g: 0x08, b: 0x0b };
  const mix = (a: number, c: number) => Math.round(a * amount + c * (1 - amount));
  const out = { r: mix(r, base.r), g: mix(g, base.g), b: mix(b, base.b) };
  return `0x${[out.r, out.g, out.b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

/* ── text ──────────────────────────────────────────────────────── */
function sanitize(input: string) {
  return input
    .replace(/₹/g, "Rs ")
    .replace(/[’‘]/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function esc(input: string) {
  return sanitize(input)
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "")
    .replace(/%/g, "\\%")
    .replace(/,/g, "\\,")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

function wrap(text: string, maxChars: number, maxLines = 4) {
  const words = sanitize(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (!line.length) line = word;
    else if (`${line} ${word}`.length <= maxChars) line += ` ${word}`;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}

function drawText(opts: {
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
  bold?: boolean;
  enable?: string;
  alpha?: number;
}) {
  const font = opts.bold === false ? REG_FONT : BOLD_FONT;
  const alpha = opts.alpha ?? 1;
  const enable = opts.enable ? `:enable='${opts.enable}'` : "";
  return `drawtext=${fontArg(font)}:text='${esc(opts.text)}':x=${opts.x}:y=${opts.y}:fontsize=${opts.size}:fontcolor=${opts.color}@${alpha}${enable}`;
}

/* ── graph ─────────────────────────────────────────────────────── */
export function buildGraph(input: RenderInput) {
  const brand = input.brandColor || "#C8F751";
  const lime = toFf(brand);
  const dur = input.durationSec ?? 12;
  const sceneLen = dur / 3;
  const s2 = sceneLen;
  const s3 = sceneLen * 2;

  const hook = input.scenes[0]?.text || input.brandName;
  const offer = input.scenes[1]?.text || "Aaj hi visit karo";
  const offerSub = input.scenes[1]?.sub || "";
  const cta = input.scenes[2]?.text || "WhatsApp karo";
  const phone = input.phone.startsWith("+") ? input.phone : `+91 ${input.phone}`;

  const hookLines = wrap(hook, 15, 4);
  const offerLines = wrap(offer, 20, 2);
  const subLines = wrap(offerSub, 46, 2);
  const ctaLines = wrap(cta, 18, 2);

  const parts: string[] = [];
  parts.push(
    `gradients=s=1080x1920:c0=0x07080B:c1=${tint(brand, 0.22)}:x0=0:y0=0:x1=1080:y1=1920:speed=0.012:r=24`
  );

  // top brand bar + wordmark
  parts.push(`drawbox=x=0:y=0:w=1080:h=8:color=${lime}@1:t=fill`);
  parts.push(`drawbox=x=64:y=92:w=14:h=46:color=${lime}@1:t=fill`);
  parts.push(drawText({ text: input.brandName.toUpperCase(), x: 98, y: 96, size: 34, color: "0xF2F5EC" }));
  parts.push(drawText({ text: `${input.area}  |  KANPUR`, x: 98, y: 142, size: 24, color: "0xA7B199", bold: false }));

  // scene 1 — hook
  hookLines.forEach((line, i) => {
    parts.push(
      drawText({
        text: line,
        x: 64,
        y: 660 + i * 124,
        size: 104,
        color: "0xF4F7EE",
        enable: `between(t,0,${s2})`,
      })
    );
  });
  const hookBottom = 660 + hookLines.length * 124;
  parts.push(
    drawText({
      text: "Aaj hi solve karo",
      x: 64,
      y: hookBottom + 26,
      size: 52,
      color: lime,
      enable: `between(t,0,${s2})`,
    })
  );
  parts.push(
    `drawbox=x=64:y=${hookBottom + 100}:w=180:h=6:color=${lime}@1:t=fill:enable='between(t,0,${s2})'`
  );

  // scene 2 — offer card
  const cardTop = 640;
  const cardH = 96 + offerLines.length * 92 + subLines.length * 46 + 56;
  parts.push(
    `drawbox=x=64:y=${cardTop}:w=952:h=${cardH}:color=0x0A0C07@0.9:t=fill:enable='between(t,${s2},${s3})'`
  );
  parts.push(
    `drawbox=x=64:y=${cardTop}:w=8:h=${cardH}:color=${lime}@1:t=fill:enable='between(t,${s2},${s3})'`
  );
  parts.push(
    drawText({
      text: "IS HAFTE KA OFFER",
      x: 116,
      y: cardTop + 44,
      size: 26,
      color: lime,
      enable: `between(t,${s2},${s3})`,
    })
  );
  offerLines.forEach((line, i) => {
    parts.push(
      drawText({
        text: line,
        x: 116,
        y: cardTop + 96 + i * 92,
        size: 72,
        color: "0xF4F7EE",
        enable: `between(t,${s2},${s3})`,
      })
    );
  });
  subLines.forEach((line, i) => {
    parts.push(
      drawText({
        text: line,
        x: 116,
        y: cardTop + 108 + offerLines.length * 92 + i * 46,
        size: 34,
        color: "0xA7B199",
        bold: false,
        enable: `between(t,${s2},${s3})`,
      })
    );
  });

  // scene 3 — CTA
  ctaLines.forEach((line, i) => {
    parts.push(
      drawText({
        text: line,
        x: 64,
        y: 640 + i * 120,
        size: 96,
        color: "0xF4F7EE",
        enable: `between(t,${s3},${dur})`,
      })
    );
  });
  const ctaBottom = 640 + ctaLines.length * 120;
  parts.push(
    `drawbox=x=64:y=${ctaBottom}:w=760:h=132:color=${lime}@1:t=fill:enable='between(t,${s3},${dur})'`
  );
  parts.push(
    drawText({
      text: `WhatsApp ${phone}`,
      x: 100,
      y: ctaBottom + 38,
      size: 52,
      color: "0x0A0C08",
      enable: `between(t,${s3},${dur})`,
    })
  );
  parts.push(
    drawText({
      text: "Sirf is mahine ke liye",
      x: 64,
      y: ctaBottom + 168,
      size: 38,
      color: lime,
      bold: false,
      enable: `between(t,${s3},${dur})`,
    })
  );

  // persistent footer — contact stays on screen for every scene
  parts.push(`drawbox=x=0:y=1660:w=1080:h=222:color=0x07080B@0.78:t=fill`);
  parts.push(`drawbox=x=0:y=1660:w=1080:h=2:color=${lime}@0.55:t=fill`);
  parts.push(drawText({ text: input.brandName.toUpperCase(), x: 64, y: 1698, size: 28, color: "0xF2F5EC" }));
  parts.push(drawText({ text: `WhatsApp ${phone}`, x: 64, y: 1744, size: 38, color: lime }));
  parts.push(drawText({ text: `${input.area}  |  KANPUR`, x: 64, y: 1802, size: 22, color: "0xA7B199", bold: false }));

  // progress bar
  parts.push(`drawbox=x=0:y=1882:w=1080:h=6:color=0xFFFFFF@0.12:t=fill`);
  parts.push(`drawbox=x=0:y=1882:w='iw*t/${dur}':h=6:color=${lime}@0.95:t=fill`);

  return parts.join(",");
}

/* ── execution ─────────────────────────────────────────────────── */
function run(args: string[]) {
  return new Promise<{ code: number; stderr: string }>((resolve, reject) => {
    const child = spawn(ffmpegPath as unknown as string, args);
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
      if (stderr.length > 40000) stderr = stderr.slice(-20000);
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, stderr }));
  });
}

export async function renderVideo(input: RenderInput): Promise<RenderResult> {
  const started = Date.now();
  mkdirSync(OUT_DIR, { recursive: true });

  const dur = input.durationSec ?? 12;
  const graph = buildGraph(input);
  const mp4 = join(OUT_DIR, `${input.id}.mp4`);
  const jpg = join(OUT_DIR, `${input.id}.jpg`);

  const base = ["-y", "-f", "lavfi", "-i", graph];

  // Poster first: it always succeeds even if video encoding is unavailable.
  const poster = await run([
    ...base,
    "-frames:v",
    "1",
    "-q:v",
    "3",
    jpg,
  ]);

  const video = await run([
    ...base,
    "-t",
    String(dur),
    "-r",
    "24",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    mp4,
  ]);

  const bytes = video.code === 0 ? statSync(mp4).size : 0;

  return {
    videoUrl: video.code === 0 ? `/renders/${input.id}.mp4` : null,
    posterUrl: poster.code === 0 ? `/renders/${input.id}.jpg` : null,
    ms: Date.now() - started,
    bytes,
    engine: video.code === 0 ? "ffmpeg/libx264 (local CPU)" : "poster-only",
    error: video.code === 0 ? undefined : video.stderr.slice(-600),
  } as RenderResult & { error?: string };
}
