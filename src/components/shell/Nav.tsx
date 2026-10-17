"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { featureHref, featuresFor, mobileTabs, type Feature } from "@/config/features";
import { cn } from "@/lib/utils";
import { FEATURE_ICONS } from "./icons";

function useIsActive(campus: string) {
  const pathname = usePathname();
  const search = useSearchParams();
  return (f: Feature) => {
    const href = featureHref(campus, f);
    const [path, query] = href.split("?");
    if (query) {
      const want = new URLSearchParams(query);
      return pathname === path && [...want].every(([k, v]) => search.get(k) === v);
    }
    if (f.id === "browse") return pathname === path && !search.get("mode");
    if (f.route === "") return pathname === path;
    return pathname === path || pathname.startsWith(`${path}/`);
  };
}

const GROUPS = [
  { id: "market", label: "Market" },
  { id: "you", label: "You" },
  { id: "labs", label: "Labs" },
] as const;

/** Desktop sidebar (≥1024) and tablet rail (768–1023), generated from the feature registry. */
export function SideNav({ campus, unread, compact }: { campus: string; unread: number; compact?: boolean }) {
  const isActive = useIsActive(campus);
  const features = featuresFor(campus).filter((f) => f.nav.sidebar);
  return (
    <nav aria-label="Primary" className="flex flex-col gap-5">
      {GROUPS.map((g) => {
        const items = features.filter((f) => f.group === g.id);
        if (!items.length) return null;
        return (
          <div key={g.id}>
            {!compact ? (
              <p className="mb-1.5 px-3 font-mono text-[0.68rem] tracking-[0.2em] text-ink-3 uppercase">{g.label}</p>
            ) : null}
            <ul className="flex flex-col gap-0.5">
              {items.map((f) => {
                const Icon = FEATURE_ICONS[f.icon];
                const active = isActive(f);
                return (
                  <li key={f.id}>
                    <Link
                      href={featureHref(campus, f)}
                      title={compact ? f.title : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.95rem] font-medium transition-colors",
                        compact && "justify-center px-0",
                        active ? "text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                        f.status === "planned" && !active && "text-ink-3",
                      )}
                    >
                      {active ? (
                        <motion.span
                          layoutId="sidenav-active"
                          className="absolute inset-0 rounded-xl border border-line-strong bg-surface-2"
                          transition={{ type: "spring", stiffness: 500, damping: 40 }}
                        />
                      ) : null}
                      <Icon className={cn("relative size-[1.15rem]", active && "text-accent")} />
                      {!compact ? <span className="relative flex-1">{f.title}</span> : <span className="sr-only">{f.title}</span>}
                      {f.id === "notifications" && unread > 0 ? (
                        <span
                          className={cn(
                            "relative grid min-w-5 place-items-center rounded-full bg-accent px-1 font-mono text-[0.7rem] font-bold text-accent-ink",
                            compact && "absolute top-1 right-1",
                          )}
                        >
                          {unread}
                        </span>
                      ) : null}
                      {f.status !== "live" && !compact ? (
                        <span className="relative font-mono text-[0.62rem] tracking-wider text-ink-3 uppercase">{f.status === "beta" ? "beta" : "soon"}</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

/** Phone bottom tab bar. The "Sell" tab is a raised accent button. */
export function MobileTabs({ campus, unread }: { campus: string; unread: number }) {
  const isActive = useIsActive(campus);
  const tabs = mobileTabs(campus);
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 pb-safe backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 px-2">
        {tabs.map((f) => {
          const Icon = FEATURE_ICONS[f.icon];
          const active = isActive(f);
          const isSell = f.id === "create";
          return (
            <li key={f.id} className="flex justify-center">
              <Link
                href={featureHref(campus, f)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-16 w-full flex-col items-center justify-center gap-1 text-[0.68rem] font-semibold",
                  active ? "text-ink" : "text-ink-3",
                )}
              >
                {isSell ? (
                  <span className="-mt-5 grid size-13 place-items-center rounded-2xl bg-accent text-accent-ink shadow-[0_10px_24px_-10px_var(--accent)]">
                    <Icon className="size-6" strokeWidth={2.6} />
                  </span>
                ) : (
                  <span className="relative">
                    <Icon className={cn("size-[1.35rem]", active && "text-accent")} strokeWidth={active ? 2.4 : 2} />
                    {f.id === "notifications" && unread > 0 ? (
                      <span className="absolute -top-1.5 -right-2 grid min-w-4 place-items-center rounded-full bg-accent px-1 font-mono text-[0.6rem] font-bold text-accent-ink">
                        {unread}
                      </span>
                    ) : null}
                  </span>
                )}
                <span>{isSell ? "Sell" : f.id === "me" ? "Me" : f.title}</span>
                {active && !isSell ? (
                  <motion.span layoutId="tab-dot" className="absolute top-1 h-1 w-6 rounded-full bg-accent" />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
