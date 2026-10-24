import type { ReactNode } from "react";
import { PixelIcon } from "./PixelIcon";
import { cx } from "./cx";

export type AlertTone = "info" | "success" | "error";

const tones: Record<AlertTone, string> = {
  info: "gh-toast--info",
  success: "gh-toast--success",
  error: "",
};

/** Inline message (Grand Hall toast); errors are announced assertively, the rest politely. */
export function Alert({ tone = "info", title, children, className }: { tone?: AlertTone; title?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("gh-toast max-w-none items-start", tones[tone], className)}>
      <PixelIcon name={tone === "success" ? "check" : "info"} size={20} className={cx("mt-0.5", tone === "success" ? "text-gold-light" : "text-cream")} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title ? <strong className="font-display font-bold">{title}</strong> : null}
        {children ? <div className="text-sm leading-snug">{children}</div> : null}
      </div>
    </div>
  );
}
