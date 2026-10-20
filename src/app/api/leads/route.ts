import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { waLink } from "@/lib/format";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    clientId?: string;
    name?: string;
    phone?: string;
    intent?: string;
  } | null;

  if (!body?.clientId || !body?.name || !body?.phone) {
    return NextResponse.json({ error: "clientId, name and phone are required" }, { status: 400 });
  }

  const phone = body.phone.replace(/\D/g, "").slice(-10);
  if (phone.length !== 10) {
    return NextResponse.json({ error: "Enter a valid 10-digit mobile number" }, { status: 400 });
  }

  const client = await db.client.findUnique({ where: { id: body.clientId } });
  if (!client) return NextResponse.json({ error: "client not found" }, { status: 404 });

  const lead = await db.lead.create({
    data: {
      clientId: client.id,
      name: body.name.trim().slice(0, 60),
      phone,
      intent: body.intent?.trim().slice(0, 120) || "WhatsApp enquiry",
      source: "WHATSAPP",
      status: "NEW",
    },
  });

  await db.event.create({
    data: {
      clientId: client.id,
      type: "LEAD",
      title: "New WhatsApp lead",
      detail: `${lead.name} — ${lead.intent}`,
    },
  });

  const waUrl = waLink(
    client.phone,
    `Namaste ${client.name}! Main ${lead.name} bol raha/rahi hoon. ${lead.intent ?? ""} — please details bhejiye.`
  );

  return NextResponse.json({ lead, waUrl });
}
