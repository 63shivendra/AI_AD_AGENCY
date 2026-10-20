import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateReview } from "@/lib/ai";

export const maxDuration = 40;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    clientId?: string;
    customer?: string;
    tags?: string[];
  } | null;

  if (!body?.clientId || !body?.tags?.length) {
    return NextResponse.json({ error: "clientId and tags are required" }, { status: 400 });
  }

  const client = await db.client.findUnique({
    where: { id: body.clientId },
    include: { offers: { orderBy: { sort: "asc" } } },
  });
  if (!client) return NextResponse.json({ error: "client not found" }, { status: 404 });

  const { text, engine } = await generateReview({
    client: {
      name: client.name,
      niche: client.niche,
      area: client.area,
      city: client.city,
      phone: client.phone,
      offers: client.offers.map((o) => ({ title: o.title, description: o.description, price: o.price })),
    },
    customer: body.customer?.trim() || "Customer",
    tags: body.tags.slice(0, 4),
  });

  const review = await db.review.create({
    data: {
      clientId: client.id,
      customer: body.customer?.trim() || "Walk-in customer",
      rating: 5,
      tags: JSON.stringify(body.tags),
      text,
      status: "GENERATED",
    },
  });

  await db.event.create({
    data: {
      clientId: client.id,
      type: "REVIEW",
      title: "AI review generated",
      detail: `${client.name} — ${body.tags.slice(0, 2).join(", ")}`,
    },
  });

  return NextResponse.json({ id: review.id, text, engine });
}
