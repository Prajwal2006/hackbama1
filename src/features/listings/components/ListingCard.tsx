import { BadgeCheck, Gavel, MapPin } from "lucide-react";
import Link from "next/link";
import { ViewTransition } from "react";
import { ItemArt } from "@/components/art/ItemArt";
import { getCampus, pickupSpotName } from "@/config/campuses";
import { CONDITION_LABEL, type ListingView } from "@/data/types";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Countdown } from "./Countdown";
import { SaveButton } from "./SaveButton";

/**
 * `morph` names a shared-element view transition (grid card ↔ detail hero).
 * Only enable it where a listing appears once per page.
 */
export function ListingMedia({
  listing,
  className,
  priority,
  morph,
}: {
  listing: ListingView;
  className?: string;
  priority?: boolean;
  morph?: boolean;
}) {
  const src = listing.imageUrls[0];
  return (
    <ViewTransition name={morph ? `listing-media-${listing.id}` : undefined}>
      <div className={cn("relative overflow-hidden bg-surface-2", className)}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URLs in demo mode; blob URLs in prod
          <img src={src} alt={listing.title} className="h-full w-full object-cover" loading={priority ? "eager" : "lazy"} />
        ) : (
          <ItemArt category={listing.category} seed={listing.artSeed} title={listing.title} />
        )}
      </div>
    </ViewTransition>
  );
}

/** The price "sticker" — a rotated die-cut tag that states mode at a glance. */
export function PriceSticker({ listing, className }: { listing: ListingView; className?: string }) {
  if (listing.saleMode === "free") {
    return <span className={cn("sticker bg-sticker px-3.5 py-1.5 text-lg text-[#16120f] -rotate-6", className)}>FREE</span>;
  }
  if (listing.saleMode === "auction") {
    const cents = listing.highestBidCents ?? listing.auction!.startingBidCents;
    return (
      <span className={cn("sticker bg-ink px-3.5 py-1.5 text-bg -rotate-3", className)}>
        <Gavel className="size-4 text-accent" />
        <span className="font-mono text-base tabular">{formatCents(cents, { compact: true })}</span>
      </span>
    );
  }
  return (
    <span className={cn("sticker bg-accent px-3.5 py-1.5 font-mono text-base text-accent-ink tabular rotate-2", className)}>
      {formatCents(listing.priceCents, { compact: true })}
    </span>
  );
}

export function StatusStamp({ listing }: { listing: ListingView }) {
  const label =
    listing.status === "reserved" ? "dibs'd" : listing.status === "sold" ? "sold" : listing.status === "closed" ? "closed" : null;
  if (!label) return null;
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center bg-bg/35">
      <span className="stamp bg-bg/70 text-3xl text-accent">{label}</span>
    </div>
  );
}

export function ListingCard({
  listing,
  campus,
  saved,
  signedIn,
  priority,
  showCampus,
  morph,
}: {
  listing: ListingView;
  campus: string;
  saved: boolean;
  signedIn: boolean;
  priority?: boolean;
  showCampus?: boolean;
  morph?: boolean;
}) {
  const home = getCampus(listing.campusId)!;
  const spot = pickupSpotName(home, listing.pickupSpotId);
  const auction = listing.saleMode === "auction" ? listing.auction : null;
  const live = auction && listing.status === "active" && !auction.settledAt;

  return (
    <article className="group relative" data-testid="listing-card">
      <Link
        href={`/${listing.campusId === campus ? campus : listing.campusId}/listing/${listing.id}`}
        className="block rounded-[1.4rem] focus-visible:outline-offset-4"
      >
        <div className="relative overflow-hidden rounded-[1.4rem] border border-line shadow-card transition-transform duration-300 group-hover:-translate-y-1 group-active:translate-y-0">
          <ListingMedia listing={listing} className="aspect-[4/3.6]" priority={priority} morph={morph} />
          <StatusStamp listing={listing} />
          {live ? (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-bg/85 px-2.5 py-1 text-xs font-bold backdrop-blur-md">
              <span className="size-1.5 animate-pulse rounded-full bg-accent" />
              <Countdown endsAt={auction.auctionEndsAt} />
              <span className="hidden text-ink-3 sm:inline">· {listing.bidCount} bids</span>
            </span>
          ) : null}
          {showCampus && listing.campusId !== campus ? (
            <span className="absolute bottom-3 left-3 rounded-full bg-bg/85 px-2.5 py-1 font-mono text-[0.65rem] font-bold uppercase backdrop-blur-md">
              {home.shortName}
            </span>
          ) : null}
        </div>
        <div className="relative -mt-5 flex justify-end pr-3">
          <PriceSticker listing={listing} />
        </div>
        <div className="mt-1.5 px-1">
          <h3 className="line-clamp-2 font-display text-[1.06rem] leading-snug font-bold tracking-tight">{listing.title}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.8rem] text-ink-3">
            {spot ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" /> {spot}
              </span>
            ) : null}
            <span>{CONDITION_LABEL[listing.condition]}</span>
            {listing.seller.verifiedAt ? (
              <span className="inline-flex items-center gap-1 text-ink-2">
                <BadgeCheck className="size-3.5 text-accent" /> {listing.seller.displayName}
              </span>
            ) : null}
          </p>
        </div>
      </Link>
      <SaveButton campus={listing.campusId} listingId={listing.id} saved={saved} signedIn={signedIn} className="absolute top-3 right-3" />
    </article>
  );
}

export function ListingGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5", className)}>
      {children}
    </div>
  );
}
