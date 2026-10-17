# subs

Owner: **dev-b** · branch: `feature/subs` · registry id: `subs`

Subscription splitting. New tables go in `src/data/schema` with a `campus_id` column; add methods to a new repository interface rather than `MarketRepository`.

To ship: build here, add `src/app/[campus]/(app)/x/subs/page.tsx`, then set `status: "live"` in `src/config/features.ts`.
