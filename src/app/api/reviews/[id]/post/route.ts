import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const review = await db.review.update({
    where: { id },
    data: { status: "POSTED" },
    include: { client: true },
  });

  await db.event.create({
    data: {
      clientId: review.clientId,
      type: "REVIEW",
      title: "5-star review posted",
      detail: `${review.client.name} — review velocity +1`,
    },
  });

  return NextResponse.json({ ok: true });
}
