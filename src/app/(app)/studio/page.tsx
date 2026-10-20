import { getStudioData } from "@/lib/data";
import { Studio } from "@/components/studio";

export const dynamic = "force-dynamic";

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; brief?: string }>;
}) {
  const sp = await searchParams;
  const { clients, ads } = await getStudioData();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">Creative</p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Ad Studio</h1>
          <p className="mt-1 text-[12.5px] text-dim">
            Hinglish hooks → scored variants → a real 1080p MP4.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10.5px] text-faint">
          <span className="pill">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-lime" /> engine warm
          </span>
          <span className="pill">queue 0</span>
        </div>
      </div>

      <Studio
        clients={clients.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          emoji: c.emoji,
          niche: c.niche,
          area: c.area,
          brandColor: c.brandColor,
          monthlyFee: c.monthlyFee,
          status: c.status,
          offers: c.offers.map((o) => ({
            id: o.id,
            title: o.title,
            price: o.price,
            description: o.description,
          })),
        }))}
        recentAds={ads.map((a) => ({
          id: a.id,
          hook: a.hook,
          status: a.status,
          hitScore: a.hitScore,
          videoUrl: a.videoUrl,
          posterUrl: a.posterUrl,
          createdAt: a.createdAt.toISOString(),
          client: a.client,
        }))}
        initialClientId={sp.client}
        initialBrief={sp.brief}
      />
    </div>
  );
}
