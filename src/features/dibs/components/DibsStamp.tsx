"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect } from "react";

/**
 * The signature moment: a rubber stamp slams onto the screen.
 * Purely celebratory — shown *after* the server confirmed the claim, and the
 * reservation UI underneath is already rendered and usable.
 */
export function DibsStamp({ show, onDone }: { show: boolean; onDone: () => void }) {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onDone, reduce ? 900 : 1500);
    return () => clearTimeout(t);
  }, [show, onDone, reduce]);

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[70] grid place-items-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
          aria-hidden
        >
          <motion.div
            className="absolute inset-0 bg-bg/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
          />
          <motion.div
            initial={reduce ? { opacity: 0 } : { scale: 3.2, rotate: -24, opacity: 0, filter: "blur(6px)" }}
            animate={
              reduce
                ? { opacity: 1 }
                : {
                    scale: [3.2, 0.92, 1.04, 1],
                    rotate: [-24, -9, -11, -10],
                    opacity: [0, 1, 1, 1],
                    filter: ["blur(6px)", "blur(0px)", "blur(0px)", "blur(0px)"],
                  }
            }
            transition={{ duration: 0.55, times: [0, 0.45, 0.7, 1], ease: [0.2, 0.9, 0.2, 1] }}
            className="relative"
          >
            <span className="stamp bg-bg/80 px-[0.3em] text-[clamp(5rem,22vw,13rem)] leading-none text-accent">dibs!</span>
            {!reduce ? (
              <motion.span
                className="absolute inset-0 -z-10 rounded-[2rem]"
                initial={{ scale: 0.6, opacity: 0.8 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{ delay: 0.25, duration: 0.6 }}
                style={{ boxShadow: "0 0 0 6px var(--accent)" }}
              />
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
