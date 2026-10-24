"use client";

import { motion, useReducedMotion } from "motion/react";
import { stepped } from "./motion";
import { PixelArt } from "./pixel";

const ROWS = [
  "......H.......o.",
  "......HH.....oOo",
  ".....HHh......o.",
  ".....HHh......T.",
  "....HHHh......T.",
  "....HHHHh.....T.",
  "..hHHHHHHHHh..T.",
  "....SSSSSS....T.",
  "....SKSSKS....T.",
  "....WSSNSW....T.",
  "...WWWWWWWW...T.",
  "...WWWwWWWW..ST.",
  "..RRWWWWWWRRRST.",
  "..RRRWWwWWRR..T.",
  "..RRRRWWWRRr..T.",
  ".RRRrRRWRRRr..T.",
  ".RRRrRRRRRRr..T.",
  ".RRRrRRRRRRrr.T.",
  "RRRRrRRRRRRRrrT.",
  "rrrrrrrrrrrrr.T.",
] as const;

const BODY = {
  H: "#8b8b97",
  h: "#5f5f6b",
  S: "#d6a77a",
  N: "#b98660",
  K: "var(--color-ink)",
  W: "#f4f1ea",
  w: "#c9c3b6",
  R: "#767682",
  r: "#4f4f59",
  T: "var(--color-wood)",
};

const TIP = { o: "var(--color-torch)", O: "#fff6d8" };

/** Coach mentor portrait: grey-robed wizard with a staff. Idle bob + glowing staff tip. */
export function Claudalf({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={`relative aspect-[4/5] ${className ?? ""}`}
      animate={reduce ? undefined : { y: [0, -2, 0] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: stepped(4) }}
    >
      <PixelArt rows={ROWS} palette={BODY} className="pixelated absolute inset-0 h-full w-full" />
      <motion.div
        className="absolute inset-0"
        style={{ filter: "drop-shadow(0 0 4px var(--color-torch))" }}
        animate={reduce ? undefined : { opacity: [0.55, 1, 0.55] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: stepped(3) }}
      >
        <PixelArt rows={ROWS} palette={TIP} className="pixelated h-full w-full" />
      </motion.div>
    </motion.div>
  );
}
