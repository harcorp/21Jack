"use client";

import { motion, useReducedMotion } from "motion/react";
import { CrownSigil } from "./CrownSigil";

export function KingslayerBanner({ defeats }: { defeats: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      role="status"
      className="gold-frame flex flex-col items-center bg-ink/90 px-6 py-3 text-center shadow-[8px_8px_0_rgb(0_0_0/0.5)] sm:px-10 sm:py-5"
      initial={reduce ? false : { scale: 0, rotate: -6, opacity: 0 }}
      animate={reduce ? { scale: 1, opacity: 1 } : { scale: [0, 1.25, 1], rotate: [-6, 3, 0], opacity: 1 }}
      transition={{ duration: 0.6, delay: reduce ? 0 : 1.2, times: [0, 0.7, 1] }}
    >
      <CrownSigil className="h-10 w-10 sm:h-14 sm:w-14" />
      <div className="font-display text-4xl font-bold tracking-widest text-gold-light drop-shadow-[3px_3px_0_var(--color-carpet)] sm:text-6xl">
        KINGSLAYER
      </div>
      <div className="mt-1 font-pixel text-xs text-parchment sm:text-sm">Kings slain: {defeats}</div>
    </motion.div>
  );
}
