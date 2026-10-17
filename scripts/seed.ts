/**
 * Seeds Neon with the same deterministic demo data as mock mode.
 * Safe by default: every insert is ON CONFLICT DO NOTHING, so re-running never
 * overwrites real rows. Pass --reset to wipe marketplace tables first (asks no
 * questions — only use on a dev branch).
 *
 *   pnpm db:seed            # idempotent
 *   pnpm db:seed --reset    # wipe + reseed (dev branches only)
 */
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { CAMPUSES } from "../src/config/campuses";
import * as s from "../src/data/schema";
import { buildSeed } from "../src/data/seed";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Mock mode needs no seeding.");
  process.exit(1);
}
const db = drizzle({ client: neon(url), schema: s });

async function main() {
  if (process.argv.includes("--reset")) {
    console.log("Resetting marketplace tables…");
    await db.execute(sql`truncate notifications, saves, dibs, bids, listings restart identity cascade`);
  }
  const data = buildSeed(new Date());

  await db
    .insert(s.campuses)
    .values(CAMPUSES.map((c) => ({ id: c.slug, name: c.name, shortName: c.shortName, emailDomains: [...c.emailDomains], timezone: c.timezone })))
    .onConflictDoNothing();
  await db.insert(s.users).values(data.profiles.map((p) => ({ id: p.id, name: p.displayName }))).onConflictDoNothing();
  await db.insert(s.profiles).values(data.profiles).onConflictDoNothing();
  await db
    .insert(s.listings)
    .values(
      data.listings.map(({ auction, ...l }) => ({
        ...l,
        ...(auction ?? {}),
      })),
    )
    .onConflictDoNothing();
  await db.insert(s.bids).values(data.bids).onConflictDoNothing();
  await db.insert(s.dibs).values(data.dibs).onConflictDoNothing();
  await db.insert(s.saves).values(data.saves).onConflictDoNothing();
  await db.insert(s.notifications).values(data.notifications).onConflictDoNothing();
  console.log(`Seeded ${data.listings.length} listings, ${data.bids.length} bids, ${data.profiles.length} profiles.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
