import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
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
  slug?: string;
  niche?: string;
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
  "C:/Windows/Fonts/segoeuib.ttf",
  "C:/Windows/Fonts/arialbd.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
  "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
]);

const REG_FONT = firstExisting([
  "C:/Windows/Fonts/segoeui.ttf",
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
    .replace(/[—–]/g, "-")
    .replace(/[·•]/g, "|")
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
  const kept = lines.slice(0, maxLines);

  // Avoid a lonely last word ("Aaj hi WhatsApp / karo"): split two lines evenly.
  if (kept.length === 2 && kept[1].length < maxChars * 0.5) {
    const all = kept.join(" ").split(" ");
    let best: [string, string] | null = null;
    let bestDiff = Math.abs(kept[0].length - kept[1].length);
    for (let i = 1; i < all.length; i++) {
      const a = all.slice(0, i).join(" ");
      const b = all.slice(i).join(" ");
      if (a.length > maxChars || b.length > maxChars) continue;
      const diff = Math.abs(a.length - b.length);
      if (diff < bestDiff) {
        best = [a, b];
        bestDiff = diff;
      }
    }
    if (best) {
      kept[0] = best[0];
      kept[1] = best[1];
    }
  }

  // Never orphan the currency marker at the end of a line: "Rs" belongs with the price.
  for (let i = 0; i < kept.length - 1; i++) {
    if (/\bRs$/.test(kept[i]) && kept[i].length > 3) {
      const next = `Rs ${kept[i + 1]}`;
      if (next.length <= maxChars) {
        kept[i] = kept[i].replace(/\s*Rs$/, "");
        kept[i + 1] = next;
      }
    }
  }
  return kept;
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
  return `drawtext=${fontArg(font)}:text='${esc(opts.text)}':x=${opts.x}:y=${opts.y}:fontsize=${opts.size}:fontcolor=${opts.color}@${alpha}:expansion=none${enable}`;
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

/* ── cinematic reel pipeline ───────────────────────────────────── */
const FPS = 30;
const XFADE = 0.35;
const ASSET_DIR = join(process.cwd(), "public", "assets");

function photosFor(input: RenderInput) {
  for (const name of [input.slug, "_default"]) {
    if (!name) continue;
    const dir = join(ASSET_DIR, "reels", name);
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir)
      .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
      .sort();
    if (files.length) return files.map((f) => join(dir, f));
  }
  return [];
}

/** Soft scrim behind the captions plus a bottom fade — no hard drawbox edge. */
async function reelOverlay() {
  const file = join(ASSET_DIR, "overlays", "reel.png");
  if (existsSync(file)) return file;
  mkdirSync(dirname(file), { recursive: true });
  const alpha =
    "255*max(0.52*min(1,max(0,(Y-500)/260))*min(1,max(0,(1750-Y)/320)),0.9*min(1,max(0,(Y-1500)/420)))";
  const out = await run([
    "-y",
    "-f", "lavfi",
    "-i", "color=c=black:s=1080x1920",
    "-vf", `format=rgba,geq=r=0:g=0:b=0:a='${alpha}'`,
    "-frames:v", "1",
    file,
  ]);
  if (out.code !== 0) throw new Error(`overlay build failed: ${out.stderr.slice(-300)}`);
  return file;
}

function musicFor(input: RenderInput) {
  const n = `${input.niche ?? ""} ${input.slug ?? ""}`.toLowerCase();
  let mood = "driving";
  if (/sweet|namkeen|mithai|bakery/.test(n)) mood = "playful";
  else if (/dental|academy|coaching|school|education|student/.test(n)) mood = "bright";
  else if (/bridal|jewel|banquet|wedding|ivf/.test(n)) mood = "elegant";

  const file = join(ASSET_DIR, "music", `${mood}.mp3`);
  return existsSync(file) ? { file, mood } : null;
}

function animatedText(opts: {
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
  start: number;
  dur: number;
  bold?: boolean;
}) {
  const font = opts.bold === false ? REG_FONT : BOLD_FONT;
  const y = `${opts.y}+44*(1-min(1,max(0,(t-${opts.start})/0.5)))`;
  const alpha = `min(1,max(0,(t-${opts.start})/0.38))`;
  return `drawtext=${fontArg(font)}:text='${esc(opts.text)}':x=${opts.x}:y='${y}':fontsize=${opts.size}:fontcolor=${opts.color}:expansion=none:alpha='${alpha}':shadowcolor=black@0.55:shadowx=0:shadowy=3:enable='between(t,${opts.start},${opts.dur})'`;
}

function sceneFilter(index: number, input: RenderInput, sceneDur: number) {
  const dur = sceneDur;
  const frames = Math.ceil(sceneDur * FPS);
  const brand = input.brandColor || "#C8F751";
  const lime = toFf(brand);
  const phone = input.phone.startsWith("+") ? input.phone : `+91 ${input.phone}`;

  const zoom = [
    `min(1.04+0.0012*on,1.18)`,
    `1.15`,
    `max(1.18-0.0012*on,1.04)`,
  ][index];
  const x = [
    `iw/2-(iw/zoom/2)`,
    `(iw-iw/zoom)*on/${frames}`,
    `iw/2-(iw/zoom/2)`,
  ][index];
  const y = [
    `ih/2-(ih/zoom/2)`,
    `(ih-ih/zoom)/2`,
    `ih/2-(ih/zoom/2)`,
  ][index];

  const base = [
    `scale=1350:2400:force_original_aspect_ratio=increase`,
    `crop=1350:2400`,
    `zoompan=z='${zoom}':x='${x}':y='${y}':d=${frames}:s=1080x1920:fps=${FPS}`,
    `eq=contrast=1.06:saturation=1.07:brightness=-0.02`,
    ...(index === 2 ? [`gblur=sigma=16`] : []),
  ].join(",");

  const parts: string[] = [];

  if (index === 0) {
    const lines = wrap(input.scenes[0]?.text || input.brandName, 17, 4);
    const eyebrow = `KANPUR | ${input.area.toUpperCase()}`;
    parts.push(
      `drawbox=x=56:y=232:w=${Math.min(760, 76 + eyebrow.length * 14)}:h=48:color=0x07080B@0.58:t=fill:enable='between(t,0.05,${dur})'`
    );
    parts.push(animatedText({
      text: eyebrow,
      x: 72, y: 242, size: 23, color: lime, start: 0.05, dur,
    }));
    lines.forEach((line, i) =>
      parts.push(animatedText({
        text: line, x: 64, y: 1080 + i * 112, size: 90,
        color: /\bRs\b/.test(line) ? lime : "0xF6F8EF",
        start: 0.12 + i * 0.13, dur,
      }))
    );
    const after = 1080 + lines.length * 112;
    parts.push(
      `drawbox=x=64:y=${after + 18}:w=170:h=6:color=${lime}@0.95:t=fill:enable='between(t,0.55,${dur})'`
    );
    parts.push(animatedText({
      text: "Aaj hi solve karo", x: 64, y: after + 42, size: 42,
      color: lime, start: 0.62, dur, bold: false,
    }));
  }

  if (index === 1) {
    const offer = input.scenes[1]?.text || "Aaj ka offer";
    const sub = input.scenes[1]?.sub || "";
    const offerLines = wrap(offer, 19, 2);
    const subLines = wrap(sub, 43, 3);
    const top = 1040;
    const height = 92 + offerLines.length * 82 + (subLines.length ? subLines.length * 40 + 16 : 0) + 34;

    parts.push(
      `drawbox=x=64:y=${top}:w=952:h=${height}:color=0x07080B@0.8:t=fill:enable='between(t,0.22,${dur})'`,
      `drawbox=x=64:y=${top}:w=8:h=${height}:color=${lime}@1:t=fill:enable='between(t,0.22,${dur})'`
    );
    parts.push(animatedText({
      text: "IS HAFTE KA OFFER", x: 116, y: top + 38, size: 24,
      color: lime, start: 0.16, dur,
    }));
    offerLines.forEach((line, i) =>
      parts.push(animatedText({
        text: line, x: 116, y: top + 92 + i * 82, size: 64,
        color: /\bRs\b/.test(line) ? lime : "0xF6F8EF",
        start: 0.3 + i * 0.1, dur,
      }))
    );
    subLines.forEach((line, i) =>
      parts.push(animatedText({
        text: line, x: 116, y: top + 108 + offerLines.length * 82 + i * 40,
        size: 28, color: "0xC9D2C0", start: 0.5 + i * 0.08, dur, bold: false,
      }))
    );
  }

  if (index === 2) {
    const lines = wrap(input.scenes[2]?.text || "WhatsApp karo", 15, 2);
    const btnY = 1080;
    parts.push(animatedText({
      text: "AAJ HI BOOK KARO", x: 64, y: 300, size: 24,
      color: lime, start: 0.1, dur,
    }));
    lines.forEach((line, i) =>
      parts.push(animatedText({
        text: line, x: 64, y: 540 + i * 104, size: 82,
        color: "0xF6F8EF", start: 0.16 + i * 0.12, dur,
      }))
    );

    const offerLine = wrap(input.scenes[1]?.text || "", 34, 1)[0];
    if (offerLine) {
      const chipW = Math.min(920, 84 + offerLine.length * 15);
      parts.push(
        `drawbox=x=64:y=880:w=${chipW}:h=66:color=0x07080B@0.5:t=fill:enable='between(t,0.7,${dur})'`,
        `drawbox=x=64:y=880:w=${chipW}:h=66:color=${lime}@0.7:t=2:enable='between(t,0.7,${dur})'`
      );
      parts.push(animatedText({
        text: offerLine, x: 92, y: 897, size: 28,
        color: lime, start: 0.72, dur,
      }));
    }
    parts.push(
      `drawbox=x=64:y=${btnY}:w=760:h=132:color=${lime}@1:t=fill:enable='between(t,0.55,${dur})'`
    );
    parts.push(animatedText({
      text: `WhatsApp ${phone}`, x: 100, y: btnY + 38, size: 46,
      color: "0x0A0C08", start: 0.62, dur,
    }));
    parts.push(animatedText({
      text: "Turant reply milega", x: 64, y: btnY + 168, size: 30,
      color: "0xC9D2C0", start: 0.8, dur, bold: false,
    }));
    parts.push(animatedText({
      text: `${input.brandName} | ${input.area}`, x: 64, y: btnY + 226, size: 26,
      color: lime, start: 0.92, dur, bold: false,
    }));
  }

  return `[0:v]${base}[bg];[bg][1:v]overlay=0:0[lit];[lit]vignette=PI/5[vg];[vg]${parts.join(",")},format=yuv420p[v]`;
}

function finalOverlays(input: RenderInput, dur: number) {
  const brand = input.brandColor || "#C8F751";
  const lime = toFf(brand);
  const phone = input.phone.startsWith("+") ? input.phone : `+91 ${input.phone}`;

  return [
    // top brand bar
    `drawbox=x=0:y=0:w=1080:h=150:color=0x07080B@0.74:t=fill`,
    `drawbox=x=0:y=150:w=1080:h=2:color=${lime}@0.55:t=fill`,
    `drawbox=x=56:y=40:w=8:h=66:color=${lime}@1:t=fill`,
    drawText({ text: input.brandName.toUpperCase(), x: 84, y: 44, size: 30, color: "0xF2F5EC" }),
    drawText({ text: `${input.area}  |  KANPUR`, x: 84, y: 92, size: 21, color: "0xC9D2C0", bold: false }),
    // persistent contact footer
    `drawbox=x=0:y=1670:w=1080:h=250:color=0x07080B@0.82:t=fill`,
    `drawbox=x=0:y=1670:w=1080:h=2:color=${lime}@0.55:t=fill`,
    `drawbox=x=56:y=1700:w=8:h=92:color=${lime}@1:t=fill`,
    drawText({ text: input.brandName.toUpperCase(), x: 84, y: 1704, size: 26, color: "0xF2F5EC" }),
    drawText({ text: `WhatsApp ${phone}`, x: 84, y: 1748, size: 38, color: lime }),
    drawText({ text: `${input.area}  |  KANPUR`, x: 84, y: 1802, size: 20, color: "0xC9D2C0", bold: false }),
    // progress line
    `drawbox=x=0:y=1884:w=1080:h=6:color=0xFFFFFF@0.12:t=fill`,
    `drawbox=x=0:y=1884:w='iw*t/${dur}':h=6:color=${lime}@0.95:t=fill`,
  ].join(",");
}

async function richRender(input: RenderInput, dur: number): Promise<RenderResult & { error?: string }> {
  const started = Date.now();
  const photos = photosFor(input);
  if (!photos.length) throw new Error("no reel photos available");

  const overlay = await reelOverlay();
  const music = musicFor(input);
  const mp4 = join(OUT_DIR, `${input.id}.mp4`);
  const jpg = join(OUT_DIR, `${input.id}.jpg`);
  const tmpDir = join(OUT_DIR, ".tmp");
  mkdirSync(tmpDir, { recursive: true });
  const scenes = [0, 1, 2].map((i) => join(tmpDir, `${input.id}-s${i}.mp4`));

  const sceneDur = (dur + 2 * XFADE) / 3;

  try {
    for (const i of [0, 1, 2]) {
      const photo = photos[i % photos.length];
      const out = await run([
        "-y",
        "-i", photo,
        "-i", overlay,
        "-filter_complex", sceneFilter(i, input, sceneDur),
        "-map", "[v]",
        "-t", sceneDur.toFixed(3),
        "-r", String(FPS),
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "20",
        "-pix_fmt", "yuv420p",
        "-an",
        scenes[i],
      ]);
      if (out.code !== 0) throw new Error(`scene ${i + 1} failed: ${out.stderr.slice(-500)}`);
    }

    const offset1 = (sceneDur - XFADE).toFixed(3);
    const offset2 = (2 * (sceneDur - XFADE)).toFixed(3);

    const graph = [
      `[0:v][1:v]xfade=transition=fadeblack:duration=${XFADE}:offset=${offset1}[x1]`,
      `[x1][2:v]xfade=transition=fadeblack:duration=${XFADE}:offset=${offset2}[x2]`,
      `[x2]noise=alls=4:allf=t+u[grain]`,
      `[grain]${finalOverlays(input, dur)}[v]`,
    ];

    const args = ["-y", "-i", scenes[0], "-i", scenes[1], "-i", scenes[2]];
    if (music) {
      args.push("-i", music.file);
      // Tracks have different mastering levels; even them out under the voice-free bed.
      const gain =
        ({ bright: 0.62, elegant: 1.12, driving: 0.88, playful: 1.0 } as Record<string, number>)[
          music.mood
        ] ?? 0.8;
      graph.push(
        `[3:a]afade=t=in:st=0:d=0.7,afade=t=out:st=${(dur - 1).toFixed(2)}:d=1,volume=${gain}[a]`
      );
    }

    args.push(
      "-filter_complex", graph.join(";"),
      "-map", "[v]",
      ...(music ? ["-map", "[a]", "-c:a", "aac", "-b:a", "160k"] : ["-an"]),
      "-t", String(dur),
      "-r", String(FPS),
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "20",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      mp4
    );

    const video = await run(args);
    if (video.code !== 0) throw new Error(`final encode failed: ${video.stderr.slice(-500)}`);

    // Poster: freeze a frame after the first transition settles.
    const poster = await run([
      "-y", "-ss", "2.2", "-i", mp4, "-frames:v", "1", "-q:v", "2", jpg,
    ]);

    const bytes = statSync(mp4).size;
    return {
      videoUrl: `/renders/${input.id}.mp4`,
      posterUrl: poster.code === 0 ? `/renders/${input.id}.jpg` : null,
      ms: Date.now() - started,
      bytes,
      engine: `ffmpeg · 3 photo scenes${music ? ` · ${music.mood} score` : ""}`,
    };
  } finally {
    for (const file of scenes) {
      try {
        if (existsSync(file)) rmSync(file);
      } catch {
        /* temp cleanup is best-effort */
      }
    }
  }
}

async function gradientRender(input: RenderInput, dur: number): Promise<RenderResult & { error?: string }> {
  const started = Date.now();
  const graph = buildGraph(input);
  const mp4 = join(OUT_DIR, `${input.id}.mp4`);
  const jpg = join(OUT_DIR, `${input.id}.jpg`);
  const base = ["-y", "-f", "lavfi", "-i", graph];

  // Poster first: it always succeeds even if video encoding is unavailable.
  const poster = await run([...base, "-frames:v", "1", "-q:v", "3", jpg]);
  const video = await run([
    ...base,
    "-t", String(dur),
    "-r", "24",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "23",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    mp4,
  ]);

  const bytes = video.code === 0 ? statSync(mp4).size : 0;
  return {
    videoUrl: video.code === 0 ? `/renders/${input.id}.mp4` : null,
    posterUrl: poster.code === 0 ? `/renders/${input.id}.jpg` : null,
    ms: Date.now() - started,
    bytes,
    engine: video.code === 0 ? "ffmpeg · gradient fallback" : "poster-only",
    error: video.code === 0 ? undefined : video.stderr.slice(-600),
  };
}

export async function renderVideo(input: RenderInput): Promise<RenderResult> {
  const started = Date.now();
  mkdirSync(OUT_DIR, { recursive: true });
  const dur = input.durationSec ?? 12;

  try {
    return await richRender(input, dur);
  } catch (err) {
    console.error("[render] photo pipeline failed, using gradient:", err);
    const fallback = await gradientRender(input, dur);
    return {
      ...fallback,
      ms: Date.now() - started,
      engine: `${fallback.engine} (photo pipeline unavailable)`,
      error: err instanceof Error ? err.message : String(err),
    } as RenderResult & { error?: string };
  }
}
