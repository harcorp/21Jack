import type { ReactNode } from "react";
import { cx } from "./cx";

export type StatTone = "default" | "gold" | "carpet" | "felt";

const tones: Record<StatTone, string> = {
  default: "bg-stone text-parchment",
  gold: "bg-gold text-ink",
  carpet: "bg-carpet text-parchment",
  felt: "bg-felt text-parchment",
};

/** Compact HUD tile: small label on top, large legible number below. */
export function StatTile({ label, value, hint, tone = "default", className }: { label: ReactNode; value: ReactNode; hint?: ReactNode; tone?: StatTone; className?: string }) {
  return (
    <div className={cx("voxel-block flex min-w-0 flex-col gap-1 px-3 py-2", tones[tone], className)}>
      <dt className="font-pixel text-xs uppercase opacity-90">{label}</dt>
      <dd className="truncate font-pixel text-2xl tabular-nums">{value}</dd>
      {hint ? <dd className="font-pixel text-xs opacity-90">{hint}</dd> : null}
    </div>
  );
}
