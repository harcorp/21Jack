"use client";

import { motion, useReducedMotion } from "motion/react";

export type BannerTone = "win" | "blackjack" | "push" | "loss";

const TONES: Record<BannerTone, string> = {
  win: "bg-gold text-ink",
  blackjack: "bg-gold-light text-ink",
  push: "bg-stone text-parchment",
  loss: "bg-carpet text-parchment",
};

export function ResultBanner({ tone, title, detail }: { tone: BannerTone; title: string; detail?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      role="status"
      className={`gold-frame px-5 py-2 text-center shadow-[6px_6px_0_rgb(0_0_0/0.45)] sm:px-8 sm:py-3 ${TONES[tone]}`}
      initial={reduce ? false : { scale: 0.2, opacity: 0 }}
      animate={reduce ? { scale: 1, opacity: 1 } : { scale: [0.2, 1.15, 1], opacity: 1 }}
      transition={{ duration: 0.45, times: [0, 0.7, 1], ease: "easeOut" }}
    >
      <div className="font-display text-2xl font-bold leading-none sm:text-4xl">{title}</div>
      {detail && <div className="mt-1 font-pixel text-xs sm:text-sm">{detail}</div>}
    </motion.div>
  );
}
