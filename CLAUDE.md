@AGENTS.md

# Dibs — working notes for humans and agents

Next.js 16 (App Router, Turbopack) · React 19.3 · TS strict · Tailwind 4 · Motion · R3F · Drizzle + Neon · Auth.js v5 · pnpm.
Next 16 differs from older versions (`proxy.ts` not middleware, async `params`, global `PageProps`/`LayoutProps`) — check `node_modules/next/dist/docs/` before guessing.

## Commands

```bash
pnpm dev            # http://localhost:3000, demo mode if no env vars
pnpm check          # lint + typecheck + unit tests — run before every push
pnpm test:e2e       # Playwright on :3100 with forced mock data — stop `pnpm dev` first (Next allows one dev server per project)
pnpm build          # must pass before merging to main
```

## Layout

```
src/app/(marketing)/          landing (/), /signin redirect
src/app/demo/                 judge tour entry (steps in src/features/tour/steps.ts)
src/app/[campus]/layout.tsx   validates the campus slug (404 / canonical redirect)
src/app/[campus]/(app)/       everything inside the app shell: home, browse, listing/[id], create, me, notifications
src/app/[campus]/(app)/x/     modules: handoffs, swipe, subs, rides, meals, class-swap; x/[module] = placeholder for new registry ideas
src/app/[campus]/signin/      campus sign-in (outside the shell)
src/app/api/                  cron/maintenance, demo/reset
src/config/campuses.ts        tenants — single source of truth
src/config/features.ts        feature registry — drives sidebar, tabs, Cmd+K, module pages
src/data/types.ts             domain types (money = integer cents)
src/data/repository.ts        MarketRepository (listings, bids, dibs, handoffs…) + Result type
src/data/community-repository.ts  CommunityRepository (subs/rides/meals posts, class swaps)
src/data/auth-store.ts        email codes + user identities
src/data/adapters/{mock,neon} the two implementations; src/data/index.ts picks one from env
src/data/schema/              Drizzle schema (core.ts, community.ts) → drizzle/ migrations
src/features/<id>/            each feature owns components, actions, domain rules, README
src/components/{ui,shell,reactbits,three,art,motion}  shared, keep small and stable
src/lib/                      env, auth (session + viewer), policy (cross-campus), money, time, actions helpers
public/photos/                listing/module photos (Unsplash License, see CREDITS.md)
```

## Rules of the road

- **Identity**: mutations go through `withViewer()` (src/lib/actions.ts). Never accept a user id or campus id from the client as proof of anything. Sessions are minted only in `features/auth/actions.ts` after a code check (or the labelled demo sign-in).
- **Payments**: never process money. Record acknowledgements only (`PaymentAck` component, `ackHandoff`, `ackMember`).
- **Domain rules are pure** (`features/*/domain.ts`) and shared by both adapters. Change a rule there, not in an adapter.
- **New data**: add tables with a `campus_id` column in a new `src/data/schema/<area>.ts` (re-export it from `index.ts`) and a repository interface + mock/neon implementation, like `CommunityRepository` — don't grow `MarketRepository` for unrelated features.
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

No `DATABASE_URL` → in-memory store seeded from `src/data/seed` (relative to boot time). The banner's **Reset**, `/api/demo/reset` and the `/demo` tour reseed it. On Neon those (and "end auction now") only work with `DIBS_ALLOW_DEMO_RESET=1`. If you add a feature judges should see, add a stop to `src/features/tour/steps.ts` and a `data-tour="…"` attribute on the element to spotlight (keep the total under 300 s).
