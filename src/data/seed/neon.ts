/**
 * Writes the deterministic demo seed into Neon. Shared by `pnpm db:seed` and
 * the /demo reset (only when DIBS_ALLOW_DEMO_RESET=1).
 * Without `reset`, every insert is ON CONFLICT DO NOTHING — real rows are never overwritten.
 */
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { CAMPUSES } from "../../config/campuses";
import * as s from "../schema";
import { buildSeed } from ".";

export async function seedNeon(databaseUrl: string, opts: { reset: boolean }) {
  const db = drizzle({ client: neon(databaseUrl), schema: s });
  if (opts.reset) {
    await db.execute(sql`truncate notifications, saves, dibs, bids, handoffs, community_members, community_posts, swap_requests, swap_cycles, bank_reservations, bank_items, email_codes, listings restart identity cascade`);
  }
  const data = buildSeed(new Date());

  await db
    .insert(s.campuses)
    .values(CAMPUSES.map((c) => ({ id: c.slug, name: c.name, shortName: c.shortName, emailDomains: [...c.emailDomains], timezone: c.timezone })))
    .onConflictDoUpdate({ target: s.campuses.id, set: { emailDomains: sql`excluded.email_domains`, name: sql`excluded.name` } });
  await db.insert(s.users).values(data.profiles.map((p) => ({ id: p.id, name: p.displayName }))).onConflictDoNothing();
  await db
    .insert(s.profiles)
    .values(data.profiles)
    .onConflictDoUpdate({ target: s.profiles.id, set: { campusId: sql`excluded.campus_id`, displayName: sql`excluded.display_name` } });
  await db
    .insert(s.listings)
    .values(data.listings.map(({ auction, ...l }) => ({ ...l, ...(auction ?? {}) })))
    .onConflictDoNothing();
  await db.insert(s.bids).values(data.bids).onConflictDoNothing();
  await db.insert(s.dibs).values(data.dibs).onConflictDoNothing();
  await db.insert(s.saves).values(data.saves).onConflictDoNothing();
  await db.insert(s.notifications).values(data.notifications).onConflictDoNothing();
  await db.insert(s.handoffs).values(data.handoffs).onConflictDoNothing();
  await db.insert(s.communityPosts).values(data.posts).onConflictDoNothing();
  await db.insert(s.communityMembers).values(data.members).onConflictDoNothing();
  await db.insert(s.swapRequests).values(data.swaps).onConflictDoNothing();
  await db.insert(s.swapCycles).values(data.cycles).onConflictDoNothing();
  await db.insert(s.bankItems).values(data.bankItems).onConflictDoNothing();
  return { listings: data.listings.length, bids: data.bids.length, posts: data.posts.length, swaps: data.swaps.length };
}
