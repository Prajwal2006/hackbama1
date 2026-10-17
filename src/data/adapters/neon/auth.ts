import { neon } from "@neondatabase/serverless";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { randomUUID } from "node:crypto";
import type { AuthStore, EmailCode } from "../../auth-store";
import * as schema from "../../schema";
import { userIdForEmail } from "../mock/auth";

export function createNeonAuthStore(databaseUrl: string): AuthStore {
  const db = drizzle({ client: neon(databaseUrl), schema });
  const { emailCodes, users, profiles } = schema;
  return {
    async createCode(row) {
      const [c] = await db.insert(emailCodes).values({ id: randomUUID(), ...row }).returning();
      return c as EmailCode;
    },
    async latestCode(email) {
      const [c] = await db
        .select()
        .from(emailCodes)
        .where(and(eq(emailCodes.email, email), isNull(emailCodes.consumedAt)))
        .orderBy(desc(emailCodes.createdAt))
        .limit(1);
      return (c as EmailCode | undefined) ?? null;
    },
    async countCodesSince(email, since) {
      const [{ n }] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(emailCodes)
        .where(and(eq(emailCodes.email, email), gte(emailCodes.createdAt, since)));
      return Number(n);
    },
    async bumpAttempts(id) {
      await db.update(emailCodes).set({ attempts: sql`${emailCodes.attempts} + 1` }).where(eq(emailCodes.id, id));
    },
    async consume(id) {
      const rows = await db
        .update(emailCodes)
        .set({ consumedAt: new Date() })
        .where(and(eq(emailCodes.id, id), isNull(emailCodes.consumedAt)))
        .returning({ id: emailCodes.id });
      return rows.length === 1;
    },
    async ensureUser({ email, campusId, displayName, verifiedAt }) {
      const id = userIdForEmail(email);
      await db.insert(users).values({ id, email, name: displayName }).onConflictDoNothing();
      const [p] = await db
        .insert(profiles)
        .values({ id, campusId, email, displayName, verifiedAt })
        .onConflictDoUpdate({ target: profiles.id, set: { verifiedAt, updatedAt: new Date() } })
        .returning({ id: profiles.id, displayName: profiles.displayName });
      return p;
    },
  };
}
