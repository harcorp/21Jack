import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";

/** Ledger table on a sunken stone sheet. Scrolls horizontally inside its own box on narrow screens. */
export function Table({ caption, children, className }: { caption: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "relative max-w-full overflow-x-auto bg-surface-sunken shadow-[inset_0_0_0_2px_var(--gh-ink),inset_0_0_0_4px_var(--gh-stone-600)] p-1",
        className,
      )}
      tabIndex={0}
      role="region"
      aria-label={typeof caption === "string" ? caption : undefined}
    >
      <table className="w-full border-collapse text-left text-sm text-cream">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function Th({ className, ...rest }: ComponentProps<"th">) {
  return (
    <th
      scope="col"
      className={cx("gh-label border-b-2 border-gold-dark bg-surface px-3 py-2 text-xs whitespace-nowrap text-gold-light", className)}
      {...rest}
    />
  );
}

export function Td({ className, ...rest }: ComponentProps<"td">) {
  return <td className={cx("border-b border-stone px-3 py-2 align-middle", className)} {...rest} />;
}

export function Tr({ className, ...rest }: ComponentProps<"tr">) {
  return <tr className={cx("even:bg-white/[0.025] hover:bg-white/[0.05]", className)} {...rest} />;
}
