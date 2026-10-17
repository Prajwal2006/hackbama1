"use client";

/**
 * CountUp — adapted from the React Bits component of the same name
 * (reactbits.dev, MIT). Re-implemented on Motion's `useSpring` so we don't
 * ship a second animation library. Always renders the real final value for
 * SSR / reduced motion; only animates from 0 once in view.
 */
import { useInView, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useEffect, useRef } from "react";

const FORMATS = {
  int: (n: number) => Math.round(n).toLocaleString("en-US"),
  /** `to` is integer cents; shows whole dollars. */
  dollars: (n: number) => `$${Math.round(n / 100).toLocaleString("en-US")}`,
};

export function CountUp({
  to,
  format: kind = "int",
  className,
  duration = 1.4,
}: {
  to: number;
  format?: keyof typeof FORMATS;
  className?: string;
  duration?: number;
}) {
  const format = FORMATS[kind];
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { duration: duration * 1000, bounce: 0 });

  useEffect(() => {
    const el = ref.current;
    if (reduce || !inView || !el) return;
    // Until it's in view the SSR'd final value stays visible — never a stray "0".
    const unsub = spring.on("change", (v) => (el.textContent = format(v)));
    mv.set(to);
    // If rAF is throttled (background tab), still land on the real number.
    const t = setTimeout(() => (el.textContent = format(to)), duration * 1000 + 400);
    return () => {
      unsub();
      clearTimeout(t);
    };
  }, [inView, to, mv, spring, format, reduce, duration]);

  return (
    <span ref={ref} className={className}>
      {format(to)}
    </span>
  );
}
