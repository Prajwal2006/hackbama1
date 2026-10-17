"use client";

/**
 * SpotlightCard — adapted from React Bits (reactbits.dev, MIT).
 * A soft accent-tinted light follows the pointer. CSS-variable driven, no
 * re-renders on move; disabled on touch (no hover) automatically.
 */
import { useRef } from "react";
import { cn } from "@/lib/utils";

export function SpotlightCard({
  className,
  children,
  as: Tag = "div",
}: {
  className?: string;
  children: React.ReactNode;
  as?: "div" | "article" | "section";
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <Tag
      ref={ref}
      onPointerMove={(e: React.PointerEvent<HTMLElement>) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--sx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--sy", `${e.clientY - r.top}px`);
      }}
      className={cn(
        "group/spot relative overflow-hidden",
        "before:pointer-events-none before:absolute before:inset-0 before:z-10 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100",
        "before:bg-[radial-gradient(420px_circle_at_var(--sx,50%)_var(--sy,50%),color-mix(in_oklab,var(--accent)_16%,transparent),transparent_60%)]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
