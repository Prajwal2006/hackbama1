"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** URL-backed tabs (`?tab=`) so each section is linkable. */
export function ProfileTabs({ tabs, active }: { tabs: { id: string; label: string; count: number }[]; active: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Profile sections" data-tour="profile" className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 scrollbar-none md:mx-0 md:px-0">
      {tabs.map((t) => (
        <Link
          key={t.id}
          href={`${pathname}?tab=${t.id}`}
          scroll={false}
          aria-current={active === t.id ? "page" : undefined}
          className={cn("relative flex min-h-12 shrink-0 items-center gap-2 px-3 text-sm font-semibold", active === t.id ? "text-ink" : "text-ink-3 hover:text-ink")}
        >
          {t.label}
          <span className="rounded-full bg-surface-2 px-1.5 font-mono text-[0.7rem]">{t.count}</span>
          {active === t.id ? <motion.span layoutId="profile-tab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" /> : null}
        </Link>
      ))}
    </nav>
  );
}
