"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCampus, matchEmailDomain } from "@/config/campuses";
import { getRepo } from "@/data";
import { DEMO_STUDENT_ID } from "@/data/seed";
import { encodeMockSession, MOCK_COOKIE, mockUserIdForEmail, type MockSession } from "@/lib/auth/mock-session";
import { authMode } from "@/lib/env";

export type SignInState = { error?: string; sent?: boolean; simulated?: boolean } | undefined;

async function setMockSession(s: MockSession) {
  const jar = await cookies();
  // No maxAge → lives for the browser session.
  jar.set(MOCK_COOKIE, encodeMockSession(s), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

const safeNext = (campus: string, next: unknown) =>
  typeof next === "string" && next.startsWith(`/${campus}`) && !next.startsWith("//") ? next : `/${campus}`;

/** Mock mode only: sign in as the seeded demo student for a campus. */
export async function signInAsDemoStudent(formData: FormData) {
  const campus = getCampus(String(formData.get("campus") ?? ""));
  if (!campus) throw new Error("Unknown campus");
  if (authMode !== "mock") throw new Error("Demo sign-in is disabled when real auth is configured.");
  const userId = DEMO_STUDENT_ID[campus.slug] ?? `usr_${campus.slug}_demo`;
  const existing = await getRepo().getProfile(userId);
  await setMockSession({
    userId,
    campusId: campus.slug,
    displayName: existing?.displayName ?? "Demo Student",
    email: null,
    verifiedAt: new Date().toISOString(),
  });
  redirect(safeNext(campus.slug, formData.get("next")));
}

const emailForm = z.object({
  campus: z.string(),
  email: z.email("Enter a valid email").transform((e) => e.trim().toLowerCase()),
  name: z.string().trim().max(40).optional(),
  next: z.string().optional(),
});

/**
 * Campus-email sign-in. The domain is validated against the selected campus on
 * the server *before* any link is sent.
 */
export async function signInWithCampusEmail(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = emailForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const campus = getCampus(parsed.data.campus);
  if (!campus) return { error: "Unknown campus." };
  const { email } = parsed.data;
  if (!matchEmailDomain(campus, email)) {
    return {
      error: `${campus.shortName} accepts ${campus.emailDomains.map((d) => "@" + d).join(" or ")} addresses only.`,
    };
  }

  if (authMode === "authjs") {
    const { signIn } = await import("@/auth");
    await signIn("resend", { email, redirectTo: safeNext(campus.slug, parsed.data.next), redirect: false });
    return { sent: true };
  }

  // Mock: simulate the inbox click. This is NOT proof of identity, and the UI says so.
  const name = parsed.data.name || email.split("@")[0];
  const userId = mockUserIdForEmail(email);
  const verifiedAt = new Date();
  await getRepo().upsertProfile({ id: userId, campusId: campus.slug, displayName: name, email, verifiedAt });
  await setMockSession({ userId, campusId: campus.slug, displayName: name, email, verifiedAt: verifiedAt.toISOString() });
  redirect(safeNext(campus.slug, parsed.data.next));
}

export async function signOutAction(formData: FormData) {
  const campus = getCampus(String(formData.get("campus") ?? ""));
  if (authMode === "authjs") {
    const { signOut } = await import("@/auth");
    await signOut({ redirectTo: campus ? `/${campus.slug}` : "/" });
    return;
  }
  (await cookies()).delete(MOCK_COOKIE);
  redirect(campus ? `/${campus.slug}` : "/");
}
