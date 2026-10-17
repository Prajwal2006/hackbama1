"use client";

/**
 * ClickSpark — adapted from React Bits (reactbits.dev, MIT).
 * Imperative variant: call `spark(x, y)` from a success handler so sparks
 * celebrate a *confirmed* result instead of every click. Canvas is
 * pointer-events:none and auto-skips under reduced motion.
 */
import { useCallback, useEffect, useImperativeHandle, useRef, type Ref } from "react";

export type ClickSparkHandle = { spark: (x?: number, y?: number) => void };

export function ClickSpark({
  ref,
  color = "var(--accent)",
  count = 14,
  radius = 70,
  className,
}: {
  ref?: Ref<ClickSparkHandle>;
  color?: string;
  count?: number;
  radius?: number;
  className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const sparks = useRef<{ x: number; y: number; a: number; t0: number }[]>([]);
  const raf = useRef<number | null>(null);

  const resolveColor = useCallback(() => {
    const el = canvas.current;
    if (!el) return "#ff5a1f";
    if (!color.startsWith("var(")) return color;
    return getComputedStyle(el).getPropertyValue(color.slice(4, -1)).trim() || "#ff5a1f";
  }, [color]);

  const draw = useCallback(function frame() {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const now = performance.now();
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, el.width, el.height);
    const stroke = resolveColor();
    sparks.current = sparks.current.filter((s) => now - s.t0 < 650);
    for (const s of sparks.current) {
      const p = (now - s.t0) / 650;
      const e = 1 - (1 - p) ** 3;
      const d = e * radius;
      const len = 14 * (1 - e);
      const x1 = s.x + d * Math.cos(s.a);
      const y1 = s.y + d * Math.sin(s.a);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 3 * dpr;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x1 * dpr, y1 * dpr);
      ctx.lineTo((x1 + len * Math.cos(s.a)) * dpr, (y1 + len * Math.sin(s.a)) * dpr);
      ctx.stroke();
    }
    raf.current = sparks.current.length ? requestAnimationFrame(frame) : null;
  }, [radius, resolveColor]);

  useImperativeHandle(ref, () => ({
    spark(x?: number, y?: number) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const el = canvas.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      el.width = r.width * dpr;
      el.height = r.height * dpr;
      const cx = x ?? r.width / 2;
      const cy = y ?? r.height / 2;
      const t0 = performance.now();
      for (let i = 0; i < count; i++) sparks.current.push({ x: cx, y: cy, a: (2 * Math.PI * i) / count, t0 });
      if (raf.current === null) raf.current = requestAnimationFrame(draw);
    },
  }));

  useEffect(() => () => void (raf.current && cancelAnimationFrame(raf.current)), []);

  return <canvas ref={canvas} aria-hidden className={className ?? "pointer-events-none absolute inset-0 h-full w-full"} />;
}
