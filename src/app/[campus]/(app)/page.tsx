import { ArrowRight, Gavel, Gift, Plus } from "lucide-react";
import Link from "next/link";
import { ItemArt } from "@/components/art/ItemArt";
import { Reveal, Stagger } from "@/components/motion/Reveal";
import { CountUp } from "@/components/reactbits/CountUp";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, SectionHeading } from "@/components/ui/misc";
import { getRepo } from "@/data";
import { CATEGORIES, CATEGORY_LABEL } from "@/data/types";
import { FeaturedAuction } from "@/features/listings/components/FeaturedAuction";
import { ListingCard, ListingGrid } from "@/features/listings/components/ListingCard";
import { loadCampusContext } from "@/lib/campus";
import { daysUntil } from "@/lib/time";
import { cn } from "@/lib/utils";

export default async function CampusHome({ params }: PageProps<"/[campus]">) {
  const { campus, viewer, isMember, savedIds } = await loadCampusContext((await params).campus);
  const repo = getRepo();
  const ids = [campus.slug];
  const [stats, endingSoon, newest, free, popular] = await Promise.all([
    repo.campusStats(campus.slug),
    repo.listListings({ campusIds: ids, saleMode: "auction", statuses: ["active"], sort: "ending_soon", limit: 3 }),
    repo.listListings({ campusIds: ids, sort: "newest", limit: 10 }),
    repo.listListings({ campusIds: ids, freeOnly: true, statuses: ["active"], sort: "newest", limit: 5 }),
    repo.listListings({ campusIds: ids, statuses: ["active"], sort: "popular", limit: 5 }),
  ]);

  const toMoveOut = daysUntil(campus.moveOutDate);
  const toMoveIn = daysUntil(campus.moveInDate);
  const phase = toMoveOut > 0 ? { n: toMoveOut, label: "days to move-out" } : { n: Math.max(toMoveIn, 0), label: "days to move-in" };
  const firstName = viewer?.profile.displayName.split(" ")[0];
  const card = (l: (typeof newest)[number], i: number) => (
    <ListingCard key={l.id} listing={l} campus={campus.slug} saved={savedIds.has(l.id)} signedIn={!!viewer} priority={i < 2} />
  );

  return (
    <div className="flex flex-col gap-14">
      {/* ——— Hero bento ——— */}
      <Stagger className="grid gap-3 md:grid-cols-6 md:grid-rows-[auto_auto]">
        <Reveal data-tour="home-hero" className="grain relative overflow-hidden rounded-[1.75rem] border border-line bg-surface p-6 md:col-span-4 md:row-span-2 md:p-9">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full opacity-60 blur-3xl"
            style={{ background: "radial-gradient(circle, var(--glow), transparent 70%)" }}
          />
          <p className="font-mono text-xs tracking-[0.2em] text-ink-3 uppercase">
            {campus.name}
            {campus.fictional ? " · fictional demo campus" : ""}
          </p>
          <h1 className="mt-4 max-w-[14ch] font-display text-fluid-xl font-extrabold">
            {firstName ? `${firstName}, ` : ""}move-out is <span className="text-accent">on.</span>
          </h1>
          <p className="mt-4 max-w-md text-lg text-ink-2">
            {stats.activeListings} things are waiting for a new dorm. See it. Want it. <strong className="text-ink">Call dibs.</strong>
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={`/${campus.slug}/browse`} className={buttonVariants({ size: "lg" })}>
              Browse everything <ArrowRight />
            </Link>
            <Link href={`/${campus.slug}/create`} className={buttonVariants({ size: "lg", variant: "outline" })}>
              <Plus /> Sell something
            </Link>
          </div>
          {!isMember && viewer ? (
            <p className="mt-5 text-sm text-ink-3">You&apos;re verified at another campus — you can look around, but only {campus.shortName} students can claim here.</p>
          ) : null}
        </Reveal>

        <Reveal className="relative flex flex-col justify-between overflow-hidden rounded-[1.75rem] bg-accent p-6 text-accent-ink md:col-span-2">
          <p className="font-mono text-xs font-bold tracking-[0.2em] uppercase opacity-80">The clock</p>
          <p className="mt-6 font-display text-[clamp(4rem,10vw,6.5rem)] leading-[0.8] font-extrabold tracking-[-0.06em] tabular">
            <CountUp to={phase.n} />
          </p>
          <p className="mt-2 font-display text-lg font-bold">{phase.label}</p>
        </Reveal>

        <Reveal className="grid grid-cols-2 gap-3 md:col-span-2">
          <Link href={`/${campus.slug}/browse?mode=auction&sort=ending_soon`} className="rounded-[1.5rem] border border-line bg-surface p-4 transition-colors hover:border-line-strong">
            <Gavel className="size-5 text-accent" />
            <p className="mt-6 font-display text-3xl font-extrabold tabular">
              <CountUp to={stats.liveAuctions} />
            </p>
            <p className="text-sm text-ink-2">live auctions</p>
          </Link>
          <Link href={`/${campus.slug}/browse?mode=free`} className="rounded-[1.5rem] bg-sticker p-4 text-[#16120f] transition-transform hover:-rotate-1">
            <Gift className="size-5" />
            <p className="mt-6 font-display text-3xl font-extrabold tabular">
              <CountUp to={stats.freeItems} />
            </p>
            <p className="text-sm font-semibold">free right now</p>
          </Link>
        </Reveal>
      </Stagger>

      {/* ——— Real numbers from the repository ——— */}
      <section aria-label="Campus activity" className="-mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[1.5rem] border border-line bg-line sm:grid-cols-4">
        {[
          { n: stats.activeListings, label: "listings open", fmt: "int" as const },
          { n: stats.dibsCalled, label: "dibs called", fmt: "int" as const },
          { n: stats.bidsPlaced, label: "bids placed", fmt: "int" as const },
          { n: stats.savedCents, label: "claimed so far", fmt: "dollars" as const },
        ].map((s) => (
          <div key={s.label} className="bg-bg px-5 py-4">
            <p className="font-mono text-2xl font-bold tabular">
              <CountUp to={s.n} format={s.fmt} />
            </p>
            <p className="text-sm text-ink-3">{s.label}</p>
          </div>
        ))}
      </section>

      {/* ——— Categories ——— */}
      <section>
        <SectionHeading kicker="Shortcuts" title="What do you need?" />
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 scrollbar-none md:mx-0 md:flex-wrap md:px-0">
          {CATEGORIES.filter((c) => c !== "other").map((c, i) => (
            <Link
              key={c}
              href={`/${campus.slug}/browse?category=${c}`}
              className="group flex shrink-0 snap-start items-center gap-2.5 rounded-full border border-line-strong bg-surface py-1.5 pr-4 pl-1.5 text-sm font-semibold transition-colors hover:border-accent"
            >
              <span className="size-9 overflow-hidden rounded-full">
                <ItemArt category={c} seed={i * 47 + 20} />
              </span>
              {CATEGORY_LABEL[c]}
            </Link>
          ))}
        </div>
      </section>

      {/* ——— Featured auctions ——— */}
      <section>
        <SectionHeading
          kicker="Going, going…"
          title="Ending soon"
          action={
            <Link href={`/${campus.slug}/browse?mode=auction&sort=ending_soon`} className="text-sm font-semibold text-ink-2 hover:text-ink">
              All auctions →
            </Link>
          }
        />
        {endingSoon.length ? (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {endingSoon.map((l, i) => (
              <div key={l.id} className={cn(i === 0 && "lg:col-span-2 2xl:col-span-1")}>
                <FeaturedAuction listing={l} campus={campus.slug} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No live auctions" body="Got something people will fight over? Start the first one." />
        )}
      </section>

      {/* ——— Free ——— */}
      <section>
        <SectionHeading
          kicker="$0.00"
          title={
            <>
              Free. Just <span className="stamp ml-1 text-[0.8em]">dibs</span>
            </>
          }
          action={
            <Link href={`/${campus.slug}/browse?mode=free`} className="text-sm font-semibold text-ink-2 hover:text-ink">
              All free →
            </Link>
          }
        />
        {free.length ? <ListingGrid>{free.map(card)}</ListingGrid> : <EmptyState title="Nothing free right now" body="Check back — move-out week gets generous." />}
      </section>

      <section>
        <SectionHeading kicker="Most wanted" title="Trending" />
        {popular.length ? <ListingGrid>{popular.map(card)}</ListingGrid> : <EmptyState title="Quiet out here" />}
      </section>

      <section>
        <SectionHeading
          kicker="Fresh"
          title="Just posted"
          action={
            <Link href={`/${campus.slug}/browse`} className="text-sm font-semibold text-ink-2 hover:text-ink">
              Browse all →
            </Link>
          }
        />
        {newest.length ? (
          <ListingGrid>{newest.map(card)}</ListingGrid>
        ) : (
          <EmptyState
            title="No listings yet"
            body="Be the first to post at your campus."
            action={
              <Link href={`/${campus.slug}/create`} className={buttonVariants()}>
                Post a listing
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}
