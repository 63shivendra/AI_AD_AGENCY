import Link from "next/link";
import { Download, Film, Sparkles, Wand2 } from "lucide-react";
import { getAdLibrary } from "@/lib/data";
import { dateShort, scoreTone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AdFrame, Card, Empty, SectionHead, StatusPill } from "@/components/ui";
import { PresenterPicker } from "@/components/presenter-picker";
import { presenterAvailability } from "@/lib/env";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "reels", label: "Reels" },
  { key: "trend", label: "Trend" },
  { key: "ugc", label: "AI UGC" },
  { key: "drafts", label: "Drafts" },
  { key: "published", label: "Published" },
] as const;

export default async function AdLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter = "all" } = await searchParams;
  const ads = await getAdLibrary();

  const reels = ads.filter((a) => a.videoUrl);
  const trend = ads.filter((a) => a.format === "TREND");
  const ugc = ads.filter((a) => a.format === "UGC");
  const drafts = ads.filter((a) => a.status === "DRAFT");
  const published = ads.filter((a) => a.status === "PUBLISHED");

  const shown =
    filter === "reels"
      ? reels
      : filter === "trend"
        ? trend
        : filter === "ugc"
          ? ugc
          : filter === "drafts"
            ? drafts
            : filter === "published"
              ? published
              : ads;

  const counts: Record<string, number> = {
    all: ads.length,
    reels: reels.length,
    trend: trend.length,
    ugc: ugc.length,
    drafts: drafts.length,
    published: published.length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">Creative</p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Ad library</h1>
          <p className="mt-1 text-[12.5px] text-dim">
            Every generated concept and rendered reel — across all {new Set(ads.map((a) => a.clientId)).size} clients.
          </p>
        </div>
        <Link href="/studio" className="btn-primary h-8 px-3 text-[12px]">
          <Wand2 className="h-3.5 w-3.5" /> New ad
        </Link>
      </div>

      <div className="flex w-full overflow-x-auto rounded-xl border border-line bg-panel p-0.5 no-scrollbar sm:w-auto">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/ads" : `/ads?filter=${f.key}`}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[12px] font-semibold transition-colors",
              filter === f.key ? "bg-panel2 text-chalk" : "text-faint hover:text-dim"
            )}
          >
            {f.label}
            <span className="text-[10px] tabular-nums text-faint">{counts[f.key]}</span>
          </Link>
        ))}
      </div>

      <Card className="p-3.5">
        <SectionHead
          title="Generated ads"
          subtitle="Drafts are saved here as soon as you hit Generate. Render one in Studio to turn it into an MP4 reel."
          action={
            <span className="pill">
              <Film className="h-3 w-3" /> {reels.length} reels ready
            </span>
          }
        />
      </Card>

      {shown.length === 0 ? (
        <Empty
          title={filter === "drafts" ? "No drafts right now" : "Nothing here yet"}
          body="Open Ad Studio, pick a client and hit Generate — the concepts land in this library."
          action={
            <Link href="/studio" className="btn-primary mt-2 h-8 text-[11.5px]">
              Open studio
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {shown.map((ad) => {
            const script = JSON.parse(ad.script || "{}") as {
              angle?: string;
              presenterKind?: string;
              presenterMode?: string;
            };
            const presenter =
              script.presenterKind === "owner"
                ? "owner clip"
                : script.presenterKind === "avatar"
                  ? "AI avatar"
                  : "stock narrator";
            return (
              <Card key={ad.id} className="overflow-hidden p-2.5">
                <AdFrame
                  hook={ad.hook}
                  brand={ad.client.name}
                  area={ad.client.emoji}
                  color={ad.client.brandColor}
                  video={ad.videoUrl}
                  poster={ad.posterUrl}
                  score={ad.hitScore}
                />
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <StatusPill status={ad.status} />
                      {ad.format === "TREND" && (
                        <>
                          <span className="rounded-full border border-violet/25 bg-violet/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet">
                            trend
                          </span>
                          <span className="rounded-full border border-lime/25 bg-lime/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-lime">
                            pro edit
                          </span>
                        </>
                      )}
                    </div>
                    <span className={cn("text-[10.5px] font-bold", scoreTone(ad.hitScore))}>
                      CTR {ad.predictedCtr}%
                    </span>
                  </div>
                  <p className="line-clamp-2 text-[11.5px] font-semibold leading-snug">{ad.hook}</p>
                  <p className="truncate text-[10px] text-faint">
                    <Link href={`/clients/${ad.client.slug}?tab=ads`} className="hover:text-lime">
                      {ad.client.name}
                    </Link>
                    {" · "}
                    {script.angle ?? ad.platform} · {dateShort(ad.createdAt)}
                    {ad.format === "TREND" && ` · ${presenter}`}
                  </p>
                  <div className="flex items-center justify-between border-t border-line pt-1.5">
                    <span className="text-[10px] text-faint">
                      {ad.leads} leads · {ad.views.toLocaleString("en-IN")} views
                    </span>
                    {ad.videoUrl ? (
                      <a
                        href={ad.videoUrl}
                        download
                        className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-lime hover:underline"
                      >
                        <Download className="h-3 w-3" /> MP4
                      </a>
                    ) : (
                      <Link
                        href={`/studio?client=${ad.clientId}`}
                        className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-dim hover:text-lime"
                      >
                        <Sparkles className="h-3 w-3" /> Render
                      </Link>
                    )}
                  </div>
                  {ad.format === "TREND" && (
                    <PresenterPicker
                      adId={ad.id}
                      mode={script.presenterMode ?? "auto"}
                      resolved={presenter}
                      availability={presenterAvailability(ad.client.slug)}
                    />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
