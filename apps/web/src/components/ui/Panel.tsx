import type { ReactNode } from "react";
import { cx } from "./cx";

export type PanelTone = "stone" | "wood" | "parchment" | "felt";

const tones: Record<PanelTone, string> = {
  stone: "bg-stone text-parchment",
  wood: "bg-wood-dark text-parchment",
  parchment: "bg-parchment text-ink",
  felt: "bg-felt text-parchment",
};

type PanelProps = {
  title?: ReactNode;
  tone?: PanelTone;
  framed?: boolean;
  as?: "section" | "div" | "article";
  compact?: boolean;
  className?: string;
  children: ReactNode;
};

export function Panel({ title, tone = "stone", framed, as: Tag = "section", compact, className, children }: PanelProps) {
  return (
    <Tag className={cx(framed ? "gold-frame" : "voxel-block", compact ? "px-4 py-3" : "p-4 sm:p-6", tones[tone], className)}>
      {title ? <h2 className="mb-4 font-display text-2xl font-bold">{title}</h2> : null}
      {children}
    </Tag>
  );
}
