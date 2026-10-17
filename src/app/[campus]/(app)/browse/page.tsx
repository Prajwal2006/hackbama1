import type { Metadata } from "next";
import { Suspense } from "react";
import { EmptyState } from "@/components/ui/misc";
import { getCampus } from "@/config/campuses";
import { getRepo } from "@/data";
import { CATEGORY_LABEL } from "@/data/types";
import { BrowseFilters } from "@/features/listings/components/BrowseFilters";
import { ListingCard, ListingGrid } from "@/features/listings/components/ListingCard";
import { parseBrowseParams } from "@/features/listings/filters";
import { loadCampusContext } from "@/lib/campus";
import { partnerCampusIds, visibleCampusIds } from "@/lib/policy";
import { plural } from "@/lib/utils";

export const metadata: Metadata = { title: "Browse" };

export default async function BrowsePage({ params, searchParams }: PageProps<"/[campus]/browse">) {
  const { campus, viewer, isMember, savedIds } = await loadCampusContext((await params).campus);
  const f = parseBrowseParams(await searchParams);
  const campusIds = visibleCampusIds({
    browsingCampusId: campus.slug,
    viewerCampusId: viewer?.actor.campusId ?? null,
    includeNearby: f.nearby,
  });
  const listings = await getRepo().listListings({
    campusIds,
    q: f.q,
    category: f.category,
    saleMode: f.mode,
    pickupMode: f.pickup,
    pickupSpotId: f.spot,
    minPriceCents: f.min,
    maxPriceCents: f.max,
    sort: f.sort,
  });
  const partners = partnerCampusIds(campus.slug).map((id) => getCampus(id)!.shortName);
  const title =
    f.mode === "free" ? "Free stuff" : f.mode === "auction" ? "Live auctions" : f.category ? CATEGORY_LABEL[f.category] : "Browse";

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-ink-3 uppercase">{campus.shortName} marketplace</p>
          <h1 className="font-display text-fluid-xl font-extrabold">{title}</h1>
        </div>
        <p className="pb-1 font-mono text-sm text-ink-3" aria-live="polite">
          {plural(listings.length, "result")}
        </p>
      </div>
      <Suspense>
        <BrowseFilters spots={campus.pickupSpots} partnerNames={partners} canNearby={isMember} />
      </Suspense>
      <div className="mt-6">
        {listings.length ? (
          <ListingGrid>
            {listings.map((l, i) => (
              <ListingCard
                key={l.id}
                listing={l}
                campus={campus.slug}
                saved={savedIds.has(l.id)}
                signedIn={!!viewer}
                priority={i < 4}
                showCampus={f.nearby}
                morph
              />
            ))}
          </ListingGrid>
        ) : (
          <EmptyState
            title="Nothing matches that"
            body={f.q ? `No listings for “${f.q}”. Try fewer filters — or post a want in the group chat.` : "Try clearing a filter or two."}
          />
        )}
      </div>
    </div>
  );
}
