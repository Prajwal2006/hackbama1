import { ArrowUpRight, Gavel } from "lucide-react";
import Link from "next/link";
import type { ListingView } from "@/data/types";
import { minNextBidCents } from "@/features/auctions/domain";
import { formatCents } from "@/lib/money";
import { Countdown } from "./Countdown";
import { ListingMedia } from "./ListingCard";

/** Wide auction card for the campus home: current bid, next bid, clock. */
export function FeaturedAuction({ listing, campus }: { listing: ListingView; campus: string }) {
  const a = listing.auction!;
  const current = listing.highestBidCents ?? a.startingBidCents;
  return (
    <Link
      href={`/${campus}/listing/${listing.id}`}
      className="group grid overflow-hidden rounded-[1.6rem] border border-line bg-surface shadow-card transition-transform hover:-translate-y-0.5 sm:grid-cols-[1fr_1.1fr]"
    >
      <ListingMedia listing={listing} className="aspect-[4/3] sm:aspect-auto sm:h-full" />
      <div className="flex flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/12 px-2.5 py-1 text-xs font-bold text-accent">
            <Gavel className="size-3.5" /> Live auction
          </span>
          <ArrowUpRight className="size-5 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
        <h3 className="mt-3 font-display text-xl leading-tight font-extrabold">{listing.title}</h3>
        <dl className="mt-auto grid grid-cols-3 gap-2 pt-5">
          <div>
            <dt className="font-mono text-[0.65rem] tracking-wider text-ink-3 uppercase">{listing.bidCount ? "Current" : "Starts"}</dt>
            <dd className="font-mono text-xl font-bold tabular">{formatCents(current, { compact: true })}</dd>
          </div>
          <div>
            <dt className="font-mono text-[0.65rem] tracking-wider text-ink-3 uppercase">Bids</dt>
            <dd className="font-mono text-xl font-bold tabular">{listing.bidCount}</dd>
          </div>
          <div>
            <dt className="font-mono text-[0.65rem] tracking-wider text-ink-3 uppercase">Ends in</dt>
            <dd className="text-xl font-bold">
              <Countdown endsAt={a.auctionEndsAt} />
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-ink-3">
          Next bid {formatCents(minNextBidCents(listing, listing.highestBidCents))}
          {a.buyNowPriceCents ? ` · Buy now ${formatCents(a.buyNowPriceCents, { compact: true })}` : ""}
        </p>
      </div>
    </Link>
  );
}
