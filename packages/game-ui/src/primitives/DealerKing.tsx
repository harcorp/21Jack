"use client";

import { motion, useReducedMotion } from "motion/react";
import { PixelArt } from "./pixel";

const ROWS = [
  "...G..GG..G...",
  "...GG.GG.GG...",
  "...GGGGGGGG...",
  "...GRGGGGRG...",
  "...SSSSSSSS...",
  "...SKSSSSKS...",
  "...SSSSSSSS...",
  "...BSBBBBSB...",
  "...BBBBBBBB...",
  "..RRBBBBBBRR..",
  ".RRRRRBBRRRRR.",
  "RRGRRRRRRRRGRR",
  "RRGRRRRRRRRGRR",
] as const;

const PALETTE = {
  G: "var(--color-gold-light)",
  R: "var(--color-carpet)",
  S: "#c8956a",
  K: "var(--color-ink)",
  B: "var(--color-wood-dark)",
};

/** Placeholder dealer portrait with a 2px idle bob. */
export function DealerKing({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      animate={reduce ? undefined : { y: [0, -2, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: (t: number) => Math.floor(t * 4) / 4 }}
    >
      <PixelArt rows={ROWS} palette={PALETTE} className="pixelated h-full w-full" />
    </motion.div>
  );
}
