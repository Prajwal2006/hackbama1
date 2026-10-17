import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { sessionSecret } from "../env";

/**
 * Stateless session: an HMAC-signed, httpOnly cookie. Only the server can mint
 * one, after a code check (or the labelled demo sign-in).
 */
export const SESSION_COOKIE = "dibs_session";

export type Session = {
  userId: string;
  campusId: string;
  displayName: string;
  email: string | null;
  verifiedAt: string;
  /** "email" = code delivered to the inbox; "screen" = code shown on screen; "demo" = seeded student. */
  method: "email" | "screen" | "demo";
  /** Unix ms expiry. */
  exp: number;
};

const sign = (payload: string) => createHmac("sha256", sessionSecret).update(payload).digest("base64url");

export function encodeSession(s: Session): string {
  const payload = Buffer.from(JSON.stringify(s)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(raw: string | undefined, now = Date.now()): Session | null {
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    if (typeof s.userId !== "string" || typeof s.campusId !== "string" || !(s.exp > now)) return null;
    return s;
  } catch {
    return null;
  }
}

export async function setSession(s: Omit<Session, "exp">, days = 30) {
  const exp = Date.now() + days * 86_400_000;
  (await cookies()).set(SESSION_COOKIE, encodeSession({ ...s, exp }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(exp),
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
