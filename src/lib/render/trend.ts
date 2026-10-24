import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { avatarConfigured, generateAvatarVideo } from "./avatar";
import type { RenderResult } from "./video";

export type PresenterKind = "stock" | "owner" | "avatar";
export type PresenterMode = "auto" | PresenterKind;
export type ShotMove = "static" | "push-in" | "pull-out" | "pan-left" | "pan-right" | "handheld";
export type CaptionIn = "pop" | "slide-up" | "slide-left" | "fade";

export type TrendInput = {
  id: string;
  slug: string;
  brandName: string;
  brandColor?: string;
  area: string;
  phone: string;
  niche?: string;
  manifest?: string;
  offer?: string;
  price?: string;
  doctor?: string;
  proof?: string;
  voiceScript?: string;
  presenterMode?: PresenterMode;
  durationSec?: number;
};

export type TrendRenderResult = RenderResult & { presenterKind: PresenterKind };

type CaptionSpec = {
  text: string;
  start?: number;
  end?: number;
  x?: number;
  y: number;
  size?: number;
  color?: string;
  weight?: "display" | "body";
  in?: CaptionIn;
  inDur?: number;
  outDur?: number;
  shadow?: number;
  border?: number;
  /** Draw a brand-coloured plate behind the words (karaoke / price tag). */
  box?: boolean;
  /** Animate a brand underline under the words. */
  underline?: boolean;
  /** Lay a sound-design pop on the word. */
  pop?: boolean;
};

type TextSpec = {
  text: string;
  x?: number;
  y: number;
  size: number;
  at?: number;
  color?: string;
  shadow?: number;
  border?: number;
};

type ShotSpec = {
  id: string;
  role?: "hook" | "cta" | "broll";
  source: string;
  start?: number;
  dur: number;
  focusX?: number;
  vertical?: boolean;
  /** Virtual camera move applied to the cropped frame. */
  move?: ShotMove;
  captions?: CaptionSpec[];
  texts?: TextSpec[];
  back?: string[];
  front?: string[];
  footer?: boolean;
};

type EditSpec = {
  grade?: "teal-orange" | "warm" | "clean" | "cinematic";
  /** Film grain amount (0 disables). */
  grain?: number;
  /** Screen-blend bloom strength 0..1. */
  bloom?: number;
  /** Subtle lens chromatic aberration. */
  chroma?: boolean;
  vignette?: boolean;
  /** Lay SFX on the cut grid. */
  sfx?: boolean;
  /** Riser into the CTA shot. */
  riser?: boolean;
  /** Cut indices (0-based) that get a white impact flash. */
  flashCuts?: number[];
};

type ModeSpec = {
  start: number;
  ctaStart?: number;
  focusX?: number;
  vertical?: boolean;
  voiceGain?: number;
  delay?: number;
};

type PresenterSpec = {
  clip?: string;
  voice?: string;
  voiceGain?: number;
  /** Circular talking-head overlay during b-roll: "avatar" (default), "all" or "none". */
  pip?: "avatar" | "all" | "none";
  stock?: ModeSpec;
  owner?: ModeSpec;
  avatar?: ModeSpec;
};

type TrendManifest = {
  version?: number;
  name?: string;
  bpm?: number;
  xfade?: number;
  transitions?: string[];
  flashAt?: number;
  scrim?: string;
  music?: string;
  musicVolume?: number;
  /** Skip this many seconds into the track so the reel starts on a full groove, not an intro. */
  musicStart?: number;
  voiceScript?: string;
  edit?: EditSpec;
  presenter: PresenterSpec;
  shots: ShotSpec[];
};

type ResolvedPresenter = {
  kind: PresenterKind;
  video: string;
  vertical: boolean;
  focusX: number;
  start: number;
  ctaStart: number;
  voicePath: string | null;
  voiceGain: number;
  voiceDelay: number;
  pip: "avatar" | "all" | "none";
  engine: string;
};

const W = 1080;
const H = 1920;
const FPS = 30;
const PIP_SIZE = 300;
const RING_SIZE = 316;
const PIP_X = W - PIP_SIZE - 40;
const PIP_Y = 150;
const TREND_ROOT = join(process.cwd(), "public", "assets", "trend");
const OUT_DIR = join(process.cwd(), "public", "renders");
const FONT_DIR = join(process.cwd(), "public", "assets", "fonts");

const FALLBACK_FONTS = [
  "C:/Windows/Fonts/arialbd.ttf",
  "C:/Windows/Fonts/segoeuib.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
];

function pickFont(name: string) {
  return (
    [join(FONT_DIR, name), ...FALLBACK_FONTS].find((p) => existsSync(p)) ?? FALLBACK_FONTS[0]
  );
}

const FONT_DISPLAY = pickFont("Anton-Regular.ttf");
const FONT_BODY = pickFont("Mukta-ExtraBold.ttf");

function ffmpeg() {
  return ffmpegPath as unknown as string;
}

function run(args: string[]) {
  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn(ffmpeg(), args);
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`ffmpeg exited ${code}\n${stderr.slice(-2400)}`));
    });
  });
}

function hasAudio(file: string) {
  return new Promise<boolean>((resolvePromise) => {
    const child = spawn(ffmpeg(), ["-hide_banner", "-i", file], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", () => resolvePromise(/Audio:/.test(stderr)));
    child.on("error", () => resolvePromise(false));
  });
}

function toFf(hex: string) {
  return `0x${hex.replace("#", "").toUpperCase()}`;
}

function clean(s: string) {
  return s
    .replace(/₹/g, "Rs ")
    .replace(/[—–]/g, "-")
    .replace(/[’‘]/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function esc(s: string) {
  return clean(s)
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "")
    .replace(/,/g, "\\,")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

function shortBrand(name: string) {
  const first = name.split("&")[0].trim();
  return (first || name).toUpperCase();
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "").slice(-10);
  return digits.length === 10 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : phone;
}

function fill(value: string, vars: Record<string, string>) {
  return value.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

function buildVars(input: TrendInput, manifest: TrendManifest) {
  const color = toFf(input.brandColor || "#C8F751");
  const price = clean(input.price || "Rs 199");
  const doctor = clean(input.doctor || "DR. ANIL SHARMA").toUpperCase();
  const proof = clean(input.proof || "12+ YEARS").toUpperCase();
  const offer = clean(input.offer || `${price} FULL CHECKUP + X-RAY`);
  const voiceScript = clean(input.voiceScript || manifest.voiceScript || "");
  return {
    brand: color,
    brandShort: clean(shortBrand(input.brandName)),
    brandFull: clean(input.brandName).toUpperCase(),
    area: clean(input.area).toUpperCase(),
    areaUpper: clean(input.area).toUpperCase(),
    phone: clean(formatPhone(input.phone)),
    price,
    doctor,
    proof,
    offer,
    voiceScript,
    font: FONT_DISPLAY.replace(/\\/g, "/").replace(/:/g, "\\:"),
  };
}

function colorValue(color: string | undefined, vars: Record<string, string>) {
  if (!color || color === "white") return "0xF6F8EF";
  if (color === "brand") return vars.brand;
  if (color === "dark") return "0x07080B";
  if (color === "muted") return "0xC9D2C0";
  return color.startsWith("0x") || color.startsWith("#") ? color.replace("#", "0x") : color;
}

function fontArg(weight: "display" | "body" = "display") {
  const file = weight === "body" ? FONT_BODY : FONT_DISPLAY;
  return `fontfile='${file.replace(/\\/g, "/").replace(/:/g, "\\:")}'`;
}

function estimateWidth(text: string, size: number, weight?: "display" | "body") {
  const perChar = weight === "body" ? 0.56 : 0.5;
  return Math.round(clean(text).length * size * perChar);
}

/** Virtual camera move: upscale the cropped frame, then animate the crop window. */
function motionChain(move: ShotMove | undefined, dur: number): string[] {
  if (!move || move === "static") return [];
  const d = dur.toFixed(3);
  let crop = "";
  switch (move) {
    case "push-in":
      crop = `crop=w='1080*(1-0.10*min(t/${d},1))':h='1920*(1-0.10*min(t/${d},1))':x='(iw-ow)/2':y='(ih-oh)*0.42'`;
      break;
    case "pull-out":
      crop = `crop=w='1080*(0.90+0.10*min(t/${d},1))':h='1920*(0.90+0.10*min(t/${d},1))':x='(iw-ow)/2':y='(ih-oh)*0.42'`;
      break;
    case "pan-right":
      crop = `crop=1080:1920:x='(iw-1080)*min(t/${d},1)':y='(ih-1920)*0.42'`;
      break;
    case "pan-left":
      crop = `crop=1080:1920:x='(iw-1080)*(1-min(t/${d},1))':y='(ih-1920)*0.42'`;
      break;
    case "handheld":
      crop = `crop=1080:1920:x='(iw-1080)/2+9*sin(2*PI*t/1.1)':y='(ih-1920)*0.42+6*sin(2*PI*t/0.9)'`;
      break;
    default:
      return [];
  }
  return ["scale=1242:2208:flags=lanczos", crop, "scale=1080:1920:flags=lanczos"];
}

/** Colour grade + lens character. Applied before type so captions stay crisp. */
function gradeChain(edit: EditSpec): string {
  const parts = ["eq=contrast=1.10:brightness=-0.012:saturation=1.09"];
  if (edit.grade === "warm") {
    parts.push("colorbalance=rs=0.03:gs=0.01:bs=-0.03:rh=0.04:gh=0.01:bh=-0.03");
  } else if (edit.grade === "cinematic") {
    parts.push("colorbalance=rs=-0.02:bs=0.04:rm=0.01:bm=0.01:rh=0.02:bh=-0.03");
  } else if (edit.grade !== "clean") {
    parts.push("colorbalance=rs=0.02:bs=-0.03:rm=0.01:bm=0.02:rh=0.03:bh=-0.02");
  }
  parts.push("curves=all='0/0 0.22/0.19 0.78/0.83 1/1'");
  parts.push("unsharp=5:5:0.5:5:5:0.0");
  if (edit.chroma !== false) parts.push("rgbashift=rh=1:bh=-1");
  return parts.join(",");
}

function captionStr(c: CaptionSpec, vars: Record<string, string>) {
  const text = fill(c.text, vars);
  const size = c.size ?? 64;
  const start = c.start ?? 0;
  const end = c.end ?? start + 1.7;
  const inDur = c.inDur ?? 0.18;
  const outDur = c.outDur ?? 0.14;
  const style = c.in ?? "pop";
  const fadeIn = `min(1,max(0,(t-${start})/${inDur}))`;
  const alpha = `if(lt(t,${start}),0,if(lt(t,${(start + inDur).toFixed(3)}),(t-${start})/${inDur},if(lt(t,${(
    end - outDur
  ).toFixed(3)}),1,if(lt(t,${end}),(${end}-t)/${outDur},0))))`;
  let x = `${c.x ?? 55}`;
  let y = `${c.y}`;
  if (style === "pop") y = `'${c.y}+26*(1-${fadeIn})'`;
  else if (style === "slide-up") y = `'${c.y}+72*(1-${fadeIn})'`;
  else if (style === "slide-left") x = `'${c.x ?? 55}-96*(1-${fadeIn})'`;
  const border = c.border ? `:borderw=${c.border}:bordercolor=black@0.55` : "";
  return `${fontArg(c.weight)}:text='${esc(text)}':x=${x}:y=${y}:fontsize=${size}:fontcolor=${colorValue(
    c.color,
    vars
  )}@1:expansion=none:alpha='${alpha}':shadowcolor=black@0.68:shadowx=0:shadowy=${
    c.shadow ?? 6
  }${border}:enable='between(t,${start},${end})'`;
}

function captionPlateStr(c: CaptionSpec, vars: Record<string, string>) {
  if (!c.box) return null;
  const text = fill(c.text, vars);
  const size = c.size ?? 64;
  const start = c.start ?? 0;
  const end = c.end ?? start + 1.7;
  const inDur = c.inDur ?? 0.18;
  const w = estimateWidth(text, size, c.weight) + Math.round(size * 0.5);
  const x = (c.x ?? 55) - Math.round(size * 0.26);
  const y = c.y - Math.round(size * 0.14);
  const h = Math.round(size * 1.14);
  return `drawbox=x=${x}:y=${y}:w='${w}*min(1,max(0,(t-${start})/${inDur}))':h=${h}:color=${
    vars.brand
  }@0.96:t=fill:enable='between(t,${start},${end})'`;
}

function captionUnderlineStr(c: CaptionSpec, vars: Record<string, string>) {
  if (!c.underline) return null;
  const text = fill(c.text, vars);
  const size = c.size ?? 64;
  const start = c.start ?? 0;
  const end = c.end ?? start + 1.7;
  const w = estimateWidth(text, size, c.weight);
  const x = c.x ?? 55;
  const y = c.y + Math.round(size * 1.18);
  const h = Math.max(6, Math.round(size * 0.07));
  return `drawbox=x=${x}:y=${y}:w='${w}*min(1,max(0,(t-${start})/0.24))':h=${h}:color=${
    vars.brand
  }@0.95:t=fill:enable='between(t,${start},${end})'`;
}

function textToCaption(t: TextSpec): CaptionSpec {
  const start = t.at ?? 0.06;
  return {
    text: t.text,
    start,
    end: start + 1.7,
    x: t.x,
    y: t.y,
    size: t.size,
    color: t.color,
    shadow: t.shadow,
    border: t.border,
    in: "slide-up",
  };
}

function brandHeader(vars: Record<string, string>) {
  return [
    `drawbox=x=36:y=34:w=400:h=98:color=black@0.42:t=fill`,
    `drawbox=x=36:y=34:w=5:h=98:color=${vars.brand}@0.95:t=fill`,
    `drawtext=${fontArg("display")}:text='${esc(vars.brandShort)}':x=60:y=50:fontsize=32:fontcolor=0xF6F8EF@0.97:expansion=none:shadowcolor=black@0.6:shadowx=0:shadowy=3`,
    `drawtext=${fontArg("body")}:text='${esc(vars.area)}':x=60:y=92:fontsize=22:fontcolor=${vars.brand}@1:expansion=none:shadowcolor=black@0.6:shadowx=0:shadowy=2`,
    `drawbox=x=0:y=0:w=${W}:h=5:color=${vars.brand}@0.9:t=fill`,
    `drawbox=x=0:y=1915:w=${W}:h=5:color=${vars.brand}@0.35:t=fill`,
  ];
}

function footer(vars: Record<string, string>) {
  return [
    `drawbox=x=60:y=1722:w=320:h=2:color=${vars.brand}@0.55:t=fill`,
    `drawtext=${fontArg("display")}:text='${esc(vars.brandFull)}':x=60:y=1740:fontsize=26:fontcolor=0xF6F8EF@0.82:expansion=none:shadowcolor=black@0.6:shadowx=0:shadowy=3`,
    `drawtext=${fontArg("body")}:text='${esc(vars.areaUpper)}':x=60:y=1782:fontsize=22:fontcolor=${vars.brand}@0.9:expansion=none:shadowcolor=black@0.6:shadowx=0:shadowy=2`,
  ];
}

function manifestPath(input: TrendInput) {
  const candidates = [
    input.manifest ? join(TREND_ROOT, input.manifest, "manifest.json") : "",
    join(TREND_ROOT, input.slug, "manifest.json"),
    input.niche
      ? join(TREND_ROOT, input.niche.toLowerCase().replace(/[^a-z0-9]+/g, "-"), "manifest.json")
      : "",
    join(TREND_ROOT, "default", "manifest.json"),
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p)) ?? null;
}

function loadManifest(input: TrendInput) {
  const path = manifestPath(input);
  if (!path) {
    throw new Error(`No trend manifest for ${input.slug}. Add public/assets/trend/<name>/manifest.json`);
  }
  const manifest = JSON.parse(readFileSync(path, "utf8")) as TrendManifest;
  if (!manifest.shots?.length) throw new Error(`Trend manifest ${path} has no shots`);
  return { path, dir: dirname(path), manifest };
}

function ownerClip(slug: string) {
  const root = join(process.cwd(), "public", "assets", "presenters");
  const candidates = [
    join(root, slug, "owner.mp4"),
    join(root, slug, "presenter.mp4"),
    join(root, `${slug}.mp4`),
    join(root, `${slug}-owner.mp4`),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

async function resolvePresenter(
  input: TrendInput,
  manifest: TrendManifest,
  dir: string,
  vars: Record<string, string>
): Promise<ResolvedPresenter> {
  const requested = input.presenterMode || (process.env.TREND_PRESENTER as PresenterMode) || "auto";
  const stockSpec = manifest.presenter.stock ?? { start: 1, ctaStart: 5.2, focusX: 0.74, vertical: false };
  const ownerSpec = manifest.presenter.owner ?? { start: 0, ctaStart: 9, focusX: 0.5, vertical: true };
  const avatarSpec = manifest.presenter.avatar ?? { start: 0, ctaStart: 9, focusX: 0.5, vertical: true };
  const pip = manifest.presenter.pip ?? "avatar";

  const stock = (warning?: string): ResolvedPresenter => {
    if (warning) console.warn(`[trend] ${warning}; using stock presenter`);
    const clip = resolve(dir, manifest.presenter.clip || "stock/33328.mp4");
    if (!existsSync(clip)) throw new Error(`Missing stock presenter clip: ${clip}`);
    const voice = manifest.presenter.voice ? resolve(dir, manifest.presenter.voice) : null;
    return {
      kind: "stock",
      video: clip,
      vertical: stockSpec.vertical ?? false,
      focusX: stockSpec.focusX ?? 0.74,
      start: stockSpec.start,
      ctaStart: stockSpec.ctaStart ?? stockSpec.start,
      voicePath: voice && existsSync(voice) ? voice : null,
      voiceGain: stockSpec.voiceGain ?? manifest.presenter.voiceGain ?? 1.18,
      voiceDelay: stockSpec.delay ?? 300,
      pip,
      engine: "ffmpeg trend · stock presenter",
    };
  };

  if (requested === "stock") return stock();

  if (requested === "owner" || requested === "auto") {
    const clip = ownerClip(input.slug);
    if (clip) {
      const audio = await hasAudio(clip);
      const fallbackVoice = manifest.presenter.voice ? resolve(dir, manifest.presenter.voice) : null;
      return {
        kind: "owner",
        video: clip,
        vertical: ownerSpec.vertical ?? true,
        focusX: ownerSpec.focusX ?? 0.5,
        start: ownerSpec.start,
        ctaStart: ownerSpec.ctaStart ?? ownerSpec.start,
        voicePath: audio ? clip : fallbackVoice && existsSync(fallbackVoice) ? fallbackVoice : null,
        voiceGain: audio ? ownerSpec.voiceGain ?? 1 : ownerSpec.voiceGain ?? 1.18,
        voiceDelay: audio ? ownerSpec.delay ?? 0 : stockSpec.delay ?? 300,
        pip,
        engine: audio ? "ffmpeg trend · owner clip + owner audio" : "ffmpeg trend · owner clip + TTS",
      };
    }
    if (requested === "owner") {
      return stock(`No owner clip at public/assets/presenters/${input.slug}/owner.mp4`);
    }
  }

  if (requested === "avatar" || (requested === "auto" && avatarConfigured())) {
    if (!avatarConfigured()) return stock("HeyGen is selected but not fully configured");
    try {
      const avatar = await generateAvatarVideo(input.id, vars.voiceScript || manifest.voiceScript || "");
      const audio = await hasAudio(avatar.file);
      if (!audio) return stock("HeyGen clip has no audio track");
      return {
        kind: "avatar",
        video: avatar.file,
        vertical: avatarSpec.vertical ?? true,
        focusX: avatarSpec.focusX ?? 0.5,
        start: avatarSpec.start,
        ctaStart: avatarSpec.ctaStart ?? avatarSpec.start,
        voicePath: avatar.file,
        voiceGain: avatarSpec.voiceGain ?? 1,
        voiceDelay: avatarSpec.delay ?? 0,
        pip,
        engine: `HeyGen avatar${avatar.cached ? " (cached)" : ""} + ffmpeg trend`,
      };
    } catch (err) {
      return stock(`HeyGen failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return stock();
}

async function renderShot(opts: {
  shot: ShotSpec;
  index: number;
  presenter: ResolvedPresenter;
  shotStart: number;
  dir: string;
  tmp: string;
  vars: Record<string, string>;
  scrim: string | null;
  edit: EditSpec;
}): Promise<{ file: string; pops: number[] }> {
  const { shot, index, presenter, shotStart, dir, tmp, vars, scrim, edit } = opts;
  const isPresenter = shot.source === "presenter";
  const src = isPresenter ? presenter.video : resolve(dir, shot.source);
  if (!existsSync(src)) throw new Error(`Missing trend source: ${src}`);

  const vertical = isPresenter ? presenter.vertical : Boolean(shot.vertical);
  const focusX = isPresenter ? presenter.focusX : shot.focusX ?? 0.5;
  const start = isPresenter
    ? shot.role === "cta"
      ? presenter.ctaStart
      : presenter.start
    : shot.start ?? 0;

  const prep = vertical
    ? `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}:(iw-${W})*${focusX}:(ih-${H})/2`
    : `crop=405:720:(iw-405)*${focusX}:0,scale=${W}:${H}:flags=lanczos`;

  const usePip =
    shot.role === "broll" &&
    presenter.pip !== "none" &&
    (presenter.kind === "avatar" || (presenter.pip === "all" && presenter.kind === "owner"));

  const filters: string[] = [];
  const base = [
    `[0:v]trim=start=${start}:duration=${shot.dur},setpts=PTS-STARTPTS,fps=${FPS}`,
    prep,
    ...motionChain(shot.move, shot.dur),
    gradeChain(edit),
    "setsar=1",
  ];
  filters.push(`${base.join(",")}[base]`);
  let last = "base";
  let n = 0;

  if (scrim) {
    filters.push(`[1:v]format=rgba[scrimv]`);
    filters.push(`[${last}][scrimv]overlay=0:0[base2]`);
    last = "base2";
  }

  if (usePip) {
    const pipEnd = Math.max(0.5, shot.dur - 0.15).toFixed(3);
    filters.push(
      `[2:v]trim=start=${shotStart}:duration=${shot.dur},setpts=PTS-STARTPTS,fps=${FPS},scale=${PIP_SIZE}:${PIP_SIZE}:force_original_aspect_ratio=increase,crop=${PIP_SIZE}:${PIP_SIZE},format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte((X-150)*(X-150)+(Y-150)*(Y-150),22500),255,0)',tpad=stop_mode=clone:stop_duration=${shot.dur.toFixed(
        3
      )}[pipv]`
    );
    filters.push(
      `[3:v]format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(between(hypot(X-158,Y-158),150,158),255,0)'[ringv]`
    );
    filters.push(
      `[${last}][ringv]overlay=${PIP_X - 8}:${PIP_Y - 8}:enable='between(t,0.10,${pipEnd})'[pipr]`
    );
    filters.push(`[pipr][pipv]overlay=${PIP_X}:${PIP_Y}:enable='between(t,0.10,${pipEnd})'[pipt]`);
    last = "pipt";
  }

  const pops: number[] = [];

  for (const e of shot.back || []) {
    const label = `t${n++}`;
    filters.push(`[${last}]${fill(e, vars)}[${label}]`);
    last = label;
  }

  const captions: CaptionSpec[] = [
    ...(shot.captions ?? []),
    ...(shot.texts ?? []).map(textToCaption),
  ];
  for (const c of captions) {
    const plate = captionPlateStr(c, vars);
    if (plate) {
      const label = `t${n++}`;
      filters.push(`[${last}]${plate}[${label}]`);
      last = label;
    }
    const underline = captionUnderlineStr(c, vars);
    if (underline) {
      const label = `t${n++}`;
      filters.push(`[${last}]${underline}[${label}]`);
      last = label;
    }
    const label = `t${n++}`;
    filters.push(`[${last}]drawtext=${captionStr(c, vars)}[${label}]`);
    last = label;
    if (c.pop) pops.push(shotStart + (c.start ?? 0));
  }

  for (const e of shot.front || []) {
    const label = `t${n++}`;
    filters.push(`[${last}]${fill(e, vars)}[${label}]`);
    last = label;
  }
  for (const h of brandHeader(vars)) {
    const label = `t${n++}`;
    filters.push(`[${last}]${h}[${label}]`);
    last = label;
  }
  if (shot.footer) {
    for (const f of footer(vars)) {
      const label = `t${n++}`;
      filters.push(`[${last}]${f}[${label}]`);
      last = label;
    }
  }
  filters.push(`[${last}]setsar=1,format=yuv420p[v]`);

  const script = join(tmp, `filter-${index}-${shot.id}.txt`);
  writeFileSync(script, filters.join(";"), "utf8");

  const out = join(tmp, `shot-${index}-${shot.id}.mp4`);
  const args = [
    "-y",
    "-stream_loop",
    "-1",
    "-i",
    src,
    ...(scrim ? ["-loop", "1", "-framerate", String(FPS), "-i", scrim] : []),
    ...(usePip
      ? [
          "-i",
          presenter.video,
          "-f",
          "lavfi",
          "-i",
          `color=c=${vars.brand}:s=${RING_SIZE}x${RING_SIZE}:r=${FPS}`,
        ]
      : []),
    "-filter_complex_script",
    script,
    "-map",
    "[v]",
    "-an",
    "-t",
    String(shot.dur),
    "-r",
    String(FPS),
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    out,
  ];
  await run(args);
  return { file: out, pops };
}

async function renderVisual(opts: {
  shots: ShotSpec[];
  files: string[];
  switchTimes: number[];
  tmp: string;
  brand: string;
  xfade: number;
  transitions: string[];
  edit: EditSpec;
}) {
  const { shots, files, switchTimes, tmp, brand, xfade, transitions, edit } = opts;
  const total = shots.reduce((acc, s) => acc + s.dur, 0) - xfade * (shots.length - 1);
  const parts: string[] = [];
  let last = "0:v";

  for (let i = 0; i < files.length - 1; i++) {
    const transition = transitions[i % transitions.length];
    const outLabel = `x${i}`;
    parts.push(
      `[${last}][${i + 1}:v]xfade=transition=${transition}:duration=${xfade}:offset=${switchTimes[
        i
      ].toFixed(3)}[${outLabel}]`
    );
    last = outLabel;
  }

  const bloom = edit.bloom ?? 0;
  if (bloom > 0) {
    parts.push(`[${last}]split[gb1][gb2]`);
    parts.push(`[gb2]gblur=sigma=22[gb]`);
    parts.push(`[gb1][gb]blend=all_mode=screen:all_opacity=${bloom}[bl]`);
    last = "bl";
  }

  const grain = edit.grain ?? 0;
  if (grain > 0) {
    parts.push(`[${last}]noise=alls=${grain}:allf=t+u[gr]`);
    last = "gr";
  }

  if (edit.vignette !== false) {
    parts.push(`[${last}]vignette=PI/6[vg]`);
    last = "vg";
  }

  const flashes = (edit.flashCuts ?? [])
    .map((c) => switchTimes[c])
    .filter((t): t is number => typeof t === "number")
    .map(
      (t) =>
        `drawbox=x=0:y=0:w=${W}:h=${H}:color=white@0.42:t=fill:enable='between(t,${(t - 0.03).toFixed(
          3
        )},${(t + 0.05).toFixed(3)})'`
    );

  const tail = [
    `drawbox=x=0:y=1884:w='iw*t/${total.toFixed(3)}':h=6:color=${brand}@0.92:t=fill`,
    ...flashes,
    "setsar=1",
    "format=yuv420p",
  ];
  parts.push(`[${last}]${tail.join(",")}[v]`);

  const out = join(tmp, "visual.mp4");
  await run([
    "-y",
    ...files.flatMap((f) => ["-i", f]),
    "-filter_complex",
    parts.join(";"),
    "-map",
    "[v]",
    "-t",
    total.toFixed(3),
    "-r",
    String(FPS),
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "19",
    "-pix_fmt",
    "yuv420p",
    out,
  ]);
  return { file: out, total };
}

async function muxAudio(opts: {
  visual: string;
  total: number;
  presenter: ResolvedPresenter;
  manifest: TrendManifest;
  dir: string;
  tmp: string;
  out: string;
  switchTimes: number[];
  prevShotStart: number;
  pops: number[];
  edit: EditSpec;
}) {
  const { visual, total, presenter, manifest, dir, tmp, out, switchTimes, prevShotStart, pops, edit } =
    opts;

  const resolveSfx = (name: string) => {
    const p = resolve(TREND_ROOT, "sfx", name);
    return existsSync(p) ? p : null;
  };
  const music = manifest.music ? resolve(dir, manifest.music) : null;
  const whoosh = resolveSfx("whoosh.mp3");
  const impact = resolveSfx("impact.mp3");
  const popSfx = resolveSfx("pop.mp3");
  const riser = resolveSfx("riser.mp3");

  const totalStr = total.toFixed(3);
  const args = ["-y", "-i", visual];
  const add = (path: string | null) => {
    if (path && existsSync(path)) {
      args.push("-i", path);
      return true;
    }
    args.push("-f", "lavfi", "-t", totalStr, "-i", "anullsrc=r=44100:cl=stereo");
    return false;
  };

  const hasVoice = add(presenter.voicePath);
  const hasMusic = add(music);
  const hasWhoosh = add(whoosh);
  const hasImpact = add(impact);
  const hasPop = add(popSfx);
  const hasRiser = add(riser);

  const voiceFilter = presenter.kind === "stock" ? "" : "highpass=f=70,";
  const lines: string[] = [];

  lines.push(
    hasVoice
      ? `[1:a]atrim=0:${totalStr},aresample=44100,${voiceFilter}volume=${presenter.voiceGain},adelay=${presenter.voiceDelay}:all=1,apad=whole_dur=${totalStr}[voRaw];`
      : `[1:a]volume=0[voRaw];`
  );
  lines.push(`[voRaw]asplit=2[vo][voKey];`);

  const musicStart = Math.max(0, manifest.musicStart ?? 0);
  lines.push(
    hasMusic
      ? `[2:a]atrim=${musicStart.toFixed(3)}:${(musicStart + total).toFixed(3)},asetpts=PTS-STARTPTS,aresample=44100,volume=${
          manifest.musicVolume ?? 0.5
        },afade=t=in:st=0:d=0.25,afade=t=out:st=${Math.max(
          0,
          total - 1.0
        ).toFixed(3)}:d=1.0[musicIn];`
      : `[2:a]volume=0[musicIn];`
  );
  lines.push(
    edit.sfx === false
      ? `[musicIn]anull[music];`
      : `[musicIn][voKey]sidechaincompress=threshold=0.12:ratio=2.2:attack=12:release=380:makeup=1[music];`
  );

  const nCuts = switchTimes.length;
  const mixLabels = ["[vo]", "[music]"];

  if (nCuts > 0) {
    lines.push(`[3:a]asplit=${nCuts}${switchTimes.map((_, i) => `[w${i}]`).join("")};`);
    switchTimes.forEach((t, i) => {
      const delay = Math.max(0, Math.round((t - 0.18) * 1000));
      lines.push(
        `[w${i}]atrim=0:1.2,volume=${
          hasWhoosh && edit.sfx !== false ? 0.22 : 0
        },adelay=${delay}:all=1[ww${i}];`
      );
      mixLabels.push(`[ww${i}]`);
    });

    lines.push(`[4:a]asplit=${nCuts}${switchTimes.map((_, i) => `[i${i}]`).join("")};`);
    switchTimes.forEach((t, i) => {
      const vol = i === 0 || i === 2 ? 0.38 : 0.26;
      lines.push(
        `[i${i}]atrim=0:2.5,volume=${
          hasImpact && edit.sfx !== false ? vol : 0
        },adelay=${Math.round(t * 1000)}:all=1[imp${i}];`
      );
      mixLabels.push(`[imp${i}]`);
    });
  }

  if (pops.length > 0) {
    // One accent per shot, not a blip on every caption. Fourteen pops in 13s
    // reads as a metronome rather than sound design.
    const shotStarts = [0, ...switchTimes];
    const accents = shotStarts
      .map((start, i) => {
        const end = i + 1 < shotStarts.length ? shotStarts[i + 1] : total;
        return pops.find((t) => t >= start - 0.01 && t < end);
      })
      .filter((t): t is number => typeof t === "number");

    if (accents.length > 0) {
      lines.push(`[5:a]asplit=${accents.length}${accents.map((_, i) => `[p${i}]`).join("")};`);
      accents.forEach((t, i) => {
        lines.push(
          `[p${i}]atrim=0:0.3,volume=${
            hasPop && edit.sfx !== false ? 0.16 : 0
          },adelay=${Math.max(0, Math.round(t * 1000))}:all=1[pop${i}];`
        );
        mixLabels.push(`[pop${i}]`);
      });
    }
  }

  if (edit.riser !== false && nCuts > 0) {
    const riserStart = Math.max(0, prevShotStart - 1.2);
    lines.push(
      `[6:a]atrim=0:1.4,volume=${
        hasRiser ? 0.3 : 0
      },adelay=${Math.round(riserStart * 1000)}:all=1[riser];`
    );
    mixLabels.push("[riser]");
  }

  lines.push(
    `${mixLabels.join("")}amix=inputs=${mixLabels.length}:duration=longest:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,alimiter=limit=0.891:level=disabled[a]`
  );

  const script = join(tmp, "audio-filter.txt");
  writeFileSync(script, lines.join("\n"), "utf8");
  await run([
    ...args,
    "-filter_complex_script",
    script,
    "-map",
    "0:v:0",
    "-map",
    "[a]",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-ar",
    "44100",
    "-movflags",
    "+faststart",
    "-t",
    totalStr,
    out,
  ]);
}

async function makePoster(video: string, jpg: string, at = 1.4) {
  await run([
    "-y",
    "-ss",
    at.toFixed(2),
    "-i",
    video,
    "-frames:v",
    "1",
    "-q:v",
    "3",
    jpg,
  ]);
}

/**
 * Trend renderer — "senior editor" cut.
 *
 * 5 full-bleed shots with beat-aligned xfades, virtual camera moves, kinetic
 * Hinglish captions (pop / slide / plate / underline), a colour grade with
 * bloom + grain + lens character, cut-synced sound design (whoosh, impact,
 * pop, riser), music ducking under the voice, an animated CTA and — on the
 * HeyGen path — a circular talking-head PiP over the b-roll.
 *
 * Presenter priority is owner clip > HeyGen avatar > stock actor. Owner and
 * avatar carry their own lip-synced audio; the stock path is an honest
 * narrator.
 */
export async function renderTrendVideo(input: TrendInput): Promise<TrendRenderResult> {
  const started = Date.now();
  mkdirSync(OUT_DIR, { recursive: true });
  const { dir, manifest } = loadManifest(input);
  const vars = buildVars(input, manifest);
  const presenter = await resolvePresenter(input, manifest, dir, vars);
  const tmp = join(OUT_DIR, `.trend-${input.id}`);
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });

  const scrimPath = manifest.scrim ? resolve(dir, manifest.scrim) : null;
  const scrim = scrimPath && existsSync(scrimPath) ? scrimPath : null;
  const xfade = manifest.xfade ?? 0.25;
  const transitions = manifest.transitions ?? ["slideleft", "circleopen", "slideup", "fadeblack"];
  const edit: EditSpec = {
    grade: "teal-orange",
    grain: 4,
    bloom: 0.08,
    chroma: true,
    vignette: true,
    sfx: true,
    riser: true,
    flashCuts: [],
    ...manifest.edit,
  };

  // Shot starts and cut times. Every shot's content begins at the previous
  // transition offset, so captions/PiP stay in sync with the avatar's voice.
  const shotStarts: number[] = [];
  const switchTimes: number[] = [];
  let acc = 0;
  for (let i = 0; i < manifest.shots.length; i++) {
    shotStarts[i] = acc;
    if (i < manifest.shots.length - 1) {
      acc += manifest.shots[i].dur - xfade;
      switchTimes.push(acc);
    }
  }

  try {
    const files: string[] = [];
    const pops: number[] = [];
    for (let i = 0; i < manifest.shots.length; i++) {
      const rendered = await renderShot({
        shot: manifest.shots[i],
        index: i,
        presenter,
        shotStart: shotStarts[i],
        dir,
        tmp,
        vars,
        scrim,
        edit,
      });
      files.push(rendered.file);
      pops.push(...rendered.pops);
    }

    const visual = await renderVisual({
      shots: manifest.shots,
      files,
      switchTimes,
      tmp,
      brand: vars.brand,
      xfade,
      transitions,
      edit,
    });

    const finalTmp = join(tmp, "final.mp4");
    await muxAudio({
      visual: visual.file,
      total: visual.total,
      presenter,
      manifest,
      dir,
      tmp,
      out: finalTmp,
      switchTimes,
      prevShotStart: shotStarts[shotStarts.length - 1] ?? 0,
      pops,
      edit,
    });

    const mp4 = join(OUT_DIR, `${input.id}.mp4`);
    const jpg = join(OUT_DIR, `${input.id}.jpg`);
    rmSync(mp4, { force: true });
    renameSync(finalTmp, mp4);
    let posterUrl: string | null = null;
    try {
      await makePoster(mp4, jpg);
      posterUrl = `/renders/${input.id}.jpg`;
    } catch (err) {
      console.warn("[trend] poster failed", err);
    }

    return {
      videoUrl: `/renders/${input.id}.mp4`,
      posterUrl,
      ms: Date.now() - started,
      bytes: statSync(mp4).size,
      engine: `${presenter.engine}${manifest.bpm ? ` · ${manifest.bpm} BPM` : ""} · pro edit`,
      presenterKind: presenter.kind,
    };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
