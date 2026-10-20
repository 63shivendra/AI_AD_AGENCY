import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "ge_session";

const secret = () => process.env.AGENCY_PASSCODE || "kanpur2026";

function sign(value: string) {
  return createHmac("sha256", `ge::${secret()}`).update(value).digest("hex");
}

export function makeToken() {
  const issued = String(Date.now());
  return `${issued}.${sign(issued)}`;
}

export function verifyToken(token?: string | null) {
  if (!token) return false;
  const [issued, sig] = token.split(".");
  if (!issued || !sig) return false;
  const expected = sign(issued);
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  } catch {
    return false;
  }
  // 30 day session
  return Date.now() - Number(issued) < 1000 * 60 * 60 * 24 * 30;
}

export async function isAuthed() {
  const jar = await cookies();
  return verifyToken(jar.get(COOKIE)?.value);
}

export const SESSION_COOKIE = COOKIE;
