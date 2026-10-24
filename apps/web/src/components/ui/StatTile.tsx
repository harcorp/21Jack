import type { ReactNode } from "react";
import { cx } from "./cx";

export type StatTone = "default" | "gold" | "carpet" | "felt";

const tones: Record<StatTone, string> = {
  default: "",
  gold: "shadow-[inset_0_0_0_2px_var(--gh-ink),inset_0_0_0_4px_var(--gh-gold-200),var(--gh-glow-gold)]",
  carpet: "gh-frame--crimson",
  felt: "gh-frame--felt",
};

const valueTones: Record<StatTone, string> = {
  default: "text-cream",
  gold: "text-gold-light",
  carpet: "text-cream",
  felt: "text-gold-light",
};

/** HUD plaque: small Pixelify label on top, large Press Start number below. Render inside a <dl>. */
export function StatTile({ label, value, hint, tone = "default", className }: { label: ReactNode; value: ReactNode; hint?: ReactNode; tone?: StatTone; className?: string }) {
  return (
    <div className={cx("gh-frame gh-frame--thin flex min-w-0 flex-col gap-2 bg-surface-sunken px-4 py-3", tones[tone], className)}>
      <dt className="gh-label text-xs text-gold-light">{label}</dt>
      <dd className={cx("gh-num gh-shadow-text truncate text-base sm:text-xl", valueTones[tone])}>{value}</dd>
      {hint ? <dd className="text-xs text-cream-muted">{hint}</dd> : null}
    </div>
  );
}
