import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

const COLORS = ["#C8F751", "#4FD1C5", "#F472B6", "#A78BFA", "#F59E0B", "#60A5FA", "#FB7185", "#34D399"];
const EMOJI: Record<string, string> = {
  dental: "🦷",
  bridal: "👰",
  coaching: "🎯",
  leather: "🧳",
  jeweller: "💎",
  banquet: "🎪",
  cnc: "⚙️",
  ivf: "👶",
  sweets: "🍬",
};

export async function GET() {
  const clients = await db.client.findMany({
    include: { offers: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ clients });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    niche?: string;
    area?: string;
    phone?: string;
    address?: string;
    contactName?: string;
    monthlyFee?: number;
    offerTitle?: string;
  } | null;

  if (!body?.name || !body?.phone) {
    return NextResponse.json({ error: "name and phone are required" }, { status: 400 });
  }

  const niche = body.niche?.trim() || "Local Business";
  const base = slugify(body.name);
  let slug = base;
  let n = 2;
  while (await db.client.findUnique({ where: { slug } })) slug = `${base}-${n++}`;

  const key = Object.keys(EMOJI).find((k) => niche.toLowerCase().includes(k));
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];

  const client = await db.client.create({
    data: {
      slug,
      name: body.name.trim(),
      niche,
      area: body.area?.trim() || "Kanpur",
      phone: body.phone.replace(/\D/g, "").slice(-10),
      address: body.address?.trim() || "Kanpur, Uttar Pradesh",
      contactName: body.contactName?.trim() || null,
      emoji: key ? EMOJI[key] : "🏪",
      brandColor: color,
      monthlyFee: body.monthlyFee ?? 9999,
      status: "ACTIVE",
      health: 70,
      offers: {
        create: [
          {
            title: body.offerTitle?.trim() || "Aaj ka special offer",
            description: "Replace this with the client's real offer and price.",
            price: "₹0",
            isPrimary: true,
            sort: 0,
          },
        ],
      },
    },
    include: { offers: true },
  });

  await db.event.create({
    data: {
      clientId: client.id,
      type: "SYSTEM",
      title: "New client onboarded",
      detail: `${client.name} — ${niche}, ${client.area}`,
    },
  });

  return NextResponse.json({ client });
}
