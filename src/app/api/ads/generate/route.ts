import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateConcepts } from "@/lib/ai";

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    clientId?: string;
    brief?: string;
    count?: number;
  } | null;

  if (!body?.clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  const client = await db.client.findUnique({
    where: { id: body.clientId },
    include: { offers: { orderBy: { sort: "asc" } } },
  });
  if (!client) return NextResponse.json({ error: "client not found" }, { status: 404 });

  const { concepts, engine } = await generateConcepts(
    {
      name: client.name,
      niche: client.niche,
      area: client.area,
      city: client.city,
      phone: client.phone,
      brandColor: client.brandColor,
      notes: client.notes,
      proof: client.proof,
      offers: client.offers.map((o) => ({
        title: o.title,
        description: o.description,
        price: o.price,
        isPrimary: o.isPrimary,
      })),
    },
    body.brief?.trim() ?? "",
    Math.min(Math.max(body.count ?? 4, 1), 6)
  );

  const createdAt = new Date();
  const saved: { id: string; hook: string }[] = [];

  for (const [i, concept] of concepts.entries()) {
    const ad = await db.ad.create({
      data: {
        clientId: client.id,
        title: concept.title,
        hook: concept.hook,
        script: JSON.stringify({
          angle: concept.angle,
          scenes: concept.scenes,
          rationale: concept.rationale,
          factors: concept.factors,
        }),
        platform: concept.platform,
        status: "DRAFT",
        hitScore: concept.score,
        predictedCtr: concept.predictedCtr,
        predictedRoas: concept.predictedRoas,
        durationSec: 12,
        createdAt: new Date(createdAt.getTime() + i * 1000),
        variants: {
          create: concepts.slice(0, 3).map((c, idx) => ({
            label: `Hook ${String.fromCharCode(65 + idx)} — ${c.angle.toLowerCase()}`,
            hookText: c.hook,
            cta: c.cta,
            score: c.score,
            isWinner: idx === i % 3,
          })),
        },
      },
    });
    saved.push({ id: ad.id, hook: ad.hook });
  }

  await db.event.create({
    data: {
      clientId: client.id,
      type: "AD",
      title: `${concepts.length} concepts generated`,
      detail: `${client.name} — ${concepts[0]?.angle ?? "mixed"} angles via ${engine}`,
    },
  });

  return NextResponse.json({ concepts, saved, engine });
}
