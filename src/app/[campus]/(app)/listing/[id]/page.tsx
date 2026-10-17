import { ArrowLeft, BadgeCheck, CalendarClock, Tag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pickupSpotName } from "@/config/campuses";
import { getAr, getRepo } from "@/data";
import { CATEGORY_LABEL, CONDITION_LABEL, PICKUP_LABEL } from "@/data/types";
import { ArViewer } from "@/features/ar/components/ArViewer";
import { AuctionPanel } from "@/features/auctions/components/AuctionPanel";
import { auctionPhase, bidderLabel, minNextBidCents } from "@/features/auctions/domain";
import { DibsPanel } from "@/features/dibs/components/DibsPanel";
import { holdHours } from "@/features/dibs/domain";
import { ListingMedia, PriceSticker, StatusStamp } from "@/features/listings/components/ListingCard";
import { SaveButton } from "@/features/listings/components/SaveButton";
import { DemoEndAuction, SellerControls } from "@/features/listings/components/SellerControls";
import { loadCampusContext } from "@/lib/campus";
import { demoToolsEnabled } from "@/lib/env";
import { formatCents } from "@/lib/money";
import { canTransact } from "@/lib/policy";
import { formatInZone, relativeTime } from "@/lib/time";

export async function generateMetadata({ params }: PageProps<"/[campus]/listing/[id]">): Promise<Metadata> {
  const { id } = await params;
  const l = await getRepo().getListing(id);
  if (!l) return { title: "Not found" };
  const price = l.isFree ? "Free" : l.saleMode === "auction" ? "Auction" : formatCents(l.priceCents, { compact: true });
  return { title: l.title, description: `${price} · ${l.description.slice(0, 140)}` };
}

export default async function ListingPage({ params }: PageProps<"/[campus]/listing/[id]">) {
  const { campus: slug, id } = await params;
  const { campus, viewer, savedIds } = await loadCampusContext(slug);
  const repo = getRepo();
  const [listing, arModel] = await Promise.all([repo.getListing(id), getAr().getByListing(id)]);
  // Tenant check: a listing is only served under its own campus path.
  if (!listing || listing.campusId !== campus.slug) notFound();

  const now = new Date();
  const isSeller = viewer?.actor.userId === listing.sellerId;
  const access: "anonymous" | "visitor" | "seller" | "member" = !viewer
    ? "anonymous"
    : isSeller
      ? "seller"
      : canTransact(viewer.actor, listing.campusId)
        ? "member"
        : "visitor";

  const spot = pickupSpotName(campus, listing.pickupSpotId);
  const pickupText = [spot, listing.locationHint].filter(Boolean).join(" — ") || "On campus (seller will confirm)";
  const activeDib = listing.saleMode !== "auction" ? await repo.getActiveDibForListing(listing.id) : null;
  const sellerDibs = isSeller && viewer ? await repo.listDibsForSeller(viewer.actor) : [];
  const sellerDib = sellerDibs.find((d) => d.listingId === listing.id);

  let auctionProps: React.ComponentProps<typeof AuctionPanel> | null = null;
  if (listing.saleMode === "auction" && listing.auction) {
    const a = listing.auction;
    const bids = await repo.listBidsForListing(listing.id);
    const live = bids.filter((b) => b.status !== "rejected" && b.status !== "withdrawn");
    const high = live[0] ?? null;
    const me = viewer?.actor.userId ?? null;
    auctionProps = {
      campus: campus.slug,
      campusShort: campus.shortName,
      listingId: listing.id,
      title: listing.title,
      phase: auctionPhase(listing, now),
      status: listing.status,
      outcome: a.outcome,
      startsAt: a.auctionStartsAt.toISOString(),
      endsAt: a.auctionEndsAt.toISOString(),
      startingBidCents: a.startingBidCents,
      incrementCents: a.minimumIncrementCents,
      highestBidCents: listing.highestBidCents,
      minNextCents: minNextBidCents(listing, listing.highestBidCents),
      buyNowCents: a.buyNowPriceCents,
      hasReserve: a.reservePriceCents !== null,
      reserveMet: a.reservePriceCents === null ? null : (listing.highestBidCents ?? 0) >= a.reservePriceCents,
      // Bidder ids never leave the server — only privacy-preserving labels.
      bids: live.map((b) => ({
        id: b.id,
        label: bidderLabel(listing.id, b.bidderId, me),
        amountCents: b.amountCents,
        status: b.status,
        createdAt: b.createdAt.toISOString(),
        mine: b.bidderId === me,
      })),
      access,
      iAmHighest: !!me && high?.bidderId === me && !a.settledAt,
      iWon: !!me && !!a.winningBidId && bids.some((b) => b.id === a.winningBidId && b.bidderId === me),
    };
  }

  return (
    <div>
      <Link href={`/${campus.slug}/browse`} className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" /> Back to browse
      </Link>
      <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] xl:gap-12">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-line shadow-card">
            <ListingMedia listing={listing} className="aspect-square" priority morph />
            <StatusStamp listing={listing} />
            <SaveButton
              campus={campus.slug}
              listingId={listing.id}
              saved={savedIds.has(listing.id)}
              signedIn={!!viewer}
              size="lg"
              className="absolute top-4 right-4"
            />
            <div className="absolute bottom-4 left-4">
              <PriceSticker listing={listing} className="text-xl" />
            </div>
          </div>
          {listing.imageUrls.length > 1 ? (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {listing.imageUrls.slice(1).map((u, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={u} alt="" className="aspect-square rounded-xl border border-line object-cover" />
              ))}
            </div>
          ) : null}
          {arModel ? (
            <section className="mt-6" aria-labelledby="ar-heading" data-testid="ar-section">
              <h2 id="ar-heading" className="mb-3 font-display text-xl font-bold">
                See it in your room
              </h2>
              <ArViewer
                src={`/api/ar/${listing.id}/model.glb`}
                name={listing.title}
                dimensionsLabel={`${Math.round(arModel.dimensionsCm.w)} × ${Math.round(arModel.dimensionsCm.d)} × ${Math.round(arModel.dimensionsCm.h)} cm`}
              />
            </section>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <p className="flex flex-wrap items-center gap-2 font-mono text-xs tracking-[0.15em] text-ink-3 uppercase">
              <span>{CATEGORY_LABEL[listing.category]}</span>·<span>{CONDITION_LABEL[listing.condition]}</span>·
              <span suppressHydrationWarning>posted {relativeTime(listing.createdAt, now)}</span>
            </p>
            <h1 className="mt-2 font-display text-fluid-lg font-extrabold">{listing.title}</h1>
            {listing.saleMode === "fixed" ? (
              <p className="mt-3 font-mono text-4xl font-bold tabular">{formatCents(listing.priceCents)}</p>
            ) : listing.saleMode === "free" ? (
              <p className="mt-3 font-display text-4xl font-extrabold text-accent">Free.</p>
            ) : null}
          </div>

          {auctionProps ? (
            <AuctionPanel {...auctionProps} />
          ) : (
            <DibsPanel
              campus={campus.slug}
              campusShort={campus.shortName}
              timezone={campus.timezone}
              listingId={listing.id}
              isFree={listing.isFree}
              status={listing.status}
              holdHours={holdHours(campus.slug)}
              access={access}
              myDib={
                activeDib && viewer && activeDib.buyerId === viewer.actor.userId
                  ? { id: activeDib.id, expiresAt: activeDib.expiresAt.toISOString() }
                  : null
              }
              othersDibExpiresAt={activeDib && activeDib.buyerId !== viewer?.actor.userId ? activeDib.expiresAt.toISOString() : null}
              pickupText={pickupText}
            />
          )}

          {isSeller ? (
            <SellerControls
              campus={campus.slug}
              listingId={listing.id}
              status={listing.status}
              saleMode={listing.saleMode}
              bidCount={listing.bidCount}
              settled={!!listing.auction?.settledAt}
              activeDib={sellerDib ? { id: sellerDib.id, buyerName: sellerDib.buyerName } : null}
              demoTools={demoToolsEnabled}
            />
          ) : listing.saleMode === "auction" && listing.status === "active" && !listing.auction?.settledAt ? (
            <div className="rounded-[1.4rem] border border-dashed border-line-strong p-4" data-tour="demo-end">
              <p className="font-mono text-xs tracking-[0.2em] text-ink-3 uppercase">{demoToolsEnabled ? "Demo tools" : "Settlement"}</p>
              <p className="mt-1 text-sm text-ink-2">
                {demoToolsEnabled
                  ? "Skip the wait: move the deadline to now and run the real settlement logic."
                  : "When the clock hits zero, a scheduled job (and any page view) settles the auction exactly once: highest bid wins if it meets the reserve, and everyone is notified."}
              </p>
              {demoToolsEnabled ? <DemoEndAuction listingId={listing.id} /> : null}
            </div>
          ) : null}

          <section className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.4rem] border border-line p-4">
              <p className="flex items-center gap-1.5 font-mono text-xs tracking-[0.15em] text-ink-3 uppercase">
                <CalendarClock className="size-3.5" /> Handoff
              </p>
              <p className="mt-2 font-semibold">{PICKUP_LABEL[listing.pickupMode]}</p>
              {listing.handoffStart ? (
                <p className="text-sm text-ink-2">
                  {formatInZone(listing.handoffStart, campus.timezone)} –{" "}
                  {listing.handoffEnd ? formatInZone(listing.handoffEnd, campus.timezone, { weekday: undefined, month: undefined, day: undefined }) : ""}
                </p>
              ) : (
                <p className="text-sm text-ink-2">Coordinate a time with the seller.</p>
              )}
            </div>
            <div className="rounded-[1.4rem] border border-line p-4">
              <p className="flex items-center gap-1.5 font-mono text-xs tracking-[0.15em] text-ink-3 uppercase">
                <Tag className="size-3.5" /> Seller
              </p>
              <p className="mt-2 flex items-center gap-1.5 font-semibold">
                {listing.seller.displayName}
                {listing.seller.verifiedAt ? <BadgeCheck className="size-4 text-accent" aria-label="Campus verified" /> : null}
              </p>
              <p className="text-sm text-ink-2">
                {listing.seller.verifiedAt ? `Verified ${campus.shortName} student` : "Not yet verified"}
              </p>
            </div>
          </section>

          {listing.description ? (
            <section>
              <h2 className="mb-2 font-mono text-xs tracking-[0.2em] text-ink-3 uppercase">About it</h2>
              <p className="text-lg leading-relaxed whitespace-pre-line text-ink-2">{listing.description}</p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
