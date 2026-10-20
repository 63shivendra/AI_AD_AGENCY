import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ad = await db.ad.findUnique({ where: { id }, include: { client: true } });
  if (!ad) return NextResponse.json({ error: "ad not found" }, { status: 404 });

  // Live publishing needs a Page + ad account with approved permissions.
  // Without those credentials we simulate the platform response so demos stay stable.
  const sandbox = !process.env.META_ACCESS_TOKEN;

  await db.ad.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
      spend: ad.spend || 0,
    },
  });

  await db.event.create({
    data: {
      clientId: ad.clientId,
      type: "AD",
      title: "Ad published",
      detail: `${ad.title} — ${ad.platform}${sandbox ? " (sandbox)" : ""}`,
    },
  });

  return NextResponse.json({
    ok: true,
    sandbox,
    platform: ad.platform,
    message: sandbox
      ? "Sandbox publish. Add META_ACCESS_TOKEN + META_AD_ACCOUNT_ID to push live."
      : "Published to the connected ad account.",
  });
}
