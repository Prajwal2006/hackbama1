# listings (core)

- `schema.ts` — Zod schema for new listings (shared by form + server action). Money in cents.
- `actions.ts` — create, change status, toggle save. All go through `withViewer` (trusted identity).
- `filters.ts` — parses untrusted URL params for browse.
- `components/` — ListingCard, PriceSticker, BrowseFilters, CreateListingForm, SellerControls, Countdown.
