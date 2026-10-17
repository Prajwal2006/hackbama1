"use client";

import { motion, type HTMLMotionProps } from "motion/react";

/** Staggered entrance: wrap a group in <Stagger>, children in <Reveal>. Respects reduced motion via MotionConfig. */
export function Stagger({ children, className, delay = 0, ...rest }: HTMLMotionProps<"div"> & { delay?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: delay } } }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function Reveal({ children, className, ...rest }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 18 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 26 } },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
