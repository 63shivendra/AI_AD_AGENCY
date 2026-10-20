import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const VALID = ["NEW", "CONTACTED", "WON", "LOST"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { status?: string; value?: number } | null;
  if (!body?.status || !VALID.includes(body.status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const lead = await db.lead.update({
    where: { id },
    data: {
      status: body.status,
      ...(body.status === "WON" ? { value: body.value ?? 25000 } : {}),
    },
    include: { client: true },
  });

  if (body.status === "WON") {
    await db.event.create({
      data: {
        clientId: lead.clientId,
        type: "LEAD",
        title: "Lead marked WON",
        detail: `${lead.name} — ₹${(body.value ?? 25000).toLocaleString("en-IN")} booked`,
      },
    });
  }

  return NextResponse.json({ ok: true, lead });
}
