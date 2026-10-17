"use client";

/**
 * Stack — adapted from the React Bits "Stack" component (reactbits.dev, MIT),
 * rebuilt on Motion. A pile of slightly rotated cards; drag the top card past
 * the threshold to fling it. Unlike the original (which cycles the card to the
 * back), this version reports the direction so callers can act on it.
 * Keyboard/AT users get equivalent buttons from the caller.
 */
import { motion, useMotionValue, useTransform, type MotionValue, type PanInfo } from "motion/react";

export type StackItem = { id: string; content: React.ReactNode };

function TopCard({
  item,
  onFling,
  threshold,
  overlay,
}: {
  item: StackItem;
  onFling: (dir: "left" | "right") => void;
  threshold: number;
  overlay?: (x: MotionValue<number>) => React.ReactNode;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-16, 16]);
  return (
    <motion.div
      className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing"
      style={{ x, rotate, zIndex: 10 }}
      drag="x"
      dragSnapToOrigin
      dragElastic={0.7}
      onDragEnd={(_, info: PanInfo) => {
        const dx = info.offset.x + info.velocity.x * 0.15;
        if (Math.abs(dx) > threshold) onFling(dx > 0 ? "right" : "left");
      }}
      initial={{ scale: 0.96, opacity: 0.8 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
    >
      {item.content}
      {overlay?.(x)}
    </motion.div>
  );
}

export function Stack({
  items,
  onFling,
  threshold = 110,
  overlay,
  className,
}: {
  items: StackItem[];
  onFling: (item: StackItem, dir: "left" | "right") => void;
  threshold?: number;
  overlay?: (x: MotionValue<number>) => React.ReactNode;
  className?: string;
}) {
  const visible = items.slice(0, 4);
  return (
    <div className={className} style={{ position: "relative", perspective: 800 }}>
      {visible
        .slice(1)
        .reverse()
        .map((it, i, arr) => {
          const depth = arr.length - i; // 1 = right under the top card
          return (
            <motion.div
              key={it.id}
              className="pointer-events-none absolute inset-0"
              animate={{ scale: 1 - depth * 0.05, y: depth * 14, rotate: depth % 2 ? depth * 2.5 : -depth * 2.5 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              style={{ zIndex: 10 - depth }}
            >
              {it.content}
            </motion.div>
          );
        })}
      {visible[0] ? (
        <TopCard key={visible[0].id} item={visible[0]} threshold={threshold} overlay={overlay} onFling={(d) => onFling(visible[0], d)} />
      ) : null}
    </div>
  );
}
