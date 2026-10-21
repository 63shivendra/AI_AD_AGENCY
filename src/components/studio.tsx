"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Loader2,
  Play,
  Download,
  Check,
  ArrowUpRight,
  Wand2,
  Zap,
  Film,
  RefreshCw,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { inr } from "@/lib/format";
import { AdFrame, Avatar, Card, ScoreRing, SectionHead, StatusPill } from "@/components/ui";

type Concept = {
  angle: string;
  title: string;
  hook: string;
  cta: string;
  platform: string;
  score: number;
  predictedCtr: number;
  predictedRoas: number;
  rationale: string;
  factors: string[];
  scenes: { label: string; text: string; sub: string }[];
  adId?: string;
};

type ClientLite = {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  niche: string;
  area: string;
  brandColor: string;
  monthlyFee: number;
  status: string;
  offers: { id: string; title: string; price: string | null; description: string }[];
};

type RecentAd = {
  id: string;
  hook: string;
  status: string;
  hitScore: number;
  videoUrl: string | null;
  posterUrl: string | null;
  createdAt: string;
  client: { name: string; slug: string; emoji: string; brandColor: string };
};

const STEPS = ["Reading offers", "Writing hooks", "Scoring variants"];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function Studio({
  clients,
  recentAds,
  initialClientId,
  initialBrief = "",
}: {
  clients: ClientLite[];
  recentAds: RecentAd[];
  initialClientId?: string;
  initialBrief?: string;
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState(initialClientId || clients[0]?.id || "");
  const [brief, setBrief] = useState(initialBrief);
  const [count, setCount] = useState(4);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [engine, setEngine] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "thinking" | "ready">("idle");
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState("");

  const [render, setRender] = useState<{
    adId: string;
    jobId: string;
    progress: number;
    status: string;
    result?: { videoUrl: string | null; posterUrl: string | null; ms: number; engine: string } | null;
  } | null>(null);
  const [shownProgress, setShownProgress] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  const client = clients.find((c) => c.id === clientId) ?? clients[0];
  const renderReady = Boolean(render && (render.status === "DONE" || render.status === "PUBLISHED"));
  const published = render?.status === "PUBLISHED";

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, []);

  // Switching client must not leave the previous client's concepts on screen.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setConcepts([]);
    setEngine(null);
    setPhase("idle");
    setRender(null);
    setStatuses({});
    setPublishMsg("");
  }, [clientId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!render) return;
    const target = render.status === "DONE" || render.status === "PUBLISHED" ? 100 : render.progress;
    const t = setInterval(() => {
      setShownProgress((p) => (p < target ? Math.min(target, p + Math.max(1, Math.round((target - p) / 6))) : target));
    }, 180);
    return () => clearInterval(t);
  }, [render]);

  async function generate() {
    if (!client) return;
    setPhase("thinking");
    setStep(0);
    setError("");
    setConcepts([]);
    const timers = [
      setTimeout(() => setStep(1), 550),
      setTimeout(() => setStep(2), 1300),
    ];

    try {
      const [res] = await Promise.all([
        fetch("/api/ads/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ clientId: client.id, brief, count }),
        }),
        sleep(1600),
      ]);
      if (!res.ok) throw new Error("Generation failed");
      const data = (await res.json()) as {
        concepts: Concept[];
        saved: { id: string; hook: string }[];
        engine: string;
      };
      setConcepts(data.concepts.map((c, i) => ({ ...c, adId: data.saved[i]?.id })));
      setEngine(data.engine);
      setPhase("ready");
      router.refresh();
    } catch {
      setError("Could not generate concepts. Is the dev server running?");
      setPhase("idle");
    } finally {
      timers.forEach(clearTimeout);
    }
  }

  async function renderConcept(concept: Concept) {
    if (!concept.adId) return;
    const adId = concept.adId;
    setRender({ adId, jobId: "", progress: 4, status: "QUEUED" });
    setStatuses((s) => ({ ...s, [adId]: "RENDERING" }));
    setPublishMsg("");
    setShownProgress(4);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 200);

    const res = await fetch("/api/ads/render", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ adId }),
    });
    if (!res.ok) {
      setRender((r) => (r ? { ...r, status: "FAILED" } : r));
      setStatuses((s) => ({ ...s, [adId]: "FAILED" }));
      return;
    }
    const { jobId } = (await res.json()) as { jobId: string };
    setRender((r) => (r ? { ...r, jobId, status: "RUNNING", progress: 12 } : r));

    for (let i = 0; i < 90; i++) {
      await sleep(600);
      const poll = await fetch(`/api/jobs/${jobId}`);
      if (!poll.ok) break;
      const job = (await poll.json()) as {
        status: string;
        progress: number;
        result?: { videoUrl: string | null; posterUrl: string | null; ms: number; engine: string } | null;
      };
      setRender((r) => (r ? { ...r, status: job.status, progress: job.progress, result: job.result } : r));
      setStatuses((s) => ({ ...s, [adId]: job.status === "DONE" ? "READY" : job.status }));
      if (job.status === "DONE" || job.status === "FAILED") {
        router.refresh();
        break;
      }
    }
  }

  async function publish(adId: string) {
    setPublishing(true);
    setPublishMsg("");
    try {
      const res = await fetch(`/api/ads/${adId}/publish`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Publish failed");
      setRender((r) => (r ? { ...r, status: "PUBLISHED" } : r));
      setStatuses((s) => ({ ...s, [adId]: "PUBLISHED" }));
      setPublishMsg(data.message ?? "Published. Sandbox mode — no live spend.");
      router.refresh();
    } catch (err) {
      setPublishMsg(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      {/* ── control panel ─────────────────────────────────────── */}
      <div className="space-y-3">
        <Card className="p-4">
          <SectionHead
            title="New campaign"
            subtitle="Pick a client, add a brief, generate"
            action={<Wand2 className="h-4 w-4 text-lime" />}
          />

          <p className="label mb-2 mt-4">Client</p>
          <div className="max-h-[420px] space-y-1 overflow-y-auto pr-1">
            {clients.map((c) => (
              <button
                key={c.id}
                ref={c.id === client?.id ? selectedRef : undefined}
                onClick={() => setClientId(c.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg border px-2 py-1.5 text-left transition-colors",
                  c.id === client?.id
                    ? "border-lime/40 bg-lime/[0.07]"
                    : "border-transparent hover:border-line hover:bg-panel2"
                )}
              >
                <Avatar name={c.name} emoji={c.emoji} color={c.brandColor} size={26} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] font-semibold">{c.name}</span>
                  <span className="block truncate text-[9.5px] text-faint">
                    {c.area} · {c.status === "PROSPECT" ? "prospect" : inr(c.monthlyFee, true)}
                  </span>
                </span>
                {c.id === client?.id && <Check className="h-3.5 w-3.5 shrink-0 text-lime" />}
              </button>
            ))}
          </div>

          {client && (
            <div className="mt-3 rounded-lg border border-line bg-panel2 px-2.5 py-2">
              <p className="text-[9px] uppercase tracking-wider text-faint">Primary offer</p>
              <p className="mt-0.5 text-[11px] font-semibold text-chalk">{client.offers[0]?.title ?? "No offer yet"}</p>
              <p className="mt-0.5 line-clamp-2 text-[10px] text-faint">{client.offers[0]?.description}</p>
            </div>
          )}

          <p className="label mb-1.5 mt-4">Brief (optional)</p>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={3}
            placeholder={`e.g. Push "${client?.offers[0]?.title ?? "the main offer"}" in ${client?.area ?? "this area"} — no discount language`}
            className="input resize-none text-[12px] leading-relaxed"
          />

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-faint">Hooks</span>
              <div className="flex rounded-lg border border-line bg-ink p-0.5">
                {[3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    className={cn(
                      "rounded-[5px] px-2 py-0.5 text-[10.5px] font-semibold",
                      count === n ? "bg-panel2 text-chalk" : "text-faint"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <span className="pill py-0.5 text-[9.5px]">
              {engine === "gemini" ? "Gemini Flash" : "Playbook writer"}
            </span>
          </div>

          <button
            onClick={generate}
            disabled={phase === "thinking" || !client}
            className="btn-primary mt-3 h-10 w-full text-[12.5px]"
          >
            {phase === "thinking" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {phase === "thinking" ? "Writing Hinglish hooks…" : "Generate ad concepts"}
          </button>
          {error && <p className="mt-2 text-[11px] text-rose">{error}</p>}
        </Card>

        <Card className="p-4">
          <p className="label">Pipeline</p>
          <div className="mt-2.5 space-y-1.5">
            {[
              { icon: Wand2, t: "Script + hooks", d: "Gemini / playbook", on: true },
              { icon: Film, t: "1080p render", d: "ffmpeg · h264", on: true },
              { icon: Sparkles, t: "Trend reels", d: "owner / avatar / stock", on: true },
              { icon: Zap, t: "Publish", d: "Meta sandbox", on: false },
            ].map((s) => (
              <div key={s.t} className="flex items-center gap-2">
                <span className={cn("flex h-6 w-6 items-center justify-center rounded-md", s.on ? "bg-lime/10 text-lime" : "bg-panel2 text-faint")}>
                  <s.icon className="h-3 w-3" />
                </span>
                <span className="flex-1">
                  <span className="block text-[11px] font-semibold">{s.t}</span>
                  <span className="block text-[9.5px] text-faint">{s.d}</span>
                </span>
                <span className={cn("text-[9px] font-bold uppercase", s.on ? "text-mint" : "text-faint")}>
                  {s.on ? "ready" : "sandbox"}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <div className="rounded-xl border border-violet/20 bg-violet/[0.06] p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-violet">
            <Sparkles className="h-3 w-3" /> Demo tip
          </p>
          <p className="mt-1 text-[10.5px] leading-relaxed text-dim">
            Pick Sharma Dental → Generate → Render the top concept. The seeded trend reel is in{" "}
            <Link href="/ads?filter=trend" className="font-semibold text-violet hover:underline">
              Ads → Trend
            </Link>
            : real footage, beat cuts, Hinglish VO.
          </p>
        </div>
      </div>

      {/* ── results ───────────────────────────────────────────── */}
      <div className="min-w-0 space-y-4">
        {phase === "idle" && (
          <Card className="relative overflow-hidden p-6">
            <div className="pointer-events-none absolute inset-0 aurora opacity-30" />
            <div className="relative">
              <p className="label text-lime">Ad studio</p>
              <h2 className="mt-1 max-w-md text-[24px] font-semibold leading-tight tracking-tight">
                From a shop&apos;s offer to a ready-to-run reel in{" "}
                <span className="text-lime">under a minute.</span>
              </h2>
              <p className="mt-2 max-w-lg text-[12.5px] leading-relaxed text-dim">
                The engine reads the client&apos;s offers, writes Hinglish hooks, scores each one against
                local conversion patterns, then renders a vertical 1080p ad you can hand over today.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                {[
                  { n: "01", t: "Generate", d: "4 angles, each with 3 scenes" },
                  { n: "02", t: "Score", d: "Predicted CTR + ROAS before spend" },
                  { n: "03", t: "Render", d: "Real MP4, poster, ready to publish" },
                ].map((s) => (
                  <div key={s.n} className="rounded-xl border border-line bg-panel/70 p-3 backdrop-blur">
                    <p className="text-[10px] font-bold text-lime">{s.n}</p>
                    <p className="mt-1 text-[12.5px] font-semibold">{s.t}</p>
                    <p className="mt-0.5 text-[10.5px] text-faint">{s.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {phase === "thinking" && (
          <div className="space-y-3">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-lime" />
                  <p className="text-[12.5px] font-semibold">Generating for {client?.name}</p>
                </div>
                <span className="text-[10.5px] text-faint">{STEPS[Math.min(step, 2)]}…</span>
              </div>
              <div className="mt-3 flex gap-1">
                {STEPS.map((s, i) => (
                  <div key={s} className="flex-1">
                    <div className={cn("h-1 rounded-full transition-colors", i <= step ? "bg-lime" : "bg-line")} />
                    <p className={cn("mt-1.5 text-[9.5px]", i <= step ? "text-dim" : "text-faint")}>{s}</p>
                  </div>
                ))}
              </div>
            </Card>
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: count }).map((_, i) => (
                <Card key={i} className="shimmer h-[168px] p-4">
                  <div className="h-2 w-16 rounded bg-line" />
                  <div className="mt-3 h-4 w-3/4 rounded bg-line" />
                  <div className="mt-2 h-3 w-2/3 rounded bg-line/70" />
                  <div className="mt-4 h-2 w-1/2 rounded bg-line/50" />
                </Card>
              ))}
            </div>
          </div>
        )}

        {phase === "ready" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[13px] font-semibold">
                  {concepts.length} concepts for {client?.name}
                </p>
                <p className="text-[10.5px] text-faint">
                  Scored on hook length, local signal, price anchor and urgency · engine: {engine}
                </p>
              </div>
              <button onClick={generate} className="btn-ghost h-8 px-2.5 text-[11px]">
                <RefreshCw className="h-3 w-3" /> Regenerate
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {concepts.map((c, i) => (
                <Card key={i} className="card-hover animate-[rise_0.35s_ease-out] p-3.5" >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ScoreRing score={c.score} />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-lime">{c.angle}</p>
                        <p className="text-[10.5px] text-faint">
                          {c.platform} · CTR {c.predictedCtr}% · {c.predictedRoas}x ROAS
                        </p>
                      </div>
                    </div>
                    <StatusPill status={(c.adId && statuses[c.adId]) || "DRAFT"} />
                  </div>

                  <p className="mt-2.5 text-[14px] font-semibold leading-snug text-chalk">“{c.hook}”</p>

                  <div className="mt-2.5 space-y-1">
                    {c.scenes.map((s, idx) => (
                      <div key={idx} className="flex gap-2 rounded-md border border-line/60 bg-ink/40 px-2 py-1">
                        <span className="w-10 shrink-0 text-[8.5px] font-bold uppercase tracking-wider text-faint">
                          {s.label}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[10.5px] text-chalk">{s.text}</span>
                          {s.sub && <span className="block truncate text-[9.5px] text-faint">{s.sub}</span>}
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-dim">{c.rationale}</p>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.factors.slice(0, 3).map((f) => (
                      <span key={f} className="rounded bg-panel2 px-1.5 py-0.5 text-[9px] text-faint">
                        {f}
                      </span>
                    ))}
                  </div>

                  <div className="mt-2.5 flex items-center gap-1.5 border-t border-line pt-2.5">
                    <button
                      onClick={() => renderConcept(c)}
                      disabled={!c.adId || publishing || (c.adId ? statuses[c.adId] === "PUBLISHED" : false)}
                      className="btn-primary h-7 flex-1 px-2 text-[10.5px]"
                    >
                      {c.adId && statuses[c.adId] === "PUBLISHED" ? (
                        <>
                          <Check className="h-3 w-3" /> Published
                        </>
                      ) : c.adId && statuses[c.adId] === "READY" ? (
                        <>
                          <RefreshCw className="h-3 w-3" /> Re-render
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3" /> Render ad
                        </>
                      )}
                    </button>
                    <Copy className="hidden" />
                    <Link
                      href={`/clients/${client?.slug}?tab=ads`}
                      className="btn-ghost h-7 px-2 text-[10.5px]"
                    >
                      Library
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* render panel */}
        {render && (
          <Card className="overflow-hidden">
            <div ref={resultRef} />
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Film className="h-4 w-4 text-lime" />
                <p className="text-[12px] font-semibold">Render pipeline</p>
                <StatusPill status={render.status} />
              </div>
              <span className="text-[10px] tabular-nums text-faint">
                {renderReady && render.result
                  ? `${(render.result.ms / 1000).toFixed(1)}s · ${render.result.engine}`
                  : `${shownProgress}%`}
              </span>
            </div>

            {!renderReady || !render.result ? (
              <div className="p-4">
                <div className="h-1.5 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-lime to-mint transition-all duration-200"
                    style={{ width: `${shownProgress}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[9.5px] uppercase tracking-wider text-faint">
                  <span className={shownProgress >= 4 ? "text-lime" : ""}>queued</span>
                  <span className={shownProgress >= 30 ? "text-lime" : ""}>scenes</span>
                  <span className={shownProgress >= 60 ? "text-lime" : ""}>encode 1080p</span>
                  <span className={shownProgress >= 90 ? "text-lime" : ""}>poster</span>
                </div>
                <p className="mt-3 text-[11px] text-dim">
                  {render.status === "FAILED"
                    ? "Render failed. Check the dev-server logs for the ffmpeg error."
                    : "Cutting three photo scenes, camera moves and the music bed with ffmpeg. This normally finishes in 10–20 seconds on CPU."}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 p-4 md:grid-cols-[220px_1fr]">
                <div>
                  {render.result?.videoUrl ? (
                    <video
                      src={render.result.videoUrl}
                      poster={render.result.posterUrl ?? undefined}
                      controls
                      autoPlay
                      loop
                      playsInline
                      className="aspect-[9/16] w-full rounded-xl border border-line bg-ink object-cover"
                    />
                  ) : (
                    <p className="rounded-xl border border-dashed border-line2 p-4 text-[11px] text-faint">
                      Poster-only render. Check ffmpeg logs.
                    </p>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="label text-mint">{published ? "Published" : "Rendered"}</p>
                  <p className="mt-1 text-[15px] font-semibold">{concepts.find((c) => c.adId === render.adId)?.hook}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {[
                      ["Format", "1080 × 1920 · 30fps"],
                      ["Duration", "12s"],
                      ["Engine", render.result?.engine ?? "ffmpeg"],
                      ["Render time", `${((render.result?.ms ?? 0) / 1000).toFixed(1)}s`],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-lg border border-line bg-panel2 px-2.5 py-1.5">
                        <p className="text-[9px] uppercase tracking-wider text-faint">{k}</p>
                        <p className="truncate text-[11px] font-medium">{v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button
                      onClick={() => publish(render.adId)}
                      disabled={publishing || published}
                      className="btn-primary h-8 px-2.5 text-[11px]"
                    >
                      {published ? <Check className="h-3 w-3" /> : publishing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                      {published ? "Published to Meta" : publishing ? "Publishing…" : "Publish to Meta"}
                    </button>
                    {render.result?.videoUrl && (
                      <a href={render.result.videoUrl} download className="btn-ghost h-8 px-2.5 text-[11px]">
                        <Download className="h-3 w-3" /> Download MP4
                      </a>
                    )}
                    <Link href={`/clients/${client?.slug}?tab=ads`} className="btn-quiet h-8 px-2.5 text-[11px]">
                      Client library <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                  <p className={cn("mt-2 text-[9.5px]", publishMsg ? "text-mint" : "text-faint")}>
                    {publishMsg || "Publish uses sandbox mode until Meta credentials are set in .env."}
                  </p>
                </div>
              </div>
            )}
          </Card>
        )}

        {recentAds.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[12px] font-semibold">Recent work</p>
              <Link href="/ads" className="text-[10.5px] text-faint hover:text-lime">
                All ads
              </Link>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar">
              {recentAds.map((ad) => (
                <div key={ad.id} className="w-[104px] shrink-0">
                  <AdFrame
                    hook={ad.hook}
                    brand={ad.client.name}
                    area={ad.client.emoji}
                    color={ad.client.brandColor}
                    video={ad.videoUrl}
                    poster={ad.posterUrl}
                    score={ad.hitScore}
                    small
                  />
                  <p className="mt-1 truncate text-[9.5px] text-faint">{ad.client.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
