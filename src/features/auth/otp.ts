import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import type { CampusConfig } from "@/config/campuses";
import { getAuthStore } from "@/data";
import { emailDelivery, env, sessionSecret } from "@/lib/env";

/** Email one-time codes: 6 digits, 10-minute expiry, 5 attempts, 5 sends per 15 minutes. */
export const CODE_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;
const MAX_SENDS = 5;

const hashCode = (email: string, code: string) =>
  createHmac("sha256", sessionSecret).update(`${email.toLowerCase()}:${code}`).digest("hex");

export type SendResult =
  | { ok: true; delivery: "email" }
  | { ok: true; delivery: "screen"; code: string }
  | { ok: false; message: string };

export async function sendCode(campus: CampusConfig, email: string): Promise<SendResult> {
  const store = getAuthStore();
  if ((await store.countCodesSince(email, new Date(Date.now() - 15 * 60_000))) >= MAX_SENDS) {
    return { ok: false, message: "Too many codes requested. Try again in 15 minutes." };
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await store.createCode({
    email,
    campusId: campus.slug,
    codeHash: hashCode(email, code),
    expiresAt: new Date(Date.now() + CODE_TTL_MIN * 60_000),
  });
  if (emailDelivery === "screen") return { ok: true, delivery: "screen", code };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.emailFrom,
      to: [email],
      subject: `${code} is your Dibs code`,
      text: `Your Dibs ${campus.shortName} sign-in code is ${code}. It expires in ${CODE_TTL_MIN} minutes.\n\nIf you didn't ask for this, ignore this email.`,
      html: `<div style="font-family:system-ui,sans-serif;font-size:16px"><p>Your Dibs ${campus.shortName} sign-in code:</p><p style="font-size:32px;font-weight:800;letter-spacing:6px">${code}</p><p style="color:#666">Expires in ${CODE_TTL_MIN} minutes. If you didn't ask for this, ignore this email.</p></div>`,
    }),
  });
  if (!res.ok) {
    console.error("[dibs] resend failed", res.status, await res.text().catch(() => ""));
    return { ok: false, message: "We couldn't send the email. Try again in a minute." };
  }
  return { ok: true, delivery: "email" };
}

export type VerifyResult = { ok: true; campusId: string } | { ok: false; message: string };

export async function verifyCode(email: string, code: string): Promise<VerifyResult> {
  const store = getAuthStore();
  const row = await store.latestCode(email);
  if (!row) return { ok: false, message: "Request a new code first." };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, message: "That code expired. Send a new one." };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, message: "Too many wrong tries. Send a new code." };
  const expected = Buffer.from(row.codeHash);
  const given = Buffer.from(hashCode(email, code));
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    await store.bumpAttempts(row.id);
    const left = MAX_ATTEMPTS - row.attempts - 1;
    return { ok: false, message: left > 0 ? `Wrong code. ${left} ${left === 1 ? "try" : "tries"} left.` : "Wrong code. Send a new one." };
  }
  if (!(await store.consume(row.id))) return { ok: false, message: "That code was already used." };
  return { ok: true, campusId: row.campusId };
}
