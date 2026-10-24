import type { ReactNode } from "react";
import { cx } from "./cx";

/** stone = ledgers/forms, wood = dialogs/treasury, felt = table info, crimson = warnings, glass = over the scene. */
export type PanelTone = "stone" | "wood" | "parchment" | "felt" | "crimson" | "glass" | "plain";

const tones: Record<PanelTone, string> = {
  stone: "gh-frame--stone",
  wood: "gh-frame--wood",
  felt: "gh-frame--felt",
  crimson: "gh-frame--crimson",
  glass: "gh-frame--glass",
  plain: "",
  // Legacy light surface: cream sheet with dark text.
  parchment: "bg-cream text-ink",
};

type PanelProps = {
  title?: ReactNode;
  tone?: PanelTone;
  /** Full gold frame (ink + gold-400 + gold-700). Unframed panels get the thin gold edge. */
  framed?: boolean;
  as?: "section" | "div" | "article";
  compact?: boolean;
  className?: string;
  children: ReactNode;
};

export function Panel({ title, tone = "stone", framed, as: Tag = "section", compact, className, children }: PanelProps) {
  return (
    <Tag className={cx("gh-frame min-w-0", !framed && "gh-frame--thin", tones[tone], compact ? "px-4 py-3" : "p-5 sm:p-6", className)}>
      {title ? <h2 className={cx("gh-panel-title mb-4", tone === "parchment" && "text-wood-dark [text-shadow:none]")}>{title}</h2> : null}
      {children}
    </Tag>
  );
}
