import { db } from "@/lib/db";

const DAY = 86400000;
const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/** Local calendar day key. Using toISOString() here would shift IST leads into the previous day. */
export function dayKey(d: Date) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

export function daysAgo(n: number) {
  return startOfDay(new Date(Date.now() - n * DAY));
}

export function rangeStart(days: number) {
  return daysAgo(days - 1);
}

function sum<T extends object>(rows: T[], key: keyof T) {
  return rows.reduce((acc, row) => {
    const value = row[key];
    return acc + (typeof value === "number" ? value : 0);
  }, 0);
}

export type ClientRow = Awaited<ReturnType<typeof getClients>>[number];

export async function getClients() {
  const since = rangeStart(30);
  const [clients, metrics, leads, ads] = await Promise.all([
    db.client.findMany({
      include: { offers: { orderBy: { sort: "asc" } } },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    }),
    db.metricDaily.findMany({ where: { date: { gte: since } } }),
    db.lead.findMany({ where: { createdAt: { gte: since } }, select: { clientId: true, status: true, value: true } }),
    db.ad.findMany({ select: { id: true, clientId: true, status: true, leads: true, revenue: true } }),
  ]);

  return clients.map((c) => {
    const rows = metrics.filter((m) => m.clientId === c.id);
    const clientLeads = leads.filter((l) => l.clientId === c.id);
    const clientAds = ads.filter((a) => a.clientId === c.id);
    const spend = sum(rows, "spend");
    const won = clientLeads.filter((l) => l.status === "WON");
    const revenue = won.reduce((acc, l) => acc + l.value, 0);
    return {
      ...c,
      spend30: spend,
      revenue30: revenue,
      leads30: clientLeads.length,
      won30: won.length,
      wonValue30: revenue,
      roas: spend > 0 ? Number((revenue / spend).toFixed(1)) : 0,
      cpl: clientLeads.length ? Math.round(spend / clientLeads.length) : 0,
      liveAds: clientAds.filter((a) => a.status === "PUBLISHED").length,
      totalAds: clientAds.length,
    };
  });
}

export async function getOverview() {
  const since = rangeStart(30);
  const prevSince = daysAgo(59);
  const prevEnd = daysAgo(30);

  const [clients, metrics, prevMetrics, leads, prevLeads, ads, reviews, events, jobs, lastRenderJob, queue] =
    await Promise.all([
      getClients(),
      db.metricDaily.findMany({ where: { date: { gte: since } } }),
      db.metricDaily.findMany({ where: { date: { gte: prevSince, lt: prevEnd } } }),
      db.lead.findMany({ where: { createdAt: { gte: since } } }),
      db.lead.findMany({
        where: { createdAt: { gte: prevSince, lt: prevEnd } },
        select: { value: true, status: true },
      }),
      db.ad.findMany({
        include: { client: { select: { name: true, slug: true, emoji: true } } },
        orderBy: { createdAt: "desc" },
      }),
      db.review.count({ where: { status: "POSTED" } }),
      db.event.findMany({
        include: { client: { select: { name: true, emoji: true } } },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      db.job.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
      db.job.findFirst({
        where: { type: "RENDER", status: "DONE" },
        orderBy: { finishedAt: "desc" },
      }),
      db.job.count({ where: { status: { in: ["QUEUED", "RUNNING"] } } }),
    ]);

  const active = clients.filter((c) => c.status === "ACTIVE");
  const mrr = active.reduce((a, c) => a + c.monthlyFee, 0);
  const spend = sum(metrics, "spend");
  const won = leads.filter((l) => l.status === "WON");
  const revenue = won.reduce((a, l) => a + l.value, 0);
  const prevSpend = sum(prevMetrics, "spend");
  const prevRevenue = prevLeads
    .filter((l) => l.status === "WON")
    .reduce((a, l) => a + l.value, 0);
  const previousLeads = prevLeads.length;

  // 30-day series, bucketed by the local calendar day (not UTC).
  const series: { date: string; leads: number; spend: number; revenue: number }[] = [];
  const buckets = new Map<string, { leads: number; spend: number; revenue: number }>();
  for (let i = 29; i >= 0; i--) {
    const key = dayKey(daysAgo(i));
    buckets.set(key, { leads: 0, spend: 0, revenue: 0 });
    series.push({ date: key, leads: 0, spend: 0, revenue: 0 });
  }
  for (const m of metrics) {
    const bucket = buckets.get(dayKey(new Date(m.date)));
    if (bucket) bucket.spend += m.spend;
  }
  for (const l of leads) {
    const bucket = buckets.get(dayKey(new Date(l.createdAt)));
    if (!bucket) continue;
    bucket.leads += 1;
    if (l.status === "WON") bucket.revenue += l.value;
  }
  for (const point of series) {
    const bucket = buckets.get(point.date);
    if (!bucket) continue;
    point.leads = bucket.leads;
    point.spend = bucket.spend;
    point.revenue = bucket.revenue;
  }

  let lastRender: number | null = null;
  if (lastRenderJob?.result) {
    try {
      const parsed = JSON.parse(lastRenderJob.result) as { seconds?: number; ms?: number };
      if (typeof parsed.seconds === "number") lastRender = Math.round(parsed.seconds * 10) / 10;
      else if (typeof parsed.ms === "number") lastRender = Math.round(parsed.ms / 100) / 10;
    } catch {
      lastRender = null;
    }
  }

  const delta = (curr: number, prev: number) =>
    prev === 0 ? 0 : Math.round(((curr - prev) / prev) * 100);

  const fatigued = ads
    .filter((a) => a.status === "FATIGUED")
    .slice(0, 3)
    .map((a) => ({
      id: a.id,
      title: a.title,
      client: a.client,
      hitScore: a.hitScore,
      ctr: a.predictedCtr,
    }));

  return {
    clients,
    active,
    mrr,
    spend,
    revenue,
    roas: spend ? Number((revenue / spend).toFixed(1)) : 0,
    leads30: leads.length,
    won30: won.length,
    wonValue: won.reduce((a, l) => a + l.value, 0),
    cpl: leads.length ? Math.round(spend / leads.length) : 0,
    prev: {
      leads: previousLeads,
      spend: prevSpend,
      revenue: prevRevenue,
      cpl: previousLeads ? Math.round(prevSpend / previousLeads) : 0,
    },
    deltaLeads: delta(leads.length, previousLeads),
    deltaSpend: delta(spend, prevSpend),
    deltaRevenue: delta(revenue, prevRevenue),
    ads,
    liveAds: ads.filter((a) => a.status === "PUBLISHED").length,
    fatigued,
    reviews,
    events,
    jobs,
    lastRender,
    queue,
    series,
  };
}

export async function getClientDetail(slug: string) {
  const since = rangeStart(30);
  const client = await db.client.findUnique({
    where: { slug },
    include: {
      offers: { orderBy: { sort: "asc" } },
      ads: {
        orderBy: { createdAt: "desc" },
        include: { variants: { orderBy: { score: "desc" } } },
      },
      leads: { orderBy: { createdAt: "desc" }, take: 40 },
      reviews: { orderBy: { createdAt: "desc" }, take: 12 },
      metrics: { where: { date: { gte: since } }, orderBy: { date: "asc" } },
      jobs: { orderBy: { createdAt: "desc" }, take: 6 },
      events: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });
  if (!client) return null;

  const [leadRows, wonAgg] = await Promise.all([
    db.lead.findMany({
      where: { clientId: client.id, createdAt: { gte: since } },
      select: { createdAt: true, status: true, value: true },
    }),
    db.lead.aggregate({
      where: { clientId: client.id, createdAt: { gte: since }, status: "WON" },
      _sum: { value: true },
    }),
  ]);

  const spend = client.metrics.reduce((a, m) => a + m.spend, 0);
  const revenue = wonAgg._sum.value ?? 0;
  const won30 = leadRows.filter((l) => l.status === "WON").length;

  const buckets = new Map<string, { leads: number; revenue: number }>();
  for (const l of leadRows) {
    const key = dayKey(new Date(l.createdAt));
    const bucket = buckets.get(key) ?? { leads: 0, revenue: 0 };
    bucket.leads += 1;
    if (l.status === "WON") bucket.revenue += l.value;
    buckets.set(key, bucket);
  }

  const series = client.metrics.map((m) => {
    const key = dayKey(new Date(m.date));
    const bucket = buckets.get(key);
    return {
      date: key,
      leads: bucket?.leads ?? 0,
      spend: m.spend,
      revenue: bucket?.revenue ?? 0,
    };
  });

  return {
    ...client,
    spend30: spend,
    revenue30: revenue,
    leads30: leadRows.length,
    won30,
    wonValue30: revenue,
    series,
    roas: spend ? Number((revenue / spend).toFixed(1)) : 0,
    cpl: leadRows.length ? Math.round(spend / leadRows.length) : 0,
  };
}

export async function getStudioData() {
  const [clients, ads] = await Promise.all([
    db.client.findMany({
      where: { status: { in: ["ACTIVE", "PROSPECT"] } },
      include: { offers: { orderBy: { sort: "asc" } } },
      orderBy: { name: "asc" },
    }),
    db.ad.findMany({
      // Recent work means finished reels — draft concepts live in the client library.
      where: { videoUrl: { not: null } },
      include: { client: { select: { name: true, slug: true, emoji: true, brandColor: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);
  return { clients, ads };
}

export async function getAdLibrary() {
  return db.ad.findMany({
    include: {
      client: { select: { name: true, slug: true, emoji: true, brandColor: true, area: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 120,
  });
}

export async function getAllLeads() {
  return db.lead.findMany({
    include: { client: { select: { name: true, emoji: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    take: 120,
  });
}

export async function getBillingData() {
  const clients = await getClients();
  const since = rangeStart(30);
  const [metrics, won] = await Promise.all([
    db.metricDaily.findMany({ where: { date: { gte: since } } }),
    db.lead.aggregate({
      where: { createdAt: { gte: since }, status: "WON" },
      _sum: { value: true },
    }),
  ]);
  const spend = sum(metrics, "spend");
  const revenue = won._sum.value ?? 0;
  return { clients, spend, revenue };
}
