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
  texts?: TextSpec[];
  back?: string[];
  front?: string[];
  footer?: boolean;
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
  voiceScript?: string;
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
  engine: string;
};

const W = 1080;
const H = 1920;
const FPS = 30;
const TREND_ROOT = join(process.cwd(), "public", "assets", "trend");
const OUT_DIR = join(process.cwd(), "public", "renders");
const FONT = [
  join(process.cwd(), "public", "assets", "fonts", "Anton-Regular.ttf"),
  "C:/Windows/Fonts/arialbd.ttf",
  "C:/Windows/Fonts/segoeuib.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
].find((p) => existsSync(p))!;

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
    font: FONT.replace(/\\/g, "/").replace(/:/g, "\\:"),
    voiceScript,
  };
}

function colorValue(color: string | undefined, vars: Record<string, string>) {
  if (!color || color === "white") return "0xF6F8EF";
  if (color === "brand") return vars.brand;
  if (color === "dark") return "0x07080B";
  if (color === "muted") return "0xC9D2C0";
  return color.startsWith("0x") || color.startsWith("#") ? color.replace("#", "0x") : color;
}

function fontArg() {
  return `fontfile='${FONT.replace(/\\/g, "/").replace(/:/g, "\\:")}'`;
}

function drawText(spec: TextSpec, vars: Record<string, string>) {
  const text = fill(spec.text, vars);
  const at = spec.at ?? 0.06;
  const alpha = `min(1,max(0,(t-${at})/0.20))`;
  const y = spec.y;
  const yy = `'${y}+24*(1-min(1,max(0,(t-${at})/0.28)))'`;
  const border = spec.border ? `:borderw=${spec.border}:bordercolor=black@0.55` : "";
  return `${fontArg()}:text='${esc(text)}':x=${spec.x ?? 55}:y=${yy}:fontsize=${spec.size}:fontcolor=${colorValue(
    spec.color,
    vars
  )}@1:expansion=none:alpha='${alpha}':shadowcolor=black@0.68:shadowx=0:shadowy=${
    spec.shadow ?? 7
  }${border}`;
}

function brandHeader(vars: Record<string, string>) {
  return [
    `drawbox=x=36:y=34:w=400:h=98:color=black@0.42:t=fill`,
    `drawbox=x=36:y=34:w=5:h=98:color=${vars.brand}@0.95:t=fill`,
    `drawtext=${fontArg()}:text='${esc(vars.brandShort)}':x=60:y=50:fontsize=32:fontcolor=0xF6F8EF@0.97:expansion=none:shadowcolor=black@0.6:shadowx=0:shadowy=3`,
    `drawtext=${fontArg()}:text='${esc(vars.area)}':x=60:y=92:fontsize=22:fontcolor=${vars.brand}@1:expansion=none:shadowcolor=black@0.6:shadowx=0:shadowy=2`,
    `drawbox=x=0:y=0:w=${W}:h=5:color=${vars.brand}@0.9:t=fill`,
    `drawbox=x=0:y=1915:w=${W}:h=5:color=${vars.brand}@0.35:t=fill`,
  ];
}

function footer(vars: Record<string, string>) {
  return [
    `drawbox=x=60:y=1722:w=320:h=2:color=${vars.brand}@0.55:t=fill`,
    `drawtext=${fontArg()}:text='${esc(vars.brandFull)}':x=60:y=1740:fontsize=26:fontcolor=0xF6F8EF@0.82:expansion=none:shadowcolor=black@0.6:shadowx=0:shadowy=3`,
    `drawtext=${fontArg()}:text='${esc(vars.areaUpper)}':x=60:y=1782:fontsize=22:fontcolor=${vars.brand}@0.9:expansion=none:shadowcolor=black@0.6:shadowx=0:shadowy=2`,
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
  dir: string;
  tmp: string;
  vars: Record<string, string>;
  scrim: string | null;
  xfade: number;
}) {
  const { shot, index, presenter, dir, tmp, vars, scrim } = opts;
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

  const filters = [
    `[0:v]trim=start=${start}:duration=${shot.dur},setpts=PTS-STARTPTS,fps=${FPS},${prep},setsar=1,unsharp=5:5:0.55:5:5:0.0,eq=contrast=1.05:saturation=1.05:brightness=-0.01,noise=alls=4:allf=t,vignette=PI/5[base]`,
  ];
  let last = "base";
  let n = 0;

  if (scrim) {
    filters.push(`[1:v]format=rgba[scrim]`);
    filters.push(`[${last}][scrim]overlay=0:0[base2]`);
    last = "base2";
  }

  for (const e of shot.back || []) {
    const label = `t${n++}`;
    filters.push(`[${last}]${fill(e, vars)}[${label}]`);
    last = label;
  }
  for (const t of shot.texts || []) {
    const label = `t${n++}`;
    filters.push(`[${last}]drawtext=${drawText(t, vars)}[${label}]`);
    last = label;
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
    ...(scrim
      ? ["-loop", "1", "-framerate", String(FPS), "-i", scrim]
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
  return out;
}

async function renderVisual(opts: {
  shots: ShotSpec[];
  files: string[];
  tmp: string;
  brand: string;
  xfade: number;
  transitions: string[];
  flashAt?: number;
}) {
  const { shots, files, tmp, brand, xfade, transitions, flashAt } = opts;
  const total = shots.reduce((acc, s) => acc + s.dur, 0) - xfade * (shots.length - 1);
  let offset = 0;
  let last = "0:v";
  const parts: string[] = [];

  for (let i = 0; i < files.length - 1; i++) {
    offset += shots[i].dur - xfade;
    const transition = transitions[i % transitions.length];
    const outLabel = `x${i}`;
    parts.push(
      `[${last}][${i + 1}:v]xfade=transition=${transition}:duration=${xfade}:offset=${offset.toFixed(
        3
      )}[${outLabel}]`
    );
    last = outLabel;
  }

  const flash = flashAt
    ? `,drawbox=x=0:y=0:w=${W}:h=${H}:color=white@0.50:t=fill:enable='between(t,${flashAt},${(
        flashAt + 0.06
      ).toFixed(2)})'`
    : "";
  parts.push(
    `[${last}]drawbox=x=0:y=1884:w='iw*t/${total.toFixed(3)}':h=6:color=${brand}@0.92:t=fill${flash},setsar=1,format=yuv420p[v]`
  );

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
}) {
  const { visual, total, presenter, manifest, dir, tmp, out } = opts;

  const music = manifest.music ? resolve(dir, manifest.music) : null;
  const whoosh = resolve(TREND_ROOT, "sfx", "whoosh.mp3");
  const impact = resolve(TREND_ROOT, "sfx", "impact.mp3");
  const pop = resolve(TREND_ROOT, "sfx", "pop.mp3");
  const sfx = {
    whoosh: existsSync(whoosh) ? whoosh : null,
    impact: existsSync(impact) ? impact : null,
    pop: existsSync(pop) ? pop : null,
  };

  const args = ["-y", "-i", visual];
  const add = (path: string | null) => {
    if (path && existsSync(path)) {
      args.push("-i", path);
      return true;
    }
    args.push("-f", "lavfi", "-t", total.toFixed(3), "-i", "anullsrc=r=44100:cl=stereo");
    return false;
  };

  const hasVoice = add(presenter.voicePath);
  const hasMusic = add(music);
  const hasWhoosh = add(sfx.whoosh);
  const hasImpact = add(sfx.impact);
  const hasPop = add(sfx.pop);

  const voiceFilter = presenter.kind === "stock" ? "" : "highpass=f=70,";
  const lines = [
    hasVoice
      ? `[1:a]atrim=0:${total.toFixed(3)},aresample=44100,${voiceFilter}volume=${presenter.voiceGain},adelay=${presenter.voiceDelay}:all=1,apad=whole_dur=${total.toFixed(3)}[vo];`
      : `[1:a]volume=0[vo];`,
    hasMusic
      ? `[2:a]atrim=0:${total.toFixed(3)},volume=${manifest.musicVolume ?? 0.3},afade=t=in:st=0:d=0.25,afade=t=out:st=${Math.max(
          0,
          total - 1.394
        ).toFixed(3)}:d=1.394[music];`
      : `[2:a]volume=0[music];`,
    hasWhoosh
      ? `[3:a]asplit=4[w0][w1][w2][w3];[w0]atrim=0:1.2,volume=0.32,adelay=2508:all=1[ww0];[w1]atrim=0:1.2,volume=0.32,adelay=5016:all=1[ww1];[w2]atrim=0:1.2,volume=0.32,adelay=7524:all=1[ww2];[w3]atrim=0:1.2,volume=0.32,adelay=10032:all=1[ww3];`
      : `[3:a]asplit=4[w0][w1][w2][w3];[w0]volume=0[ww0];[w1]volume=0[ww1];[w2]volume=0[ww2];[w3]volume=0[ww3];`,
    hasImpact ? `[4:a]atrim=0:2.5,volume=0.42,adelay=5016:all=1[imp];` : `[4:a]volume=0[imp];`,
    hasPop ? `[5:a]atrim=0:0.3,volume=0.45,adelay=10032:all=1[pop];` : `[5:a]volume=0[pop];`,
    `[vo][music][ww0][ww1][ww2][ww3][imp][pop]amix=inputs=8:duration=longest:normalize=0,alimiter=limit=0.95,loudnorm=I=-14:TP=-1.5:LRA=11[a]`,
  ];

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
    total.toFixed(3),
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
 * Trend renderer: 5 full-bleed shots, beat-synced xfades, kinetic Hinglish
 * type, a presenter hook/CTA, music + SFX and a deterministic offer overlay.
 *
 * Presenter priority is owner clip > HeyGen avatar > stock actor. The stock
 * path uses a narrator, so it is honest about lip-sync; owner and avatar paths
 * carry their own audio and lip-sync.
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

  try {
    const files: string[] = [];
    for (let i = 0; i < manifest.shots.length; i++) {
      files.push(
        await renderShot({
          shot: manifest.shots[i],
          index: i,
          presenter,
          dir,
          tmp,
          vars,
          scrim,
          xfade,
        })
      );
    }

    const visual = await renderVisual({
      shots: manifest.shots,
      files,
      tmp,
      brand: vars.brand,
      xfade,
      transitions,
      flashAt: manifest.flashAt,
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
      engine: `${presenter.engine}${manifest.bpm ? ` · ${manifest.bpm} BPM` : ""}`,
      presenterKind: presenter.kind,
    };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
