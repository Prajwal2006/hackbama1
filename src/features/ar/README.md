# AR: sell with photos, place it in your room

**Sellers** add photos on the sell form and tap *Make a 3D model from my photos*. **Buyers** open the listing and tap *View in your room* to place the item, at real size, on the floor or a wall with their phone camera.

## How it works

1. `actions.ts` → `analyzeArPhotosAction` sends the (already resized) photos to Gemini (`gemini.ts`, server-side key). Gemini can't output a mesh, so it returns a **part list**: boxes, cylinders and spheres with positions, colors and materials, plus a name and a guessed real size.
2. `build.ts` cleans the list (snaps legs to the floor, mirrors symmetric parts, fixes colors) and turns it into a **GLB scaled to the seller-confirmed centimeters**. It runs in the browser for the seller's live preview and on the server for buyers.
3. On posting, only the small spec + dimensions are saved (`ar_models` table / `ArRepository`, one per listing). No files are written, which is what makes this work on Vercel's read-only filesystem.
4. `/api/ar/[listingId]/model.glb` generates the GLB on demand and is cached by the CDN. It is **public on purpose**: Android Scene Viewer and iOS Quick Look fetch it without the visitor's cookies.
5. `components/ArViewer.tsx` wraps Google's `<model-viewer>`: WebXR / Scene Viewer on Android, AR Quick Look on iPhone.

## Setup

- `GEMINI_API_KEY` (server-only) enables the seller step. `GEMINI_MODELS` optionally overrides the model fallback chain. Without a key, sellers don't see the 3D step; seeded demo listings (desk, chairs, lamps) still have AR.
- Run `pnpm db:migrate` against Neon once (adds `ar_models`). Until it runs, AR reads fail soft and listings still load; saving a model for a new listing is skipped.
- The sell page sets `maxDuration = 60` because the Gemini call runs in a server action (usually 3-15 s).

## Things to know

- AR needs HTTPS (Vercel provides it) and a supported phone. In-app browsers (Instagram, Facebook…) can't open AR; the viewer tells the user to open Safari/Chrome.
- Models are approximations built from simple parts, not exact scans. Sellers confirm the real dimensions, and buyers see the model at exactly that size.
- Gemini quota: a model that returns 429 is skipped for a minute and the next in the chain is used; `analyzeArPhotosAction` also limits each user to 6 scans a minute.
- Mock mode (no `DATABASE_URL`) keeps AR models in memory like everything else, so they reset when the server restarts.
