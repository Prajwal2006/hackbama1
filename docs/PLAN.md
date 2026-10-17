# Dibs — implementation plan

Stack: Next 16.4 (App Router, `proxy.ts`), React 19.3, TS strict, Tailwind 4, pnpm,
Motion 14, R3F 9 + Drei, RHF + Zod 4, Sonner, next-themes, Drizzle + Neon, Auth.js v5.

1. Scaffold + design tokens (`globals.css`), fonts (Bricolage Grotesque / Inter / JetBrains Mono).
   `cacheComponents` is off: every app page is per-user dynamic; we revisit for marketing only.
2. `src/config/campuses.ts` — the single source of truth for tenants (UA + fictional Riverbend
   State). Theme tokens are injected as CSS vars by the campus layout. Cross-campus policy lives
   here as data (`crossCampus.discoverableBy`), enforced in `src/lib/policy.ts`.
3. `src/config/features.ts` — typed feature registry. Sidebar, mobile tabs, command palette and
   "coming soon" module pages are generated from it, so a new feature = one entry + a folder.
4. Data: `src/data/types.ts` (domain types), `src/data/repository.ts` (interface),
   `adapters/mock` (deterministic in-memory, globalThis singleton, resettable) and
   `adapters/neon` (Drizzle; neon-http for reads, neon-serverless Pool for transactions
   with `SELECT … FOR UPDATE`). `src/data/index.ts` picks the adapter from env.
5. Domain rules are pure functions (`features/auctions/domain.ts`, `features/dibs/domain.ts`)
   used by both adapters, so mock and Neon enforce identical rules. Money = integer cents.
6. Maintenance (expire dibs, settle auctions) is idempotent, runs lazily on reads and from
   `/api/cron/maintenance` (Vercel Cron, `CRON_SECRET`).
7. Auth: `getViewer()` abstracts identity. Production = Auth.js magic-link (Resend) + Drizzle
   adapter, domain checked server-side before sending and again in `signIn` callback.
   Mock = HMAC-signed cookie session, "Continue as demo student", simulated verification.
8. Storage: `StorageAdapter` — mock (client-resized data URL) and Vercel Blob.
9. Shell: one responsive shell (sidebar ≥1024, rail 768–1023, bottom tabs <768), Cmd+K palette.
10. Pages: `/` (3D hero via reusable `Scene3D`), `/[campus]` home, browse (URL filters),
    listing detail (dibs stamp / bidding), create (multi-step RHF), me, notifications.
11. Tests: Vitest for domain + repository authorization (cross-campus, self-bid, races);
    Playwright for core flows at 375/768/1280/1536 + landscape phone.
