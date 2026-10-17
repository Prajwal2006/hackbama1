# dibs! — see it. want it. call dibs.

A campus-verified, multi-campus marketplace for move-out season. Students sell, auction, or give away dorm gear; incoming students call dibs (24-hour hold) or bid. Built for HackBama.

- **Fixed price** → call dibs → 24h reservation → meet at a campus spot → seller confirms handoff.
- **Auction** → server-validated bids, minimum increments, reserve, buy-now, idempotent settlement.
- **Free** → one-tap claim, same reservation flow.
- **Multi-campus** → `/ua` (University of Alabama) and `/demo` (fictional Riverbend State) from one config file.

## Quick start (no credentials needed)

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000. With no environment variables the app runs in **demo mode**:

- In-memory, deterministic seed (30 listings, live/ending/closed auctions, bids, saves, a reservation).
- "Continue as demo student" on any campus sign-in page. Email sign-in checks the domain on the server but does **not** send mail — the UI labels this as simulated.
- A yellow banner shows demo mode; **Reset** reseeds everything.
- Live auctions have a **Demo: end auction now** button that runs the real settlement code.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm lint` · `pnpm typecheck` | ESLint · route typegen + `tsc` |
| `pnpm test` | Vitest: auction/dibs rules, money, tenant policy, repository authorization and races |
| `pnpm test:e2e` | (stop `pnpm dev` first) Playwright on port 3100 with forced mock data: dibs, bidding + settlement, create listing, cross-campus view-only, no overflow at 375/768/1280/1536/landscape |
| `pnpm db:generate` · `pnpm db:migrate` · `pnpm db:seed` | Drizzle migrations and seed for Neon |

## Environment variables

Put these in `.env.local` (and in Vercel project settings). All are optional; a missing group switches that subsystem to mock.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon **pooled** connection string. Turns on the Neon adapter. |
| `DATABASE_URL_UNPOOLED` | Direct Neon URL for `drizzle-kit` migrations (optional). |
| `AUTH_SECRET` | Auth.js secret (`npx auth secret`). |
| `AUTH_RESEND_KEY`, `AUTH_EMAIL_FROM` | Resend API key + sender for magic links. Real auth needs DB + secret + Resend. |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob for listing photos. Without it photos stay in memory (demo). |
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

`neon init` creates (or links, with `--project-id`) a project, writes `DATABASE_URL`, `DATABASE_URL_UNPOOLED` and `NEON_BRANCH` into `.env.local`, and pins it in `.neon` (gitignored). Restart `pnpm dev` and the banner drops "in-memory data".

Manual path: create a project in the Neon console, put the pooled and direct connection strings in `.env.local`, then run the same two commands. `pnpm db:seed` is idempotent; `pnpm db:seed --reset` wipes marketplace tables first (dev branches only).

Design notes: reads use Neon's HTTP driver; atomic operations (bid, buy-now, dibs, settlement) open a short-lived WebSocket `Pool`, run one transaction with `SELECT … FOR UPDATE` on the listing row, and close it. Postgres also enforces one active dib per listing (partial unique index), bid idempotency (unique `(bidder_id, idempotency_key)`), and tenant consistency (bids/dibs/saves reference listings by composite `(id, campus_id)`).

> Verified against a live Neon project: migration, seed, dibs and bidding through the UI, plus scripted races (concurrent bids, three-way dibs, buy-now), idempotent resubmits, idempotent settlement, and cross-campus/non-seller write rejection.

## Authentication

Auth.js v5 with the Resend email provider and the Drizzle adapter (`src/auth.ts`). The campus domain is validated on the server before a link is sent and again in the `signIn` callback; a student is verified only after clicking the link. Profiles are created on first sign-in with the campus derived from the email domain. All mutations resolve identity server-side via `getViewer()` — client-supplied ids are never trusted.

## Auction settlement on Vercel

There's no long-running process. Settlement and dib expiry are an idempotent `runMaintenance()` that runs:

1. **Lazily** on reads (throttled to every 20s per instance) and before every bid/dibs/buy-now, so users never see a stale auction.
2. **On a schedule** via `vercel.json` → `GET /api/cron/maintenance` with `Authorization: Bearer $CRON_SECRET`. The checked-in schedule is daily (Hobby plan limit); on Pro, change it to `* * * * *`.

## Deploy to Vercel

1. Import the repo in Vercel (framework: Next.js, package manager: pnpm).
2. Add the env vars above (or none, for a demo-mode deploy).
3. Deploy. Note: in demo mode each serverless instance has its own in-memory store, so state can differ between instances — use Neon for a shared demo.

## Adding a campus

Add one entry to `src/config/campuses.ts` (slug, names, email domains, theme tokens, timezone, dates, pickup spots, cross-campus policy). Optionally add seed listings in `src/data/seed`. Routing, theming, verification and the campus picker pick it up automatically.

See [CLAUDE.md](CLAUDE.md) for structure and the two-developer workflow, and [docs/PLAN.md](docs/PLAN.md) for the build plan.
