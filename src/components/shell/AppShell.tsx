import { Bell, LogOut } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { listCampuses, type CampusConfig } from "@/config/campuses";
import { signOutAction } from "@/features/auth/actions";
import { dataMode, demoToolsEnabled, emailDelivery, isDemo } from "@/lib/env";
import { cn } from "@/lib/utils";
import { CampusTheme } from "./CampusTheme";
import { CommandPaletteProvider, PaletteTrigger } from "./CommandPalette";
import { DemoBanner } from "./DemoBanner";
import { MobileMenu } from "./MobileMenu";
import { MobileTabs, SideNav } from "./Nav";
import { ThemeToggle } from "./ThemeToggle";
import type { ShellViewer } from "./types";
import { Wordmark } from "./Wordmark";

function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className={cn("grid size-9 place-items-center rounded-full bg-accent-2 font-display text-sm font-extrabold text-[#16120f]", className)}>
      {initials}
    </span>
  );
}

/** The one responsive shell: sidebar ≥1024, icon rail 768–1023, bottom tabs <768. */
export function AppShell({
  campus,
  viewer,
  unread,
  children,
}: {
  campus: CampusConfig;
  viewer: ShellViewer;
  unread: number;
  children: React.ReactNode;
}) {
  const campuses = listCampuses().map((c) => ({ slug: c.slug, shortName: c.shortName, name: c.name, fictional: c.fictional }));
  const visiting = viewer && viewer.campusId !== campus.slug;
  const home = viewer ? campuses.find((c) => c.slug === viewer.campusId) : null;

  return (
    <div data-campus={campus.slug} className="min-h-dvh bg-bg text-ink">
      <CampusTheme campus={campus} />
      <CommandPaletteProvider campus={campus.slug} campuses={campuses}>
        {isDemo ? <DemoBanner dataMode={dataMode} emailDelivery={emailDelivery} canReset={demoToolsEnabled} /> : null}
        <div className="flex">
          <aside className="sticky top-0 hidden h-dvh w-[76px] shrink-0 flex-col border-r border-line bg-bg-2/60 px-3 py-5 md:flex lg:w-64 lg:px-4">
            <Link href={`/${campus.slug}`} className="mb-6 flex items-center px-1 lg:px-2" aria-label={`Dibs ${campus.shortName} home`}>
              <Wordmark className="hidden text-3xl lg:inline-flex" campus={campus.shortName} />
              <span className="grid size-11 place-items-center rounded-2xl bg-accent font-display text-2xl font-extrabold text-accent-ink lg:hidden">
                d!
              </span>
            </Link>
            <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
              <Suspense>
                <div className="hidden lg:block">
                  <SideNav campus={campus.slug} unread={unread} />
                </div>
                <div className="lg:hidden">
                  <SideNav campus={campus.slug} unread={unread} compact />
                </div>
              </Suspense>
            </div>
            <div className="mt-4 border-t border-line pt-4">
              <p className="mb-2 hidden px-2 font-mono text-[0.68rem] tracking-[0.2em] text-ink-3 uppercase lg:block">Campus</p>
              <div className="flex flex-col gap-1">
                {campuses.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/${c.slug}`}
                    title={c.name}
                    className={cn(
                      "flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-medium",
                      c.slug === campus.slug ? "bg-surface-2 text-ink" : "text-ink-3 hover:text-ink",
                    )}
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-line-strong font-mono text-[0.62rem] font-bold uppercase">
                      {c.slug.slice(0, 2)}
                    </span>
                    <span className="hidden truncate lg:inline">
                      {c.name}
                      {c.fictional ? <span className="text-ink-3"> · demo</span> : null}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <header className="sticky top-0 z-30 border-b border-line bg-bg/85 pt-safe backdrop-blur-xl">
              <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-2 px-safe md:px-8">
                <Link href={`/${campus.slug}`} className="mr-auto md:hidden" aria-label="Home">
                  <Wordmark className="text-2xl" campus={campus.shortName} />
                </Link>
                <PaletteTrigger className="grid size-11 place-items-center rounded-full text-ink-2 hover:bg-surface-2 md:mr-auto lg:flex lg:h-11 lg:w-full lg:max-w-md lg:items-center lg:gap-3 lg:rounded-full lg:border lg:border-line-strong lg:bg-surface lg:px-4 lg:text-sm lg:text-ink-3" />
                {visiting && home ? (
                  <span className="hidden rounded-full border border-line-strong px-3 py-1 text-xs font-semibold text-ink-2 sm:inline">
                    Visiting from {home.shortName} · view only
                  </span>
                ) : null}
                <ThemeToggle />
                <Suspense>
                  <MobileMenu campus={campus.slug} unread={unread} />
                </Suspense>
                {viewer ? (
                  <>
                    <Link
                      href={`/${campus.slug}/notifications`}
                      className="relative hidden size-11 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink md:grid"
                      aria-label={`Activity${unread ? `, ${unread} unread` : ""}`}
                    >
                      <Bell className="size-5" />
                      {unread ? <span className="absolute top-2 right-2 size-2.5 rounded-full bg-accent ring-2 ring-bg" /> : null}
                    </Link>
                    <Link href={`/${campus.slug}/me`} className="flex min-h-11 items-center gap-2 rounded-full pr-1 pl-1 hover:bg-surface-2 lg:pr-3" aria-label="Your profile">
                      <Avatar name={viewer.displayName} />
                      <span className="hidden text-sm font-semibold lg:inline">{viewer.displayName.split(" ")[0]}</span>
                    </Link>
                    <form action={signOutAction} className="hidden lg:block">
                      <input type="hidden" name="campus" value={campus.slug} />
                      <button className="grid size-11 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="Sign out">
                        <LogOut className="size-[1.1rem]" />
                      </button>
                    </form>
                  </>
                ) : (
                  <Link
                    href={`/${campus.slug}/signin`}
                    className="inline-flex h-11 items-center rounded-full bg-ink px-4 text-sm font-bold text-bg hover:opacity-90"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </header>
            <main id="main" className="mx-auto max-w-[1440px] px-safe pt-5 pb-32 md:px-8 md:pt-8 md:pb-16">
              {children}
            </main>
          </div>
        </div>
        <Suspense>
          <MobileTabs campus={campus.slug} unread={unread} />
        </Suspense>
      </CommandPaletteProvider>
    </div>
  );
}
