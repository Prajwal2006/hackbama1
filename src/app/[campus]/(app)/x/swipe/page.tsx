import type { Metadata } from "next";
import { pickupSpotName } from "@/config/campuses";
import { getRepo } from "@/data";
import { CONDITION_LABEL } from "@/data/types";
import { SwipeDeck } from "@/features/swipe/components/SwipeDeck";
import { loadCampusContext } from "@/lib/campus";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = { title: "Swipe" };

export default async function SwipePage({ params }: PageProps<"/[campus]/x/swipe">) {
  const { campus, viewer, savedIds } = await loadCampusContext((await params).campus);
  const listings = await getRepo().listListings({ campusIds: [campus.slug], statuses: ["active"], sort: "popular", limit: 30 });
  const cards = listings
    .filter((l) => !savedIds.has(l.id))
    .map((l) => ({
      id: l.id,
      title: l.title,
      priceLabel: l.isFree ? "FREE" : l.saleMode === "auction" ? `Bid ${formatCents(l.highestBidCents ?? l.auction!.startingBidCents, { compact: true })}` : formatCents(l.priceCents, { compact: true }),
      meta: [pickupSpotName(campus, l.pickupSpotId), CONDITION_LABEL[l.condition]].filter(Boolean).join(" · "),
      category: l.category,
      artSeed: l.artSeed,
      image: l.imageUrls[0] ?? null,
    }));
  return (
    <div className="relative">
      <div className="mb-6 text-center">
        <p className="font-mono text-xs tracking-[0.2em] text-ink-3 uppercase">Labs · beta</p>
        <h1 className="font-display text-fluid-xl font-extrabold">Swipe the move-out pile.</h1>
      </div>
      <SwipeDeck campus={campus.slug} cards={cards} signedIn={!!viewer} />
    </div>
  );
}
