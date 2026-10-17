import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }) }));

import { getCampus } from "@/config/campuses";
import { resetMockCodes } from "@/data/adapters/mock/auth";
import { sendCode, verifyCode } from "@/features/auth/otp";
import { decodeSession, encodeSession } from "@/lib/auth/session";

const ua = getCampus("ua")!;

beforeEach(() => resetMockCodes());

describe("email codes", () => {
  it("only accepts crimson.ua.edu for UA", () => {
    expect(ua.emailDomains).toEqual(["crimson.ua.edu"]);
  });

  it("verifies the right code once", async () => {
    const s = await sendCode(ua, "bama@crimson.ua.edu");
    if (!s.ok || s.delivery !== "screen") throw new Error("expected on-screen delivery without RESEND_API_KEY");
    expect(await verifyCode("bama@crimson.ua.edu", s.code)).toMatchObject({ ok: true, campusId: "ua" });
    expect((await verifyCode("bama@crimson.ua.edu", s.code)).ok).toBe(false);
  });

  it("locks out after 5 wrong tries", async () => {
    const s = await sendCode(ua, "x@crimson.ua.edu");
    if (!s.ok || s.delivery !== "screen") throw new Error("expected code");
    const wrong = s.code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) expect((await verifyCode("x@crimson.ua.edu", wrong)).ok).toBe(false);
    expect(await verifyCode("x@crimson.ua.edu", s.code)).toMatchObject({ ok: false, message: expect.stringContaining("Too many") });
  });

  it("rate-limits sends", async () => {
    for (let i = 0; i < 5; i++) expect((await sendCode(ua, "spam@crimson.ua.edu")).ok).toBe(true);
    expect((await sendCode(ua, "spam@crimson.ua.edu")).ok).toBe(false);
  });

  it("rejects tampered or expired sessions", () => {
    const raw = encodeSession({ userId: "u", campusId: "ua", displayName: "U", email: null, verifiedAt: "", method: "email", exp: Date.now() + 1000 });
    expect(decodeSession(raw)?.userId).toBe("u");
    const [payload, sig] = raw.split(".");
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url").toString()), userId: "admin" })).toString("base64url");
    expect(decodeSession(`${forged}.${sig}`)).toBeNull();
    expect(decodeSession(raw, Date.now() + 5000)).toBeNull();
  });
});
