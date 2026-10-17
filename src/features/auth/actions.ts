"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCampus, matchEmailDomain } from "@/config/campuses";
import { getAuthStore, getRepo } from "@/data";
import { DEMO_STUDENT_ID } from "@/data/seed";
import { clearSession, setSession } from "@/lib/auth/session";
import { emailDelivery } from "@/lib/env";
import { sendCode, verifyCode } from "./otp";

const safeNext = (campus: string, next: unknown) =>
  typeof next === "string" && next.startsWith(`/${campus}`) && !next.startsWith("//") ? next : `/${campus}`;

/** Seeded demo student — labelled "simulated" everywhere in the UI. */
export async function signInAsDemoStudent(formData: FormData) {
  const campus = getCampus(String(formData.get("campus") ?? ""));
  if (!campus) throw new Error("Unknown campus");
  const userId = DEMO_STUDENT_ID[campus.slug] ?? `usr_${campus.slug}_demo`;
  const existing = await getRepo().getProfile(userId);
  await setSession(
    { userId, campusId: campus.slug, displayName: existing?.displayName ?? "Demo Student", email: null, verifiedAt: new Date().toISOString(), method: "demo" },
    1,
  );
  redirect(safeNext(campus.slug, formData.get("next")));
}

export type CodeState =
  | { step: "email"; error?: string; email?: string }
  | { step: "code"; email: string; name: string; delivery: "email" | "screen"; screenCode?: string; error?: string };

const emailSchema = z.email("Enter a valid email").transform((e) => e.trim().toLowerCase());

/** Step 1: validate the campus domain on the server, then send (or show) a code. */
export async function requestCodeAction(_prev: CodeState, formData: FormData): Promise<CodeState> {
  const campus = getCampus(String(formData.get("campus") ?? ""));
  if (!campus) return { step: "email", error: "Unknown campus." };
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { step: "email", error: parsed.error.issues[0]?.message };
  const email = parsed.data;
  if (!matchEmailDomain(campus, email)) {
    return {
      step: "email",
      email,
      error: `${campus.shortName} accepts ${campus.emailDomains.map((d) => "@" + d).join(" or ")} addresses only.`,
    };
  }
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  const r = await sendCode(campus, email);
  if (!r.ok) return { step: "email", email, error: r.message };
  return { step: "code", email, name, delivery: r.delivery, screenCode: r.delivery === "screen" ? r.code : undefined };
}

/** Step 2: check the code, then mint the session. */
export async function verifyCodeAction(prev: CodeState, formData: FormData): Promise<CodeState> {
  if (prev.step !== "code") return prev;
  const campus = getCampus(String(formData.get("campus") ?? ""));
  if (!campus) return { ...prev, error: "Unknown campus." };
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (code.length !== 6) return { ...prev, error: "Enter the 6-digit code." };
  const r = await verifyCode(prev.email, code);
  if (!r.ok) return { ...prev, error: r.message };
  if (r.campusId !== campus.slug) return { ...prev, error: "That code was issued for another campus." };

  const verifiedAt = new Date();
  const user = await getAuthStore().ensureUser({
    email: prev.email,
    campusId: campus.slug,
    displayName: prev.name || prev.email.split("@")[0],
    verifiedAt,
  });
  await setSession({
    userId: user.id,
    campusId: campus.slug,
    displayName: user.displayName,
    email: prev.email,
    verifiedAt: verifiedAt.toISOString(),
    method: emailDelivery === "email" ? "email" : "screen",
  });
  redirect(safeNext(campus.slug, formData.get("next")));
}

export async function signOutAction(formData: FormData) {
  const campus = getCampus(String(formData.get("campus") ?? ""));
  await clearSession();
  redirect(campus ? `/${campus.slug}` : "/");
}
