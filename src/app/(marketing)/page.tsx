import { ArrowRight, BadgeCheck, Clock, Gavel, Gift, Hand, MapPin, ShieldCheck, Tag } from "lucide-react";
import Link from "next/link";
import { ItemArt } from "@/components/art/ItemArt";
import { Reveal, Stagger } from "@/components/motion/Reveal";
import { Magnet } from "@/components/reactbits/Magnet";
import { SpotlightCard } from "@/components/reactbits/SpotlightCard";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { Wordmark } from "@/components/shell/Wordmark";
import { HeroCanvas } from "@/components/three/HeroCanvas";
import { buttonVariants } from "@/components/ui/button";
import { listCampuses } from "@/config/campuses";
import { getRepo } from "@/data";
import { formatCents } from "@/lib/money";
import { daysUntil } from "@/lib/time";

// Live counts + ticker from the repository; refreshed at most once a minute.
export const revalidate = 60;

export default async function Landing() {
  const campuses = listCampuses();
  const repo = getRepo();
  const [stats, ticker] = await Promise.all([
    Promise.all(campuses.map((c) => repo.campusStats(c.slug))),
    repo.listListings({ campusIds: campuses.map((c) => c.slug), statuses: ["active"], sort: "newest", limit: 14 }),
  ]);
  const totalOpen = stats.reduce((s, x) => s + x.activeListings, 0);

  return (
    <div className="min-h-dvh overflow-x-clip bg-bg">
      {/* ——— Nav ——— */}
      <header className="pt-safe">
        <div className="mx-auto flex h-18 max-w-[1440px] items-center gap-3 px-safe md:px-10">
          <Link href="/" aria-label="Dibs home" className="mr-auto">
            <Wordmark className="text-3xl" />
          </Link>
          <a href="#how" className="hidden min-h-11 items-center px-3 text-sm font-semibold text-ink-2 hover:text-ink sm:inline-flex">
            How it works
          </a>
          <a href="#campuses" className="hidden min-h-11 items-center px-3 text-sm font-semibold text-ink-2 hover:text-ink sm:inline-flex">
            Campuses
          </a>
          <ThemeToggle />
          <a href="#campuses" className={buttonVariants({ size: "sm", variant: "ink", className: "h-11 px-4" })}>
            Pick your campus
          </a>
        </div>
      </header>

      {/* ——— Hero ——— */}
      <section className="relative mx-auto grid max-w-[1440px] items-center px-safe pt-6 pb-16 md:px-10 lg:min-h-[calc(100dvh-4.5rem)] lg:grid-cols-[1.05fr_1fr] lg:pb-24">
        <div
          aria-hidden
          className="pointer-events-none absolute top-10 right-0 -z-0 size-[38rem] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, #3a0d14, transparent 65%)" }}
        />
        <Stagger className="relative z-10">
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full border border-line-strong px-3 py-1.5 font-mono text-xs tracking-[0.12em] text-ink-2 uppercase">
              <span className="size-1.5 animate-pulse rounded-full bg-accent" /> {totalOpen} things up for grabs right now
            </p>
          </Reveal>
          <Reveal>
            <h1 className="mt-6 font-display text-fluid-hero font-extrabold tracking-[-0.055em]" data-tour="hero">
              See it.
              <br />
              Want it.
              <br />
              <span className="relative inline-block">
                Call <span className="stamp ml-1 align-baseline text-[0.82em] text-accent">dibs!</span>
              </span>
            </h1>
          </Reveal>
          <Reveal>
            <p className="mt-7 max-w-lg text-lg text-ink-2 sm:text-xl">
              The move-out marketplace for verified students. Grab a mini-fridge for $40, outbid your RA for a TV, or claim a free
              futon before the dumpster does.
            </p>
          </Reveal>
          <Reveal className="mt-8 flex flex-wrap items-center gap-3">
            <Magnet>
              <Link href="/ua" className={buttonVariants({ size: "lg" })}>
                Enter UA <ArrowRight />
              </Link>
            </Magnet>
            <Link href="/demo" className={buttonVariants({ size: "lg", variant: "outline" })} data-testid="landing-demo">
              ▶ 5-minute guided demo
            </Link>
          </Reveal>
          <Reveal className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-3">
            <span className="inline-flex items-center gap-1.5"><BadgeCheck className="size-4 text-accent" /> .edu-verified only</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="size-4 text-accent" /> 24-hour dibs holds</span>
            <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-accent" /> Pickup on campus</span>
          </Reveal>
        </Stagger>
        <HeroCanvas className="relative -mx-4 mt-6 h-[22rem] sm:h-[28rem] lg:mx-0 lg:mt-0 lg:h-[40rem]" />
      </section>

      {/* ——— Live ticker (real listings) ——— */}
      {ticker.length ? (
        <div className="overflow-hidden border-y border-line bg-surface py-3" aria-label="Recently listed">
          <div className="flex w-max animate-marquee gap-8 motion-reduce:animate-none">
            {[...ticker, ...ticker].map((l, i) => (
              <span key={`${l.id}-${i}`} className="inline-flex items-center gap-3 font-display text-lg font-bold whitespace-nowrap" aria-hidden={i >= ticker.length}>
                <span className="size-8 overflow-hidden rounded-full"><ItemArt category={l.category} seed={l.artSeed} /></span>
                {l.title.split(",")[0]}
                <span className={l.isFree ? "rounded-full bg-sticker px-2 font-mono text-sm text-[#16120f]" : "font-mono text-sm text-accent"}>
                  {l.isFree ? "FREE" : l.saleMode === "auction" ? `bid ${formatCents(l.highestBidCents ?? l.priceCents, { compact: true })}` : formatCents(l.priceCents, { compact: true })}
                </span>
                <span className="text-ink-3">✦</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* ——— Three ways ——— */}
      <section className="mx-auto max-w-[1440px] px-safe py-20 md:px-10">
        <p className="font-mono text-xs tracking-[0.2em] text-ink-3 uppercase">Three ways to move stuff</p>
        <h2 className="mt-3 max-w-3xl font-display text-fluid-xl font-extrabold">Price it, auction it, or just let it go.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { icon: Tag, t: "Fixed price", b: "Set a price. The first verified student to call dibs gets a 24-hour hold — no haggling in the DMs.", art: "lamp" as const, tag: <span className="sticker bg-accent px-3 py-1 font-mono text-accent-ink rotate-2">$30</span> },
            { icon: Gavel, t: "Auction", b: "Starting bid, minimum increment, optional reserve and buy-now. Bids are validated on the server, races handled.", art: "tv" as const, tag: <span className="sticker bg-ink px-3 py-1 font-mono text-bg -rotate-3"><Gavel className="size-4 text-accent" />$115</span> },
            { icon: Gift, t: "Free", b: "Too good for the dumpster? Mark it free. Students claim it with one tap and come grab it.", art: "plant" as const, tag: <span className="sticker bg-sticker px-3 py-1 text-[#16120f] -rotate-6">FREE</span> },
          ].map((m) => (
            <SpotlightCard key={m.t} as="article" className="rounded-[1.75rem] border border-line bg-surface p-3">
              <div className="relative aspect-[16/10] overflow-hidden rounded-[1.25rem]">
                <ItemArt category={m.art} seed={m.t.length * 37} />
                <div className="absolute right-3 bottom-3">{m.tag}</div>
              </div>
              <div className="p-3 pt-5">
                <h3 className="flex items-center gap-2 font-display text-2xl font-extrabold"><m.icon className="size-5 text-accent" /> {m.t}</h3>
                <p className="mt-2 text-ink-2">{m.b}</p>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </section>

      {/* ——— How dibs works ——— */}
      <section id="how" className="border-y border-line bg-bg-2">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-safe py-20 md:px-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="font-mono text-xs tracking-[0.2em] text-ink-3 uppercase">Calling dibs</p>
            <h2 className="mt-3 font-display text-fluid-xl font-extrabold">The fastest thumb on campus wins.</h2>
            <p className="mt-4 max-w-md text-ink-2">
              Dibs is a reservation, not a payment. You lock the item for 24 hours, meet at a campus spot, pay how you like, and the seller confirms the handoff. If you ghost, it goes back on the market automatically.
            </p>
          </div>
          <ol className="grid gap-3 sm:grid-cols-3">
            {[
              { n: "01", icon: BadgeCheck, t: "Verify", b: "Sign in with your campus email. Only verified students can claim or bid." },
              { n: "02", icon: Hand, t: "Call dibs", b: "One tap. The server makes sure exactly one person gets it — no double-claims." },
              { n: "03", icon: MapPin, t: "Hand off", b: "Meet at a hall lobby or landmark during the pickup window. Done." },
            ].map((s) => (
              <li key={s.n} className="rounded-[1.5rem] border border-line bg-surface p-5">
                <p className="font-mono text-sm text-accent">{s.n}</p>
                <s.icon className="mt-6 size-7" />
                <h3 className="mt-3 font-display text-xl font-extrabold">{s.t}</h3>
                <p className="mt-1 text-sm text-ink-2">{s.b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ——— Beyond buying ——— */}
      <section className="mx-auto max-w-[1440px] px-safe py-20 md:px-10">
        <p className="font-mono text-xs tracking-[0.2em] text-ink-3 uppercase">Same verified students, more ways to help each other</p>
        <h2 className="mt-3 max-w-3xl font-display text-fluid-xl font-extrabold">More than a marketplace.</h2>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/ua/x/handoffs", t: "Move-out → move-in", b: "Hand off before you leave, or hold it for a student arriving next semester.", img: "/photos/lst_ua_kettle.jpg" },
            { href: "/ua/x/swipe", t: "Swipe", b: "Tinder for random dorm stuff. Right to save.", img: "/photos/lst_ua_fridge_galanz.jpg" },
            { href: "/ua/x/subs", t: "Split subs", b: "Fill the empty seats on family plans and split the bill evenly.", img: "/photos/lst_ua_tv_tcl.jpg" },
            { href: "/ua/x/rides", t: "Rides & trips", b: "Carpool home at move-out; split the beach house for break.", img: "/photos/ride_van.jpg" },
            { href: "/ua/x/meals", t: "Meal share", b: "Students who cook post bulk batches. Grab a portion or trade.", img: "/photos/meal_curry.jpg" },
            { href: "/ua/x/class-swap", t: "Class swap", b: "x wants y, y wants z, z wants x — we find the loop and time the drop/add.", img: "/photos/lst_ua_chem.jpg" },
          ].map((m) => (
            <Link key={m.href} href={m.href} className="group flex items-center gap-4 rounded-[1.5rem] border border-line bg-surface p-3 transition-colors hover:border-line-strong">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.img} alt="" className="size-20 shrink-0 rounded-2xl object-cover" loading="lazy" />
              <span className="min-w-0">
                <span className="flex items-center gap-1 font-display text-lg font-extrabold">
                  {m.t} <ArrowRight className="size-4 text-ink-3 transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className="text-sm text-ink-2">{m.b}</span>
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-4 text-sm text-ink-3">Payments happen in Venmo, Zelle, Cash App or cash — Dibs just records that both sides confirmed.</p>
      </section>

      {/* ——— Campus picker ——— */}
      <section id="campuses" className="mx-auto max-w-[1440px] scroll-mt-6 px-safe py-20 md:px-10">
        <p className="font-mono text-xs tracking-[0.2em] text-ink-3 uppercase">Pick your campus</p>
        <h2 className="mt-3 font-display text-fluid-xl font-extrabold">Every campus is its own marketplace.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campuses.map((c, i) => {
            const s = stats[i];
            const days = daysUntil(c.moveOutDate);
            return (
              <Link
                key={c.slug}
                href={`/${c.slug}`}
                className="group relative overflow-hidden rounded-[1.75rem] border border-line bg-surface p-6 transition-transform hover:-translate-y-1"
                style={{ ["--accent" as string]: c.theme.dark.accent, ["--accent-ink" as string]: c.theme.dark.accentInk }}
              >
                <div className="absolute -top-16 -right-16 size-48 rounded-full opacity-40 blur-2xl" style={{ background: c.theme.dark.accent }} aria-hidden />
                <div className="relative flex items-start justify-between">
                  <span className="grid size-14 place-items-center rounded-2xl bg-accent font-display text-xl font-extrabold text-accent-ink uppercase">
                    {c.slug.slice(0, 2)}
                  </span>
                  <ArrowRight className="size-6 text-ink-3 transition-transform group-hover:translate-x-1" />
                </div>
                <h3 className="relative mt-6 font-display text-2xl font-extrabold">{c.name}</h3>
                <p className="relative text-ink-2">{c.tagline}</p>
                <dl className="relative mt-6 grid grid-cols-3 gap-2 border-t border-line pt-4">
                  <div><dt className="text-xs text-ink-3">Listings</dt><dd className="font-mono text-xl font-bold">{s.activeListings}</dd></div>
                  <div><dt className="text-xs text-ink-3">Auctions</dt><dd className="font-mono text-xl font-bold">{s.liveAuctions}</dd></div>
                  <div><dt className="text-xs text-ink-3">Move-out</dt><dd className="font-mono text-xl font-bold">{days > 0 ? `${days}d` : "now"}</dd></div>
                </dl>
                <p className="relative mt-4 font-mono text-xs text-ink-3">{c.emailDomains.map((d) => "@" + d).join(" · ")}{c.fictional ? " · fictional" : ""}</p>
              </Link>
            );
          })}
          <div className="flex flex-col justify-between rounded-[1.75rem] border border-dashed border-line-strong p-6">
            <ShieldCheck className="size-8 text-ink-3" />
            <div className="mt-6">
              <h3 className="font-display text-2xl font-extrabold">Your campus next.</h3>
              <p className="mt-1 text-ink-2">A new school is one config entry: name, email domains, colors, dates, pickup spots. Tenant isolation comes free.</p>
            </div>
            <code className="mt-4 rounded-xl bg-surface-2 px-3 py-2 font-mono text-xs text-ink-2">src/config/campuses.ts</code>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-safe py-10 pb-safe text-sm text-ink-3 md:flex-row md:items-center md:justify-between md:px-10">
          <Wordmark className="text-2xl text-ink" />
          <p>Built for HackBama. Not affiliated with or endorsed by any university. No logos were harmed.</p>
        </div>
      </footer>
    </div>
  );
}
