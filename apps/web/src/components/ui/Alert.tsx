import type { ReactNode } from "react";
import { cx } from "./cx";

export type AlertTone = "info" | "success" | "error";

const tones: Record<AlertTone, string> = {
  info: "bg-stone text-parchment",
  success: "bg-felt text-parchment",
  error: "bg-carpet text-parchment",
};

/** Inline message; errors are announced assertively, the rest politely. */
export function Alert({ tone = "info", title, children, className }: { tone?: AlertTone; title?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("voxel-block px-4 py-3", tones[tone], className)}>
      {title ? <p className="font-display font-bold">{title}</p> : null}
      {children ? <div className="text-base">{children}</div> : null}
    </div>
  );
}
