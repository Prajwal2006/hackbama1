import { BadgeCheck, FlaskConical } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { getRepo } from "@/data";
import type { ListingView } from "@/data/types";
import { ListingCard, ListingGrid } from "@/features/listings/components/ListingCard";
import { ProfileTabs } from "@/features/profile/components/ProfileTabs";
import { requireMember } from "@/lib/campus";
import { formatCents } from "@/lib/money";
import { formatInZone } from "@/lib/time";

export const metadata: Metadata = { title: "My Dibs" };

export default async function MePage({ params, searchParams }: PageProps<"/[campus]/me">) {
  const slug = (await params).campus;
  const { campus, viewer, savedIds } = await requireMember(slug, `/${slug}/me`);
  const tab = String((await searchParams).tab ?? "listings");
  const repo = getRepo();
  const [mine, bids, dibs, saves] = await Promise.all([
    repo.listListings({ campusIds: [viewer.actor.campusId], sellerId: viewer.actor.userId, statuses: ["active", "reserved", "sold", "closed", "cancelled"] }),
    repo.listBidsForUser(viewer.actor),
    repo.listDibsForUser(viewer.actor),
    repo.listSaves(viewer.actor),
  ]);

  // One row per auction: the viewer's best bid.
  const byListing = new Map<string, (typeof bids)[number]>();
  for (const b of bids) {
    const cur = byListing.get(b.listingId);
    if (!cur || b.amountCents > cur.amountCents) byListing.set(b.listingId, b);
  }
  const myAuctions = [...byListing.values()];
  const won = myAuctions.filter((b) => b.listing.auction?.winningBidId && bids.some((x) => x.id === b.listing.auction!.winningBidId));
  const wonIds = new Set(won.map((b) => b.listingId));
  const lost = myAuctions.filter((b) => b.listing.auction?.settledAt && !wonIds.has(b.listingId));
  const active = myAuctions.filter((b) => !b.listing.auction?.settledAt && b.listing.status === "active");

  const card = (l: ListingView) => (
    <ListingCard key={l.id} listing={l} campus={l.campusId} saved={savedIds.has(l.id)} signedIn />
  );
  const tabs = [
    { id: "listings", label: "My listings", count: mine.length },
    { id: "bids", label: "Bidding", count: active.length },
    { id: "won", label: "Won", count: won.length },
    { id: "lost", label: "Lost", count: lost.length },
    { id: "dibs", label: "Reservations", count: dibs.filter((d) => d.status === "active").length },
    { id: "saved", label: "Saved", count: saves.length },
  ];

  return (
    <div>
      <section className="grain mb-8 flex flex-col gap-5 rounded-[1.75rem] border border-line bg-surface p-6 sm:flex-row sm:items-center">
        <span className="grid size-20 shrink-0 place-items-center rounded-full bg-accent-2 font-display text-3xl font-extrabold text-[#16120f]">
          {viewer.profile.displayName.slice(0, 1)}
        </span>
        <div className="flex-1">
          <h1 className="font-display text-3xl font-extrabold">{viewer.profile.displayName}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-2">
            {viewer.verification === "verified" ? (
              <span className="inline-flex items-center gap-1 font-semibold text-ink">
                <BadgeCheck className="size-4 text-accent" /> Verified {campus.shortName} student
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-sticker px-2 py-0.5 font-semibold text-[#16120f]">
                <FlaskConical className="size-3.5" /> {viewer.profile.email ? "Code shown on screen — not inbox-verified" : "Demo student (simulated)"}
              </span>
            )}
            {viewer.profile.email ? <span>{viewer.profile.email}</span> : null}
            {viewer.profile.verifiedAt ? <span>since {formatInZone(viewer.profile.verifiedAt, campus.timezone, { hour: undefined, minute: undefined, weekday: undefined })}</span> : null}
          </p>
        </div>
        <Link href={`/${campus.slug}/create`} className={buttonVariants()}>
          Sell something
        </Link>
      </section>

      <ProfileTabs tabs={tabs} active={tab} />

      <div className="mt-6">
        {tab === "listings" ? (
          mine.length ? <ListingGrid>{mine.map(card)}</ListingGrid> : (
            <EmptyState title="You haven't listed anything" body="Moving out? Your mini-fridge is someone's move-in miracle."
              action={<Link href={`/${campus.slug}/create`} className={buttonVariants()}>Post your first listing</Link>} />
          )
        ) : null}
        {tab === "bids" || tab === "won" || tab === "lost" ? (
          (() => {
            const rows = tab === "bids" ? active : tab === "won" ? won : lost;
            if (!rows.length) {
              return <EmptyState title={tab === "bids" ? "No active bids" : tab === "won" ? "No wins yet" : "Nothing lost"} body={tab === "bids" ? "Find an auction and throw your hat in." : undefined} />;
            }
            return (
              <ul className="flex flex-col gap-2">
                {rows.map((b) => {
                  const high = b.listing.highestBidCents;
                  const leading = high !== null && b.amountCents >= high && tab === "bids";
                  return (
                    <li key={b.id}>
                      <Link href={`/${b.listing.campusId}/listing/${b.listingId}`} className="flex items-center justify-between gap-4 rounded-2xl border border-line p-4 hover:border-line-strong">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{b.listing.title}</p>
                          <p className="text-sm text-ink-3">
                            Your bid {formatCents(b.amountCents)} · {tab === "bids" ? (leading ? "you're winning" : `outbid — now ${formatCents(high ?? 0)}`) : tab === "won" ? "won 🎉" : b.listing.auction?.outcome === "reserve_not_met" ? "reserve not met" : "went to another bidder"}
                          </p>
                        </div>
                        <span className={leading || tab === "won" ? "rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-ink" : "rounded-full bg-surface-2 px-3 py-1 text-xs font-bold text-ink-2"}>
                          {tab === "bids" ? (leading ? "Leading" : "Outbid") : tab === "won" ? "Won" : "Lost"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            );
          })()
        ) : null}
        {tab === "dibs" ? (
          dibs.length ? (
            <ul className="flex flex-col gap-2">
              {dibs.map((d) => (
                <li key={d.id}>
                  <Link href={`/${d.listing.campusId}/listing/${d.listingId}`} className="flex items-center justify-between gap-4 rounded-2xl border border-line p-4 hover:border-line-strong">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{d.listing.title}</p>
                      <p className="text-sm text-ink-3">
                        {d.status === "active" ? `Held until ${formatInZone(d.expiresAt, campus.timezone)}` : d.status}
                      </p>
                    </div>
                    <span className={d.status === "active" ? "stamp text-base" : "text-xs text-ink-3 uppercase"}>{d.status === "active" ? "dibs" : d.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No reservations" body="Call dibs on something and it'll be held here for 24 hours." />
          )
        ) : null}
        {tab === "saved" ? (
          saves.length ? <ListingGrid>{saves.map((s) => card(s.listing))}</ListingGrid> : <EmptyState title="Nothing saved" body="Tap the heart on anything you're eyeing." />
        ) : null}
      </div>
    </div>
  );
}
