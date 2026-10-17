/**
 * Seeds Neon with the same deterministic demo data as mock mode.
 *   pnpm db:seed            # idempotent, never overwrites real rows
 *   pnpm db:seed --reset    # wipe marketplace + community tables first (dev branches only)
 */
import { seedNeon } from "../src/data/seed/neon";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Mock mode needs no seeding.");
  process.exit(1);
}

seedNeon(url, { reset: process.argv.includes("--reset") })
  .then((r) => console.log(`Seeded ${r.listings} listings, ${r.bids} bids, ${r.posts} community posts, ${r.swaps} swap requests.`))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
