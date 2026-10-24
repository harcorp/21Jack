import type { ReactNode } from "react";
import { cx } from "./cx";

export type BadgeTone = "gold" | "carpet" | "felt" | "stone";

const tones: Record<BadgeTone, string> = {
  gold: "bg-gold text-ink",
  carpet: "bg-carpet text-parchment",
  felt: "bg-felt text-parchment",
  stone: "bg-stone text-parchment",
};

export function Badge({ tone = "stone", children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-block border-2 border-ink px-2 py-0.5 font-pixel text-xs uppercase", tones[tone], className)}>
      {children}
    </span>
  );
}
