@AGENTS.md

# Dibs — working notes for humans and agents

Next.js 16 (App Router, Turbopack) · React 19.3 · TS strict · Tailwind 4 · Motion · R3F · Drizzle + Neon · Auth.js v5 · pnpm.
Next 16 differs from older versions (`proxy.ts` not middleware, async `params`, global `PageProps`/`LayoutProps`) — check `node_modules/next/dist/docs/` before guessing.

## Commands

```bash
pnpm dev            # http://localhost:3000, demo mode if no env vars
pnpm check          # lint + typecheck + unit tests — run before every push
pnpm test:e2e       # Playwright (starts/reuses the dev server, forces mock data)
pnpm build          # must pass before merging to main
```

## Layout

```
src/app/(marketing)/          landing (/), /signin redirect
src/app/[campus]/layout.tsx   validates the campus slug (404 / canonical redirect)
src/app/[campus]/(app)/       everything inside the app shell: home, browse, listing/[id], create, me, notifications
src/app/[campus]/(app)/x/     feature modules: x/swipe (own page), x/[module] (generic placeholder)
src/app/[campus]/signin/      campus sign-in (outside the shell)
src/app/api/                  auth, cron/maintenance, demo/reset
src/config/campuses.ts        tenants — single source of truth
src/config/features.ts        feature registry — drives sidebar, tabs, Cmd+K, module pages
src/data/types.ts             domain types (money = integer cents)
src/data/repository.ts        MarketRepository interface + Result type
src/data/adapters/{mock,neon} the two implementations; src/data/index.ts picks one from env
src/data/schema/              Drizzle schema → drizzle/ migrations
src/features/<id>/            each feature owns components, actions, domain rules, README
src/components/{ui,shell,reactbits,three,art,motion}  shared, keep small and stable
src/lib/                      env, auth (viewer), policy (cross-campus), money, time, actions helpers
```

## Rules of the road

- **Identity**: mutations go through `withViewer()` (src/lib/actions.ts). Never accept a user id or campus id from the client as proof of anything.
- **Domain rules are pure** (`features/*/domain.ts`) and shared by both adapters. Change a rule there, not in an adapter.
- **New data** (e.g. rides, subs): add tables with a `campus_id` column, and a new repository interface + mock/neon implementation next to `MarketRepository` — don't grow `MarketRepository` for unrelated features.
- **Money** is integer cents everywhere. Parse with `parseDollarsToCents`, display with `formatCents`.
- **Animation** must never gate an action. Respect reduced motion (Motion's `MotionConfig reducedMotion="user"` is global).
- **Images**: no external image URLs; use `ItemArt` or uploaded photos via `getStorage()`.

## Two developers, no merge conflicts

Feature ownership lives in `src/config/features.ts` (`owner: "dev-a" | "dev-b"`).

1. Branch from `main`: `git switch -c feature/<id>` (e.g. `feature/rides`).
2. Work only inside:
   - `src/features/<id>/` (components, actions, domain, README)
   - `src/app/[campus]/(app)/x/<id>/page.tsx` (creating this folder replaces the placeholder)
   - new schema file `src/data/schema/<id>.ts` re-exported from `src/data/schema/index.ts` (one added line)
3. Touch shared files only with one-line edits: your entry in `features.ts` (flip `status`), the schema re-export, and a migration from `pnpm db:generate`. **Generate migrations right before merging**, after rebasing on `main`, so migration numbers don't collide.
4. Need a shared component change? Make it in a tiny separate PR to `main` first, then rebase.
5. `pnpm check && pnpm build` before opening the PR. Rebase (don't merge) `main` into your branch.

## Demo mode

No `DATABASE_URL` → in-memory store seeded from `src/data/seed` (relative to boot time). The yellow banner's **Reset** and `/api/demo/reset` reseed. `endAuctionNowAction` exists for demos only and is disabled when Neon is configured.
