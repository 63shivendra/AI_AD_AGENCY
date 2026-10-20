import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, makeToken } from "@/lib/auth";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { passcode?: string };
  const expected = process.env.AGENCY_PASSCODE || "kanpur2026";

  if (!body.passcode || body.passcode !== expected) {
    return NextResponse.json({ error: "invalid passcode" }, { status: 401 });
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, makeToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
