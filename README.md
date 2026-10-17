# dibs! — see it. want it. call dibs.

A campus-verified student marketplace built around the semester cycle. Students moving out sell, auction or give away dorm gear; students moving in call dibs or bid — then the same verified community splits subscriptions, shares rides, trades home-cooked food and swaps class sections. Built for HackBama at The University of Alabama.

**Judges: open [`/demo`](http://localhost:3000/demo)** — a guided, 16-stop tour of every feature in about 4½ minutes, with a spotlight on each part and a timer against a 5-minute budget.

## What's in it

| Area | What it does |
| --- | --- |
| Marketplace | Fixed price, **auctions** (increments, reserve, buy-now, idempotent settlement) and **free** items. Call dibs → 24h hold with the DIBS! stamp. Search/filter/sort in the URL, saves, real photos. |
| Handoffs (`/ua/x/handoffs`) | Every dibs and auction win becomes a handoff. Schedule it during **move-out**, or — if the seller can hold it — at **move-in**. Payment happens in any app; buyer marks *sent*, seller marks *received*, seller marks *handed off*. |
| Swipe (`/ua/x/swipe`) | Tinder-style discovery of random dorm stuff; right = save. |
| Split subs (`/ua/x/subs`) | Fill open seats on family plans; even split including the organizer; payment acknowledged both ways. |
| Rides & trips (`/ua/x/rides`) | Carpools at move-out and split-cost break trips; seats can't be oversold. |
| Meal share (`/ua/x/meals`) | Off-campus meal plan: cooks post bulk batches, others claim portions for cash or a trade. |
| Class swap (`/ua/x/class-swap`) | Finds 2-, 3- and 4-way section-swap loops (x wants y, y wants z, z wants x) and coordinates the drop/add. |
| Multi-campus | `/ua` (UA crimson) and `/riverbend` (fictional) from one config file; cross-campus is view-only by policy. |

**Payments:** Dibs never moves money. People pay in Venmo, Zelle, Cash App, Apple Pay, PayPal or cash; Dibs only records that the payer sent it and the payee received it.

## Quick start (no credentials needed)

```bash
pnpm install
pnpm dev
```

With no environment variables the app runs in **demo mode**: deterministic in-memory seed, sign-in codes shown on screen, a yellow banner with **Reset** and a link to the guided tour.

## Sign-in: campus email codes

UA accepts **@crimson.ua.edu** only (configured per campus in `src/config/campuses.ts`). The server checks the domain, generates a 6-digit code with `crypto.randomInt`, stores only an HMAC of it, and enforces a 10-minute expiry, 5 attempts per code and 5 sends per 15 minutes. Verifying the code mints an HMAC-signed, httpOnly session cookie. All mutations resolve identity server-side; client-supplied ids are never trusted.

- With `RESEND_API_KEY` set, codes are emailed and sessions are marked **verified**.
- Without it, the code is shown on screen (clearly labelled) and sessions are marked **simulated**.
- "Continue as demo student" signs in as the seeded UA student (also labelled simulated).

> Resend's shared `onboarding@resend.dev` sender only delivers to your own Resend account email. To email real `@crimson.ua.edu` inboxes, verify a sending domain in Resend and set `EMAIL_FROM`.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm lint` · `pnpm typecheck` | ESLint · route typegen + `tsc` |
| `pnpm test` | Vitest: auction/dibs/handoff rules, swap-cycle search, seat limits under concurrency, email-code auth, tenant policy |
| `pnpm test:e2e` | (stop `pnpm dev` first) Playwright on port 3100 with forced mock data: dibs, bidding + settlement, create listing, email codes, handoffs, class swap, full guided tour, cross-campus view-only, no overflow at 375/768/1280/1536/landscape |
| `pnpm db:generate` · `pnpm db:migrate` · `pnpm db:seed` | Drizzle migrations and seed for Neon |

## Environment variables

Put these in `.env.local` (and in Vercel project settings). All are optional.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon **pooled** connection string. Turns on the Neon adapter. |
| `DATABASE_URL_UNPOOLED` | Direct Neon URL for `drizzle-kit` migrations (optional). |
| `AUTH_SECRET` | Signs session cookies and code hashes. **Set this in production** (`openssl rand -base64 32`). |
| `RESEND_API_KEY`, `EMAIL_FROM` | Email delivery for sign-in codes. Without a key, codes appear on screen. |
| `DIBS_ALLOW_DEMO_RESET=1` | Lets `/demo` and the banner **wipe and reseed a Neon database**, and enables "end auction now". Only for a dedicated demo database. |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob for uploaded listing photos. Without it, uploads stay in memory (demo). |
| `GEMINI_API_KEY` | Turns on **photo → 3D model (AR)** for sellers (Google AI Studio key, server-side only). Without it the sell form hides the 3D step; seeded demo listings still have AR. |
| `GEMINI_MODELS` | Optional comma-separated fallback chain, best first (default `gemini-3.5-flash,gemini-3-flash-preview,gemini-3.5-flash-lite,gemini-3.1-flash-lite`). |
| `CRON_SECRET` | Protects `/api/cron/maintenance`. |
| `NEXT_PUBLIC_SITE_URL` | Absolute URL for metadata. |
| `DIBS_FORCE_MOCK=1` | Force the in-memory adapter even if `DATABASE_URL` is set. |

## Neon

Fastest path, with the [Neon CLI](https://neon.com/docs/reference/neon-cli) (`npm i -g neon`, then `neon auth` once):

```bash
neon init -y --project-name dibs --no-agent-setup --no-config --package-manager pnpm
pnpm db:migrate
pnpm db:seed
```

`neon init` creates (or links, with `--project-id`) a project, writes `DATABASE_URL`, `DATABASE_URL_UNPOOLED` and `NEON_BRANCH` into `.env.local`, and pins it in `.neon` (gitignored). Restart `pnpm dev`. `pnpm db:seed` is idempotent; `pnpm db:seed --reset` wipes marketplace and community tables first (dev branches only).

Design notes: reads use Neon's HTTP driver; atomic operations (bid, buy-now, dibs, handoff acks, joining a ride/sub/meal, swap matching) open a short-lived WebSocket `Pool`, run one transaction with `SELECT … FOR UPDATE` (or a per-course advisory lock for swaps), and close it. Postgres also enforces one active dib and one pending handoff per listing, one active membership per post, bid idempotency, and tenant consistency via composite `(id, campus_id)` foreign keys.

> Verified against a live Neon project: migrations, seed, dibs, bidding, email-code sign-in, handoff payment acknowledgement and the 3-way class swap through the UI; plus scripted races (concurrent bids, three-way dibs, buy-now) and cross-campus/non-seller write rejection.

## Auction settlement on Vercel

No long-running process. Settlement and dib expiry are an idempotent `runMaintenance()` that runs **lazily** on reads (throttled per instance) and before every bid/dibs/buy-now, and **on a schedule** via `vercel.json` → `GET /api/cron/maintenance` with `Authorization: Bearer $CRON_SECRET` (daily on Hobby; use `* * * * *` on Pro).

## Deploy to Vercel

1. Import the repo (framework is pinned to Next.js in `vercel.json`).
2. Add env vars. For a judge demo: `DATABASE_URL`, `AUTH_SECRET`, and `DIBS_ALLOW_DEMO_RESET=1` on a dedicated demo database.
3. Deploy. Without `DATABASE_URL`, each serverless instance has its own in-memory store — use Neon for a shared demo.

## Adding a campus

Add one entry to `src/config/campuses.ts` (slug, names, email domains, theme tokens, timezone, dates, pickup spots, cross-campus policy). Optionally add seed data in `src/data/seed`. Routing, theming, sign-in domains and the campus picker pick it up automatically.

Photos: Unsplash License — see [public/photos/CREDITS.md](public/photos/CREDITS.md). See [CLAUDE.md](CLAUDE.md) for structure and the two-developer workflow.
