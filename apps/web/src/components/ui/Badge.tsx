import type { ReactNode } from "react";
import { cx } from "./cx";

export type BadgeTone = "gold" | "carpet" | "felt" | "stone" | "torch" | "silver" | "ghost" | "you";

const tones: Record<BadgeTone, string> = {
  gold: "",
  carpet: "gh-tag--crimson",
  felt: "gh-tag--soft",
  stone: "gh-tag--stone",
  torch: "gh-tag--torch",
  silver: "gh-tag--silver",
  ghost: "gh-tag--ghost",
  you: "gh-tag--you",
};

/** Pixel tag (Grand Hall `.gh-tag`). */
export function Badge({ tone = "stone", children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return <span className={cx("gh-tag", tones[tone], className)}>{children}</span>;
}
