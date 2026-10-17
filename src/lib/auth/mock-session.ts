import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { sessionSecret } from "../env";

/**
 * Mock-mode session: an HMAC-signed, httpOnly, browser-session cookie.
 * It represents a *simulated* verification — the UI says so everywhere.
 */
export const MOCK_COOKIE = "dibs_session";

export type MockSession = {
  userId: string;
  campusId: string;
  displayName: string;
  email: string | null;
  /** When the simulated verification happened. */
  verifiedAt: string;
};

const b64 = (s: string) => Buffer.from(s).toString("base64url");
const sign = (payload: string) => createHmac("sha256", sessionSecret).update(payload).digest("base64url");

export function encodeMockSession(s: MockSession): string {
  const payload = b64(JSON.stringify(s));
  return `${payload}.${sign(payload)}`;
}

export function decodeMockSession(raw: string | undefined): MockSession | null {
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as MockSession;
    return typeof s.userId === "string" && typeof s.campusId === "string" ? s : null;
  } catch {
    return null;
  }
}

export function mockUserIdForEmail(email: string) {
  return `usr_m_${createHmac("sha256", "dibs-mock-id").update(email.toLowerCase()).digest("hex").slice(0, 14)}`;
}
